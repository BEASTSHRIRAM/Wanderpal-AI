import httpx
import os
from typing import Dict, Any, Optional, Union, List
import json
from urllib.parse import urljoin
import asyncio

class LangflowClient:
    def __init__(self, base_url: Optional[str] = None, application_token: Optional[str] = None):
        """
        Initialize Langflow client without crashing if not configured. Callers should
        check `is_configured` before using.

        Args:
            base_url: Langflow server URL (e.g., http://127.0.0.1:7860 or your hosted URL)
            application_token: Your Langflow application token
        """
        env_base = os.getenv("LANGFLOW_BASE_URL", "http://127.0.0.1:7860")
        self.base_url = (base_url or env_base or "").rstrip('/')
        self.application_token = application_token or os.getenv('LANGFLOW_APPLICATION_TOKEN')
        self.is_configured = bool(self.base_url and self.application_token)
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers for Langflow API requests"""
        token = self.application_token
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers
    
    async def run_flow(
        self,
        flow_id: str,
        message: str,
        tweaks: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
        timeout: float = 60.0,
        auth_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run a Langflow flow with the given message
        
        Args:
            flow_id: The ID of your Langflow flow
            message: User message to send to the flow
            tweaks: Optional tweaks to modify flow behavior
            session_id: Optional session ID for conversation continuity
            
        Returns:
            Dict containing the flow response
        """
        url = f"{self.base_url}/api/v1/run/{flow_id}"
        
        payload = {
            "input_value": message,
            "output_type": "chat",
            "input_type": "chat",
        }
        
        if tweaks:
            payload["tweaks"] = tweaks
            
        if session_id:
            payload["session_id"] = session_id
        
        try:
            if not self.application_token and not auth_token:
                # No token available for upstream request
                raise RuntimeError("No Langflow application token available for upstream request.")

            async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
                headers = self.get_headers()
                if auth_token:
                    headers["Authorization"] = f"Bearer {auth_token}"
                    # Also provide common alternate header names that some hosted endpoints expect
                    headers.setdefault("x-api-key", auth_token)
                    headers.setdefault("x-astra-token", auth_token)

                # Debug: print the outgoing headers keys and masked auth token (do not print full secret)
                def mask(t: Optional[str]) -> str:
                    if not t:
                        return "<none>"
                    try:
                        return t[:8] + "..." + t[-8:]
                    except Exception:
                        return "<token>"

                masked_auth = None
                if "Authorization" in headers:
                    val = headers["Authorization"]
                    # Remove 'Bearer ' prefix for masking raw token
                    raw = val.split(" ", 1)[1] if " " in val else val
                    masked_auth = mask(raw)
                print(f"[DEBUG] Posting to {url} with headers keys={list(headers.keys())} masked_auth={masked_auth}")
                # Perform POST with retries for transient 5xx/504 and timeouts, preserving Authorization on redirects.
                max_retries = int(os.getenv("LANGFLOW_MAX_RETRIES", "1"))
                attempt = 0
                response = None
                current_timeout = timeout
                # Use a shorter backoff to fail faster when upstream consistently returns 504
                while attempt <= max_retries:
                    try:
                        # First request without auto-follow so we can preserve Authorization on cross-host redirects
                        # Use per-attempt timeout so we can increase it between attempts if needed
                        response = await client.post(url, json=payload, headers=headers, timeout=current_timeout)
                        # If server responds with a redirect, follow it explicitly while preserving headers
                        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
                            location = response.headers.get("location")
                            if location:
                                next_url = urljoin(url, location)
                                print(f"[DEBUG] Redirect from {url} -> {next_url}; reposting with Authorization preserved")
                                response = await client.post(next_url, json=payload, headers=headers, timeout=current_timeout)

                        # If response is a transient server error, retry
                        if response.status_code in (502, 503, 504):
                            # If we still have attempts left, retry quickly. Otherwise surface a clear error.
                            if attempt < max_retries:
                                backoff = 0.5 * (2 ** attempt)
                                print(f"[DEBUG] Transient {response.status_code} response, retrying after {backoff}s (attempt {attempt+1})")
                                await asyncio.sleep(backoff)
                                attempt += 1
                                # increase per-attempt timeout a bit for the next try but cap it
                                current_timeout = min(current_timeout * 1.5, 120)
                                continue
                            else:
                                # No retries left — raise a clear error so the caller can return a friendly message
                                raise Exception(f"Langflow upstream returned {response.status_code} (gateway timeout or service unavailable)")
                        break
                    except httpx.TimeoutException:
                        # Timeout — retry if allowed, otherwise escalate quickly with a friendly message.
                        if attempt < max_retries:
                            backoff = 0.5 * (2 ** attempt)
                            print(f"[DEBUG] Timeout on attempt {attempt+1}, retrying after {backoff}s")
                            await asyncio.sleep(backoff)
                            attempt += 1
                            current_timeout = min(current_timeout * 1.5, 120)
                            continue
                        else:
                            raise Exception("Langflow request timed out")

                # If we get a 401 indicating missing bearer token, try a few alternate header shapes
                if response is not None and response.status_code == 401:
                    body_snippet = (response.text or "")[:800]
                    print(f"[DEBUG] Initial run_flow response 401: {body_snippet}")
                    raw_token = None
                    if "Authorization" in headers:
                        raw_token = headers["Authorization"].split(" ", 1)[1] if " " in headers["Authorization"] else headers["Authorization"]

                    alt_attempts = []
                    if raw_token:
                        h1 = {**headers}
                        h1["Authorization"] = raw_token
                        h1.pop("x-api-key", None)
                        h1.pop("x-astra-token", None)
                        alt_attempts.append(("Authorization-raw", h1))
                        h2 = {"Content-Type": "application/json", "x-api-key": raw_token}
                        alt_attempts.append(("x-api-key", h2))
                        h3 = {"Content-Type": "application/json", "x-astra-token": raw_token}
                        alt_attempts.append(("x-astra-token", h3))

                    for label, alt_headers in alt_attempts:
                        try:
                            print(f"[DEBUG] Retrying run_flow with alt headers: {label}")
                            alt_resp = await client.post(url, json=payload, headers=alt_headers)
                            alt_resp.raise_for_status()
                            try:
                                return alt_resp.json()
                            except ValueError:
                                return {"_raw_text": alt_resp.text}
                        except httpx.HTTPStatusError as e:
                            print(f"[DEBUG] Alt attempt {label} failed: {e.response.status_code}")

                if response is None:
                    raise Exception("No response from Langflow upstream")
                response.raise_for_status()
                try:
                    return response.json()
                except ValueError:
                    # Non-JSON response (HTML or plain text). Return raw text under a key the extractor understands.
                    return {"_raw_text": response.text}

        except httpx.HTTPStatusError as e:
            error_detail = f"HTTP {e.response.status_code}: {e.response.text}"
            raise Exception(f"Langflow API error: {error_detail}")
        except httpx.TimeoutException:
            raise Exception("Langflow request timed out")
        except Exception as e:
            raise Exception(f"Failed to connect to Langflow: {str(e)}")

    async def run_flow_url(
        self,
        run_url: str,
        message: str,
        tweaks: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
        timeout: float = 60.0,
        auth_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run a Langflow flow using a full endpoint URL, e.g. the Astra DataStax URL
        "https://api.langflow.astra.datastax.com/lf/<workspace-id>/api/v1/run/<flow-id>".
        """
        if not run_url:
            raise ValueError("run_url is required")
        payload = {
            "input_value": message,
            "output_type": "chat",
            "input_type": "chat",
        }
        if tweaks:
            payload["tweaks"] = tweaks
        if session_id:
            payload["session_id"] = session_id

        try:
            if not self.application_token and not auth_token:
                raise RuntimeError("LANGFLOW_APPLICATION_TOKEN is not set for run_flow_url.")
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
                headers = self.get_headers()
                if auth_token:
                    headers["Authorization"] = f"Bearer {auth_token}"
                    headers.setdefault("x-api-key", auth_token)
                    headers.setdefault("x-astra-token", auth_token)

                # Debug outgoing headers
                def mask(t: Optional[str]) -> str:
                    if not t:
                        return "<none>"
                    try:
                        return t[:8] + "..." + t[-8:]
                    except Exception:
                        return "<token>"

                masked_auth = None
                if "Authorization" in headers:
                    val = headers["Authorization"]
                    raw = val.split(" ", 1)[1] if " " in val else val
                    masked_auth = mask(raw)
                print(f"[DEBUG] Posting to {run_url} with headers keys={list(headers.keys())} masked_auth={masked_auth}")
                # Perform POST with retries for transient 5xx/504 and timeouts, preserving Authorization on redirects.
                max_retries = int(os.getenv("LANGFLOW_MAX_RETRIES", "1"))
                attempt = 0
                response = None
                current_timeout = timeout
                while attempt <= max_retries:
                    try:
                        # Use per-attempt timeout so adjustments take effect
                        response = await client.post(run_url, json=payload, headers=headers, timeout=current_timeout)
                        # Handle redirect explicitly so Authorization header isn't stripped by client
                        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
                            location = response.headers.get("location")
                            if location:
                                next_url = urljoin(run_url, location)
                                print(f"[DEBUG] Redirect from {run_url} -> {next_url}; reposting with Authorization preserved")
                                response = await client.post(next_url, json=payload, headers=headers, timeout=current_timeout)

                        if response.status_code in (502, 503, 504):
                            if attempt < max_retries:
                                backoff = 0.5 * (2 ** attempt)
                                print(f"[DEBUG] Transient {response.status_code} response on run_url, retrying after {backoff}s (attempt {attempt+1})")
                                await asyncio.sleep(backoff)
                                attempt += 1
                                current_timeout = min(current_timeout * 1.5, 120)
                                continue
                            else:
                                raise Exception(f"Langflow upstream returned {response.status_code} (gateway timeout or service unavailable)")
                        break
                    except httpx.TimeoutException:
                        if attempt < max_retries:
                            backoff = 0.5 * (2 ** attempt)
                            print(f"[DEBUG] Timeout on run_url attempt {attempt+1}, retrying after {backoff}s")
                            await asyncio.sleep(backoff)
                            attempt += 1
                            current_timeout = min(current_timeout * 1.5, 120)
                            continue
                        else:
                            raise Exception("Langflow request timed out")
                # If we get a 401 indicating missing bearer token, try a few alternate header shapes
                if response.status_code == 401:
                    body_snippet = (response.text or "")[:800]
                    print(f"[DEBUG] Initial run_url response 401: {body_snippet}")
                    # Prepare alternative header variants to try
                    raw_token = None
                    if "Authorization" in headers:
                        raw_token = headers["Authorization"].split(" ", 1)[1] if " " in headers["Authorization"] else headers["Authorization"]

                    alt_attempts = []
                    if raw_token:
                        # 1) Authorization without 'Bearer '
                        h1 = {**headers}
                        h1["Authorization"] = raw_token
                        # remove alt headers that might conflict
                        h1.pop("x-api-key", None)
                        h1.pop("x-astra-token", None)
                        alt_attempts.append(("Authorization-raw", h1))
                        # 2) x-api-key only
                        h2 = {"Content-Type": "application/json", "x-api-key": raw_token}
                        alt_attempts.append(("x-api-key", h2))
                        # 3) x-astra-token only
                        h3 = {"Content-Type": "application/json", "x-astra-token": raw_token}
                        alt_attempts.append(("x-astra-token", h3))

                    for label, alt_headers in alt_attempts:
                        try:
                            print(f"[DEBUG] Retrying run_url with alt headers: {label}")
                            alt_resp = await client.post(run_url, json=payload, headers=alt_headers)
                            alt_resp.raise_for_status()
                            try:
                                return alt_resp.json()
                            except ValueError:
                                return {"_raw_text": alt_resp.text}
                        except httpx.HTTPStatusError as e:
                            print(f"[DEBUG] Alt attempt {label} failed: {e.response.status_code}")

                response.raise_for_status()
                try:
                    return response.json()
                except ValueError:
                    return {"_raw_text": response.text}
        except httpx.HTTPStatusError as e:
            error_detail = f"HTTP {e.response.status_code}: {e.response.text}"
            raise Exception(f"Langflow API error: {error_detail}")
        except httpx.TimeoutException:
            raise Exception("Langflow request timed out")
        except Exception as e:
            raise Exception(f"Failed to connect to Langflow: {str(e)}")
    
    async def get_flow_info(self, flow_id: str) -> Dict[str, Any]:
        """
        Get information about a specific flow
        
        Args:
            flow_id: The ID of your Langflow flow
            
        Returns:
            Dict containing flow information
        """
        url = f"{self.base_url}/api/v1/flows/{flow_id}"
        
        try:
            if not self.is_configured:
                raise RuntimeError("Langflow client is not configured. Set LANGFLOW_BASE_URL and LANGFLOW_APPLICATION_TOKEN.")
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(url, headers=self.get_headers())
                response.raise_for_status()
                try:
                    return response.json()
                except ValueError:
                    return {"_raw_text": response.text}
        except Exception as e:
            raise Exception(f"Failed to get flow info: {str(e)}")
    
    def extract_response_text(self, response: Dict[str, Any]) -> str:
        """
        Extract the text response from Langflow API response
        
        Args:
            response: The response from run_flow method
            
        Returns:
            Extracted text response
        """
        try:
            # Helper to collect any 'text' fields in nested structures
            def collect_text(obj: Union[Dict[str, Any], List[Any], Any], acc: List[str]):
                if isinstance(obj, dict):
                    # Common Langflow structure
                    if "results" in obj and isinstance(obj["results"], dict):
                        msg = obj["results"].get("message") or obj["results"].get("text")
                        if isinstance(msg, dict):
                            text_val = msg.get("text") or msg.get("content")
                            if text_val:
                                acc.append(str(text_val))
                        elif isinstance(msg, str):
                            acc.append(msg)
                    # Generic 'text'
                    if "text" in obj and isinstance(obj["text"], str):
                        acc.append(obj["text"])
                    for v in obj.values():
                        collect_text(v, acc)
                elif isinstance(obj, list):
                    for item in obj:
                        collect_text(item, acc)

            # Try known path first
            if "outputs" in response and response["outputs"]:
                outputs = response["outputs"]
                if isinstance(outputs, list) and outputs:
                    first_output = outputs[0]
                    if "outputs" in first_output and first_output["outputs"]:
                        nested_outputs = first_output["outputs"]
                        if isinstance(nested_outputs, list) and nested_outputs:
                            maybe = nested_outputs[0].get("results", {}).get("message", {}).get("text")
                            if maybe:
                                return str(maybe)

            # Fallback: deep search
            acc: List[str] = []
            collect_text(response, acc)
            # If upstream returned raw text (non-JSON), return that verbatim
            if not acc and isinstance(response, dict) and "_raw_text" in response:
                return response.get("_raw_text", "").strip()
            acc = [s.strip() for s in acc if s and s.strip()]
            if acc:
                # Deduplicate while preserving order
                seen = set()
                ordered: List[str] = []
                for s in acc:
                    if s not in seen:
                        seen.add(s)
                        ordered.append(s)
                return "\n\n".join(ordered)

            return "I'm here to help plan your trip, but I couldn't read a response from Langflow. Please verify your flow output." 

        except Exception as e:
            return f"Error processing response: {str(e)}"


_langflow_client: Optional[LangflowClient] = None

def get_langflow_client() -> Optional[LangflowClient]:
    """Get or create global Langflow client instance. Returns None if not configured."""
    global _langflow_client
    if _langflow_client is None:
        base_url = os.getenv('LANGFLOW_BASE_URL', 'http://127.0.0.1:7860')
        application_token = os.getenv('LANGFLOW_APPLICATION_TOKEN')
        _langflow_client = LangflowClient(base_url=base_url, application_token=application_token)
    return _langflow_client if _langflow_client.is_configured else None

async def process_travel_query(message: str, user_id: str = None, langflow_token: Optional[str] = None) -> str:
    """
    Process a travel query through Langflow
    
    Args:
        message: User's travel query/message
        user_id: Optional user ID for session management
        
    Returns:
        AI response from Langflow
    """
    try:
        client = get_langflow_client()
        # If caller provided a langflow_token (Astra token), prefer it by creating or overriding
        if langflow_token:
            if client is None:
                client = LangflowClient(application_token=langflow_token)
            else:
                # override the configured application token for this call
                client.application_token = langflow_token

        if client is None and not os.getenv('LANGFLOW_RUN_URL'):
            return (
                "Langflow isn't configured yet. Set either 'LANGFLOW_RUN_URL' (full Astra URL) or 'LANGFLOW_BASE_URL' + 'LANGFLOW_FLOW_ID', and 'LANGFLOW_APPLICATION_TOKEN'."
            )

        # Optional: Add tweaks to customize the flow behavior (kept empty by default)
        tweaks: Dict[str, Any] = {}

        # Safety: preflight token/size checks to avoid sending extremely large messages that exceed
        # the model's tokens-per-minute or per-request limits.
        try:
            max_tokens_env = int(os.getenv("LANGFLOW_MAX_TOKENS", "8000"))
        except Exception:
            max_tokens_env = 8000
        # Very simple heuristic: use character count as an estimator for tokens (~4 chars/token)
        estimated_tokens = max(1, len(message) // 4)
        if estimated_tokens > max_tokens_env:
            return (
                f"Your message is too large ({estimated_tokens} tokens estimated). Please shorten the message or split it into smaller requests. "
                f"Current limit is {max_tokens_env} tokens."
            )

        run_url = os.getenv('LANGFLOW_RUN_URL')
        timeout = float(os.getenv("LANGFLOW_TIMEOUT_SECONDS", "180"))
        if run_url:
            # Direct Astra URL path
            if client is None:
                client = LangflowClient(application_token=os.getenv('LANGFLOW_APPLICATION_TOKEN') or langflow_token)
            # Prefer explicit token argument, then env var, then any provided langflow_token
            auth_token = langflow_token or os.getenv('LANGFLOW_APPLICATION_TOKEN')
            try:
                response = await client.run_flow_url(
                run_url=run_url,
                message=message,
                tweaks=tweaks,
                session_id=user_id,
                timeout=timeout,
                auth_token=auth_token,
            )
            except Exception as e:
                # If upstream returned a rate-limit or 'request too large' error, try to detect and give
                # a helpful message to the user instead of opaque text.
                err_text = str(e)
                # Look for common rate-limit/request-too-large signals in the message
                if "rate_limit_exceeded" in err_text or "Request too large" in err_text or "tokens per minute" in err_text:
                    return (
                        "The language model rejected the request because it requested too many tokens or hit a rate limit. "
                        "Please shorten your query or try again later. If this is a recurring need, consider using a smaller model or upgrading your service tier."
                    )
                # Re-raise otherwise so higher-level handler can surface the error
                raise
        else:
            flow_id = os.getenv('LANGFLOW_FLOW_ID')
            if not flow_id or flow_id.strip().lower() in {"", "your_flow_id_here", "<your_flow_id>"}:
                return (
                    "Missing 'LANGFLOW_FLOW_ID'. Please provide your Langflow flow ID to enable the trip planning agent."
                )
            response = await client.run_flow(
                flow_id=flow_id,
                message=message,
                tweaks=tweaks,
                session_id=user_id,  # Use user_id as session_id for conversation continuity
                timeout=timeout,
            )

        # Extract text from response
        ai_response = client.extract_response_text(response)
        if not ai_response:
            ai_response = "I processed your request, but didn't receive text output from the Langflow trip agent."
        return ai_response

    except Exception as e:
        print(f"Error processing travel query: {str(e)}")
        return f"I'm sorry, I encountered an error while processing your request: {str(e)}"


# Configuration helper
def setup_langflow_config():
    """
    Helper function to set up Langflow configuration
    Call this to check if all required environment variables are set
    """
    required_vars = ['LANGFLOW_BASE_URL', 'LANGFLOW_APPLICATION_TOKEN', 'LANGFLOW_FLOW_ID']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease set these in your .env file or environment")
        return False
    
    print("Langflow configuration is complete!")
    return True
