import { Incident } from '../models/Incident';
import { GitHubService } from './GitHubService';
import { IncidentService } from './IncidentService';

export interface SituationReport {
  generatedAt: Date;
  incidentSummary: Incident;
  recentDeployments: { sha: string; message: string; author: string; date: Date }[];
  errorRateData: { timestamp: string; rate: number }[];
  affectedServices: string[];
  similarPastIncidents: Incident[];
  recommendedActions: string[];
}

export class SituationReportService {
  static async generate(incident: Incident): Promise<SituationReport> {
    const [commits, similarIncidents] = await Promise.all([
      GitHubService.getRecentCommits(2), // last 2 hours
      IncidentService.findSimilar(incident.title),
    ]);

    const affectedServices = await this.detectAffectedServices(incident);
    const errorRateData = this.generateErrorRateData();
    const recommendedActions = this.generateRecommendations(incident, commits);

    return {
      generatedAt: new Date(),
      incidentSummary: incident,
      recentDeployments: commits,
      errorRateData,
      affectedServices,
      similarPastIncidents: similarIncidents,
      recommendedActions,
    };
  }

  private static async detectAffectedServices(incident: Incident): Promise<string[]> {
    const services: string[] = [];

    if (incident.service_name) {
      services.push(incident.service_name);
    }

    // Add related services based on severity/type
    if (incident.severity === 'critical' || incident.severity === 'high') {
      services.push(`${incident.service_name || 'api'}-database`);
      services.push(`${incident.service_name || 'api'}-cache`);
    }

    return services.length > 0 ? services : ['api-gateway', 'auth-service'];
  }

  private static generateErrorRateData(): { timestamp: string; rate: number }[] {
    const now = Date.now();
    const data: { timestamp: string; rate: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(now - i * 60000).toISOString();
      const rate = Math.round(Math.random() * 100) / 10 + 2; // 2-12% range
      data.push({ timestamp, rate });
    }

    return data;
  }

  private static generateRecommendations(
    incident: Incident,
    commits: { sha: string; message: string }[]
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push('1. Check recent deployments for rollback candidates');
    recommendations.push('2. Verify MongoDB connection health and query latency');
    recommendations.push('3. Review error rates in monitoring dashboard');

    if (commits.length > 0) {
      recommendations.push(`4. Investigate recent commit: "${commits[0].message.substring(0, 60)}"`);
    }

    if (incident.severity === 'critical') {
      recommendations.push('5. ⚠️ CRITICAL: Page on-call engineering lead immediately');
      recommendations.push('6. ⚠️ CRITICAL: Consider full service rollback');
    }

    recommendations.push('7. Run health check endpoints to verify system status');
    recommendations.push('8. Document incident timeline for post-mortem review');

    return recommendations;
  }
}
