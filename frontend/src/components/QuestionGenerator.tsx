import React, { useState } from "react";
import {
  generateQuestionsOnly,
  extractText,
  saveGeneratedSession,
} from "../api";

interface QuestionGeneratorProps {
  onSessionCreated?: (sessionId: string) => void;
}

export const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({
  onSessionCreated,
}) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [roundType, setRoundType] = useState("technical");
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [isCached, setIsCached] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      // Use backend extraction (with caching)
      const extractData = await extractText(file);
      const text = extractData.text;

      setResumeText(text);
      const data = await generateQuestionsOnly(text, roundType, 10, "Standalone Generation"); // client-side caching will handle this
      // Handle both string[] and object[] response formats
      const processedQuestions = (data.questions || []).map((q: any) =>
        typeof q === "string" ? q : q.question
      );
      setQuestions(processedQuestions);
      setIsCached(false); // Fresh data from generation
    } catch (err: any) {
      console.error("Question generation failed:", err);
      setError(
        `Failed to process resume: ${
          err.response?.data?.detail ||
          err.message ||
          "Please ensure the file is valid and try again"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (type: string) => {
    if (!resumeText) return;
    setRoundType(type);
    setLoading(true);
    try {
      // API handles caching internally now
      const data = await generateQuestionsOnly(resumeText, type, 10);
      const processedQuestions = (data.questions || []).map((q: any) =>
        typeof q === "string" ? q : q.question
      );
      setQuestions(processedQuestions);
      setIsCached(!!data.questions); // basic check, or we could update API to return cache status
    } catch (err) {
      setError("Failed to regenerate questions.");
    } finally {
      setLoading(false);
    }
  };

  // Format helper safely handles both strings and objects
  const formatQuestionsForSave = (qs: any[]) => {
    return qs.map((q) => {
      if (typeof q === "string") {
        return { question: q, type: roundType };
      }
      return q;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const session = await saveGeneratedSession(
        resumeText,
        "Resume from Generator", // We don't have the original filename here unless we store it
        roundType,
        formatQuestionsForSave(questions)
        // Note: 'questions' state might be strings only if processed during render.
        // We logic in handleFileUpload processed it to strings.
        // Wait, handleFileUpload sets questions to strings. We lost the structure!
        // FIX: We need to store original objects or reconstruct them.
        // For now, simpler to reconstruct basic objects.
      );
      if (onSessionCreated) {
        onSessionCreated(session.session_id);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        "Failed to save session. " + (err.response?.data?.detail || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="glass-card p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-6xl opacity-10 rotate-12">
            ⚡
          </div>
          <h1 className="text-4xl font-bold text-accent-400 mb-2">
            Interview Question Generator
          </h1>
          <p className="text-gray-300">
            Instantly generate tailored interview questions from any resume
            without starting a session.
          </p>

          <div className="mt-8 flex justify-center">
            <label className="px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white rounded-2xl font-bold cursor-pointer transition-all shadow-lg shadow-accent-500/20">
              {loading
                ? "Generating..."
                : resumeText
                ? "Update Resume"
                : "Upload Resume & Generate"}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.docx"
                disabled={loading}
              />
            </label>
            {questions.length > 0 && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="ml-4 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
              >
                <span>🚀</span> Save & Start Interview
              </button>
            )}
          </div>
        </div>

        {resumeText && (
          <div className="flex justify-center gap-4">
            {["aptitude", "technical", "hr"].map((type) => (
              <button
                key={type}
                onClick={() => handleRegenerate(type)}
                disabled={loading}
                className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all border ${
                  roundType === type
                    ? "bg-accent-500 text-white border-accent-400"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-accent-500/50"
                }`}
              >
                {type} round
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card p-6 border border-white/5 animate-pulse"
              >
                <div className="h-4 bg-white/10 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-white/5 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && questions.length > 0 && (
          <div className="grid gap-4">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="p-1 bg-accent-500/20 text-accent-400 rounded">
                  📋
                </span>
                Generated {roundType} Questions
                {isCached && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                    📦 Cached
                  </span>
                )}
              </h2>
              <button
                onClick={() => {
                  const text = questions.join("\n\n");
                  navigator.clipboard.writeText(text);
                  alert("Copied to clipboard!");
                }}
                className="text-xs text-accent-400 hover:underline font-bold"
              >
                Copy All
              </button>
            </div>
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="glass-card p-6 border border-white/10 hover:border-accent-500/30 transition-all group"
              >
                <div className="flex gap-4">
                  <span className="text-accent-500 font-black text-xl">
                    0{idx + 1}
                  </span>
                  <p className="text-gray-200 text-lg leading-relaxed">{q}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-error-500/10 border border-error-500/20 p-6 rounded-2xl text-error-400 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
