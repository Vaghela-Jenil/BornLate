export type PdfPage = {
    pageNumber: number;
    text: string;
};

export type PdfMetadata = {
    id: string;
    name: string;
    size: number;
    type: string;
    pageCount: number;
    opfsFileName: string;
    createdAt: number;
    updatedAt: number;
    pages: PdfPage[];
};