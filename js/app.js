import { fetchTodayGames, fetchLiveFeed, fetchSchedule, fetchStandings } from './api.js';
import { renderToday, renderSchedule, renderStandings, renderError } from './ui.js';

// ── Service worker ────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}

// ── State ─────────────────────────────────────────────────────────────────────

let currentView   = 'today';
let scheduleFilter = 'all';
let refreshTimer  = null;
const indicator   = document.getElementById('refresh-indicator');

// ── Tab navigation ────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    if (view === currentView) return;

    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t === btn);
      t.setAttribute('aria-selected', String(t === btn));
    });

    document.querySelectorAll('.view').forEach(v => {
      const active = v.id === `view-${view}`;
      v.classList.toggle('active', active);
      v.hidden = !active;
    });

    currentView = view;
    clearTimeout(refreshTimer);
    loadView(view);
  });
});

// ── Schedule filters ──────────────────────────────────────────────────────────

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    scheduleFilter = btn.dataset.filter;
    loadSchedule();
  });
});

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadToday() {
  clearTimeout(refreshTimer);
  pulseIndicator();

  try {
    const games = await fetchTodayGames();

    if (!games.length) {
      renderToday([], null);
      scheduleRefresh(false);
      return;
    }

    const isLive = games.some(g => g.status.abstractGameState === 'Live');

    const feeds = await Promise.all(
      games.map(g => {
        const s = g.status.abstractGameState;
        if (s === 'Live' || s === 'Final') return fetchLiveFeed(g.gamePk).catch(() => null);
        return Promise.resolve(null);
      })
    );

    renderToday(games, feeds);
    scheduleRefresh(isLive);
  } catch {
    renderError('today-content', 'Could not load game data.<br>Check your connection and try again.');
    scheduleRefresh(false);
  }
}

async function loadSchedule() {
  try {
    const games = await fetchSchedule();
    renderSchedule(games, scheduleFilter);
  } catch {
    renderError('schedule-content', 'Could not load schedule.');
  }
}

async function loadStandings() {
  try {
    const rows = await fetchStandings();
    renderStandings(rows);
  } catch {
    renderError('standings-content', 'Could not load standings.');
  }
}

function loadView(view) {
  if (view === 'today')     loadToday();
  if (view === 'schedule')  loadSchedule();
  if (view === 'standings') loadStandings();
}

// Refresh every 30s during live games, every 5 min otherwise
function scheduleRefresh(isLive) {
  const delay = isLive ? 30_000 : 5 * 60_000;
  refreshTimer = setTimeout(() => {
    if (currentView === 'today') loadToday();
  }, delay);
}

function pulseIndicator() {
  indicator.classList.add('active');
  setTimeout(() => indicator.classList.remove('active'), 1200);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

loadToday();
