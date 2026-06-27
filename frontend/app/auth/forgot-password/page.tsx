'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { authApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Loader2, ArrowLeft, Mail, CheckCircle, ExternalLink, Copy } from 'lucide-react';
import type { ForgotPasswordResponse } from '@/lib/types';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required');
      return;
    }
    try {
      setLoading(true);
      const result: ForgotPasswordResponse = await authApi.forgotPassword(email);
      // In development mode, the backend returns a reset link directly
      if (result.devResetLink) {
        setDevLink(result.devResetLink);
      }
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Reset link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-pulseops-bg flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#7EC8E3 1px, transparent 1px), linear-gradient(90deg, #7EC8E3 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={48} />
          </div>
          <h1 className="text-2xl font-heading font-bold text-pulseops-text">Reset password</h1>
          <p className="text-sm text-pulseops-muted mt-1">Enter your email to receive a reset link</p>
        </div>

        <div className="bg-pulseops-surface border border-pulseops-border rounded-2xl p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-4 bg-pulseops-success/10 rounded-full flex items-center justify-center">
                <CheckCircle size={24} className="text-pulseops-success" />
              </div>
              <p className="text-sm text-pulseops-text mb-1">Check your email</p>
              <p className="text-xs text-pulseops-muted">
                If an account exists for {email}, we&apos;ve sent a password reset link.
              </p>
              
              {/* Dev mode reset link */}
              {devLink && (
                <div className="mt-4 p-3 bg-pulseops-cyan/10 border border-pulseops-cyan/20 rounded-xl">
                  <p className="text-[10px] text-pulseops-cyan font-medium uppercase tracking-wider mb-2">
                    🔧 Development Mode — Reset Link
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-pulseops-cyan font-mono truncate bg-pulseops-bg px-2 py-1.5 rounded-lg">
                      {devLink}
                    </code>
                    <button
                      onClick={() => copyToClipboard(devLink)}
                      className="p-1.5 text-pulseops-cyan hover:bg-pulseops-cyan/20 rounded-lg transition-colors shrink-0"
                      title="Copy link"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      href={devLink}
                      className="p-1.5 text-pulseops-cyan hover:bg-pulseops-cyan/20 rounded-lg transition-colors shrink-0"
                      title="Open reset link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}
              
              <Link href="/auth/login" className="inline-flex items-center gap-1 mt-4 text-sm text-pulseops-cyan hover:text-pulseops-cyan/80 transition-colors">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pulseops-text mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulseops-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-pulseops-bg border border-pulseops-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-pulseops-cyan text-pulseops-bg font-medium rounded-xl hover:bg-pulseops-cyan/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-pulseops-muted">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-pulseops-cyan hover:text-pulseops-cyan/80 transition-colors">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
