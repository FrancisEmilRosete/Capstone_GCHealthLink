function parsePositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function parsePaginationParams(query, options = {}) {
  const defaultLimit = parsePositiveInteger(options.defaultLimit, 50);
  const maxLimit = parsePositiveInteger(options.maxLimit, 200);

  const page = parsePositiveInteger(query?.page, 1);
  const requestedLimit = parsePositiveInteger(query?.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginationMeta({ page, limit, total }) {
  const normalizedTotal = Number.isInteger(total) && total >= 0 ? total : 0;
  const totalPages = normalizedTotal === 0 ? 0 : Math.ceil(normalizedTotal / limit);

  return {
    page,
    limit,
    total: normalizedTotal,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: totalPages > 0 && page < totalPages,
  };
}

module.exports = {
  parsePaginationParams,
  buildPaginationMeta,
};
