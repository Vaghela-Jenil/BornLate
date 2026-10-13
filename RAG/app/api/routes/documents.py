import asyncio
import hashlib
import json
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.chunks import Chunk
from app.models.document import Document
from app.models.document_version import DocumentStatus, DocumentVersion
from app.schemas.search import DocumentCreate
from app.services.chunking import chunk_text
from app.services.pdf_parser import PDFParser

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 20 * 1024 * 1024


@router.get("")
async def list_documents(
    tenant_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    documents = (
        await db.execute(
            select(Document)
            .options(selectinload(Document.versions))
            .where(Document.tenant_id == tenant_id)
            .order_by(Document.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "document_id": str(document.id),
            "filename": document.filename,
            "status": document.versions[-1].status.value if document.versions else "UNKNOWN",
            "size": (
                Path(document.versions[-1].storage_key).stat().st_size
                if document.versions and Path(document.versions[-1].storage_key).is_file()
                else 0
            ),
            "page_count": (
                len(PDFParser().parse(document.versions[-1].storage_key))
                if document.versions and Path(document.versions[-1].storage_key).is_file()
                else 1
            ),
            "created_at": document.created_at,
        }
        for document in documents
    ]


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    tenant_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    document = (
        await db.execute(
            select(Document)
            .options(selectinload(Document.versions))
            .where(Document.id == document_id, Document.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    for version in document.versions:
        path = Path(version.storage_key)
        if path.exists() and path.is_file() and path.parent.resolve() == UPLOAD_DIR.resolve():
            path.unlink()
    await db.delete(document)
    await db.commit()
    return {"document_id": str(document_id), "deleted": True}


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: uuid.UUID,
    tenant_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    document = (
        await db.execute(
            select(Document)
            .options(selectinload(Document.versions))
            .where(Document.id == document_id, Document.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if document is None or not document.versions:
        raise HTTPException(status_code=404, detail="Document not found")

    path = Path(document.versions[-1].storage_key)
    if not path.is_file() or path.parent.resolve() != UPLOAD_DIR.resolve():
        raise HTTPException(status_code=404, detail="PDF file is not available")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=document.filename,
        headers={"Cache-Control": "public, max-age=3600"},
    )


async def index_chunks(
    request: Request,
    db: AsyncSession,
    tenant_id: str,
    version: DocumentVersion,
    text: str,
    page_number: int | None = None,
):
    chunks = chunk_text(text)
    embeddings = await asyncio.to_thread(
        request.app.state.embedding_service.embed_many,
        chunks,
    )
    db.add_all(
        [
            Chunk(
                tenant_id=tenant_id,
                document_version_id=version.id,
                chunk_index=index,
                page_number=page_number,
                content=content,
                embedding=embedding,
            )
            for index, (content, embedding) in enumerate(zip(chunks, embeddings))
        ]
    )
    version.status = DocumentStatus.READY
    await db.commit()
    return len(chunks)


@router.post("")
async def create_document(
    payload: DocumentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    document_id = uuid.UUID(payload.document_id)
    document = Document(
        id=document_id,
        tenant_id=payload.tenant_id,
        filename=f"{document_id}.txt",
        content_type="text/plain",
        sha256=hashlib.sha256(payload.text.encode()).hexdigest(),
    )
    version = DocumentVersion(
        document_id=document_id,
        version_number=1,
        storage_key="inline",
        status=DocumentStatus.INDEXING,
    )
    db.add_all([document, version])
    await db.flush()
    chunks_created = await index_chunks(
        request, db, payload.tenant_id, version, payload.text
    )
    return {"document_id": str(document_id), "chunks_created": chunks_created}


@router.post("/upload")
async def upload_document(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    tenant_id: Annotated[str, Form()] = "default",
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    if data[:5] != b"%PDF-":
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    document_id = uuid.uuid4()
    storage_path = UPLOAD_DIR / f"{document_id}.pdf"
    storage_path.write_bytes(data)
    document = Document(
        id=document_id,
        tenant_id=tenant_id,
        filename=file.filename,
        content_type="application/pdf",
        sha256=hashlib.sha256(data).hexdigest(),
    )
    version = DocumentVersion(
        document_id=document_id,
        version_number=1,
        storage_key=str(storage_path),
        status=DocumentStatus.INDEXING,
    )
    db.add_all([document, version])
    await db.flush()
    pages = await asyncio.to_thread(PDFParser().parse, str(storage_path))
    if not pages:
        version.status = DocumentStatus.FAILED
        await db.commit()
        raise HTTPException(
            status_code=422,
            detail="No extractable text was found in this PDF",
        )
    total_chunks = 0
    for page in pages:
        total_chunks += await index_chunks(
            request, db, tenant_id, version, page.text, page.page_number
        )
    return {
        "document_id": str(document_id),
        "filename": file.filename,
        "chunks_created": total_chunks,
        "page_count": len(pages),
        "status": version.status.value,
    }


@router.post("/upload/stream")
async def upload_document_stream(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    tenant_id: Annotated[str, Form()] = "default",
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE or data[:5] != b"%PDF-":
        raise HTTPException(status_code=400, detail="Invalid or oversized PDF file")

    async def events():
        yield f"data: {json.dumps({'stage': 'uploaded', 'progress': 10})}\n\n"
        document_id = uuid.uuid4()
        storage_path = UPLOAD_DIR / f"{document_id}.pdf"
        storage_path.write_bytes(data)
        document = Document(id=document_id, tenant_id=tenant_id, filename=file.filename, content_type="application/pdf", sha256=hashlib.sha256(data).hexdigest())
        version = DocumentVersion(document_id=document_id, version_number=1, storage_key=str(storage_path), status=DocumentStatus.PROCESSING)
        db.add_all([document, version])
        await db.flush()
        yield f"data: {json.dumps({'stage': 'chunking', 'progress': 25})}\n\n"
        pages = await asyncio.to_thread(PDFParser().parse, str(storage_path))
        if not pages:
            version.status = DocumentStatus.FAILED
            await db.commit()
            yield f"data: {json.dumps({'stage': 'failed', 'progress': 100, 'error': 'No extractable text was found in this PDF.'})}\n\n"
            return
        total = len(pages)
        total_chunks = 0
        for index, page in enumerate(pages):
            yield f"data: {json.dumps({'stage': 'embedding', 'progress': 30 + int(index / total * 50)})}\n\n"
            total_chunks += await index_chunks(request, db, tenant_id, version, page.text, page.page_number)
        version.status = DocumentStatus.READY
        await db.commit()
        yield f"data: {json.dumps({'stage': 'ready', 'progress': 100, 'document_id': str(document_id), 'filename': file.filename, 'page_count': total, 'size': len(data), 'chunks_created': total_chunks})}\n\n"
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})