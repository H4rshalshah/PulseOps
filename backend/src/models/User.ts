import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isUsingMemoryStore } from '../db/connection';

export type AuthProvider = 'email' | 'google' | 'github';
export type UserRole = 'owner' | 'admin' | 'engineer' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  googleId: string | null;
  githubId: string | null;
  role: UserRole;
  emailVerified: boolean;
  currentWorkspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  invitedBy: string | null;
  joinedAt: Date | null;
  createdAt: Date;
}

export interface Invite {
  id: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

const UserSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  authProvider: { type: String, enum: ['email', 'google', 'github'], default: 'email' },
  googleId: { type: String, default: null, index: true },
  githubId: { type: String, default: null, index: true },
  role: { type: String, enum: ['owner', 'admin', 'engineer', 'viewer'], default: 'engineer' },
  emailVerified: { type: Boolean, default: false },
  currentWorkspaceId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const WorkspaceSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const WorkspaceMemberSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  workspaceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, enum: ['owner', 'admin', 'engineer', 'viewer'], default: 'engineer' },
  invitedBy: { type: String, default: null },
  joinedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const InviteSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  workspaceId: { type: String, required: true, index: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['admin', 'engineer', 'viewer'], default: 'engineer' },
  token: { type: String, required: true, unique: true, index: true },
  invitedBy: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  acceptedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

WorkspaceSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

WorkspaceMemberSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

InviteSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const UserDocument = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const WorkspaceDocument = mongoose.models.Workspace || mongoose.model<Workspace>('Workspace', WorkspaceSchema);
export const WorkspaceMemberDocument = mongoose.models.WorkspaceMember || mongoose.model<WorkspaceMember>('WorkspaceMember', WorkspaceMemberSchema);
export const InviteDocument = mongoose.models.Invite || mongoose.model<Invite>('Invite', InviteSchema);

// In-memory stores
export const userMemoryStore: User[] = [];
export const workspaceMemoryStore: Workspace[] = [];
export const workspaceMemberMemoryStore: WorkspaceMember[] = [];
export const inviteMemoryStore: Invite[] = [];

function normalize<T>(doc: unknown): T {
  const value = typeof (doc as { toJSON?: () => unknown })?.toJSON === 'function'
    ? (doc as { toJSON: () => T }).toJSON()
    : doc;
  return value as T;
}

// User Model
export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    if (isUsingMemoryStore()) return userMemoryStore.find((u) => u.email === email) || null;
    const doc = await UserDocument.findOne({ email: email.toLowerCase() });
    return doc ? normalize<User>(doc) : null;
  }

  static async findById(id: string): Promise<User | null> {
    if (isUsingMemoryStore()) return userMemoryStore.find((u) => u.id === id) || null;
    const doc = await UserDocument.findOne({ id });
    return doc ? normalize<User>(doc) : null;
  }

  static async create(data: Partial<User> & { email: string; name: string }): Promise<User> {
    const user: User = {
      id: uuidv4(),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash || null,
      avatarUrl: data.avatarUrl || null,
      authProvider: data.authProvider || 'email',
      googleId: data.googleId || null,
      githubId: data.githubId || null,
      role: data.role || 'engineer',
      emailVerified: data.emailVerified || false,
      currentWorkspaceId: data.currentWorkspaceId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isUsingMemoryStore()) {
      userMemoryStore.push(user);
      return user;
    }

    return normalize<User>(await UserDocument.create(user));
  }

  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    const payload = { ...updates, updatedAt: new Date() };
    if (isUsingMemoryStore()) {
      const idx = userMemoryStore.findIndex((u) => u.id === id);
      if (idx === -1) return null;
      userMemoryStore[idx] = { ...userMemoryStore[idx], ...payload };
      return userMemoryStore[idx];
    }
    const doc = await UserDocument.findOneAndUpdate({ id }, payload, { new: true });
    return doc ? normalize<User>(doc) : null;
  }

  static async findByOAuth(provider: AuthProvider, email: string): Promise<User | null> {
    if (isUsingMemoryStore()) {
      return userMemoryStore.find((u) => u.authProvider === provider && u.email === email) || null;
    }
    const doc = await UserDocument.findOne({ authProvider: provider, email: email.toLowerCase() });
    return doc ? normalize<User>(doc) : null;
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    if (isUsingMemoryStore()) return userMemoryStore.find((u) => u.googleId === googleId) || null;
    const doc = await UserDocument.findOne({ googleId });
    return doc ? normalize<User>(doc) : null;
  }

  static async findByGithubId(githubId: string): Promise<User | null> {
    if (isUsingMemoryStore()) return userMemoryStore.find((u) => u.githubId === githubId) || null;
    const doc = await UserDocument.findOne({ githubId });
    return doc ? normalize<User>(doc) : null;
  }
}

// Workspace Model
export class WorkspaceModel {
  static async create(data: { name: string; slug: string; ownerId: string }): Promise<Workspace> {
    const workspace: Workspace = {
      id: uuidv4(),
      name: data.name,
      slug: data.slug,
      ownerId: data.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isUsingMemoryStore()) {
      workspaceMemoryStore.push(workspace);
      return workspace;
    }
    return normalize<Workspace>(await WorkspaceDocument.create(workspace));
  }

  static async findById(id: string): Promise<Workspace | null> {
    if (isUsingMemoryStore()) return workspaceMemoryStore.find((w) => w.id === id) || null;
    const doc = await WorkspaceDocument.findOne({ id });
    return doc ? normalize<Workspace>(doc) : null;
  }

  static async findBySlug(slug: string): Promise<Workspace | null> {
    if (isUsingMemoryStore()) return workspaceMemoryStore.find((w) => w.slug === slug) || null;
    const doc = await WorkspaceDocument.findOne({ slug });
    return doc ? normalize<Workspace>(doc) : null;
  }

  static async update(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const payload = { ...updates, updatedAt: new Date() };
    if (isUsingMemoryStore()) {
      const idx = workspaceMemoryStore.findIndex((w) => w.id === id);
      if (idx === -1) return null;
      workspaceMemoryStore[idx] = { ...workspaceMemoryStore[idx], ...payload };
      return workspaceMemoryStore[idx];
    }
    const doc = await WorkspaceDocument.findOneAndUpdate({ id }, payload, { new: true });
    return doc ? normalize<Workspace>(doc) : null;
  }

  static async delete(id: string): Promise<boolean> {
    if (isUsingMemoryStore()) {
      const before = workspaceMemoryStore.length;
      const idx = workspaceMemoryStore.findIndex((w) => w.id === id);
      if (idx === -1) return false;
      workspaceMemoryStore.splice(idx, 1);
      return true;
    }
    const result = await WorkspaceDocument.deleteOne({ id });
    return result.deletedCount > 0;
  }

  static async findByUser(userId: string): Promise<(Workspace & { role: string })[]> {
    if (isUsingMemoryStore()) {
      const memberships = workspaceMemberMemoryStore.filter((m) => m.userId === userId && m.joinedAt !== null);
      return memberships.map((m) => {
        const ws = workspaceMemoryStore.find((w) => w.id === m.workspaceId);
        return ws ? { ...ws, role: m.role } : null;
      }).filter(Boolean) as (Workspace & { role: string })[];
    }
    const memberships = await WorkspaceMemberDocument.find({ userId, joinedAt: { $ne: null } });
    const workspaceIds = memberships.map((m) => m.workspaceId);
    const workspaces = await WorkspaceDocument.find({ id: { $in: workspaceIds } });
    return workspaces.map((ws) => {
      const member = memberships.find((m) => m.workspaceId === ws.id);
      return { ...normalize<Workspace>(ws), role: member?.role || 'viewer' };
    });
  }
}

// WorkspaceMember Model
export class WorkspaceMemberModel {
  static async add(data: { workspaceId: string; userId: string; role: UserRole; invitedBy?: string }): Promise<WorkspaceMember> {
    const member: WorkspaceMember = {
      id: uuidv4(),
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role,
      invitedBy: data.invitedBy || null,
      joinedAt: new Date(),
      createdAt: new Date(),
    };

    if (isUsingMemoryStore()) {
      workspaceMemberMemoryStore.push(member);
      return member;
    }
    return normalize<WorkspaceMember>(await WorkspaceMemberDocument.create(member));
  }

  static async findByWorkspace(workspaceId: string): Promise<(WorkspaceMember & { user?: User })[]> {
    if (isUsingMemoryStore()) {
      return workspaceMemberMemoryStore
        .filter((m) => m.workspaceId === workspaceId)
        .map((m) => ({
          ...m,
          user: userMemoryStore.find((u) => u.id === m.userId),
        }));
    }
    const members = await WorkspaceMemberDocument.find({ workspaceId });
    const userIds = members.map((m) => m.userId);
    const users = await UserDocument.find({ id: { $in: userIds } });
    return members.map((m) => {
      const user = users.find((u) => u.id === m.userId);
      return { ...normalize<WorkspaceMember>(m), user: user ? normalize<User>(user) : undefined };
    });
  }

  static async findByUserAndWorkspace(userId: string, workspaceId: string): Promise<WorkspaceMember | null> {
    if (isUsingMemoryStore()) {
      return workspaceMemberMemoryStore.find((m) => m.userId === userId && m.workspaceId === workspaceId) || null;
    }
    const doc = await WorkspaceMemberDocument.findOne({ userId, workspaceId });
    return doc ? normalize<WorkspaceMember>(doc) : null;
  }

  static async updateRole(id: string, role: UserRole): Promise<WorkspaceMember | null> {
    if (isUsingMemoryStore()) {
      const idx = workspaceMemberMemoryStore.findIndex((m) => m.id === id);
      if (idx === -1) return null;
      workspaceMemberMemoryStore[idx].role = role;
      return workspaceMemberMemoryStore[idx];
    }
    const doc = await WorkspaceMemberDocument.findOneAndUpdate({ id }, { role }, { new: true });
    return doc ? normalize<WorkspaceMember>(doc) : null;
  }

  static async remove(id: string): Promise<boolean> {
    if (isUsingMemoryStore()) {
      const idx = workspaceMemberMemoryStore.findIndex((m) => m.id === id);
      if (idx === -1) return false;
      workspaceMemberMemoryStore.splice(idx, 1);
      return true;
    }
    const result = await WorkspaceMemberDocument.deleteOne({ id });
    return result.deletedCount > 0;
  }

  static async getRole(userId: string, workspaceId: string): Promise<UserRole | null> {
    const member = await this.findByUserAndWorkspace(userId, workspaceId);
    return member?.role || null;
  }
}

// Invite Model
export class InviteModel {
  static async create(data: { workspaceId: string; email: string; role: UserRole; invitedBy: string; expiresInHours?: number }): Promise<Invite> {
    const invite: Invite = {
      id: uuidv4(),
      workspaceId: data.workspaceId,
      email: data.email.toLowerCase(),
      role: data.role,
      token: uuidv4().replace(/-/g, ''),
      invitedBy: data.invitedBy,
      expiresAt: new Date(Date.now() + (data.expiresInHours || 48) * 3600000),
      acceptedAt: null,
      createdAt: new Date(),
    };

    if (isUsingMemoryStore()) {
      inviteMemoryStore.push(invite);
      return invite;
    }
    return normalize<Invite>(await InviteDocument.create(invite));
  }

  static async findByToken(token: string): Promise<Invite | null> {
    if (isUsingMemoryStore()) return inviteMemoryStore.find((i) => i.token === token) || null;
    const doc = await InviteDocument.findOne({ token });
    return doc ? normalize<Invite>(doc) : null;
  }

  static async findByWorkspace(workspaceId: string): Promise<Invite[]> {
    if (isUsingMemoryStore()) {
      return inviteMemoryStore.filter((i) => i.workspaceId === workspaceId && !i.acceptedAt);
    }
    const docs = await InviteDocument.find({ workspaceId, acceptedAt: null });
    return docs.map((d) => normalize<Invite>(d));
  }

  static async accept(token: string): Promise<Invite | null> {
    if (isUsingMemoryStore()) {
      const idx = inviteMemoryStore.findIndex((i) => i.token === token);
      if (idx === -1) return null;
      inviteMemoryStore[idx].acceptedAt = new Date();
      return inviteMemoryStore[idx];
    }
    const doc = await InviteDocument.findOneAndUpdate({ token }, { acceptedAt: new Date() }, { new: true });
    return doc ? normalize<Invite>(doc) : null;
  }

  static async revoke(id: string): Promise<boolean> {
    if (isUsingMemoryStore()) {
      const idx = inviteMemoryStore.findIndex((i) => i.id === id);
      if (idx === -1) return false;
      inviteMemoryStore.splice(idx, 1);
      return true;
    }
    const result = await InviteDocument.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
