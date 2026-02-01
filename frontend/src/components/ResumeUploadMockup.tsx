export default function ResumeUploadMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          {/* Enhanced Header */}
          <div className="text-center mb-12 space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full mb-4 hover:bg-white/10 transition-all">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-gray-300">AI-Powered Resume Analysis</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Start Your
              </span>
              <br />
              <span className="text-white">Interview Journey</span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Upload your resume and let our AI create a personalized interview experience tailored to your skills
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Saved Resumes */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Your Resumes
                </h2>
                <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400">
                  3 saved
                </span>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Software_Engineer_Resume.pdf', date: 'Jan 28, 2026', size: '245 KB', type: 'Technical', color: 'blue' },
                  { name: 'Full_Stack_Developer_CV.pdf', date: 'Jan 15, 2026', size: '312 KB', type: 'Leadership', color: 'purple' },
                  { name: 'Senior_Developer_2024.pdf', date: 'Jan 5, 2026', size: '198 KB', type: 'Management', color: 'green' },
                ].map((resume, i) => (
                  <div
                    key={i}
                    className="group relative bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white mb-2 truncate">{resume.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {resume.date}
                          </span>
                          <span>•</span>
                          <span>{resume.size}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 ${
                            resume.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            resume.color === 'purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-green-500/10 text-green-400 border-green-500/20'
                          } border rounded-lg text-xs font-semibold`}>
                            {resume.type}
                          </span>
                        </div>
                      </div>

                      {/* Action Arrow */}
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[
                  { label: 'Total', value: '3', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { label: 'This Month', value: '2', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { label: 'Analyzed', value: '3', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
                    <svg className="w-5 h-5 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Upload Area */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload New Resume
              </h2>

              {/* Enhanced Upload Box */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-white/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative border-2 border-dashed border-zinc-700 hover:border-white rounded-3xl p-12 text-center bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-sm transition-all cursor-pointer">
                  <div className="space-y-6">
                    {/* Animated Upload Icon */}
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                      <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-white to-gray-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <p className="text-xl font-semibold text-white mb-2">Drop your resume here</p>
                      <p className="text-gray-400 mb-6">or click to browse from your device</p>
                      <button className="px-8 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all inline-flex items-center gap-2 group-hover:scale-105">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
                        </svg>
                        Browse Files
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF, DOCX
                      </span>
                      <span>•</span>
                      <span>Max 5MB</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Secure & Private
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected File Preview */}
              <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white mb-1">Resume_Final_v3.pdf</p>
                    <p className="text-sm text-gray-400 mb-3">248.5 KB • Ready to upload</p>
                    <div className="h-1.5 bg-green-900/30 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <button className="text-red-400 hover:text-red-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Enhanced Start Button */}
              <button className="group relative w-full px-8 py-5 bg-gradient-to-r from-white via-gray-100 to-white text-black rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start AI Interview
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>

              {/* Feature List */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  What happens next?
                </h3>
                <div className="space-y-3">
                  {[
                    'AI analyzes your resume in real-time',
                    'Personalized questions based on your experience',
                    'Instant feedback and skill assessment',
                    'Detailed performance report generated',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-300">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
