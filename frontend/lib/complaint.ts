const ENCODED_PREFIX = 'enc::';

function sentenceCase(value: string) {
  if (!value) return '';
  const lowered = value.toLowerCase();
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

function decodePlaceholderValue(value: string) {
  const raw = value.trim();
  if (!raw) return '';

  if (!raw.toLowerCase().startsWith(ENCODED_PREFIX)) {
    return raw;
  }

  const encodedPortion = raw.slice(ENCODED_PREFIX.length).trim();
  if (!encodedPortion) return '';

  let decoded = encodedPortion;
  try {
    decoded = decodeURIComponent(encodedPortion);
  } catch {
    decoded = encodedPortion;
  }

  const normalized = decoded.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return sentenceCase(normalized);
}

export function normalizeComplaintDisplay(raw?: string | null, fallback = 'General consultation') {
  if (!raw || !raw.trim()) return fallback;

  const text = raw.trim();

  try {
    const parsed = JSON.parse(text) as {
      chiefComplaint?: string;
      diagnosis?: string;
      notes?: string;
    };

    if (parsed && typeof parsed === 'object') {
      const diagnosis = decodePlaceholderValue(typeof parsed.diagnosis === 'string' ? parsed.diagnosis : '');
      const complaint = decodePlaceholderValue(typeof parsed.chiefComplaint === 'string' ? parsed.chiefComplaint : '');
      const notes = decodePlaceholderValue(typeof parsed.notes === 'string' ? parsed.notes : '');
      return diagnosis || complaint || notes || fallback;
    }
  } catch {
    // Legacy delimited or plaintext payload is handled below.
  }

  const normalized = decodePlaceholderValue(text);
  const firstPart = normalized.split('|').map((part) => part.trim()).filter(Boolean)[0];
  return firstPart || normalized || fallback;
}

export function parseConsultationDisplay(raw?: string | null) {
  const fallback = {
    complaint: 'General consultation',
    diagnosis: 'General consultation',
    treatment: '',
  };

  if (!raw || !raw.trim()) {
    return fallback;
  }

  const text = raw.trim();

  try {
    const parsed = JSON.parse(text) as {
      chiefComplaint?: string;
      diagnosis?: string;
      treatmentManagement?: string;
      notes?: string;
    };

    if (parsed && typeof parsed === 'object') {
      const complaint = normalizeComplaintDisplay(parsed.chiefComplaint || '', '');
      const diagnosis = normalizeComplaintDisplay(parsed.diagnosis || '', '');
      const notes = normalizeComplaintDisplay(parsed.notes || '', '');
      const treatment = normalizeComplaintDisplay(parsed.treatmentManagement || '', '');

      return {
        complaint: complaint || diagnosis || notes || fallback.complaint,
        diagnosis: diagnosis || complaint || notes || fallback.diagnosis,
        treatment,
      };
    }
  } catch {
    // Non-JSON legacy visit notes are handled below.
  }

  const normalized = normalizeComplaintDisplay(text, fallback.complaint);
  return {
    complaint: normalized,
    diagnosis: normalized,
    treatment: '',
  };
}