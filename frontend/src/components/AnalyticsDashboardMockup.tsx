export default function AnalyticsDashboardMockup() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Interview Analytics</h1>
          <p className="text-gray-400">Track your performance and identify areas for improvement</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: 'Total Interviews', value: '24', change: '+12%', positive: true },
            { label: 'Avg Score', value: '87%', change: '+5%', positive: true },
            { label: 'Completion Rate', value: '92%', change: '-2%', positive: false },
            { label: 'Time Spent', value: '18h', change: '+8%', positive: true },
          ].map((metric, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
              <div className="text-sm text-gray-400 mb-2">{metric.label}</div>
              <div className="text-3xl font-bold text-white mb-2">{metric.value}</div>
              <div className={`text-sm font-semibold ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                {metric.change} from last month
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Performance Over Time */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Performance Over Time</h3>
            <div className="relative h-64">
              {/* Simple Bar Chart */}
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 h-full">
                {[65, 72, 78, 83, 87, 89, 92].map((value, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-white rounded-t-lg hover:bg-gray-300 transition-all" style={{ height: `${value}%` }}></div>
                    <span className="text-xs text-gray-500">W{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skills Breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Skills Performance</h3>
            <div className="space-y-4">
              {[
                { skill: 'Technical Questions', score: 92 },
                { skill: 'Behavioral Questions', score: 85 },
                { skill: 'System Design', score: 78 },
                { skill: 'Coding Challenges', score: 88 },
                { skill: 'Communication', score: 90 },
              ].map((item) => (
                <div key={item.skill}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-300">{item.skill}</span>
                    <span className="text-sm font-bold text-white">{item.score}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${item.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Interviews */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Recent Interviews</h3>
          <div className="space-y-3">
            {[
              { date: 'Feb 1, 2026', role: 'Senior Software Engineer', score: 92, duration: '45 min' },
              { date: 'Jan 30, 2026', role: 'Full Stack Developer', score: 88, duration: '38 min' },
              { date: 'Jan 28, 2026', role: 'Frontend Engineer', score: 85, duration: '42 min' },
              { date: 'Jan 25, 2026', role: 'Backend Developer', score: 90, duration: '50 min' },
            ].map((interview, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-bold text-black">
                  {interview.score}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{interview.role}</div>
                  <div className="text-sm text-gray-400">{interview.date} • {interview.duration}</div>
                </div>
                <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-700 transition-all">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">AI Recommendations</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: '📚', title: 'Study System Design', desc: 'Score improved by 15% with focused practice' },
              { icon: '💪', title: 'Practice More Coding', desc: '30 min daily can boost your score to 95%' },
              { icon: '🎯', title: 'Mock Interviews', desc: 'Schedule weekly mock interviews for better results' },
            ].map((rec, i) => (
              <div key={i} className="p-6 bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                <div className="text-4xl mb-3">{rec.icon}</div>
                <div className="font-bold text-white mb-2">{rec.title}</div>
                <div className="text-sm text-gray-400">{rec.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
