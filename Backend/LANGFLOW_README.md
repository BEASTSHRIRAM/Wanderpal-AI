# Langflow Integration for WanderPal

This integration connects your WanderPal chat interface with Langflow for AI-powered travel planning.

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and fill in your credentials:

```powershell
cd Backend
cp .env.example .env
```

Edit `.env` and set these values:

```env
# Langflow Configuration
LANGFLOW_BASE_URL=http://127.0.0.1:7860  # Your Langflow server URL
LANGFLOW_APPLICATION_TOKEN=your_token_here  # From Langflow settings
LANGFLOW_FLOW_ID=your_flow_id_here  # From your flow URL
```

### 2. Getting Your Langflow Credentials

#### Application Token:
1. Open Langflow in your browser
2. Go to Settings → API Keys
3. Create a new API key
4. Copy the token to your `.env` file

#### Flow ID:
1. Open your travel planning flow in Langflow
2. Look at the URL: `http://localhost:7860/flow/YOUR_FLOW_ID_HERE`
3. Copy the flow ID to your `.env` file

### 3. Testing the Integration

Test your Langflow setup:

```powershell
cd Backend
python test_langflow.py
```

This will verify your configuration and test sample queries.

### 4. Running the Application

Start your FastAPI backend:

```powershell
cd Backend
uvicorn main:app --reload
```

The chat endpoint will be available at: `http://localhost:8000/chat`

## API Usage

### Chat Endpoint

**POST** `/chat`

Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Request Body:
```json
{
  "message": "I want to plan a trip to Paris",
  "user_id": "optional_user_id"
}
```

Response:
```json
{
  "response": "AI response from Langflow",
  "user_id": "user_id_or_email"
}
```

## Frontend Integration

The Chat.tsx component automatically sends messages to the backend chat endpoint. When users type messages in the chat interface, they are processed through your Langflow workflow.

## Flow Structure Recommendations

Your Langflow flow should include:

1. **Chat Input** - To receive user messages
2. **Context/Memory** - To maintain conversation history
3. **Travel Planning Logic** - Your custom travel planning components
4. **Output** - To return formatted responses

Example flow components:
- Text Input → Prompt Template → LLM → Text Output
- Memory components for conversation continuity
- Custom tools for hotel search, attraction lookup, etc.

## Troubleshooting

### Common Issues:

1. **"Application token is required" error**
   - Check your `.env` file has `LANGFLOW_APPLICATION_TOKEN` set
   - Verify the token is valid in Langflow settings

2. **"Flow not found" error**
   - Verify `LANGFLOW_FLOW_ID` matches your flow ID
   - Ensure the flow is deployed in Langflow

3. **Connection timeout**
   - Check if Langflow server is running
   - Verify `LANGFLOW_BASE_URL` is correct

4. **Response extraction issues**
   - The `extract_response_text()` function may need adjustment based on your flow structure
   - Check the flow output format and modify the extraction logic accordingly

### Debug Tips:

1. Run `test_langflow.py` to isolate Langflow issues
2. Check Langflow logs for errors
3. Use the Langflow playground to test your flow manually
4. Enable debug logging in FastAPI for detailed error messages

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive credentials
- Consider implementing rate limiting for the chat endpoint
- Validate and sanitize user inputs before sending to Langflow

## Customization

### Modifying Response Processing:

Edit the `extract_response_text()` function in `langflow.py` to match your flow's output structure.

### Adding Flow Tweaks:

Modify the `tweaks` parameter in `process_travel_query()` to customize flow behavior:

```python
tweaks = {
    "OpenAI-xxxxx": {"temperature": 0.7},
    "Prompt-xxxxx": {"template": "Custom prompt template..."}
}
```

### Session Management:

The integration uses user email as session ID for conversation continuity. Modify this in the chat endpoint if needed.