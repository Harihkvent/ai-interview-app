export default function LiveJobsMockup() {
  const jobs = [
    {
      company: 'Google',
      logo: '🔵',
      title: 'Senior Software Engineer',
      location: 'Mountain View, CA',
      type: 'Full-time',
      salary: '$150k - $200k',
      posted: '2 hours ago',
      applicants: 45,
      match: 95,
      tags: ['React', 'TypeScript', 'System Design'],
      remote: false,
      urgent: true,
    },
    {
      company: 'Meta',
      logo: '🔷',
      title: 'Full Stack Developer',
      location: 'Menlo Park, CA',
      type: 'Full-time',
      salary: '$140k - $190k',
      posted: '5 hours ago',
      applicants: 32,
      match: 92,
      tags: ['Python', 'React', 'AWS'],
      remote: true,
      urgent: false,
    },
    {
      company: 'Amazon',
      logo: '🟠',
      title: 'Frontend Engineer',
      location: 'Seattle, WA',
      type: 'Full-time',
      salary: '$130k - $175k',
      posted: '1 day ago',
      applicants: 67,
      match: 89,
      tags: ['Vue.js', 'JavaScript', 'CSS'],
      remote: false,
      urgent: false,
    },
    {
      company: 'Microsoft',
      logo: '🟦',
      title: 'Cloud Solutions Architect',
      location: 'Redmond, WA',
      type: 'Full-time',
      salary: '$160k - $210k',
      posted: '2 days ago',
      applicants: 28,
      match: 87,
      tags: ['Azure', 'DevOps', 'Kubernetes'],
      remote: true,
      urgent: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-4xl md:text-5xl font-bold">
                  <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                    Live Opportunities
                  </span>
                </h1>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  </div>
                  <span className="text-sm text-green-400 font-bold">LIVE</span>
                </div>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl">
                Fresh opportunities from top companies. Updated in real-time.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-white">247</div>
                <div className="text-sm text-gray-400">Active Jobs</div>
              </div>
              <div className="w-px h-12 bg-zinc-700"></div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">12</div>
                <div className="text-sm text-gray-400">New Today</div>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search roles, companies, skills..."
                  className="w-full pl-12 pr-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <select className="px-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white focus:border-white focus:outline-none transition-colors cursor-pointer hover:bg-black">
              <option>All Locations</option>
              <option>Remote</option>
              <option>California</option>
              <option>Washington</option>
            </select>

            <select className="px-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white focus:border-white focus:outline-none transition-colors cursor-pointer hover:bg-black">
              <option>All Types</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>

            <select className="px-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white focus:border-white focus:outline-none transition-colors cursor-pointer hover:bg-black">
              <option>Best Match</option>
              <option>Most Recent</option>
              <option>Highest Salary</option>
              <option>Most Applicants</option>
            </select>

            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {jobs.map((job, i) => (
            <div
              key={i}
              className="group relative backdrop-blur-xl bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-6 transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-white/5"
            >
              {/* Urgent Badge */}
              {job.urgent && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-lg">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  URGENT HIRING
                </div>
              )}

              <div className="flex items-start gap-6">
                {/* Company Logo */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    {job.logo}
                  </div>
                  {job.remote && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 group-hover:bg-clip-text transition-all">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-gray-400 mb-3">
                        <span className="flex items-center gap-1.5 font-semibold text-gray-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {job.company}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                        <span>•</span>
                        <span>{job.type}</span>
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-2xl">
                      <div>
                        <div className="text-3xl font-bold text-green-400">{job.match}%</div>
                        <div className="text-xs text-green-500 font-semibold">MATCH</div>
                      </div>
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Job Details */}
                  <div className="flex flex-wrap gap-4 mb-6 text-sm">
                    <span className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-green-400">{job.salary}</span>
                    </span>
                    <span className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.posted}
                    </span>
                    <span className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {job.applicants} applicants
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button className="flex-1 px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group/btn">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Apply Now
                      <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                    <button className="px-6 py-3.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 hover:border-zinc-600 transition-all flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Save
                    </button>
                    <button className="px-6 py-3.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 hover:border-zinc-600 transition-all">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center pt-4">
          <button className="px-10 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-semibold hover:bg-white/10 transition-all inline-flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Load More Jobs
          </button>
        </div>
      </div>
    </div>
  );
}
