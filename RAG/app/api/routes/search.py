from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.search import SearchRequest, SearchResponse, Searchresult
from app.services.hybrid_search import hybrid_search
from app.core.config import settings

router = APIRouter(prefix="/api/v1/search", tags=["search"])

@router.post("", response_model=SearchResponse)
async def search(
    request: Request,
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    chunks = await hybrid_search(
        db,
        request.app.state.embedding_service,
        payload.query,
        payload.tenant_id,
        payload.top_k,
        candidate_k=settings.rag_candidate_k,
        similarity_threshold=settings.rag_similarity_threshold,
    )
    return SearchResponse(
        results=[
            Searchresult(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                document_name=chunk.document_name,
                content=chunk.content,
                similarity=chunk.score,
                page_number=chunk.page_number,
            )
            for chunk in chunks
        ]
    )