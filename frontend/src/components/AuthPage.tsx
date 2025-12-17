import React, { useState } from 'react';
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
        // Login
        await login(email, password);
      } else {
        // Register
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="heading-1 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="body-text">
            {isLogin ? 'Sign in to continue your journey' : 'Start your AI interview journey'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error-50 border border-error-400 rounded-lg p-3 text-error-600 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>

          {/* Username (Register only) */}
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="input"
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                  placeholder="John Doe"
                />
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {/* Confirm Password (Register only) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚙️</span>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">OR</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            size="large"
            text={isLogin ? "signin_with" : "signup_with"}
            shape="rectangular"
            theme="outline"
          />
        </div>

        {/* Toggle Mode */}
        <div className="text-center">
          <button
            onClick={toggleMode}
            className="text-primary-400 hover:text-primary-500 text-sm transition-colors"
          >
            {isLogin ? (
              <>
                Don't have an account? <span className="font-semibold">Sign up</span>
              </>
            ) : (
              <>
                Already have an account? <span className="font-semibold">Sign in</span>
              </>
            )}
          </button>
        </div>

        {/* Info */}
        {!isLogin && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-xs text-text-secondary">
              By creating an account, you'll be able to save your career roadmaps, track interview history, and access personalized recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
