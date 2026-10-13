const PDF_DIRECTORY = "pdfs";

function ensureBrowser() {
    if (typeof window === "undefined") {
        throw new Error("OPFS can only be used in the browser");
    }

    if (!navigator.storage?.getDirectory) {
        throw new Error("Origin Private File System is not supported by this browser.")
    }
}


async function getPdfDirectory() {
    ensureBrowser();
    const root = await navigator.storage.getDirectory();

    return await root.getDirectoryHandle(PDF_DIRECTORY, {
        create: true,
    });
}

export async function savePdfToOPFS(filename: string, file: File): Promise<void> {
    const directory = await getPdfDirectory();

    const fileHandle = await directory.getFileHandle(filename, {
        create: true
    });

    const writable = await fileHandle.createWritable();

    try {
        await writable.write(file);
    } finally {
        await writable.close();
    }
}

export async function readPdfFromOPFS(filename: string): Promise<ArrayBuffer> {
    const directory = await getPdfDirectory();

    const fileHandle = await directory.getFileHandle(filename);

    const file = await fileHandle.getFile();

    return await file.arrayBuffer();
}

export async function getPdfFileFromOPFS(filename: string):
    Promise<File> {
    const directory = await getPdfDirectory();
    const fileHandle = await directory.getFileHandle(filename);
    return await fileHandle.getFile();
}

export async function deletePdfFromOPFS(filename: string):
    Promise<void> {
    const directory = await getPdfDirectory();
    await directory.removeEntry(filename);
}

export async function pdfExistsInOPFS(filename: string):
    Promise<boolean> {
    try {
        const directory = await getPdfDirectory();
        await directory.getFileHandle(filename);

        return true;
    }catch{
        return false;
    }
}