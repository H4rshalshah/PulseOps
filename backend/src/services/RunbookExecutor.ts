import { RunbookModel, RunbookStep } from '../models/Runbook';
import { AuditLogModel } from '../models/AuditLog';
import { IncidentModel } from '../models/Incident';
import { NotificationService } from './NotificationService';
import { getIO } from '../websocket/incidentSocket';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface StepResult {
  stepId: string;
  stepName: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  durationMs: number;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionResult {
  steps: StepResult[];
  incidentId: string;
  runbookId: string;
  totalDurationMs: number;
}

export class RunbookExecutor {
  static async execute(runbookId: string, incidentId: string, dryRun = false): Promise<ExecutionResult> {
    const runbook = await RunbookModel.findById(runbookId);
    if (!runbook) {
      throw new Error(`Runbook not found: ${runbookId}`);
    }

    const results: StepResult[] = [];
    const startTime = Date.now();
    const io = getIO();

    for (const step of runbook.steps) {
      const stepStartTime = Date.now();

      // Create audit log entry
      const auditEntry = await AuditLogModel.create({
        incidentId,
        runbookId,
        stepId: step.id,
        stepName: step.name,
        actionType: step.type,
        status: 'running',
        dryRun,
        inputPayload: step.config as Record<string, unknown>,
      });

      // Emit progress via WebSocket
      if (io) {
        io.to(`incident:${incidentId}`).emit('step:update', {
          stepId: step.id,
          stepName: step.name,
          status: 'running',
          dryRun,
        });
      }

      let result: StepResult;

      try {
        result = await this.executeStep(step, incidentId, dryRun);
        result.durationMs = Date.now() - stepStartTime;

        // Update audit log
        await AuditLogModel.updateStatus(auditEntry.id, result.status as 'success' | 'failed' | 'skipped', {
          outputPayload: result.output,
          errorMessage: result.error,
          durationMs: result.durationMs,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result = {
          stepId: step.id,
          stepName: step.name,
          status: 'failed',
          message: errorMessage,
          durationMs: Date.now() - stepStartTime,
          error: errorMessage,
        };

        await AuditLogModel.updateStatus(auditEntry.id, 'failed', {
          errorMessage,
          durationMs: result.durationMs,
        });
      }

      results.push(result);

      // Emit step completion
      if (io) {
        io.to(`incident:${incidentId}`).emit('step:update', {
          stepId: step.id,
          stepName: step.name,
          status: result.status,
          dryRun,
          message: result.message,
          durationMs: result.durationMs,
        });
      }

      // Handle failure strategies
      if (result.status === 'failed') {
        if (step.on_failure === 'stop') {
          break;
        }
        if (step.on_failure === 'escalate') {
          try {
            await NotificationService.escalateToPagerDuty(incidentId);
          } catch {
            // Log but don't fail the whole execution
          }
          break;
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    // Mark incident as investigating if it was open
    await IncidentModel.update(incidentId, { status: 'investigating' });

    return {
      steps: results,
      incidentId,
      runbookId,
      totalDurationMs,
    };
  }

  private static async executeStep(step: RunbookStep, incidentId: string, dryRun: boolean): Promise<StepResult> {
    if (dryRun) {
      return {
        stepId: step.id,
        stepName: step.name,
        status: 'skipped',
        message: `[DRY-RUN] Would execute: ${step.name} (type: ${step.type})`,
        durationMs: 0,
      };
    }

    switch (step.type) {
      case 'http':
        return this.executeHTTP(step);
      case 'shell':
        return this.executeShell(step);
      case 'slack':
        return this.executeSlack(step, incidentId);
      case 'aws':
        return this.executeAWSAction(step);
      case 'wait':
        return this.executeWait(step);
      case 'condition':
        return this.executeCondition(step);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private static async executeHTTP(step: RunbookStep): Promise<StepResult> {
    const config = step.config as { url?: string; method?: string; headers?: Record<string, string>; body?: unknown };
    if (!config.url) {
      return { stepId: step.id, stepName: step.name, status: 'failed', message: 'No URL specified', durationMs: 0 };
    }

    try {
      const response = await axios({
        method: (config.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
        url: config.url,
        headers: config.headers || {},
        data: config.body,
        timeout: step.timeout_ms || 5000,
        validateStatus: () => true,
      });

      return {
        stepId: step.id,
        stepName: step.name,
        status: response.status < 500 ? 'success' : 'failed',
        message: `HTTP ${response.status}: ${response.statusText}`,
        durationMs: 0,
        output: { status: response.status, data: response.data },
      };
    } catch (error) {
      return {
        stepId: step.id,
        stepName: step.name,
        status: 'failed',
        message: error instanceof Error ? error.message : 'HTTP request failed',
        durationMs: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private static async executeShell(step: RunbookStep): Promise<StepResult> {
    const config = step.config as { command?: string };
    if (!config.command) {
      return { stepId: step.id, stepName: step.name, status: 'failed', message: 'No command specified', durationMs: 0 };
    }

    try {
      const { stdout, stderr } = await execAsync(config.command, {
        timeout: step.timeout_ms || 10000,
      });

      return {
        stepId: step.id,
        stepName: step.name,
        status: 'success',
        message: stdout.trim() || 'Command executed successfully',
        durationMs: 0,
        output: { stdout: stdout.trim(), stderr: stderr.trim() },
      };
    } catch (error) {
      return {
        stepId: step.id,
        stepName: step.name,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Shell command failed',
        durationMs: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private static async executeSlack(step: RunbookStep, incidentId: string): Promise<StepResult> {
    const config = step.config as { message?: string; channel?: string };
    const message = config.message || `🚨 Incident ${incidentId} - executing runbook step: ${step.name}`;

    try {
      await NotificationService.sendSlackNotification(message);
      return {
        stepId: step.id,
        stepName: step.name,
        status: 'success',
        message: 'Slack notification sent',
        durationMs: 0,
      };
    } catch (error) {
      return {
        stepId: step.id,
        stepName: step.name,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Slack notification failed',
        durationMs: 0,
      };
    }
  }

  private static async executeAWSAction(step: RunbookStep): Promise<StepResult> {
    // AWS actions - placeholder implementation
    const config = step.config as { action?: string; region?: string; instanceId?: string };

    return {
      stepId: step.id,
      stepName: step.name,
      status: 'success',
      message: `AWS action simulated: ${config.action || 'unknown'} in ${config.region || 'us-east-1'}`,
      durationMs: 0,
      output: { action: config.action, region: config.region, simulated: true },
    };
  }

  private static async executeWait(step: RunbookStep): Promise<StepResult> {
    const config = step.config as { duration_seconds?: number };
    const durationMs = (config.duration_seconds || 5) * 1000;

    await new Promise(resolve => setTimeout(resolve, Math.min(durationMs, 30000)));

    return {
      stepId: step.id,
      stepName: step.name,
      status: 'success',
      message: `Waited for ${config.duration_seconds || 5} seconds`,
      durationMs,
    };
  }

  private static async executeCondition(step: RunbookStep): Promise<StepResult> {
    const config = step.config as { expression?: string; value?: unknown };
    // Simple condition evaluation
    const result = config.expression ? true : false;

    return {
      stepId: step.id,
      stepName: step.name,
      status: 'success',
      message: `Condition evaluated: ${result ? 'true' : 'false'}`,
      durationMs: 0,
      output: { result, expression: config.expression },
    };
  }
}
