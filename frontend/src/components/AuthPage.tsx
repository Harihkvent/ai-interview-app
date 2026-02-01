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
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center">
              <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">CareerPath AI</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-gray-400">{isLogin ? 'Sign in to continue your interview prep' : 'Join the next generation of career advisory'}</p>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">

        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/20 rounded-3xl p-4 text-red-500 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
             <span>⚠️</span>
             {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                    placeholder="Choose username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                    placeholder="John Doe"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}
          </div>


          {/* Sign In Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all mb-4"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-400">
            {isLogin ? (
              <>Don't have an account? <button type="button" onClick={toggleMode} className="text-white hover:underline font-semibold">Sign up</button></>
            ) : (
              <>Already have an account? <button type="button" onClick={toggleMode} className="text-white hover:underline font-semibold">Sign in</button></>
            )}
          </p>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px flex-1 bg-zinc-800"></div>
          <span className="text-sm text-gray-500 uppercase tracking-wider">Or</span>
          <div className="h-px flex-1 bg-zinc-800"></div>
        </div>

        {/* Google Sign In */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            size="large"
            theme="filled_blue"
          />
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-500 mt-6">
        Protected by reCAPTCHA and subject to the Google Privacy Policy
      </p>
    </div>
  </div>
  );
};
