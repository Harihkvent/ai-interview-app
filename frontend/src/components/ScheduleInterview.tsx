import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
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
    const { showToast } = useToast();
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
            showToast(err.message || 'Failed to create schedule', 'error');
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
            showToast(err.message || 'Failed to cancel schedule', 'error');
        }
    };

    const handleUpdatePreferences = async (updates: Partial<Preferences>) => {
        try {
            const updated = await updateSchedulePreferences(updates);
            setPreferences(updated.preferences);
        } catch (err: any) {
            showToast(err.message || 'Failed to update preferences', 'error');
        }
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getStatusStyle = (status: string) => {
        const styles: { [key: string]: string } = {
            scheduled: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
            completed: 'bg-green-500/10 border-green-500/20 text-green-400',
            cancelled: 'bg-red-500/10 border-red-500/20 text-red-400'
        };
        return styles[status] || 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-black animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-400">Loading schedules...</p>
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
                            <h1 className="text-3xl font-bold text-white mb-2">Interview Schedule</h1>
                            <p className="text-gray-400">Plan and manage your upcoming interview sessions</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPreferences(!showPreferences)}
                                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-medium hover:bg-zinc-700 transition-all"
                            >
                                ⚙️ Settings
                            </button>
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                                + Schedule Interview
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { label: 'Upcoming', value: schedules.filter(s => s.status === 'scheduled').length.toString() },
                        { label: 'Completed', value: schedules.filter(s => s.status === 'completed').length.toString() },
                        { label: 'Total Scheduled', value: schedules.length.toString() },
                    ].map((stat, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-400">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Preferences Panel */}
                {showPreferences && preferences && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Notification Preferences</h3>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-all">
                                <div>
                                    <div className="font-medium text-white">Email Notifications</div>
                                    <div className="text-sm text-gray-400">Receive email confirmations and reminders</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.email_enabled}
                                    onChange={(e) => handleUpdatePreferences({ email_enabled: e.target.checked })}
                                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-white"
                                />
                            </label>
                            <label className="flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-all">
                                <div>
                                    <div className="font-medium text-white">Google Calendar Sync</div>
                                    <div className="text-sm text-gray-400">Automatically add to your Google Calendar</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.calendar_sync_enabled}
                                    onChange={(e) => handleUpdatePreferences({ calendar_sync_enabled: e.target.checked })}
                                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-white"
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Create Form */}
                {showCreateForm && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Schedule New Interview</h3>
                        <form onSubmit={handleCreateSchedule} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Interview Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Mock Interview - Software Engineer"
                                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.scheduled_time}
                                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
                                    <select
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none transition-colors"
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
                                <label className="block text-sm font-medium text-gray-400 mb-2">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Add notes about this interview..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all">
                                    Create Schedule
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-6 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Upcoming Schedules */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Upcoming Interviews</h3>
                    {schedules.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-400 mb-4">No scheduled interviews yet</p>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                                Schedule Your First Interview
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {schedules.map((schedule) => (
                                <div
                                    key={schedule.schedule_id}
                                    className="bg-black border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            {/* Date Box */}
                                            <div className="w-16 h-16 rounded-xl bg-white flex flex-col items-center justify-center flex-shrink-0">
                                                <span className="text-xl font-bold text-black">
                                                    {new Date(schedule.scheduled_time).getDate()}
                                                </span>
                                                <span className="text-xs text-gray-600 uppercase">
                                                    {new Date(schedule.scheduled_time).toLocaleDateString('en-US', { month: 'short' })}
                                                </span>
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-lg font-bold text-white">{schedule.title}</h4>
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusStyle(schedule.status)}`}>
                                                        {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{formatDateTime(schedule.scheduled_time)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{schedule.duration_minutes} min</span>
                                                    </div>
                                                    {schedule.calendar_event_id && (
                                                        <div className="flex items-center gap-2 text-green-400">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>Calendar synced</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {schedule.description && (
                                                    <p className="mt-2 text-sm text-gray-500">{schedule.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {schedule.status === 'scheduled' && (
                                            <button
                                                onClick={() => handleCancelSchedule(schedule.schedule_id)}
                                                className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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
