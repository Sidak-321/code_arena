# Live Coding Interview Arena

Production-ready collaborative coding interview platform: LeetCode + Google Docs + HackerRank.

## Tech Stack

- Frontend: React, Tailwind, Monaco, Socket.io Client, Yjs
- Backend: Node.js, Express, Socket.io, Redis adapter, MongoDB
- Execution: Judge0 API only
- Real-time AV: WebRTC (audio/video) with Socket.io signaling

## Folder Structure

```text
/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      sockets/
  frontend/
    src/
      api/
      components/
      hooks/
      pages/
      socket/
```

## Core APIs

- `POST /api/create-room`
- `POST /api/join-room`
- `POST /api/run-code`
- `POST /api/submit-code`
- `GET /api/replay/:sessionId`
- `GET /api/scorecard/:sessionId`

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Required services:
- MongoDB
- Redis
- Judge0 (RapidAPI keys in `.env`)

## Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Scorecard Formula

```text
FinalScore =
0.4 * Correctness +
0.15 * Efficiency +
0.15 * TimeScore +
0.1 * CodeQuality +
0.1 * AttemptsScore +
0.1 * ProctoringScore
```

## Security

- No local code execution on backend
- Judge0 sandbox only
- Rate-limited `/run-code` and `/submit-code`
- Payload validation and source-size caps
- Proctoring event audit logs

## WebRTC Audio/Video

- Signaling events over existing Socket.io connection:
  - `webrtc:join`
  - `webrtc:offer`
  - `webrtc:answer`
  - `webrtc:ice-candidate`
  - `webrtc:user-joined`
  - `webrtc:user-left`
- Peer connection setup in `frontend/src/hooks/useWebRTC.js`
- UI controls in `frontend/src/components/VideoPanel.jsx`

## Deployment

- Frontend: Vercel (`frontend` directory)
- Backend: Render/AWS/Railway Node service (`backend` directory)
- Add Redis + MongoDB managed instances and set environment variables.
