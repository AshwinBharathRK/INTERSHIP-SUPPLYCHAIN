"""AI Copilot: GPT via Emergent Universal LLM key, grounded in live platform data."""
import os
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

load_dotenv(Path(__file__).parent / ".env")

SYSTEM_PROMPT = """You are Atlas, the AI Supply Chain Copilot embedded in an enterprise
supply chain digital twin platform. You have live access to the platform's real
operational data, which is injected below as CONTEXT for every question.

Rules:
- Ground every answer in the CONTEXT numbers. Quote specific SKUs, warehouses,
  suppliers and metrics when relevant.
- Be concise and executive-grade: short paragraphs, bullet lists, concrete actions.
- When asked for recommendations, prioritize by financial impact and risk.
- If the context does not contain the answer, say what data would be needed.
- Never invent numbers that are not in the context."""


def _build_chat(session_id: str, context: str) -> LlmChat:
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    system = SYSTEM_PROMPT + "\n\n=== LIVE PLATFORM CONTEXT ===\n" + context
    return LlmChat(api_key=api_key, session_id=session_id, system_message=system).with_model("openai", "gpt-5.4")


async def ask_copilot(question: str, context: str, session_id: str = "copilot") -> str:
    """Non-streaming completion (used by tests and simple calls)."""
    chat = _build_chat(session_id, context)
    response = await chat.send_message(UserMessage(text=question))
    return str(response)


async def stream_copilot(question: str, context: str, history: list[dict] | None = None,
                         session_id: str = "copilot"):
    """Async generator yielding text deltas (for SSE streaming)."""
    chat = _build_chat(session_id, context)
    # replay condensed history for multi-turn grounding
    if history:
        condensed = "\n".join(f"{m['role']}: {m['content'][:400]}" for m in history[-6:])
        question = f"(Previous conversation:\n{condensed}\n)\n\nUser question: {question}"
    async for event in chat.stream_message(UserMessage(text=question)):
        if isinstance(event, TextDelta):
            yield event.content
        elif isinstance(event, StreamDone):
            break
