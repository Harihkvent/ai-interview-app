import React, { useState, useEffect } from 'react';
import { startRound, submitAnswer, switchRound, getRoundsStatus, downloadReport, getNextRound } from '../api';
import { useParams } from 'react-router-dom';

type RoundType = 'aptitude' | 'technical' | 'hr';

interface Question {
    id: string;
    text: string;
    number: number;
    type?: 'mcq' | 'descriptive';
    options?: string[];
}

interface InterviewSessionProps {
    sessionId?: string;
    initialRound?: RoundType;
    onComplete: () => void;
    onExit: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ 
    sessionId: propsSessionId, 
    initialRound, 
    onComplete,
    onExit 
}) => {
    const { id: paramSessionId } = useParams<{ id: string }>();
    const sessionId = propsSessionId || paramSessionId;
    const [currentRound, setCurrentRound] = useState<RoundType | null>(initialRound || null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [loading, setLoading] = useState(false);
    const [answer, setAnswer] = useState('');
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [evaluation, setEvaluation] = useState<any | null>(null);
    const [roundStatus, setRoundStatus] = useState<any[]>([]);
    const [showRoundSelector, setShowRoundSelector] = useState(false);
    const [interviewComplete, setInterviewComplete] = useState(false);
    const [roundComplete, setRoundComplete] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript) {
                    setAnswer(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };

            recognitionInstance.onend = () => {
                setIsRecording(false);
            };

            setRecognition(recognitionInstance);
        }
    }, []);

    const toggleRecording = () => {
        if (!recognition) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isRecording) {
            recognition.stop();
        } else {
            try {
                recognition.start();
                setIsRecording(true);
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    };

    // Fetch initial status
    useEffect(() => {
        if (!sessionId) return;
        loadStatus();
        if (!currentRound) {
             determineNextRound();
        } else {
            startcurrentRound();
        }
    }, [sessionId]);

    if (!sessionId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="text-6xl">⚠️</div>
                    <h2 className="text-3xl font-bold text-red-400">Session ID Missing</h2>
                    <p className="text-gray-300">Could not find a valid interview session.</p>
                    <button onClick={onExit} className="btn-primary">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    useEffect(() => {
        let interval: any;
        if (isTimerRunning) {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const loadStatus = async () => {
        try {
            const status = await getRoundsStatus(sessionId);
            setRoundStatus(status.rounds || []);
        } catch (e) {
            console.error("Failed to load status", e);
        }
    };

    const determineNextRound = async () => {
        try {
            const next = await getNextRound(sessionId);
            if (next.round_type) {
                setCurrentRound(next.round_type as RoundType);
                startcurrentRound(next.round_type);
            } else {
                setInterviewComplete(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const startcurrentRound = async (round: RoundType = currentRound!) => {
        setLoading(true);
        try {
            const data = await startRound(sessionId, round);
            if (data.questions && data.questions.length > 0) {
                // Find first unanswered question
                // backend service returns list of questions. 
                // We need to track index locally or rely on backend to tell us "next question".
                // The new backend `activate_round` returns "questions" list and "current_question_index".
                // We can find the first one without an answer? 
                // Wait, `activate_round` returns `questions` (list of objects).
                // It does NOT return which ones are answered unless we check.
                // However, the `startRound` API response structure in `interview_router` returns what `activate_round` returns.
                // `activate_round` returns: { round_id, round_type, questions, current_question_index }
                
                // Ideally we should filter for unanswered or rely on `current_question_index`.
                // For simplicity, let's assume we start at current_question_index.
                const qIndex = data.current_question_index || 0;
                if (qIndex < data.questions.length) {
                    const qData = data.questions[qIndex];
                    console.log('Current Question Data:', qData); // Debug log
                     setCurrentQuestion({
                        id: qData.id || qData._id, // Handle both id and _id
                        text: qData.question_text,
                        number: qData.question_number,
                        type: qData.question_type,
                        options: qData.options
                    });
                    setTimer(0);
                    setIsTimerRunning(true);
                    setRoundComplete(false);
                } else {
                    setRoundComplete(true);
                }
            }
        } catch (e) {
            console.error("Error starting round", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchRound = async (round: RoundType) => {
        setLoading(true);
        try {
            const data = await switchRound(sessionId, round);
            setCurrentRound(round);
            // Logic to set question similar to startcurrentRound
             if (data.round_details && data.round_details.questions) {
                const qIndex = data.round_details.current_question_index || 0;
                if (qIndex < data.round_details.questions.length) {
                     const qData = data.round_details.questions[qIndex];
                     console.log('Switch Round Question Data:', qData); // Debug log
                     setCurrentQuestion({
                        id: qData.id || qData._id,
                        text: qData.question_text,
                        number: qData.question_number,
                        type: qData.question_type,
                        options: qData.options
                    });
                    setTimer(0);
                    setIsTimerRunning(true);
                    setRoundComplete(false);
                } else {
                     setRoundComplete(true);
                }
            }
            setShowRoundSelector(false);
            loadStatus();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!currentQuestion) return;
        setLoading(true);
        setIsTimerRunning(false);
        try {
            const result = await submitAnswer(currentQuestion.id, answer, timer);
            setEvaluation(result);
            setAnswer('');
            loadStatus();
            
            // Check progress
            // result contains { evaluation, round_obj }
            // logic to determine next question is needed.
            // For now, we wait for user to click "Next"
        } catch (e) {
            console.error(e);
            setIsTimerRunning(true);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        setEvaluation(null);
        // Refresh round to get next question
        if (currentRound) {
            startcurrentRound(currentRound);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (interviewComplete) {
        return (
             <div className="flex items-center justify-center p-4 h-full">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="text-8xl mb-4">🎉</div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Interview Complete!</h1>
                    <button onClick={async () => {
                        const blob = await downloadReport(sessionId);
                         const url = window.URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `report-${sessionId}.pdf`;
                         a.click();
                    }} className="btn-primary w-full text-lg">📥 Download Report</button>
                    <button onClick={onComplete} className="text-gray-400 hover:text-white mt-4">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    if (!currentQuestion && !loading && !roundComplete) {
        return <div className="p-12 text-center text-xl">Loading Interview...</div>;
    }

    if (roundComplete && !loading) {
         return (
             <div className="flex items-center justify-center p-4 h-full">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-4xl font-bold">{currentRound?.toUpperCase()} Round Complete!</h1>
                    <button onClick={determineNextRound} className="btn-primary w-full text-lg">Continue to Next Round</button>
                    <button onClick={() => setShowRoundSelector(true)} className="text-primary-400 mt-4 block mx-auto">Switch Round Manually</button>
                </div>
                 {showRoundSelector && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-gray-900 p-8 rounded-xl max-w-md w-full">
                            <h3 className="text-xl font-bold mb-4">Select Round</h3>
                            <div className="space-y-2">
                                {['aptitude', 'technical', 'hr'].map(r => (
                                    <button key={r} onClick={() => handleSwitchRound(r as RoundType)} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg capitalize text-left">
                                        {r} Round
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowRoundSelector(false)} className="mt-4 text-gray-400">Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        ); 
    }

    return (
        <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full">
            {/* Header */}
            <header className="glass-card p-4 mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold capitalize bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        {currentRound} Round
                    </h2>
                    <p className="text-gray-400 text-sm">Question {currentQuestion?.number}</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-3xl font-mono font-bold text-primary-400">{formatTime(timer)}</div>
                        <p className="text-xs text-gray-500">Time Elapsed</p>
                    </div>
                    <button onClick={() => setShowRoundSelector(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors">
                        Switch Round
                    </button>
                    <button onClick={onExit} className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
                        Exit
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex gap-6">
                {/* Question Area */}
                <div className="flex-1 glass-card p-8 flex flex-col">
                    {!evaluation ? (
                        <>
                            <div className="mb-8">
                                <h3 className="text-xl text-white leading-relaxed font-medium">
                                    {currentQuestion?.text}
                                </h3>
                            </div>

                            {currentQuestion?.type === 'mcq' ? (
                                <div className="grid gap-3 mb-8">
                                    {currentQuestion.options?.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setAnswer(opt)}
                                            className={`p-4 text-left rounded-xl border-2 transition-all ${
                                                answer === opt 
                                                ? 'border-primary-500 bg-primary-500/10 text-white' 
                                                : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30'
                                            }`}
                                        >
                                            <span className="inline-block w-8 font-bold text-primary-400">{String.fromCharCode(65 + i)}.</span>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                            <div className="relative group">
                                <textarea
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 pr-16 text-white min-h-[200px] mb-8 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all resize-none"
                                    placeholder="Type your answer here or use the microphone..."
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                />
                                <button
                                    onClick={toggleRecording}
                                    className={`absolute right-4 top-4 p-3 rounded-full transition-all ${
                                        isRecording 
                                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                                    }`}
                                    title={isRecording ? 'Stop Recording' : 'Start Voice-to-Text'}
                                >
                                    {isRecording ? '🛑' : '🎤'}
                                </button>
                                {isRecording && (
                                    <div className="absolute bottom-12 right-4 flex items-center gap-2 text-xs text-red-400 animate-pulse font-medium">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        Recording...
                                    </div>
                                )}
                            </div>
                            )}

                            <div className="mt-auto">
                                <button 
                                    onClick={handleSubmit} 
                                    disabled={!answer || loading}
                                    className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-primary-500/20"
                                >
                                    {loading ? 'Submitting...' : 'Submit Answer'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center space-y-6 animate-fadeIn">
                             <div className="text-6xl mb-4">{evaluation.evaluation.score >= 8 ? '🌟' : '👍'}</div>
                             <h2 className="text-3xl font-bold">Answer Evaluated</h2>
                             <div className="text-5xl font-bold text-primary-400">{evaluation.evaluation.score}/10</div>
                             <div className="bg-white/5 rounded-xl p-6 text-left">
                                <h4 className="text-primary-300 font-bold mb-2">Feedback</h4>
                                <p className="text-gray-200">{evaluation.evaluation.evaluation}</p>
                             </div>
                             <button onClick={handleNext} className="btn-primary w-full py-3">Next Question</button>
                        </div>
                    )}
                </div>

                {/* Status Sidebar */}
                <div className="w-80 glass-card p-6 hidden lg:block">
                    <h3 className="text-lg font-bold mb-4">Session Progress</h3>
                    <div className="space-y-4">
                        {roundStatus.map((r: any) => (
                            <div key={r.round_type} className={`p-4 rounded-xl border ${
                                r.is_current ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 bg-white/5'
                            }`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="capitalize font-bold">{r.round_type}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        r.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                                        r.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                                    }`}>{r.status}</span>
                                </div>
                                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                     <div className="bg-primary-500 h-full transition-all duration-500" 
                                          style={{ width: `${(r.answered_questions / Math.max(r.total_questions, 1)) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-right">{r.answered_questions}/{r.total_questions}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Selector Modal */}
            {showRoundSelector && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Jump to Round</h3>
                            <button onClick={() => setShowRoundSelector(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-3">
                            {['aptitude', 'technical', 'hr'].map(r => (
                                <button 
                                    key={r} 
                                    onClick={() => handleSwitchRound(r as RoundType)} 
                                    className="w-full p-4 bg-white/5 hover:bg-primary-500/20 border border-white/10 hover:border-primary-500/50 rounded-xl capitalize text-left transition-all flex justify-between items-center group"
                                >
                                    <span className="font-medium group-hover:text-primary-300">{r}</span>
                                    {r === currentRound && <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded">Current</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
