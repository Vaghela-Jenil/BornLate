from dataclasses import dataclass
import pymupdf

@dataclass
class PageContent:
    page_number: int
    text: str

class PDFParser:
    def parse(self, file_path: str) -> list[PageContent]:
        pages: list[PageContent] = []

        with pymupdf.open(file_path) as document:
            for page_number, page in enumerate(document, start=1):
                text = page.get_text("text", sort=True)

                if not text.strip():
                    text_page = page.get_textpage_ocr(
                        language="eng",
                        dpi=150,
                    )

                    text = page.get_text("text", textpage=text_page)

                if not text:
                    continue

                pages.append(PageContent(page_number= page_number, text=text))
        return pages