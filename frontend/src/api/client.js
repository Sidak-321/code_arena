import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
});

export async function createRoom(payload) {
  const { data } = await api.post("/create-room", payload);
  return data;
}

export async function joinRoom(payload) {
  const { data } = await api.post("/join-room", payload);
  return data;
}

export async function runCode(payload) {
  const { data } = await api.post("/run-code", payload);
  return data;
}

export async function submitCode(payload) {
  const { data } = await api.post("/submit-code", payload);
  return data;
}

export async function updateTestCases(roomId, payload) {
  const { data } = await api.post(`/room/${roomId}/test-cases`, payload);
  return data;
}

export async function addNote(roomId, payload) {
  const { data } = await api.post(`/room/${roomId}/notes`, payload);
  return data;
}

export async function fetchReplay(sessionId) {
  const { data } = await api.get(`/replay/${sessionId}`);
  return data;
}

export async function fetchScorecard(sessionId) {
  const { data } = await api.get(`/scorecard/${sessionId}`);
  return data;
}
