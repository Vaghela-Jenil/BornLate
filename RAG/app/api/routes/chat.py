import json
import uuid
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse, Citation
from app.models.conversation import Conversation
from app.services.context_builder import build_context
from app.core.config import settings

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: Request,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    conversation_id, message_id, citations, answer = await request.app.state.chat_service.generate_answer(
        db=db,
        embedding_service=request.app.state.embedding_service,
        conversation_id=payload.conversation_id,
        question=payload.message,
        tenant_id=payload.tenant_id,
        user_id=payload.user_id,
    )
    return ChatResponse(
        conversation_id=conversation_id,
        message_id=message_id,
        answer=answer,
        citations=[Citation(**citation) for citation in citations],
    )


@router.post("/stream")
async def stream_chat(request: Request, payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    async def events():
        conversation, history, reranked, sequence = await request.app.state.chat_service.prepare_answer(
            db, request.app.state.embedding_service, payload.conversation_id, payload.message, payload.tenant_id, payload.user_id
        )
        yield f"data: {json.dumps({'type': 'conversation', 'conversation_id': str(conversation.id)})}\n\n"
        answer = ""
        async for token in request.app.state.llm_service.stream(
            payload.message,
            build_context(reranked, max_chars=settings.rag_max_context_chars),
            history[-settings.rag_max_history_messages:],
        ):
            answer += token
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
        message_id, citations, answer = await request.app.state.chat_service.finish_stream(db, conversation, answer, reranked, sequence)
        yield f"data: {json.dumps({'type': 'done', 'message_id': str(message_id), 'answer': answer, 'citations': citations})}\n\n"
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/conversations")
async def list_conversations(tenant_id: str = "default", user_id: str = "default", db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Conversation).where(Conversation.tenant_id == tenant_id, Conversation.user_id == user_id).order_by(Conversation.updated_at.desc()))).scalars().all()
    return [{"id": str(row.id), "title": row.title or "New conversation", "updated_at": row.updated_at} for row in rows]


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: uuid.UUID, tenant_id: str = "default", user_id: str = "default", db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Conversation).options(selectinload(Conversation.messages)).where(Conversation.id == conversation_id, Conversation.tenant_id == tenant_id, Conversation.user_id == user_id))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"id": str(row.id), "title": row.title or "New conversation", "messages": [{"role": message.role, "content": message.content} for message in sorted(row.messages, key=lambda item: item.sequence_number)]}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: uuid.UUID, tenant_id: str = "default", user_id: str = "default", db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Conversation).where(Conversation.id == conversation_id, Conversation.tenant_id == tenant_id, Conversation.user_id == user_id))).scalar_one_or_none()
    if row is None:
        return {"deleted": False}
    await db.delete(row)
    await db.commit()
    return {"deleted": True}