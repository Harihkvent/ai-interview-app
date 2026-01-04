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

// ============= New Interview Flow =============

export const uploadResume = async (
  file: File,
  sessionType: string = "interview",
  jobTitle: string = "General Interview"
) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/upload-resume?session_type=${sessionType}&job_title=${encodeURIComponent(
      jobTitle
    )}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const startRound = async (
  sessionId: string | number,
  roundType: string
) => {
  const response = await api.post("/api/interview/start-round", {
    session_id: sessionId.toString(),
    round_type: roundType,
  });
  return response.data;
};

export const submitAnswer = async (
  questionId: string,
  answerText: string,
  timeTaken: number,
  status: string = "submitted"
) => {
  const response = await api.post("/submit-answer", {
    question_id: questionId,
    answer_text: answerText,
    time_taken_seconds: timeTaken,
    status: status,
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

export const sendMessage = async (
  sessionId: string | number,
  message: string
) => {
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

export const switchRound = async (
  sessionId: string | number,
  roundType: string
) => {
  const response = await api.post("/api/interview/switch-round", {
    session_id: sessionId.toString(),
    round_type: roundType,
  });
  return response.data;
};

export const getRoundsStatus = async (sessionId: string | number) => {
  const response = await api.get(`/rounds-status/${sessionId}`);
  return response.data;
};

// ============= Unified Session & Navigation =============

export const getSessionState = async (sessionId: string) => {
  const response = await api.get(`/session/state/${sessionId}`);
  return response.data;
};

export const pauseSession = async (sessionId: string) => {
  const response = await api.post(`/session/pause/${sessionId}`);
  return response.data;
};

export const jumpQuestion = async (sessionId: string, questionId: string) => {
  const response = await api.post("/session/jump", {
    session_id: sessionId,
    question_id: questionId,
  });
  return response.data;
};

export const finalizeInterview = async (sessionId: string) => {
  const response = await api.post(`/session/end/${sessionId}`);
  return response.data;
};

// ============= Job Matching & Roadmap Functions =============

export const analyzeResume = async (sessionId: string) => {
  const response = await api.post(`/analyze-resume/${sessionId}`);
  return response.data;
};

export const getSavedResumes = async () => {
  const response = await api.get("/user/resumes");
  return response.data;
};

export const analyzeSavedResume = async (
  resumeId: string,
  sessionType: string = "interview",
  jobTitle: string = "General Interview"
) => {
  const response = await api.post(
    `/analyze-saved-resume/${resumeId}?session_type=${sessionType}&job_title=${encodeURIComponent(
      jobTitle
    )}`
  );
  return response.data;
};

export const analyzeResumeLive = async (
  sessionId: string,
  location: string = "India"
) => {
  // Clear job matches cache for this session to ensure fresh results are shown later
  cacheService.clear("jobMatches", sessionId);

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
  const cached = cacheService.get<{ matches?: any[]; top_matches?: any[] }>(
    "jobMatches",
    sessionId
  );

  // Robust check: Ensure cached matches have IDs. If not, bypass cache.
  // Stale cache from previous versions might lack 'id' or '_id'.
  const matches = cached?.matches || cached?.top_matches || [];
  const hasIds = matches.length > 0 && matches.every((m) => m.id || m._id);

  if (cached && hasIds) {
    console.log("📦 Returning cached job matches for session:", sessionId);
    return cached;
  }

  if (cached && !hasIds) {
    console.warn(
      "⚠️ Stale cache detected (missing IDs), bypassing cache for session:",
      sessionId
    );
  }

  // Fetch from backend
  const response = await api.get(`/job-matches/${sessionId}`);

  // Cache the result
  cacheService.set("jobMatches", sessionId, response.data);

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
  cacheService.set("roadmap", roadmapKey, response.data);

  return response.data;
};

/**
 * Get roadmap with caching
 */
export const getRoadmap = async (sessionId: string) => {
  // Check cache first
  const cached = cacheService.get<any>("roadmap", sessionId);
  if (cached) {
    console.log("📦 Returning cached roadmap for session:", sessionId);
    return cached;
  }

  // Fetch from backend
  const response = await api.get(`/roadmap/${sessionId}`);

  // Cache the result
  cacheService.set("roadmap", sessionId, response.data);

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

export const getActiveSession = async (sessionType: string = "interview") => {
  const response = await api.get(`/active-session?session_type=${sessionType}`);
  return response.data;
};

export const prepareForJob = async (jobId: string) => {
  const response = await api.post(`/user/jobs/${jobId}/prepare`);
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
  numQuestions: number = 5,
  jobTitle: string = "General"
): Promise<{ questions: any[] }> => {
  // Create a cache key based on resume text hash, round type, and job title
  // Simple hash function for client-side caching
  const textHash = resumeText.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  // v3 prefix to invalidate old cache and include jobTitle in key
  const cacheKey = `v3_${roundType}_${jobTitle}_${textHash}`;

  // Check cache first
  const cached = cacheService.get<{ questions: any[] }>("questions", cacheKey);
  if (cached && cached.questions) {
    console.log("📦 Returning cached questions for round:", roundType);
    return cached;
  }

  // Fetch from backend
  const response = await api.post("/generate-questions-only", {
    resume_text: resumeText,
    round_type: roundType,
    num_questions: numQuestions,
    job_title: jobTitle,
  });

  // Cache the result
  cacheService.set("questions", cacheKey, response.data);

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
  const cached = cacheService.get<{ text: string }>("resumeText", cacheKey);
  if (cached) {
    console.log("📦 Returning cached resume text for file:", file.name);
    return cached;
  }

  // Fetch from backend
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/extract-text", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // Cache the result
  cacheService.set("resumeText", cacheKey, response.data);

  return response.data;
};

export const deleteInterview = async (sessionId: string | number) => {
  const response = await api.delete(`/user/interviews/${sessionId}`);
  return response.data;
};

export const saveGeneratedSession = async (
  resumeText: string,
  resumeFilename: string,
  roundType: string,
  questions: any[]
) => {
  const response = await api.post("/save-generated-session", {
    resume_text: resumeText,
    resume_filename: resumeFilename,
    round_type: roundType,
    questions: questions,
  });
  return response.data;
};
export const saveJob = async (jobDbId: string) => {
  if (!jobDbId || jobDbId === "undefined") {
    console.error("❌ Cannot save job: jobDbId is undefined or invalid.");
    throw new Error("Invalid Job ID");
  }
  const response = await api.post(`/user/jobs/${jobDbId}/save`);
  return response.data;
};

export const getSavedJobs = async () => {
  const response = await api.get("/user/jobs/saved");
  return response.data;
};

// ============= Profile & Insights Functions =============

export const uploadProfileResume = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  // Explicitly set is_primary=true if we want this to be the active resume for insights
  const response = await api.post(
    "/api/v1/profile/resumes?is_primary=true",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const getProfileResumes = async () => {
  const response = await api.get("/api/v1/profile/resumes");
  return response.data;
};

export const deleteProfileResume = async (resumeId: string) => {
  const response = await api.delete(`/api/v1/profile/resumes/${resumeId}`);
  return response.data;
};

export const setActiveProfileResume = async (resumeId: string) => {
  const response = await api.put("/api/v1/profile/resumes/active", {
    resume_id: resumeId,
  });
  return response.data;
};

// ============= Preferences & Profile Settings =============

export const getUserPreferences = async () => {
  const response = await api.get("/api/v1/profile/preferences");
  return response.data;
};

export const updateUserPreferences = async (data: any) => {
  const response = await api.put("/api/v1/profile/preferences", data);
  return response.data;
};

export const updateUserProfile = async (data: {
  full_name?: string;
  username?: string;
}) => {
  const response = await api.put("/auth/profile", data);
  return response.data;
};

// ============= Agent / Hive API =============

export const sendMessageToAgent = async (
  message: string,
  sessionId?: string,
  resumeId?: string
) => {
  const response = await api.post("/api/v1/agent/chat", {
    message: message,
    session_id: sessionId,
    resume_id: resumeId,
  });
  return response.data;
};

// ============= Analytics API =============

export const getAnalyticsDashboard = async () => {
  const response = await api.get("/api/analytics/dashboard");
  return response.data;
};

export const getPerformanceTrends = async (days: number = 30) => {
  const response = await api.get(
    `/api/analytics/performance-trends?days=${days}`
  );
  return response.data;
};

export const getRoundBreakdown = async () => {
  const response = await api.get("/api/analytics/round-breakdown");
  return response.data;
};

// ============= Scheduling API =============

export const createScheduledInterview = async (data: {
  title: string;
  scheduled_time: string;
  duration_minutes?: number;
  description?: string;
}) => {
  const response = await api.post("/api/schedule/create", data);
  return response.data;
};

export const getUpcomingSchedules = async (limit: number = 10) => {
  const response = await api.get(`/api/schedule/upcoming?limit=${limit}`);
  return response.data;
};

export const updateSchedule = async (scheduleId: string, data: any) => {
  const response = await api.put(`/api/schedule/${scheduleId}`, data);
  return response.data;
};

export const cancelSchedule = async (scheduleId: string) => {
  const response = await api.delete(`/api/schedule/${scheduleId}`);
  return response.data;
};

export const getSchedulePreferences = async () => {
  const response = await api.get("/api/schedule/preferences/get");
  return response.data;
};

export const updateSchedulePreferences = async (data: any) => {
  const response = await api.put("/api/schedule/preferences/update", data);
  return response.data;
};

// ============= Skill Assessment API =============

export const getAvailableSkillTests = async (
  category?: string,
  difficulty?: string
) => {
  let url = "/api/skill-tests";
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (difficulty) params.append("difficulty", difficulty);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await api.get(url);
  return response.data;
};

export const startSkillTest = async (testId: string) => {
  const response = await api.post(`/api/skill-tests/${testId}/start`);
  return response.data;
};

export const submitSkillTestAnswer = async (
  attemptId: string,
  questionId: string,
  answer: string,
  timeTaken: number
) => {
  const response = await api.post(
    `/api/skill-tests/attempts/${attemptId}/answer`,
    {
      question_id: questionId,
      answer: answer,
      time_taken: timeTaken,
    }
  );
  return response.data;
};

export const completeSkillTest = async (attemptId: string) => {
  const response = await api.post(
    `/api/skill-tests/attempts/${attemptId}/complete`
  );
  return response.data;
};

export const getSkillTestResults = async (attemptId: string) => {
  const response = await api.get(
    `/api/skill-tests/attempts/${attemptId}/results`
  );
  return response.data;
};

export const getSkillTestHistory = async () => {
  const response = await api.get("/api/skill-tests/history/all");
  return response.data;
};

// ============= Certification API =============

export const searchCertifications = async (filters?: {
  query?: string;
  category?: string;
  provider?: string;
  difficulty?: string;
}) => {
  let url = "/api/certifications";
  const params = new URLSearchParams();
  if (filters?.query) params.append("query", filters.query);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.provider) params.append("provider", filters.provider);
  if (filters?.difficulty) params.append("difficulty", filters.difficulty);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await api.get(url);
  return response.data;
};

export const getRecommendedCertifications = async (limit: number = 10) => {
  const response = await api.get(
    `/api/certifications/recommendations?limit=${limit}`
  );
  return response.data;
};

export const getUserCertifications = async () => {
  const response = await api.get("/api/certifications/user");
  return response.data;
};

export const addUserCertification = async (data: {
  certification_id: string;
  status?: string;
  obtained_date?: string;
  credential_id?: string;
  credential_url?: string;
  notes?: string;
}) => {
  const response = await api.post("/api/certifications/user", data);
  return response.data;
};

export const updateUserCertification = async (certId: string, data: any) => {
  const response = await api.put(`/api/certifications/user/${certId}`, data);
  return response.data;
};

export const deleteUserCertification = async (certId: string) => {
  const response = await api.delete(`/api/certifications/user/${certId}`);
  return response.data;
};

export const getCertificationRoadmap = async (targetRole: string) => {
  const response = await api.get(
    `/api/certifications/roadmap?target_role=${encodeURIComponent(targetRole)}`
  );
  return response.data;
};

export const getExpiringCertifications = async (days: number = 30) => {
  const response = await api.get(`/api/certifications/expiring?days=${days}`);
  return response.data;
};
