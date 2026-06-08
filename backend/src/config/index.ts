import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/deadman',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  pagerdutyApiKey: process.env.PAGERDUTY_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
