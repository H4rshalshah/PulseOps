import { Request, Response } from 'express';
import { AuthService, AuthTokens } from '../services/AuthService';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { EmailService } from '../services/EmailService';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'deadman-dev-jwt-secret-change-in-production';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').trim();

// Store OAuth state values for CSRF protection (in production, use Redis)
const oauthStateStore = new Map<string, number>();
setInterval(() => {
  // Clean up expired states (older than 10 minutes)
  const now = Date.now();
  for (const [key, time] of oauthStateStore) {
    if (now - time > 600000) oauthStateStore.delete(key);
  }
}, 60000);

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

// Shared helper to generate and store OAuth state
function generateOAuthState(): string {
  const state = uuidv4();
  oauthStateStore.set(state, Date.now());
  return state;
}

// Response types for better typing
export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  devResetLink?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
}

export interface VerifyEmailResponse {
  success: boolean;
}

export interface LogoutResponse {
  success: boolean;
}

export class AuthController {
  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const parsed = signupSchema.parse(req.body);
      const result = await AuthService.signupEmail(parsed.name, parsed.email, parsed.password);
      
      // Create default workspace for new users
      const defaultName = `${parsed.name.split(' ')[0]}'s Workspace`;
      await AuthService.createWorkspace(result.user.id, defaultName);

      // Send verification email (async, non-blocking)
      const verifyToken = jwt.sign({ userId: result.user.id }, JWT_SECRET, { expiresIn: '24h' });
      const verifyLink = `${FRONTEND_URL}/auth/verify-email?token=${verifyToken}`;
      EmailService.sendEmailVerification(parsed.email, verifyLink, parsed.name);
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(400).json({ error: error instanceof Error ? error.message : 'Signup failed' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.parse(req.body);
      const result = await AuthService.loginEmail(parsed.email, parsed.password);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(401).json({ error: error instanceof Error ? error.message : 'Login failed' });
    }
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    // Stateless JWT - client discards token
    res.json({ success: true });
  }

  static async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser(req.userId!);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  static async googleAuth(_req: Request, res: Response): Promise<void> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(501).json({ error: 'Google OAuth not configured' });
      return;
    }
    const state = generateOAuthState();
    const redirectUri = `${(process.env.BACKEND_URL || 'http://localhost:3001').trim()}/api/auth/google/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile&state=${state}`;
    res.redirect(url);
  }

  static async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;
      
      // Validate state for CSRF protection
      if (!state || typeof state !== 'string' || !oauthStateStore.has(state)) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=invalid_state`);
        return;
      }
      oauthStateStore.delete(state);

      if (!code) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=no_code`);
        return;
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_not_configured`);
        return;
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${(process.env.BACKEND_URL || 'http://localhost:3001').trim()}/api/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      const tokens: any = await tokenResponse.json();
      if (!tokens.access_token) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=token_exchange_failed`);
        return;
      }

      // Get user info from Google - fetches the user's data
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile: any = await userResponse.json();

      // Use the user's actual data fetched from Google
      const result = await AuthService.oAuthLogin('google', {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      });

      res.redirect(`${FRONTEND_URL}/auth/callback?token=${result.accessToken}`);
    } catch (error) {
      res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed`);
    }
  }

  static async githubAuth(_req: Request, res: Response): Promise<void> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      res.status(501).json({ error: 'GitHub OAuth not configured' });
      return;
    }
    const state = generateOAuthState();
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&state=${state}`;
    res.redirect(url);
  }

  static async githubCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;
      
      // Validate state for CSRF protection
      if (!state || typeof state !== 'string' || !oauthStateStore.has(state)) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=invalid_state`);
        return;
      }
      oauthStateStore.delete(state);

      if (!code) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=no_code`);
        return;
      }

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_not_configured`);
        return;
      }

      // Exchange code for token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokens: any = await tokenResponse.json();
      if (!tokens.access_token) {
        res.redirect(`${FRONTEND_URL}/auth/login?error=token_exchange_failed`);
        return;
      }

      // Get user info from GitHub - fetches the user's actual data
      const userResponse = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile: any = await userResponse.json();

      // Get email from GitHub - fetches from user's email data
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const emails: Array<{primary?: boolean; email?: string}> = await emailResponse.json() as Array<{primary?: boolean; email?: string}>;
      const primaryEmail = emails.find((e: any) => e.primary)?.email || profile.email;

      const result = await AuthService.oAuthLogin('github', {
        email: primaryEmail || `${profile.login}@github.com`,
        name: profile.name || profile.login,
        avatarUrl: profile.avatar_url,
      });

      res.redirect(`${FRONTEND_URL}/auth/callback?token=${result.accessToken}`);
    } catch (error) {
      res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed`);
    }
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      await UserModel.update(decoded.userId, { emailVerified: true });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Invalid or expired token' });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await UserModel.findByEmail(email);
      
      // Always return success to avoid email enumeration
      if (!user || !user.passwordHash) {
        res.json({ success: true, message: 'If the account exists, a reset link has been sent.' });
        return;
      }

      const resetToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
      const resetLink = `${FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
      
      // Send email using the user's actual email (fetched from user data)
      const sent = await EmailService.sendPasswordReset(user.email, resetLink, user.name);
      
      // In development, also return the link directly for convenience
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        res.json({
          success: true,
          message: sent
            ? 'Password reset link sent to your email.'
            : 'Password reset link created. Check the server console or use the link below.',
          devResetLink: isDev ? resetLink : undefined,
        } as ForgotPasswordResponse);
      } else {
        res.json({ success: true, message: 'If the account exists, a reset link has been sent.' });
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to process request' });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const passwordHash = await bcrypt.hash(password, 12);
      await UserModel.update(decoded.userId, { passwordHash });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(400).json({ error: 'Invalid or expired token' });
        return;
      }
      res.status(400).json({ error: 'Failed to reset password' });
    }
  }
}
