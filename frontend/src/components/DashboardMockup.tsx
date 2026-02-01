import React, { useState } from 'react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
}

interface InterviewCard {
  id: string;
  title: string;
  company: string;
  date: string;
  score: number;
  status: 'completed' | 'in-progress' | 'scheduled';
  thumbnail: string;
}

/**
 * Dashboard with monochrome black/white/gray theme
 */
const Dashboard: React.FC = () => {
  const [stats] = useState<StatCard[]>([
    { title: 'Total Interviews', value: '24', change: '+12%', trend: 'up', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { title: 'Avg Score', value: '87%', change: '+5%', trend: 'up', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { title: 'Skills Tested', value: '18', change: '+3', trend: 'up', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { title: 'Time Spent', value: '12h', change: '+2h', trend: 'up', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]);

  const [interviews] = useState<InterviewCard[]>([
    {
      id: '1',
      title: 'Frontend Developer Interview',
      company: 'Google',
      date: '2 days ago',
      score: 92,
      status: 'completed',
      thumbnail: '🎯',
    },
    {
      id: '2',
      title: 'System Design Discussion',
      company: 'Meta',
      date: '5 days ago',
      score: 88,
      status: 'completed',
      thumbnail: '🏗️',
    },
    {
      id: '3',
      title: 'Algorithm Challenge',
      company: 'Amazon',
      date: 'In progress',
      score: 0,
      status: 'in-progress',
      thumbnail: '⚡',
    },
    {
      id: '4',
      title: 'Behavioral Interview',
      company: 'Microsoft',
      date: 'Tomorrow',
      score: 0,
      status: 'scheduled',
      thumbnail: '💼',
    },
  ]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-zinc-800">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">Welcome back, let's crush your next interview! 🚀</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="px-5 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-gray-200 transition-all">
                + New Interview
              </button>
              
              <div className="w-12 h-12 rounded-xl bg-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-all">
                <span className="text-xl">👨‍💻</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    stat.trend === 'up'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                
                <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Recent Interviews</h2>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-all">
              All
            </button>
            <button className="px-4 py-2 rounded-lg text-gray-400 text-sm font-medium hover:text-white transition-colors">
              Completed
            </button>
            <button className="px-4 py-2 rounded-lg text-gray-400 text-sm font-medium hover:text-white transition-colors">
              Scheduled
            </button>
          </div>
        </div>

        {/* Interview Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="group cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-all duration-300">
                {/* Emoji Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                    {interview.thumbnail}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                    interview.status === 'completed'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                      : interview.status === 'in-progress'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}>
                    {interview.status === 'completed' ? 'Done' : interview.status === 'in-progress' ? 'Live' : 'Upcoming'}
                  </span>
                </div>

                {/* Score Badge (for completed) */}
                {interview.status === 'completed' && (
                  <div className="absolute bottom-3 left-3">
                    <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-zinc-700">
                      <span className="text-sm font-bold text-white">{interview.score}%</span>
                    </div>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <button className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors">
                    View Details
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="px-1">
                <h3 className="text-white font-semibold mb-1 group-hover:text-gray-300 transition-colors line-clamp-2">
                  {interview.title}
                </h3>
                <p className="text-gray-400 text-sm mb-1">{interview.company}</p>
                <p className="text-gray-500 text-xs">{interview.date}</p>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div className="group cursor-pointer">
            <div className="aspect-video rounded-2xl border-2 border-dashed border-zinc-800 group-hover:border-zinc-600 transition-all duration-300 flex items-center justify-center bg-zinc-900/50 group-hover:bg-zinc-900">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-gray-400 font-medium group-hover:text-white transition-colors">Start New Interview</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Progress Section */}
        <div className="mt-12 rounded-2xl p-8 bg-zinc-900 border border-zinc-800">
          <h2 className="text-2xl font-bold text-white mb-6">Skill Progress</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { skill: 'Data Structures', progress: 85, color: 'bg-white' },
              { skill: 'Algorithms', progress: 72, color: 'bg-gray-400' },
              { skill: 'System Design', progress: 68, color: 'bg-gray-500' },
              { skill: 'Behavioral', progress: 91, color: 'bg-gray-300' },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{item.skill}</span>
                  <span className="text-gray-400 text-sm">{item.progress}%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
