import os
import random
from time import time
import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

import httpx
import motor.motor_asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query, Header, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import requests
# Security and JWT imports
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- Load environment variables ---
load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY", "a_default_secret_key_for_development")  # Use a strong one in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
ALLOW_ANONYMOUS_CHAT = os.getenv("ALLOW_ANONYMOUS_CHAT", "true").lower() == "true"

print(f"[CONFIG] ALLOW_ANONYMOUS_CHAT={ALLOW_ANONYMOUS_CHAT}")
print(f"[CONFIG] LANGFLOW_RUN_URL present={bool(os.getenv('LANGFLOW_RUN_URL'))}")
print(f"[CONFIG] LANGFLOW_BASE_URL present={bool(os.getenv('LANGFLOW_BASE_URL'))}")

# --- Constants ---
OPENTRIPMAP_API_KEY = os.getenv("OPENTRIPMAP_API_KEY")
OPENTRIPMAP_BASE_URL = "https://api.opentripmap.com/0.1/en/"

# --- App setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database connection ---
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# --- Security setup (Password hashing) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# --- Auth dependency ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="signin")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """FastAPI dependency to get the currently authenticated user from a JWT Bearer token."""
    credentials_error = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_error
        return {"sub": sub}
    except JWTError:
        raise credentials_error


async def parse_bearer_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract Bearer token from the Authorization header if present; return None if absent."""
    if not authorization:
        return None
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() == "bearer" and token:
            return token.strip()
    except ValueError:
        return None
    return None



class SignInRequest(BaseModel):
    email: str
    password: str

class SignUpRequest(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: str
    password: str
    location: Optional[str] = None

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    notifications: Optional[dict] = None

class Token(BaseModel):
    access_token: str
    token_type: str
# --- API routes ---
@app.post("/signin", response_model=Token)
async def signin(data: SignInRequest):
    user = await db["users"].find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.password, user.get("password")):
        raise HTTPException(status_code=400, detail="Wrong password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- API routes ---
@app.post("/signup", response_model=Token)
async def signup(data: SignUpRequest):
    """Handles new user registration"""
    existing = await db["users"].find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = get_password_hash(data.password)
    user = data.dict()
    user["password"] = hashed_password
    user["notifications"] = {
        "deals": False,
        "recommendations": False,
        "bookingUpdates": False,
        "marketing": False,
    }
    user["created_at"] = int(time())

    await db["users"].insert_one(user)

    # Generate JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user["email"]}, expires_delta=access_token_expires)

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/profile/{email}")
async def get_user(email: str):
    """Fetch user profile by email"""
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.pop("password", None)
    user.pop("_id", None)
    return user


@app.put("/profile/{email}")
async def update_user(email: str, data: UserUpdateRequest):
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    await db["users"].update_one({"email": email}, {"$set": update_data})
    return {"message": "User updated successfully", "email": email}


@app.get("/users/{email}/trips")
async def get_user_trips(email: str):
    """Fetch trips for a user"""
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    trips = await db["trips"].find({"user_email": email}).to_list(length=None)
    for trip in trips:
        trip.pop("_id", None)
    return {"trips": trips}


@app.get("/trending")
async def trending(lat: float, lon: float, radius: int = 30000):
    print(f"[DEBUG] Using OPENTRIPMAP_API_KEY: {OPENTRIPMAP_API_KEY}")
    url = f"{OPENTRIPMAP_BASE_URL}places/radius"
    params = {
        "apikey": OPENTRIPMAP_API_KEY,
        "radius": radius,
        "lon": lon,
        "lat": lat,
        "rate": 3,
        "format": "geojson",
        "limit": 10,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        print(f"[DEBUG] OpenTripMap /places/radius status: {resp.status_code}")
        print(f"[DEBUG] Response: {resp.text[:300]}")
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"OpenTripMap error: {resp.status_code} {resp.text[:200]}")
        data = resp.json()
    features = data.get("features")
    if not features:
        return {"trending": [], "message": "No trending places found for this location."}
    trending = []
    async with httpx.AsyncClient() as client:
        for feat in features:
            prop = feat.get("properties", {})
            xid = prop.get("xid")
            if not xid:
                continue
            detail_url = f"{OPENTRIPMAP_BASE_URL}places/xid/{xid}"
            detail_resp = await client.get(detail_url, params={"apikey": OPENTRIPMAP_API_KEY})
            print(f"[DEBUG] Detail {xid} status: {detail_resp.status_code}")
            if detail_resp.status_code != 200:
                continue
            detail = detail_resp.json()
            trending.append({
                "name": detail.get("name"),
                "kinds": detail.get("kinds"),
                "address": detail.get("address", {}),
                "preview": detail.get("preview", {}).get("source"),
                "wikipedia_extracts": detail.get("wikipedia_extracts", {}).get("text"),
                "otm": detail.get("otm"),
                "xid": xid
            })
    return {"trending": trending}

@app.get("/chat/history/{conversation_id}")
async def get_chat_history(conversation_id: str, user: dict = Depends(get_current_user)):
    """
    Fetches the message history for a specific conversation ID.
    Ensures the conversation belongs to the authenticated user.
    """
    user_email = user.get("sub")
    if not user_email:
        raise HTTPException(status_code=403, detail="Invalid user token")

    # Security Check: First, make sure this conversation belongs to this user
    convo = await db["conversations"].find_one({
        "_id": conversation_id,
        "user_email": user_email
    })
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    # Now, get all messages for that conversation, sorted oldest first
    history_cursor = db["messages"].find({
        "conversation_id": conversation_id
    }).sort("timestamp", 1)  # 1 = ascending order
    
    history_list = []
    async for message in history_cursor:
        history_list.append({
            "id": str(message["_id"]),
            "role": message["role"],
            "content": message["content"],
            "timestamp": message["timestamp"].isoformat()
        })
        
    return {"history": history_list}


# --- Chat Models ---
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None # <-- ADD THIS


class ChatResponse(BaseModel):
    response: str
    user_id: Optional[str] = None


class TaskCreated(BaseModel):
    task_id: str
    conversation_id: str # <-- ADD THIS


class TaskResult(BaseModel):
    task_id: str
    status: str  # pending | done | error
    result: Optional[str] = None
    error: Optional[str] = None


# --- Async task queue (in-memory, ephemeral) ---
# This avoids holding the HTTP request open while upstream may take a long time.
_tasks: Dict[str, Dict] = {}
_tasks_lock = asyncio.Lock()


# === REPLACE your old _run_langflow_task WITH THIS NEW VERSION ===
async def _run_langflow_task(
    task_id: str, 
    message: str, 
    user_id: Optional[str], 
    langflow_token: Optional[str],
    conversation_id: str  # <-- ADDED PARAMETER
):
    """Runs the Langflow query and saves the AI response to the DB."""
    try:
        # 1. Get the result from the agent
        result = await process_travel_query(message=message, user_id=user_id, langflow_token=langflow_token) 

        # 2. Save the AI's response to the correct conversation in the DB
        try:
            if user_id:  # user_id is the user's email
                ai_message_doc = {
                    "user_email": user_id,
                    "conversation_id": conversation_id, # <-- ADD THIS FIELD
                    "role": "ai",
                    "content": result,
                    "timestamp": datetime.now(timezone.utc)
                }
                await db["messages"].insert_one(ai_message_doc)
            
            # Also update the "last_modified" time for this conversation
            await db["conversations"].update_one(
                {"_id": conversation_id},
                {"$set": {"last_modified": datetime.now(timezone.utc)}}
            )

        except Exception as e:
            print(f"[ERROR] Failed to save AI message to DB: {e}")

        # 3. Mark the polling task as "done"
        async with _tasks_lock: 
            _tasks[task_id]["status"] = "done" 
            _tasks[task_id]["result"] = result 

    except Exception as e: 
        async with _tasks_lock: 
            _tasks[task_id]["status"] = "error" 
            _tasks[task_id]["error"] = str(e)


# === REPLACE your old /chat/async function (lines 335-467) WITH THIS NEW VERSION ===

# === REPLACE your old /chat/async function (lines 335-467) WITH THIS NEW VERSION ===

@app.post("/chat/async", response_model=TaskCreated)
async def chat_with_ai_async(request: ChatRequest, token: Optional[str] = Depends(parse_bearer_token)):
    """
    Enqueues a chat request. Handles new vs. existing conversations
    and intelligently updates conversation titles.
    This version correctly handles expired tokens.
    """
    user_email: Optional[str] = None
    langflow_api_token: Optional[str] = None
    
    auth_error = HTTPException(
            status_code=401,
            detail="Invalid or expired token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if token:
        # A token was provided. It MUST be a valid user JWT.
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub") or payload.get("email")
            if user_email is None:
                # Token is valid but doesn't contain the user email in 'sub'
                raise auth_error
        except JWTError:
            # Token is expired, corrupt, or not a JWT. Raise 401.
            # This is the fix. We now raise an error instead of continuing.
            raise auth_error
            
    # If we are here, one of two things happened:
    # 1. The token was valid and user_email is now set.
    # 2. No token was provided (token is None).

    # Now we get the Langflow token (which is separate from the user token)
    env_langflow_token = os.getenv('LANGFLOW_APPLICATION_TOKEN')
    if env_langflow_token:
        langflow_api_token = env_langflow_token
    else:
        print("[ERROR] LANGFLOW_APPLICATION_TOKEN is not set in .env file!")
        # This is a critical server misconfiguration.
        raise HTTPException(status_code=500, detail="Chat service is not configured.")


    if not user_email:
        # No token was provided. Check if anonymous chat is allowed.
        if not ALLOW_ANONYMOUS_CHAT:
            # Anonymous chat is forbidden. Raise 401.
             raise HTTPException(status_code=401, detail="Authentication required to chat.")
        else:
            # Anonymous chat is allowed. We proceed with user_email = None
             print("[DEBUG] No token provided. Proceeding with anonymous chat.")

    # --- From this point on, the logic is the same ---

    now = datetime.now(timezone.utc)
    convo_id = request.conversation_id
    simple_greetings = ["hi", "hello", "hey", "yo", "good morning", "good afternoon", "howdy"]

    try:
        if not convo_id:
            # === THIS IS A NEW CHAT ===
            convo_id = str(uuid.uuid4()) # Create a new ID
            
            title_message = request.message.lower().strip(" .!?")
            title = "New Chat"
            if title_message not in simple_greetings and len(title_message) > 4:
                 title = request.message[:50] + ("..." if len(request.message) > 50 else "")

            new_convo_doc = {
                "_id": convo_id,
                "user_email": user_email, # This will be the email OR null (if anonymous)
                "title": title,
                "created_at": now,
                "last_modified": now
            }
            await db["conversations"].insert_one(new_convo_doc)
        
        else:
            # === THIS IS AN EXISTING CHAT ===
            convo = await db["conversations"].find_one({"_id": convo_id})
            new_title = None
            
            if convo and convo.get("title") == "New Chat":
                prompt_message = request.message.lower().strip(" .!?")
                if prompt_message not in simple_greetings and len(prompt_message) > 10:
                    new_title = request.message[:50] + ("..." if len(request.message) > 50 else "")

            update_query = {"$set": {"last_modified": now}}
            if new_title:
                update_query["$set"]["title"] = new_title

            await db["conversations"].update_one({"_id": convo_id}, update_query)
        
        # Save the user message (whether anonymous or not)
        message_doc_to_save = {
            "user_email": user_email,
            "conversation_id": convo_id,
            "role": "user",
            "content": request.message,
            "timestamp": now
        }
        await db["messages"].insert_one(message_doc_to_save)

    except Exception as e:
        print(f"[ERROR] Failed to save message/convo to DB: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


    # Now, create and schedule the background task
    task_id = str(uuid.uuid4())
    async with _tasks_lock:
        _tasks[task_id] = {"status": "pending", "result": None, "error": None}

    asyncio.create_task(_run_langflow_task(
        task_id=task_id, 
        message=request.message, 
        user_id=user_email, # Pass the email (or None) to the task runner
        langflow_token=langflow_api_token,
        conversation_id=convo_id
    ))

    return TaskCreated(task_id=task_id, conversation_id=convo_id)

@app.get("/chat/result/{task_id}", response_model=TaskResult)
async def get_task_result(task_id: str):
    """
    Returns the status of a background chat task.
    Used by the frontend to poll for completion.
    """
    async with _tasks_lock:
        if task_id not in _tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = _tasks[task_id]
        return TaskResult(
            task_id=task_id,
            status=task["status"],
            result=task.get("result"),
            error=task.get("error")
        )
    
@app.get("/conversations")
async def get_all_conversations(user: dict = Depends(get_current_user)):
    """
    Fetches the list of all conversations for the sidebar for the authenticated user.
    """
    user_email = user.get("sub")
    if not user_email:
        raise HTTPException(status_code=403, detail="Invalid user token")

    # Find all conversations for this user, sort by the last modified (most recent first)
    convo_cursor = db["conversations"].find(
        {"user_email": user_email}
    ).sort("last_modified", -1)  # -1 = descending order

    convo_list = []
    async for convo in convo_cursor:
        convo_list.append({
            "id": str(convo["_id"]),
            "title": convo.get("title", "New Chat"),
            "created_at": convo.get("created_at")
        })
        
    return {"conversations": convo_list}


# --- Langflow integration ---
async def process_travel_query(message: str, user_id: Optional[str] = None, langflow_token: Optional[str] = None) -> str:
    """Process travel query using Langflow

    This function will attempt the configured LANGFLOW_RUN_URL first. If that
    returns 405 or fails, it will try multiple common run endpoints derived
    from LANGFLOW_BASE_URL and the flow ID (from LANGFLOW_FLOW_ID or the
    configured URL). This helps when Langflow UI exposes flows at /flow/<id>
    but the API run endpoint differs.
    """
    langflow_base_url = os.getenv('LANGFLOW_BASE_URL', 'http://127.0.0.1:7860')
    configured_run_url = os.getenv('LANGFLOW_RUN_URL')
    flow_id_env = os.getenv('LANGFLOW_FLOW_ID')

    def extract_flow_id(url: str) -> Optional[str]:
        try:
            parts = url.rstrip('/').split('/')
            for p in reversed(parts):
                if '-' in p and len(p) >= 8:
                    return p
        except Exception:
            return None
        return None

    flow_id_from_url = extract_flow_id(configured_run_url) if configured_run_url else None
    flow_id = flow_id_env or flow_id_from_url

    candidates = []
    if configured_run_url:
        candidates.append(configured_run_url)
    if flow_id:
        candidates.extend([
            f"{langflow_base_url}/api/v1/run/{flow_id}",
            f"{langflow_base_url}/run/{flow_id}",
            f"{langflow_base_url}/api/v1/flows/{flow_id}/run",
            f"{langflow_base_url}/api/flows/{flow_id}/run",
            f"{langflow_base_url}/flow/{flow_id}/run",
        ])
    candidates.append(f"{langflow_base_url}/api/v1/run")
    candidates.append(f"{langflow_base_url}/run")

    headers = {"Content-Type": "application/json"}
    if langflow_token:
        headers["Authorization"] = f"Bearer {langflow_token}"

    payload = {
        "input_value": message,
        "output_type": "chat",
        "input_type": "chat",
        "tweaks": {}
    }

    last_error = None
    async with httpx.AsyncClient(timeout=180.0) as client:
        for url in candidates:
            try:
                print(f"[DEBUG] Trying Langflow endpoint: {url}")
                resp = await client.post(url, json=payload, headers=headers)
                print(f"[DEBUG] Response from {url}: {resp.status_code}")

                if resp.status_code == 405:
                    print(f"[DEBUG] Endpoint {url} returned 405; trying alternate endpoints...")
                    last_error = f"405 from {url}"
                    continue

                if resp.status_code != 200:
                    print(f"[DEBUG] Non-200 response from {url}: {resp.status_code} - {resp.text[:200]}")
                    last_error = f"{resp.status_code} from {url}: {resp.text[:200]}"
                    continue

                try:
                    data = resp.json()
                except Exception as e:
                    print(f"[DEBUG] Failed to parse JSON from {url}: {str(e)}")
                    last_error = f"invalid json from {url}"
                    continue

                # Common Langflow response shapes
                if isinstance(data, dict) and "outputs" in data and data["outputs"]:
                    first_output = data["outputs"][0]
                    if isinstance(first_output, dict):
                        inner_outputs = first_output.get("outputs") or first_output.get("data") or []
                        for output in inner_outputs:
                            if not isinstance(output, dict):
                                continue
                            results = output.get("results") or output.get("data") or {}
                            if isinstance(results, dict):
                                if "message" in results and isinstance(results["message"], dict) and "text" in results["message"]:
                                    return results["message"]["text"]
                                if "text" in results:
                                    return str(results["text"])
                            artifacts = output.get("artifacts") or {}
                            if isinstance(artifacts, dict) and "message" in artifacts:
                                return str(artifacts["message"])

                if isinstance(data, dict):
                    if "result" in data:
                        return str(data["result"])
                    if "message" in data:
                        return str(data["message"])

                return str(data)

            except httpx.ConnectError as ce:
                print(f"[DEBUG] ConnectError for {url}: {str(ce)}")
                last_error = f"connect error to {url}: {str(ce)}"
                continue
            except httpx.TimeoutException as te:
                print(f"[DEBUG] Timeout for {url}: {str(te)}")
                last_error = f"timeout for {url}"
                continue
            except Exception as e:
                print(f"[DEBUG] Unexpected error calling {url}: {str(e)}")
                last_error = str(e)
                continue

    hint = (
        f"I tried multiple Langflow endpoints but none accepted the request. Last error: {last_error}. "
        f"If your flow is reachable at /flow/<flow-id> in the browser, set LANGFLOW_RUN_URL to the proper run endpoint provided by your Langflow deployment, e.g. '/api/v1/run/<flow-id>' or check Langflow docs for the correct API path."
    )
    return f"I'm having trouble processing your request right now. Langflow returned errors. {hint}"


@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest, token: Optional[str] = Depends(parse_bearer_token)):
    """Main chat endpoint for real-time AI interactions"""
    # Determine authentication and token source
    user_email: Optional[str] = None
    langflow_api_token: Optional[str] = None
    
    if token:
        try:
            # Try to decode as JWT first
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub") or payload.get("email")
        except JWTError:
            # If JWT decode fails, check if it's a Langflow API token
            raw = token.strip()
            if raw.startswith("AstraCS:") or raw.lower().startswith("astracs:"):
                langflow_api_token = raw
            else:
                print("[DEBUG] Token failed JWT decode and is not an Astra token; using configured application token for Langflow")
    elif not ALLOW_ANONYMOUS_CHAT:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Use environment token if no user-provided token
    env_langflow_token = os.getenv('LANGFLOW_APPLICATION_TOKEN')
    if not langflow_api_token and env_langflow_token:
        langflow_api_token = env_langflow_token
    
    # Process the travel query
    try:
        response_text = await process_travel_query(
            message=request.message, 
            user_id=request.user_id or user_email, 
            langflow_token=langflow_api_token
        )
        
        return ChatResponse(response=response_text, user_id=request.user_id or user_email)
        
    except Exception as e:
        print(f"[ERROR] Chat processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat message: {str(e)}")
