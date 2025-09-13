
# Note: Replace **<YOUR_APPLICATION_TOKEN>** with your actual Application token
import requests
# The complete API endpoint URL for this flow
url = f"https://api.langflow.astra.datastax.com/lf/d0c29d20-be53-4ac7-ac33-5f58ffdb76cf/api/v1/run/1a4bd38d-81ed-4dfe-8d19-ba12ee7f324a"  

# Request payload configuration
payload = {
    "input_value": "hello world!",  # The input value to be processed by the flow
    "output_type": "chat",  # Specifies the expected output format
    "input_type": "chat"  # Specifies the input format
}

# Request headers
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer AstraCS:wUDZAZwOomPJwBwHuOZAtSZr:a888539a86bebfb19c454822ab114e95d613ef77153a9c0b902cebb87ad37850"  # Authentication key from environment variable'}
}

try:
    # Send API request
    response = requests.request("POST", url, json=payload, headers=headers)
    response.raise_for_status()  # Raise exception for bad status codes

    # Print response
    print(response.text)

except requests.exceptions.RequestException as e:
    print(f"Error making API request: {e}")
except ValueError as e:
    print(f"Error parsing response: {e}")
    