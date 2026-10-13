from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    database_url: str

    embedding_model: str
    embedding_dimension: int

    llm_provider: str = "ollama"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2:latest"
    rag_candidate_k: int = 40
    rag_top_k: int = 6
    rag_similarity_threshold: float = 0.20
    rag_max_context_chars: int = 24000
    rag_max_history_messages: int = 6
    rag_debug: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()