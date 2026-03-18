const twilio = require("twilio");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhoneNumber(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }

  const hasPlusPrefix = raw.startsWith("+");
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  if (hasPlusPrefix) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("63")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("0")) {
    return `+63${digitsOnly.slice(1)}`;
  }

  return `+${digitsOnly}`;
}

function buildServiceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildEmergencySmsMessage(studentName) {
  return `GC HealthLink: Emergency Alert for ${studentName}. They are currently at the Gordon College Clinic. Please contact the school nurse immediately.`;
}

function getTwilioConfig() {
  const accountSid = normalizeText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = normalizeText(process.env.TWILIO_AUTH_TOKEN);
  const from = normalizeText(process.env.TWILIO_PHONE_NUMBER);

  if (!accountSid || !authToken || !from) {
    throw buildServiceError(
      500,
      "SMS service is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER."
    );
  }

  return { accountSid, authToken, from };
}

async function sendEmergencySms({ to, studentName }) {
  const normalizedStudentName = normalizeText(studentName);
  if (!normalizedStudentName) {
    throw buildServiceError(400, "Student name is required to send emergency SMS.");
  }

  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo) {
    throw buildServiceError(400, "A valid emergency contact phone number is required.");
  }

  const { accountSid, authToken, from } = getTwilioConfig();
  const client = twilio(accountSid, authToken);
  const body = buildEmergencySmsMessage(normalizedStudentName);

  const message = await client.messages.create({
    body,
    from,
    to: normalizedTo,
  });

  return {
    sid: message.sid,
    status: message.status || null,
    to: message.to || normalizedTo,
    from: message.from || from,
    body,
  };
}

module.exports = {
  buildEmergencySmsMessage,
  sendEmergencySms,
};