"""Centralizes the Groq client used by evidence-extraction and the chatbot.
Absent GROQ_API_KEY, get_client() returns None so callers can degrade
gracefully (same stub pattern the Anthropic client used before this swap).
"""
import os

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

_client = None
if GROQ_API_KEY:
    from groq import Groq

    _client = Groq(api_key=GROQ_API_KEY)


def get_client():
    return _client


def set_api_key(api_key: str, model: str | None = None) -> None:
    global _client, GROQ_MODEL
    from groq import Groq

    _client = Groq(api_key=api_key)
    if model:
        GROQ_MODEL = model


def chat_completion(messages: list[dict], max_tokens: int = 200) -> str:
    response = _client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=max_tokens,
        messages=messages,
    )
    return response.choices[0].message.content.strip()
