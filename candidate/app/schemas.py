from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Category = Literal[
    "skill", "personality_merge", "outlier_skill", "conjugate_skill", "management_skill"
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ResumeInput(StrictModel):
    format: Literal["text", "pdf", "docx"]
    content: str = Field(
        min_length=20,
        max_length=14_000_000,
        description="UTF-8 transcript text or strict base64 PDF/DOCX bytes",
    )


class ApplicationInput(StrictModel):
    application_id: str = Field(min_length=1, max_length=128)
    job_id: str = Field(min_length=1, max_length=128)
    resume_id: str = Field(min_length=1, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    application_date: datetime
    phone: str | None = Field(default=None, min_length=3, max_length=40)
    resume: ResumeInput

    @field_validator("application_date")
    @classmethod
    def valid_date(cls, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("application_date must include a timezone")
        if value > datetime.now(UTC):
            raise ValueError("application_date cannot be in the future")
        return value


class Answer(StrictModel):
    question_id: UUID
    answer: str = Field(min_length=1, max_length=5000)


class AnswerInput(StrictModel):
    email: EmailStr
    answers: list[Answer] = Field(default_factory=list, max_length=5)
    skip: bool = False

    @model_validator(mode="after")
    def valid_submission(self):
        if self.skip == bool(self.answers):
            raise ValueError("Supply answers or skip=true, exclusively")
        if len({a.question_id for a in self.answers}) != len(self.answers):
            raise ValueError("Duplicate question IDs")
        return self


class Evidence(StrictModel):
    category: Category
    detail: str = Field(min_length=1, max_length=3000)
    quote: str = Field(min_length=1, max_length=3000)


class OtherDetail(StrictModel):
    label: str = Field(min_length=1, max_length=100)
    detail: str = Field(min_length=1, max_length=3000)
    quote: str = Field(min_length=1, max_length=3000)


class Extraction(StrictModel):
    identity_details: list[OtherDetail] = Field(default_factory=list, max_length=100)
    evidence: list[Evidence] = Field(max_length=500)
    other_details: list[OtherDetail] = Field(max_length=500)
