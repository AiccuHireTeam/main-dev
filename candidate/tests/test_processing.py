import base64
from io import BytesIO

import pytest
from docx import Document
from pydantic import ValidationError

from app.config import Settings
from app.documents import parse_resume
from app.errors import ServiceError
from app.pipeline import QUESTION_TEXT, embedding_chunks, extract_chunks, make_questions
from app.provider import Provider
from app.schemas import AnswerInput, ResumeInput


def test_long_unicode_text_is_not_truncated():
    text = "Research 漢字 and analysis. " * 3000
    chunks = list(extract_chunks(text))
    reconstructed = chunks[0][2] + "".join(c[2][300:] for c in chunks[1:])
    assert reconstructed == text
    embeddings = embedding_chunks(text)
    assert "".join(embeddings) == text
    assert all(len(c.encode()) <= 6000 for c in embeddings)


def test_maximum_five_contextual_questions():
    questions = make_questions(
        list(QUESTION_TEXT), {"evidence": []}, "Worked on university research."
    )
    assert len(questions) == 5
    assert all("university research" in q["question"] for q in questions)


def test_docx_paragraphs_and_tables():
    doc = Document()
    doc.add_paragraph("Prepared customer research reports.")
    table = doc.add_table(rows=1, cols=1)
    table.cell(0, 0).text = "Built spreadsheet dashboards."
    stream = BytesIO()
    doc.save(stream)
    result = parse_resume(
        ResumeInput(format="docx", content=base64.b64encode(stream.getvalue()).decode()), Settings()
    )
    assert "customer research" in result and "spreadsheet dashboards" in result


@pytest.mark.parametrize(
    "format,content",
    [
        ("pdf", "!" * 25),
        ("pdf", base64.b64encode(b"not a pdf document whatsoever").decode()),
        ("docx", base64.b64encode(b"not a docx document whatsoever").decode()),
    ],
)
def test_invalid_documents(format, content):
    with pytest.raises(ServiceError):
        parse_resume(ResumeInput(format=format, content=content), Settings())


def test_answer_contract():
    with pytest.raises(ValidationError):
        AnswerInput(email="alex@example.com", answers=[])
    assert AnswerInput(email="alex@example.com", skip=True).skip


def test_invalid_model_citation_rejected(monkeypatch):
    provider = Provider(Settings())
    monkeypatch.setattr(
        provider,
        "request",
        lambda *args: {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": '{"evidence":[{"category":"skill","detail":"Invented","quote":"Not in source"}],"other_details":[]}'
                    },
                }
            ]
        },
    )
    with pytest.raises(ServiceError, match="invalid_extraction_output"):
        provider.extract("Actual source resume text", {"categories": []})


@pytest.mark.parametrize("embedding", [[0.0] * 1536, [float("nan")] * 1536, [0.2] * 10])
def test_invalid_vectors_rejected(monkeypatch, embedding):
    provider = Provider(Settings())
    monkeypatch.setattr(
        provider, "request", lambda *args: {"data": [{"index": 0, "embedding": embedding}]}
    )
    with pytest.raises(ServiceError, match="invalid_embedding_output"):
        provider.embed(["source"])


def test_isolated_document_parser():
    from app.documents import parse_resume_isolated

    doc = Document()
    doc.add_paragraph("Created a project plan and coordinated delivery.")
    stream = BytesIO()
    doc.save(stream)
    result = parse_resume_isolated(
        ResumeInput(format="docx", content=base64.b64encode(stream.getvalue()).decode()), Settings()
    )
    assert "coordinated delivery" in result


def test_blank_pdf_requires_ocr():
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    stream = BytesIO()
    writer.write(stream)
    with pytest.raises(ServiceError, match="ocr_required_or_empty_page"):
        parse_resume(
            ResumeInput(format="pdf", content=base64.b64encode(stream.getvalue()).decode()),
            Settings(),
        )


def test_identity_details_stay_separate_across_chunks():
    from types import SimpleNamespace

    from app.pipeline import extract_application, vector_source

    class ProviderWithIdentity:
        def extract(self, text, rubric):
            return {
                "evidence": [{"category": "skill", "detail": "Research", "quote": text[:20]}],
                "other_details": [],
                "identity_details": [
                    {"label": "name", "detail": "Resume name", "quote": text[:10]}
                ],
            }

    application = SimpleNamespace(
        resume_text="Research and reporting. " * 1000,
        rubric={"categories": [{"id": "skill"}]},
        candidate={"full_name": "Alex"},
        email="alex@example.com",
    )
    extract_application(application, ProviderWithIdentity(), Settings())
    assert isinstance(application.extracted["identity_details"], list)
    assert application.extracted["identity_details"]
    assert "identity_details" not in vector_source(application)
