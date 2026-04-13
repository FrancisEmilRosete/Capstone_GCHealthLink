function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function mapMulterErrorMessage(error) {
  if (error.code === "LIMIT_FILE_SIZE") {
    return "Uploaded file is too large.";
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return "Unexpected upload field. Expected field name: file.";
  }

  return error.message || "Invalid file upload request.";
}

function mapPrismaError(error) {
  const rawMessage = typeof error?.message === "string" ? error.message : "";
  const lowered = rawMessage.toLowerCase();

  if (
    error?.name === "PrismaClientInitializationError" ||
    lowered.includes("dbhandler exited") ||
    lowered.includes("can't reach database server") ||
    lowered.includes("can't connect") ||
    lowered.includes("error in connector") ||
    lowered.includes("error querying the database")
  ) {
    return {
      status: 503,
      message: "Database is temporarily unavailable. Please try again shortly.",
    };
  }

  if (error?.name === "PrismaClientValidationError") {
    return {
      status: 400,
      message: "Invalid database request payload.",
    };
  }

  if (error?.name === "PrismaClientKnownRequestError") {
    return {
      status: 400,
      message: "Unable to process database request.",
    };
  }

  if (typeof error?.name === "string" && error.name.startsWith("PrismaClient")) {
    return {
      status: 500,
      message: "A database error occurred while processing your request.",
    };
  }

  return null;
}

function errorHandler(error, req, res, next) {
  let status = error.status || 500;
  let message = error.message || "Internal Server Error";

  if (error.name === "MulterError") {
    status = 400;
    message = mapMulterErrorMessage(error);
  }

  const prismaMapped = mapPrismaError(error);
  if (prismaMapped) {
    status = prismaMapped.status;
    message = prismaMapped.message;
  }

  const payload = {
    success: false,
    message,
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== "production") {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
}

module.exports = {
  notFound,
  errorHandler,
};
