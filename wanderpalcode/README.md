Wanderpal: Your AI Travel Companion
Wanderpal is a full-stack, AI-powered travel planning application. It combines a modern React frontend with a robust FastAPI backend and a sophisticated agentic AI powered by Langflow. It provides a multi-conversation chat interface (similar to ChatGPT/Gemini) where users can get real-time travel information, which is then saved persistently to their account.

This project is built to demonstrate a modern, asynchronous architecture for handling long-running AI agent tasks without timeouts, using a scalable and secure backend.

Core Features
Full User Authentication: Secure Sign Up and Sign In (with password hashing) using JWT.

Persistent User Profiles: Users can view and update their personal information.

Multi-Conversation Chat UI: A complete chat interface (built in React) that saves and lists all previous conversations in a sidebar, allowing users to resume old chats.

Persistent Chat History: All user messages and AI responses are saved to a MongoDB database, linked to both the user and the specific conversation.

Agentic AI: A sophisticated agent built in Langflow that uses a high-speed LLM (via Groq) and has access to real-world tools (via SerpApi) to:

Find hotels in any city.

Find transport options.

Perform general web searches for information.

Asynchronous Backend: Uses a task polling pattern (/chat/async and /chat/result) to handle slow agent responses without client-side or server-side timeouts.

Trending Destinations: A dedicated page that uses the browser's geolocation to fetch and display trending nearby locations from the OpenTripMap API.

Tech Stack
Frontend: React (TypeScript), Vite, TailwindCSS, ShadCN/ui

Backend: FastAPI (Python), Uvicorn

AI Service: Langflow (running locally)

Agent Tools: Groq (for LLM inference), SerpApi (for Hotel/Transport tools)

Database: MongoDB (using the async motor driver)

Authentication: JWT (passlib[bcrypt] for hashing, python-jose for tokens)

Getting Started: Local Installation & Setup
To run this project, you must set up four separate components: the Backend, the Frontend, the AI Server (Langflow), and the Database. You will also need several API keys.

Step 1: Get All Required API Keys (Prerequisites)
Before you start, sign up for the following services and get your API keys.

MongoDB (MONGODB_URL): Go to MongoDB Atlas and create a free (M0) cluster. Get the Connection String.

SerpApi (SERPAPI_API_KEY): Go to SerpApi. This is required for your Langflow agent's tools (Hotel/Transport) to work.

Groq (GROQ_API_KEY): Go to Groq. This is required for your Langflow agent's LLM to function.

OpenTripMap (OPENTRIPMAP_API_KEY): Go to OpenTripMap. This is required for the "Trending" page.

You will also need to create your own SECRET_KEY (just make up a long, random string for JWT signing).

Step 2: Setup the AI Server (Langflow)
Install Langflow:

Bash

pip install langflow
Run Langflow:

Bash

langflow run
Setup the Flow:

Open your browser and go to http://127.0.0.1:7860.

Create your admin account (this is for your local server only).

Find the "Import" button and import your flow's .json file (e.g., wanderpal_agent.json).

Crucial: Open the flow and configure your agent. You must add your GROQ_API_KEY and SERPAPI_API_KEY to the correct components (or add them as Global Variables in Langflow's settings). Your agent will not work without them.

Get Your Local Keys: After your flow is imported, you need two items for our backend config:

Your Local Flow ID: Click on the flow to open it. Copy the ID from the browser URL bar.
(Example: http://127.0.0.1:7860/flows/COPY-THIS-ID)

Your Local API Key: Click Settings (gear icon) -> API Keys -> Add New. Create a key and copy it.

Step 3: Setup the Backend (FastAPI)
Navigate to your backend directory (where main.py is located).

Create a Virtual Environment:

Bash

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Create requirements.txt: Create a file named requirements.txt and paste the following:

fastapi
uvicorn[standard]
motor
python-dotenv
requests
httpx
passlib[bcrypt]
python-jose[cryptography]
Install Dependencies:

Bash

pip install -r requirements.txt
Create your .env file: In the same directory, create a file named .env and paste in the following template, filling it in with all the keys you just gathered.

Ini, TOML

# === Database (Required for Login) ===
MONGODB_URL="YOUR_MONGODB_ATLAS_CONNECTION_STRING"
DB_NAME="wanderpal_db" # Or any name you want

# === Security (Make this up!) ===
SECRET_KEY="YOUR_OWN_LONG_RANDOM_SECRET_PASSWORD"

# === Local Langflow Connection (Get these from Step 2) ===
LANGFLOW_BASE_URL=http://127.0.0.1:7860
LANGFLOW_FLOW_ID=YOUR_NEW_LOCAL_FLOW_ID_FROM_BROWSER_URL
LANGFLOW_APPLICATION_TOKEN=YOUR_NEW_LOCAL_API_KEY_FROM_LANGFLOW_SETTINGS
LANGFLOW_TOKEN=YOUR_NEW_LOCAL_API_KEY_FROM_LANGFLOW_SETTINGS

# === IMPORTANT: Leave this blank to use your local server ===
LANGFLOW_RUN_URL=

# === Other Services ===
OPENTRIPMAP_API_KEY="YOUR_OPENTRIPMAP_API_KEY"

# === App Config ===
ALLOW_ANONYMOUS_CHAT=false # Set to true to allow chat without login
LANGFLOW_TIMEOUT_SECONDS=600
LANGFLOW_MAX_RETRIES=3
LANGFLOW_MAX_TOKENS=16000
LANGFLOW_EXPECTED_OUTPUT_TOKENS=512
Step 4: Setup the Frontend (React)
Navigate to your frontend project directory (where package.json is located).

Install Dependencies:

Bash

npm install
How to Run the Project
To run the full application, you must have 3 separate terminals open and running at the same time.

Terminal 1: Run the AI Server (Langflow)
Bash

# Make sure your Python venv is NOT active for this, or just run from a new terminal
langflow run
(Leave this running. Your AI is now available at http://127.0.0.1:7860.)

Terminal 2: Run the Backend Server (FastAPI)
Bash

# Navigate to your backend directory
cd /path/to/your/backend_project/
# Activate your Python environment
source venv/bin/activate
# Run the FastAPI server
uvicorn main:app --reload
(Leave this running. Your API is now available at http://127.0.0.1:8000.)

Terminal 3: Run the Frontend App (React)
Bash

# Navigate to your frontend directory
cd /path/to/your/frontend_project/
# Run the Vite development server
npm run dev
(This will output a URL, usually http://localhost:5173 or a similar port.)

You can now open the Frontend URL (e.g., http://localhost:5173) in your browser to use the full application.