export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(`[${req.requestId}]`, err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    requestId: req.requestId,
  });
}
