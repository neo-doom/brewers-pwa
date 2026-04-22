import { fetchTodayGames, fetchLiveFeed, fetchSchedule, fetchStandings } from './api.js';
import { renderToday, renderSchedule, renderStandings, renderError } from './ui.js';

// ── Service worker ────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}

// ── State ─────────────────────────────────────────────────────────────────────

let currentView        = 'today';
let scheduleFilter     = 'all';
let hideSpringTraining = true;
let scheduleLoaded     = false;
let refreshTimer       = null;
const indicator        = document.getElementById('refresh-indicator');

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
    loadSchedule(false); // don't re-scroll when filtering
  });
});

// ── Spring training toggle ────────────────────────────────────────────────────

const stToggle = document.getElementById('hide-st-toggle');
stToggle.classList.toggle('active', hideSpringTraining);
stToggle.addEventListener('click', () => {
  hideSpringTraining = !hideSpringTraining;
  stToggle.classList.toggle('active', hideSpringTraining);
  loadSchedule(false); // don't re-scroll when toggling
});

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadToday() {
  clearTimeout(refreshTimer);
  pulseIndicator();

  try {
    const [games, allGames] = await Promise.all([
      fetchTodayGames(),
      fetchSchedule().catch(() => []),
    ]);

    if (!games.length) {
      renderToday([], null, allGames);
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

    renderToday(games, feeds, allGames);
    scheduleRefresh(isLive);
  } catch {
    renderError('today-content', 'Could not load game data.<br>Check your connection and try again.');
    scheduleRefresh(false);
  }
}

async function loadSchedule(scrollToToday = false) {
  try {
    const games = await fetchSchedule();
    const isInitial = !scheduleLoaded;
    scheduleLoaded = true;
    renderSchedule(games, scheduleFilter, hideSpringTraining, scrollToToday || isInitial);
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
