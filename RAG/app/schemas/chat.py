import uuid

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    tenant_id: str = "default"
    user_id: str = "default"
    conversation_id: uuid.UUID | None = None

    message: str = Field(
        min_length=1,
        max_length=10_000,
    )


class Citation(BaseModel):
    source_id: int
    document_id: str
    document_name: str
    chunk_id: str
    similarity: float
    page_number: int | None = None
    section: str | None = None


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID | None = None
    answer: str
    citations: list[Citation]