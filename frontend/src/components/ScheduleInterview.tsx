import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
    getUpcomingSchedules, 
    createScheduledInterview, 
    cancelSchedule,
    getSchedulePreferences,
    updateSchedulePreferences,
    getCalendarStatus,
    connectCalendar 
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
    const [calendarConnected, setCalendarConnected] = useState(false);
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
            const [schedulesData, prefsData, calendarData] = await Promise.all([
                getUpcomingSchedules(20),
                getSchedulePreferences(),
                getCalendarStatus()
            ]);
            setSchedules(schedulesData.schedules || []);
            setPreferences(prefsData);
            setCalendarConnected(calendarData.calendar_connected);

            // Automatic Timezone Sync
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (prefsData && prefsData.timezone !== detectedTimezone) {
                console.log(`🕒 Updating timezone from ${prefsData.timezone} to ${detectedTimezone}`);
                const updated = await updateSchedulePreferences({ timezone: detectedTimezone });
                setPreferences(updated.preferences);
            }
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Convert naive local time string to UTC ISO string
            // datetime-local input gives YYYY-MM-DDTHH:MM which Date parses as local
            const localDate = new Date(formData.scheduled_time);
            const utcIsoString = localDate.toISOString();

            await createScheduledInterview({
                ...formData,
                scheduled_time: utcIsoString
            });
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

    const handleConnectCalendar = async () => {
        try {
            const currentUrl = window.location.href;
            const response = await connectCalendar(currentUrl);
            if (response.auth_url) {
                window.location.href = response.auth_url;
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to connect calendar', 'error');
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
        <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Interview Schedule</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Plan and manage your upcoming interview sessions</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowPreferences(!showPreferences)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-medium"
                            style={{ 
                                backgroundColor: 'var(--bg-secondary)',
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {showPreferences ? 'Close Preferences' : 'Preferences'}
                        </button>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Schedule Interview
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { label: 'Upcoming', value: schedules.filter(s => s.status === 'scheduled').length.toString() },
                        { label: 'Recently Passed', value: schedules.filter(s => new Date(s.scheduled_time).getTime() < Date.now()).length.toString() },
                        { label: 'Total Listed', value: schedules.length.toString() },
                    ].map((stat, i) => (
                        <div key={i} className="rounded-xl p-6 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Preferences Panel */}
                {showPreferences && preferences && (
                    <div className="rounded-2xl p-6 border animate-in slide-in-from-top-4 duration-300" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                        <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Notification Preferences</h3>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all" 
                                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
                            >
                                <div>
                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Email Notifications</div>
                                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Receive email confirmations and reminders</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.email_enabled}
                                    onChange={(e) => handleUpdatePreferences({ email_enabled: e.target.checked })}
                                    className="w-5 h-5 rounded border-zinc-600 focus:ring-accent"
                                />
                            </label>
                            <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all"
                                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
                            >
                                <div>
                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Google Calendar Sync</div>
                                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Automatically add to your Google Calendar</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.calendar_sync_enabled}
                                    onChange={(e) => handleUpdatePreferences({ calendar_sync_enabled: e.target.checked })}
                                    className="w-5 h-5 rounded border-zinc-600 focus:ring-accent"
                                />
                            </label>

                            {preferences.calendar_sync_enabled && (
                                <div className="p-4 border rounded-xl flex items-center justify-between" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${calendarConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                        <div>
                                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {calendarConnected ? 'Google Calendar Connected' : 'Google Calendar Not Connected'}
                                            </div>
                                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {calendarConnected 
                                                    ? 'Your interviews are being synced to Google Calendar' 
                                                    : 'Authorize access to start syncing your interviews'}
                                            </div>
                                        </div>
                                    </div>
                                    {!calendarConnected && (
                                        <button
                                            onClick={handleConnectCalendar}
                                            className="px-4 py-2 rounded-lg font-medium transition-all text-sm text-white"
                                            style={{ backgroundColor: 'var(--accent-primary)' }}
                                        >
                                            Connect Now
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Create Form */}
                {showCreateForm && (
                    <div className="rounded-2xl p-6 border shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Schedule New Interview</h3>
                        <form onSubmit={handleCreateSchedule} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Interview Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Mock Interview - Software Engineer"
                                    className="w-full px-4 py-3 border rounded-xl focus:border-accent outline-none transition-colors"
                                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.scheduled_time}
                                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl focus:border-accent outline-none transition-colors"
                                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Duration</label>
                                    <select
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 border rounded-xl focus:border-accent outline-none transition-colors"
                                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
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
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Add notes about this interview..."
                                    rows={3}
                                    className="w-full px-4 py-3 border rounded-xl focus:border-accent outline-none transition-colors resize-none"
                                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 py-3 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                                    style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))' }}
                                >
                                    Create Schedule
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-6 py-3 border rounded-xl font-semibold transition-all hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Upcoming Schedules */}
                <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                    <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Scheduled Interviews</h3>
                    {schedules.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>No scheduled interviews yet</p>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="px-6 py-3 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))' }}
                            >
                                Schedule Your First Interview
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {schedules.map((schedule) => (
                                <div
                                    key={schedule.schedule_id}
                                    className="rounded-xl p-6 border transition-all"
                                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
                                >
                                    <div className="flex items-start justify-between flex-wrap gap-4">
                                        <div className="flex gap-4">
                                            {/* Date Box */}
                                            <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white" 
                                                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))' }}>
                                                <span className="text-xl font-bold">
                                                    {(() => {
                                                        const d = new Date(schedule.scheduled_time);
                                                        return isNaN(d.getDate()) ? '--' : d.getDate();
                                                    })()}
                                                </span>
                                                <span className="text-xs uppercase">
                                                    {(() => {
                                                        const d = new Date(schedule.scheduled_time);
                                                        return isNaN(d.getTime()) ? '???' : d.toLocaleDateString('en-US', { month: 'short' });
                                                    })()}
                                                </span>
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{schedule.title}</h4>
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusStyle(schedule.status)}`}>
                                                        {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                                                        <div className="flex items-center gap-2 text-green-500">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>Calendar synced</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {schedule.description && (
                                                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{schedule.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            {schedule.status === 'scheduled' && (
                                                <button
                                                    onClick={() => handleCancelSchedule(schedule.schedule_id)}
                                                    className="px-4 py-2 border rounded-xl transition-all text-sm font-medium"
                                                    style={{ backgroundColor: 'transparent', borderColor: 'var(--border-primary)', color: 'var(--error)' }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--error-light)';
                                                        e.currentTarget.style.borderColor = 'var(--error)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                className="px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all"
                                                style={{ background: 'var(--accent-primary)' }}
                                                onClick={() => navigate('/upload')}
                                            >
                                                Start Session
                                            </button>
                                        </div>
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
