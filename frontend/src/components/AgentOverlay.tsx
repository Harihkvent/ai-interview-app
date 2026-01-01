import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToAgent } from '../api';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  agentName?: string; // 'supervisor', 'job_scout'
}

export const AgentOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'agent', text: 'Hi! I am your AI Career Agent. How can I help you today?', agentName: 'Supervisor' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the Supervisor Agent
      const response = await sendMessageToAgent(userMsg.text);
      
      const agentMsg: Message = { 
        sender: 'agent', 
        text: response.response,
        agentName: response.agent_used 
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      console.error("Agent Error:", error);
      setMessages(prev => [...prev, { sender: 'agent', text: "I'm having trouble connecting to the Hive. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 animate-fade-in-up">
          {/* Header */}
          <div className="p-4 bg-indigo-600 rounded-t-lg flex justify-between items-center text-white">
            <h3 className="font-bold flex items-center gap-2">
              🤖 AI Career Agent
            </h3>
            <button onClick={toggleChat} className="hover:text-gray-200">
              ✖
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white self-end ml-auto'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {msg.sender === 'agent' && (
                  <div className="text-xs text-indigo-500 mb-1 font-semibold uppercase">
                    {msg.agentName === 'job_scout' ? '🕵️ Job Scout' : '🤖 Supervisor'}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask for jobs or advice..."
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={toggleChat}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-300"
      >
        {isOpen ? (
          <span className="text-2xl">✖</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
      </button>
    </div>
  );
};
