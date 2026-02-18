# Fixing Exposed Secrets (GitGuardian Alert)

Secrets were pushed in an earlier commit and still exist in **git history**. Do both steps below.

---

## Step 1: Rotate every exposed secret (do this first)

**Full step-by-step instructions:** see **[ROTATE_KEYS.md](./ROTATE_KEYS.md)**.

Summary:
- **Supabase:** Dashboard → your project → **Settings** → **API** → regenerate **service_role** key → put new key in `.env` and in Vercel (or your host) env vars → redeploy.
- **Yahoo:** [developer.yahoo.com/apps](https://developer.yahoo.com/apps) → your app → regenerate **Client Secret** (or create a new app for new Client ID + Secret) → put new values in `.env` and in Vercel env vars → redeploy.

After this, the old keys are invalid and cannot be used even if someone saw them in history.

---

## Step 2: Remove secrets from git history (stops GitGuardian from flagging)

This rewrites history so the secrets no longer appear in any commit. Only do this after Step 1.

### Option A: Using BFG Repo-Cleaner (recommended)

1. **Install BFG**  
   - Download from [rtyley/bfg-repo-cleaner](https://rtyley.github.io/bfg-repo-cleaner/) (Java required), or  
   - `scoop install bfg` / `choco install bfg` on Windows.

2. **Get the exact exposed strings** (so BFG can replace them).  
   In your repo folder, run:
   ```powershell
   git show 82f80b60:env.example
   ```
   Copy the **Supabase Service Role** line value (the long JWT) and the **Yahoo** lines (client ID and secret).  
   Or use the values GitGuardian shows in the alert.

3. **Create a replacements file** (only on your machine; do not commit it).  
   In the repo root, create `bfg-replacements.txt` with one replacement per line. Use the **exact** exposed string on the left, then `==>`, then what to put in history instead, e.g.:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...rest of JWT...==>[REDACTED]
   dj0yJmk9YTNjb2lvMGFzcnh0JmQ9WVdrOU56ZGpjR0kx...==>[REDACTED]
   d78855a2fd472c0b5ce170a025999ec86d76e8e5==>[REDACTED]
   ```
   Replace the left sides with your **actual** exposed values from step 2. Use `[REDACTED]` or `your_placeholder_here` on the right.  
   `bfg-replacements.txt` is in `.gitignore` so it will never be committed.

4. **Clone a fresh copy** (BFG works on a clone, not your main repo):
   ```powershell
   cd ..
   git clone --mirror https://github.com/jmiller2132/party-ponies-website.git party-ponies-website-mirror
   cd party-ponies-website-mirror
   ```

5. **Run BFG** (path to your `bfg-replacements.txt` and the mirror clone):
   ```powershell
   bfg --replace-text ..\party-ponies-website\bfg-replacements.txt .
   ```
   Or if BFG is a JAR:
   ```powershell
   java -jar bfg.jar --replace-text ..\party-ponies-website\bfg-replacements.txt .
   ```

6. **Clean and force-push** (from inside the mirror clone):
   ```powershell
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   cd ..\party-ponies-website
   git remote set-url origin ..\party-ponies-website-mirror
   git fetch
   git reset --hard origin/master
   git remote set-url origin https://github.com/jmiller2132/party-ponies-website.git
   git push --force
   ```
   Or push from the mirror:  
   `git push --force` from inside the mirror (with `origin` set to GitHub).  
   **Warning:** Force-push overwrites history on GitHub. Anyone else with a clone must re-clone or reset.

7. **Delete the mirror and replacements file** when done:
   ```powershell
   Remove-Item -Recurse -Force ..\party-ponies-website-mirror
   Remove-Item ..\party-ponies-website\bfg-replacements.txt
   ```

### Option B: Don’t rewrite history

If you don’t want to change history:

- You **must** still do **Step 1** (rotate all keys).
- GitGuardian may keep showing the leak because the old strings remain in history, but the keys will be useless.
- You can add the repo to GitGuardian’s allowlist or dismiss the alert after confirming rotation.

---

## Summary

| Action | Purpose |
|--------|--------|
| **Step 1: Rotate keys** | Stops anyone from using the exposed secrets. |
| **Step 2: BFG + force-push** | Removes secrets from history so GitGuardian (and others) no longer see them. |

If you only do Step 1, you are secure. Step 2 is to clean history and clear the alert.
