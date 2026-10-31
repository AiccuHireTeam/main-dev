import base64
import binascii
from io import BytesIO
from zipfile import ZipFile

from lxml import etree
from pypdf import PdfReader

from app.errors import ServiceError


def parse_resume(resume, config):
    if resume.format == "text":
        text = resume.content
    else:
        try:
            data = base64.b64decode(resume.content, validate=True)
        except (ValueError, binascii.Error):
            raise ServiceError("invalid_base64") from None
        if len(data) > config.max_resume_bytes:
            raise ServiceError("resume_too_large", 413)
        try:
            if resume.format == "pdf":
                if not data.startswith(b"%PDF-"):
                    raise ServiceError("invalid_pdf_signature")
                reader = PdfReader(BytesIO(data))
                if reader.is_encrypted:
                    raise ServiceError("encrypted_pdf_not_supported")
                if len(reader.pages) > config.max_pages:
                    raise ServiceError("too_many_pages", 413)
                pages = []
                for number, page in enumerate(reader.pages, 1):
                    content = page.extract_text() or ""
                    # Never turn an unreadable page into missing candidate information.
                    if not content.strip():
                        raise ServiceError("ocr_required_or_empty_page")
                    pages.append(f"[Page {number}]\n{content}")
                    if sum(map(len, pages)) > config.max_text_chars:
                        raise ServiceError("resume_text_too_large", 413)
                text = "\n\n".join(pages)
            else:
                if not data.startswith(b"PK"):
                    raise ServiceError("invalid_docx_signature")
                with ZipFile(BytesIO(data)) as archive:
                    if (
                        len(archive.infolist()) > 2000
                        or sum(i.file_size for i in archive.infolist()) > 30_000_000
                    ):
                        raise ServiceError("unsafe_docx_archive", 413)
                    if "word/document.xml" not in archive.namelist():
                        raise ServiceError("invalid_docx")
                blocks = []
                with ZipFile(BytesIO(data)) as archive:
                    names = archive.namelist()
                    if any(
                        "vbaProject" in name or name.startswith("word/embeddings/")
                        for name in names
                    ):
                        raise ServiceError("embedded_documents_or_macros_not_supported")
                    parts = [
                        name
                        for name in names
                        if name == "word/document.xml"
                        or (
                            name.startswith("word/")
                            and name.endswith(".xml")
                            and name.split("/")[-1].startswith(
                                ("header", "footer", "footnotes", "endnotes")
                            )
                        )
                    ]
                    for name in sorted(parts):
                        root = etree.fromstring(
                            archive.read(name),
                            parser=etree.XMLParser(
                                resolve_entities=False, no_network=True, huge_tree=False
                            ),
                        )
                        for paragraph in root.iter(
                            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"
                        ):
                            content = "".join(paragraph.itertext())
                            if content.strip():
                                blocks.append(content)
                text = "\n".join(blocks)
        except ServiceError:
            raise
        except Exception:  # noqa: BLE001 - parser libraries expose heterogeneous errors
            raise ServiceError("unreadable_document") from None
    if len(text) > config.max_text_chars:
        raise ServiceError("resume_text_too_large", 413)
    if len(text.strip()) < 20 or "\x00" in text:
        raise ServiceError("insufficient_or_invalid_resume_text")
    return text


# Binary parsing runs in a bounded subprocess, so an adversarial document cannot
# indefinitely consume an API worker. The platform must malware-scan uploads first.
def _parse_child(connection, resume, limits):
    import sys
    from types import SimpleNamespace

    try:
        if sys.platform == "linux":
            import resource

            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
            resource.setrlimit(resource.RLIMIT_CPU, (30, 35))
        connection.send((True, parse_resume(resume, SimpleNamespace(**limits))))
    except ServiceError as error:
        connection.send((False, (error.code, error.status)))
    finally:
        connection.close()


def parse_resume_isolated(resume, config):
    if resume.format == "text":
        return parse_resume(resume, config)
    import multiprocessing

    context = multiprocessing.get_context("spawn")
    parent, child = context.Pipe(duplex=False)
    process = context.Process(
        target=_parse_child,
        args=(
            child,
            resume,
            {
                "max_resume_bytes": config.max_resume_bytes,
                "max_text_chars": config.max_text_chars,
                "max_pages": config.max_pages,
            },
        ),
    )
    process.start()
    child.close()
    try:
        if not parent.poll(45):
            raise ServiceError("document_processing_timeout", 422)
        try:
            ok, value = parent.recv()
        except EOFError:
            raise ServiceError("document_processing_failed", 422) from None
        if not ok:
            raise ServiceError(value[0], value[1])
        return value
    finally:
        parent.close()
        if process.is_alive():
            process.terminate()
        process.join(timeout=5)
        if process.is_alive():
            process.kill()
            process.join()
