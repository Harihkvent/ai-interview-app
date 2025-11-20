import { useState, useEffect, useRef } from 'react';
import { startInterview, sendMessage } from './api';
import './index.css';
import React from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

function App() {
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleStart = async () => {
        setIsLoading(true);
        try {
            const data = await startInterview();
            setSessionId(data.session_id);
            setMessages([{ role: 'assistant', content: data.message }]);
            setHasStarted(true);
        } catch (error) {
            console.error('Error starting interview:', error);
            alert('Failed to start interview. Please check if the backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !sessionId) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const data = await sendMessage(sessionId, userMessage);
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!hasStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                            AI Interview
                        </h1>
                        <p className="text-xl text-gray-300">
                            Practice your interview skills with our AI-powered interviewer
                        </p>
                    </div>

                    <div className="space-y-4 text-left bg-white/5 rounded-xl p-6">
                        <h2 className="text-2xl font-semibold text-primary-300">What to expect:</h2>
                        <ul className="space-y-3 text-gray-300">
                            <li className="flex items-start gap-3">
                                <span className="text-primary-400 text-xl">✓</span>
                                <span>Professional technical and behavioral questions</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary-400 text-xl">✓</span>
                                <span>Real-time AI responses and follow-up questions</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary-400 text-xl">✓</span>
                                <span>Constructive feedback on your answers</span>
                            </li>
                        </ul>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={isLoading}
                        className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Starting...
                            </span>
                        ) : (
                            'Start Interview'
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="glass-card m-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        AI Interview Session
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-300">Active</span>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                            <div className={msg.role === 'user' ? 'message-user' : 'message-ai'}>
                                <div className="text-xs opacity-70 mb-1">
                                    {msg.role === 'user' ? 'You' : 'AI Interviewer'}
                                </div>
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="message-ai">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input */}
            <footer className="glass-card m-4 p-4">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type your answer..."
                            disabled={isLoading}
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputMessage.trim()}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </div>
                </form>
            </footer>
        </div>
    );
}

export default App;
