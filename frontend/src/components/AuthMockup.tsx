export default function AuthMockup() {
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
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue your interview prep</p>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {/* Google Sign In */}
          <button className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-all mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px flex-1 bg-zinc-800"></div>
            <span className="text-sm text-gray-500 uppercase tracking-wider">Or</span>
            <div className="h-px flex-1 bg-zinc-800"></div>
          </div>

          {/* Email Input */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2  cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded bg-black border-zinc-700" />
              <span className="text-sm text-gray-400">Remember me</span>
            </label>
            <a href="#" className="text-sm text-white hover:underline">Forgot password?</a>
          </div>

          {/* Sign In Button */}
          <button className="w-full px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all mb-4">
            Sign In
          </button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-400">
            Don't have an account? <a href="#" className="text-white hover:underline font-semibold">Sign up</a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Protected by reCAPTCHA and subject to the Google Privacy Policy
        </p>
      </div>
    </div>
  );
}
