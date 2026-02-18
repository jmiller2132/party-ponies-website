# How to Rotate Your Exposed Keys

Do this so the old (leaked) keys stop working. Update only your local `.env` and your deployment (e.g. Vercel). Never commit the new keys.

---

## 1. Rotate Supabase Service Role Key

1. Go to **https://supabase.com/dashboard** and sign in.
2. Open your **Party Ponies** project (or whatever you named it).
3. In the left sidebar, click the **gear icon** → **Settings** (or go to **Project Settings**).
4. Click **API** in the left menu under Settings.
5. On the API page, find the **Project API keys** section.
6. Find the key labeled **service_role** (secret). It’s a long string starting with `eyJ...`.
7. Click **Regenerate** (or the recycle/regenerate icon) next to the service_role key.
8. **Copy the new key** that appears (you may only see it once).
9. On your computer, open your project folder and edit **`.env`** or **`.env.local`**.
10. Find the line `SUPABASE_SERVICE_ROLE_KEY=...` and replace the value with the new key you copied. Save the file.
11. If you deploy (e.g. Vercel): go to your project on Vercel → **Settings** → **Environment Variables** → edit `SUPABASE_SERVICE_ROLE_KEY` and paste the new key → Save. Redeploy the app so it picks up the new value.

Done. The old service_role key no longer works.

---

## 2. Rotate Yahoo OAuth keys (Client ID + Client Secret)

Yahoo doesn’t let you regenerate keys on an existing app—only delete. So you get new keys by **creating a new app**.

1. Go to **https://developer.yahoo.com/apps** and sign in.
2. Click **Create an App** (or **Create Application**).
3. Fill in the same way as your current app:
   - **Application Name**: e.g. Party Ponies (or Party Ponies 2).
   - **Application Type**: Installed Application.
   - **Redirect URI(s)**:  
     - `http://localhost:3000/api/auth/callback/yahoo`  
     - and your production URL if you have one, e.g. `https://yoursite.vercel.app/api/auth/callback/yahoo`
   - **API Permissions**: enable what you need (e.g. Fantasy Sports).
4. Create the app. You’ll get a new **Client ID** and **Client Secret**—copy both.
5. In **`.env`** / **`.env.local`** set:
   - `YAHOO_CLIENT_ID=<new client id>`
   - `YAHOO_CLIENT_SECRET=<new client secret>`
6. If you deploy: update both in Vercel (or your host) **Environment Variables**, then redeploy.
7. (Optional) Delete the old app so its keys can’t be used.

Your old app’s keys will no longer be used once you’ve switched to the new app.

---

## 3. Quick checklist

- [ ] Supabase: Regenerate **service_role** key → update `.env` and Vercel (or host) → redeploy.
- [ ] Yahoo: Regenerate **Client Secret** (or create new app) → update `.env` and Vercel → redeploy.
- [ ] Confirm the site still works (sign in, load data). If something breaks, double-check you used the new values everywhere and redeployed.

After this, anyone who had the old keys can’t use them anymore.
