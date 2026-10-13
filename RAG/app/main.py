from contextlib import asynccontextmanager

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.services.embedding import EmbeddingService
from app.api.routes.search import router as search_router
from app.api.routes.documents import router as documents_router
from app.api.routes.chat import router as chat_router
from app.services.llm import LLMService
from app.services.query_rewriter import QueryRewriter
from app.services.reranker import Reranker
from app.services.chat import ChatService

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    app.state.embedding_service = await asyncio.to_thread(
        EmbeddingService,
        settings.embedding_model,
    )
    app.state.llm_service = LLMService(
        provider=settings.llm_provider,
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
    )
    app.state.chat_service = ChatService(
        query_rewriter=QueryRewriter(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
        ),
        reranker=Reranker(),
        llm=app.state.llm_service,
    )

    yield

    app.state.embedding_service = None
    app.state.llm_service = None
    app.state.chat_service = None

app = FastAPI(
    title="RAG Platform",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(documents_router)
app.include_router(chat_router)
@app.get("/health")
async def health():
    return {"status": "ok"}