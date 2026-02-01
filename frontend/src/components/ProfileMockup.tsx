export default function ProfileMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '1.5s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Header Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-start gap-8">
            {/* Enhanced Avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-white via-gray-200 to-gray-400 flex items-center justify-center text-6xl font-bold text-black shadow-2xl group-hover:scale-105 transition-transform">
                JD
              </div>
              {/* Status Indicator */}
              <div className="absolute -bottom-2 -right-2 flex items-center gap-2 px-3 py-1.5 bg-green-500 rounded-xl shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold text-white">ACTIVE</span>
              </div>
            </div>
            
            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">
                    <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                      John Doe
                    </span>
                  </h1>
                  <p className="text-gray-400 text-lg mb-4">john.doe@example.com</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-2 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl text-white font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Full Stack Developer
                    </span>
                    <span className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-green-500/5 border border-green-500/30 rounded-xl text-green-400 font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Premium Member
                    </span>
                  </div>
                </div>

                <button className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              </div>

              {/* Member Since Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Member since January 2024
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Interviews', value: '24', change: '+12%', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', color: 'blue' },
            { label: 'Average Score', value: '87%', change: '+5%', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'green' },
            { label: 'Roadmaps', value: '8', change: '+3', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', color: 'purple' },
            { label: 'Skills Mastered', value: '32', change: '+8', icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'orange' },
          ].map((stat, i) => (
            <div key={i} className="group relative backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl mb-4 ${
                  stat.color === 'blue' ? 'bg-blue-500/10' :
                  stat.color === 'green' ? 'bg-green-500/10' :
                  stat.color === 'purple' ? 'bg-purple-500/10' :
                  'bg-orange-500/10'
                }`}>
                  <svg className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-400' :
                    stat.color === 'green' ? 'text-green-400' :
                    stat.color === 'purple' ? 'text-purple-400' :
                    'text-orange-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">{stat.label}</div>
                  <div className="text-xs text-green-400 font-semibold">{stat.change}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information
            </h2>
            <div className="space-y-5">
              {[
                { label: 'Full Name', value: 'John Doe', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                { label: 'Email', value: 'john.doe@example.com', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                { label: 'Phone', value: '+1 (555) 123-4567', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
                { label: 'Location', value: 'San Francisco, CA', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
              ].map((field, i) => (
                <div key={i} className="group">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={field.icon} />
                    </svg>
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={field.value}
                      readOnly
                      className="w-full px-4 py-3.5 bg-black/50 border border-zinc-700 rounded-xl text-white group-hover:border-zinc-600 focus:border-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Social Profiles</h3>
              <div className="space-y-3">
                {[
                  { platform: 'LinkedIn', url: 'linkedin.com/in/johndoe', icon: '💼' },
                  { platform: 'GitHub', url: 'github.com/johndoe', icon: '💻' },
                  { platform: 'Portfolio', url: 'johndoe.dev', icon: '🌐' },
                ].map((social, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer group">
                    <span className="text-2xl">{social.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">{social.platform}</div>
                      <div className="text-sm text-gray-300 group-hover:text-white transition-colors">{social.url}</div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Skills & Technologies */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Skills & Technologies
                </h2>
                <button className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Skill
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'MongoDB', 'PostgreSQL', 'GraphQL', 'Redis', 'Kubernetes', 'CI/CD'].map((skill) => (
                  <span key={skill} className="group relative px-4 py-2.5 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl text-white font-medium hover:from-white/20 hover:to-white/10 hover:scale-105 transition-all cursor-pointer">
                    {skill}
                    <button className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Account Settings */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preferences
              </h2>
              <div className="space-y-4">
                {[
                  { title: 'Email Notifications', desc: 'Receive updates about your interviews', enabled: true },
                  { title: 'Weekly Reports', desc: 'Get weekly progress summaries', enabled: false },
                  { title: 'Interview Reminders', desc: 'Notifications before scheduled interviews', enabled: true },
                ].map((setting, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all">
                    <div>
                      <div className="font-semibold text-white mb-1">{setting.title}</div>
                      <div className="text-sm text-gray-400">{setting.desc}</div>
                    </div>
                    <button className={`relative w-14 h-7 rounded-full transition-all ${setting.enabled ? 'bg-white' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-black rounded-full transition-all ${setting.enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-red-400 mb-1">Danger Zone</h2>
              <p className="text-gray-400">Irreversible and destructive actions</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-6 bg-black/30 rounded-2xl border border-red-500/20">
            <div>
              <div className="font-semibold text-white mb-1">Delete Account</div>
              <div className="text-sm text-gray-400">Permanently delete your account and all data</div>
            </div>
            <button className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
