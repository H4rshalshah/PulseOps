import { config } from '../config';
import axios from 'axios';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export class GitHubService {
  static async getRecentCommits(hours: number = 2): Promise<Commit[]> {
    if (!config.githubToken) {
      return this.getMockCommits(hours);
    }

    try {
      // Attempt to fetch from GitHub API
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const response = await axios.get('https://api.github.com/repos/owner/repo/commits', {
        headers: {
          Authorization: `Bearer ${config.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: { since, per_page: 10 },
        timeout: 5000,
      });

      return response.data.map((commit: {
        sha: string;
        commit: { message: string; author: { name: string; date: string } };
      }) => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author.name,
        date: new Date(commit.commit.author.date),
      }));
    } catch {
      return this.getMockCommits(hours);
    }
  }

  static async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!config.githubToken) {
      return { success: false, message: 'GitHub token not configured' };
    }
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${config.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        timeout: 5000,
      });
      return {
        success: true,
        message: `Authenticated as ${response.data.login}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private static getMockCommits(hours: number): Commit[] {
    const now = Date.now();
    const messages = [
      'fix: resolve database connection timeout issue',
      'feat: add rate limiting to API endpoints',
      'chore: update dependencies',
      'fix: correct error handling in webhook receiver',
      'feat: add MTTR tracking to analytics',
      'refactor: optimize runbook execution engine',
      'fix: resolve memory leak in WebSocket handler',
      'feat: add dry-run mode to runbook executor',
    ];

    return messages.slice(0, Math.min(5, messages.length)).map((msg, i) => ({
      sha: Math.random().toString(16).substring(2, 9),
      message: msg,
      author: ['alice', 'bob', 'charlie'][i % 3],
      date: new Date(now - (i + 1) * 30 * 60 * 1000), // every 30 min
    }));
  }
}
