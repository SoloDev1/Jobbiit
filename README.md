# Jobbiit

## Render environment

Set `ALLOWED_ORIGINS` to your frontend URL(s), comma-separated, for example:

`https://your-web-app.com,http://localhost:19006`

Without this, browser and Expo web clients can show a generic "network error" on signup because CORS blocks the response.
