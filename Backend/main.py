import os
import random, Request
from time import time
import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

import httpx
import motor.motor_asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query, Header
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import requests
# Security and JWT imports
from passlib.context import CryptContext
from jose import JWTError, jwt

# Import Langflow integration
from langflow import process_travel_query

# --- Load environment variables ---
load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY", "a_default_secret_key_for_development")  # Use a strong one in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
ALLOW_ANONYMOUS_CHAT = os.getenv("ALLOW_ANONYMOUS_CHAT", "false").lower() == "true"

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

LANGFLOW_API_URL = f"https://api.langflow.astra.datastax.com/lf/d0c29d20-be53-4ac7-ac33-5f58ffdb76cf/api/v1/run/1a4bd38d-81ed-4dfe-8d19-ba12ee7f324a"
LANGFLOW_TOKEN = os.getenv("LANGFLOW_TOKEN").strip('"')  # Set this in your .env

@app.post("/api/langflow-chat")
async def langflow_chat(request: Request):
    """
    Proxy plain chat messages to Langflow API and return the response.
    Expects JSON: {"input_value": "user message"}
    """
    body = await request.json()
    payload = {
        "input_value": body.get("input_value", ""),  # The input value to be processed by the flow
        "output_type": "chat",  # Specifies the expected output format
        "input_type": "chat"  # Specifies the input format
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer "+os.getenv("LANGFLOW_TOKEN").strip('"')
    }
    try:
        response = requests.request("POST", LANGFLOW_API_URL, json=payload, headers=headers, timeout=1200)
        response.raise_for_status()  # Raise exception for bad status codes
        #response = requests.post(LANGFLOW_API_URL, json=payload, headers=headers)
        #response.raise_for_status()
        print(response)
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e), "detail": getattr(e, 'response', None) and e.response.text}




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


# --- Chat Models ---
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    user_id: Optional[str] = None


class TaskCreated(BaseModel):
    task_id: str


class TaskResult(BaseModel):
    task_id: str
    status: str  # pending | done | error
    result: Optional[str] = None
    error: Optional[str] = None


# --- Chat Endpoint ---
@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest, token: Optional[str] = Depends(parse_bearer_token)):
    """
    Chat endpoint that processes user messages through Langflow
    """
    try:
        # Determine user identity from token or allow anonymous when enabled
        user_email: Optional[str] = None
        langflow_api_token: Optional[str] = None
        if token:
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_email = payload.get("sub") or payload.get("email")
            except JWTError:
                # Token could not be decoded as our JWT. Only treat it as a Langflow/Astra API
                # token if it matches known Astra token patterns (e.g., starts with 'AstraCS:').
                raw = token.strip()
                if raw.startswith("AstraCS:") or raw.lower().startswith("astracs:"):
                    langflow_api_token = raw
                else:
                    # Don't forward arbitrary tokens that failed JWT decoding — use the configured
                    # application token instead and log for debugging.
                    print("[DEBUG] Incoming bearer token failed JWT decode and is not an Astra token; using configured application token for Langflow upstream.")
                    # leave langflow_api_token as None so env fallback will be used
        elif not ALLOW_ANONYMOUS_CHAT:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Always prefer an explicit non-JWT token, but fall back to configured application token
        env_langflow_token = os.getenv('LANGFLOW_APPLICATION_TOKEN')
        # Prefer incoming Astra token, else fall back to env token
        if not langflow_api_token and env_langflow_token:
            langflow_api_token = env_langflow_token

        # Debug: indicate token source and masked value
        if langflow_api_token:
            try:
                masked = langflow_api_token[:8] + '...' + langflow_api_token[-8:]
            except Exception:
                masked = '<token>'
            source = 'incoming' if token and token.strip() == langflow_api_token else 'env'
            print(f"[DEBUG] Using Langflow token present: True source={source} masked={masked}")
        else:
            print("[DEBUG] Using Langflow token present: False")
        
        # Process the message through Langflow
        ai_response = await process_travel_query(
            message=request.message,
            user_id=request.user_id or user_email,
            langflow_token=langflow_api_token,
        )
        
        return ChatResponse(
            response=ai_response,
            user_id=request.user_id or user_email
        )

    except HTTPException as e:
        # Propagate intended HTTP status codes such as 401
        raise e
    except Exception as e:
        print(f"[ERROR] Chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat message: {str(e)}"
        )


@app.get("/_debug")
async def _debug():
    """Return masked runtime configuration to help debugging env issues."""
    run_url = os.getenv('LANGFLOW_RUN_URL')
    base_url = os.getenv('LANGFLOW_BASE_URL')
    app_token = os.getenv('LANGFLOW_APPLICATION_TOKEN')
    return {
        "allow_anonymous": ALLOW_ANONYMOUS_CHAT,
        "langflow_run_url_present": bool(run_url),
        "langflow_run_url": (run_url[:80] + '...') if run_url and len(run_url) > 80 else run_url,
        "langflow_base_url_present": bool(base_url),
        "langflow_application_token_present": bool(app_token),
        "langflow_application_token_masked": (app_token[:8] + '...' + app_token[-8:]) if app_token else None,
    }


# --- Async task queue (in-memory, ephemeral) ---
# This avoids holding the HTTP request open while upstream may take a long time.
_tasks: Dict[str, Dict] = {}
_tasks_lock = asyncio.Lock()


async def _run_langflow_task(task_id: str, message: str, user_id: Optional[str], langflow_token: Optional[str]):
    try:
        result = await process_travel_query(message=message, user_id=user_id, langflow_token=langflow_token)
        async with _tasks_lock:
            _tasks[task_id]["status"] = "done"
            _tasks[task_id]["result"] = result
    except Exception as e:
        async with _tasks_lock:
            _tasks[task_id]["status"] = "error"
            _tasks[task_id]["error"] = str(e)


@app.post("/chat/async", response_model=TaskCreated)
async def chat_with_ai_async(request: ChatRequest, token: Optional[str] = Depends(parse_bearer_token)):
    """Enqueue the chat request and return a task_id immediately. Poll `/chat/result/{task_id}` to get the result."""
    # Determine token source like in the synchronous endpoint
    user_email: Optional[str] = None
    langflow_api_token: Optional[str] = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub") or payload.get("email")
        except JWTError:
            raw = token.strip()
            if raw.startswith("AstraCS:") or raw.lower().startswith("astracs:"):
                langflow_api_token = raw
            else:
                print("[DEBUG] Incoming bearer token failed JWT decode and is not an Astra token; using configured application token for Langflow upstream.")
    elif not ALLOW_ANONYMOUS_CHAT:
        raise HTTPException(status_code=401, detail="Authentication required")

    env_langflow_token = os.getenv('LANGFLOW_APPLICATION_TOKEN')
    if not langflow_api_token and env_langflow_token:
        langflow_api_token = env_langflow_token

    task_id = str(uuid.uuid4())
    async with _tasks_lock:
        _tasks[task_id] = {"status": "pending", "result": None, "error": None}

    # Schedule background processing
    asyncio.create_task(_run_langflow_task(task_id, request.message, request.user_id or user_email, langflow_api_token))

    return TaskCreated(task_id=task_id)


@app.get("/chat/result/{task_id}", response_model=TaskResult)
async def chat_result(task_id: str):
    async with _tasks_lock:
        task = _tasks.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return TaskResult(task_id=task_id, status=task["status"], result=task.get("result"), error=task.get("error"))
