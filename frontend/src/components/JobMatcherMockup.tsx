export default function JobMatcherMockup() {
  const matches = [
    { 
      rank: 1, 
      title: 'Senior Software Engineer', 
      percentage: 95, 
      matched: ['React', 'TypeScript', 'Node.js', 'AWS'], 
      missing: ['Kubernetes', 'GraphQL'],
      company: 'TechCorp',
      salary: '$150k - $200k',
      location: 'San Francisco, CA'
    },
    { 
      rank: 2, 
      title: 'Full Stack Developer', 
      percentage: 92, 
      matched: ['JavaScript', 'Python', 'MongoDB', 'Docker'], 
      missing: ['Redis', 'Microservices'],
      company: 'StartupXYZ',
      salary: '$130k - $180k',
      location: 'Remote'
    },
    { 
      rank: 3, 
      title: 'Frontend Engineer', 
      percentage: 89, 
      matched: ['React', 'CSS', 'HTML', 'Redux'], 
      missing: ['Vue.js', 'WebGL'],
      company: 'DesignHub',
      salary: '$120k - $160k',
      location: 'New York, NY'
    },
    { 
      rank: 4, 
      title: 'Backend Developer', 
      percentage: 85, 
      matched: ['Python', 'FastAPI', 'PostgreSQL'], 
      missing: ['Kafka', 'RabbitMQ'],
      company: 'DataCo',
      salary: '$125k - $170k',
      location: 'Austin, TX'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-full mb-6 hover:scale-105 transition-transform">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AI Analysis Complete
            </span>
            <div className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400 font-bold">
              📦 CACHED
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Your Perfect
            </span>
            <br />
            <span className="text-white">Career Matches</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Based on your unique skills and experience, we've identified the best opportunities for you
          </p>

          {/* Stats Bar */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {[
              { label: 'Matches Found', value: '10', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { label: 'Avg Match Rate', value: '90%', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { label: 'Skills Analyzed', value: '24', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job Matches Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {matches.map((match, index) => (
            <div
              key={match.rank}
              className="group relative bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-8 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Rank Badge */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-white to-gray-300 rounded-2xl flex items-center justify-center font-bold text-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                #{match.rank}
              </div>

              {/* Match Percentage Circle */}
              <div className="absolute -top-4 -right-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="#27272a" strokeWidth="6" fill="none" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="36" 
                      stroke="white" 
                      strokeWidth="6" 
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - match.percentage / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{match.percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 group-hover:bg-clip-text transition-all">
                  {match.title}
                </h3>

                {/* Company Info */}
                <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5 font-semibold text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {match.company}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {match.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 text-green-400 font-semibold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {match.salary}
                  </span>
                </div>

                {/* Skills Section */}
                <div className="space-y-5 mb-6">
                  {/* Matched Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs uppercase font-bold text-green-500 tracking-wider">Your Strengths</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {match.matched.map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20 font-medium hover:bg-green-500/20 transition-colors">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs uppercase font-bold text-orange-400 tracking-wider">Learn Next</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {match.missing.map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg text-sm border border-orange-500/20 font-medium hover:bg-orange-500/20 transition-colors">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group/btn">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Career Roadmap
                    <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                  <button className="px-6 py-3.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 hover:border-zinc-600 transition-all flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-center gap-4 pt-8">
          <button className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Different Resume
          </button>
          <button className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Matches
          </button>
        </div>
      </div>
    </div>
  );
}
