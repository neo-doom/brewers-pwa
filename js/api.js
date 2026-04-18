const BASE    = 'https://statsapi.mlb.com/api/v1';
const BASE_11 = 'https://statsapi.mlb.com/api/v1.1';

export const TEAM_ID = 158; // Milwaukee Brewers
export const SEASON  = new Date().getFullYear();

function localDateStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

export async function fetchTodayGames() {
  const date = localDateStr();
  const data = await get(
    `${BASE}/schedule?sportId=1&teamId=${TEAM_ID}&date=${date}` +
    `&hydrate=linescore,probablePitcher,team`
  );
  const dates = data.dates ?? [];
  if (!dates.length) return [];
  return dates[0].games ?? [];
}

export async function fetchLiveFeed(gamePk) {
  return get(`${BASE_11}/game/${gamePk}/feed/live`);
}

export async function fetchSchedule() {
  const key     = `schedule_${SEASON}`;
  const keyTime = `schedule_${SEASON}_time`;
  const cached  = localStorage.getItem(key);
  const cachedAt = Number(localStorage.getItem(keyTime) ?? 0);
  const stale   = Date.now() - cachedAt > 5 * 60 * 1000;

  if (cached && !stale) return JSON.parse(cached);

  const data = await get(
    `${BASE}/schedule?sportId=1&teamId=${TEAM_ID}&season=${SEASON}` +
    `&startDate=${SEASON}-01-01&endDate=${SEASON}-12-31&hydrate=linescore,team`
  );

  // Attach localDate from the dates array so we can group/sort correctly
  const games = (data.dates ?? []).flatMap(d =>
    (d.games ?? []).map(g => ({ ...g, localDate: d.date }))
  );

  localStorage.setItem(key, JSON.stringify(games));
  localStorage.setItem(keyTime, String(Date.now()));
  return games;
}

export async function fetchStandings() {
  // NL league id = 104, NL Central division id = 205
  const data = await get(
    `${BASE}/standings?leagueId=104&standingsType=regularSeason` +
    `&season=${SEASON}&hydrate=team,division`
  );
  const nlCentral = (data.records ?? []).find(r => r.division?.id === 205);
  return nlCentral?.teamRecords ?? [];
}
