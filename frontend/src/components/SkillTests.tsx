import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { getAvailableSkillTests, startSkillTest, getSkillTestHistory } from '../api';
import axios from 'axios';
import { useConfirmDialog } from './ConfirmDialog';

const API_BASE_URL = 'http://localhost:8000';

interface SkillTest {
    test_id: string;
    skill_name: string;
    category: string;
    difficulty: string;
    total_questions: number;
    duration_minutes: number;
    passing_score: number;
    description: string;
    created_by?: string;
}

interface TestHistory {
    attempt_id: string;
    test_name: string;
    score: number;
    passed: boolean;
    completed_at: string;
}

export const SkillTests: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const [tests, setTests] = useState<SkillTest[]>([]);
    const [history, setHistory] = useState<TestHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [generateForm, setGenerateForm] = useState({
        skill_name: '',
        category: 'programming',
        count: 10
    });

    useEffect(() => {
        loadData();
    }, [selectedCategory, selectedDifficulty]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            const category = selectedCategory !== 'all' ? selectedCategory : undefined;
            const difficulty = selectedDifficulty !== 'all' ? selectedDifficulty : undefined;

            const [testsData, historyData] = await Promise.all([
                getAvailableSkillTests(category, difficulty),
                getSkillTestHistory()
            ]);

            setTests(testsData.tests || []);
            setHistory(historyData.history || []);
        } catch (err) {
            console.error('Error loading skill tests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTest = async (testId: string) => {
        try {
            const response = await startSkillTest(testId);
            navigate(`/skill-tests/${response.attempt_id}`);
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to start test', 'error');
        }
    };

    const handleGenerateTest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('auth_token');
            await axios.post(
                `${API_BASE_URL}/api/skill-tests/generate`,
                generateForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowGenerateForm(false);
            setGenerateForm({ skill_name: '', category: 'programming', count: 10 });
            loadData();
            showToast('Test generated successfully!', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to generate test', 'error');
        }
    };

    const handleDeleteTest = async (testId: string, skillName: string) => {
        const confirmed = await confirm(
            'Delete Skill Test',
            `Are you sure you want to delete "${skillName}"? This will delete all associated attempts and questions.`,
            { confirmLabel: 'Delete', variant: 'danger' }
        );
        if (!confirmed) return;
        try {
            const token = localStorage.getItem('auth_token');
            await axios.delete(
                `${API_BASE_URL}/api/skill-tests/${testId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            loadData();
            showToast('Test deleted successfully!', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to delete test', 'error');
        }
    };

    const handleDeleteAttempt = async (attemptId: string) => {
        const confirmed = await confirm(
            'Delete Test Attempt',
            'Are you sure you want to delete this test attempt? This action cannot be undone.',
            { confirmLabel: 'Delete', variant: 'danger' }
        );
        if (!confirmed) return;
        try {
            const token = localStorage.getItem('auth_token');
            await axios.delete(
                `${API_BASE_URL}/api/skill-tests/attempts/${attemptId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            loadData();
            showToast('Attempt deleted successfully!', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to delete attempt', 'error');
        }
    };

    const getDifficultyStyle = (difficulty: string) => {
        const styles: { [key: string]: string } = {
            easy: 'bg-green-500/10 border-green-500/20 text-green-400',
            beginner: 'bg-green-500/10 border-green-500/20 text-green-400',
            medium: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
            intermediate: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
            hard: 'bg-red-500/10 border-red-500/20 text-red-400',
            advanced: 'bg-red-500/10 border-red-500/20 text-red-400'
        };
        return styles[difficulty.toLowerCase()] || 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    };

    const getCategoryIcon = (category: string) => {
        const icons: { [key: string]: string } = {
            programming: '💻',
            frontend: '🎨',
            backend: '⚙️',
            database: '🗄️',
            devops: '🚀'
        };
        return icons[category.toLowerCase()] || '📝';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-black animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <p className="text-gray-400">Loading skill tests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Skill Tests</h1>
                            <p className="text-gray-400">Assess your knowledge and track your progress</p>
                        </div>
                        <button
                            onClick={() => setShowGenerateForm(!showGenerateForm)}
                            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                        >
                            Create Test
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                    {[
                        { label: 'Tests Available', value: tests.length.toString() },
                        { label: 'Tests Taken', value: history.length.toString() },
                        { label: 'Pass Rate', value: history.length > 0 ? `${Math.round((history.filter(h => h.passed).length / history.length) * 100)}%` : '0%' },
                        { label: 'Avg Score', value: history.length > 0 ? `${Math.round(history.reduce((a, h) => a + h.score, 0) / history.length)}%` : '0%' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-400">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Generate Form */}
                {showGenerateForm && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Generate AI-Powered Test</h3>
                        <form onSubmit={handleGenerateTest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Skill Name</label>
                                <input
                                    type="text"
                                    required
                                    value={generateForm.skill_name}
                                    onChange={(e) => setGenerateForm({ ...generateForm, skill_name: e.target.value })}
                                    placeholder="e.g., React Hooks, Python OOP, SQL Queries"
                                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                    <select
                                        value={generateForm.category}
                                        onChange={(e) => setGenerateForm({ ...generateForm, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none transition-colors"
                                    >
                                        <option value="programming">Programming</option>
                                        <option value="frontend">Frontend</option>
                                        <option value="backend">Backend</option>
                                        <option value="database">Database</option>
                                        <option value="devops">DevOps</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Number of Questions</label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="30"
                                        value={generateForm.count}
                                        onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all">
                                    Generate Test
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGenerateForm(false)}
                                    className="px-6 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-2 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none transition-colors"
                            >
                                <option value="all">All Categories</option>
                                <option value="programming">Programming</option>
                                <option value="frontend">Frontend</option>
                                <option value="backend">Backend</option>
                                <option value="database">Database</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Difficulty</label>
                            <select
                                value={selectedDifficulty}
                                onChange={(e) => setSelectedDifficulty(e.target.value)}
                                className="px-4 py-2 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none transition-colors"
                            >
                                <option value="all">All Levels</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Available Tests */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Available Tests</h2>
                    {tests.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📝</div>
                            <p className="text-gray-400 mb-4">No tests found</p>
                            <button
                                onClick={() => setShowGenerateForm(true)}
                                className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                                Generate Your First Test
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {tests.map((test) => (
                                <div
                                    key={test.test_id}
                                    className="bg-black border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all"
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="text-4xl">{getCategoryIcon(test.category)}</div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <h3 className="text-lg font-bold text-white mb-2">{test.skill_name}</h3>
                                                {test.created_by && test.created_by !== 'system' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTest(test.test_id, test.skill_name);
                                                        }}
                                                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete test"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
                                                    {test.total_questions} questions
                                                </span>
                                                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
                                                    {test.duration_minutes} min
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs border ${getDifficultyStyle(test.difficulty)}`}>
                                                    {test.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStartTest(test.test_id)}
                                        className="w-full py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all"
                                    >
                                        Start Test
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Test History */}
                {history.length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">My Attempts</h2>
                        <div className="space-y-3">
                            {history.slice(0, 5).map((attempt) => (
                                <div
                                    key={attempt.attempt_id}
                                    className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl"
                                >
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl ${
                                        attempt.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                        {attempt.score}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-white mb-1">{attempt.test_name}</div>
                                        <div className="text-sm text-gray-400">
                                            {new Date(attempt.completed_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg font-semibold ${
                                        attempt.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                    }`}>
                                        {attempt.passed ? 'Passed' : 'Failed'}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate(`/skill-tests/results/${attempt.attempt_id}`)}
                                            className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-700 transition-all"
                                        >
                                            View Results
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteAttempt(attempt.attempt_id);
                                            }}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete attempt"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <ConfirmDialogComponent />
        </div>
    );
};
