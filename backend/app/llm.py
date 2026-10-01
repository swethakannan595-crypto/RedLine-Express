"""One function to talk to any LLM. Provider is chosen in .env."""
from openai import OpenAI

from .config import PROVIDER, PROVIDERS


def info() -> dict:
    return {"provider": PROVIDER, "model": PROVIDERS[PROVIDER]["model"]}


def chat(system: str, user: str) -> str:
    cfg = PROVIDERS[PROVIDER]
    if PROVIDER != "ollama" and not cfg["api_key"]:
        raise RuntimeError(f"API key for '{PROVIDER}' is empty. Add it to backend/.env")

    client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"])
    res = client.chat.completions.create(
        model=cfg["model"],
        temperature=0.2,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return res.choices[0].message.content
