class Reranker:
    def rerank(
        self,
        query: str,
        documents,
        top_k: int = 5,
    ):
        query_terms = set(query.lower().split())
        ranked = sorted(
            documents,
            key=lambda chunk: (
                chunk.score
                + 0.05 * len(query_terms & set(chunk.content.lower().split()))
            ),
            reverse=True,
        )
        selected = []
        for chunk in ranked:
            normalized = " ".join(chunk.content.lower().split())
            if any(
                _overlap_ratio(normalized, " ".join(existing.content.lower().split()))
                >= 0.8
                for existing in selected
            ):
                continue
            selected.append(chunk)
            if len(selected) >= top_k:
                break
        return selected


def _overlap_ratio(left: str, right: str) -> float:
    left_words = set(left.split())
    right_words = set(right.split())
    if not left_words or not right_words:
        return 0.0
    return len(left_words & right_words) / min(len(left_words), len(right_words))