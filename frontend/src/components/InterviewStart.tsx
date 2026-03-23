import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { analyzeSavedResume, checkSessionReadiness } from '../api';
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
    const [isPreparing, setIsPreparing] = useState(false);
    const [preparationStatus, setPreparationStatus] = useState<{
        rounds_ready: number;
        total_rounds: number;
        details: any[];
    } | null>(null);

    const handleStartInterview = async () => {
        if (!selectedResumeId) {
            showToast('Please select or upload a resume first', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const data = await analyzeSavedResume(selectedResumeId, 'interview', 'General Interview');
            const sessionId = data.session_id;
            
            // Enter preparation mode instead of immediate navigation
            setIsPreparing(true);
            setIsLoading(false);

            // Poll for readiness
            const pollReadiness = async () => {
                try {
                    const readiness = await checkSessionReadiness(sessionId);
                    setPreparationStatus(readiness);

                    if (readiness.is_ready) {
                        showToast('Interview is ready! Starting now...', 'success');
                        setTimeout(() => {
                            navigate(`/interview/${sessionId}`);
                        }, 1000);
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.error('Readiness check failed:', err);
                    return false;
                }
            };

            // Start polling
            const interval = setInterval(async () => {
                const isReady = await pollReadiness();
                if (isReady) clearInterval(interval);
            }, 3000);

            // Initial check
            await pollReadiness();

        } catch (error) {
            console.error('Error starting interview:', error);
            showToast('Failed to start interview. Please try again.', 'error');
            setIsLoading(false);
            setIsPreparing(false);
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

            {/* Preparation Overlay */}
            {isPreparing && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
                    <div className="max-w-md w-full space-y-8 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 blur-[100px] rounded-full animate-pulse" />
                            <Sparkles className="w-16 h-16 text-primary-500 mx-auto relative animate-bounce" />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white">Preparing Your Rounds</h2>
                            <p className="text-zinc-500">Our AI is crafting personalized questions based on your experience.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-1000"
                                    style={{ 
                                        width: `${preparationStatus ? (preparationStatus.rounds_ready / preparationStatus.total_rounds) * 100 : 10}%` 
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {['aptitude', 'technical', 'hr'].map((type) => {
                                    const details = preparationStatus?.details?.find(d => d.round_type === type);
                                    const isReady = details?.ready;
                                    
                                    return (
                                        <div 
                                            key={type}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                                isReady 
                                                    ? 'bg-primary-500/10 border-primary-500/20 text-white' 
                                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isReady ? 'bg-primary-500/20 text-primary-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                                    <Check size={16} />
                                                </div>
                                                <span className="font-bold uppercase tracking-wider text-xs">
                                                    {type === 'aptitude' ? 'Cognitive Assessment' : type === 'technical' ? 'Technical Evaluation' : 'Behavioral Round'}
                                                </span>
                                            </div>
                                            {isReady ? (
                                                <span className="text-[10px] font-black bg-primary-500 text-black px-2 py-0.5 rounded">READY</span>
                                            ) : (
                                                <Loader2 size={14} className="animate-spin" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold">
                            Do not close this window
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
