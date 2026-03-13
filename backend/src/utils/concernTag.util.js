const DEFAULT_CONCERN_TAG = "General Consultation";

const TAG_RULES = [
  { tag: "Medical Clearance", keywords: ["medical clearance", "clearance", "fit to enroll", "fit to work"] },
  { tag: "Dental Concern", keywords: ["dental", "tooth", "toothache", "gum", "molar", "oral pain", "cavity"] },
  { tag: "Fever", keywords: ["fever", "febrile", "lagnat", "high temperature"] },
  { tag: "Headache", keywords: ["headache", "migraine", "head pain"] },
  { tag: "Stomach Pain", keywords: ["stomach", "abdominal", "abdomen", "gastr", "ulcer", "indigestion"] },
  { tag: "Diarrhea", keywords: ["diarrhea", "loose stool"] },
  { tag: "Vomiting", keywords: ["vomit", "nausea", "throw up"] },
  { tag: "Cough", keywords: ["cough", "ubo"] },
  { tag: "Sore Throat", keywords: ["sore throat", "throat pain", "tonsil", "pharyngitis"] },
  { tag: "Flu-like Illness", keywords: ["flu", "influenza", "trangkaso"] },
  { tag: "Skin Rash", keywords: ["rash", "hives", "itch", "dermatitis"] },
  { tag: "Eye Irritation", keywords: ["conjunctivitis", "pink eye", "eye pain", "eye irritation"] },
  { tag: "Dizziness", keywords: ["dizzy", "vertigo", "lightheaded"] },
  { tag: "Injury", keywords: ["injury", "wound", "sprain", "fracture", "bleeding", "trauma"] },
  { tag: "Menstrual Pain", keywords: ["dysmenorrhea", "menstrual", "period pain", "cramps"] },
  { tag: "Respiratory Concern", keywords: ["shortness of breath", "difficulty breathing", "chest tightness"] },
];

const OUTBREAK_TAGS = new Set([
  "Fever",
  "Flu-like Illness",
  "Cough",
  "Sore Throat",
  "Diarrhea",
  "Vomiting",
  "Skin Rash",
  "Eye Irritation",
  "Headache",
  "Respiratory Concern",
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStructuredComplaint(rawComplaint) {
  const normalized = normalizeText(rawComplaint);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractComplaintText(rawComplaint) {
  const normalized = normalizeText(rawComplaint);
  const structured = parseStructuredComplaint(normalized);

  if (!structured) {
    return normalized.toLowerCase();
  }

  const fields = [
    structured.chiefComplaint,
    structured.diagnosis,
    structured.treatmentManagement,
    structured.notes,
  ]
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return fields.join(" ").toLowerCase();
}

function deriveConcernTag(rawComplaint) {
  const searchable = extractComplaintText(rawComplaint);
  if (!searchable) {
    return DEFAULT_CONCERN_TAG;
  }

  for (const rule of TAG_RULES) {
    if (rule.keywords.some((keyword) => searchable.includes(keyword))) {
      return rule.tag;
    }
  }

  return DEFAULT_CONCERN_TAG;
}

function normalizeConcernTag(value) {
  const normalized = normalizeText(value);
  return normalized || DEFAULT_CONCERN_TAG;
}

function isOutbreakConcernTag(tag) {
  return OUTBREAK_TAGS.has(normalizeConcernTag(tag));
}

module.exports = {
  DEFAULT_CONCERN_TAG,
  deriveConcernTag,
  normalizeConcernTag,
  isOutbreakConcernTag,
};
