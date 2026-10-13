REWRITE_INSTRUCTIONS = """
You rewrite user questions into standalone search queries.

Your task is ONLY to produce the search query.

Rules:
1. Resolve references such as "it", "they", "that", and "this".
2. Use conversation history only to resolve ambiguity.
3. Preserve important technical terms and proper nouns.
4. Do not answer the question.
5. Do not add information that is not present in the conversation.
6. If the user's question is already standalone, return it unchanged.
7. Return only the rewritten search query.
"""

class QueryRewriter:

    def __init__(
        self,
        model: str,
        base_url: str = "http://127.0.0.1:11434",
    ):
        self.model = model
        self.base_url = base_url.rstrip("/")

    async def rewrite(
        self,
        history: list[dict],
        question: str,
    ) -> str:

        if not history:
            return question

        recent_user_messages = [
            message["content"]
            for message in history[-4:]
            if message["role"] == "user"
        ]
        if not recent_user_messages:
            return question
        return f"{recent_user_messages[-1]} {question}".strip()