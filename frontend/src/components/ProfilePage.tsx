import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useConfirmDialog } from './ConfirmDialog';

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
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
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

    // Profile Photo State
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [photoHover, setPhotoHover] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTab === 'resumes') loadResumes();
        if (activeTab === 'settings') loadPreferences();
        if (user) {
            setProfileForm({
                full_name: user.full_name || '',
                username: user.username || ''
            });
        }
        // Load profile photo from localStorage
        const savedPhoto = localStorage.getItem(`profile_photo_${user?.email}`);
        if (savedPhoto) {
            setProfilePhoto(savedPhoto);
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
        const confirmed = await confirm(
            'Delete Resume',
            'Are you sure you want to delete this resume? This action cannot be undone.',
            { confirmLabel: 'Delete', variant: 'danger' }
        );
        if (!confirmed) return;
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
            window.location.reload(); 
        } catch (error) {
            console.error('Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    // ============ Profile Photo Logic ============
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG)');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size should be less than 2MB');
            return;
        }

        // Read and store as base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setProfilePhoto(base64String);
            // Store in localStorage
            if (user?.email) {
                localStorage.setItem(`profile_photo_${user.email}`, base64String);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = async () => {
        const confirmed = await confirm(
            'Remove Profile Photo',
            'Are you sure you want to remove your profile photo?',
            { confirmLabel: 'Remove', variant: 'warning' }
        );
        if (!confirmed) return;

        setProfilePhoto(null);
        if (user?.email) {
            localStorage.removeItem(`profile_photo_${user.email}`);
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
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />
                <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '2s' }} />
            </div>

            <div className="relative max-w-7xl mx-auto p-6 pb-24 space-y-6 animate-fade-in">
                
                {/* Enhanced Header */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* Avatar with photo upload */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-300 to-gray-400 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                            <div 
                                className="relative w-32 h-32 rounded-full bg-gradient-to-br from-white to-gray-300 flex items-center justify-center text-5xl font-bold shadow-xl overflow-hidden cursor-pointer"
                                onMouseEnter={() => setPhotoHover(true)}
                                onMouseLeave={() => setPhotoHover(false)}
                                onClick={() => photoInputRef.current?.click()}
                            >
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-black">
                                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                )}
                                
                                {/* Hover Overlay */}
                                {photoHover && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 transition-opacity">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-xs text-white font-medium">
                                            {profilePhoto ? 'Change Photo' : 'Upload Photo'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Hidden file input */}
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                            
                            {/* Remove photo button */}
                            {profilePhoto && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemovePhoto();
                                    }}
                                    className="absolute -bottom-2 -right-2 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                                    title="Remove photo"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 text-center lg:text-left">
                            {isEditingProfile ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md mx-auto lg:mx-0">
                                    <input 
                                        type="text" 
                                        value={profileForm.full_name} 
                                        onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                                        placeholder="Full Name"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
                                    />
                                    <input 
                                        type="text" 
                                        value={profileForm.username} 
                                        onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                                        placeholder="Username"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
                                    />
                                    <div className="flex gap-3">
                                        <button type="submit" disabled={profileLoading} className="flex-1 px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50">
                                            {profileLoading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-all">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
                                        <h1 className="text-4xl font-bold text-white">
                                            {user?.full_name || user?.username}
                                        </h1>
                                        <button 
                                            onClick={() => setIsEditingProfile(true)} 
                                            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-lg mb-4 text-gray-400">{user?.email}</p>
                                    <div className="flex gap-3 flex-wrap justify-center lg:justify-start">
                                        <span className="px-4 py-1.5 bg-gradient-to-r from-white to-gray-300 text-black rounded-full text-sm font-bold flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            PRO MEMBER
                                        </span>
                                        <span className="px-4 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-sm font-bold">
                                            ✓ Verified
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sign Out Button */}
                        <button 
                            onClick={logout}
                            className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-all whitespace-nowrap"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                            </span>
                        </button>
                    </div>
                </div>

                {/* Enhanced Tabs */}
                <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-2">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'overview', label: 'Overview', icon: '📊' },
                            { id: 'resumes', label: 'Resumes', icon: '📄' },
                            { id: 'settings', label: 'Settings', icon: '⚙️' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-4 rounded-3xl font-semibold transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white text-black'
                                        : 'text-gray-400 hover:bg-zinc-800 hover:text-white'
                                }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span className="text-xl">{tab.icon}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-6 group cursor-pointer hover:border-zinc-700 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Resumes</div>
                                        <div className="text-3xl group-hover:scale-110 transition-transform">📄</div>
                                    </div>
                                    <div className="text-5xl font-bold text-white mb-2">{resumes.length || 0}</div>
                                    <div className="text-sm text-green-400">
                                        {resumes.filter(r => r.is_primary).length > 0 ? '✓ Active resume set' : 'Upload your first resume'}
                                    </div>
                                </div>

                                <div className="backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-6 group cursor-pointer hover:border-zinc-700 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Member Since</div>
                                        <div className="text-3xl group-hover:scale-110 transition-transform">🎯</div>
                                    </div>
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {(user as any)?.created_at ? new Date((user as any).created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Welcome aboard! 🚀
                                    </div>
                                </div>

                                <div className="stat-card group cursor-pointer">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="stat-card-title">Last Active</div>
                                        <div className="text-3xl group-hover:scale-110 transition-transform">⚡</div>
                                    </div>
                                    <div className="stat-card-value text-2xl">
                                        {(user as any)?.last_login ? new Date((user as any).last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                                    </div>
                                    <div className="stat-card-change" style={{ color: 'var(--success)' }}>
                                        Keep up the momentum!
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="card card-hover p-8 text-center cursor-pointer group" onClick={() => navigate('/dashboard')}>
                                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🚀</div>
                                    <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Start Interview</h3>
                                    <p className="mb-6" style={{ color: 'var(--text-tertiary)' }}>Ready to practice? Launch a new session now.</p>
                                    <button className="btn-primary w-full">Go to Dashboard</button>
                                </div>

                                <div className="card card-hover p-8 text-center cursor-pointer group" onClick={() => navigate('/analytics')}>
                                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📊</div>
                                    <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>View Analytics</h3>
                                    <p className="mb-6" style={{ color: 'var(--text-tertiary)' }}>Track your progress and performance metrics.</p>
                                    <button className="btn-primary w-full">View Analytics</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RESUMES TAB */}
                    {activeTab === 'resumes' && (
                        <div className="space-y-6">
                            {/* Enhanced Upload Area */}
                            <div 
                                className={`
                                    card p-12 text-center transition-all cursor-pointer group
                                    ${dragActive ? 'border-primary-400 bg-[var(--accent-primary-light)] scale-105' : 'border-dashed hover:border-[var(--accent-primary)]'}
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
                                <div className="space-y-4">
                                    <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
                                        {uploading ? '⏳' : dragActive ? '📥' : '☁️'}
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                            {uploading ? 'Uploading...' : dragActive ? 'Drop your resume here' : 'Upload Resume'}
                                        </p>
                                        <p style={{ color: 'var(--text-tertiary)' }}>
                                            Drag & drop or click to browse • PDF, DOCX supported
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {resumeError && (
                                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)' }}>
                                    {resumeError}
                                </div>
                            )}

                            {/* Resume Cards */}
                            <div className="grid gap-4">
                                {loadingResumes ? (
                                    <div className="card p-8 text-center">
                                        <div className="animate-pulse-subtle" style={{ color: 'var(--text-tertiary)' }}>Loading resumes...</div>
                                    </div>
                                ) : resumes.length === 0 ? (
                                    <div className="card p-12 text-center">
                                        <div className="text-6xl mb-4 opacity-50">📭</div>
                                        <p className="text-xl" style={{ color: 'var(--text-tertiary)' }}>No resumes uploaded yet</p>
                                    </div>
                                ) : (
                                    resumes.map(resume => (
                                        <div 
                                            key={resume.id}
                                            onClick={() => handleSetActive(resume.id)}
                                            className={`
                                                card card-hover p-6 cursor-pointer transition-all
                                                ${resume.is_primary ? 'border-primary-500 bg-[var(--accent-primary-light)]' : ''}
                                            `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className={`p-4 rounded-xl ${resume.is_primary ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)]'}`}>
                                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                                {resume.filename}
                                                            </h3>
                                                            {resume.is_primary && (
                                                                <span className="badge badge-success text-xs">Active</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                                            Uploaded {new Date(resume.uploaded_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => handleDelete(resume.id, e)} 
                                                    className="p-3 rounded-lg transition-colors hover:bg-[var(--error-light)]"
                                                    style={{ color: 'var(--error)' }}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="card p-8">
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Career Preferences</h3>
                                <p style={{ color: 'var(--text-tertiary)' }}>Customize your career goals to get better job matches.</p>
                            </div>

                            {prefLoading ? (
                                <div className="text-center py-12 animate-pulse-subtle" style={{ color: 'var(--text-tertiary)' }}>
                                    Loading settings...
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                                Target Role
                                            </label>
                                            <input 
                                                type="text" 
                                                value={preferences.target_role || ''}
                                                onChange={e => setPreferences({...preferences, target_role: e.target.value})}
                                                placeholder="e.g. Senior Frontend Engineer"
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                                Target Salary Range
                                            </label>
                                            <input 
                                                type="text" 
                                                value={preferences.target_salary || ''}
                                                onChange={e => setPreferences({...preferences, target_salary: e.target.value})}
                                                placeholder="e.g. $120k - $160k"
                                                className="input-field w-full"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                            Preferred Locations
                                        </label>
                                        <input 
                                            type="text" 
                                            value={preferences.preferred_locations?.join(', ') || ''}
                                            onChange={e => setPreferences({...preferences, preferred_locations: e.target.value.split(',').map(s => s.trim())})}
                                            placeholder="e.g. New York, Remote, London"
                                            className="input-field w-full"
                                        />
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Separate multiple locations with commas</p>
                                    </div>

                                    {prefSuccess && (
                                        <div className="p-4 rounded-lg text-center font-semibold animate-fade-in" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                                            {prefSuccess}
                                        </div>
                                    )}

                                    <div className="pt-6 flex justify-end">
                                        <button 
                                            onClick={savePreferences}
                                            disabled={prefSaving}
                                            className="btn-primary min-w-[160px]"
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
            <ConfirmDialogComponent />
        </div>
    );
};
