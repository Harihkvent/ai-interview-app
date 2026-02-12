import React from 'react';
import { Bot, User } from 'lucide-react';

interface TranscriptEntry {
  role: 'avatar' | 'user';
  text: string;
  timestamp: Date;
}

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  interimText?: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ transcript, interimText }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-[300px] overflow-y-auto" ref={scrollRef}>
      <div className="space-y-4">
        {transcript.length === 0 && !interimText && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Conversation will appear here...</p>
          </div>
        )}

        {transcript.map((entry, index) => (
          <div
            key={index}
            className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                entry.role === 'avatar'
                  ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                  : 'bg-green-500/20 text-green-100 border border-green-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold">
                  {entry.role === 'avatar' ? <><Bot size={12} className="inline mr-1" /> AI Interviewer</> : <><User size={12} className="inline mr-1" /> You</>}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{entry.text}</p>
            </div>
          </div>
        ))}

        {/* Interim transcript (while user is speaking) */}
        {interimText && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-green-500/10 text-green-200 border border-green-500/20 border-dashed">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold"><User size={12} className="inline mr-1" /> You</span>
                <span className="text-xs text-gray-400 animate-pulse">Speaking...</span>
              </div>
              <p className="text-sm leading-relaxed italic">{interimText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
