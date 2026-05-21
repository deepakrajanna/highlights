# Deploying Kindle Notes to Vercel

## What you need

- A [Vercel account](https://vercel.com) (free tier works)
- A [GitHub account](https://github.com) to push the code
- A Google Cloud project to create a service account

---

## Step 1 — Create a Google Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**:
   - In the left menu → APIs & Services → Library
   - Search "Google Sheets API" → Enable
4. Create a Service Account:
   - APIs & Services → Credentials → Create Credentials → Service Account
   - Give it any name (e.g. `kindle-notes-reader`)
   - Click through without granting extra roles
5. Click on the service account you just created → Keys tab → Add Key → JSON
6. Download the JSON file — you'll need values from it shortly

---

## Step 2 — Share your Google Sheet with the service account

1. Open the downloaded JSON file — find `"client_email"`, it looks like:
   `kindle-notes-reader@your-project.iam.gserviceaccount.com`
2. Open your Kindle notes Google Sheet
3. Click Share → paste that email address → set to **Viewer** → Send

---

## Step 3 — Get your Sheet ID

Your sheet URL looks like:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
```
The Sheet ID is the long string between `/d/` and `/edit`:
`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

Also note the name of the tab at the bottom of the sheet (default is `Sheet1`).

---

## Step 4 — Push to GitHub

```bash
cd kindle-notes-app
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/kindle-notes-app.git
git push -u origin main
```

---

## Step 5 — Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Before deploying, click **Environment Variables** and add these four:

| Name | Value |
|------|-------|
| `GOOGLE_SHEET_ID` | Your sheet ID from Step 3 |
| `GOOGLE_SHEET_TAB` | Your tab name (e.g. `Sheet1`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The `client_email` from the JSON file |
| `GOOGLE_PRIVATE_KEY` | The `private_key` from the JSON file (paste the whole value, including `-----BEGIN RSA PRIVATE KEY-----`) |

4. Click **Deploy**

---

## Local development

```bash
cp .env.local.example .env.local
# Fill in .env.local with your values
npm install
npm run dev
# Open http://localhost:3000
```

---

## Keyboard shortcuts

- **Space** or **→** — next note
- **Escape** — close book summary

---

## Refreshing data

Notes are cached for 5 minutes per server instance. On Vercel, the cache resets on each new deployment or cold start. To force a fresh fetch, redeploy.
