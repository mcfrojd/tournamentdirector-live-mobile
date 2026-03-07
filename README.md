<img src="https://pub-c69476ecab134e2badfb076701cd51d1.r2.dev/McFrojd_Softwares.png" alt="McFrojd Softwares" width="180">

# ♠ Tournament Director Live

A real-time poker tournament display built for [The Tournament Director](https://www.thetournamentdirector.net/) software. Receives live updates via HTTP POST and displays them on a mobile-optimised dashboard hosted on Cloudflare Pages with data stored in Cloudflare KV.

**Live demo:** [live.vastanforspoker.org](https://live.vastanforspoker.org)

![Tournament Director Live](screenshot/td-live.png)

---

## ✨ Features

- ⏱ Live countdown clock that ticks locally between updates
- 🃏 Current & next blinds, ante, level info
- 👥 Players remaining, buy-ins, rebuys / add-ons
- 💰 Prize pool, house contribution, paid places
- 📊 Average stack in chips and BB, total chips in play
- 🌐 Swedish / English language toggle (saved in browser)
- 📡 Auto-detects lost connection after 5 minutes
- 🌙 GitHub Dark theme
- 📱 Mobile-first responsive design
- 📲 installable as a PWA (add to home screen on iOS & Android)

---

## 🗂 File Structure

```
/
├── index.html               # Live display page (mobile-optimised)
├── manifest.json            # PWA manifest (name, icons, display mode)
├── service-worker.js        # PWA service worker (caching strategy)
├── settings.json            # Currency, language, clock thresholds, poll interval
├── wrangler.toml            # Cloudflare Pages config
├── icons/
│   ├── icon-96.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
├── locales/
│   ├── sv.json              # Swedish translations
│   ├── en.json              # English translations
│   └── xx.json              # Add more languages here
├── functions/
│   └── td-receiver.js       # Cloudflare Pages Function
└── README.md
```

---

## 🚀 Setup Guide

### Prerequisites

- A [Cloudflare](https://cloudflare.com) account (free tier works)
- [The Tournament Director](https://www.thetournamentdirector.net/) software (Windows)
- A GitHub account
- A domain name added to Cloudflare (required to use a custom URL — a `*.pages.dev` subdomain works without one)

---

### Step 1 — Fork / Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/tournamentdirector-live.git
cd tournamentdirector-live
```

Or click **Fork** on GitHub to create your own copy.

---

### Step 2 — Create a Cloudflare KV Namespace

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages → KV**
3. Click **Create namespace**
4. Name it anything, e.g. `TD_DATA`
5. Note the namespace — you'll bind it in the next step

---

### Step 3 — Deploy to Cloudflare Pages

1. Go to **Workers & Pages → Create application → Pages → Connect to Git**
2. Select your forked repo
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` *(or leave as default)*
4. Click **Save and Deploy**

> 💡 Make sure the `icons/` folder with your PNG icons is included in the repo before deploying — they are required for the PWA manifest.

---

### Step 4 — Bind the KV Namespace

1. Go to your Pages project → **Settings → Functions**
2. Scroll to **KV namespace bindings**
3. Click **Add binding**:
   - **Variable name:** `TD_DATA`
   - **KV namespace:** select the namespace you created
4. Click **Save**
5. Go to **Deployments** → click your latest deploy → **Retry deployment**

---

### Step 5 — Configure Tournament Director

1. Open **The Tournament Director**
2. Go to **Preferences → Status Updates**
3. Enable status updates and configure:
   - **URL:** `https://your-pages-domain.pages.dev/td-receiver`
   - **Method:** `POST`
   - **Format:** `JSON`
   - **Interval:** 90 seconds (recommended minimum)

> ⚠️ **Cloudflare KV free tier limits:** 100,000 reads/day · 1,000 writes/day · 1 GB storage · max 1 write/second per key. Exceeding these returns `429` errors. At 90-second intervals, Tournament Director performs ~240 writes per 6-hour session — well within limits. Each visitor tab adds ~240 reads per 6 hours. Shorter intervals increase both counts proportionally.

4. Click **OK**

> Replace `your-pages-domain` with your actual Cloudflare Pages domain or custom domain.

---

### Step 6 — Open the display

Navigate to your Pages URL (e.g. `https://your-domain.pages.dev`) on any device.  
Share the URL with players — it works on any phone or tablet browser.

---

## 🔍 Debug URLs

| URL | Description |
|-----|-------------|
| `/td-receiver` | Normal polling endpoint (used by `index.html`) |
| `/td-receiver?raw=1` | Pretty-printed raw JSON from TD |
| `/td-receiver?debug=1` | HTML table showing all fields + last received timestamp |

---

## ⚙️ Customisation

All common settings are in `settings.json` — no need to edit `index.html`.

```json
{
  "currency":            "kr",      // change to $, €, etc.
  "defaultLang":         "sv",      // default language code
  "pollIntervalSeconds": 90,        // how often to fetch new data (min 90 recommended)
  "warnThreshold":       120,       // seconds left when clock turns yellow
  "critThreshold":       30,        // seconds left when clock turns red
  "availableLanguages":  ["sv", "en"]  // must match files in /locales
}
```

### Adding a new language

1. Copy `locales/en.json` to `locales/xx.json` (replace `xx` with the language code)
2. Translate all values
3. Add `"xx"` to `availableLanguages` in `settings.json`
4. Add a language button in `index.html`:
   ```html
   <button class="lang-btn" id="lang-xx" onclick="setLang('xx')">XX</button>
   ```

---

## 📋 TD JSON Fields Used

The following fields from Tournament Director's JSON output are used:

| Field | Description |
|-------|-------------|
| `Title` | Tournament name |
| `Description` | Tournament description |
| `GameName` | Game type (e.g. texas hold em) |
| `RoundNum` | Current round number |
| `Level` | Current level (including breaks) |
| `IsRound` / `IsBreak` | Whether current level is a round or break |
| `NextIsBreak` | Whether next level is a break |
| `SmallBlind` / `BigBlind` / `Ante` | Current blinds |
| `NextSmallBlind` / `NextBigBlind` | Next level blinds |
| `SecondsLeft` | Seconds remaining in level |
| `LevelDuration` | Level duration in **minutes** |
| `ClockPaused` | Whether the clock is paused |
| `PlayersLeft` | Players still in |
| `Buyins` | Total buy-ins sold |
| `TablesLeft` | Active tables |
| `Pot` | Total prize pool |
| `ChipCount` | Total chips in play |
| `DefaultBuyinFee` | Buy-in cost |
| `TotalRebuys` / `TotalAddons` | Rebuys and add-ons taken |
| `HouseContribution` | House contribution to prize pool |
| `InTheMoneyRank` | Number of paid places |
| `BustsUntilMoney` | Players that need to bust before money |
| `StateDesc` | Tournament state: `before`, `inprogress`, `after` |

---

## 📲 PWA — Install as App

The app can be installed directly from the browser — no App Store needed.

**Android (Chrome):** A banner or "Add to Home Screen" prompt appears automatically after visiting the page.

**iOS (Safari):** Tap the share icon → "Add to Home Screen".

Once installed it runs fullscreen with no browser chrome, and static assets load instantly from cache even on poor WiFi.

> The live data endpoint (`/td-receiver`) is always fetched from the network — it is never served from cache.

---

## 📄 License

MIT — free to use and modify.

---

---

---

<img src="https://pub-c69476ecab134e2badfb076701cd51d1.r2.dev/McFrojd_Softwares.png" alt="McFrojd Softwares" width="180">

# ♠ Tournament Director Live — Svenska

Realtidsvisning för pokerturnering byggd för [The Tournament Director](https://www.thetournamentdirector.net/). Tar emot live-uppdateringar via HTTP POST och visar dem på en mobilanpassad dashboard hostad på Cloudflare Pages med data lagrat i Cloudflare KV.

---

## ✨ Funktioner

- ⏱ Live nedräkningsklocka som tickar lokalt mellan uppdateringar
- 🃏 Aktuella & nästa blinds, ante, nivåinfo
- 👥 Spelare kvar, inköp, rebuys / add-ons
- 💰 Prispott, husbidrag, betalda platser
- 📊 Snittstack i marker och BB, totalt marker i spel
- 🌐 Svenska / engelska språkval (sparas i webbläsaren)
- 📡 Upptäcker automatiskt tappat anslutning efter 5 minuter
- 🌙 GitHub Dark-tema
- 📱 Mobilanpassad design
- 📲 Installerbar som PWA (lägg till på hemskärmen på iOS och Android)

---

## 🗂 Filstruktur

```
/
├── index.html               # Live-visningssida (mobilanpassad)
├── manifest.json            # PWA-manifest (namn, ikoner, visningsläge)
├── service-worker.js        # PWA service worker (cachestrategi)
├── settings.json            # Valuta, språk, klockvarningar, pollintervall
├── wrangler.toml            # Cloudflare Pages-konfiguration
├── icons/
│   ├── icon-96.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
├── locales/
│   ├── sv.json              # Svenska översättningar
│   ├── en.json              # Engelska översättningar
│   └── xx.json              # Lägg till fler språk här
├── functions/
│   └── td-receiver.js       # Cloudflare Pages Function
└── README.md
```

---

## 🚀 Installationsguide

### Förutsättningar

- Ett [Cloudflare](https://cloudflare.com)-konto (gratistjänst fungerar)
- [The Tournament Director](https://www.thetournamentdirector.net/) (Windows)
- Ett GitHub-konto
- Ett domännamn kopplat till Cloudflare (krävs för egen URL — en `*.pages.dev`-subdomän fungerar utan)

---

### Steg 1 — Forka / klona repot

```bash
git clone https://github.com/DITT_ANVÄNDARNAMN/tournamentdirector-live.git
cd tournamentdirector-live
```

Eller klicka **Fork** på GitHub för att skapa din egen kopia.

---

### Steg 2 — Skapa ett Cloudflare KV Namespace

1. Logga in på [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Gå till **Workers & Pages → KV**
3. Klicka **Create namespace**
4. Namnge det valfritt, t.ex. `TD_DATA`
5. Notera namespacet — du kopplar det i nästa steg

---

### Steg 3 — Deploya till Cloudflare Pages

1. Gå till **Workers & Pages → Create application → Pages → Connect to Git**
2. Välj ditt forkade repo
3. Build-inställningar:
   - **Framework preset:** None
   - **Build command:** *(lämna tomt)*
   - **Build output directory:** `/` *(eller lämna som standard)*
4. Klicka **Save and Deploy**

> 💡 Se till att mappen `icons/` med dina PNG-ikoner finns i repot innan deploy — de krävs av PWA-manifestet.

---

### Steg 4 — Koppla KV Namespace

1. Gå till ditt Pages-projekt → **Settings → Functions**
2. Scrolla ned till **KV namespace bindings**
3. Klicka **Add binding**:
   - **Variable name:** `TD_DATA`
   - **KV namespace:** välj det namespace du skapade
4. Klicka **Save**
5. Gå till **Deployments** → klicka på senaste deployen → **Retry deployment**

---

### Steg 5 — Konfigurera Tournament Director

1. Öppna **The Tournament Director**
2. Gå till **Preferences → Status Updates**
3. Aktivera statusuppdateringar och ange:
   - **URL:** `https://din-pages-domän.pages.dev/td-receiver`
   - **Method:** `POST`
   - **Format:** `JSON`
   - **Interval:** 90 sekunder (rekommenderat minimum)

> ⚠️ **Cloudflare KV gratistjänst:** 100 000 läsningar/dag · 1 000 skrivningar/dag · 1 GB lagring · max 1 skrivning/sekund per nyckel. Om gränserna överskrids returneras `429`-fel. Med 90 sekunders intervall gör Tournament Director ~240 skrivningar per 6-timmars spel — långt under gränsen. Varje öppen visningsflik lägger till ~240 läsningar per 6 timmar. Kortare intervall ökar båda proportionellt.

4. Klicka **OK**

> Ersätt `din-pages-domän` med din faktiska Cloudflare Pages-domän eller anpassad domän.

---

### Steg 6 — Öppna visningen

Gå till din Pages-URL (t.ex. `https://din-domän.pages.dev`) på valfri enhet.  
Dela länken med spelarna — fungerar i alla mobil- och surfplattewebbläsare.

---

## 🔍 Debug-URLs

| URL | Beskrivning |
|-----|-------------|
| `/td-receiver` | Normal polling-endpoint (används av `index.html`) |
| `/td-receiver?raw=1` | Pretty-printad rå JSON från TD |
| `/td-receiver?debug=1` | HTML-tabell med alla fält + tidsstämpel för senaste mottagning |

---

## ⚙️ Anpassning

Alla vanliga inställningar finns i `settings.json` — du behöver inte redigera `index.html`.

```json
{
  "currency":            "kr",      // ändra till $, €, osv.
  "defaultLang":         "sv",      // standardspråk
  "pollIntervalSeconds": 90,        // hur ofta ny data hämtas (min 90 rekommenderas)
  "warnThreshold":       120,       // sekunder kvar när klockan blir gul
  "critThreshold":       30,        // sekunder kvar när klockan blir röd
  "availableLanguages":  ["sv", "en"]  // måste matcha filer i /locales
}
```

### Lägga till ett nytt språk

1. Kopiera `locales/en.json` till `locales/xx.json` (ersätt `xx` med språkkoden)
2. Översätt alla värden
3. Lägg till `"xx"` i `availableLanguages` i `settings.json`
4. Lägg till en språkknapp i `index.html`:
   ```html
   <button class="lang-btn" id="lang-xx" onclick="setLang('xx')">XX</button>
   ```

---

## 📲 PWA — Installera som app

Appen kan installeras direkt från webbläsaren — ingen App Store behövs.

**Android (Chrome):** En banner eller "Lägg till på startskärmen"-prompt visas automatiskt efter besök.

**iOS (Safari):** Tryck på dela-ikonen → "Lägg till på hemskärmen".

När installerad körs den i helskärm utan webbläsarens adressfält, och statiska filer laddas direkt från cache även på dåligt WiFi.

> Live-dataendpointen (`/td-receiver`) hämtas alltid från nätverket — den cachas aldrig.

---

## 📄 Licens

MIT — fri att använda och modifiera.

---

© 2026 McFrojd Softwares