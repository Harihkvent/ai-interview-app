export default function CareerRoadmapMockup() {
  const milestones = [
    { phase: 'Current State', items: ['Basic React knowledge', 'Junior developer experience', 'Frontend fundamentals'] },
    { phase: 'Month 1-2', items: ['Advanced React patterns', 'State management (Redux)', 'TypeScript basics'] },
    { phase: 'Month 3-4', items: ['Node.js & Express', 'RESTful APIs', 'Database fundamentals'] },
    { phase: 'Month 5-6', items: ['System design basics', 'AWS cloud services', 'Docker & containerization'] },
    { phase: 'Interview Ready', items: ['Mock interviews', 'Algorithm practice', 'Portfolio projects'] },
  ];

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-9 h-9 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Career Roadmap</h1>
              <p className="text-lg text-gray-400 mb-4">Senior Software Engineer</p>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-xs text-gray-500">Duration:</span>
                  <span className="ml-2 font-semibold text-white">6 months</span>
                </div>
                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-xs text-green-500">Difficulty:</span>
                  <span className="ml-2 font-semibold text-green-400">Intermediate</span>
                </div>
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <span className="text-xs text-blue-500">Match:</span>
                  <span className="ml-2 font-semibold text-blue-400">95%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Timeline */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white via-gray-500 to-white"></div>

          {/* Milestones */}
          <div className="space-y-6">
            {milestones.map((milestone, i) => (
              <div key={i} className="relative pl-20">
                {/* Node */}
                <div className={`absolute left-0 w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg ${
                  i === 0 ? 'bg-white text-black' :
                  i === milestones.length - 1 ? 'bg-green-500 text-white' :
                  'bg-zinc-800 border-2 border-white text-white'
                }`}>
                  {i === 0 ? '🏁' : i === milestones.length - 1 ? '🎯' : i}
                </div>

                {/* Content */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
                  <h3 className="text-xl font-bold text-white mb-4">{milestone.phase}</h3>
                  <ul className="space-y-2">
                    {milestone.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button className="flex-1 py-4 bg-white text-black rounded-xl font-semibold text-lg hover:bg-gray-200 transition-all">
            Start Interview Prep
          </button>
          <button className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all">
            Save Roadmap
          </button>
          <button className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all">
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
