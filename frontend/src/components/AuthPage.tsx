import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Form fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await register(email, username, password, fullName || undefined);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden backdrop-blur-sm">
      {/* Background blobs */}
      <div className="absolute top-0 -left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-0 -right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse"></div>

      {/* Theme Toggle - Top Right */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-12 h-12 rounded-2xl glass-card flex items-center justify-center shadow-2xl active:scale-95 transition-all text-xl"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="glass-card p-10 max-w-lg w-full space-y-8 relative z-10 shadow-2xl">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce">🚀</div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">
            <span className="text-gradient">CareerPath AI</span>
          </h1>
          <p className="text-lg opacity-60 font-medium">
            {isLogin ? 'Welcome back! Accelerate your career.' : 'Join the next generation of career advisory.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 text-red-500 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
             <span>⚠️</span>
             {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all group-hover:bg-white/10"
                placeholder="Email Address"
              />
            </div>

            {!isLogin && (
              <>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all group-hover:bg-white/10"
                  placeholder="Choose Username"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all group-hover:bg-white/10"
                  placeholder="Full Name (John Doe)"
                />
              </>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all group-hover:bg-white/10"
              placeholder="Password"
            />

            {!isLogin && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all group-hover:bg-white/10"
                placeholder="Confirm Password"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary text-xl py-4 shadow-2xl shadow-primary-500/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></span>
                Processing...
              </span>
            ) : (
              isLogin ? 'Get Started →' : 'Create Account →'
            )}
          </button>
        </form>

        <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="text-xs font-black opacity-30 uppercase">Or continue with</span>
            <div className="flex-1 h-[1px] bg-white/10"></div>
        </div>

        <div className="flex justify-center transform scale-110 hover:scale-[1.12] transition-transform">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            size="large"
            theme={theme === 'dark' ? 'filled_blue' : 'outline'}
          />
        </div>

        <div className="text-center pt-4">
          <button
            onClick={toggleMode}
            className="text-primary-500 hover:text-primary-400 font-bold tracking-tight transition-colors"
          >
            {isLogin ? (
              <>Don't have an account? <span className="underline decoration-2 underline-offset-4">Sign up FREE</span></>
            ) : (
              <>Already member? <span className="underline decoration-2 underline-offset-4">Sign in</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
