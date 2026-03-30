const express = require('express');
const axios = require('axios');
const router = express.Router();
const upload = require('../middleware/upload');
const requireAuth = require('../middleware/requireAuth');

// POST /api/post — Create a LinkedIn post with optional image
router.post('/post', requireAuth, upload.single('image'), async (req, res) => {
  const token = req.cookies.linkedin_token;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'Post content is required.' });
  }

  const linkedinHeaders = {
    Authorization: `Bearer ${token}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Fetch user URN
    const userInfoRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const personUrn = userInfoRes.data.sub;
    if (!personUrn) throw new Error('Could not retrieve LinkedIn user URN.');

    let imageAssetUrn = null;

    // Step 2 & 3: Upload image if provided
    if (req.file) {
      // Register upload
      const registerPayload = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${personUrn}`,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      };

      const registerRes = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        registerPayload,
        { headers: linkedinHeaders }
      );

      const uploadUrl =
        registerRes.data.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl;

      imageAssetUrn = registerRes.data.value.asset;

      // Upload image binary
      await axios.put(uploadUrl, req.file.buffer, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': req.file.mimetype,
        },
      });
    }

    // Step 4: Build UGC post payload
    const postBody = {
      author: `urn:li:person:${personUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content.trim() },
          shareMediaCategory: imageAssetUrn ? 'IMAGE' : 'NONE',
          ...(imageAssetUrn && {
            media: [
              {
                status: 'READY',
                description: { text: 'Post image' },
                media: imageAssetUrn,
                title: { text: 'Image' },
              },
            ],
          }),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const postRes = await axios.post('https://api.linkedin.com/v2/ugcPosts', postBody, {
      headers: linkedinHeaders,
    });

    return res.json({
      success: true,
      message: 'Post published successfully!',
      postId: postRes.data.id,
    });
  } catch (err) {
    const apiError = err.response?.data;
    console.error('Post creation error:', apiError || err.message);

    const message =
      apiError?.message ||
      apiError?.['serviceErrorCode'] ||
      err.message ||
      'Failed to create post.';

    return res.status(err.response?.status || 500).json({ success: false, error: message });
  }
});

// GET /api/me — Check if user is authenticated and return basic info
router.get('/me', requireAuth, async (req, res) => {
  const token = req.cookies.linkedin_token;
  try {
    const userInfoRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { name, email, picture } = userInfoRes.data;
    res.json({ success: true, user: { name, email, picture } });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
  }
});

module.exports = router;
