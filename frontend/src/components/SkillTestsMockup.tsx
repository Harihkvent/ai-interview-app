export default function SkillTestsMockup() {
  const availableTests = [
    { title: 'JavaScript Fundamentals', questions: 20, duration: '30 min', difficulty: 'Beginner', icon: '📘' },
    { title: 'React Advanced Patterns', questions: 15, duration: '25 min', difficulty: 'Advanced', icon: '⚛️' },
    { title: 'Data Structures & Algorithms', questions: 25, duration: '45 min', difficulty: 'Intermediate', icon: '🧮' },
    { title: 'System Design Basics', questions: 10, duration: '20 min', difficulty: 'Intermediate', icon: '🏗️' },
  ];

  const myAttempts = [
    { test: 'JavaScript Fundamentals', score: 85, date: 'Jan 28, 2026', status: 'Passed' },
    { test: 'React Advanced Patterns', score: 72, date: 'Jan 25, 2026', status: 'Passed' },
    { test: 'Data Structures & Algorithms', score: 65, date: 'Jan 20, 2026', status: 'Failed' },
  ];

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Skill Tests</h1>
          <p className="text-gray-400">Assess your knowledge and track your progress</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: 'Tests Taken', value: '12' },
            { label: 'Average Score', value: '78%' },
            { label: 'Pass Rate', value: '83%' },
            { label: 'Time Spent', value: '6.5h' },
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Available Tests */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Available Tests</h2>
            <button className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all">
              Create Test
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {availableTests.map((test, i) => (
              <div key={i} className="bg-black border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{test.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">{test.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
                        {test.questions} questions
                      </span>
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
                        {test.duration}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        test.difficulty === 'Beginner' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
                        test.difficulty === 'Intermediate' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' :
                        'bg-red-500/10 border border-red-500/20 text-red-400'
                      }`}>
                        {test.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="w-full py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all">
                  Start Test
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* My Attempts */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">My Attempts</h2>
          <div className="space-y-3">
            {myAttempts.map((attempt, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl ${
                  attempt.status === 'Passed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {attempt.score}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white mb-1">{attempt.test}</div>
                  <div className="text-sm text-gray-400">{attempt.date}</div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  attempt.status === 'Passed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {attempt.status}
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-700 transition-all">
                    View Results
                  </button>
                  <button className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
