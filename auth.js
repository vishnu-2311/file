const express = require('express');
const axios = require('axios');
const router = express.Router();

const {
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI,
} = process.env;

const LINKEDIN_SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

// Step 1: Redirect user to LinkedIn OAuth
router.get('/linkedin', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    scope: LINKEDIN_SCOPES.join(' '),
    state: Math.random().toString(36).substring(2), // CSRF protection
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback and exchange code for token
router.get('/linkedin/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('LinkedIn OAuth error:', error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || 'OAuth failed')}`);
  }

  if (!code) {
    return res.redirect('/?error=No+authorization+code+received');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, expires_in } = tokenResponse.data;

    // Store token in HTTP-only cookie
    res.cookie('linkedin_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in * 1000,
      sameSite: 'lax',
    });

    res.redirect('/?connected=true');
  } catch (err) {
    console.error('Token exchange error:', err.response?.data || err.message);
    const msg = err.response?.data?.error_description || 'Token exchange failed';
    res.redirect(`/?error=${encodeURIComponent(msg)}`);
  }
});

// Logout: clear token cookie
router.get('/logout', (req, res) => {
  res.clearCookie('linkedin_token');
  res.redirect('/');
});

module.exports = router;
