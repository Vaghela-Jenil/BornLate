import asyncio
import math
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunks import Chunk
from app.models.document_version import DocumentVersion
from app.models.document import Document
from app.services.context_builder import RetrievedChunk
from app.services.rrf import reciprocal_rank_fusion


def bm25_scores(corpus: list[list[str]], query: list[str]) -> list[float]:
    document_count = len(corpus)
    average_length = sum(map(len, corpus)) / document_count
    document_frequency = {
        term: sum(term in document for document in corpus)
        for term in set(query)
    }
    scores = []
    for document in corpus:
        term_counts = {term: document.count(term) for term in set(document)}
        score = 0.0
        for term in query:
            frequency = term_counts.get(term, 0)
            if not frequency:
                continue
            inverse_frequency = math.log(
                1 + (document_count - document_frequency[term] + 0.5)
                / (document_frequency[term] + 0.5)
            )
            denominator = frequency + 1.5 * (
                1 - 0.75 + 0.75 * len(document) / average_length
            )
            score += inverse_frequency * (frequency * 2.5) / denominator
        scores.append(score)
    return scores


async def hybrid_search(
    db: AsyncSession,
    embedding_service,
    query: str,
    tenant_id: str,
    top_k: int,
    candidate_k: int = 40,
    similarity_threshold: float = 0.35,
) -> list[RetrievedChunk]:
    query_vector = await asyncio.to_thread(embedding_service.embed, query)
    candidate_limit = min(max(candidate_k, top_k * 4, 20), 100)
    distance = Chunk.embedding.cosine_distance(query_vector)
    dense_rows = (
        await db.execute(
            select(Chunk, DocumentVersion.document_id, Document.filename, distance.label("distance"))
            .join(DocumentVersion, Chunk.document_version_id == DocumentVersion.id)
            .join(Document, Document.id == DocumentVersion.document_id)
            .where(Chunk.tenant_id == tenant_id)
            .order_by(distance)
            .limit(candidate_limit)
        )
    ).all()

    lexical_pairs = (
        await db.execute(
            select(Chunk, DocumentVersion.document_id, Document.filename)
            .join(DocumentVersion, Chunk.document_version_id == DocumentVersion.id)
            .join(Document, Document.id == DocumentVersion.document_id)
            .where(Chunk.tenant_id == tenant_id)
        )
    ).all()
    lexical_chunks = [chunk for chunk, _, _ in lexical_pairs]
    document_ids = {str(chunk.id): (str(document_id), filename) for chunk, document_id, filename in lexical_pairs}
    tokenize = lambda value: re.findall(r"\w+", value.lower())
    corpus = [tokenize(chunk.content) for chunk in lexical_chunks]
    lexical_rows = []
    if corpus:
        scores = bm25_scores(corpus, tokenize(query))
        lexical_rows = sorted(
            zip(lexical_chunks, scores),
            key=lambda item: float(item[1]),
            reverse=True,
        )[:candidate_limit]

    dense_ids = [str(chunk.id) for chunk, _, _, _ in dense_rows]
    lexical_ids = [str(chunk.id) for chunk, _ in lexical_rows]
    fused = reciprocal_rank_fusion([dense_ids, lexical_ids])
    by_id = {
        str(chunk.id): (chunk, str(document_id), filename, distance_value)
        for chunk, document_id, filename, distance_value in dense_rows
    }
    for chunk, lexical_score in lexical_rows:
        chunk_id = str(chunk.id)
        if chunk_id not in by_id:
            document_id, document_name = document_ids[chunk_id]
            max_lexical_score = max((float(score) for _, score in lexical_rows), default=1.0)
            normalized_lexical_score = (
                float(lexical_score) / max_lexical_score
                if max_lexical_score > 0
                else 0.0
            )
            by_id[chunk_id] = (
                chunk,
                document_id,
                document_name,
                1.0 - (0.35 * normalized_lexical_score),
            )

    results = []
    for chunk_id, score in fused:
        chunk, document_id, document_name, dense_distance = by_id[chunk_id]
        similarity = (
            max(0.0, min(1.0, 1.0 - float(dense_distance)))
            if dense_distance is not None
            else 0.0
        )
        if similarity < similarity_threshold:
            continue
        results.append(
            RetrievedChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                document_name=document_name,
                content=chunk.content,
                page_number=chunk.page_number,
                section=chunk.section,
                score=similarity,
            )
        )
        if len(results) >= top_k:
            break
    if not results and dense_rows:
        # Keep the system useful when a valid embedding model produces a
        # lower score distribution than the configured quality threshold.
        for chunk, document_id, document_name, dense_distance in dense_rows[:top_k]:
            similarity = max(0.0, min(1.0, 1.0 - float(dense_distance)))
            results.append(
                RetrievedChunk(
                    chunk_id=str(chunk.id),
                    document_id=str(document_id),
                    document_name=document_name,
                    content=chunk.content,
                    page_number=chunk.page_number,
                    section=chunk.section,
                    score=similarity,
                )
            )
    return results