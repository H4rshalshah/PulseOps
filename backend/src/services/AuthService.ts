import { UserModel, User, AuthProvider, WorkspaceModel, WorkspaceMemberModel, InviteModel, UserRole } from '../models/User';
import { config } from '../config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'deadman-dev-jwt-secret-change-in-production';
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

export interface AuthTokens {
  accessToken: string;
  user: Omit<User, 'passwordHash'>;
}

export class AuthService {
  static async signupEmail(name: string, email: string, password: string): Promise<AuthTokens> {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await UserModel.create({
      name,
      email,
      passwordHash,
      authProvider: 'email',
    });

    const accessToken = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }

  static async loginEmail(email: string, password: string): Promise<AuthTokens> {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new Error('This account uses OAuth. Please sign in with Google or GitHub.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const accessToken = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }

  static async oAuthLogin(provider: AuthProvider, profile: { email: string; name: string; avatarUrl?: string }): Promise<AuthTokens> {
    let user = await UserModel.findByOAuth(provider, profile.email);

    if (!user) {
      // Check if user already exists with a different auth provider (e.g. email signup)
      const existingUser = await UserModel.findByEmail(profile.email);
      if (existingUser) {
        // Link OAuth to existing account — update provider, name, verify email, etc.
        user = await UserModel.update(existingUser.id, {
          authProvider: provider,
          name: profile.name || existingUser.name,
          avatarUrl: profile.avatarUrl || existingUser.avatarUrl,
          emailVerified: true,
        });
        if (!user) throw new Error('Failed to link OAuth account');
      } else {
        // Create new user for first-time OAuth sign-in
        user = await UserModel.create({
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl || null,
          authProvider: provider,
          emailVerified: true,
        });
        // Create default workspace for new OAuth users
        const defaultName = `${profile.name.split(' ')[0]}'s Workspace`;
        const slug = `${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace`;
        const workspace = await WorkspaceModel.create({ name: defaultName, slug, ownerId: user.id });
        await WorkspaceMemberModel.add({ workspaceId: workspace.id, userId: user.id, role: 'owner' });
        await UserModel.update(user.id, { currentWorkspaceId: workspace.id });
      }
    }

    const accessToken = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }

  static async getCurrentUser(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  static async createWorkspace(userId: string, name: string): Promise<{ workspace: any; member: any }> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    const workspace = await WorkspaceModel.create({ name, slug, ownerId: userId });
    const member = await WorkspaceMemberModel.add({ workspaceId: workspace.id, userId, role: 'owner' });
    await UserModel.update(userId, { currentWorkspaceId: workspace.id });
    return { workspace, member };
  }

  static async switchWorkspace(userId: string, workspaceId: string): Promise<void> {
    const member = await WorkspaceMemberModel.findByUserAndWorkspace(userId, workspaceId);
    if (!member) throw new Error('Not a member of this workspace');
    await UserModel.update(userId, { currentWorkspaceId: workspaceId });
  }

  static async getWorkspaceWithRole(workspaceId: string, userId: string): Promise<any> {
    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) return null;
    const role = await WorkspaceMemberModel.getRole(userId, workspaceId);
    if (!role) return null;
    return { ...workspace, role };
  }

  static async inviteMember(workspaceId: string, invitedBy: string, email: string, role: UserRole): Promise<any> {
    const inviterRole = await WorkspaceMemberModel.getRole(invitedBy, workspaceId);
    if (!inviterRole || (inviterRole !== 'owner' && inviterRole !== 'admin')) {
      throw new Error('Insufficient permissions to invite members');
    }

    const invite = await InviteModel.create({
      workspaceId,
      email,
      role,
      invitedBy,
    });

    return invite;
  }

  static async acceptInvite(token: string, userId: string): Promise<any> {
    const invite = await InviteModel.findByToken(token);
    if (!invite) throw new Error('Invalid or expired invite token');
    if (invite.expiresAt < new Date()) throw new Error('Invite has expired');
    if (invite.acceptedAt) throw new Error('Invite has already been accepted');

    // Check if user is already a member
    const existingMember = await WorkspaceMemberModel.findByUserAndWorkspace(userId, invite.workspaceId);
    if (existingMember) throw new Error('Already a member of this workspace');

    await InviteModel.accept(token);
    const member = await WorkspaceMemberModel.add({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
      invitedBy: invite.invitedBy,
    });

    // Update user's current workspace
    await UserModel.update(userId, { currentWorkspaceId: invite.workspaceId });

    const workspace = await WorkspaceModel.findById(invite.workspaceId);
    return { workspace, member };
  }

  static async changeMemberRole(workspaceId: string, requesterId: string, memberId: string, newRole: UserRole): Promise<any> {
    const requesterRole = await WorkspaceMemberModel.getRole(requesterId, workspaceId);
    if (!requesterRole || (requesterRole !== 'owner' && requesterRole !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    // Cannot change owner's role
    const member = await WorkspaceMemberModel.findByUserAndWorkspace(memberId, workspaceId);
    if (!member) throw new Error('Member not found');
    if (member.role === 'owner') throw new Error('Cannot change owner role');

    // Admins cannot assign other admins
    if (newRole === 'admin' && requesterRole !== 'owner') {
      throw new Error('Only owners can assign admin role');
    }

    return WorkspaceMemberModel.updateRole(member.id, newRole);
  }

  static async removeMember(workspaceId: string, requesterId: string, memberId: string): Promise<boolean> {
    const requesterRole = await WorkspaceMemberModel.getRole(requesterId, workspaceId);
    if (!requesterRole || (requesterRole !== 'owner' && requesterRole !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    const member = await WorkspaceMemberModel.findByUserAndWorkspace(memberId, workspaceId);
    if (!member) throw new Error('Member not found');
    if (member.role === 'owner') throw new Error('Cannot remove owner');

    return WorkspaceMemberModel.remove(member.id);
  }

  private static generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
  }

  static verifyToken(token: string): { userId: string; email: string } {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  }
}
