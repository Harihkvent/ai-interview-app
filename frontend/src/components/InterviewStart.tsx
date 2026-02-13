import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { analyzeSavedResume } from '../api';
import { 
  ArrowLeft, 
  ArrowRight,
  Loader2,
  Sparkles,
  Check
} from 'lucide-react';
import { ResumePicker } from './ResumePicker';

export const InterviewStart: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    const handleStartInterview = async () => {
        if (!selectedResumeId) {
            showToast('Please select or upload a resume first', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const data = await analyzeSavedResume(selectedResumeId, 'interview', 'General Interview');
            navigate(`/interview/${data.session_id}`);
        } catch (error) {
            console.error('Error starting interview:', error);
            showToast('Failed to start interview. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black p-6 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="group px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all flex items-center gap-2 text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Dashboard</span>
                    </button>
                    
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                        <span className="text-xs font-bold text-primary-400 tracking-wider">AI PREPARATION MODE</span>
                    </div>
                </div>

                <div className="text-center space-y-4 py-8">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white">
                        Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">Excel?</span>
                    </h1>
                    <p className="text-zinc-500 text-lg max-w-xl mx-auto">
                        Your AI interviewer is ready. Just select your resume from the vault and we'll tailor the questions to your experience.
                    </p>
                </div>

                <div className="grid md:grid-cols-5 gap-8 items-start">
                    {/* Main Picker Card */}
                    <div className="md:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm">
                        <ResumePicker 
                            selectedId={selectedResumeId}
                            onSelect={setSelectedResumeId}
                            title="Resume Vault"
                            description="Select the experience you want to be interviewed on."
                        />
                    </div>

                    {/* Action Card */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 sticky top-8">
                            <h3 className="text-xl font-bold text-white mb-6">Interview Brief</h3>
                            
                            <div className="space-y-4 mb-8">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 rounded-full bg-primary-500/20 text-primary-400">
                                        <Check size={12} />
                                    </div>
                                    <p className="text-sm text-zinc-400"><span className="text-white font-medium">3 Rounds:</span> Aptitude, Technical, and HR</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 rounded-full bg-primary-500/20 text-primary-400">
                                        <Check size={12} />
                                    </div>
                                    <p className="text-sm text-zinc-400"><span className="text-white font-medium">AI Feedback:</span> Real-time sentiment and technical analysis</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 rounded-full bg-primary-500/20 text-primary-400">
                                        <Check size={12} />
                                    </div>
                                    <p className="text-sm text-zinc-400"><span className="text-white font-medium">Custom Report:</span> In-depth improvement suggestions</p>
                                </div>
                            </div>

                            <button
                                onClick={handleStartInterview}
                                disabled={isLoading || !selectedResumeId}
                                className={`
                                    w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3
                                    ${isLoading || !selectedResumeId
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.1)]'}
                                `}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        <span>PREPARING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        <span>START INTERVIEW</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>

                            {!selectedResumeId && !isLoading && (
                                <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-widest font-bold">
                                    Select a resume to unlock start
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
