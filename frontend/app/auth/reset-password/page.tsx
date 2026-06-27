'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { authApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      await authApi.resetPassword(token, password);
      setDone(true);
      toast.success('Password reset successfully');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-heading font-bold text-pulseops-text">Set new password</h1>
          <p className="text-sm text-pulseops-muted mt-1">Enter your new password below</p>
        </div>

        <div className="bg-pulseops-surface border border-pulseops-border rounded-2xl p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-4 bg-pulseops-success/10 rounded-full flex items-center justify-center">
                <CheckCircle size={24} className="text-pulseops-success" />
              </div>
              <p className="text-sm text-pulseops-text mb-1">Password reset successful</p>
              <p className="text-xs text-pulseops-muted">Redirecting to login...</p>
            </div>
          ) : !token ? (
            <div className="text-center py-4">
              <p className="text-sm text-pulseops-danger mb-4">Invalid or missing reset token</p>
              <Link href="/auth/forgot-password" className="text-sm text-pulseops-cyan hover:text-pulseops-cyan/80 transition-colors">
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pulseops-text mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-pulseops-bg border border-pulseops-border rounded-xl px-4 py-2.5 pr-10 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-pulseops-muted hover:text-pulseops-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-pulseops-text mb-1.5">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-pulseops-bg border border-pulseops-border rounded-xl px-4 py-2.5 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-pulseops-cyan text-pulseops-bg font-medium rounded-xl hover:bg-pulseops-cyan/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-pulseops-muted">
          <Link href="/auth/login" className="text-pulseops-cyan hover:text-pulseops-cyan/80 transition-colors">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
