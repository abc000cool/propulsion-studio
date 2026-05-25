# Deploying Propulsion Studio on the Web

Propulsion Studio is a **static web app** (HTML, CSS, JavaScript modules). It runs entirely in the browser. Saved designs use **localStorage** on the visitor’s device — no backend server is required for hosting.

You only need a host that serves files over **HTTPS** with correct MIME types for `.js` / `.mjs`.

---

## What to upload

Upload the contents of the `propulsion-studio` folder:

| Required | Notes |
|----------|--------|
| `index.html` | Entry point |
| `css/` | Styles |
| `js/` | App logic (ES modules) |
| Optional | `docs/`, favicon, `README.md` |

**Do not** need `server.mjs`, `start.bat`, or `node_modules` for static hosting.

---

## Option 1 — GitHub Pages (free, good for portfolios)

**Best for:** student projects, open-source demos, personal sites.

### Steps

1. Install [Git](https://git-scm.com/) and create a [GitHub](https://github.com) account.

2. In a terminal, from your project folder:

   ```bash
   cd "path/to/propulsion-studio"
   git init
   git add index.html css js docs README.md
   git commit -m "Initial Propulsion Studio release"
   ```

3. On GitHub: **New repository** → name it e.g. `propulsion-studio` → create (no README if you already committed locally).

4. Link and push:

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/propulsion-studio.git
   git branch -M main
   git push -u origin main
   ```

5. On the repo: **Settings → Pages**  
   - **Source:** Deploy from branch  
   - **Branch:** `main`  
   - **Folder:** `/` (root)  
   - Save

6. After 1–3 minutes your site is live at:

   `https://YOUR_USERNAME.github.io/propulsion-studio/`

   If the repo is named `YOUR_USERNAME.github.io` (special user site repo), the URL is `https://YOUR_USERNAME.github.io/` with files at root.

### Notes

- All asset paths in `index.html` are **relative** (`css/main.css`, `js/app.js`) — they work on GitHub Pages subpaths.
- Hard refresh after deploy: `Ctrl+Shift+R`.
- PNG export uses a CDN (`html2canvas`) — visitors need internet for that feature.

---

## Option 2 — Netlify (free tier, easiest drag-and-drop)

**Best for:** quickest deploy without Git, custom domain later.

### Steps (drag and drop)

1. Go to [https://www.netlify.com](https://www.netlify.com) and sign up.

2. Zip the `propulsion-studio` folder contents (so `index.html` is at the **root** of the zip).

3. **Sites → Add new site → Deploy manually** → drop the zip.

4. Netlify gives you a URL like `https://random-name.netlify.app`.

### Steps (Git — recommended for updates)

1. Push your project to GitHub (same as Option 1).

2. Netlify: **Add new site → Import an existing project** → GitHub → select repo.

3. Build settings:
   - **Build command:** (leave empty)
   - **Publish directory:** `/` or `.` (repo root if `index.html` is at root)

4. **Deploy site**. Every `git push` redeploys automatically.

### Custom domain

**Domain settings → Add custom domain** (e.g. `propulsion.yourschool.edu`) and follow DNS instructions.

---

## Option 3 — Cloudflare Pages (free, fast global CDN)

**Best for:** performance and free SSL with a custom domain.

1. Push code to GitHub.

2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**.

3. Select the repo.

4. Build settings:
   - **Framework preset:** None  
   - **Build command:** (empty)  
   - **Build output directory:** `/`

5. Deploy. URL: `https://propulsion-studio.pages.dev` (or your chosen project name).

---

## Option 4 — Vercel (free, similar to Netlify)

1. Push to GitHub.

2. [https://vercel.com](https://vercel.com) → **Add New Project** → import repo.

3. **Framework Preset:** Other  
4. **Root Directory:** `propulsion-studio` if the repo is the parent `Propulsion Project` folder; otherwise `.`

5. Deploy. You get `https://your-project.vercel.app`.

---

## Option 5 — Azure Static Web Apps / AWS S3 (institutional)

**Best for:** university or company policies requiring Azure/AWS.

### Azure Static Web Apps (summary)

1. Push to GitHub.  
2. Azure Portal → **Create Static Web App** → link repo.  
3. App location: `/`, API: none, output: build artifact from root.  
4. Use the generated `*.azurestaticapps.net` URL or bind a custom domain.

### AWS S3 + CloudFront (summary)

1. Create S3 bucket, enable **static website hosting**.  
2. Upload all files; set `index.html` as index document.  
3. Block public access off for bucket policy (or use CloudFront OAC).  
4. Optional CloudFront distribution for HTTPS and caching.

---

## Comparison

| Option | Cost | Difficulty | Custom domain | Auto-deploy from Git |
|--------|------|------------|---------------|----------------------|
| GitHub Pages | Free | Easy | Yes | Yes |
| Netlify | Free tier | Easiest | Yes | Yes |
| Cloudflare Pages | Free | Easy | Yes | Yes |
| Vercel | Free tier | Easy | Yes | Yes |
| Azure / AWS | Pay-as-you-go | Harder | Yes | Yes (with setup) |

---

## Before you go live — checklist

- [ ] Open the deployed URL in Chrome/Edge/Firefox and test **Start Designing**, **Arrange Diagram**, **Save**, **Compare**.
- [ ] Confirm **How to Use** overlay works.
- [ ] Add a link or QR code on posters/slides to the live URL.
- [ ] If this is academic work, keep `docs/PHYSICS.md` linked or cited as “design-level estimates.”
- [ ] Optional: add `public/_redirects` on Netlify with `/* /index.html 200` only if you add client-side routing later (not needed for current app).

---

## Local preview (same files as production)

```bash
cd propulsion-studio
node server.mjs
```

Open `http://localhost:5173` — what you see is what static hosts will serve (minus `server.mjs` itself).

---

## Troubleshooting deployed sites

| Issue | Fix |
|-------|-----|
| Blank page | Open DevTools → Console. Often a 404 on `js/app.js` — check publish folder is repo **root** with `index.html`. |
| Modules blocked | Host must serve `.js` as `text/javascript`. All listed hosts do this by default. |
| Old version showing | Hard refresh or clear cache; on Netlify trigger **Clear cache and deploy**. |
| Saves missing on new device | Expected — designs are in **that browser’s** localStorage, not the cloud. |

---

## Optional: add a simple `404.html`

For GitHub Pages, copy `index.html` to `404.html` so unknown paths still load the app (only needed if you add deep links later).
