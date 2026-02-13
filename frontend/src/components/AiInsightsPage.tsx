import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getUserDashboard, getProfileResumes } from '../api';
import { ResumePicker } from './ResumePicker';
import { 
    Lightbulb, 
    Zap, 
    FileText, 
    Trophy, 
    CheckCircle2, 
    ArrowRight,
    RefreshCcw,
    ChevronLeft
} from 'lucide-react';

interface InsightsData {
  summary: string;
  improvements: Record<string, string> | string[];
  parsed_skills: string[];
  filename: string;
}

export const AiInsightsPage: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>();
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadInitialInsights();
  }, []);

  const loadInitialInsights = async () => {
    try {
      setLoading(true);
      const dashboardData = await getUserDashboard();
      if (dashboardData.active_resume) {
        setData(dashboardData.active_resume);
        // Find the ID of the active resume if possible
        const resumes = await getProfileResumes();
        const active = resumes.find((r: any) => r.filename === dashboardData.active_resume.filename);
        if (active) setSelectedResumeId(active.id);
      } else {
        setShowPicker(true);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSelect = async (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setLoading(true);
    try {
      // In a real flow, selecting a resume might trigger a re-analysis or just load it
      // For now, we'll reload the dashboard data to get the active resume insights
      const dashboardData = await getUserDashboard();
      if (dashboardData.active_resume) {
        setData(dashboardData.active_resume);
        setShowPicker(false);
      }
    } catch (error) {
        showToast('Failed to load insights for selected resume', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-12 text-center backdrop-blur-3xl">
          <div className="w-20 h-20 mx-auto rounded-[2rem] bg-white flex items-center justify-center mb-6 shadow-2xl shadow-white/10">
            <RefreshCcw className="w-10 h-10 text-black animate-spin" />
          </div>
          <p className="text-zinc-500 font-black tracking-widest uppercase text-sm">Synchronizing Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-zinc-800">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
              <Lightbulb className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">AI Insights</h1>
              <p className="text-zinc-500 font-medium">DEEP ANALYSIS OF YOUR PROFESSIONAL FOOTPRINT</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowPicker(!showPicker)}
            className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-black text-sm hover:bg-zinc-800 transition-all flex items-center gap-3"
          >
            {showPicker ? <ChevronLeft className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5" />}
            {showPicker ? "BACK TO INSIGHTS" : "SWITCH RESUME"}
          </button>
        </div>

        {showPicker ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl">
              <ResumePicker 
                selectedId={selectedResumeId}
                onSelect={handleResumeSelect}
                title="Select Data Source"
                description="Choose which resume our AI should analyze for deep career insights."
              />
            </div>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Summary */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl group hover:bg-zinc-900/60 transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Executive Summary</h2>
                </div>
                <p className="text-xl text-zinc-300 leading-relaxed font-medium">
                  {data.summary || "Our AI is crafting your professional narrative..."}
                </p>
              </div>

              {/* Improvements */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <Zap className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Optimization Strategy</h2>
                </div>
                
                <div className="grid gap-4">
                  {Array.isArray(data.improvements) ? (
                    data.improvements.map((tip, idx) => (
                      <div key={idx} className="group flex gap-6 items-start p-6 bg-black/40 border border-zinc-800/50 rounded-3xl hover:border-primary-500/30 transition-all">
                        <div className="mt-1 p-1 bg-green-500/10 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-zinc-300 font-medium text-lg leading-snug group-hover:text-white transition-colors">{tip}</span>
                      </div>
                    ))
                  ) : (
                    Object.entries(data.improvements || {}).map(([area, tip], idx) => (
                      <div key={idx} className="group flex gap-6 items-start p-6 bg-black/40 border border-zinc-800/50 rounded-3xl hover:border-primary-500/30 transition-all">
                        <div className="mt-1 p-1 bg-green-500/10 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">{area.replace(/_/g, ' ')}</span>
                          <span className="text-zinc-300 font-medium text-lg leading-snug group-hover:text-white transition-colors">{tip as string}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Snapshot Card */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Intelligence Snapshot</h3>
                  <Trophy className="w-5 h-5 text-yellow-500/50" />
                </div>

                <div className="space-y-6">
                  {/* Active Resume */}
                  <div className="p-5 bg-black/40 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">SOURCE FILE</p>
                    <p className="text-white font-black truncate text-sm" title={data.filename}>{data.filename}</p>
                  </div>

                  {/* Skills Cloud */}
                  <div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">EXTRACTED EXPERTISE</p>
                    <div className="flex flex-wrap gap-2">
                      {data.parsed_skills?.slice(0, 12).map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white hover:border-zinc-500 transition-all">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowPicker(true)}
                    className="w-full mt-4 py-5 bg-white text-black rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/5"
                  >
                    UPGRADE SOURCE
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto text-center py-20 space-y-8">
            <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
              <Zap className="w-12 h-12 text-zinc-600" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-white tracking-tight">No Data Points</h2>
              <p className="text-zinc-500 text-lg font-medium">Upload a resume to begin your professional intelligence journey.</p>
            </div>
            <button 
              onClick={() => setShowPicker(true)}
              className="px-10 py-5 bg-white text-black rounded-[2rem] font-black text-lg hover:scale-[1.05] transition-all shadow-2xl shadow-white/10"
            >
              INITIALIZE ANALYSIS
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
