import re
import uuid
import logging

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.message import Message
from app.services.context_builder import build_context, estimate_tokens
from app.services.hybrid_search import hybrid_search
from app.core.config import settings

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self, query_rewriter, reranker, llm):
        self.query_rewriter = query_rewriter
        self.reranker = reranker
        self.llm = llm

    async def generate_answer(
        self,
        db: AsyncSession,
        embedding_service,
        conversation_id: uuid.UUID | None,
        question: str,
        tenant_id: str,
        user_id: str,
    ):
        conversation = await self._find_or_create_conversation(
            db, conversation_id, tenant_id, user_id, question
        )
        history_rows = (
            await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.sequence_number)
            )
        ).scalars().all()
        history = [
            {"role": message.role, "content": message.content}
            for message in history_rows
        ]
        next_sequence = len(history_rows) + 1
        db.add(
            Message(
                conversation_id=conversation.id,
                role="user",
                content=question,
                sequence_number=next_sequence,
            )
        )
        await db.flush()

        try:
            search_query = await self.query_rewriter.rewrite(history, question)
        except Exception:
            search_query = question

        candidates = await hybrid_search(
            db, embedding_service, search_query, tenant_id, top_k=settings.rag_candidate_k,
            candidate_k=settings.rag_candidate_k,
            similarity_threshold=settings.rag_similarity_threshold,
        )
        reranked = self.reranker.rerank(search_query, candidates, top_k=settings.rag_top_k)
        context = build_context(reranked, max_chars=settings.rag_max_context_chars)
        self._log_retrieval(question, search_query, candidates, reranked, context)
        answer = await self.llm.generate(
            question=question,
            context=context,
            history=history[-settings.rag_max_history_messages:],
        )
        answer, citations = self._validate_citations(answer, reranked)

        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            sequence_number=next_sequence + 1,
        )
        db.add(assistant_message)
        conversation.updated_at = func.now()
        await db.flush()
        await db.commit()
        return conversation.id, assistant_message.id, citations, answer

    async def prepare_answer(self, db, embedding_service, conversation_id, question, tenant_id, user_id):
        conversation = await self._find_or_create_conversation(db, conversation_id, tenant_id, user_id, question)
        rows = (await db.execute(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.sequence_number))).scalars().all()
        history = [{"role": message.role, "content": message.content} for message in rows]
        sequence = len(rows) + 1
        db.add(Message(conversation_id=conversation.id, role="user", content=question, sequence_number=sequence))
        await db.flush()
        try:
            search_query = await self.query_rewriter.rewrite(history, question)
        except Exception:
            search_query = question
        candidates = await hybrid_search(
            db,
            embedding_service,
            search_query,
            tenant_id,
            top_k=settings.rag_candidate_k,
            candidate_k=settings.rag_candidate_k,
            similarity_threshold=settings.rag_similarity_threshold,
        )
        reranked = self.reranker.rerank(search_query, candidates, top_k=settings.rag_top_k)
        context = build_context(reranked, max_chars=settings.rag_max_context_chars)
        self._log_retrieval(question, search_query, candidates, reranked, context)
        return conversation, history, reranked, sequence

    @staticmethod
    def _log_retrieval(question, search_query, candidates, selected, context):
        if not settings.rag_debug and selected:
            return
        logger.debug(
            "RAG retrieval query=%r rewritten=%r candidates=%s selected=%s "
            "context_chars=%d estimated_tokens=%d chunks=%s",
            question,
            search_query,
            len(candidates),
            len(selected),
            len(context),
            estimate_tokens(context),
            [
                {
                    "chunk_id": chunk.chunk_id,
                    "document_id": chunk.document_id,
                    "document_name": chunk.document_name,
                    "page": chunk.page_number,
                    "similarity": round(chunk.score, 4),
                }
                for chunk in selected
            ],
        )

    async def finish_stream(self, db, conversation, answer, reranked, sequence):
        answer, citations = self._validate_citations(answer, reranked)
        assistant = Message(conversation_id=conversation.id, role="assistant", content=answer, sequence_number=sequence + 1)
        db.add(assistant)
        conversation.updated_at = func.now()
        await db.commit()
        return assistant.id, citations, answer

    async def _find_or_create_conversation(
        self, db, conversation_id, tenant_id, user_id, question
    ):
        if conversation_id:
            conversation = (
                await db.execute(
                    select(Conversation).where(
                        Conversation.id == conversation_id,
                        Conversation.tenant_id == tenant_id,
                        Conversation.user_id == user_id,
                    )
                )
            ).scalar_one_or_none()
            if conversation is None:
                raise HTTPException(status_code=404, detail="Conversation not found")
            return conversation

        conversation = Conversation(
            tenant_id=tenant_id,
            user_id=user_id,
            title=question[:500],
        )
        db.add(conversation)
        await db.flush()
        return conversation

    @staticmethod
    def _validate_citations(answer, chunks):
        valid_ids = {str(index) for index in range(1, len(chunks) + 1)}
        referenced = set(re.findall(r"\[(\d+)\]", answer))
        invalid = referenced - valid_ids
        if invalid:
            answer = re.sub(
                r"\[(\d+)\]",
                lambda match: "" if match.group(1) in invalid else match.group(0),
                answer,
            )
        if chunks and not (referenced & valid_ids):
            answer = f"{answer.rstrip()}\n\nSources: " + " ".join(
                f"[{index}]" for index in range(1, len(chunks) + 1)
            )
        citations = [
            {
                "source_id": index,
                "document_id": chunk.document_id,
                "document_name": chunk.document_name,
                "chunk_id": chunk.chunk_id,
                "similarity": chunk.score,
                "page_number": chunk.page_number,
                "section": chunk.section,
            }
            for index, chunk in enumerate(chunks, start=1)
        ]
        return answer, citations