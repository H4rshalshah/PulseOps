import { config } from '../config';
import axios from 'axios';

export class NotificationService {
  static async sendSlackNotification(message: string): Promise<boolean> {
    if (!config.slackWebhookUrl) {
      console.warn('Slack webhook URL not configured');
      return false;
    }

    try {
      await axios.post(config.slackWebhookUrl, { text: message });
      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  static async escalateToPagerDuty(incidentId: string): Promise<boolean> {
    if (!config.pagerdutyApiKey) {
      console.warn('PagerDuty API key not configured');
      return false;
    }

    try {
      await axios.post(
        'https://events.pagerduty.com/v2/enqueue',
        {
          routing_key: config.pagerdutyApiKey,
          event_action: 'trigger',
          payload: {
            summary: `Incident escalation: ${incidentId}`,
            severity: 'critical',
            source: 'DeadMan',
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return true;
    } catch (error) {
      console.error('Failed to escalate to PagerDuty:', error);
      return false;
    }
  }

  static async testSlackConnection(): Promise<{ success: boolean; message: string }> {
    if (!config.slackWebhookUrl) {
      return { success: false, message: 'Slack webhook URL not configured' };
    }
    try {
      await axios.post(config.slackWebhookUrl, { text: '🧪 DeadMan test notification - Connection successful!' });
      return { success: true, message: 'Slack webhook is working' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testPagerDutyConnection(): Promise<{ success: boolean; message: string }> {
    if (!config.pagerdutyApiKey) {
      return { success: false, message: 'PagerDuty API key not configured' };
    }
    return { success: true, message: 'PagerDuty API key is configured' };
  }
}
