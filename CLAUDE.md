# Territory Completion Monitor

A static web application that fetches territory completion status from a Google Sheet and draws overlays on a printed territory map image.

## File Structure

```
TerrMap_Update/
├── CLAUDE.md                                           ← This file
├── [BOE PREFERRED] 2025 MONUMENTO TERRITORY MAP...jpg  ← Source map image (do not move)
└── territory-app/
    ├── index.html    ← Open this in a browser to run the app
    ├── style.css     ← All visual styling
    └── app.js        ← All logic: data fetching, canvas drawing, refresh
```

## How to Run

Just open `territory-app/index.html` in any modern browser (Chrome, Edge, Firefox).
No server, no installation, no build step required.

---

## Google Sheet Setup (Required Before Use)

The app reads from this sheet using the **Google Sheets API v4**.
**Sheet ID:** `1aMDqG9djcBXspFIr85H0sbHi65G3MwBEp_lJSWbF2qA`
**Tab GID:** `1604793873`

### Step 1 — Share the sheet (not "publish")
1. Open the Google Sheet
2. Click **Share** (top right)
3. Under "General access", choose **Anyone with the link → Viewer**
4. Click **Done** — no need to publish to web

### Step 2 — Create a Google API Key
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. In the left menu: **APIs & Services → Library**
4. Search for **"Google Sheets API"** → click it → **Enable**
5. Go to **APIs & Services → Credentials → + Create Credentials → API key**
6. Copy the generated API key

### Step 3 — Add the key to the app
1. Open `territory-app/app.js`
2. Find this line near the top of **Section B**:
   ```js
   API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
   ```
3. Replace `'YOUR_GOOGLE_API_KEY_HERE'` with your copied key (keep the quotes)
4. Save the file

### (Optional) Restrict the API key for security
In Google Cloud Console → Credentials → click your key → under "API restrictions", select "Restrict key" → choose "Google Sheets API" → Save.

### Expected Sheet Columns:
| Column | Contents | Example |
|--------|----------|---------|
| F | Territory Number | `101` |
| G | Status | `Finished` or `Ongoing` |

**Important:** The status check is case-sensitive. Use exactly `Finished` (capital F).

---

## How to Update Territory Coordinates

Territory overlay positions are defined in `territory-app/app.js` at the top of the file in the `TERRITORY_COORDS` object.

All values are **percentages** of the image dimensions (0–100), so they scale correctly at any browser zoom level.

```js
const TERRITORY_COORDS = {
  "101": { x: 12.5, y: 18.3, width: 6.2, height: 4.1 },
  //       ↑ left   ↑ top    ↑ width     ↑ height
  //       (all values are % of map image size)
};
```

### How to Measure Coordinates Using Browser DevTools

1. Open `territory-app/index.html` in Chrome
2. Press **F12** to open DevTools
3. Click the map image to inspect it, note its rendered width/height in the Elements panel
4. Switch to the **Console** tab
5. Run: `document.getElementById('map-image').getBoundingClientRect()`
   — this shows the rendered position and size
6. Click on a territory corner in the map — use the **Elements > Computed** panel or hover coordinates
7. To convert pixel positions to percentages:
   - `x% = (pixel_x_from_image_left / image_rendered_width) * 100`
   - `y% = (pixel_y_from_image_top / image_rendered_height) * 100`
8. Update the matching entry in `TERRITORY_COORDS` and save

### Adding a New Territory

Add a new entry to `TERRITORY_COORDS` in `app.js`:

```js
"205": { x: 45.0, y: 30.0, width: 5.5, height: 3.8 },
```

The key `"205"` must exactly match the value in Column F of the Google Sheet.

---

## How the Overlay System Works

1. On page load (and on each Refresh click), the app fetches the Google Sheet via the Sheets API v4
2. It loops through all rows and collects territory numbers where Status === "Finished"
3. For each finished territory, it looks up coordinates in `TERRITORY_COORDS`
4. It draws a semi-transparent teal rectangle + territory number label on an HTML Canvas overlaid on the map image
5. The canvas is redrawn whenever the browser window is resized (using ResizeObserver)

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "No API key set" error | Placeholder key still in app.js | Follow Step 3 in Google Sheet Setup above |
| HTTP 400/403 API error | Invalid or restricted API key | Verify key in Google Cloud Console |
| "Sheet fetch failed" error | Sheet not shared publicly | Share as "Anyone with link can view" |
| Overlays in wrong position | Coordinates need calibration | Re-measure with DevTools (see above) |
| A territory shows no overlay | No entry in TERRITORY_COORDS | Add coordinates for that territory number |
| Status not matching | Case mismatch in sheet | Ensure sheet says `Finished` not `finished` |
