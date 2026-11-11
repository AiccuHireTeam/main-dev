import { extractPositionFieldsFromText } from "./position-document-fields";

export async function readJobDescriptionDocument(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text = "";

  if (extension === "txt") {
    text = await file.text();
  } else if (extension === "docx") {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    text = result.value;
  } else if (extension === "pdf") {
    const [pdfjs, pdfWorker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    try {
      const pdf = await loadingTask.promise;
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => {
            if (!("str" in item)) return "";
            return `${item.str}${"hasEOL" in item && item.hasEOL ? "\n" : " "}`;
          })
          .join("")
          .trim();
        pages.push(pageText);
      }
      text = pages.join("\n\n");
    } finally {
      await loadingTask.destroy();
    }
  } else {
    throw new Error("Choose a PDF, DOCX, or plain text document.");
  }

  if (!text.trim()) {
    throw new Error(
      "No selectable text was found. Scanned documents need OCR; try a text-based PDF, DOCX, or TXT file.",
    );
  }

  return {
    text,
    fields: extractPositionFieldsFromText(text),
  };
}
