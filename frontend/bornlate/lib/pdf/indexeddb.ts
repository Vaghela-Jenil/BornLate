import type { PdfMetadata } from "./types";

const DB_NAME = "local-pdf-library";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";

function ensureBrowser() {
    if (typeof window === "undefined") {
        throw new Error("IndexedDB can only be used in the browser.");
    }
}

function openDatabase(): Promise<IDBDatabase> {
    ensureBrowser();

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                });

                store.createIndex("name", "name", {
                    unique: false,
                });

                store.createIndex("createdAt", "createdAt", {
                    unique: false,
                });
            }
        };

        request.onsuccess = () => {
            resolve(request.result)
        };

        request.onerror = () => {
            reject(request.error);
        };
    })
}

export async function savePdfMetadata(metadata: PdfMetadata):
    Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");

        const store = transaction.objectStore(STORE_NAME);

        store.put(metadata);

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}

export async function getPdfMetadata(id: string): Promise<PdfMetadata | undefined>{
    const db = await openDatabase();

    return new Promise((resolve, reject) =>{
        const transaction = db.transaction(STORE_NAME, "readonly");

        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(id);

         request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    });
}

export async function getAllPdfMetadata(): Promise<PdfMetadata[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      db.close();

      const results = request.result as PdfMetadata[];

      results.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      resolve(results);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deletePdfMetadata(
  id: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(STORE_NAME);

    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function searchPdfText(
  query: string
): Promise<PdfMetadata[]> {
  const pdfs = await getAllPdfMetadata();

  const normalizedQuery = query
    .trim()
    .toLowerCase();

  if (!normalizedQuery) {
    return pdfs;
  }

  return pdfs.filter((pdf) => {
    const nameMatch = pdf.name
      .toLowerCase()
      .includes(normalizedQuery);

    const textMatch = pdf.pages.some((page) =>
      page.text
        .toLowerCase()
        .includes(normalizedQuery)
    );

    return nameMatch || textMatch;
  });
}