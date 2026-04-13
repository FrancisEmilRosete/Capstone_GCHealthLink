const axios = require("axios");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhoneNumber(value) {
  const raw = normalizeText(value);
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  let localNumber = "";

  if (digitsOnly.startsWith("0")) {
    localNumber = digitsOnly;
  } else if (digitsOnly.startsWith("63")) {
    localNumber = "0" + digitsOnly.slice(2);
  } else if (digitsOnly.startsWith("9") && digitsOnly.length === 10) {
    localNumber = "0" + digitsOnly;
  }

  if (!/^09\d{9}$/.test(localNumber)) {
    return "";
  }

  return "+63" + localNumber.slice(1);
}

function buildServiceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildManualAlertMessage(studentName, condition) {
  return "GC HealthLink ALERT: "
    + studentName
    + " is currently at the Gordon College Clinic for "
    + condition
    + ". Please contact the clinic for more details.";
}

function getIprogSmsConfig() {
  const endpoint = normalizeText(
    process.env.IPROG_SMS_ENDPOINT
      || process.env.IPROG_API_ENDPOINT
      || process.env.IPROG_API_URL
  );
  const apiKey = normalizeText(process.env.IPROG_API_KEY);

  if (!endpoint || !apiKey) {
    throw buildServiceError(
      500,
      "SMS gateway is not configured. Missing IPROG_SMS_ENDPOINT (or IPROG_API_ENDPOINT/IPROG_API_URL) or IPROG_API_KEY."
    );
  }

  return { endpoint, apiKey };
}

async function sendManualAlert(phoneNumber, studentName, condition) {
  const normalizedStudentName = normalizeText(studentName);
  if (!normalizedStudentName) {
    throw buildServiceError(400, "Student name is required to send emergency SMS.");
  }

  const normalizedCondition = normalizeText(condition) || "an urgent medical concern";
  const normalizedTo = normalizePhoneNumber(phoneNumber);
  if (!normalizedTo) {
    throw buildServiceError(
      400,
      "A valid emergency contact phone number is required (PH mobile format: 09XXXXXXXXX)."
    );
  }

  const { endpoint, apiKey } = getIprogSmsConfig();
  const message = buildManualAlertMessage(normalizedStudentName, normalizedCondition);
  const payload = {
    phone_number: normalizedTo,
    message: message,
    api_token: apiKey,
  };

  let response;
  try {
    response = await axios.post(endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
  } catch (error) {
    if (error.response) {
      throw buildServiceError(
        502,
        "iProgSMS request failed (" + error.response.status + ")."
      );
    }

    if (error.request) {
      throw buildServiceError(504, "iProgSMS gateway did not respond in time.");
    }

    throw buildServiceError(500, error.message || "Failed to send SMS via iProgSMS gateway.");
  }

  const providerStatus = normalizeText(response.data?.status) || "submitted";
  const providerMessage = normalizeText(response.data?.message);
  if (
    ["failed", "error", "rejected", "invalid"].includes(providerStatus.toLowerCase())
    || (providerMessage && /fail|error|invalid|reject/i.test(providerMessage))
  ) {
    throw buildServiceError(
      502,
      providerMessage || "iProgSMS returned an unsuccessful response."
    );
  }

  return {
    provider: "iProgSMS",
    status: providerStatus,
    to: normalizedTo,
    message,
    referenceId:
      normalizeText(response.data?.message_id)
      || normalizeText(response.data?.id)
      || normalizeText(response.data?.reference)
      || null,
    httpStatus: response.status,
    responseData: response.data || null,
  };
}

module.exports = {
  buildManualAlertMessage,
  sendManualAlert,
};