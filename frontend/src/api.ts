import axios from "axios";
import { cacheService } from "./services/cacheService";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ============= New Interview Flow =============

export const uploadResume = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload-resume", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const startRound = async (sessionId: string | number, roundType: string) => {
  const response = await api.post(
    `/start-round/${sessionId}?round_type=${roundType}`
  );
  return response.data;
};

export const submitAnswer = async (
  questionId: number,
  answerText: string,
  timeTaken: number
) => {
  const response = await api.post("/submit-answer", {
    question_id: questionId,
    answer_text: answerText,
    time_taken_seconds: timeTaken,
  });
  return response.data;
};

export const getNextRound = async (sessionId: string | number) => {
  const response = await api.get(`/next-round/${sessionId}`);
  return response.data;
};

export const downloadReport = async (sessionId: string | number) => {
  const response = await api.get(`/report/${sessionId}`, {
    responseType: "blob",
  });
  return response.data;
};

export const getSessionInfo = async (sessionId: string | number) => {
  const response = await api.get(`/session/${sessionId}`);
  return response.data;
};

// ============= Legacy Functions =============

export const startInterview = async () => {
  const response = await api.post("/start");
  return response.data;
};

export const sendMessage = async (sessionId: string | number, message: string) => {
  const response = await api.post("/chat", {
    session_id: sessionId,
    message: message,
  });
  return response.data;
};

export const getHistory = async (sessionId: string | number) => {
  const response = await api.get(`/history/${sessionId}`);
  return response.data;
};

export const endInterview = async (sessionId: string | number) => {
  const response = await api.post(`/end/${sessionId}`);
  return response.data;
};

export const switchRound = async (sessionId: string | number, roundType: string) => {
  const response = await api.post(
    `/switch-round/${sessionId}?round_type=${roundType}`
  );
  return response.data;
};

export const getRoundsStatus = async (sessionId: string | number) => {
  const response = await api.get(`/rounds-status/${sessionId}`);
  return response.data;
};

// ============= Job Matching & Roadmap Functions =============

export const analyzeResume = async (sessionId: string) => {
  const response = await api.post(`/analyze-resume/${sessionId}`);
  return response.data;
};

export const getSavedResumes = async () => {
    const response = await api.get('/user/resumes');
    return response.data;
};

export const analyzeSavedResume = async (resumeId: string) => {
    const response = await api.post(`/analyze-saved-resume/${resumeId}`);
    return response.data;
};

export const analyzeResumeLive = async (
  sessionId: string,
  location: string = "India"
) => {
  const response = await api.post(
    `/analyze-resume-live/${sessionId}?location=${location}`
  );
  return response.data;
};

/**
 * Get job matches with caching
 * Returns cached results if available, otherwise fetches from backend
 */
export const getJobMatches = async (sessionId: string) => {
  // Check cache first
  const cached = cacheService.get<{ matches: any[] }>('jobMatches', sessionId);
  if (cached) {
    console.log('📦 Returning cached job matches for session:', sessionId);
    return cached;
  }

  // Fetch from backend
  const response = await api.get(`/job-matches/${sessionId}`);
  
  // Cache the result
  cacheService.set('jobMatches', sessionId, response.data);
  
  return response.data;
};

export const generateRoadmap = async (
  sessionId: string,
  targetJobTitle: string
) => {
  const response = await api.post("/generate-roadmap", {
    session_id: sessionId,
    target_job_title: targetJobTitle,
  });
  
  // Cache the roadmap
  const roadmapKey = `${sessionId}_${targetJobTitle}`;
  cacheService.set('roadmap', roadmapKey, response.data);
  
  return response.data;
};

/**
 * Get roadmap with caching
 */
export const getRoadmap = async (sessionId: string) => {
  // Check cache first
  const cached = cacheService.get<any>('roadmap', sessionId);
  if (cached) {
    console.log('📦 Returning cached roadmap for session:', sessionId);
    return cached;
  }

  // Fetch from backend
  const response = await api.get(`/roadmap/${sessionId}`);
  
  // Cache the result
  cacheService.set('roadmap', sessionId, response.data);
  
  return response.data;
};

// ============= User Management Functions =============

export const saveRoadmap = async (roadmapId: string) => {
  const response = await api.post(`/user/roadmaps/${roadmapId}/save`);
  return response.data;
};

export const deleteRoadmap = async (roadmapId: string) => {
  const response = await api.delete(`/user/roadmaps/${roadmapId}`);
  return response.data;
};

export const getSavedRoadmaps = async () => {
  const response = await api.get("/user/roadmaps?saved_only=true");
  return response.data;
};

export const getAllRoadmaps = async () => {
  const response = await api.get("/user/roadmaps");
  return response.data;
};

export const getUserDashboard = async () => {
  const response = await api.get("/user/dashboard");
  return response.data;
};

export const getUserInterviews = async () => {
  const response = await api.get("/user/interviews");
  return response.data;
};

export const getRoadmapById = async (roadmapId: string) => {
  const response = await api.get(`/user/roadmaps/${roadmapId}`);
  return response.data;
};

// ============= New Independent Flow Functions =============

export const getActiveSession = async () => {
  const response = await api.get("/active-session");
  return response.data;
};

export const startInterviewFromRole = async (targetJobTitle: string) => {
  const response = await api.post("/start-interview-from-role", {
    target_job_title: targetJobTitle,
  });
  return response.data;
};

/**
 * Generate questions with caching
 * Caches based on resume text hash + round type to avoid regeneration
 */
export const generateQuestionsOnly = async (
  resumeText: string,
  roundType: string,
  numQuestions: number = 5
): Promise<{ questions: string[] }> => {
  // Create a cache key based on resume text hash and round type
  const cacheKey = `${roundType}_${numQuestions}`;
  
  // Check cache first
  const cached = cacheService.get<{ questions: string[] }>('questions', cacheKey);
  if (cached && cached.questions) {
    console.log('📦 Returning cached questions for round:', roundType);
    return cached;
  }

  // Fetch from backend
  const response = await api.post("/generate-questions-only", {
    resume_text: resumeText,
    round_type: roundType,
    num_questions: numQuestions,
  });
  
  // Cache the result
  cacheService.set('questions', cacheKey, response.data);
  
  return response.data;
};

/**
 * Extract text with caching
 * Caches based on file name to avoid re-extraction
 */
export const extractText = async (file: File) => {
  // Create cache key based on file name and size (as simple identifier)
  const cacheKey = `${file.name}_${file.size}`;
  
  // Check cache first
  const cached = cacheService.get<{ text: string }>('resumeText', cacheKey);
  if (cached) {
    console.log('📦 Returning cached resume text for file:', file.name);
    return cached;
  }

  // Fetch from backend
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/extract-text", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  
  // Cache the result
  cacheService.set('resumeText', cacheKey, response.data);
  
  return response.data;
};

export const deleteInterview = async (sessionId: string | number) => {
  const response = await api.delete(`/user/interviews/${sessionId}`);
  return response.data;
};
