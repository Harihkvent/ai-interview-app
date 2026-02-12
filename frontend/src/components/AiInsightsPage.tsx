import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getUserDashboard, uploadProfileResume } from '../api';

interface InsightsData {
  summary: string;
  improvements: Record<string, string> | string[];
  parsed_skills: string[];
  filename: string;
}

export const AiInsightsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const dashboardData = await getUserDashboard();
      if (dashboardData.active_resume) {
        setData(dashboardData.active_resume);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        setResumeFile(file);
    } else {
        showToast('Please upload a PDF or DOCX file', 'warning');
    }
  };

  const handleUpload = async () => {
      if (!resumeFile) return;
      setUploading(true);
      try {
          await uploadProfileResume(resumeFile);
          await loadInsights();
          setResumeFile(null);
          setShowUpload(false);
      } catch (error) {
          console.error("Upload failed", error);
          showToast('Failed to upload resume', 'error');
      } finally {
          setUploading(false);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-black animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-gray-400">Analyzing Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-9 h-9 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">AI Profile Insights</h1>
              <p className="text-gray-400">Deep dive into your professional profile with AI-powered analysis and recommendations.</p>
            </div>
          </div>
        </div>

        {/* Content or Upload State */}
        {data && !showUpload ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Profile Analysis */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Professional Summary
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  {data.summary || "Generating summary..."}
                </p>
              </div>

              {/* Improvements */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Suggested Improvements
                </h2>
                {data.improvements && (Array.isArray(data.improvements) && data.improvements.length > 0 || Object.keys(data.improvements).length > 0) ? (
                  <ul className="space-y-3">
                    {Array.isArray(data.improvements) ? (
                      data.improvements.map((tip, idx) => (
                        <li key={idx} className="flex gap-4 items-start p-4 bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-300">{tip}</span>
                        </li>
                      ))
                    ) : (
                      Object.entries(data.improvements).map(([area, tip], idx) => (
                        <li key={idx} className="flex gap-4 items-start p-4 bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <span className="font-semibold capitalize text-xs text-gray-500 block mb-1">{area.replace(/_/g, ' ')}</span>
                            <span className="text-gray-300">{tip as string}</span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No improvements detected. Your resume looks great!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Active Resume</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="font-semibold text-white truncate" title={data.filename}>{data.filename}</p>
                    <p className="text-xs text-gray-500">Last analyzed recently</p>
                  </div>
                </div>

                {/* Skills Cloud */}
                {data.parsed_skills && data.parsed_skills.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Detected Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.parsed_skills.slice(0, 10).map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">
                          {skill}
                        </span>
                      ))}
                      {data.parsed_skills.length > 10 && (
                        <span className="px-3 py-1 text-xs text-gray-500">+{data.parsed_skills.length - 10} more</span>
                      )}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowUpload(true)} 
                  className="w-full py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-all"
                >
                  Upload New Version
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Empty State / Upload Prompt
          <div className="max-w-xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-4xl mx-auto">
                🚀
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Unlock Your AI Insights</h2>
                <p className="text-gray-400">Upload your resume to get instant feedback, professional summary, and skill gap analysis.</p>
              </div>
              
              {data && (
                <button 
                  onClick={() => setShowUpload(false)}
                  className="text-sm text-gray-400 hover:text-white underline font-medium"
                >
                  ← Back to Current Insights
                </button>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; handleFileSelect(file); }}
                className={`border-2 border-dashed rounded-2xl p-8 transition-all ${isDragging
                  ? 'border-white bg-white/5'
                  : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {!resumeFile ? (
                  <div className="space-y-4">
                    <div className="text-4xl">📄</div>
                    <div>
                      <p className="font-semibold text-white">Drag resume here</p>
                      <p className="text-xs text-gray-500 my-2">- or -</p>
                      <label className="px-6 py-2 bg-white text-black rounded-lg font-semibold cursor-pointer inline-block hover:bg-gray-200 transition-all">
                        Browse Files
                        <input
                          type="file"
                          accept=".pdf,.docx"
                          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 bg-zinc-800 p-4 rounded-xl">
                      <span className="text-2xl text-green-500">✓</span>
                      <div className="text-left">
                        <p className="font-semibold text-white text-sm truncate max-w-[200px]">{resumeFile.name}</p>
                        <p className="text-xs text-gray-500">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setResumeFile(null)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                    </div>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      {uploading ? 'Analyzing...' : 'Analyze Resume'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
