import httpx
import asyncio
import os

API_KEY = "6CIYq3OVlXswA9FW4eME6Hqv"

endpoints = [
    "https://cloud.olakrutrim.com/v1/chat/completions",
    "https://cloud.olakrutrim.com/api/v1/chat/completions",
    "https://api.olakrutrim.com/v1/chat/completions"
]

def log(msg):
    print(msg)
    with open("test_api.log", "a") as f:
        f.write(msg + "\n")

async def test_endpoint(url):
    log(f"Testing {url}...")
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    if url.endswith("/models"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers)
                log(f"Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    model_ids = [m['id'] for m in data.get('data', [])]
                    log(f"Available Models: {', '.join(model_ids)}")
                    return True
                else:
                    log(f"Response snippet: {response.text[:200]}")
        except Exception as e:
            log(f"Error: {e}")
        return False

    payload = {
        "model": os.getenv("KRUTRIM_MODEL", "Llama-3.3-70B-Instruct"),
        "messages": [{"role": "user", "content": "hi"}],
        "max_tokens": 5
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            log(f"Status: {response.status_code}")
            if response.status_code == 200:
                log(f"Success! {url}")
                return True
            else:
                log(f"Response snippet: {response.text[:200]}")
    except Exception as e:
        log(f"Error: {e}")
    return False

async def main():
    if os.path.exists("test_api.log"):
        os.remove("test_api.log")
        
    test_urls = [
        "https://cloud.olakrutrim.com/v1/models",
        "https://cloud.olakrutrim.com/api/v1/models",
        "https://cloud.olakrutrim.com/v1/chat/completions",
        "https://cloud.olakrutrim.com/api/v1/chat/completions"
    ]
    for url in test_urls:
        await test_endpoint(url)
    
if __name__ == "__main__":
    asyncio.run(main())
