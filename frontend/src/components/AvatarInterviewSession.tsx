import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AvatarDisplay, preloadAvatar } from './AvatarDisplay';
import { useVoiceController } from './VoiceController';
import { TranscriptPanel } from './TranscriptPanel';

interface Question {
  id: string;
  text: string;
  voice_text: string;
  type: string;
  options?: string[];
  number: number;
  is_followup?: boolean;
}

interface TranscriptEntry {
  role: 'avatar' | 'user';
  text: string;
  timestamp: Date;
}

export const AvatarInterviewSession: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [animationState, setAnimationState] = useState<'idle' | 'speaking' | 'listening' | 'thinking'>('idle');
  const [questionTimer, setQuestionTimer] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Create a ref to hold the answer complete handler
  const handleAnswerCompleteRef = useRef<(answerText: string) => void>(() => {});

  // Voice controller
  const {
    isListening,
    isSpeaking,
    interimTranscript,
    isSupported,
    speak,
    stopSpeaking,
    startListening
  } = useVoiceController({
    onTranscriptComplete: (text) => handleAnswerCompleteRef.current(text),
    onSpeakingStateChange: (speaking) => {
      setAnimationState(speaking ? 'speaking' : 'idle');
    },
    autoStart: false // Manual control of listening
  });

  // Preload avatar model
  useEffect(() => {
    preloadAvatar();
  }, []);

  // Load session on mount
  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  // Question timer
  useEffect(() => {
    let interval: any;
    if (!isPaused && currentQuestion && !isListening && !isSpeaking) {
      interval = setInterval(() => {
        setQuestionTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, currentQuestion, isListening, isSpeaking]);

  // Update animation state based on voice activity
  useEffect(() => {
    if (isListening) {
      setAnimationState('listening');
    } else if (isSpeaking) {
      setAnimationState('speaking');
    } else {
      setAnimationState('idle');
    }
  }, [isListening, isSpeaking]);

  async function loadSession() {
    try {
      const response = await fetch(`http://localhost:8000/api/avatar-interview/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`);
      }

      const data = await response.json();
      setTranscript(data.transcript.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp)
      })));
      setQuestionsAnswered(data.questions_answered);

      if (data.current_question) {
        setCurrentQuestion(data.current_question);
        // Don't auto-speak - wait for user to click Start Interview
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Failed to load interview session. Please try again.');
      navigate('/avatar-interview/start');
      setLoading(false);
    }
  }

  function handleStartInterview() {
    if (!currentQuestion) return;
    
    // Request speech synthesis permission by speaking
    setInterviewStarted(true);
    speakQuestion(currentQuestion, true);
  }

  const speakQuestion = useCallback((question: Question, thenListen: boolean = true) => {
    console.log('🎤 Speaking question:', question.text.substring(0, 50) + '...', 'thenListen:', thenListen);
    
    // Add question to transcript
    const newEntry: TranscriptEntry = {
      role: 'avatar',
      text: question.text,
      timestamp: new Date()
    };
    setTranscript(prev => [...prev, newEntry]);

    // Speak the question using voice-optimized text
    speak(question.voice_text || question.text, () => {
      console.log('🎤 Question finished speaking');
      // After question is spoken, optionally start listening
      if (thenListen) {
        console.log('👂 Starting listening in 500ms...');
        setTimeout(() => {
          startListening();
        }, 500);
      }
    });
  }, [speak, startListening, setTranscript]);

  const handleAnswerComplete = useCallback(async (answerText: string) => {
    if (!currentQuestion || !answerText.trim()) return;

    console.log('📝 Answer submitted:', answerText.substring(0, 50) + '...');
    setAnimationState('thinking');

    // Add user's answer to transcript
    const userEntry: TranscriptEntry = {
      role: 'user',
      text: answerText,
      timestamp: new Date()
    };
    setTranscript(prev => [...prev, userEntry]);

    try {
      const response = await fetch('http://localhost:8000/api/avatar-interview/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQuestion.id,
          answer_text: answerText,
          time_taken_seconds: questionTimer,
          is_voice: true
        })
      });

      if (!response.ok) throw new Error('Failed to submit answer');

      const result = await response.json();
      console.log('🔍 Backend response:', result);

      // Handle the response with proper sequencing
      if (result.next_question) {
        console.log('✅ Next question received:', result.next_question.text.substring(0, 50) + '...');
        
        // Update state first
        setCurrentQuestion(result.next_question);
        setQuestionTimer(0);
        setQuestionsAnswered(prev => prev + 1);

        // Speak acknowledgment, then question
        if (result.acknowledgment) {
          console.log('💬 Speaking acknowledgment:', result.acknowledgment);
          speak(result.acknowledgment, () => {
            console.log('💬 Acknowledgment finished, now speaking question');
            // After acknowledgment finishes, speak the new question
            speakQuestion(result.next_question, true);
          });
        } else {
          console.log('💬 No acknowledgment, speaking question directly');
          // No acknowledgment, directly speak question
          speakQuestion(result.next_question, true);
        }
      } else if (result.round_complete) {
        console.log('🏁 Round complete');
        handleRoundComplete();
      } else {
        console.warn('⚠️ Unexpected response structure:', result);
      }

    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      setAnimationState('idle');
    }
  }, [currentQuestion, sessionId, questionTimer, speak, speakQuestion, setAnimationState, setTranscript, setCurrentQuestion, setQuestionTimer, setQuestionsAnswered]);

  // Update the ref whenever handleAnswerComplete changes
  useEffect(() => {
    handleAnswerCompleteRef.current = handleAnswerComplete;
  }, [handleAnswerComplete]);

  async function handleRoundComplete() {
    speak("Great! We've completed this round. Let me check if there are more questions.", async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/avatar-interview/next-round?session_id=${sessionId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        const data = await response.json();

        if (data.all_complete) {
          handleInterviewComplete();
        } else if (data.first_question) {
          setCurrentQuestion(data.first_question);
          setQuestionTimer(0);
          speak(`Now let's move to the ${data.current_round} round.`, () => {
            speakQuestion(data.first_question);
          });
        }
      } catch (error) {
        console.error('Error starting next round:', error);
      }
    });
  }

  async function handleInterviewComplete() {
    speak("Thank you for completing the interview! I'm generating your report now.", async () => {
      try {
        await fetch(`http://localhost:8000/api/avatar-interview/finalize?session_id=${sessionId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        navigate('/dashboard', {
          state: {
            message: 'AI Avatar Interview completed! Check your history for the report.'
          }
        });
      } catch (error) {
        console.error('Error finalizing interview:', error);
      }
    });
  }

  async function handlePause() {
    setIsPaused(true);
    stopSpeaking();

    try {
      await fetch(`http://localhost:8000/api/avatar-interview/pause?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  }

  async function handleResume() {
    setIsPaused(false);

    try {
      await fetch(`http://localhost:8000/api/avatar-interview/resume?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      // Re-speak current question
      if (currentQuestion) {
        speakQuestion(currentQuestion);
      }
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  }

  function handleEnd() {
    if (confirm('Are you sure you want to end the interview?')) {
      handleInterviewComplete();
    }
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card p-12 text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Browser Not Supported</h2>
          <p className="text-gray-400 mb-6">
            Your browser doesn't support voice features required for the AI Avatar Interview.
            Please use Google Chrome for the best experience.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🤖</div>
          <p className="text-xl text-gray-400">Loading AI Interviewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🤖 AI Avatar Interview</h1>
          <p className="text-sm text-gray-400">
            Question {questionsAnswered + 1} {currentQuestion?.is_followup && '(Follow-up)'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
            <span className="text-sm text-gray-400">Time: </span>
            <span className="font-mono">{Math.floor(questionTimer / 60)}:{(questionTimer % 60).toString().padStart(2, '0')}</span>
          </div>
          <button
            onClick={isPaused ? handleResume : handlePause}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isPaused ? 'bg-primary-600 text-white' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button
            onClick={handleEnd}
            className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30"
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Avatar and Question */}
        <div className="space-y-6">
          {/* Avatar Display */}
          <div className="relative">
            <AvatarDisplay 
              animationState={animationState}
              isSpeaking={isSpeaking}
            />

            {/* Start Interview Overlay */}
            {!interviewStarted && currentQuestion && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">🎙️</div>
                  <h3 className="text-xl font-bold mb-2 text-white">Ready to Begin</h3>
                  <p className="text-sm text-gray-400 mb-6 max-w-xs">
                    Click below to start. The AI avatar will ask you questions via voice.
                  </p>
                  <button
                    onClick={handleStartInterview}
                    className="px-8 py-3 rounded-xl font-bold text-lg transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      color: 'white',
                      boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(59,130,246,0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 24px rgba(59,130,246,0.3)';
                    }}
                  >
                    Start Interview
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Question Display */}
          {currentQuestion && (
            <div className="glass-card p-6 border border-white/10">
              <div className="flex items-start gap-3">
                <div className="text-2xl">❓</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-300 mb-2">Current Question:</h3>
                  <p className="text-lg leading-relaxed">{currentQuestion.text}</p>
                  {currentQuestion.is_followup && (
                    <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                      Follow-up Question
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Voice Status */}
          <div className="glass-card p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isListening && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-medium">Listening...</span>
                  </>
                )}
                {isSpeaking && (
                  <>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-blue-400 font-medium">Avatar Speaking...</span>
                  </>
                )}
                {!isListening && !isSpeaking && (
                  <>
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-400">Ready</span>
                  </>
                )}
              </div>
              <span className="text-xs text-gray-500">Voice Auto-Detection Active</span>
            </div>
          </div>
        </div>

        {/* Right: Transcript */}
        <div className="space-y-6">
          <div className="glass-card p-6 border border-white/10">
            <h3 className="font-semibold text-primary-300 mb-4 flex items-center gap-2">
              <span>💬</span>
              Conversation Transcript
            </h3>
            <TranscriptPanel 
              transcript={transcript}
              interimText={interimTranscript}
            />
          </div>

          {/* Tips */}
          <div className="glass-card p-4 border border-white/10 bg-blue-500/5">
            <h4 className="font-semibold text-blue-300 mb-2 text-sm">💡 Tips</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• The avatar will ask you questions</li>
              <li>• Speak naturally when the avatar finishes</li>
              <li>• The system auto-detects when you stop speaking</li>
              <li>• You may receive follow-up questions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-xl">
          <div className="text-center">
            <div className="text-9xl mb-8 animate-bounce">⏸️</div>
            <h2 className="text-5xl font-bold mb-4">Interview Paused</h2>
            <p className="text-gray-400 mb-12 max-w-md">
              Take a break. Click resume when you're ready to continue.
            </p>
            <button onClick={handleResume} className="btn-primary px-12 py-5 text-2xl font-bold">
              Resume Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
