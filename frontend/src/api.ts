import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const startInterview = async () => {
    const response = await api.post('/start');
    return response.data;
};

export const sendMessage = async (sessionId: number, message: string) => {
    const response = await api.post('/chat', {
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
