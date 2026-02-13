import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { ResumePicker } from './ResumePicker';
import { 
    Cpu, 
    Target, 
    ChevronRight, 
    Info, 
    Calendar, 
    Monitor,
    X,
    Briefcase,
    Settings2
} from 'lucide-react';

export const AvatarInterviewStart: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>();
  const [selectedRounds, setSelectedRounds] = useState<string[]>(['hr', 'technical']);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!selectedResumeId) {
      showToast('Please select a resume first', 'warning');
      return;
    }

    if (selectedRounds.length === 0) {
      showToast('Please select at least one round', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/avatar-interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          resume_id: selectedResumeId,
          rounds: selectedRounds
        })
      });

      if (!response.ok) throw new Error('Failed to start interview');

      const data = await response.json();
      navigate(`/avatar-interview/${data.session_id}`);
    } catch (error) {
      console.error('Error starting interview:', error);
      showToast('Failed to start interview. Please try again.', 'error');
      setLoading(false);
    }
  }

  function toggleRound(round: string) {
    if (selectedRounds.includes(round)) {
      setSelectedRounds(selectedRounds.filter(r => r !== round));
    } else {
      setSelectedRounds([...selectedRounds, round]);
    }
  }

  return (
    <div className="min-h-screen bg-black p-6 overflow-hidden relative">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header Section */}
        <div className="text-center py-12 space-y-4">
            <div className="inline-flex p-4 rounded-3xl bg-zinc-900 border border-white/5 shadow-2xl mb-4 group hover:scale-105 transition-transform">
                <Cpu className="w-10 h-10 text-white group-hover:rotate-12 transition-transform" />
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">
                Avatar <span className="text-primary-400">Interview</span>
            </h1>
            <p className="text-zinc-500 text-xl font-medium max-w-2xl mx-auto tracking-tight">
                Engage in immersive, voice-powered simulations with our advanced 3D AI avatars.
            </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Main Configuration Card */}
          <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl space-y-10">
            {/* Resume Selection */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-primary-400" />
                    <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Select Experience</h2>
                </div>
                <ResumePicker 
                    selectedId={selectedResumeId}
                    onSelect={setSelectedResumeId}
                    title="Experience Vault"
                    description="Which version of your profile should we interview you on?"
                />
            </div>

            {/* Round Selection */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Settings2 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Configure Rounds</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => toggleRound('hr')}
                        className={`group p-8 rounded-[2rem] border-2 transition-all flex flex-col items-start relative overflow-hidden ${
                        selectedRounds.includes('hr')
                            ? 'border-primary-500 bg-primary-500/5'
                            : 'border-zinc-800 bg-black/40 hover:border-zinc-700'
                        }`}
                    >
                        <div className={`p-3 rounded-2xl mb-4 transition-colors ${selectedRounds.includes('hr') ? 'bg-primary-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">HR Round</h3>
                            <p className="text-zinc-500 text-xs font-medium leading-relaxed">Behavioral, soft skills, and cultural fit analysis.</p>
                        </div>
                        {selectedRounds.includes('hr') && (
                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                        )}
                    </button>

                    <button
                        onClick={() => toggleRound('technical')}
                        className={`group p-8 rounded-[2rem] border-2 transition-all flex flex-col items-start relative overflow-hidden ${
                        selectedRounds.includes('technical')
                            ? 'border-primary-500 bg-primary-500/5'
                            : 'border-zinc-800 bg-black/40 hover:border-zinc-700'
                        }`}
                    >
                        <div className={`p-3 rounded-2xl mb-4 transition-colors ${selectedRounds.includes('technical') ? 'bg-primary-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                            <Monitor className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Technical</h3>
                            <p className="text-zinc-500 text-xs font-medium leading-relaxed">Domain expertise, technical problem solving.</p>
                        </div>
                        {selectedRounds.includes('technical') && (
                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                        )}
                    </button>
                </div>
            </div>
          </div>

          {/* Expectations & Action Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Info className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Protocol</h2>
                </div>
                <ul className="space-y-4">
                    {[
                        "Voice-powered real-time dialogue",
                        "Intelligent dynamic follow-ups",
                        "Emotional intelligence assessment",
                        "Full performance transcript",
                        "AI-driven skill gap scorecard"
                    ].map((item, i) => (
                        <li key={i} className="flex items-center gap-4 text-zinc-400 group">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-primary-400 transition-colors" />
                            <span className="text-sm font-medium tracking-tight group-hover:text-zinc-200 transition-colors">{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6 text-yellow-500/80">
                    <Calendar className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Requirement</span>
                </div>
                <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                    Please ensure you are in a quiet environment with a stable internet connection. Chrome is recommended for optimal avatar fluidity.
                </p>
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !selectedResumeId || selectedRounds.length === 0}
              className={`
                w-full py-6 rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-4 shadow-2xl
                ${loading || !selectedResumeId || selectedRounds.length === 0
                   ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                   : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-white/10'}
              `}
            >
              {loading ? (
                  <>
                    <Cpu className="w-6 h-6 animate-spin" />
                    <span>INITIALIZING...</span>
                  </>
              ) : (
                  <>
                    <span>START SIMULATION</span>
                    <ChevronRight className="w-6 h-6" />
                  </>
              )}
            </button>
            <button 
                onClick={() => navigate('/dashboard')}
                className="w-full py-5 text-zinc-500 hover:text-white font-black text-sm tracking-widest transition-all uppercase"
            >
                Return to Base
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
