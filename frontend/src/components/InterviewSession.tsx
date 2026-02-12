import React, { useState, useEffect, useRef } from "react";
import {
  getSessionState,
  submitAnswer,
  pauseSession,
  jumpQuestion,
  finalizeInterview,
  downloadReport,
} from "../api";
import { 
  BarChart3, 
  User, 
  FileText, 
  PenLine, 
  Play, 
  Pause, 
  Bot, 
  Check, 
  Flag, 
  ChevronRight,
  Mic,
  Square
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { QuestionSidebar } from "./QuestionSidebar";
import { CodeEditor } from "./CodeEditor";
import { useConfirmDialog } from "./ConfirmDialog";

// type RoundType = 'aptitude' | 'technical' | 'hr';

interface Question {
  id: string;
  text: string;
  number: number;
  type: "mcq" | "descriptive" | "coding";
  options?: string[];
  starter_code?: string;
  status: string;
}

interface InterviewSessionProps {
  sessionId?: string;
  onExit: () => void;
  onComplete?: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({
  sessionId: propsSessionId,
  onComplete,
}) => {
  const { id: paramSessionId } = useParams<{ id: string }>();
  const sessionId = (propsSessionId || paramSessionId)!;
  const navigate = useNavigate();

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [sessionState, setSessionState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [timer, setTimer] = useState(0); // Per-question timer
  const [globalTimer, setGlobalTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);

  // Voice-to-Text state
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Sync with backend every few seconds
  const syncInterval = useRef<any>(null);

  useEffect(() => {
    loadSession();
    // Setup speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal)
            finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript)
          setAnswer((prev) => prev + (prev ? " " : "") + finalTranscript);
      };
      setRecognition(recognitionInstance);
    }

    return () => {
      if (syncInterval.current) clearInterval(syncInterval.current);
    };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const state = await getSessionState(sessionId);
      setSessionState(state);
      setIsPaused(state.is_paused);
      setGlobalTimer(state.total_time_seconds);

      if (state.status === "verification") {
        setVerificationMode(true);
      }

      // Handle case where questions are still generating
      const currentRound =
        state.rounds.find((r: any) => r.is_current) || state.rounds[0];
      const currentQState =
        currentRound && currentRound.questions
          ? currentRound.questions.find((q: any) => q.isCurrent) ||
            currentRound.questions[0]
          : null;

      if (currentQState) {
        handleJump(currentQState.id);
      } else if (state.status === "active") {
        // Poll if questions are missing but interview is active
        setTimeout(loadSession, 3000);
      }
    } catch (e) {
      console.error("Failed to load session", e);
    } finally {
      setLoading(false);
    }
  };

  const handleJump = async (qId: string) => {
    setLoading(true);
    try {
      await jumpQuestion(sessionId, qId);
      // Now refresh full state to get specific question details
      const state = await getSessionState(sessionId);
      setSessionState(state);

      // Find the specific question data from state or fetch separately
      // Since our jumpQuestion currently returns question info, let's use it.
      // But jumpQuestion needs to return actual question content too.
      // Let's re-fetch the round's currently active setup.
      // For now, I'll update the component to handle question content from the state if I update backend.

      // Actually, let's just use the current question logic:
      // I'll make a more robust jumpQuestion or state response.
      // For now, I can find the question text because I'll update the backend.

      // Wait, I already have question_text in my updated backend models and state logic.
      // Let's look for it in the state.
      let foundQ = null;
      for (const r of state.rounds) {
        const q = r.questions.find((q: any) => q.id === qId);
        if (q) {
          foundQ = { ...q, round_type: r.round_type };
          break;
        }
      }

      if (foundQ) {
        // If coding question, we need starter_code. Our state API might be limited.
        // Let's assume for now we have enough or we'll add it.
        // Actually, I should probably add an API `GET /question/{id}`
        // But for now let's manually fetch round details if needed.
        setCurrentQuestion(foundQ);
        setAnswer(foundQ.status === "submitted" ? "" : ""); // Clear or load draft
        setTimer(0);
        setEvaluation(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await pauseSession(sessionId);
      // Navigate to dashboard with a message
      navigate("/dashboard", {
        state: {
          message:
            "Interview paused. You can resume it later from your dashboard.",
          pausedSessionId: sessionId,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (submitStatus: string = "submitted") => {
    if (!currentQuestion) return;
    setLoading(true);
    try {
      const result = await submitAnswer(
        currentQuestion.id,
        answer,
        timer,
        submitStatus,
      );
      if (submitStatus === "submitted") {
        setEvaluation(result);
      }
      // Update local state after submit/skip
      const newState = await getSessionState(sessionId);
      setSessionState(newState);

      // If skipping, automatically advance to next question
      if (submitStatus === "skipped") {
        // Find next unanswered question after current one
        const allQuestions = newState.rounds.flatMap((r: any) =>
          r.questions.map((q: any) => ({ ...q, round_type: r.round_type })),
        );
        const currentIndex = allQuestions.findIndex(
          (q: any) => q.id === currentQuestion.id,
        );

        // Look for next question that hasn't been answered/skipped
        let nextQuestion = allQuestions
          .slice(currentIndex + 1)
          .find((q: any) => q.status !== "submitted" && q.status !== "skipped");

        // If no unanswered questions after current, try to find any unanswered from start
        if (!nextQuestion) {
          nextQuestion = allQuestions.find(
            (q: any) => q.status !== "submitted" && q.status !== "skipped",
          );
        }

        // If no unanswered questions at all, go to next question in sequence
        if (!nextQuestion && currentIndex + 1 < allQuestions.length) {
          nextQuestion = allQuestions[currentIndex + 1];
        }

        if (nextQuestion) {
          // Clear current answer and jump to next question
          setAnswer("");
          handleJump(nextQuestion.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = () => {
    setShowEndModal(true);
  };

  const handleEndWithReport = async () => {
    setShowEndModal(false);
    try {
      await finalizeInterview(sessionId);
      setVerificationMode(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndWithoutReport = async () => {
    setShowEndModal(false);
    try {
      // Finalize the interview on backend (marks it as completed)
      await finalizeInterview(sessionId);

      // Navigate directly to dashboard without showing report screen
      navigate("/dashboard", {
        state: {
          message:
            "Interview ended successfully. You can view your history from the dashboard.",
        },
      });
    } catch (e) {
      console.error("Error finalizing interview:", e);
      // Still navigate even if there's an error
      navigate("/dashboard", {
        state: {
          message:
            "Interview ended. You can view your history from the dashboard.",
        },
      });
    }
  };

  const toggleRecording = () => {
    if (!recognition) return;
    if (isRecording) recognition.stop();
    else {
      recognition.start();
      setIsRecording(true);
    }
    recognition.onend = () => setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (!isPaused && !verificationMode && currentQuestion) {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
        setGlobalTimer((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, verificationMode, currentQuestion]);

  if (loading && !sessionState)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Interview...
      </div>
    );

  if (verificationMode) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col justify-center text-center space-y-8 animate-fadeIn">
        <div className="flex justify-center">
          <BarChart3 size={96} className="text-primary-500" />
        </div>
        <h1 className="text-5xl font-bold">Interview Review</h1>
        <p className="text-xl text-gray-400">
          You have completed the interview sessions. Review your progress before
          final report generation.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {sessionState.rounds.map((r: any) => (
            <div key={r.round_id} className="glass-card p-6 flex flex-col">
              <h4 className="capitalize font-bold mb-2">{r.round_type}</h4>
              <div className="text-2xl font-bold text-primary-400">
                {
                  r.questions.filter((q: any) => q.status === "submitted")
                    .length
                }
                /{r.questions.length}
              </div>
              <span className="text-xs text-gray-500">Answered</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <button
            onClick={async () => {
              const blob = await downloadReport(sessionId);
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `interview-report-${sessionId}.pdf`;
              a.click();

              if (onComplete) {
                onComplete();
              } else {
                navigate("/dashboard");
              }
            }}
            className="btn-primary w-full py-4 text-xl font-bold"
          >
            Generation & Download Final Report
          </button>

          <button
            onClick={() => setVerificationMode(false)}
            className="text-gray-400 hover:text-white underline"
          >
            Go back to interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <QuestionSidebar
        rounds={sessionState?.rounds || []}
        onJump={handleJump}
        overallTime={formatTime(globalTimer)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Header */}
        <header className="p-6 flex justify-between items-center border-b border-white/5 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
          {currentQuestion ? (
            <div>
              <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                {currentQuestion?.type === "coding"
                  ? <User size={20} className="text-primary-400" />
                  : currentQuestion?.type === "mcq" &&
                      currentQuestion?.options?.length
                    ? <FileText size={20} className="text-blue-400" />
                    : <PenLine size={20} className="text-green-400" />}
                {currentQuestion?.type === "mcq" &&
                currentQuestion?.options?.length
                  ? "MCQ"
                  : currentQuestion?.type === "coding"
                    ? "Coding"
                    : "Descriptive"}{" "}
                Section
              </h2>
              <p className="text-xs text-gray-500 underline">
                Question {currentQuestion?.number}
              </p>
            </div>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-4">
            <div className="text-right px-4 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm font-mono text-gray-400">
                Current Question: {formatTime(timer)}
              </div>
            </div>
            <button
              onClick={handlePause}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isPaused ? "bg-primary-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
            >
              {isPaused ? <><Play size={18} /> Resume</> : <><Pause size={18} /> Pause</>}
            </button>
            <button
              onClick={handleEnd}
              className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all font-bold"
            >
              End Interview
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 flex flex-col max-w-4xl mx-auto w-full">
          {!currentQuestion ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-pulse">
              <Bot size={80} className="text-primary-500" />
              <h2 className="text-3xl font-bold">Preparing Your Questions</h2>
              <p className="text-gray-400 max-w-md">
                Our AI is analyzing your resume to generate tailored interview
                questions. This will only take a moment...
              </p>
            </div>
          ) : evaluation ? (
            <div className="glass-card p-12 text-center space-y-8 animate-fadeIn">
              <div className="flex justify-center"><Check size={80} className="text-green-500" strokeWidth={3} /></div>
              <h2 className="text-3xl font-bold">Submission Received</h2>
              <div className="text-5xl font-mono text-primary-400">
                {evaluation.score}/10
              </div>
              <div className="bg-white/5 p-6 rounded-xl text-left border border-white/10">
                <h4 className="text-primary-300 font-bold mb-2">Feedback</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {evaluation.evaluation}
                </p>
              </div>
              <button
                onClick={() => {
                  // Logic to jump to next unanswered or next question
                  const nextQ = sessionState.rounds
                    .flatMap((r: any) => r.questions)
                    .find(
                      (q: any) =>
                        currentQuestion &&
                        q.number === currentQuestion.number + 1,
                    );
                  if (nextQ) handleJump(nextQ.id);
                  else setEvaluation(null);
                }}
                className="btn-primary w-full py-4 font-bold text-lg"
              >
                Next Question
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="glass-card p-8 border border-white/10">
                <h3 className="text-2xl font-medium leading-relaxed">
                  {currentQuestion?.text}
                </h3>
              </div>

              {currentQuestion?.type === "mcq" &&
                currentQuestion.options &&
                currentQuestion.options.length > 0 && (
                  <div className="grid gap-3">
                    {currentQuestion.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setAnswer(opt)}
                        className={`p-5 text-left rounded-2xl border-2 transition-all group flex justify-between items-center ${
                          answer === opt
                            ? "border-primary-500 bg-primary-500/10 text-white"
                            : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30"
                        }`}
                      >
                        <span className="flex gap-4 items-center">
                          <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold font-mono group-hover:bg-primary-500/20 transition-colors">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                        </span>
                        {answer === opt && (
                          <span className="text-primary-400"><Check size={20} /></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

              {currentQuestion?.type === "coding" && (
                <CodeEditor
                  code={answer || currentQuestion.starter_code || ""}
                  onChange={setAnswer}
                />
              )}

              {(currentQuestion?.type === "descriptive" ||
                (currentQuestion?.type !== "coding" &&
                  (!currentQuestion?.options ||
                    currentQuestion.options.length === 0))) && (
                <div className="relative">
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white min-h-[300px] focus:ring-2 focus:ring-primary-500/50 outline-none transition-all resize-none shadow-inner"
                    placeholder="Type your response here..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                  <button
                    onClick={toggleRecording}
                    className={`absolute bottom-6 right-6 p-4 rounded-full transition-all shadow-xl ${
                      isRecording
                        ? "bg-red-500 animate-pulse"
                        : "bg-white/10 text-gray-400 hover:bg-primary-500 hover:text-white"
                    }`}
                  >
                    {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                  </button>
                </div>
              )}

              <div className="flex gap-4 pt-8">
                <button
                  onClick={() => handleSubmit("skipped")}
                  className="flex-1 py-4 px-6 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 transition-all font-bold"
                >
                  Skip Question
                </button>
                <button
                  onClick={() => handleSubmit("submitted")}
                  disabled={!answer || loading}
                  className="flex-[2] btn-primary py-4 px-6 rounded-xl font-bold text-lg shadow-2xl shadow-primary-500/20"
                >
                  {loading ? "Submitting..." : "Submit Final Answer"}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 backdrop-blur-xl animate-fadeIn">
            <div className="mb-8"><Pause size={96} className="text-primary-500 animate-pulse" /></div>
            <h2 className="text-5xl font-bold mb-4">Interview Paused</h2>
            <p className="text-gray-400 mb-12 text-center max-w-md">
              Your interview task and timers are frozen. Take a break and click
              the button below to resume.
            </p>
            <button
              onClick={handlePause}
              className="btn-primary px-12 py-5 text-2xl font-bold rounded-2xl shadow-2xl shadow-primary-500/40"
            >
              Resume Session
            </button>
          </div>
        )}

        {/* End Interview Modal */}
        {showEndModal && (
          <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-xl animate-fadeIn">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="flex justify-center mb-6"><Flag size={64} className="text-red-500" /></div>
              <h2 className="text-3xl font-bold mb-4 text-center">
                End Interview?
              </h2>
              <p className="text-gray-400 mb-8 text-center">
                Choose how you'd like to proceed:
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleEndWithReport}
                  className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
                >
                  <BarChart3 size={20} className="inline mr-1" /> Generate Report & End
                </button>

                <button
                  onClick={handleEndWithoutReport}
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-colors"
                >
                  <ChevronRight size={20} className="inline mr-1" /> End Without Report
                </button>

                <button
                  onClick={() => setShowEndModal(false)}
                  className="w-full py-3 px-6 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialogComponent />
    </div>
  );
};
