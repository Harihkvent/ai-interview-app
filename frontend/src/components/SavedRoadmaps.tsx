import React, { useEffect, useState } from 'react';
import { getAllRoadmaps, deleteRoadmap } from '../api';
import { useConfirmDialog } from './ConfirmDialog';

interface Roadmap {
    id: string;
    target_role: string;
    estimated_timeline: string;
    created_at: string;
    is_saved: boolean;
}

interface SavedRoadmapsProps {
    onViewRoadmap?: (roadmapId: string) => void;
}

export const SavedRoadmaps: React.FC<SavedRoadmapsProps> = ({ onViewRoadmap }) => {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoadmaps();
    }, []);

    const loadRoadmaps = async () => {
        try {
            const data = await getAllRoadmaps();
            // API returns { total: number, roadmaps: [] }
            setRoadmaps(data.roadmaps || data || []);
        } catch (error) {
            console.error('Failed to load roadmaps:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (roadmapId: string) => {
        const confirmed = await confirm(
            'Delete Roadmap',
            'Are you sure you want to delete this roadmap? This action cannot be undone.',
            { confirmLabel: 'Delete', variant: 'danger' }
        );
        if (!confirmed) return;
        
        try {
            await deleteRoadmap(roadmapId);
            setRoadmaps(roadmaps.filter(r => r.id !== roadmapId));
        } catch (error) {
            console.error('Failed to delete roadmap:', error);
            alert('Failed to delete roadmap');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">🗺️</div>
                    <p className="text-xl text-gray-300">Loading your roadmaps...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                        My Career Roadmaps
                    </h1>
                    <p className="text-gray-300">
                        Your saved career development plans
                    </p>
                </div>

                {/* Roadmaps Grid */}
                {roadmaps.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h2 className="text-2xl font-bold mb-2">No Saved Roadmaps Yet</h2>
                        <p className="text-gray-400">
                            Complete an interview to generate your first career roadmap!
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roadmaps.map((roadmap) => (
                            <div
                                key={roadmap.id}
                                className="glass-card p-6 hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="text-4xl">🎯</div>
                                    {roadmap.is_saved && (
                                        <span className="text-yellow-400 text-xl">⭐</span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">
                                    {roadmap.target_role}
                                </h3>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span>⏱️</span>
                                        <span>{roadmap.estimated_timeline}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span>📅</span>
                                        <span>{new Date(roadmap.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {onViewRoadmap && (
                                        <button
                                            onClick={() => onViewRoadmap(roadmap.id)}
                                            className="flex-1 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg transition-colors"
                                        >
                                            View
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(roadmap.id)}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <ConfirmDialogComponent />
        </div>
    );
};
