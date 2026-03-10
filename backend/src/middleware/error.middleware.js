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

function errorHandler(error, req, res, next) {
  let status = error.status || 500;
  let message = error.message || "Internal Server Error";

  if (error.name === "MulterError") {
    status = 400;
    message = mapMulterErrorMessage(error);
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
