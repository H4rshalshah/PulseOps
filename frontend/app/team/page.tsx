'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { workspaceApi, authApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import {
  Loader2, UserPlus, Shield, ShieldOff, Trash2, Mail, CheckCircle, XCircle,
  Users, UserCog, AlertTriangle
} from 'lucide-react';
import type { WorkspaceMember, Invite } from '@/lib/types';

const roleColors: Record<string, string> = {
  owner: 'text-pulseops-warning bg-pulseops-warning/10',
  admin: 'text-pulseops-cyan bg-pulseops-cyan/10',
  engineer: 'text-pulseops-success bg-pulseops-success/10',
  viewer: 'text-pulseops-muted bg-pulseops-border/50',
};

const roleBadgeLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  engineer: 'Engineer',
  viewer: 'Viewer',
};

export default function TeamPage() {
  const [members, setMembers] = useState<(WorkspaceMember & { user?: any })[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('engineer');
  const [inviting, setInviting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ws = await workspaceApi.getCurrent();
      setWorkspace(ws);
      if (ws) {
        const [mems, invs] = await Promise.all([
          workspaceApi.getMembers(ws.id),
          workspaceApi.getInvites(ws.id),
        ]);
        setMembers(mems);
        setInvites(invs);
      }
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !workspace) return;
    try {
      setInviting(true);
      await workspaceApi.inviteMember(workspace.id, inviteEmail, inviteRole);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    if (!workspace) return;
    try {
      await workspaceApi.changeMemberRole(workspace.id, memberId, role);
      toast.success('Role updated');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspace) return;
    try {
      await workspaceApi.removeMember(workspace.id, memberId);
      toast.success('Member removed');
      setConfirmDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!workspace) return;
    try {
      await workspaceApi.revokeInvite(workspace.id, inviteId);
      toast.success('Invite revoked');
      loadData();
    } catch {
      toast.error('Failed to revoke invite');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-pulseops-cyan animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-24">
        <AlertTriangle size={48} className="mx-auto mb-4 text-pulseops-warning" />
        <h2 className="text-xl font-heading font-bold text-pulseops-text mb-2">No Workspace Found</h2>
        <p className="text-sm text-pulseops-muted">Create a workspace to manage your team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-pulseops-text">Team</h1>
        <p className="text-sm text-pulseops-muted mt-1">{workspace.name} — {members.length} members</p>
      </div>

      {/* Invite Members */}
      <div className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-pulseops-text mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-pulseops-cyan" />
          Invite Members
        </h3>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulseops-muted" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full bg-pulseops-bg border border-pulseops-border rounded-lg pl-10 pr-4 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text outline-none focus:border-pulseops-cyan/50 transition-colors"
          >
            <option value="admin">Admin</option>
            <option value="engineer">Engineer</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="flex items-center gap-1.5 px-4 py-2 bg-pulseops-cyan text-pulseops-bg font-medium rounded-lg hover:bg-pulseops-cyan/90 disabled:opacity-50 transition-all text-sm"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Send Invite
          </button>
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-pulseops-text mb-4 flex items-center gap-2">
            <Mail size={16} className="text-pulseops-warning" />
            Pending Invites ({invites.length})
          </h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-pulseops-bg/50">
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-pulseops-muted" />
                  <span className="text-sm text-pulseops-text">{invite.email}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColors[invite.role]}`}>
                    {roleBadgeLabels[invite.role]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-pulseops-muted">
                    Expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                  </span>
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="p-1 text-pulseops-muted hover:text-pulseops-danger transition-colors"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-pulseops-surface border border-pulseops-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-pulseops-border">
          <h3 className="text-sm font-medium text-pulseops-text flex items-center gap-2">
            <Users size={16} className="text-pulseops-cyan" />
            Team Members ({members.length})
          </h3>
        </div>
        <div className="divide-y divide-pulseops-border">
          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto mb-2 text-pulseops-muted" />
              <p className="text-sm text-pulseops-muted">No members yet</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-5 py-3 hover:bg-pulseops-cyan/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pulseops-cyan/20 flex items-center justify-center">
                    <span className="text-xs font-mono font-bold text-pulseops-cyan">
                      {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-pulseops-text">{member.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-pulseops-muted">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {member.role === 'owner' ? (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColors.owner}`}>
                      Owner
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="bg-pulseops-bg border border-pulseops-border rounded-lg px-2 py-1 text-xs text-pulseops-text outline-none focus:border-pulseops-cyan/50 transition-colors"
                    >
                      <option value="admin">Admin</option>
                      <option value="engineer">Engineer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                  {member.role !== 'owner' && (
                    <>
                      {confirmDelete === member.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1 text-pulseops-danger hover:bg-pulseops-danger/10 rounded transition-colors"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="p-1 text-pulseops-muted hover:bg-pulseops-border rounded transition-colors"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(member.id)}
                          className="p-1 text-pulseops-muted hover:text-pulseops-danger transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
