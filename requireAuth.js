/**
 * Middleware to protect routes that require a LinkedIn access token.
 * Reads the token from the HTTP-only cookie set during OAuth.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.linkedin_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated. Please connect your LinkedIn account first.',
    });
  }

  next();
}

module.exports = requireAuth;
