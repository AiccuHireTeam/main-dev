import type { ApplicationProfile } from "./self-application";

export type ApplicationGuideIntent =
  | { kind: "private" }
  | { kind: "correction"; field: keyof ApplicationProfile; value: string }
  | { kind: "start" | "review" | "pause" | "question" | "answer" };

// Guard before handling profile answers or retaining a transcript message.
export function applicationGuideIntent(text: string): ApplicationGuideIntent {
  if (/\b(gender|male|female|woman|man|non[\s-]?binary|veteran|disab\w*|race|ethnic\w*|demographic|protected)\b/i.test(text))
    return { kind: "private" };
  const correction = text.match(/^(?:change|set|update|correct)\s+(?:my\s+)?(name|email|phone|location|profile ?url|summary)\s+to\s+(.+)$/i);
  if (correction) {
    const key = correction[1].toLowerCase().replace(/\s/g, "");
    return { kind: "correction", field: (key === "profileurl" ? "profileUrl" : key) as keyof ApplicationProfile, value: correction[2].trim() };
  }
  if (/^(guide me|start|apply|help me apply)\b/i.test(text)) return { kind: "start" };
  if (/^(review|submit|send|done|finish)\b/i.test(text)) return { kind: "review" };
  if (/^(stop|cancel guide)\b/i.test(text)) return { kind: "pause" };
  if (text.endsWith("?") || /^(what|where|when|who|how|why|is there|are there|can you|tell me)\b/i.test(text)) return { kind: "question" };
  return { kind: "answer" };
}
export function guidedProfileError(field: keyof ApplicationProfile, value: string): string | null {
  if (field === "name" && !value.trim()) return "Your full name is required.";
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address, or correct it in the form.";
  if (field === "profileUrl" && value.trim()) {
    try { if (!["http:", "https:"].includes(new URL(value).protocol)) throw new Error(); }
    catch { return "Enter an http or https profile URL, or say skip."; }
  }
  return null;
}
