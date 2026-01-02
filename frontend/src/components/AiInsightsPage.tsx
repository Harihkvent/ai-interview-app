import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
        alert('Please upload a PDF or DOCX file');
    }
  };

  const handleUpload = async () => {
      if (!resumeFile) return;
      setUploading(true);
      try {
          await uploadProfileResume(resumeFile);
          // Reload to get new insights
          await loadInsights();
          setResumeFile(null);
          setShowUpload(false);
      } catch (error) {
          console.error("Upload failed", error);
          alert("Failed to upload resume");
      } finally {
          setUploading(false);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
            <span className="text-6xl">✨</span>
            <p className="mt-4 text-xl opacity-50">Analyzing Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="glass-card p-8 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-indigo-500/30 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl rotate-12">🧠</div>
             <div className="relative z-10">
                 <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                    <span className="text-4xl">✨</span> AI Profile Insights
                 </h1>
                 <p className="text-lg opacity-70 max-w-2xl">
                    Deep dive into your professional profile. Our AI agents analyze your resume to provide actionable feedback, summary, and skill gaps.
                 </p>
             </div>
        </div>

        {/* Content or Upload State */}
        {data && !showUpload ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Main Profile Analysis */}
                <div className="md:col-span-2 space-y-8">
                    {/* Summary Card */}
                    <div className="glass-card p-8 relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur"></div>
                        <h2 className="font-bold mb-4 flex items-center gap-2 text-indigo-300 uppercase tracking-widest text-xs">
                           <span>📝</span> Professional Summary
                        </h2>
                        <p className="text-lg leading-relaxed opacity-90">
                            {data.summary || "Generating summary..."}
                        </p>
                    </div>

                     {/* Improvements */}
                     <div className="glass-card p-8">
                        <h2 className="font-bold mb-6 flex items-center gap-2 text-pink-300 uppercase tracking-widest text-xs">
                           <span>💡</span> Suggested Improvements
                        </h2>
                        {data.improvements && (Array.isArray(data.improvements) && data.improvements.length > 0 || Object.keys(data.improvements).length > 0) ? (
                            <ul className="space-y-4">
                                {Array.isArray(data.improvements) ? (
                                    data.improvements.map((tip, idx) => (
                                        <li key={idx} className="flex gap-4 items-start p-4 bg-white/5 rounded-xl border border-white/5 hover:border-pink-500/30 transition-all">
                                            <span className="text-pink-400 text-xl">⚡</span>
                                            <span className="opacity-80">{tip}</span>
                                        </li>
                                    ))
                                ) : (
                                    Object.entries(data.improvements).map(([area, tip], idx) => (
                                        <li key={idx} className="flex gap-4 items-start p-4 bg-white/5 rounded-xl border border-white/5 hover:border-pink-500/30 transition-all">
                                            <span className="text-pink-400 text-xl">⚡</span>
                                            <div>
                                                <span className="font-bold capitalize text-sm opacity-60 block mb-1">{area.replace(/_/g, ' ')}</span>
                                                <span className="opacity-80">{tip as string}</span>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        ) : (
                            <div className="text-center py-10 opacity-50">
                                <p>No improvements detected yet. Resume might be perfect!</p>
                            </div>
                        )}
                     </div>
                </div>

                {/* Sidebar Stats & Actions */}
                <div className="space-y-6">
                    {/* File Info */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold text-xs uppercase tracking-widest opacity-50 mb-4">Active Resume</h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center text-xl">📄</div>
                            <div className="overflow-hidden">
                                <p className="font-bold truncate" title={data.filename}>{data.filename}</p>
                                <p className="text-xs opacity-50">Last analyzed recently</p>
                            </div>
                        </div>

                         {/* Skills Cloud */}
                         {data.parsed_skills && data.parsed_skills.length > 0 && (
                             <div className="mb-6">
                                 <h3 className="font-bold text-xs uppercase tracking-widest opacity-50 mb-3">Detected Skills</h3>
                                 <div className="flex flex-wrap gap-2">
                                     {data.parsed_skills.slice(0, 10).map((skill, i) => (
                                         <span key={i} className="px-2 py-1 bg-white/5 rounded-lg text-xs font-mono text-indigo-300 border border-white/5">
                                             {skill}
                                         </span>
                                     ))}
                                     {data.parsed_skills.length > 10 && (
                                         <span className="px-2 py-1 text-xs opacity-50">+{data.parsed_skills.length - 10} more</span>
                                     )}
                                 </div>
                             </div>
                         )}

                        <button 
                            onClick={() => setShowUpload(true)} 
                            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all border border-white/10"
                        >
                            Upload New Version
                        </button>
                    </div>
                </div>
            </div>
        ) : (
             // Empty State / Upload Prompt
            <div className="max-w-xl mx-auto mt-10">
                 <div className="glass-card p-8 text-center space-y-6">
                     <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                         🚀
                     </div>
                     <div>
                         <h2 className="text-2xl font-black mb-2">Unlock Your AI Insights</h2>
                         <p className="opacity-60">Upload your resume to get instant feedback, professional summary, and skill gap analysis without creating a new interview session.</p>
                     </div>
                     
                     {data && (
                        <button 
                            onClick={() => setShowUpload(false)}
                            className="text-sm text-indigo-400 hover:text-white underline font-bold"
                        >
                            ← Back to Current Insights
                        </button>
                     )}

                     <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; handleFileSelect(file); }}
                        className={`border-2 border-dashed rounded-2xl p-8 transition-all ${isDragging
                            ? 'border-indigo-400 bg-indigo-400/10'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                    >
                         {!resumeFile ? (
                             <div className="space-y-4">
                                 <div className="text-4xl opacity-50">📄</div>
                                 <div>
                                     <p className="font-bold">Drag resume here</p>
                                     <p className="text-xs opacity-40 my-2">- or -</p>
                                     <label className="btn-primary py-2 px-6 text-sm cursor-pointer inline-block">
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
                                 <div className="flex items-center justify-center gap-3 bg-white/5 p-4 rounded-xl">
                                     <span className="text-2xl">✓</span>
                                     <div className="text-left">
                                         <p className="font-bold text-sm truncate max-w-[200px]">{resumeFile.name}</p>
                                         <p className="text-xs opacity-50">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                                     </div>
                                     <button onClick={() => setResumeFile(null)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                                 </div>
                                 <button
                                     onClick={handleUpload}
                                     disabled={uploading}
                                     className="btn-primary w-full py-3"
                                 >
                                     {uploading ? (
                                         <span className="flex items-center justify-center gap-2">
                                             <span className="animate-spin text-xl">⟳</span> Analyzing...
                                         </span>
                                     ) : "Analyze Resume"}
                                 </button>
                             </div>
                         )}
                    </div>
                 </div>
            </div>
        )}
    </div>
  );
};
