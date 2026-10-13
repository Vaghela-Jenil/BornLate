from dataclasses import dataclass


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    document_name: str
    content: str
    page_number: int | None
    section: str | None
    score: float


def build_context(
    chunks: list[RetrievedChunk],
    max_chars: int = 24000,
) -> str:
    sections: list[str] = []
    used_chars = 0
    for index, chunk in enumerate(chunks, start=1):
        section = (
            "---\n"
            f"Document: {chunk.document_name}\n"
            f"Document ID: {chunk.document_id}\n"
            f"Page: {chunk.page_number if chunk.page_number is not None else 'unknown'}\n"
            f"Chunk: {chunk.chunk_id}\n"
            f"Relevance: {chunk.score:.4f}\n"
            "Content:\n"
            f"{chunk.content.strip()}\n"
            "---"
        )
        if used_chars + len(section) > max_chars:
            remaining = max_chars - used_chars
            if remaining > 300:
                sections.append(section[:remaining].rstrip() + "\n[truncated]")
            break
        sections.append(section)
        used_chars += len(section) + 2
    return "\n\n".join(sections)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)