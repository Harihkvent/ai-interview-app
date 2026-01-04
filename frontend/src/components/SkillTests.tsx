import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableSkillTests, startSkillTest, getSkillTestHistory } from '../api';
import axios from 'axios';

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
            alert(err.response?.data?.detail || 'Failed to start test');
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
            alert('Test generated successfully!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to generate test');
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        const colors: { [key: string]: string } = {
            easy: 'text-green-400 bg-green-500/10 border-green-500/20',
            medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
            hard: 'text-red-400 bg-red-500/10 border-red-500/20'
        };
        return colors[difficulty] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    if (loading) {
        return (
            <div className="p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="glass-card p-8 text-center">
                        <div className="text-6xl mb-4 animate-pulse">📝</div>
                        <p className="text-xl text-gray-300">Loading skill tests...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="glass-card p-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span>←</span>
                        <span>Back</span>
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        📝 Skill Assessments
                    </h2>
                    <button
                        onClick={() => setShowGenerateForm(!showGenerateForm)}
                        className="btn-primary"
                    >
                        + Generate Custom Test
                    </button>
                </div>

                {/* Generate Form */}
                {showGenerateForm && (
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4">Generate AI-Powered Test</h3>
                        <form onSubmit={handleGenerateTest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Skill Name</label>
                                <input
                                    type="text"
                                    required
                                    value={generateForm.skill_name}
                                    onChange={(e) => setGenerateForm({ ...generateForm, skill_name: e.target.value })}
                                    placeholder="e.g., React Hooks, Python OOP, SQL Queries"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Category</label>
                                    <select
                                        value={generateForm.category}
                                        onChange={(e) => setGenerateForm({ ...generateForm, category: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
                                    >
                                        <option value="programming">Programming</option>
                                        <option value="frontend">Frontend</option>
                                        <option value="backend">Backend</option>
                                        <option value="database">Database</option>
                                        <option value="devops">DevOps</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Number of Questions</label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="30"
                                        value={generateForm.count}
                                        onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="btn-primary flex-1">
                                    Generate Test
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGenerateForm(false)}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div className="glass-card p-4">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
                            >
                                <option value="all">All Categories</option>
                                <option value="programming">Programming</option>
                                <option value="frontend">Frontend</option>
                                <option value="backend">Backend</option>
                                <option value="database">Database</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Difficulty</label>
                            <select
                                value={selectedDifficulty}
                                onChange={(e) => setSelectedDifficulty(e.target.value)}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
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
                <div className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-4">Available Tests</h3>
                    {tests.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📝</div>
                            <p className="text-gray-400 mb-4">No tests found</p>
                            <button
                                onClick={() => setShowGenerateForm(true)}
                                className="btn-primary"
                            >
                                Generate Your First Test
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tests.map((test) => (
                                <div
                                    key={test.test_id}
                                    className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all hover:scale-105"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-bold text-lg">{test.skill_name}</h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(test.difficulty)}`}>
                                            {test.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4">{test.description}</p>
                                    <div className="space-y-2 text-sm text-gray-300 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span>📊</span>
                                            <span>{test.total_questions} questions</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span>⏱️</span>
                                            <span>{test.duration_minutes} minutes</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span>🎯</span>
                                            <span>Pass: {test.passing_score}%</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStartTest(test.test_id)}
                                        className="w-full btn-primary"
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
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4">Recent Attempts</h3>
                        <div className="space-y-3">
                            {history.slice(0, 5).map((attempt) => (
                                <div
                                    key={attempt.attempt_id}
                                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                                >
                                    <div>
                                        <h4 className="font-medium">{attempt.test_name}</h4>
                                        <p className="text-sm text-gray-400">
                                            {new Date(attempt.completed_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary-400">
                                                {attempt.score}%
                                            </div>
                                            <div className={`text-xs ${attempt.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                {attempt.passed ? 'Passed ✓' : 'Failed ✗'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/skill-tests/results/${attempt.attempt_id}`)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
