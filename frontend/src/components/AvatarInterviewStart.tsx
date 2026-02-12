import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

interface Resume {
  id: string;
  name: string;
  filename: string;
}

export const AvatarInterviewStart: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>('');
  const [selectedRounds, setSelectedRounds] = useState<string[]>(['hr', 'technical']);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    try {
      const response = await fetch('http://localhost:8000/api/v1/profile/resumes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes || []);
        
        // Auto-select primary resume
        const primary = data.resumes?.find((r: any) => r.is_primary);
        if (primary) {
          setSelectedResume(primary.id);
        } else if (data.resumes?.length > 0) {
          setSelectedResume(data.resumes[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
    }
  }

  async function handleUploadResume() {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('http://localhost:8000/api/v1/profile/resumes?is_primary=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      // Reload resumes and auto-select the newly uploaded one
      await loadResumes();
      
      // The response might have resume or resume_id
      const resumeId = data.resume?.id || data.resume_id || data.id;
      if (resumeId) {
        setSelectedResume(resumeId);
      }
      
      setUploadFile(null);
      
      // Show success message
      showToast('Resume uploaded successfully!', 'success');
      
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      showToast(error.message || 'Failed to upload resume. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleStart() {
    if (!selectedResume) {
      showToast('Please select a resume first', 'warning');
      return;
    }

    if (selectedRounds.length === 0) {
      showToast('Please select at least one round', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/avatar-interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          resume_id: selectedResume,
          rounds: selectedRounds
        })
      });

      if (!response.ok) throw new Error('Failed to start interview');

      const data = await response.json();
      
      // Navigate to interview session
      navigate(`/avatar-interview/${data.session_id}`);
    } catch (error) {
      console.error('Error starting interview:', error);
      showToast('Failed to start interview. Please try again.', 'error');
      setLoading(false);
    }
  }

  function toggleRound(round: string) {
    if (selectedRounds.includes(round)) {
      setSelectedRounds(selectedRounds.filter(r => r !== round));
    } else {
      setSelectedRounds([...selectedRounds, round]);
    }
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fadeIn">
          <div className="text-8xl mb-6">🤖</div>
          <h1 className="text-5xl font-bold mb-4">AI Avatar Interview</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Experience a realistic interview with our AI avatar. Voice-powered conversation with intelligent follow-up questions.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="glass-card p-8 border border-white/10 space-y-8">
          {/* Resume Selection */}
          <div>
            <label className="block text-sm font-semibold text-primary-300 mb-3">
              Select Resume
            </label>
            {resumes.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
                  ⚠️ No resumes found. Please upload a resume to continue.
                </div>
                
                {/* Upload Section */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Upload Resume</h3>
                  
                  {!uploadFile ? (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-lg hover:border-primary-500/50 transition-all cursor-pointer group">
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📄</div>
                      <p className="text-sm text-gray-400 mb-2">Click to upload resume</p>
                      <p className="text-xs text-gray-500">PDF or DOCX (Max 5MB)</p>
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✓</span>
                          <div>
                            <p className="font-medium">{uploadFile.name}</p>
                            <p className="text-sm text-gray-400">{(uploadFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setUploadFile(null)} 
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <button
                        onClick={handleUploadResume}
                        disabled={uploading}
                        className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? 'Uploading...' : 'Upload Resume'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500/50 outline-none"
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id} className="bg-gray-900">
                    {resume.name || resume.filename}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Round Selection */}
          <div>
            <label className="block text-sm font-semibold text-primary-300 mb-3">
              Select Interview Rounds
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => toggleRound('hr')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  selectedRounds.includes('hr')
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="text-3xl mb-2">💼</div>
                <div className="font-bold mb-1">HR Round</div>
                <div className="text-xs text-gray-400">Behavioral & soft skills</div>
                {selectedRounds.includes('hr') && (
                  <div className="mt-2 text-primary-400">✓ Selected</div>
                )}
              </button>

              <button
                onClick={() => toggleRound('technical')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  selectedRounds.includes('technical')
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="text-3xl mb-2">👨‍💻</div>
                <div className="font-bold mb-1">Technical Round</div>
                <div className="text-xs text-gray-400">Skills & experience</div>
                {selectedRounds.includes('technical') && (
                  <div className="mt-2 text-primary-400">✓ Selected</div>
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-6">
            <h3 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <span>✨</span>
              What to Expect
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>3D AI avatar will ask you questions via voice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Respond naturally using your voice (auto-detected)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Intelligent follow-up questions based on your answers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Full conversation transcript provided</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Detailed performance report at the end</span>
              </li>
            </ul>
          </div>

          {/* Browser Check */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-xs text-yellow-400">
              💡 <strong>Best Experience:</strong> Use Google Chrome for optimal voice recognition and avatar rendering.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-4 px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={loading || !selectedResume || selectedRounds.length === 0}
              className="flex-[2] btn-primary py-4 px-6 rounded-xl font-bold text-lg shadow-2xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting Interview...' : 'Start AI Interview 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
