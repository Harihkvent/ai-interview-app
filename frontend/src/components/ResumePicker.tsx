import React, { useState, useEffect, useRef } from 'react';
import { 
    getProfileResumes, 
    uploadProfileResume, 
    setActiveProfileResume 
} from '../api';
import { FileText, Upload, Check, Trash2, AlertCircle, Loader2, Plus } from 'lucide-react';

interface Resume {
    id: string;
    name: string;
    filename: string;
    is_primary: boolean;
    uploaded_at: string;
}

interface ResumePickerProps {
    onSelect: (resumeId: string) => void;
    selectedId?: string;
    title?: string;
    description?: string;
}

export const ResumePicker: React.FC<ResumePickerProps> = ({ 
    onSelect, 
    selectedId,
    title = "Select Resume",
    description = "Choose a resume from your vault or upload a new one to proceed."
}) => {
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadResumes();
    }, []);

    const loadResumes = async () => {
        try {
            setLoading(true);
            const data = await getProfileResumes();
            setResumes(data);
            
            // If no resume is selected but we have a primary one, auto-select it
            if (!selectedId && data.length > 0) {
                const primary = data.find((r: Resume) => r.is_primary) || data[0];
                onSelect(primary.id);
            }
        } catch (err) {
            setError('Failed to load resumes from your vault.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file: File) => {
        if (!file) return;
        try {
            setUploading(true);
            setError(null);
            const result = await uploadProfileResume(file);
            
            if (result.is_duplicate) {
                console.log("Deduplication: Using existing resume");
            }
            
            await loadResumes();
            onSelect(result.id);
        } catch (err) {
            setError('Failed to upload resume. Please try again.');
        } finally {
            setUploading(false);
        }
    };

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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm">{description}</p>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* List of Resumes */}
            <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {resumes.map((resume) => (
                    <div 
                        key={resume.id}
                        onClick={() => onSelect(resume.id)}
                        className={`
                            group relative p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between
                            ${selectedId === resume.id 
                                ? 'bg-zinc-800 border-white ring-1 ring-white shadow-lg' 
                                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}
                        `}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`
                                p-3 rounded-xl transition-colors
                                ${selectedId === resume.id ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 group-hover:text-white'}
                            `}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-0.5 max-w-[200px] truncate">
                                    {resume.filename}
                                </h4>
                                <p className="text-xs text-zinc-500">
                                    {new Date(resume.uploaded_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {selectedId === resume.id && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-white/10 rounded text-white tracking-wider">SELECTED</span>
                                <Check className="w-5 h-5 text-white" />
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading State */}
                {loading && resumes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-sm">Accessing your vault...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && resumes.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-2xl">
                        <p className="text-zinc-500 text-sm">Your vault is empty</p>
                    </div>
                )}
            </div>

            {/* Upload Zone */}
            <div 
                className={`
                    relative bg-zinc-950 border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer
                    ${dragActive ? 'border-white bg-zinc-900' : 'border-zinc-800 hover:border-zinc-700'}
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
                
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {uploading ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5 text-zinc-400" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">
                            {uploading ? 'Uploading...' : 'Add New Resume'}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                            PDF, DOCX • Drag & drop supported
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
