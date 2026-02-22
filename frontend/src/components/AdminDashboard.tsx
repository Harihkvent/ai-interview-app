import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Users, Shield, Database, Activity, 
  MessageSquare, BarChart3, Search, AlertCircle, 
  CheckCircle2, XCircle, Edit, Trash2,
  Lock, Unlock, Plus, Clock, BookOpen, ChevronRight,
  TrendingUp, Download
} from 'lucide-react';
import axios from 'axios';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetchStats();
  }, []);

  // Determine active tab from URL path
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path === 'admin' || !path) {
        setActiveTab('overview');
    } else {
        setActiveTab(path);
    }
  }, [location]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      setStats(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch statistics');
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-4 animate-shake">
      <AlertCircle size={20} className="flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-semibold mb-0.5">System Error</p>
        <p className="text-sm opacity-90">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[600px] text-white">
      {activeTab === 'overview' && <OverviewTab stats={stats} />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'sessions' && <SessionsTab />}
      {activeTab === 'skill-tests' && <SkillTestsTab />}
      {activeTab === 'questions' && <QuestionsTab />}
      {activeTab === 'health' && <HealthTab />}
      {activeTab === 'infra' && <InfraTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
    </div>
  );
};

// ============= Helper Components =============

const StatCard = ({ label, value, trend, icon: Icon }: any) => (
  <div className="bg-[#171717] p-5 rounded-2xl border border-white/5 flex flex-col gap-3 transition-all hover:bg-[#2c2d33] group">
    <div className="flex items-center justify-between">
      <p className="text-xs text-white/50 font-semibold">{label}</p>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10 transition-colors">
        <Icon size={16} />
      </div>
    </div>
    <div className="flex items-end justify-between">
      <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
      {trend && (
        <p className="text-[10px] text-white/50 font-medium">
          <span className="text-emerald-500 mr-1">{trend}</span> this month
        </p>
      )}
    </div>
  </div>
);

// ============= Tab Components (Simplified for now) =============

const OverviewTab = ({ stats }: any) => {
  const overview = stats?.overview || {};
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-6">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={overview.total_users || 0} trend={`+${overview.new_users_30d || 0}`} icon={Users} />
          <StatCard label="Total Sessions" value={overview.total_sessions || 0} icon={Activity} />
          <StatCard label="Total Roadmaps" value={overview.total_roadmaps || 0} icon={Shield} />
          <StatCard label="Tokens Used" value={overview.total_tokens?.toLocaleString() || 0} icon={BarChart3} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#171717] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-white/40" />
              Platform Activity
            </h3>
            <span className="text-[10px] text-white/40 font-medium">Last 7 Days</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.analytics || []}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff40" 
                  fontSize={9} 
                  fontFamily="monospace"
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="#ffffff40" fontSize={9} fontFamily="monospace" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000000', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="sessions" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                <Area type="monotone" dataKey="users" stroke="#ffffff30" strokeDasharray="5 5" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#171717] border border-white/5 p-6 rounded-2xl flex flex-col">
           <h3 className="font-semibold text-white text-sm mb-8">Efficiency Metrics</h3>
           <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-white/60">Success Rate</span>
                  <span className="text-white">78%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[78%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-white/60">Capacity Load</span>
                  <span className="text-white">42%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-white/40 w-[42%]" />
                </div>
              </div>
           </div>
           <button className="mt-8 py-3 bg-white hover:bg-slate-200 text-black rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2">
             <Download size={14} /> Export Data
           </button>
        </div>
      </div>
    </div>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users?search=${search}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      setUsers(response.data.users);
    } catch (err) {
    }
  };

  const toggleBlock = async (user: any) => {
    try {
      await axios.patch(`${API_BASE_URL}/admin/users/${user.id}`, 
        { is_blocked: !user.is_blocked },
        { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }}
      );
      fetchUsers();
    } catch (err) {
      alert("Failed to update user status");
    }
  };

  const deleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to permanently delete user ${user.email}? This action cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      fetchUsers();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Users</h2>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full bg-[#171717] border border-white/5 rounded-full pl-11 pr-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-[#171717] rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-xs font-semibold text-white/40">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white text-xs font-semibold">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{u.full_name || u.username}</p>
                      <p className="text-xs text-white/40">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                    u.role === 'admin' ? 'bg-white/10 text-white' : 'text-white/40'
                  }`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {u.is_blocked ? (
                    <span className="text-white/30 flex items-center gap-1.5 opacity-50">
                      <XCircle size={14} /> Locked
                    </span>
                  ) : (
                    <span className="text-emerald-500/80 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-white/40 tabular-nums">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => toggleBlock(u)}
                      className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all"
                      title={u.is_blocked ? "Unlock" : "Lock"}
                    >
                      {u.is_blocked ? <Unlock size={14} /> : <Lock size={14} />}
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all">
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => deleteUser(u)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const QuestionsTab = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    category: 'aptitude',
    question_text: '',
    question_type: 'descriptive',
    difficulty: 'medium',
    options: ['', '', '', ''],
    correct_answer: ''
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/questions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      setQuestions(response.data);
    } catch (err) {
      console.error("Failed to fetch questions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/admin/questions`, newQuestion, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      setShowAddModal(false);
      fetchQuestions();
      setNewQuestion({
        category: 'aptitude',
        question_text: '',
        question_type: 'descriptive',
        difficulty: 'medium',
        options: ['', '', '', ''],
        correct_answer: ''
      });
    } catch (err) {
      alert("Failed to add question");
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.question_text.toLowerCase().includes(search.toLowerCase()) ||
    q.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Question Bank</h2>
          <p className="text-xs text-white/50 font-medium mt-1">Manage and curate your interview knowledge repository</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search bank..."
              className="w-full bg-[#171717] border border-white/5 rounded-full pl-11 pr-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full text-sm font-semibold hover:bg-slate-200 transition-all shadow-sm"
          >
            <Plus size={16} /> New Question
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center text-white/40 font-medium animate-pulse">Loading bank...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
            <MessageSquare size={48} className="mx-auto text-white/10 mb-4 opacity-50" />
            <p className="text-white/40 font-medium">No results found</p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div key={q.id} className="bg-[#171717] border border-white/5 p-6 rounded-xl hover:bg-[#2c2d33] transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px] font-semibold tracking-wide border border-white/5">{q.category.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                      q.difficulty === 'easy' ? 'border-emerald-500/20 text-emerald-400' :
                      q.difficulty === 'hard' ? 'border-amber-500/20 text-amber-400' :
                      'border-white/10 text-white/40'
                    }`}>{q.difficulty.toUpperCase()}</span>
                  </div>
                  <p className="font-medium text-white leading-relaxed">{q.question_text}</p>
                  {q.question_type === 'mcq' && q.options && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {q.options.map((opt: string, i: number) => (
                        <div key={i} className={`p-3 rounded-lg text-xs font-medium transition-colors ${opt === q.correct_answer ? 'bg-white/10 text-white border border-white/10' : 'bg-white/[0.02] text-white/30 border border-transparent'}`}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-all"><Edit size={14} /></button>
                  <button className="p-2 hover:bg-red-500/10 rounded-lg text-white/30 hover:text-red-400 transition-all"><XCircle size={14} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#171717] border border-white/10 w-full max-w-xl rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-6">Create New Question</h3>
            <form onSubmit={handleAddQuestion} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 ml-1">Category</label>
                  <select 
                    className="w-full bg-[#212121] border border-white/5 rounded-lg px-4 py-2 text-sm font-medium text-white appearance-none focus:ring-1 focus:ring-white/20 outline-none transition-all"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({...newQuestion, category: e.target.value})}
                  >
                    <option value="aptitude">Aptitude</option>
                    <option value="technical">Technical Core</option>
                    <option value="hr">Behavioral (HR)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 ml-1">Difficulty</label>
                  <select 
                    className="w-full bg-[#212121] border border-white/5 rounded-lg px-4 py-2 text-sm font-medium text-white appearance-none focus:ring-1 focus:ring-white/20 outline-none transition-all"
                    value={newQuestion.difficulty}
                    onChange={(e) => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 ml-1">Question Content</label>
                <textarea 
                  className="w-full bg-[#212121] border border-white/5 rounded-lg px-4 py-3 min-h-[100px] text-sm text-white focus:ring-1 focus:ring-white/20 outline-none transition-all placeholder:text-white/20"
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
                  placeholder="Type your question here..."
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-white/40 ml-1">Question Type</label>
                <div className="flex gap-4">
                  {['descriptive', 'mcq'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="type" 
                        className="w-4 h-4 accent-white opacity-50 checked:opacity-100 transition-opacity"
                        checked={newQuestion.question_type === type}
                        onChange={() => setNewQuestion({...newQuestion, question_type: type})}
                      />
                      <span className="text-sm font-medium text-white/40 group-hover:text-white transition-colors capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {newQuestion.question_type === 'mcq' && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-xs font-semibold text-white/40 ml-1">Options & Correct Answer</label>
                  <div className="grid grid-cols-1 gap-3">
                    {newQuestion.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="correct" 
                          className="w-4 h-4 accent-white opacity-50 checked:opacity-100 transition-opacity"
                          checked={newQuestion.correct_answer === opt && opt !== ''}
                          onChange={() => setNewQuestion({...newQuestion, correct_answer: opt})}
                        />
                        <input 
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...newQuestion.options];
                            next[i] = e.target.value;
                            setNewQuestion({...newQuestion, options: next});
                          }}
                          placeholder={`Option ${i+1}`}
                          className="flex-1 bg-[#212121] border border-white/5 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-white/20 outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6">
                <button 
                  type="submit"
                  className="flex-1 bg-white text-black py-2.5 rounded-full font-semibold text-sm hover:bg-slate-200 transition-all"
                >
                  Create Question
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-transparent border border-white/10 text-white/40 py-2.5 rounded-full font-semibold text-sm hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const HealthTab = () => {
  const [metrics, setMetrics] = useState<any>(null);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/health/metrics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        setMetrics(response.data);
      } catch (err) {}
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white tracking-tight">System Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthMetricCard 
          title="Krutrim AI Calls" 
          metric={metrics?.krutrim_api_calls_total} 
          icon={Activity}
        />
        <HealthMetricCard 
          title="HTTP Success Rate" 
          metric={metrics?.http_requests_total} 
          icon={CheckCircle2}
        />
      </div>
    </div>
  );
};

const HealthMetricCard = ({ title, metric, icon: Icon }: any) => {
  const total = metric?.samples?.reduce((acc: number, s: any) => acc + s.value, 0) || 0;
  return (
    <div className="bg-[#171717] p-6 rounded-2xl border border-white/5 transition-all hover:bg-[#2c2d33] group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-semibold text-white/40 group-hover:text-white/60 transition-colors">{title}</h3>
      </div>
      <div className="text-3xl font-bold text-white tabular-nums tracking-tight">{total.toLocaleString()}</div>
      <p className="text-[10px] text-white/40 mt-3 font-medium">Real-time telemetry stream active</p>
    </div>
  );
};

const InfraTab = () => {
  const [infra, setInfra] = useState<any>(null);

  useEffect(() => {
    fetchInfra();
  }, []);

  const fetchInfra = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/health/infra`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      setInfra(response.data);
    } catch (err) {}
  };

  const clearCache = async () => {
    if (!confirm("Are you sure you want to clear all cached AI responses?")) return;
    try {
      await axios.post(`${API_BASE_URL}/admin/cache/clear`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      alert("Cache cleared successfully");
    } catch (err) {
      alert("Failed to clear cache");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">Infrastructure</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfraStatusCard name="MongoDB" status={infra?.mongodb || 'checking'} icon={Database} />
        <InfraStatusCard name="Redis Cache" status={infra?.redis || 'checking'} icon={Zap} />
        <InfraStatusCard name="RabbitMQ" status={infra?.rabbitmq || 'checking'} icon={Share2} />
      </div>

      <div className="pt-8 border-t border-white/5">
        <h3 className="text-sm font-semibold text-white/40 mb-6">System Controls</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={clearCache}
            className="px-6 py-2.5 bg-white text-black rounded-full font-semibold text-sm hover:bg-slate-200 transition-all shadow-sm"
          >
            Clear Application Cache
          </button>
          <button className="px-6 py-2.5 bg-white/5 border border-white/5 text-white/20 rounded-full font-semibold text-sm cursor-not-allowed">
            Restart Services
          </button>
        </div>
      </div>
    </div>
  );
};

const InfraStatusCard = ({ name, status, icon: Icon }: any) => (
  <div className="bg-[#171717] p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-[#2c2d33] transition-all">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${status === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/30'}`}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{name}</h3>
        <p className={`text-[10px] font-medium tracking-wide ${status === 'up' ? 'text-emerald-500/80' : 'text-white/40 uppercase'}`}>
          {status === 'up' ? 'Operational' : status.toUpperCase()}
        </p>
      </div>
    </div>
  </div>
);

const SettingsTab = () => {
  const [config, setConfig] = useState({
    interview_difficulty: 'medium',
    ai_model: 'krutrim-v2',
    max_questions: 10,
    enable_auto_evaluation: true
  });

  const handleSave = () => {
    alert("Configuration saved (Simulation)");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">System Settings</h2>
        <p className="text-xs text-white/50 font-medium mt-1">Configure global application parameters and AI behavior</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white/40 flex items-center gap-2">
            <Activity size={16} /> Interview Heuristics
          </h3>
          <div className="grid grid-cols-1 gap-1 bg-[#171717] rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-white">Baseline Difficulty</p>
                <p className="text-xs text-white/40 mt-0.5">Default assessment threshold for new sessions</p>
              </div>
              <select 
                className="bg-[#212121] border border-white/5 rounded-lg px-4 py-2 text-xs font-semibold text-white focus:ring-1 focus:ring-white/20 outline-none transition-all"
                value={config.interview_difficulty}
                onChange={(e) => setConfig({...config, interview_difficulty: e.target.value})}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-semibold text-white">Quantum Quota</p>
                <p className="text-xs text-white/40 mt-0.5">Interaction limit per evaluation cycle</p>
              </div>
              <input 
                type="number"
                className="w-20 bg-[#212121] border border-white/5 rounded-lg px-4 py-2 text-xs font-semibold text-white focus:ring-1 focus:ring-white/20 outline-none tabular-nums"
                value={config.max_questions}
                onChange={(e) => setConfig({...config, max_questions: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white/40 flex items-center gap-2">
            <Shield size={16} /> AI Engine Core
          </h3>
          <div className="grid grid-cols-1 gap-1 bg-[#171717] rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-white">Primary Compute Model</p>
                <p className="text-xs text-white/40 mt-0.5">Model used for generating interview questions</p>
              </div>
              <select 
                className="bg-[#212121] border border-white/5 rounded-lg px-4 py-2 text-xs font-semibold text-white focus:ring-1 focus:ring-white/20 outline-none transition-all"
                value={config.ai_model}
                onChange={(e) => setConfig({...config, ai_model: e.target.value})}
              >
                <option value="krutrim-v2">Krutrim 2.0 Stable</option>
                <option value="krutrim-v3-beta">Krutrim 3.0 Alpha</option>
                <option value="gpt-4-proxy">GPT-4 Proxy Failover</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-semibold text-white">Real-time Evaluation</p>
                <p className="text-xs text-white/40 mt-0.5">Enable continuous heuristic analysis</p>
              </div>
              <button 
                onClick={() => setConfig({...config, enable_auto_evaluation: !config.enable_auto_evaluation})}
                className={`w-11 h-6 rounded-full relative transition-all duration-300 ${config.enable_auto_evaluation ? 'bg-emerald-500/80' : 'bg-[#212121]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300 ${config.enable_auto_evaluation ? 'left-6 bg-white' : 'left-1 bg-white/20'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            className="w-full bg-white text-black py-3.5 rounded-full font-semibold text-sm hover:bg-slate-200 shadow-sm transition-all active:scale-[0.98]"
          >
            Save System Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

const FeedbackTab = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('open');

  useEffect(() => {
    fetchFeedback();
  }, [filter]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/feedback?status=${filter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      setFeedback(response.data);
    } catch (err) {
      console.error("Failed to fetch feedback", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/admin/feedback/${id}`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      fetchFeedback();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Feedback</h2>
          <p className="text-xs text-white/50 font-medium mt-1">Review and resolve user-submitted feedback and bug reports</p>
        </div>
        <div className="flex bg-[#171717] p-1 rounded-full border border-white/5">
          {['open', 'resolved', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === s ? 'bg-[#2c2d33] text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-white/40 font-medium animate-pulse">Loading feedback...</div>
        ) : feedback.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
            <MessageSquare size={48} className="mx-auto text-white/10 mb-4 opacity-50" />
            <p className="text-white/40 font-medium">No feedback found</p>
          </div>
        ) : (
          feedback.map((f) => (
            <div key={f.id} className="bg-[#171717] border border-white/5 p-6 rounded-2xl flex flex-col gap-5 hover:bg-[#2c2d33]/50 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 font-bold text-lg">
                    {f.type[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm flex items-center gap-3">
                      {f.subject}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                        f.type === 'bug' ? 'border-red-500/20 text-red-400' : 'border-white/10 text-white/40'
                      }`}>{f.type.toUpperCase()}</span>
                    </h4>
                    <p className="text-[10px] text-white/30 font-medium mt-1">{new Date(f.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {filter === 'open' && (
                  <button 
                    onClick={() => updateStatus(f.id, 'resolved')}
                    className="px-4 py-1.5 bg-white text-black rounded-full text-xs font-semibold hover:bg-slate-200 transition-all shadow-sm"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
              <div className="text-sm bg-white/[0.02] p-4 rounded-xl text-white/80 leading-relaxed border border-white/5">
                {f.message}
              </div>
              {f.admin_notes && (
                <div className="text-xs text-white/40 border-l-2 border-white/20 pl-4 py-1 italic bg-white/[0.01] rounded-r-lg">
                  <span className="font-semibold text-white/50 non-italic block mb-1 text-[10px]">Staff Note:</span>
                  {f.admin_notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SessionsTab = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/sessions`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
            });
            setSessions(response.data.sessions);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Interview Sessions</h2>
            <div className="bg-[#171717] rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 text-xs font-semibold text-white/40">
                            <th className="px-6 py-4">Participant</th>
                            <th className="px-6 py-4">Job Role</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4">Created At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-20 text-center animate-pulse text-white/40 font-medium">Loading session logs...</td></tr>
                        ) : sessions.map((s) => (
                            <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 text-sm font-medium text-white">{s.user_email}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <Clock size={12} className="text-white/20" />
                                        <span className="text-sm text-white/40 font-medium">{s.job_title}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                                        s.status === 'completed' ? 'border-emerald-500/20 text-emerald-400' : 'border-white/10 text-white/40'
                                    }`}>{s.status.toUpperCase()}</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-white tabular-nums">{s.score?.toFixed(1) || '0.0'} <span className="text-white/20 text-[10px]">/ 10</span></td>
                                <td className="px-6 py-4 text-xs text-white/30 font-medium tabular-nums">{new Date(s.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SkillTestsTab = () => {
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAttempts();
    }, []);

    const fetchAttempts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/skill-tests/attempts`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
            });
            setAttempts(response.data.attempts);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Skill Proficiency Analysis</h2>
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-20 text-center text-white/40 font-medium animate-pulse">Analyzing proficiency data...</div>
                ) : attempts.map((a) => (
                    <div key={a.id} className="bg-[#171717] border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:bg-[#2c2d33] transition-all">
                        <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${a.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">{a.skill_name}</h4>
                                <p className="text-xs text-white/40 font-medium mt-0.5">{a.user_email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-12">
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white tabular-nums tracking-tight">{a.score.toFixed(0)}%</div>
                                <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-0.5">{a.proficiency || 'Attempted'}</div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-bold tracking-widest border transition-all ${
                                    a.passed ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-white/5 text-white/20'
                                }`}>
                                    {a.passed ? 'PASSED' : 'FAILED'}
                                </span>
                                <ChevronRight size={18} className="text-white/10 group-hover:text-white/40 transition-colors" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Zap = (props: any) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);

const Share2 = (props: any) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
);
