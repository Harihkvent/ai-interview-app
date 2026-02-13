import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    getUserPreferences,
    updateUserPreferences,
    updateUserProfile,
    uploadProfilePhoto,
    getProfileResumes,
    getUserDashboard
} from '../api';
import { Info, HelpCircle } from 'lucide-react';
import { useConfirmDialog } from './ConfirmDialog';
import { ResumePicker } from './ResumePicker';
import { 
    User, 
    Mail, 
    MapPin, 
    Briefcase, 
    Trophy, 
    ShieldCheck, 
    Edit3, 
    Camera, 
    Settings, 
    FileText, 
    Zap,
    LogOut,
    ChevronRight,
    Star
} from 'lucide-react';

interface UserPreferences {
    target_role?: string;
    target_salary?: string;
    target_salary_inr?: string;
    target_salary_usd?: string;
    interested_roles?: string[];
    preferred_locations?: string[];
}

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    // Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ full_name: '', username: '', current_location: '' });
    const [profileLoading, setProfileLoading] = useState(false);
    const [resumeCount, setResumeCount] = useState(0);

    // Preferences State
    const [preferences, setPreferences] = useState<UserPreferences>({});
    const [prefLoading, setPrefLoading] = useState(false);
    const [prefSaving, setPrefSaving] = useState(false);

    // Profile Photo State
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Dashboard Stats State
    const [stats, setStats] = useState<any>(null);
    const [showRankInfo, setShowRankInfo] = useState(false);

    useEffect(() => {
        loadResumeStats();
        loadPreferences();
        loadDashboardStats();
        if (user) {
            setProfileForm({
                full_name: user.full_name || '',
                username: user.username || '',
                current_location: user.current_location || ''
            });
            // Set profile photo from backend if available
            if (user.profile_picture_url) {
                setProfilePhoto(user.profile_picture_url.startsWith('http') 
                    ? user.profile_picture_url 
                    : `http://localhost:8000${user.profile_picture_url}`);
            }
        }
    }, [user]);

    // ============ Resume Logic ============
    const loadResumeStats = async () => {
        try {
            const data = await getProfileResumes();
            setResumeCount(data.length);
        } catch (err) {
            console.error('Failed to load resume stats');
        }
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
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        try {
            const response = await uploadProfilePhoto(file);
            const photoUrl = response.photo_url.startsWith('http') 
                ? response.photo_url 
                : `http://localhost:8000${response.photo_url}`;
            setProfilePhoto(photoUrl);
            showToast('Profile photo updated', 'success');
        } catch (error) {
            console.error('Failed to upload photo', error);
            showToast('Failed to upload photo', 'error');
        }
    };

    const loadDashboardStats = async () => {
        try {
            const data = await getUserDashboard();
            setStats(data.stats);
        } catch (err) {
            console.error('Failed to load dashboard stats');
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
        try {
            await updateUserPreferences(preferences);
            showToast('Settings saved successfully!', 'success');
        } catch (err) {
            showToast('Failed to save settings', 'error');
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

    const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'settings'>('overview');

    return (
        <div className="min-h-screen bg-black p-6 relative">
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative max-w-7xl mx-auto space-y-8">
                {/* Header Card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                        {/* Avatar */}
                        <div className="relative group">
                            <div 
                                className="relative w-40 h-40 rounded-[2.5rem] bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer shadow-2xl transition-all group-hover:scale-[1.02]"
                                onClick={() => photoInputRef.current?.click()}
                            >
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-zinc-600" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <Camera className="w-6 h-6 text-white" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                                </div>
                            </div>
                            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            <div className="absolute -bottom-3 -right-3 px-4 py-2 bg-white text-black rounded-2xl shadow-2xl flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[10px] font-black tracking-widest">VERIFIED</span>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 text-center md:text-left space-y-6">
                            {isEditingProfile ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={profileForm.full_name} 
                                            onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                                            className="w-full px-5 py-4 bg-black/40 border border-zinc-700 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                                        <input 
                                            type="text" 
                                            value={profileForm.username} 
                                            onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                                            className="w-full px-5 py-4 bg-black/40 border border-zinc-700 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Current Location</label>
                                        <input 
                                            type="text" 
                                            value={profileForm.current_location} 
                                            onChange={e => setProfileForm({...profileForm, current_location: e.target.value})}
                                            className="w-full px-5 py-4 bg-black/40 border border-zinc-700 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                            placeholder="e.g. Bangalore, India"
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-2">
                                        <button type="submit" disabled={profileLoading} className="px-8 py-4 bg-white text-black rounded-2xl font-black text-sm hover:scale-105 transition-all">
                                            {profileLoading ? 'SYCHRONIZING...' : 'SAVE CHANGES'}
                                        </button>
                                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-8 py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm hover:bg-zinc-700 transition-all">CANCEL</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
                                            {user?.full_name || user?.username}
                                        </h1>
                                        <p className="text-zinc-500 font-medium text-lg mt-2 flex items-center justify-center md:justify-start gap-2">
                                            <Mail className="w-4 h-4" />
                                            {user?.email}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                        <div className="px-5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5" />
                                            {preferences.target_role || 'Generalist'}
                                        </div>
                                        <div className="px-5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {user?.current_location || 'Location Not Set'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isEditingProfile && (
                            <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="px-6 py-4 bg-white text-black rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-white/10"
                            >
                                <Edit3 className="w-4 h-4" />
                                EDIT PROFILE
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Cloud Resumes', value: resumeCount, sub: 'Active Files', icon: FileText, color: 'text-blue-400' },
                        { label: 'Global Ranking', value: stats?.global_rank || '42', sub: `Top ${stats?.percentile || '5'}%`, icon: Trophy, color: 'text-yellow-400', clickable: true },
                        { label: 'Skill Points', value: stats?.skill_points?.toLocaleString() || '1,280', sub: 'Master Level', icon: Zap, color: 'text-primary-400', clickable: true },
                        { label: 'Account Age', value: stats?.member_since ? `${Math.floor((new Date().getTime() - new Date(stats.member_since).getTime()) / (1000 * 60 * 60 * 24))}d` : '14d', sub: 'Loyalty Tier 1', icon: Star, color: 'text-purple-400' },
                    ].map((stat, i) => (
                        <div 
                            key={i} 
                            onClick={stat.clickable ? () => setShowRankInfo(true) : undefined}
                            className={`bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-8 backdrop-blur-3xl shadow-xl space-y-4 hover:bg-zinc-900/60 transition-all cursor-default ${stat.clickable ? 'cursor-pointer group/stat' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                {stat.clickable && <HelpCircle className="w-4 h-4 text-zinc-600 group-hover/stat:text-zinc-400 transition-colors" />}
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white tracking-tight">{stat.value}</div>
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="space-y-8 pb-12">
                    {/* Minimal Tabs */}
                    <div className="flex gap-4 border-b border-zinc-800 pb-2">
                        {[
                            { id: 'overview', label: 'Overview', icon: User },
                            { id: 'resumes', label: 'Resumes', icon: FileText },
                            { id: 'settings', label: 'Settings', icon: Settings },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-8 py-4 rounded-t-2xl font-black text-[10px] tracking-widest uppercase flex items-center gap-3 transition-all ${
                                    activeTab === tab.id 
                                        ? 'text-white border-b-2 border-white bg-white/5' 
                                        : 'text-zinc-600 hover:text-zinc-400'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Panels */}
                    <div className="animate-fadeIn">
                        {activeTab === 'overview' && (
                            <div className="grid lg:grid-cols-2 gap-8">
                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 space-y-8">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Contact Integrity</h3>
                                    <div className="space-y-6">
                                        {[
                                            { label: 'Full Access Identity', value: user?.full_name || 'Not Authenticated', icon: User },
                                            { label: 'Secure Communication', value: user?.email, icon: Mail },
                                            { label: 'Deployment Region', value: getLocationString(), icon: MapPin },
                                        ].map((field, i) => (
                                            <div key={i} className="group">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <field.icon className="w-3.5 h-3.5 text-zinc-600" />
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{field.label}</span>
                                                </div>
                                                <div className="px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-zinc-300 font-medium">
                                                    {field.value || 'DATA NOT FOUND'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 space-y-8">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Quick Teleport</h3>
                                    <div className="grid gap-4">
                                        {[
                                            { label: 'Mission Control', path: '/dashboard', color: 'bg-white text-black' },
                                            { label: 'Intelligence Hub', path: '/insights', color: 'bg-zinc-800 text-white' },
                                            { label: 'Skill Assessment', path: '/skill-tests', color: 'bg-zinc-800 text-white' }
                                        ].map((link, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => navigate(link.path)}
                                                className={`p-6 rounded-2xl font-black text-xs tracking-widest uppercase transition-all hover:scale-[1.02] flex items-center justify-between ${link.color}`}
                                            >
                                                {link.label}
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'resumes' && (
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-3xl">
                                <ResumePicker 
                                    onSelect={() => loadResumeStats()} 
                                    title="Experience Management"
                                    description="Centralize your professional footprints. Add, remove, or switch your primary experience data."
                                />
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-8">
                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 space-y-10">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Target Parameters</h3>
                                    
                                    {prefLoading ? (
                                        <div className="text-center py-20 text-zinc-600 font-black tracking-widest uppercase text-xs">SYNCHRONIZING...</div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Optimal Role</label>
                                                    <input 
                                                        type="text" 
                                                        value={preferences.target_role || ''}
                                                        onChange={e => setPreferences({...preferences, target_role: e.target.value})}
                                                        placeholder="e.g. Architect"
                                                        className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Interested Roles (Comma Separated)</label>
                                                    <input 
                                                        type="text" 
                                                        value={preferences.interested_roles?.join(', ') || ''}
                                                        onChange={e => setPreferences({...preferences, interested_roles: e.target.value.split(',').map(s => s.trim())})}
                                                        placeholder="e.g. Backend Engineer, Tech Lead"
                                                        className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Salary Expectation (INR)</label>
                                                    <input 
                                                        type="text" 
                                                        value={preferences.target_salary_inr || ''}
                                                        onChange={e => setPreferences({...preferences, target_salary_inr: e.target.value})}
                                                        placeholder="e.g. ₹20,00,000"
                                                        className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Salary Expectation (USD)</label>
                                                    <input 
                                                        type="text" 
                                                        value={preferences.target_salary_usd || ''}
                                                        onChange={e => setPreferences({...preferences, target_salary_usd: e.target.value})}
                                                        placeholder="e.g. $150,000"
                                                        className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Preferred Domains</label>
                                                <input 
                                                    type="text" 
                                                    value={preferences.preferred_locations?.join(', ') || ''}
                                                    onChange={e => setPreferences({...preferences, preferred_locations: e.target.value.split(',').map(s => s.trim())})}
                                                    placeholder="Remote, Worldwide"
                                                    className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white font-medium focus:border-white transition-all outline-none"
                                                />
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button 
                                                    onClick={savePreferences}
                                                    disabled={prefSaving}
                                                    className="px-8 py-5 bg-white text-black rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/5"
                                                >
                                                    {prefSaving ? 'SYCHRONIZING...' : 'SAVE CORE PARAMETERS'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="space-y-2 text-center md:text-left">
                                        <h3 className="text-xl font-black text-red-400 uppercase tracking-tighter">Decommission Session</h3>
                                        <p className="text-zinc-600 font-medium text-sm tracking-tight">Safely terminate your current intelligence session and clear active memory buffers.</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            confirm('TERMINATE SESSION', 'Are you sure you want to decommission the current session?', { confirmLabel: 'TERMINATE', variant: 'danger' })
                                            .then(ok => ok && logout());
                                        }}
                                        className="px-8 py-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-red-500/20 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        DECOMMISSION
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <ConfirmDialogComponent />
            
            {/* Rank Explanation Modal */}
            {showRankInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 max-w-2xl w-full space-y-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-primary-500/20 transition-all duration-700" />
                        
                        <div className="relative space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-primary-400" />
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Intelligence Mechanics</h2>
                            </div>

                            <div className="space-y-6 text-zinc-400 font-medium leading-relaxed">
                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-3">
                                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-primary-400" />
                                        Skill Points (SP)
                                    </h3>
                                    <p className="text-sm">Accumulated through tactical performance. Your score in interviews is weighted (10x) and combined with raw scores from Skill Assessments.</p>
                                    <div className="pt-2 flex items-center gap-3 text-[10px] font-black text-zinc-500">
                                        <span className="px-2 py-1 bg-black/40 rounded-lg border border-zinc-800 uppercase tracking-widest">Interview Score × 10</span>
                                        <span className="text-white">+</span>
                                        <span className="px-2 py-1 bg-black/40 rounded-lg border border-zinc-800 uppercase tracking-widest">Skill Test Score</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-3">
                                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                                        Global Ranking
                                    </h3>
                                    <p className="text-sm">Your relative position in the entire operative network. Operatives are sorted by total Skill Points. Percentile indicates your dominance over the network population.</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowRankInfo(false)}
                                className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-xs tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                            >
                                ACKNOWLEDGED
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
