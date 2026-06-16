import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProjectModel } from '../models/Project';
import { WorkspaceMemberModel, UserRole } from '../models/User';
import { z } from 'zod';
import axios from 'axios';

const createProjectSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  environment: z.enum(['production', 'staging', 'development']).optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  healthCheckUrl: z.string().url().optional().or(z.literal('')),
  repositoryUrl: z.string().url().optional().or(z.literal('')),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  environment: z.enum(['production', 'staging', 'development']).optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  healthCheckUrl: z.string().url().optional().or(z.literal('')),
  repositoryUrl: z.string().url().optional().or(z.literal('')),
  healthCheckInterval: z.number().min(30).max(3600).optional(),
});

export class ProjectController {
  private static async requireWorkspaceRole(
    req: AuthRequest,
    res: Response,
    workspaceId: string,
    roles: UserRole[] = ['owner', 'admin', 'engineer', 'viewer']
  ): Promise<boolean> {
    const role = await WorkspaceMemberModel.getRole(req.userId!, workspaceId);
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return false;
    }
    req.workspaceRole = role;
    return true;
  }

  private static async loadProjectForUser(req: AuthRequest, res: Response, roles?: UserRole[]) {
    const project = await ProjectModel.findById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return null;
    }
    const allowed = await ProjectController.requireWorkspaceRole(req, res, project.workspaceId, roles);
    return allowed ? project : null;
  }

  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId } = req.query;
      if (!workspaceId) {
        res.status(400).json({ error: 'workspaceId is required' });
        return;
      }
      if (!await ProjectController.requireWorkspaceRole(req, res, workspaceId as string)) return;
      const projects = await ProjectModel.findByWorkspace(workspaceId as string);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await ProjectController.loadProjectForUser(req, res);
      if (!project) return;
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const parsed = createProjectSchema.parse(req.body);
      if (!await ProjectController.requireWorkspaceRole(req, res, parsed.workspaceId, ['owner', 'admin', 'engineer'])) return;
      const project = await ProjectModel.create({ ...parsed, userId: req.userId! });
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const updates = updateProjectSchema.parse(req.body);
      const existing = await ProjectController.loadProjectForUser(req, res, ['owner', 'admin', 'engineer']);
      if (!existing) return;
      const project = await ProjectModel.update(req.params.id, updates as any);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const existing = await ProjectController.loadProjectForUser(req, res, ['owner', 'admin']);
      if (!existing) return;
      const deleted = await ProjectModel.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  static async regenerateWebhookToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await ProjectController.loadProjectForUser(req, res, ['owner', 'admin']);
      if (!project) return;

      const token = await ProjectModel.regenerateWebhookToken(req.params.id);
      if (!token) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json({ webhookToken: token });
    } catch (error) {
      res.status(500).json({ error: 'Failed to regenerate webhook token' });
    }
  }

  static async testHealthCheck(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await ProjectController.loadProjectForUser(req, res, ['owner', 'admin', 'engineer']);
      if (!project) return;

      if (!project.healthCheckUrl) {
        res.status(400).json({ error: 'No health check URL configured' });
        return;
      }

      const start = Date.now();
      let statusCode: number | null = null;
      let isHealthy = false;
      let errorMessage: string | null = null;

      try {
        const response = await axios.get(project.healthCheckUrl, {
          timeout: 10000,
          validateStatus: () => true,
        });
        statusCode = response.status;
        isHealthy = statusCode >= 200 && statusCode < 500;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Connection failed';
        isHealthy = false;
      }

      const latencyMs = Date.now() - start;

      // Update project status
      await ProjectModel.update(project.id, {
        status: isHealthy ? 'healthy' : 'degraded',
      });

      const record = await (await import('../models/Project')).HealthCheckModel.create({
        projectId: project.id,
        statusCode,
        latencyMs,
        isHealthy,
        errorMessage,
      });

      res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        statusCode,
        latencyMs,
        checkedAt: record.checkedAt,
        error: errorMessage,
      });
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  }

  static async getHealthChecks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await ProjectController.loadProjectForUser(req, res);
      if (!project) return;
      const { HealthCheckModel } = await import('../models/Project');
      const records = await HealthCheckModel.findByProject(req.params.id);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch health checks' });
    }
  }
}
