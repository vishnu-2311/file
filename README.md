# PostStream — LinkedIn Automation Tool

Publish text + image posts to LinkedIn with a single click. Built with Node.js, Express, and vanilla JS.

---

## Project Structure

```
poststream/
├── server.js              # Express entry point
├── package.json
├── .env                   # Your secrets (never commit this)
├── .env.example           # Template
├── routes/
│   ├── auth.js            # LinkedIn OAuth 2.0 flow
│   └── api.js             # Post creation & /me endpoints
├── middleware/
│   ├── requireAuth.js     # Cookie-based auth guard
│   └── upload.js          # Multer (memory storage, 5MB limit)
└── public/
    └── index.html         # Frontend UI
```

---

## Setup

### 1. Create a LinkedIn App

1. Go to https://www.linkedin.com/developers/apps
2. Click **Create app**
3. Fill in name, LinkedIn Page, and logo
4. Under **Auth** tab, add this Redirect URL:
   ```
   http://localhost:3000/auth/linkedin/callback
   ```
5. Under **Products**, request access to:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn** (gives `w_member_social`)
6. Copy your **Client ID** and **Client Secret**

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
SESSION_SECRET=some_long_random_string
```

### 3. Install & Run

```bash
npm install
npm start         # production
npm run dev       # with nodemon auto-reload
```

Open http://localhost:3000

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/linkedin` | — | Redirect to LinkedIn OAuth |
| GET | `/auth/linkedin/callback` | — | OAuth callback, sets cookie |
| GET | `/auth/logout` | — | Clears auth cookie |
| GET | `/api/me` | ✅ | Returns authenticated user info |
| POST | `/api/post` | ✅ | Create a LinkedIn post |

### POST /api/post

Form-data fields:

| Field | Type | Required |
|-------|------|----------|
| content | string | ✅ |
| image | file (image/*) | ❌ |

Response:
```json
{ "success": true, "message": "Post published successfully!", "postId": "urn:li:ugcPost:..." }
```

---

## How the Post Flow Works

```
Frontend FormData
     │
     ▼
POST /api/post
     │
     ├─ 1. GET /v2/userinfo  → get person URN
     │
     ├─ 2. POST /v2/assets?action=registerUpload  (if image)
     │       → get uploadUrl + assetUrn
     │
     ├─ 3. PUT {uploadUrl}  (binary image)
     │
     └─ 4. POST /v2/ugcPosts  → publish post
```

---

## Security Notes

- Access token is stored in an **HTTP-only cookie** (not accessible from JS)
- `secure` flag is enabled in production (HTTPS only)
- File uploads are validated by MIME type and size (5 MB max)
- `requireAuth` middleware guards all `/api/*` routes
- State param in OAuth prevents CSRF

---

## Future Enhancements (Bonus)

- **Scheduling**: Add `node-cron` + a job queue (BullMQ) to delay posts
- **Database**: Persist posts in MongoDB with `mongoose`
- **Preview**: Show rendered LinkedIn card before submission
- **Multi-account**: Support multiple LinkedIn profiles per user
- **Analytics**: Track post impressions via LinkedIn API
