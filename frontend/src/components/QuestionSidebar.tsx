import React from 'react';

interface QuestionDot {
  id: string;
  number: number;
  status: 'pending' | 'submitted' | 'drafted' | 'skipped';
  isCurrent: boolean;
}

interface RoundProgress {
  round_type: string;
  round_id: string;
  questions: QuestionDot[];
  is_current: boolean;
}

interface QuestionSidebarProps {
  rounds: RoundProgress[];
  onJump: (questionId: string) => void;
  overallTime: string;
}

export const QuestionSidebar: React.FC<QuestionSidebarProps> = ({ rounds, onJump, overallTime }) => {
  const getStatusColor = (status: string, isCurrent: boolean) => {
    if (isCurrent) return 'bg-primary-500 border-primary-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
    switch (status) {
      case 'submitted': return 'bg-green-500/80 border-green-400';
      case 'drafted': return 'bg-yellow-500/80 border-yellow-400';
      case 'skipped': return 'bg-gray-500/50 border-gray-400';
      default: return 'bg-white/10 border-white/20';
    }
  };

  return (
    <div className="w-80 glass-card p-6 flex flex-col h-full border-r border-white/10">
      <div className="mb-8">
        <h3 className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Total Progress</h3>
        <div className="text-3xl font-mono font-bold text-primary-400">{overallTime}</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2">
        {rounds.map((round) => (
          <div key={round.round_id} className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="capitalize font-bold text-sm tracking-wide text-white flex items-center gap-2">
                {round.round_type}
                {round.is_current && <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></span>}
              </h4>
              <span className="text-[10px] text-gray-500 font-mono">
                {round.questions.filter(q => q.status === 'submitted').length}/{round.questions.length}
              </span>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {round.questions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => onJump(q.id)}
                  className={`aspect-square rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 ${getStatusColor(q.status, q.isCurrent)}`}
                  title={`Question ${q.number}`}
                >
                  {q.number}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div> Answered
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Drafted
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-white/10 border border-white/20 rounded-full"></div> Pending
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div> Current
          </div>
        </div>
      </div>
    </div>
  );
};
