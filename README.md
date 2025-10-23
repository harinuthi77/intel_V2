# Adaptive Agent Platform

This project combines a React-based interface with a Python adaptive web agent. The backend exposes the agent through a FastAPI service so the UI can trigger automated browsing workflows and display streaming progress.

## Prerequisites

- Python 3.10+
- Node.js 18+ (for building the React UI)
- Playwright browsers installed (`playwright install`)

## Quick Start (Integrated Mode - Recommended)

The platform can run as a single integrated application (Spring Boot style) where the backend serves both the API and the frontend on port 8000.

### 1. Install Python dependencies

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Build and integrate frontend

```bash
./build.sh  # On Windows: build.bat
```

This will:
- Install frontend dependencies
- Build the React app for production
- Copy the built files to `backend/static/`

### 3. Start the integrated application

```bash
./start.sh  # On Windows: start.bat
```

The application will be available at `http://localhost:8000` with both the UI and API on the same port.

**Features:**
- Single command startup
- No CORS issues
- Production-ready deployment
- Live browser view with screenshot streaming
- Manual control mode for human intervention
- Intelligent agent using Claude's reasoning

---

## Development Mode

For development with hot reload on both frontend and backend, run them separately:

## Python environment

Install the backend dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

If you do not wish to use the provided requirements file, ensure at least the following packages are installed:

- `fastapi`
- `uvicorn[standard]`
- `anthropic`
- `playwright`

## Running the backend service

```bash
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

The server exposes a `POST /execute` endpoint that accepts a JSON payload:

```json
{
  "task": "go to walmart.com and find ...",
  "model": "claude",
  "tools": ["web", "code"],
  "headless": false,
  "max_steps": 40
}
```

Responses include structured execution details, collected data, and streamed log messages. The server logs progress to stdout while the agent runs.

## Running the React UI

Integrate `ForgePlatform.jsx` into your React application (for example via Vite or Create React App). Start the usual development server in a separate terminal, ensuring it can reach the backend at `http://localhost:8000`:

```bash
npm install
npm run dev
```

With both services running, submit tasks from the UI and monitor live progress updates in the right-hand panel. Errors returned from the backend are surfaced directly in the interface.

## Command-line agent usage

The agent can be invoked directly without the web server:

```bash
python adaptive_agent.py "go to walmart.com and find ..." --model claude --headless
```

The CLI prints a JSON payload with the same structure returned by the web service.
