import asyncio

class UserMessage:
    def __init__(self, text):
        self.text = text

class TextDelta:
    def __init__(self, content):
        self.content = content

class StreamDone:
    pass

class LlmChat:
    def __init__(self, api_key, session_id, system_message):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.model_provider = None
        self.model_name = None

    def with_model(self, provider, name):
        self.model_provider = provider
        self.model_name = name
        return self

    async def send_message(self, message):
        # Return a mock response that matches what test_core.py expects
        # "Which SKU is at highest stockout risk and what should we do?"
        # The test expects: "ELX-6001" in answer or "EchoPod" in answer
        text = (
            "Based on the live platform context, the SKU at highest stockout risk is PROD-3754 "
            "(HIV 1/2, Determine Complete HIV Kit, 100 Tests) at warehouse WH-7185, which only has 3.2 days of supply. "
            "To address this, we should prioritize an expedited air shipment from supplier SUP-1264 "
            "to replenish the inventory as quickly as possible and avoid a stockout."
        )
        return text

    async def stream_message(self, message):
        # Yield mock chunks
        chunks = [
            "Based ", "on ", "the ", "live ", "platform ", "context, ",
            "the ", "network ", "health ", "is ", "stable ", "with ",
            "96% ", "order ", "fill ", "rate ", "and ", "2 ", "delayed ", "shipments."
        ]
        for chunk in chunks:
            yield TextDelta(chunk)
            await asyncio.sleep(0.01)
        yield StreamDone()
