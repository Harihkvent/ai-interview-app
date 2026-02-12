import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
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
    const { showToast } = useToast();
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
        loadResumes(); // Load resumes initially for stats
        loadPreferences();
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
    }, [user]);

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
            showToast('Please upload an image file (JPG, PNG)', 'warning');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image size should be less than 2MB', 'warning');
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

    // Helper to get joined locations or default
    const getLocationString = () => {
        if (preferences.preferred_locations && preferences.preferred_locations.length > 0) {
            return preferences.preferred_locations.join(', ');
        }
        return 'Not set';
    };

    return (
        <div className="min-h-screen bg-black p-6 relative overflow-hidden">
             {/* Animated background */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '1.5s' }} />
            </div>

            <div className="relative max-w-7xl mx-auto space-y-6">
                
                {/* Header Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl" />
                    
                    <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
                            <div 
                                className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-white via-gray-200 to-gray-400 flex items-center justify-center overflow-hidden cursor-pointer shadow-2xl group-hover:scale-105 transition-transform"
                                onMouseEnter={() => setPhotoHover(true)}
                                onMouseLeave={() => setPhotoHover(false)}
                                onClick={() => photoInputRef.current?.click()}
                            >
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-black">
                                        {user?.username?.substring(0, 2).toUpperCase() || 'U'}
                                    </span>
                                )}

                                {/* Hover Overlay */}
                                {photoHover && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 transition-opacity">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />

                            {/* Status Indicator */}
                            <div className="absolute -bottom-2 -right-2 flex items-center gap-2 px-3 py-1.5 bg-green-500 rounded-xl shadow-lg">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span className="text-xs font-bold text-white">ACTIVE</span>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 text-center md:text-left">
                            {isEditingProfile ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                                    <input 
                                        type="text" 
                                        value={profileForm.full_name} 
                                        onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                                        placeholder="Full Name"
                                        className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:border-white focus:outline-none"
                                    />
                                    <input 
                                        type="text" 
                                        value={profileForm.username} 
                                        onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                                        placeholder="Username"
                                        className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:border-white focus:outline-none"
                                    />
                                    <div className="flex gap-2 justify-center md:justify-start">
                                        <button type="submit" disabled={profileLoading} className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200">
                                            {profileLoading ? 'Saving...' : 'Save'}
                                        </button>
                                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <h1 className="text-4xl font-bold mb-2 text-white">
                                        {user?.full_name || user?.username}
                                    </h1>
                                    <p className="text-gray-400 text-lg mb-4">{user?.email}</p>
                                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                        <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-semibold flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {preferences.target_role || 'No Role Set'}
                                        </span>
                                        <span className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 font-semibold flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Verified Member
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {!isEditingProfile && (
                            <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Resumes', value: resumes.length.toString(), change: 'Active', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'blue' },
                        { label: 'Member Since', value: user && (user as any).created_at ? new Date((user as any).created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '2025', change: 'Verified', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'green' },
                        { label: 'Target Salary', value: preferences.target_salary || '-', change: 'Goal', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'purple' },
                        { label: 'Location', value: getLocationString().split(',')[0] || '-', change: 'Preferred', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', color: 'orange' },
                    ].map((stat, i) => (
                        <div key={i} className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all hover:scale-105">
                            <div className={`inline-flex p-3 rounded-xl mb-4 ${
                                stat.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                                stat.color === 'green' ? 'bg-green-500/10 text-green-400' :
                                stat.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                                'bg-orange-500/10 text-orange-400'
                            }`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                                </svg>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1 truncate">{stat.value}</div>
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-400">{stat.label}</div>
                                <div className={`text-xs font-semibold ${
                                    stat.color === 'blue' ? 'text-blue-400' :
                                    stat.color === 'green' ? 'text-green-400' :
                                    stat.color === 'purple' ? 'text-purple-400' :
                                    'text-orange-400'
                                }`}>{stat.change}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl w-fit">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'resumes', label: 'Resumes' },
                        { id: 'settings', label: 'Settings' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-2 rounded-lg font-medium transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-white text-black shadow' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT */}
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Personal Info */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Personal Information
                            </h2>
                            <div className="space-y-5">
                                {[
                                    { label: 'Full Name', value: user?.full_name || user?.username, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                                    { label: 'Email', value: user?.email, icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                                    { label: 'Location', value: getLocationString(), icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
                                ].map((field, i) => (
                                    <div key={i} className="group">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={field.icon} />
                                            </svg>
                                            {field.label}
                                        </label>
                                        <div className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white">
                                            {field.value || 'Not set'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity / Quick Stats */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                             <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Recent Activity
                            </h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-black border border-zinc-800 rounded-xl flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                     </div>
                                     <div>
                                         <div className="text-white font-medium">Resume Status</div>
                                         <div className="text-sm text-gray-400">
                                            {resumes.length > 0 ? `${resumes.length} resumes uploaded` : 'No resumes uploaded'}
                                         </div>
                                     </div>
                                </div>
                                <div className="p-4 bg-black border border-zinc-800 rounded-xl flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                     </div>
                                     <div>
                                         <div className="text-white font-medium">Profile Completion</div>
                                         <div className="text-sm text-gray-400">
                                            {user?.full_name && preferences.target_role ? 'Complete' : 'In Progress'}
                                         </div>
                                     </div>
                                </div>
                            </div>
                             
                             <div className="mt-8 pt-8 border-t border-zinc-800">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => navigate('/dashboard')} className="p-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                        Dashboard
                                    </button>
                                     <button onClick={() => navigate('/analytics')} className="p-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors">
                                        Analytics
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* RESUMES TAB */}
                {activeTab === 'resumes' && (
                    <div className="space-y-6">
                        {/* Upload Area */}
                        <div 
                            className={`
                                bg-zinc-900 border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer group
                                ${dragActive ? 'border-white bg-zinc-800' : 'border-zinc-800 hover:border-zinc-700'}
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
                                <div className="w-20 h-20 mx-auto rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {uploading ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        )}
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white mb-2">
                                        {uploading ? 'Uploading...' : dragActive ? 'Drop your resume here' : 'Upload Resume'}
                                    </p>
                                    <p className="text-gray-400">
                                        Drag & drop or click to browse • PDF, DOCX supported
                                    </p>
                                </div>
                            </div>
                        </div>

                        {resumeError && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                                {resumeError}
                            </div>
                        )}

                        {/* Resume Cards */}
                        <div className="grid gap-4">
                            {loadingResumes ? (
                                <div className="text-center py-12 text-gray-500">Loading resumes...</div>
                            ) : resumes.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">No resumes uploaded yet</div>
                            ) : (
                                resumes.map(resume => (
                                    <div 
                                        key={resume.id}
                                        onClick={() => handleSetActive(resume.id)}
                                        className={`
                                            bg-zinc-900 border rounded-2xl p-6 cursor-pointer transition-all hover:border-zinc-700
                                            ${resume.is_primary ? 'border-white bg-zinc-800' : 'border-zinc-800'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-4 rounded-xl bg-black">
                                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="text-lg font-bold text-white">
                                                            {resume.filename}
                                                        </h3>
                                                        {resume.is_primary && (
                                                            <span className="px-2 py-0.5 rounded-lg bg-white text-black text-xs font-bold">Active</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-400">
                                                        Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => handleDelete(resume.id, e)} 
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
                    <div className="space-y-6">
                        {/* Preferences */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                            <h2 className="text-2xl font-bold text-white mb-6">Career Preferences</h2>
                            
                            {prefLoading ? (
                                <div className="text-center py-12 text-gray-500">Loading settings...</div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400">Target Role</label>
                                            <input 
                                                type="text" 
                                                value={preferences.target_role || ''}
                                                onChange={e => setPreferences({...preferences, target_role: e.target.value})}
                                                placeholder="e.g. Senior Frontend Engineer"
                                                className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400">Target Salary Range</label>
                                            <input 
                                                type="text" 
                                                value={preferences.target_salary || ''}
                                                onChange={e => setPreferences({...preferences, target_salary: e.target.value})}
                                                placeholder="e.g. $120k - $160k"
                                                className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Preferred Locations</label>
                                        <input 
                                            type="text" 
                                            value={preferences.preferred_locations?.join(', ') || ''}
                                            onChange={e => setPreferences({...preferences, preferred_locations: e.target.value.split(',').map(s => s.trim())})}
                                            placeholder="e.g. New York, Remote, London"
                                            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white focus:border-white focus:outline-none"
                                        />
                                    </div>

                                    {prefSuccess && (
                                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-center">
                                            {prefSuccess}
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <button 
                                            onClick={savePreferences}
                                            disabled={prefSaving}
                                            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                                        >
                                            {prefSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                         {/* Danger Zone */}
                         <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
                                    <p className="text-gray-400 text-sm">Sign out of your account</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-6 bg-black/50 border border-red-500/20 rounded-2xl">
                                <div>
                                    <div className="font-semibold text-white mb-1">Sign Out</div>
                                    <div className="text-sm text-gray-400">End your current session</div>
                                </div>
                                <button 
                                    onClick={logout}
                                    className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/20 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ConfirmDialogComponent />
        </div>
    );
};
