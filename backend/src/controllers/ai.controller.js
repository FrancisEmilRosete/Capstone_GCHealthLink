const axios = require("axios");

const { prisma } = require("../lib/prisma");

const DEFAULT_PYTHON_TIMEOUT_MS = 15_000;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveAiServiceBaseUrl() {
  return normalizeText(process.env.AI_SERVICE_BASE_URL);
}

function resolveTimeoutMs() {
  const configured = Number.parseInt(process.env.AI_SERVICE_TIMEOUT_MS || "", 10);
  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_PYTHON_TIMEOUT_MS;
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildServiceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeConcernTag(value) {
  const normalized = normalizeText(value);
  return normalized || "General Consultation";
}

function mapPythonServiceError(error, operationLabel) {
  if (error.response) {
    const providerMessage =
      error.response?.data?.detail
      || error.response?.data?.message
      || `${operationLabel} failed in AI service (${error.response.status}).`;

    return buildServiceError(502, String(providerMessage));
  }

  if (error.code === "ECONNREFUSED") {
    return buildServiceError(
      503,
      "The AI analysis service is currently unavailable. Please try again later."
    );
  }

  if (error.code === "ECONNABORTED") {
    return buildServiceError(504, `AI service timeout during ${operationLabel}.`);
  }

  return buildServiceError(500, error.message || `Failed to run ${operationLabel}.`);
}

async function buildOutbreakPayload() {
  const visits = await prisma.clinicVisit.findMany({
    select: {
      visitDate: true,
      concernTag: true,
    },
    orderBy: {
      visitDate: "asc",
    },
  });

  if (visits.length === 0) {
    return {
      historical_data: [],
      forecast_months: 3,
    };
  }

  const bucket = new Map();

  for (const visit of visits) {
    const dateKey = toDateKey(visit.visitDate);
    if (!dateKey) continue;

    const illnessCategory = normalizeConcernTag(visit.concernTag);
    const key = `${dateKey}::${illnessCategory}`;
    bucket.set(key, (bucket.get(key) || 0) + 1);
  }

  const historical_data = [...bucket.entries()].map(([key, cases]) => {
    const [date, illness_category] = key.split("::");
    return {
      date,
      illness_category,
      cases,
    };
  });

  historical_data.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.illness_category.localeCompare(b.illness_category);
  });

  return {
    historical_data,
    forecast_months: 3,
  };
}

async function buildResourcePayload() {
  const [inventoryItems, usageRows] = await Promise.all([
    prisma.inventory.findMany({
      select: {
        id: true,
        itemName: true,
        currentStock: true,
        reorderThreshold: true,
        unit: true,
      },
      orderBy: {
        itemName: "asc",
      },
    }),
    prisma.visitMedicine.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)),
        },
      },
      select: {
        inventoryId: true,
        quantity: true,
      },
    }),
  ]);

  const usageByInventoryId = new Map();
  for (const row of usageRows) {
    usageByInventoryId.set(
      row.inventoryId,
      (usageByInventoryId.get(row.inventoryId) || 0) + row.quantity
    );
  }

  const inventory_data = inventoryItems.map((item) => {
    const total30DayUsage = usageByInventoryId.get(item.id) || 0;
    const dailyUsageRate = total30DayUsage / 30;

    return {
      item_name: item.itemName,
      current_stock: item.currentStock,
      daily_usage_rate: Number(dailyUsageRate.toFixed(4)),
      unit: item.unit,
      reorder_threshold: item.reorderThreshold,
    };
  });

  return {
    inventory_data,
    horizon_days: 30,
  };
}

async function callPythonService(path, payload, operationLabel) {
  const baseUrl = resolveAiServiceBaseUrl();
  
  if (!baseUrl) {
    throw buildServiceError(
      503,
      "The AI analysis service is currently unavailable. Please try again later."
    );
  }

  const timeout = resolveTimeoutMs();

  try {
    const response = await axios.post(`${baseUrl}${path}`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout,
    });

    return response.data;
  } catch (error) {
    throw mapPythonServiceError(error, operationLabel);
  }
}

const getOutbreakForecast = async (req, res, next) => {
  try {
    const payload = await buildOutbreakPayload();

    if (!payload.historical_data.length) {
      return res.json({
        success: true,
        message: "No clinic visit history available for outbreak forecasting yet.",
        data: {
          forecast: [],
          input_summary: {
            records_received: 0,
            categories: [],
          },
        },
      });
    }

    const aiResult = await callPythonService(
      "/predict/outbreak",
      payload,
      "outbreak forecasting"
    );

    return res.json({
      success: true,
      message: "Outbreak forecast generated successfully.",
      data: aiResult,
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

const getResourcePrediction = async (req, res, next) => {
  try {
    const payload = await buildResourcePayload();

    if (!payload.inventory_data.length) {
      return res.json({
        success: true,
        message: "No inventory records available for resource prediction yet.",
        data: {
          at_risk: [],
          stable: [],
          summary: {
            total_items: 0,
            at_risk_items: 0,
            stable_items: 0,
          },
        },
      });
    }

    const aiResult = await callPythonService(
      "/predict/resources",
      payload,
      "resource prediction"
    );

    return res.json({
      success: true,
      message: "Resource prediction generated successfully.",
      data: aiResult,
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

module.exports = {
  getOutbreakForecast,
  getResourcePrediction,
};
