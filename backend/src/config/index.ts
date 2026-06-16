import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/deadman',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'deadman-dev-jwt-secret-change-in-production',
  sessionSecret: process.env.SESSION_SECRET || 'deadman-dev-session-secret',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  pagerdutyApiKey: process.env.PAGERDUTY_API_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').trim(),
  backendUrl: (process.env.BACKEND_URL || 'http://localhost:3001').trim(),
  encryptionSecret: process.env.ENCRYPTION_SECRET || 'deadman-dev-encryption-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Explicit OAuth callback URLs — set these in production to avoid redirect_uri mismatch
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    `${(process.env.BACKEND_URL || 'http://localhost:3001').trim()}/api/auth/google/callback`,
  githubCallbackUrl:
    process.env.GITHUB_CALLBACK_URL ||
    `${(process.env.BACKEND_URL || 'http://localhost:3001').trim()}/api/auth/github/callback`,
};
