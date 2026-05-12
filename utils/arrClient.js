import fetch from 'node-fetch';
import { ARR } from '../config.js';

const TIMEOUT_MS = 6000;
const MEDIA_APPS = ['sonarr', 'radarr', 'lidarr'];

/** Apps that are configured (have an API key set). */
export function configuredApps() {
  return Object.entries(ARR)
    .filter(([, cfg]) => cfg.apiKey)
    .map(([key]) => key);
}

function makeSignal() {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return ctrl.signal;
}

/**
 * Fetch from a *arr (Sonarr / Radarr / Lidarr / Prowlarr) API endpoint.
 */
async function fetchArr(appName, endpoint, params = {}) {
  const cfg = ARR[appName];
  const url = new URL(`${cfg.url}${cfg.apiBase}${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), {
    headers: { 'X-Api-Key': cfg.apiKey },
    signal: makeSignal(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetch from the SABnzbd JSON API.
 */
async function fetchSabnzbd(mode, extra = {}) {
  const cfg = ARR.sabnzbd;
  const url = new URL(`${cfg.url}/sabnzbd/api`);
  url.searchParams.set('apikey', cfg.apiKey);
  url.searchParams.set('output', 'json');
  url.searchParams.set('mode', mode);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), { signal: makeSignal() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Health ──────────────────────────────────────────────────────────────────

/**
 * Get health for one app.
 * @returns {{ ok: boolean, issues: Array<{level: string, message: string}>, unreachable?: boolean }}
 */
export async function getHealth(appName) {
  try {
    if (appName === 'sabnzbd') {
      // SABnzbd has no /health endpoint — use auth ping instead
      await fetchSabnzbd('auth');
      return { ok: true, issues: [] };
    }
    const issues = await fetchArr(appName, '/health');
    return {
      ok: issues.length === 0,
      issues: issues.map(i => ({ level: i.type?.toLowerCase() ?? 'warning', message: i.message })),
    };
  } catch (err) {
    return { ok: false, issues: [{ level: 'error', message: err.message }], unreachable: true };
  }
}

/** Get health for all configured apps. */
export async function getAllHealth() {
  const apps = configuredApps();
  const results = {};
  await Promise.all(apps.map(async (app) => {
    results[app] = await getHealth(app);
  }));
  return results;
}

// ─── Queue ───────────────────────────────────────────────────────────────────

/**
 * Get the active download queue for one app.
 * @returns {Array<{title: string, status: string, progress: number, eta?: string}>}
 */
export async function getQueue(appName) {
  if (appName === 'prowlarr') return [];

  if (appName === 'sabnzbd') {
    const data = await fetchSabnzbd('queue', { start: 0, limit: 10 });
    return (data.queue?.slots ?? []).map(s => ({
      title: s.filename,
      status: s.status,
      progress: parseFloat(s.percentage) || 0,
      eta: s.timeleft || null,
    }));
  }

  const data = await fetchArr(appName, '/queue', { pageSize: 10, page: 1 });
  return (data.records ?? []).map(r => ({
    title: r.title,
    status: r.status,
    progress: r.size > 0 ? ((r.size - (r.sizeleft ?? r.size)) / r.size) * 100 : 0,
    eta: null,
  }));
}

// ─── Calendar ────────────────────────────────────────────────────────────────

/**
 * Get upcoming releases for the next `days` days.
 * Only meaningful for sonarr, radarr, lidarr.
 * @returns {Array<{title: string, date: string, extra: string}>}
 */
export async function getCalendar(appName, days = 7) {
  if (!MEDIA_APPS.includes(appName)) return [];
  const start = new Date().toISOString().split('T')[0];
  const end = new Date(Date.now() + days * 86_400_000).toISOString().split('T')[0];
  const items = await fetchArr(appName, '/calendar', { start, end });
  return items.map(i => ({
    title: i.title ?? i.artistName ?? '?',
    date: (i.airDateUtc ?? i.releaseDate ?? '').slice(0, 10),
    extra: i.seriesTitle ?? i.albumType ?? '',
  }));
}

// ─── Wanted / Missing ────────────────────────────────────────────────────────

/**
 * Get up to 5 missing/wanted items.
 * Only meaningful for sonarr, radarr, lidarr.
 * @returns {Array<{title: string, extra?: string, year?: number}>}
 */
export async function getMissing(appName) {
  if (!MEDIA_APPS.includes(appName)) return [];

  if (appName === 'radarr') {
    const movies = await fetchArr(appName, '/movie');
    return movies
      .filter(m => !m.hasFile && m.monitored)
      .slice(0, 5)
      .map(m => ({ title: m.title, year: m.year }));
  }

  const data = await fetchArr(appName, '/wanted/missing', { pageSize: 5, page: 1 });
  return (data.records ?? []).map(r => ({
    title: r.series?.title ?? r.artist?.artistName ?? r.title ?? '?',
    extra: r.title ?? '',
  }));
}

// ─── Disk Space ──────────────────────────────────────────────────────────────

/**
 * Get disk space info for one app.
 * @returns {Array<{path: string, free: number, total: number}>}  (bytes)
 */
export async function getDiskSpace(appName) {
  if (appName === 'prowlarr') return [];

  if (appName === 'sabnzbd') {
    const data = await fetchSabnzbd('diskspace');
    // SABnzbd returns values in GB as strings
    return Object.entries(data).map(([path, info]) => ({
      path,
      free: parseFloat(info.disk_free) * 1e9,
      total: parseFloat(info.disk_size) * 1e9,
    }));
  }

  const items = await fetchArr(appName, '/diskspace');
  return (Array.isArray(items) ? items : []).map(d => ({
    path: d.path,
    free: d.freeSpace,
    total: d.totalSpace,
  }));
}
