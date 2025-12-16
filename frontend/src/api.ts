import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

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

export const startRound = async (sessionId: number, roundType: string) => {
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

export const getNextRound = async (sessionId: number) => {
  const response = await api.get(`/next-round/${sessionId}`);
  return response.data;
};

export const downloadReport = async (sessionId: number) => {
  const response = await api.get(`/report/${sessionId}`, {
    responseType: "blob",
  });
  return response.data;
};

export const getSessionInfo = async (sessionId: number) => {
  const response = await api.get(`/session/${sessionId}`);
  return response.data;
};

// ============= Legacy Functions =============

export const startInterview = async () => {
  const response = await api.post("/start");
  return response.data;
};

export const sendMessage = async (sessionId: number, message: string) => {
  const response = await api.post("/chat", {
    session_id: sessionId,
    message: message,
  });
  return response.data;
};

export const getHistory = async (sessionId: number) => {
  const response = await api.get(`/history/${sessionId}`);
  return response.data;
};

export const endInterview = async (sessionId: number) => {
  const response = await api.post(`/end/${sessionId}`);
  return response.data;
};

export const switchRound = async (sessionId: number, roundType: string) => {
  const response = await api.post(
    `/switch-round/${sessionId}?round_type=${roundType}`
  );
  return response.data;
};

export const getRoundsStatus = async (sessionId: number) => {
  const response = await api.get(`/rounds-status/${sessionId}`);
  return response.data;
};

// ============= Job Matching & Roadmap Functions =============

export const analyzeResume = async (sessionId: string) => {
  const response = await api.post(`/analyze-resume/${sessionId}`);
  return response.data;
};

export const getJobMatches = async (sessionId: string) => {
  const response = await api.get(`/job-matches/${sessionId}`);
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
  return response.data;
};

export const getRoadmap = async (sessionId: string) => {
  const response = await api.get(`/roadmap/${sessionId}`);
  return response.data;
};
