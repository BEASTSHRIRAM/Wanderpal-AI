# ✨ Wanderpal: Your AI Travel Companion

![React](https://img.shields.io/badge/React-TypeScript-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-green?style=for-the-badge&logo=fastapi)
![AI Agent](https://img.shields.io/badge/AI_Agent-Langflow-blueviolet?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-MongoDB-green?style=for-the-badge&logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

Wanderpal is a full-stack AI travel assistant built with a React frontend, FastAPI backend, and a powerful agentic AI powered by Langflow. It allows users to plan trips, get real-time hotel and transport information, and browse trending destinations, all while managing conversations and user profiles.
DEMO VIDEO: https://drive.google.com/file/d/1AIVP3uXssGRjBKdSrzm7hLrJ8X_ysl50/view?usp=sharing

---

## 📋 Table of Contents
- [Core Features](#-core-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Local Setup Guide](#-local-setup-guide)
  - [1. Prerequisites (API Keys)](#step-1-prerequisites--api-keys)
  - [2. AI Server (Langflow)](#step-2-setup-the-ai-server-langflow)
  - [3. Backend (FastAPI)](#step-3-setup-the-backend-fastapi)
  - [4. Frontend (React)](#step-4-setup-the-frontend-react)
- [How to Run](#-how-to-run-the-full-application)
- [Configuration (.env)](#-configuration-file)
- [Deployment Guide](#-deployment-guide)

---

## ✨ Core Features

* 🔑 **Full User Authentication:** Secure Sign Up & Sign In with password hashing using JWT.
* 👤 **Persistent User Profiles:** Users can view and update their personal information.
* 💬 **Multi-Conversation Chat UI:** A complete chat interface (similar to ChatGPT/Gemini) that saves and lists all previous conversations in a sidebar, allowing users to resume chats.
* 💾 **Persistent Chat History:** All user messages and AI responses are saved to MongoDB, linked to both the user and the specific conversation.
* 🤖 **Agentic AI:** A sophisticated agent built in Langflow that uses a high-speed LLM (via Groq) and has access to real-world tools (via SerpApi) to:
    * Find hotels in any city.
    * Find transport options (flights, trains, etc.).
    * Perform general web searches.
* ⚡ **Asynchronous Backend:** Uses a task polling pattern (`/chat/async` and `/chat/result`) to handle slow agent responses without client-side or server-side timeouts.
* 📈 **Trending Destinations:** A dedicated page using the browser's geolocation to fetch trending nearby locations from the OpenTripMap API.

---

## 🛠️ Tech Stack

* **Frontend:**
    * React (with TypeScript)
    * Vite (Build Tool)
    * TailwindCSS
    * ShadCN/ui (Component Library)
* **Backend:**
    * FastAPI (Python Framework)
    * Uvicorn (Web Server)
    * Motor (Async MongoDB Driver)
    * Passlib & Python-JOSE (for JWT Auth)
* **Database:**
    * MongoDB (e.g., MongoDB Atlas)
* **AI Service:**
    * **Langflow** (Running locally to host the agent)
    * **Agent Tools:** Groq (LLM Inference), SerpApi (Real-time Search)
* **Other APIs:**
    * OpenTripMap API
    * SearchAPI api key
      

---

## 📁 Project Structure

### This repository uses a clean monorepo-style structure, separating the three main services.
### /Wanderpal-Project/
#### ├── 📁 backend/         # The FastAPI server (main.py, etc.)
#### ├── 📁 frontend/         # The React/Vite web app (Chat.tsx, etc.)
#### ├── 📁 langflow_flow/    # The JSON blueprint for the AI agent
#### ├── .gitignore
#### └── README.md
---

## 🚀 Local Setup Guide

This guide details how to get the entire application running on your local machine.

### Step 1: Prerequisites & API Keys

Before you begin, you must get API keys from the following services. These are all required for the app to function.

1.  **MongoDB (`MONGODB_URL`)**: Go to **MongoDB Atlas** and create a free (M0) cluster. Get the **Connection String**.
2.  **SerpApi (`SERPAPI_API_KEY`)**: Go to **SerpApi**. This is required for your Langflow agent's tools (Hotel/Transport) to work.
3.  **Groq (`GROQ_API_KEY`)**: Go to **Groq**. This is required for your Langflow agent's LLM.
4.  **OpenTripMap (`OPENTRIPMAP_API_KEY`)**: Go to **OpenTripMap**. This is required for the "Trending" page.
5.  **SECRET_KEY**: This isn't from a service. You must **create this yourself**. It should be a long, random, secret string (you can use a password generator).

### Step 2: Setup the AI Server (Langflow)

1.  **Install Langflow:**
    ```bash
    pip install langflow
    ```
2.  **Run Langflow Server:**
    ```bash
    langflow run
    ```
3.  **Import the Flow:**
    * Open `http://127.0.0.1:7860` in your browser and create your local admin account.
    * Import the flow file located at `/langflow_flow/wanderpal_agent.json`.
4.  **Configure Agent Keys:**
    * Open the imported flow in the Langflow UI.
    * Inside the agent, find the components for your LLM (Groq) and Tools (SerpApi).
    * You **must** add your `GROQ_API_KEY` and `SERPAPI_API_KEY` into the appropriate fields inside the Langflow UI (or add them as Global Variables in Langflow's settings).
5.  **Get Local Keys:** You now need two pieces of info from this local server for your backend:
    * **Local Flow ID:** Open your flow and copy the ID from the browser's URL bar:
        (e.g., `http://127.0.0.1:7860/flows/`**`COPY-THIS-UUID`**)
    * **Local API Key:** Click **Settings** (gear icon) -> **API Keys** -> **Add New**. Create a key and copy it.

### Step 3: Setup the Backend (FastAPI)

1.  Navigate to the `/backend` directory.
2.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  **Create `requirements.txt`:** Create a file named `requirements.txt` in the `/backend` folder and paste this in:
    ```
    fastapi
    uvicorn[standard]
    motor
    python-dotenv
    requests
    httpx
    passlib[bcrypt]
    python-jose[cryptography]
    ```
4.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
5.  **Create `.env` File:** Create a file named `.env` in the `/backend` folder. Copy the template from the [Configuration](#-configuration-file) section below and fill it in with all the keys you just gathered.

### Step 4: Setup the Frontend (React)

1.  Navigate to your frontend project directory (e.g., `/frontend` or `/wanderpalcode`).
2.  **Install Dependencies:**
    ```bash
    npm install
    ```

---

## 💡 How to Run the Full Application

To run Wanderpal, you must have **3 separate terminals** open and running at the same time.

### 🖥️ Terminal 1: Run the AI Server (Langflow)
```bash
langflow run
```
(Leave this running. Your AI is now live at http://127.0.0.1:7860)

### 🖥️ Terminal 2: Run the Backend Server (FastAPI)
```bash
# Navigate to your /backend directory
cd path/to/your/backend
# Activate your Python environment
source venv/bin/activate
# Run the FastAPI server
uvicorn main:app --reload
```
(Leave this running. Your API is now live at http://127.0.0.1:8000)

### 🖥️ Terminal 3: Run the Frontend App (React)
```bash
# Navigate to your /frontend directory
cd path/to/your/frontend
# Run the Vite development server
npm run dev
```
(This will output a URL, usually http://localhost:5173. Open this URL in your browser to use the app.)

---

## ⚙️ Configuration File

Create this file as `.env` inside your `/backend` directory and fill in all required values.

```env
# --- Database (Required for Login) ---
MONGODB_URL="YOUR_MONGODB_ATLAS_CONNECTION_STRING"
DB_NAME="wanderpal_db"

# --- Security (Create a long random string) ---
SECRET_KEY="YOUR_OWN_LONG_RANDOM_SECRET_PASSWORD"

# --- Local Langflow Connection (Get these from Step 2) ---
LANGFLOW_BASE_URL=http://127.0.0.1:7860
LANGFLOW_FLOW_ID=YOUR_NEW_LOCAL_FLOW_ID_FROM_BROWSER_URL
LANGFLOW_APPLICATION_TOKEN=YOUR_NEW_LOCAL_API_KEY_FROM_LANGFLOW_SETTINGS
LANGFLOW_TOKEN=YOUR_NEW_LOCAL_API_KEY_FROM_LANGFLOW_SETTINGS

# --- IMPORTANT: Leave this blank to force use of your local server settings or paste the url endpoint from the langflow api access (local)---
LANGFLOW_RUN_URL=

# --- Other Service APIs ---
OPENTRIPMAP_API_KEY="YOUR_OPENTRIPMAP_API_KEY"

# --- App Config ---
ALLOW_ANONYMOUS_CHAT=false
LANGFLOW_TIMEOUT_SECONDS=600
LANGFLOW_MAX_RETRIES=3
LANGFLOW_MAX_TOKENS=16000
LANGFLOW_EXPECTED_OUTPUT_TOKENS=512
```

---

## 🚀 Deployment Guide

### Production Deployment Options

For production deployment, we recommend the following cloud platforms that offer excellent support for full-stack applications:

#### Backend Deployment (FastAPI)
**Recommended Platform: Render**
- ✅ **Free Tier Available**: Perfect for prototyping and development
- ✅ **Zero Configuration**: Automatic builds from GitHub repository
- ✅ **Environment Variables**: Secure handling of API keys and secrets
- ✅ **Health Checks**: Built-in monitoring and auto-restart
- ✅ **Custom Domains**: Support for custom domain names

**Deployment Steps for Render:**
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from your `.env` file
6. Deploy automatically on every Git push

#### Frontend Deployment (React + TypeScript)
**Recommended Platform: Vercel**
- ✅ **Optimized for React**: Built specifically for frontend frameworks
- ✅ **Free Tier**: Generous limits for personal projects
- ✅ **Global CDN**: Fast loading times worldwide
- ✅ **Automatic Builds**: Deploy on every Git push
- ✅ **Custom Domains**: Free SSL certificates
- We can also choose other deployment platforms just because these are freely available we are suggesting.

**Deployment Steps for Vercel:**
1. Connect your GitHub repository to Vercel
2. Select the frontend directory (e.g., `/wanderpalcode`)
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables for API endpoints
6. Deploy automatically on every Git push



### Deployment Considerations

#### Environment Variables for Production
```env
# Production Backend URL (update after backend deployment)
VITE_API_URL=https://your-backend-app.render.com

# Production Langflow (if using cloud Langflow)
LANGFLOW_RUN_URL=https://your-langflow-cloud-endpoint.com/api/v1/run/your-flow-id

# Security (use strong production secrets)
SECRET_KEY=your-production-secret-key-min-32-characters
```


The architecture is designed to be deployment-ready, and the suggested cloud platforms (Render + Vercel) provide a straightforward path to production when ready.

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
