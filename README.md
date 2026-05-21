# Jobbiit

## Native app signup

`POST https://jobbiit.onrender.com/api/auth/signup`

Request body (you may include `confirmPassword`; it is validated then ignored):

```json
{ "email": "you@example.com", "password": "Secret1!", "confirmPassword": "Secret1!" }
```

Password rules: 8+ chars, uppercase, lowercase, digit, special character.

Response shape (tokens are nested under `data`):

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id": "...", "email": "...", "role": "MEMBER", ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

React Native example:

```ts
const res = await fetch('https://jobbiit.onrender.com/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, confirmPassword }),
})
const json = await res.json()
if (!res.ok || !json.success) throw new Error(json.message ?? 'Signup failed')
const { accessToken, refreshToken, user } = json.data
```

If you see "Network request failed" with no response, increase the timeout (Render free tier can take 30–60s on cold start) and ensure the URL uses `https://` with no trailing slash on the path.

## Render environment (web / Expo web only)

Set `ALLOWED_ORIGINS` to your frontend URL(s), comma-separated, for example:

`https://your-web-app.com,http://localhost:19006`
