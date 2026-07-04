import React, { useState } from 'react';
import { api } from '../api.js';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSuccess }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Sandbox form states
  const [showSandboxForm, setShowSandboxForm] = useState(false);
  const [sandboxName, setSandboxName] = useState('');
  const [sandboxEmail, setSandboxEmail] = useState('');

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    setError(null);
    try {
      const loggedUser = await api.signInWithGoogle();
      if (loggedUser) {
        onSuccess(loggedUser.id, loggedUser);
        onClose();
      } else {
        throw new Error('Authentication returned an empty user record.');
      }
    } catch (err: any) {
      console.error(err);
      // Let them know Google Login failed, likely due to iframe restrictions
      setError(
        err.message?.includes('popup-closed-by-user')
          ? 'Google sign-in popup was closed before completion.'
          : 'Google popup blocked or failed (Common inside development iframes). Please try the "Instant Demo Account" option below!'
      );
      setLoadingProvider(null);
    }
  };

  const handleSandboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxName.trim()) {
      setError('Please provide a display name.');
      return;
    }
    
    setLoadingProvider('sandbox');
    setError(null);
    
    try {
      const loggedUser = await api.signInSandbox(sandboxName.trim(), sandboxEmail.trim());
      if (loggedUser) {
        onSuccess(loggedUser.id, loggedUser);
        onClose();
      } else {
        throw new Error('Failed to start sandbox session.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during Sandbox authentication.');
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-slide-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="size-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex size-14 items-center justify-center bg-accent/10 text-accent rounded-2xl mb-4">
            <svg className="size-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Join goshare.lol</h2>
          <p className="text-slate-500 text-sm mt-1.5">
            Create your personalized creator directory and start sharing assets with your audience.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs text-center mb-5 leading-relaxed font-mono">
            {error}
          </div>
        )}

        {!showSandboxForm ? (
          <div className="space-y-3.5">
            <button
              onClick={handleGoogleLogin}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 border border-slate-200 py-3 rounded-2xl font-semibold hover:bg-slate-50 transition-all duration-150 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {loadingProvider === 'google' ? (
                <div className="size-5 border-2 border-slate-900/10 border-t-slate-900 rounded-full animate-spin"></div>
              ) : (
                <svg className="size-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.7c0-.47-.01-.94-.01-.47z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.08 1.16c-3.13 0-5.78-2.11-6.73-4.96H1.29v3.15C3.26 21.88 7.39 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.24A7.18 7.18 0 0 1 4.9 12c0-.79.13-1.57.37-2.31V6.54H1.29A11.94 11.94 0 0 0 0 12c0 1.92.4 3.74 1.29 5.46l3.98-3.22z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0C7.39 0 3.26 2.12 1.29 5.46l3.98 3.22c.95-2.85 3.6-4.93 6.73-4.93z" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4 flex py-2 items-center">
              <div className="flex-grow border-t border-slate-150"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-mono">OR</span>
              <div className="flex-grow border-t border-slate-150"></div>
            </div>

            <button
              onClick={() => setShowSandboxForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-2xl font-semibold border border-slate-200 transition-all cursor-pointer"
            >
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Instant Demo Account (Fast Iframe Bypass)</span>
            </button>
            
            <p className="text-[10px] text-center text-slate-400 font-mono mt-3">
              Standard OAuth popups are sometimes blocked inside isolated web builders. Use Demo Account for an instant, fully functioning simulation mapped to real cloud database.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSandboxSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Owen Harris"
                value={sandboxName}
                onChange={(e) => setSandboxName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="e.g. owen@example.com"
                value={sandboxEmail}
                onChange={(e) => setSandboxEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-mono"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSandboxForm(false)}
                className="flex-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl text-sm transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loadingProvider === 'sandbox'}
                className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-2xl text-sm transition-all shadow-md shadow-accent/15 cursor-pointer disabled:opacity-50"
              >
                {loadingProvider === 'sandbox' ? 'Entering...' : 'Enter Dashboard'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
