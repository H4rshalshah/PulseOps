'use client';

import { useState, useEffect, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastOptions {
  duration?: number;
}

const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];
let counter = 0;

function notifyListeners() {
  listeners.forEach((l) => l([...toasts]));
}

function addToast(message: string, type: ToastType, options?: ToastOptions) {
  const id = `toast-${++counter}`;
  const toast: Toast = { id, message, type };
  toasts = [...toasts, toast];
  notifyListeners();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, options?.duration || 4000);
}

export const toast = {
  success: (message: string, options?: ToastOptions) => addToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => addToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => addToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => addToast(message, 'warning', options),
};

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    listeners.push(setCurrentToasts);
    return () => {
      const idx = listeners.indexOf(setCurrentToasts);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  return { toasts: currentToasts, dismiss };
}
