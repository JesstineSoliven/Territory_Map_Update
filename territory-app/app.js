/* ═══════════════════════════════════════════════════════════════
   TERRITORY COMPLETION MONITOR — app.js
   ═══════════════════════════════════════════════════════════════

   HOW TO UPDATE COORDINATES:
   All values below are percentages (0–100) of the image size.
   See CLAUDE.md for the DevTools measurement guide.

   Key format:  "<territory number>": { x, y, width, height }
   All in % of the map image rendered dimensions.
   ═══════════════════════════════════════════════════════════════ */

/* ── Section A: Territory Coordinates ──────────────────────────
   Update these to match the actual territory positions on the map.
   Values are PLACEHOLDER estimates — calibrate using DevTools.
   ─────────────────────────────────────────────────────────────── */
const TERRITORY_COORDS = {
  // ─ Measure coordinates using DevTools (see CLAUDE.md for guide) ─
  // All values are percentages (0–100) of the rendered map image size.
  //   x = left edge, y = top edge, width = box width, height = box height

  "1":  { x: 6.7, y: 12.5, width: 7.4, height: 7.4 },
  "2":  { x: 7, y: 21.5, width: 8, height: 14},
  "3":  { x: 6.5, y: 42, width: 10.7, height: 5 },
  "4":  { x: 15, y: 12.5, width: 13.6, height: 7.5 },
  "5":  { x: 15.5, y: 24, width: 13.5, height: 3 },
  "6":  { x: 18, y: 28, width: 11, height: 7.5 },
  "7":  { x: 18, y: 37, width: 11, height: 11 },
  "8":  { x: 30, y: 12, width: 11, height: 3.8 },
  "9":  { x: 29.8, y: 16.5, width: 11.2, height: 10 },
  "10": { x: 29.8, y: 28, width: 11.1, height: 8 },
  "11": { x: 29.8, y: 37, width: 11.1, height: 11 },
  "12": { x: 41.5, y: 12, width: 21, height: 3.6 },
  "13": { x: 41.5, y: 16, width: 11.5, height: 7 },
  "14": { x: 53.5, y: 16, width: 9, height: 7 },
  "15": { x: 41.5, y: 24, width: 17, height: 13 },
  "16": { x: 41.5, y: 38, width: 7, height: 11.5 },
  "17": { x: 49, y: 38, width: 8, height: 11.5 },
  "18": { x: 58.5, y: 38.5, width: 4, height: 11.5 },
  "19": { x: 60, y: 27, width: 2.5, height: 10.5 },
  "20": { x: 63, y: 12, width: 21, height: 2.5 },
  "21": { x: 70, y: 15, width: 12.5, height: 4.5 },
  "22": { x: 75, y: 22, width: 3.5, height: 2 },
  "23": { x: 0, y: 0, width: 0, height: 0 },
  "24": { x: 0, y: 0, width: 0, height: 0 },
  "25": { x: 0, y: 0, width: 0, height: 0 },
  "26": { x: 0, y: 0, width: 0, height: 0 },
  "27": { x: 0, y: 0, width: 0, height: 0 },
  "28": { x: 0, y: 0, width: 0, height: 0 },
  "29": { x: 0, y: 0, width: 0, height: 0 },
  "30": { x: 0, y: 0, width: 0, height: 0 },
  "31": { x: 0, y: 0, width: 0, height: 0 },
  "32": { x: 0, y: 0, width: 0, height: 0 },
  "33": { x: 0, y: 0, width: 0, height: 0 },
  "34": { x: 0, y: 0, width: 0, height: 0 },
  "35": { x: 0, y: 0, width: 0, height: 0 },
};


/* ── Section B: Configuration ───────────────────────────────── */
const CONFIG = {
  // ── Google Sheets API ──────────────────────────────────────
  // Replace with your own Google API key.
  // Steps: console.cloud.google.com → New project → Enable "Google Sheets API"
  //        → Credentials → Create API key → paste it here.
  // The sheet must be shared as "Anyone with the link can view".
  API_KEY:      (typeof GOOGLE_API_KEY !== 'undefined' ? GOOGLE_API_KEY : 'YOUR_GOOGLE_API_KEY_HERE'),

  SHEET_ID:     '1aMDqG9djcBXspFIr85H0sbHi65G3MwBEp_lJSWbF2qA',
  GID:          '1604793873',   // Numeric sheet tab ID
  STATUS_MATCH: 'Finished',     // Case-sensitive match against Column G

  // ── Overlay appearance — Finished (teal) ───────────────────
  FILL_COLOR:        'hsla(125, 100%, 50%, 0.70)',
  STROKE_COLOR:      'rgba(5, 252, 17, 0.97)',

  // ── Overlay appearance — Not Finished (red) ────────────────
  FILL_COLOR_UNFINISHED:   'rgba(220, 50, 50, 0.57)',
  STROKE_COLOR_UNFINISHED: 'rgb(220, 50, 50)',

  LABEL_COLOR:       '#000000',
  LABEL_FONT_FAMILY: '"Space Mono", monospace',
  STROKE_WIDTH: 1.5,
  LABEL_PADDING: 2,
};


/* ── Section C: State ───────────────────────────────────────── */
// Keep track of the last fetched finished set so ResizeObserver can redraw
let lastFinishedSet = new Set();
let allTerritories   = [];   // full parsed dataset [{num, status, date, remarks}]
let activeStatusFilter  = '';
let activeRemarksFilter = '';
let activeDateFrom      = '';
let activeDateTo        = '';


/* ── Section D: Data Fetching ───────────────────────────────── */

/**
 * Fetches territory data using the Google Sheets API v4.
 * Returns { finished: Set<string>, total: number }
 *
 * Requires:
 *   - CONFIG.API_KEY set to a valid Google API key with Sheets API enabled
 *   - The sheet shared as "Anyone with the link can view"
 *
 * Step 1: Fetch spreadsheet metadata to resolve the tab title from its GID.
 * Step 2: Fetch columns E:H values from that tab by title.
 */
async function fetchTerritoryData() {
  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
  const key  = CONFIG.API_KEY;

  if (!key || key === 'YOUR_GOOGLE_API_KEY_HERE') {
    throw new Error(
      'No API key set. Open app.js, find API_KEY in Section B, ' +
      'and replace the placeholder with your Google API key.'
    );
  }

  // ── Step 1: Get the sheet tab title from its numeric GID ──────
  const noCache = { cache: 'no-store' };
  const metaRes = await fetch(
    `${BASE}/${CONFIG.SHEET_ID}?key=${key}&fields=sheets.properties`,
    noCache
  );

  if (!metaRes.ok) {
    // Parse the Google API error body for the exact reason
    let reason = '';
    try {
      const errBody = await metaRes.json();
      reason = errBody?.error?.message || '';
    } catch (_) { /* ignore parse failure */ }

    if (metaRes.status === 403) {
      throw new Error(
        `403 Forbidden — ${reason || 'Access denied'}. ` +
        `Most likely cause: Google Sheets API is not enabled on your Cloud project. ` +
        `Go to console.cloud.google.com → APIs & Services → Library → enable "Google Sheets API". ` +
        `Also check the API key has no HTTP referrer restrictions blocking file:// access.`
      );
    }
    throw new Error(
      `Sheets API error ${metaRes.status}: ${reason || 'unknown error'}`
    );
  }

  const meta      = await metaRes.json();
  const sheetMeta = meta.sheets
    ? meta.sheets.find(s => s.properties.sheetId === Number(CONFIG.GID))
    : null;

  if (!sheetMeta) {
    throw new Error(
      `Tab with GID ${CONFIG.GID} not found in the spreadsheet. ` +
      `Verify the GID in CONFIG matches the correct tab.`
    );
  }

  const sheetTitle = sheetMeta.properties.title;

  // ── Step 2: Fetch columns E through H from that tab ──────────
  const valRes = await fetch(
    `${BASE}/${CONFIG.SHEET_ID}/values/` +
    `${encodeURIComponent(sheetTitle)}!E:H?key=${key}`,
    noCache
  );

  if (!valRes.ok) {
    let reason = '';
    try {
      const errBody = await valRes.json();
      reason = errBody?.error?.message || '';
    } catch (_) { /* ignore */ }
    throw new Error(`Values fetch error ${valRes.status}: ${reason || 'unknown error'}`);
  }

  const valData = await valRes.json();

  // valData.values is a 2D array: [[hdr_E, hdr_F, hdr_G, hdr_H], [row1_E, ...], ...]
  // Slice off the first row (header).
  // Indices: 0=Col E (Completed Date), 1=Col F (Territory#), 2=Col G (Status), 3=Col H (Remarks)
  const rows       = (valData.values || []).slice(1);
  const finished   = new Set();
  const territories = [];

  rows.forEach(row => {
    const date    = row[0] != null ? String(row[0]).trim() : '';
    const raw     = row[1] != null ? String(row[1]).trim() : '';
    const match   = raw.match(/^(\d+)/);
    const terrNum = match ? match[1] : '';
    const status  = row[2] != null ? String(row[2]).trim() : '';
    const remarks = row[3] != null ? String(row[3]).trim() : '';

    if (terrNum) {
      territories.push({ num: terrNum, status, date, remarks });
      if (status === CONFIG.STATUS_MATCH) {
        finished.add(terrNum);
      }
    }
  });

  // Return allRows so loadData() can log them for debugging
  return { finished, total: rows.length, allTerritories: territories, allRows: rows };
}


/* ── Section E: Canvas Drawing ──────────────────────────────── */

/**
 * Returns the largest integer font size (px) at which `text` fits within
 * `maxWidth` canvas pixels, bounded by [minSize, maxSize].
 */
function fitFontSize(ctx, text, maxWidth, maxSize, minSize = 5) {
  for (let size = maxSize; size >= minSize; size--) {
    ctx.font = `700 ${size}px ${CONFIG.LABEL_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

/**
 * Draws semi-transparent overlays on the canvas for each finished territory.
 * Canvas pixel dimensions are set to the image's current rendered size,
 * NOT the image's natural (full-resolution) dimensions — this keeps the
 * canvas lightweight even for the 33MB source image.
 */
function drawOverlays(finishedSet) {
  const canvas = document.getElementById('overlay-canvas');
  const ctx    = canvas.getContext('2d');
  const img    = document.getElementById('map-image');

  // Size canvas to match rendered image (not natural image resolution).
  // The image may be smaller than its container (centered), so we also
  // position the canvas to sit exactly over the image.
  const rect          = img.getBoundingClientRect();
  const containerRect = canvas.parentElement.getBoundingClientRect();

  // Multiply internal canvas resolution by devicePixelRatio for crisp
  // rendering on HiDPI / Retina / mobile screens. CSS size stays the same
  // so layout is unaffected; setTransform makes all draw calls use CSS pixels.
  const dpr = window.devicePixelRatio || 1;

  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  canvas.style.left   = (rect.left - containerRect.left) + 'px';
  canvas.style.top    = (rect.top  - containerRect.top)  + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  let drawn = 0;
  const statusMap = new Map(allTerritories.map(t => [t.num, t.status]));

  finishedSet.forEach(terrNum => {
    const coord = TERRITORY_COORDS[terrNum];

    if (!coord) {
      // Territory exists in sheet but has no coordinates defined yet
      console.warn(`[TerrMap] No coordinates for territory "${terrNum}". Add it to TERRITORY_COORDS in app.js.`);
      return;
    }

    // Convert percentages to CSS pixels (context is already scaled by dpr via setTransform)
    const px = (coord.x      / 100) * rect.width;
    const py = (coord.y      / 100) * rect.height;
    const pw = (coord.width  / 100) * rect.width;
    const ph = (coord.height / 100) * rect.height;

    // Pick color based on whether the territory is finished
    const isFinished = statusMap.get(terrNum) === CONFIG.STATUS_MATCH;
    const fillColor   = isFinished ? CONFIG.FILL_COLOR         : CONFIG.FILL_COLOR_UNFINISHED;
    const strokeColor = isFinished ? CONFIG.STROKE_COLOR       : CONFIG.STROKE_COLOR_UNFINISHED;

    // Fill rectangle
    ctx.fillStyle = fillColor;
    ctx.fillRect(px, py, pw, ph);

    // Border
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = CONFIG.STROKE_WIDTH;
    ctx.strokeRect(px, py, pw, ph);

    // Territory label — centered inside box, responsive font size
    const status    = statusMap.get(terrNum);
    const hasStatus = !!status;
    const cx        = px + pw / 2;

    // Horizontal room: leave 4px breathing space on each side
    const availW = pw - 8;

    // Max size from vertical space (never exceed 11px desktop ceiling)
    const maxByHeight = hasStatus
      ? Math.floor(ph / 2 * 0.80)   // two lines — 80% of half-height
      : Math.floor(ph * 0.70);       // one line  — 70% of height
    const ceiling = Math.min(maxByHeight, 11);

    // Shrink further if text is too wide for the box
    let fontSize = fitFontSize(ctx, terrNum, availW, ceiling);
    if (hasStatus) {
      fontSize = Math.min(fontSize, fitFontSize(ctx, status, availW, ceiling));
    }

    const lineH = fontSize * 1.2;

    ctx.font         = `700 ${fontSize}px ${CONFIG.LABEL_FONT_FAMILY}`;
    ctx.fillStyle    = CONFIG.LABEL_COLOR;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (hasStatus) {
      ctx.fillText(terrNum, cx, py + ph / 2 - lineH / 2);
      ctx.fillText(status,  cx, py + ph / 2 + lineH / 2);
    } else {
      ctx.fillText(terrNum, cx, py + ph / 2);
    }

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';

    drawn++;
  });

  // Trigger fade-in animation via CSS class
  canvas.classList.add('canvas-loaded');

  return drawn;
}


/* ── Section F: Filter Logic ────────────────────────────────── */

/**
 * Populates the Status dropdown from the current full dataset.
 * Preserves the selected value if it still exists after a refresh.
 */
function populateStatusDropdown(territories) {
  const select  = document.getElementById('filter-status');
  const current = select.value;
  const unique  = [...new Set(territories.map(t => t.status).filter(Boolean))].sort();
  select.innerHTML =
    '<option value="">All Statuses</option>' +
    unique.map(s =>
      `<option value="${s}"${s === current ? ' selected' : ''}>${s}</option>`
    ).join('');
}

/**
 * Populates the Remarks dropdown from the current full dataset.
 * Preserves the selected value if it still exists after a refresh.
 */
function populateRemarksDropdown(territories) {
  const select  = document.getElementById('filter-remarks');
  const current = select.value;
  const unique  = [...new Set(territories.map(t => t.remarks).filter(Boolean))].sort();
  select.innerHTML =
    '<option value="">All Remarks</option>' +
    unique.map(r =>
      `<option value="${r}"${r === current ? ' selected' : ''}>${r}</option>`
    ).join('');
}

/**
 * Converts MM/DD/YYYY (Google Sheets display format) to YYYY-MM-DD for comparison.
 * Falls back to the original string if it doesn't match the expected pattern.
 */
function toISODate(dateStr) {
  // Sheet format: DD/MM/YYYY → convert to YYYY-MM-DD for comparison
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return dateStr;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Filters allTerritories using the active filter state and redraws overlays.
 */
function applyFilters() {
  const filtered = allTerritories.filter(t => {
    if (activeStatusFilter  && t.status  !== activeStatusFilter)  return false;
    if (activeRemarksFilter && t.remarks.trim() !== activeRemarksFilter.trim()) return false;
    const isoDate = toISODate(t.date);
    if (activeDateFrom && isoDate < activeDateFrom) return false;
    if (activeDateTo   && isoDate > activeDateTo)   return false;
    return true;
  });

  // DEBUG — open DevTools Console to see which territories passed and their raw dates
  console.log('[TerrMap] Filtered rows (' + filtered.length + '):', filtered.map(t => t.num + ' | date=' + t.date + ' → ' + toISODate(t.date) + ' | remarks=' + t.remarks));
  if (filtered.length !== new Set(filtered.map(t => t.num)).size) {
    console.warn('[TerrMap] Duplicate territory numbers in filtered results — some are being collapsed by Set.');
  }
  const filteredSet = new Set(filtered.map(t => t.num));
  lastFinishedSet   = filteredSet;
  drawOverlays(filteredSet);

  // Update result-count remark
  const countEl = document.getElementById('filter-result-count');
  if (countEl) {
    const n = filteredSet.size;
    const nums = [...filteredSet].sort((a, b) => Number(a) - Number(b)).join(', ');
    countEl.textContent = n === 0
      ? 'No territories matched'
      : `Showing ${n} ${n === 1 ? 'territory' : 'territories'}: ${nums}`;
  }
}


/* ── Section G: Resize Handling ─────────────────────────────── */

/**
 * Watches the map image for size changes (window resize, zoom, etc.)
 * and redraws overlays to stay aligned with the image.
 */
function setupResizeObserver() {
  const img = document.getElementById('map-image');

  const ro = new ResizeObserver(() => {
    if (lastFinishedSet.size > 0) {
      drawOverlays(lastFinishedSet);
    }
  });

  ro.observe(img);
}


/* ── Section H: Main Load / Refresh Cycle ───────────────────── */

/**
 * Fetches data, updates the canvas, and updates the UI status bar.
 * Called on initial load and on each Refresh button click.
 */
async function loadData() {
  const spinner     = document.getElementById('loading-spinner');
  const errorBanner = document.getElementById('error-banner');
const updatedEl   = document.getElementById('last-updated');
  const refreshBtn  = document.getElementById('refresh-btn');
  const canvas      = document.getElementById('overlay-canvas');

  // ── Reset UI state ──
  spinner.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  canvas.classList.remove('canvas-loaded');   // Reset fade-in for next draw
  refreshBtn.setAttribute('data-loading', '');

  try {
    const { finished, total, allTerritories: territories, allRows } = await fetchTerritoryData();

    // ── Debug: log what the sheet returned ───────────────────────
    console.log(`[TerrMap] Sheet rows fetched: ${total}`);
    console.log(`[TerrMap] Territories marked "Finished":`, [...finished]);
    console.log(`[TerrMap] All sheet rows (Col E–H):`, allRows);

    // Store full dataset and refresh dropdown, then apply active filters
    allTerritories = territories;
    populateStatusDropdown(allTerritories);
    populateRemarksDropdown(allTerritories);
    applyFilters();   // sets lastFinishedSet to the filtered result and redraws

    // Status bar
    const drawn = [...finished].filter(t => TERRITORY_COORDS[t]).length;
    updatedEl.textContent = `SYNCED ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    if (finished.size === 0) {
      // No finished territories — could be wrong column or status spelling
      errorBanner.textContent =
        `No "Finished" territories found in the sheet (${total} rows read). ` +
        `Open DevTools Console (F12) to see all row values and verify Column F/G contents.`;
      errorBanner.classList.remove('hidden');
    } else if (drawn === 0) {
      // Territories marked Finished but none have coordinates defined
      errorBanner.textContent =
        `${finished.size} "Finished" territories found but none have coordinates in TERRITORY_COORDS. ` +
        `Territory numbers from sheet: ${[...finished].join(', ')}. ` +
        `Update TERRITORY_COORDS in app.js with these numbers.`;
      errorBanner.classList.remove('hidden');
    } else if (drawn < finished.size) {
      const missing = [...finished].filter(t => !TERRITORY_COORDS[t]);
      errorBanner.textContent =
        `${drawn} overlays drawn. ${missing.length} territories have no coordinates yet: ${missing.join(', ')}.`;
      errorBanner.classList.remove('hidden');
    }

  } catch (err) {
    // Show error banner
    errorBanner.textContent = `ERR: ${err.message}`;
    errorBanner.classList.remove('hidden');
updatedEl.textContent = 'FETCH FAILED';
    console.error('[TerrMap] Data fetch failed:', err);
  } finally {
    spinner.classList.add('hidden');
    refreshBtn.removeAttribute('data-loading');
  }
}


/* ── Section I: Initialisation ──────────────────────────────── */

function init() {
  const img        = document.getElementById('map-image');
  const refreshBtn = document.getElementById('refresh-btn');

  // Wire up the Refresh button
  refreshBtn.addEventListener('click', loadData);

  // Wire up filter controls
  document.getElementById('filter-status').addEventListener('change', e => {
    activeStatusFilter = e.target.value;
    applyFilters();
  });
  document.getElementById('filter-remarks').addEventListener('change', e => {
    activeRemarksFilter = e.target.value;
    applyFilters();
  });
  document.getElementById('filter-date-from').addEventListener('change', e => {
    activeDateFrom = e.target.value;
    applyFilters();
  });
  document.getElementById('filter-date-to').addEventListener('change', e => {
    activeDateTo = e.target.value;
    applyFilters();
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('filter-status').value    = '';
    document.getElementById('filter-remarks').value   = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value   = '';
    activeStatusFilter  = '';
    activeRemarksFilter = '';
    activeDateFrom      = '';
    activeDateTo        = '';
    applyFilters();
  });

  // Set up resize observer for responsive canvas redraws
  setupResizeObserver();

  // Trigger initial data load once the image is ready.
  // img.complete is true if the image was already in the browser cache.
  if (img.complete && img.naturalWidth > 0) {
    loadData();
  } else {
    img.addEventListener('load', loadData, { once: true });

    // Handle load error (e.g. wrong file path)
    img.addEventListener('error', () => {
      const errorBanner = document.getElementById('error-banner');
      const spinner     = document.getElementById('loading-spinner');
      errorBanner.textContent =
        'ERR: Map image failed to load. Check that the JPG file exists in the parent folder.';
      errorBanner.classList.remove('hidden');
      spinner.classList.add('hidden');
    }, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', init);
