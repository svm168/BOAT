# BOAT web app — do these steps in order

Work in this folder: `C:\Users\Krrish Agarwal\boat`.  
The Flutter app is **not** in this phase. After the web app can register a bike, show the NFC page, and drop a pin on the map, we will add the phone scanner.

You will enter secrets yourself (TiDB password, JWT secret). I cannot see or store them unless you paste them into chat.

---

## Step 0 — Tools on your PC

### Node.js

1. Open [https://nodejs.org](https://nodejs.org) and install the **LTS** Windows installer.
2. Close and reopen PowerShell.
3. Check:

```powershell
node -v
npm -v
```

Expect `v20` or `v22` for Node, and any recent npm. If `node` is not recognized, log out and back in, or reboot once.

### Git (optional but recommended)

```powershell
cd "C:\Users\Krrish Agarwal\boat"
git init
git add .
git commit -m "Initial BOAT web app"
```

---

## Step 1 — Install JavaScript packages

In PowerShell:

```powershell
cd "C:\Users\Krrish Agarwal\boat"
npm install
```

**What you should see:** a `node_modules` folder and no red error at the end. Warnings about funding or deprecated packages are fine.

If `npm` fails with a network error, retry on campus Wi‑Fi or another network.

---

## Step 2 — Create the TiDB database (you must do this)

TiDB Cloud has a free Serverless tier. This is the SQL database the app writes location pings into.

1. Open [https://tidbcloud.com](https://tidbcloud.com) and sign up (GitHub or email).
2. Create a **Serverless** cluster. Region: pick the closest (for example `ap-south-1` / Mumbai).
3. When it asks for the cluster password: **generate one and save it in a password manager**. You will not see it again.
4. Wait until the cluster status is **Available**.
5. Open the cluster → **Connect**.
6. Client type: **General** or **Node.js**.
7. Copy the connection string. It looks like:

```text
mysql://XXXX.root:YOUR_PASSWORD@gateway01.ap-south-1.prod.aws.tidbcloud.com:4000/test
```

8. In the TiDB SQL Editor (or Chat2Query), run:

```sql
CREATE DATABASE IF NOT EXISTS boat;
USE boat;
```

9. Then paste and run the full contents of `db/schema.sql` (in this repo).

**What you should see:** `Query OK` for each `CREATE TABLE`. Confirm with:

```sql
SHOW TABLES;
```

You must see `users`, `bikes`, `location_reports`.

If a table already exists from a failed attempt:

```sql
DROP TABLE IF EXISTS location_reports;
DROP TABLE IF EXISTS bikes;
DROP TABLE IF EXISTS users;
```

Then run `db/schema.sql` again.

---

## Step 3 — Create `.env.local` (secrets live only on your machine)

1. In the `boat` folder, copy `.env.example` to `.env.local`.

```powershell
cd "C:\Users\Krrish Agarwal\boat"
copy .env.example .env.local
notepad .env.local
```

2. Set `DATABASE_URL` to the TiDB string, but change the database name from `test` (or whatever default) to `boat`:

```text
DATABASE_URL=mysql://XXXX.root:YOUR_PASSWORD@gateway01....tidbcloud.com:4000/boat
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `/` → `%2F`).

3. Generate `JWT_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the printed hex string as `JWT_SECRET`.

4. Set campus map center to **your** campus (Google Maps → right-click the quad → copy coordinates):

```text
NEXT_PUBLIC_CAMPUS_LAT=28.5450
NEXT_PUBLIC_CAMPUS_LNG=77.1926
NEXT_PUBLIC_CAMPUS_NAME=Your Campus Name
```

5. Leave `NEXT_PUBLIC_BEACON_UUID` as-is unless you already have a campus UUID. All tags share this UUID; each bike gets a different **minor**.

6. Keep `NEXT_PUBLIC_APP_URL=http://localhost:3000` until you deploy.

Save the file. **Do not commit `.env.local`.**

---

## Step 4 — Start the web app

```powershell
cd "C:\Users\Krrish Agarwal\boat"
npm run dev
```

**What you should see:**

```text
▲ Next.js 15
- Local: http://localhost:3000
```

Leave this terminal running.

Open [http://localhost:3000](http://localhost:3000) in Chrome.

Then open [http://localhost:3000/api/health](http://localhost:3000/api/health).

| JSON | Meaning |
| --- | --- |
| `{"ok":true,"database":"connected"}` | Ready |
| `missing DATABASE_URL` | `.env.local` not found or not saved; restart `npm run dev` after editing env |
| `database":"error"` | Wrong password, wrong db name, or SSL blocked. Re-copy the TiDB URL |

Restart the dev server after every `.env.local` change (Ctrl+C, then `npm run dev` again).

---

## Step 5 — Test the owner flow in the browser

1. Click **Create owner account**.
2. Use a real-looking email, password 8+ characters, name, phone, hostel, room.
3. You should land on **Your bicycles** with an empty list.
4. **Register a bicycle** → nickname e.g. `Red Atlas`.
5. You should land on the bike detail page with:
   - NFC URL like `http://localhost:3000/bike/ab3k9mpq`
   - iBeacon UUID
   - Major `1` and Minor `1` (next bike will be `2`, and so on)
6. Open the **public NFC page** link in a new tab (or phone on the same Wi‑Fi using your PC’s LAN IP later).

**If register fails:** `/api/health` is not `ok`, or `users` table was not created.

---

## Step 6 — Test NFC landing + GPS report (this is the web stand-in for BLE)

On the public page `/bike/<id>`:

1. Confirm owner name, phone, hostel, **Active** badge.
2. Click **Report this bike's location**.
3. Chrome will ask for location. Click **Allow**.
4. Success text: `Location saved. The owner can see this pin on their map.`
5. Refresh the **dashboard bike page**. A Leaflet map pin should appear at your current GPS.

**If the browser says permission denied:** click the padlock in the address bar → Site settings → Location → Allow. `localhost` is treated as secure; a raw `http://192.168...` IP on a phone may block GPS unless you use HTTPS.

**If you are on a desktop without GPS:** you can still insert a test ping from PowerShell (replace the public id and coordinates):

```powershell
curl http://localhost:3000/api/location -Method POST -ContentType "application/json" -Body '{"publicId":"ab3k9mpq","lat":28.5450,"lng":77.1926,"accuracyM":8,"source":"web"}'
```

Expect `{"ok":true}`. Refresh the map.

Mark the bike **Missing**, reload the public page, confirm the **Missing** badge, then mark it found again.

---

## Step 7 — Write an NTAG215 sticker (no PN532 required)

Use a phone with NFC. Android is simplest.

1. Install **NFC Tools**.
2. Put the BOAT site on a URL the phone can reach:
   - During local demo, the phone and PC must be on the same Wi‑Fi, and `NEXT_PUBLIC_APP_URL` must be `http://YOUR_PC_LAN_IP:3000` (ipconfig → IPv4). Restart the Next server after changing it. Windows Firewall must allow Node on port 3000.
   - For a real plate, deploy the app (Vercel or similar) and put that https URL in `NEXT_PUBLIC_APP_URL`.
3. In NFC Tools: **Write → Add a record → URL/URI** → paste `https://your-domain/bike/ab3k9mpq` (or the LAN URL).
4. **Write** → hold the NTAG215 sticker to the phone until it beeps.
5. Lock the tag only after you are sure the URL is correct (locking is permanent).

**What you should see:** tapping the sticker opens the browser on the public bike page. No app install.

iPhone: NFC URL records open Safari automatically. If nothing happens, the record is not a URL type.

---

## Step 8 — ESP32-C3 beacon (optional now, required before Flutter)

Follow `firmware/README.md` exactly: Arduino IDE, ESP32 board package, paste UUID/major/minor from the bike page, upload, confirm Serial `BOAT beacon pulse` every ~2.5 s, confirm with nRF Connect.

The map will **not** update from BLE until we build the Android scanner. That is expected.

---

## Step 9 — When this phase is done

You are ready for Flutter when all of these are true:

- [ ] `/api/health` returns `ok`
- [ ] You can register, sign out, sign in
- [ ] `/bike/<id>` shows owner details without logging in
- [ ] A GPS report (button or curl) appears as the latest pin on the owner map
- [ ] NFC sticker opens that same page
- [ ] Firmware UUID/minor match the dashboard (even if phones are not posting yet)

Tell me when that list is checked and we will build the Flutter app + native beacon bridge (5‑minute cooldown per tag, POST to `/api/location` with `source: "ble"`).
