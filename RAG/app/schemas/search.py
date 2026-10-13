from pydantic import BaseModel, Field

class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    tenant_id: str
    top_k: int = Field(default=5, ge=1,le=50)

class Searchresult(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    content: str
    similarity: float
    page_number: int | None = None

class SearchResponse(BaseModel):
    results: list[Searchresult]

class DocumentCreate(BaseModel):
    tenant_id: str
    document_id: str
    text: str = Field(min_length=1)