function requireApiSecret(req, res, next) {
  if (req.path === '/health') return next();

  const expected = process.env.API_SECRET;
  if (!expected) {
    return res.status(500).json({ error: 'API_SECRET is not configured on the server' });
  }

  const provided = req.header('x-api-secret');
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = { requireApiSecret };
