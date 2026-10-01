import os
from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()

# Ollama, Gemini and OpenRouter all speak the OpenAI API format,
# so switching provider = switching base_url + key + model.
PROVIDERS = {
    "ollama": {
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        "api_key": "ollama",  # Ollama ignores the key
        "model": os.getenv("OLLAMA_MODEL", "llama3.2"),
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key": os.getenv("GEMINI_API_KEY", ""),
        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": os.getenv("OPENROUTER_API_KEY", ""),
        "model": os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
    },
}

if PROVIDER not in PROVIDERS:
    raise ValueError(f"LLM_PROVIDER must be one of {list(PROVIDERS)}, got '{PROVIDER}'")

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 800))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 150))
TOP_K = int(os.getenv("TOP_K", 4))
