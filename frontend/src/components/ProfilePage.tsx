import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    getProfileResumes, 
    uploadProfileResume, 
    deleteProfileResume, 
    setActiveProfileResume,
    getUserPreferences,
    updateUserPreferences,
    updateUserProfile
} from '../api';

interface Resume {
    id: string;
    name: string;
    filename: string;
    is_primary: boolean;
    uploaded_at: string;
}

interface UserPreferences {
    target_role?: string;
    target_salary?: string;
    preferred_locations?: string[];
}

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'settings'>('overview');
    
    // Resume State
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ full_name: '', username: '' });
    const [profileLoading, setProfileLoading] = useState(false);

    // Preferences State
    const [preferences, setPreferences] = useState<UserPreferences>({});
    const [prefLoading, setPrefLoading] = useState(false);
    const [prefSaving, setPrefSaving] = useState(false);
    const [prefSuccess, setPrefSuccess] = useState('');

    useEffect(() => {
        if (activeTab === 'resumes') loadResumes();
        if (activeTab === 'settings') loadPreferences();
        if (user) {
            setProfileForm({
                full_name: user.full_name || '',
                username: user.username || ''
            });
        }
    }, [activeTab, user]);

    // ============ Resume Logic ============
    const loadResumes = async () => {
        try {
            setLoadingResumes(true);
            const data = await getProfileResumes();
            setResumes(data);
            setResumeError(null);
        } catch (err) {
            setResumeError('Failed to load resumes');
        } finally {
            setLoadingResumes(false);
        }
    };

    const handleUpload = async (file: File) => {
        if (!file) return;
        try {
            setUploading(true);
            setResumeError(null);
            await uploadProfileResume(file);
            await loadResumes();
        } catch (err) {
            setResumeError('Failed to upload resume');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Delete this resume?')) return;
        try {
            await deleteProfileResume(id);
            setResumes(resumes.filter(r => r.id !== id));
        } catch (err) {
            setResumeError('Failed to delete resume');
        }
    };

    const handleSetActive = async (id: string) => {
        try {
            await setActiveProfileResume(id);
            await loadResumes();
        } catch (err) {
            setResumeError('Failed to set active resume');
        }
    };

    // Drag & Drop
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
    };

    // ============ Profile Logic ============
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            await updateUserProfile(profileForm);
            setIsEditingProfile(false);
            // Ideally force a reload of user context, but simple reload works too
            window.location.reload(); 
        } catch (error) {
            console.error('Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    // ============ Preferences Logic ============
    const loadPreferences = async () => {
        try {
            setPrefLoading(true);
            const data = await getUserPreferences();
            setPreferences(data || {});
        } catch (err) {
            console.error(err);
        } finally {
            setPrefLoading(false);
        }
    };

    const savePreferences = async () => {
        setPrefSaving(true);
        setPrefSuccess('');
        try {
            await updateUserPreferences(preferences);
            setPrefSuccess('Settings saved successfully!');
            setTimeout(() => setPrefSuccess(''), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setPrefSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-4xl font-bold shadow-xl shadow-primary-500/20">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                            {isEditingProfile ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-3 max-w-md">
                                    <input 
                                        type="text" 
                                        value={profileForm.full_name} 
                                        onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                                        placeholder="Full Name"
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                                    />
                                    <input 
                                        type="text" 
                                        value={profileForm.username} 
                                        onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                                        placeholder="Username"
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                                    />
                                    <div className="flex gap-2">
                                        <button type="submit" disabled={profileLoading} className="px-3 py-1 bg-primary-500 rounded text-sm font-semibold">
                                            {profileLoading ? 'Saving...' : 'Save'}
                                        </button>
                                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-3 py-1 bg-slate-700 rounded text-sm">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl font-bold">{user?.full_name || user?.username}</h1>
                                        <button onClick={() => setIsEditingProfile(true)} className="text-slate-400 hover:text-white transition-colors">
                                            ✎
                                        </button>
                                    </div>
                                    <p className="text-slate-400">{user?.email}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs border border-primary-500/30 font-mono">
                                            PRO MEMBER
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={logout}
                        className="px-6 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/30 font-semibold whitespace-nowrap"
                    >
                        Sign Out
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
                    {[
                        { id: 'overview', label: 'Overview', icon: '📊' },
                        { id: 'resumes', label: 'Resumes', icon: '📄' },
                        { id: 'settings', label: 'Settings', icon: '⚙️' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                px-4 py-2 rounded-lg flex items-center gap-2 transition-all
                                ${activeTab === tab.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            <span>{tab.icon}</span>
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card p-6 rounded-xl hover:border-primary-500/30 transition-colors">
                                <h3 className="text-xl font-bold mb-4">🎯 Quick Stats</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                        <span className="text-slate-300">Resumes Uploaded</span>
                                        <span className="text-2xl font-bold text-white">-</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                        <span className="text-slate-300">Last Login</span>
                                        <span className="text-sm font-mono text-primary-300">
                                            {/* @ts-ignore user might not have last_login typed yet */}
                                            {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Today'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="glass-card p-6 rounded-xl border-dashed border-2 border-slate-700 flex flex-col items-center justify-center text-center space-y-3">
                                <span className="text-4xl opacity-50">🚀</span>
                                <h3 className="text-xl font-bold">Start New Interview</h3>
                                <p className="text-slate-400 text-sm">Ready to practice? Launch a new session now.</p>
                                <button className="btn-primary mt-2">Go to Dashboard</button>
                            </div>
                        </div>
                    )}

                    {/* RESUMES TAB */}
                    {activeTab === 'resumes' && (
                        <div className="space-y-6 animate-fadeIn">
                             <div 
                                className={`
                                    border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                                    ${dragActive ? 'border-primary-400 bg-primary-400/10' : 'border-slate-700 hover:border-primary-400 hover:bg-slate-800/50'}
                                    ${uploading ? 'opacity-50 pointer-events-none' : ''}
                                `}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.docx,.doc"
                                    onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
                                />
                                <div className="space-y-2">
                                    <div className="text-4xl mb-2">☁️</div>
                                    <p className="text-lg font-medium">
                                        {uploading ? 'Uploading...' : 'Click or Drag to Upload Resume'}
                                    </p>
                                    <p className="text-sm text-slate-400">Supported formats: PDF, DOCX</p>
                                </div>
                            </div>

                            {resumeError && <div className="text-red-400 bg-red-500/10 p-4 rounded-lg">{resumeError}</div>}

                            <div className="grid gap-4">
                                {loadingResumes ? (
                                    <div className="text-center text-slate-400 py-10">Loading resumes...</div>
                                ) : resumes.length === 0 ? (
                                    <div className="text-center text-slate-400 py-10">No resumes yet.</div>
                                ) : (
                                    resumes.map(resume => (
                                        <div 
                                            key={resume.id}
                                            onClick={() => handleSetActive(resume.id)}
                                            className={`
                                                group relative p-4 rounded-xl border transition-all cursor-pointer
                                                ${resume.is_primary ? 'bg-primary-500/10 border-primary-500/50' : 'bg-slate-800/40 border-slate-700 hover:border-primary-500/30'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-lg ${resume.is_primary ? 'bg-primary-500/20 text-primary-300' : 'bg-slate-700/50 text-slate-400'}`}>📄</div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                                            {resume.filename}
                                                            {resume.is_primary && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500 text-white">Active</span>}
                                                        </h3>
                                                        <p className="text-sm text-slate-400">{new Date(resume.uploaded_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => handleDelete(resume.id, e)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">🗑️</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="glass-card p-8 rounded-xl space-y-8 animate-fadeIn">
                            <div className="border-b border-slate-700 pb-4">
                                <h3 className="text-xl font-bold">Career Preferences</h3>
                                <p className="text-slate-400 text-sm">Customize your career goals to get better job matches.</p>
                            </div>

                            {prefLoading ? (
                                <div>Loading settings...</div>
                            ) : (
                                <div className="space-y-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Target Role</label>
                                            <input 
                                                type="text" 
                                                value={preferences.target_role || ''}
                                                onChange={e => setPreferences({...preferences, target_role: e.target.value})}
                                                placeholder="e.g. Senior Frontend Engineer"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:border-primary-500 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Target Salary Range</label>
                                            <input 
                                                type="text" 
                                                value={preferences.target_salary || ''}
                                                onChange={e => setPreferences({...preferences, target_salary: e.target.value})}
                                                placeholder="e.g. $120k - $160k"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:border-primary-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Preferred Locations (comma separated)</label>
                                        <input 
                                            type="text" 
                                            value={preferences.preferred_locations?.join(', ') || ''}
                                            onChange={e => setPreferences({...preferences, preferred_locations: e.target.value.split(',').map(s => s.trim())})}
                                            placeholder="e.g. New York, Remote, London"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:border-primary-500 transition-colors"
                                        />
                                    </div>

                                    {prefSuccess && <div className="p-3 bg-green-500/20 text-green-300 rounded-lg text-sm text-center font-medium">{prefSuccess}</div>}

                                    <div className="pt-4 flex justify-end">
                                        <button 
                                            onClick={savePreferences}
                                            disabled={prefSaving}
                                            className="btn-primary min-w-[120px]"
                                        >
                                            {prefSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
