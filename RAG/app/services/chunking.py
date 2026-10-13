import re


def split_paragraphs(text: str) -> list[str]:

    paragraphs = re.split(
        r"\n\s*\n",
        text,
    )

    return [
        paragraph.strip()
        for paragraph in paragraphs
        if paragraph.strip()
    ]


def chunk_text(
    text: str,
    max_chars: int = 1500,
    overlap_chars: int = 200,
) -> list[str]:

    paragraphs = split_paragraphs(text)

    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:

        candidate = (
            f"{current}\n\n{paragraph}"
            if current
            else paragraph
        )

        if len(candidate) <= max_chars:
            current = candidate
            continue

        if current:
            chunks.append(current)

        overlap = current[-overlap_chars:]

        current = (
            f"{overlap}\n\n{paragraph}"
            if overlap
            else paragraph
        )

    if current:
        chunks.append(current)

    return chunks