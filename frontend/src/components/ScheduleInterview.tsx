import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getUpcomingSchedules, 
    createScheduledInterview, 
    cancelSchedule,
    getSchedulePreferences,
    updateSchedulePreferences 
} from '../api';
import { useConfirmDialog } from './ConfirmDialog';

interface Schedule {
    schedule_id: string;
    title: string;
    description?: string;
    scheduled_time: string;
    duration_minutes: number;
    status: string;
    calendar_event_id?: string;
}

interface Preferences {
    email_enabled: boolean;
    calendar_sync_enabled: boolean;
    reminder_intervals: number[];
    timezone: string;
}

export const ScheduleInterview: React.FC = () => {
    const navigate = useNavigate();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [preferences, setPreferences] = useState<Preferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        scheduled_time: '',
        duration_minutes: 60,
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [schedulesData, prefsData] = await Promise.all([
                getUpcomingSchedules(20),
                getSchedulePreferences()
            ]);
            setSchedules(schedulesData.schedules || []);
            setPreferences(prefsData);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createScheduledInterview(formData);
            setShowCreateForm(false);
            setFormData({ title: '', scheduled_time: '', duration_minutes: 60, description: '' });
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to create schedule');
        }
    };

    const handleCancelSchedule = async (scheduleId: string) => {
        const confirmed = await confirm(
            'Cancel Interview',
            'Are you sure you want to cancel this interview? This action cannot be undone.',
            { confirmLabel: 'Cancel Interview', variant: 'warning' }
        );
        if (!confirmed) return;
        try {
            await cancelSchedule(scheduleId);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to cancel schedule');
        }
    };

    const handleUpdatePreferences = async (updates: Partial<Preferences>) => {
        try {
            const updated = await updateSchedulePreferences(updates);
            setPreferences(updated.preferences);
        } catch (err: any) {
            alert(err.message || 'Failed to update preferences');
        }
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            scheduled: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
            completed: 'text-green-400 bg-green-500/10 border-green-500/20',
            cancelled: 'text-red-400 bg-red-500/10 border-red-500/20'
        };
        return colors[status] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    if (loading) {
        return (
            <div className="p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="glass-card p-8 text-center">
                        <div className="text-6xl mb-4 animate-pulse">📅</div>
                        <p className="text-xl text-gray-300">Loading schedules...</p>
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
                        📅 Interview Scheduling
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPreferences(!showPreferences)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            ⚙️ Settings
                        </button>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="btn-primary"
                        >
                            + Schedule Interview
                        </button>
                    </div>
                </div>

                {/* Preferences Panel */}
                {showPreferences && preferences && (
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4">Notification Preferences</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                                <div>
                                    <div className="font-medium">Email Notifications</div>
                                    <div className="text-sm text-gray-400">Receive email confirmations and reminders</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.email_enabled}
                                    onChange={(e) => handleUpdatePreferences({ email_enabled: e.target.checked })}
                                    className="w-5 h-5"
                                />
                            </label>
                            <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                                <div>
                                    <div className="font-medium">Google Calendar Sync</div>
                                    <div className="text-sm text-gray-400">Automatically add to your Google Calendar</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.calendar_sync_enabled}
                                    onChange={(e) => handleUpdatePreferences({ calendar_sync_enabled: e.target.checked })}
                                    className="w-5 h-5"
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Create Form */}
                {showCreateForm && (
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4">Schedule New Interview</h3>
                        <form onSubmit={handleCreateSchedule} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Interview Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Mock Interview - Software Engineer"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.scheduled_time}
                                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                                    <select
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none"
                                    >
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={90}>1.5 hours</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Add notes about this interview..."
                                    rows={3}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="btn-primary flex-1">
                                    Create Schedule
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Upcoming Schedules */}
                <div className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-4">Upcoming Interviews</h3>
                    {schedules.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📅</div>
                            <p className="text-gray-400 mb-4">No scheduled interviews yet</p>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="btn-primary"
                            >
                                Schedule Your First Interview
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {schedules.map((schedule) => (
                                <div
                                    key={schedule.schedule_id}
                                    className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-lg font-bold">{schedule.title}</h4>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(schedule.status)}`}>
                                                    {schedule.status}
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-300">
                                                <div className="flex items-center gap-2">
                                                    <span>🕒</span>
                                                    <span>{formatDateTime(schedule.scheduled_time)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span>⏱️</span>
                                                    <span>{schedule.duration_minutes} minutes</span>
                                                </div>
                                                {schedule.description && (
                                                    <div className="flex items-start gap-2">
                                                        <span>📝</span>
                                                        <span>{schedule.description}</span>
                                                    </div>
                                                )}
                                                {schedule.calendar_event_id && (
                                                    <div className="flex items-center gap-2 text-green-400">
                                                        <span>✓</span>
                                                        <span>Added to Google Calendar</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {schedule.status === 'scheduled' && (
                                            <button
                                                onClick={() => handleCancelSchedule(schedule.schedule_id)}
                                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialogComponent />
        </div>
    );
};
