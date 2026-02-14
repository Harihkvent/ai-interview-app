import axios from "axios";
import { cacheService } from "./services/cacheService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(
    `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
    config.data || ""
  );
  return config;
});

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API Response] ${response.config.method?.toUpperCase()} ${
        response.config.url
      } - ${response.status}`
    );
    return response;
  },
  (error) => {
    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

// Helper to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ============= Avatar Interview API =============

export const startAvatarInterview = async (resumeId: string, rounds: string[]) => {
  const response = await api.post('/api/avatar-interview/start', {
    resume_id: resumeId,
    rounds: rounds
  });
  return response.data;
};

export const getAvatarSession = async (sessionId: string) => {
  const response = await api.get(`/api/avatar-interview/session/${sessionId}`);
  return response.data;
};

export const submitAvatarAnswer = async (
  sessionId: string,
  questionId: string,
  answerText: string,
  timeTaken: number,
  isVoice: boolean = true
) => {
  const response = await api.post('/api/avatar-interview/submit-answer', {
    session_id: sessionId,
    question_id: questionId,
    answer_text: answerText,
    time_taken_seconds: timeTaken,
    is_voice: isVoice
  });
  return response.data;
};

export const startNextAvatarRound = async (sessionId: string) => {
  const response = await api.post(`/api/avatar-interview/next-round?session_id=${sessionId}`);
  return response.data;
};

export const pauseAvatarSession = async (sessionId: string) => {
  const response = await api.post(`/api/avatar-interview/pause?session_id=${sessionId}`);
  return response.data;
};

export const resumeAvatarSession = async (sessionId: string) => {
  const response = await api.post(`/api/avatar-interview/resume?session_id=${sessionId}`);
  return response.data;
};

export const finalizeAvatarInterview = async (sessionId: string) => {
  const response = await api.post(`/api/avatar-interview/finalize?session_id=${sessionId}`);
  return response.data;
};

export const getAvatarInterviewHistory = async () => {
  const response = await api.get('/api/avatar-interview/history');
  return response.data;
};

// ... (rest of the API functions remain the same)
