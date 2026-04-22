import { TEAM_ID } from './api.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function localDateStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function gameTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function badge(state, detailedState) {
  if (state === 'Live') return `<span class="badge badge-live">LIVE</span>`;
  if (state === 'Final') return `<span class="badge badge-final">FINAL</span>`;
  if (/Postponed/i.test(detailedState)) return `<span class="badge badge-postponed">PPD</span>`;
  if (/Suspended/i.test(detailedState)) return `<span class="badge badge-postponed">SUSP</span>`;
  return `<span class="badge badge-preview">UPCOMING</span>`;
}

function runners(offense) {
  if (!offense) return '';
  const f = offense.first  ? '●' : '○';
  const s = offense.second ? '●' : '○';
  const t = offense.third  ? '●' : '○';
  // display order: 3B · 2B · 1B
  return `<span class="runners" title="Runners on base">${t}${s}${f}</span>`;
}

// ── Today ─────────────────────────────────────────────────────────────────────

function ready(id) {
  const el = document.getElementById(id);
  el.classList.remove('loading-state');
  return el;
}

export function renderUpcoming(games) {
  const today = localDateStr();
  const upcoming = games
    .filter(g => (g.localDate ?? g.gameDate.slice(0, 10)) > today)
    .slice(0, 4);

  if (!upcoming.length) return '';

  const rows = upcoming.map(g => {
    const isHome = g.teams.home.team.id === TEAM_ID;
    const opp    = isHome ? g.teams.away : g.teams.home;
    const date   = g.localDate ?? g.gameDate.slice(0, 10);
    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'numeric', day: 'numeric',
    });
    return `
      <div class="upcoming-row">
        <span class="upcoming-date">${dateLabel}</span>
        <span class="upcoming-ha">${isHome ? 'vs' : '@'}</span>
        <span class="upcoming-opp">${opp.team.abbreviation}</span>
        <span class="upcoming-time">${gameTime(g.gameDate)}</span>
      </div>`;
  }).join('');

  return `<div class="upcoming-section"><div class="upcoming-header">Upcoming</div>${rows}</div>`;
}

export function renderToday(games, feeds, allGames = []) {
  const el = ready('today-content');

  if (!games?.length) {
    const upcomingHtml = allGames.length ? renderUpcoming(allGames) : '';
    el.innerHTML = `<div class="no-game">No game today.</div>${upcomingHtml}`;
    return;
  }

  el.innerHTML = games.map((game, i) => {
    const feed   = feeds?.[i] ?? null;
    const state  = game.status.abstractGameState;
    const detail = game.status.detailedState;
    const isHome = game.teams.home.team.id === TEAM_ID;
    const mil    = isHome ? game.teams.home : game.teams.away;
    const opp    = isHome ? game.teams.away : game.teams.home;

    const milScore  = mil.score ?? '–';
    const oppScore  = opp.score ?? '–';
    const milRecord = mil.leagueRecord ? `${mil.leagueRecord.wins}-${mil.leagueRecord.losses}` : '';
    const oppRecord = opp.leagueRecord ? `${opp.leagueRecord.wins}-${opp.leagueRecord.losses}` : '';

    const milWon = state === 'Final' && (mil.score ?? 0) > (opp.score ?? 0);
    const oppWon = state === 'Final' && (opp.score ?? 0) > (mil.score ?? 0);

    let situationHtml = '';
    let pitcherHtml   = '';

    if (state === 'Live' && feed) {
      const ls = feed.liveData?.linescore;
      if (ls) {
        const half    = ls.inningHalf === 'Bottom' ? '▾' : '▴';
        const inning  = ls.currentInningOrdinal ?? '';
        const outs    = ls.outs ?? 0;
        const outsStr = outs === 1 ? '1 out' : `${outs} outs`;
        const balls   = ls.balls ?? 0;
        const strikes = ls.strikes ?? 0;
        situationHtml = `
          <div class="situation">
            <span class="inning">${half} ${inning}</span>
            <span>${outsStr}</span>
            ${runners(ls.offense)}
          </div>
          <div class="count">${balls}-${strikes}</div>`;
      }
    }

    if (state === 'Final' && feed) {
      const dec = feed.liveData?.decisions;
      if (dec?.winner && dec?.loser) {
        pitcherHtml = `
          <div class="pitchers">
            W: ${dec.winner.fullName} &nbsp;·&nbsp; L: ${dec.loser.fullName}
          </div>`;
      }
    }

    if (state === 'Preview' || (!state && !feed)) {
      const awayPP = game.teams.away.probablePitcher?.fullName ?? 'TBD';
      const homePP = game.teams.home.probablePitcher?.fullName ?? 'TBD';
      pitcherHtml   = `<div class="pitchers">${game.teams.away.team.abbreviation}: ${awayPP} vs ${game.teams.home.team.abbreviation}: ${homePP}</div>`;
      situationHtml = `<div class="game-time">${gameTime(game.gameDate)}</div>`;
    }

    const dhLabel = game.doubleHeader !== 'N'
      ? `<span class="dh-label">Game ${game.gameNumber}</span>`
      : '';

    return `
      <div class="score-card">
        <div class="score-card-header">
          ${badge(state, detail)}
          ${dhLabel}
          <span class="venue">${isHome ? 'HOME' : 'AWAY'} · ${opp.team.abbreviation}</span>
        </div>
        <div class="matchup">
          <div class="team-row brewers-row ${milWon ? 'winner' : ''}">
            <span class="team-abbr">MIL</span>
            <span class="team-record">${milRecord}</span>
            <span class="team-score">${milScore}</span>
          </div>
          <div class="team-row ${oppWon ? 'winner' : ''}">
            <span class="team-abbr">${opp.team.abbreviation}</span>
            <span class="team-record">${oppRecord}</span>
            <span class="team-score">${oppScore}</span>
          </div>
        </div>
        ${situationHtml}
        ${pitcherHtml}
      </div>`;
  }).join('') + (allGames.length ? renderUpcoming(allGames) : '');
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export function renderSchedule(games, filter = 'all', hideSpringTraining = true, scrollToToday = false) {
  const el    = ready('schedule-content');
  const today = localDateStr();

  const regularOnly = g => g.gameType === 'R';
  const displayGames = hideSpringTraining ? games.filter(regularOnly) : games;

  let list = displayGames;
  if (filter === 'home') list = displayGames.filter(g => g.teams.home.team.id === TEAM_ID);
  if (filter === 'away') list = displayGames.filter(g => g.teams.away.team.id === TEAM_ID);

  // Record counts only regular season finals with a decisive result
  let wins = 0, losses = 0;
  for (const g of games.filter(regularOnly)) {
    if (g.status.abstractGameState !== 'Final') continue;
    const isHome = g.teams.home.team.id === TEAM_ID;
    const mil = isHome ? g.teams.home : g.teams.away;
    const opp = isHome ? g.teams.away : g.teams.home;
    const milScore = mil.score ?? 0;
    const oppScore = opp.score ?? 0;
    if (milScore > oppScore) wins++;
    else if (oppScore > milScore) losses++;
    // equal scores (postponed/suspended artifacts) are intentionally skipped
  }

  // Group by month using localDate (YYYY-MM-DD)
  const byMonth = {};
  for (const g of list) {
    const month = (g.localDate ?? g.gameDate.slice(0, 10)).slice(0, 7);
    (byMonth[month] ??= []).push(g);
  }

  let html = `<div class="season-record">${wins}–${losses}</div>`;

  for (const month of Object.keys(byMonth).sort()) {
    const [year, m] = month.split('-');
    html += `<div class="month-group"><div class="month-header">${MONTHS[+m - 1]} ${year}</div>`;

    for (const g of byMonth[month]) {
      const state  = g.status.abstractGameState;
      const detail = g.status.detailedState;
      const isHome = g.teams.home.team.id === TEAM_ID;
      const mil    = isHome ? g.teams.home : g.teams.away;
      const opp    = isHome ? g.teams.away : g.teams.home;
      const date   = g.localDate ?? g.gameDate.slice(0, 10);
      const isToday = date === today;

      const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'numeric', day: 'numeric',
      });

      let resultHtml  = '';
      let resultClass = '';

      if (/Postponed/i.test(detail)) {
        resultHtml = `<span class="result-ppd">PPD</span>`;
      } else if (state === 'Final') {
        const milScore = mil.score ?? 0;
        const oppScore = opp.score ?? 0;
        const won = milScore > oppScore;
        resultClass = won ? 'win' : 'loss';
        resultHtml = `<span class="result-wl ${resultClass}">${won ? 'W' : 'L'}</span><span class="result-score">${milScore}–${oppScore}</span>`;
      } else if (state === 'Live') {
        resultHtml = `<span class="badge-live-sm">LIVE</span><span class="result-score">${mil.score ?? 0}–${opp.score ?? 0}</span>`;
      } else {
        resultHtml = `<span class="result-time">${gameTime(g.gameDate)}</span>`;
      }

      html += `
        <div class="schedule-row ${isToday ? 'today-row' : ''}">
          <span class="sched-date">${dateLabel}</span>
          <span class="sched-ha">${isHome ? 'vs' : '@'}</span>
          <span class="sched-opp">${opp.team.abbreviation}</span>
          <span class="sched-result">${resultHtml}</span>
        </div>`;
    }

    html += `</div>`;
  }

  el.innerHTML = html;

  if (scrollToToday) {
    const todayRow = el.querySelector('.today-row');
    if (todayRow) todayRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ── Standings ─────────────────────────────────────────────────────────────────

export function renderStandings(rows) {
  const el = ready('standings-content');

  if (!rows.length) {
    el.innerHTML = `<div class="no-data">Standings unavailable.</div>`;
    return;
  }

  const sorted = [...rows].sort((a, b) =>
    parseFloat(b.winningPercentage) - parseFloat(a.winningPercentage)
  );

  const trs = sorted.map(r => {
    const isBrewers = r.team.id === TEAM_ID;
    const abbr = r.team.abbreviation ?? r.team.name.slice(0, 3).toUpperCase();
    const pct  = parseFloat(r.winningPercentage).toFixed(3).replace(/^0/, '');
    const gb   = r.gamesBack === '-' ? '–' : r.gamesBack;
    const stk  = r.streak?.streakCode ?? '–';
    const l10  = r.records?.splitRecords?.find(s => s.type === 'lastTen');
    const l10s = l10 ? `${l10.wins}-${l10.losses}` : '–';

    return `
      <tr class="${isBrewers ? 'brewers-row' : ''}">
        <td>${abbr}</td>
        <td>${r.wins}</td>
        <td>${r.losses}</td>
        <td>${pct}</td>
        <td>${gb}</td>
        <td class="streak">${stk}</td>
        <td>${l10s}</td>
      </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="standings-container">
      <div class="division-label">NL Central</div>
      <table class="standings-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>W</th><th>L</th><th>PCT</th><th>GB</th>
            <th>STK</th><th>L10</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`;
}

// ── Error ─────────────────────────────────────────────────────────────────────

export function renderError(elId, msg) {
  const el = ready(elId);
  if (el) el.innerHTML = `<div class="error-state">${msg}</div>`;
}
