import type {
  AdminAnalyticsResponseDto,
  AdminAnalyticsSubject,
  AdminPlayerAnalyticsRowDto,
  AdminTeamAnalyticsRowDto,
} from "@lufa/contracts";

export interface AnalyticsGameRecord {
  homeTeam?: { id: string; name: string } | null;
  awayTeam?: { id: string; name: string } | null;
  homeScore: number;
  awayScore: number;
}

export interface AnalyticsEventRecord {
  teamId: string;
  player?: { id: string; name: string; teamName: string } | null;
  type: string;
  quarter: number;
  points?: number | null;
}

type TeamRow = AdminTeamAnalyticsRowDto;
type PlayerRow = AdminPlayerAnalyticsRowDto;

const top = <T extends { name: string }>(rows: T[], value: (row: T) => number) =>
  [...rows]
    .sort((left, right) => value(right) - value(left) || left.name.localeCompare(right.name, "es"))
    .slice(0, 5);

function teamRow(id: string, name: string): TeamRow {
  return { id, name, games: 0, wins: 0, pointsFor: 0, pointsAgainst: 0, pointDifferential: 0, latePoints: 0, defensiveDisruptions: 0, interceptions: 0, sacks: 0, discipline: 0, penalties: 0, unsportsmanlike: 0 };
}

function playerRow(id: string, name: string, teamName: string): PlayerRow {
  return { id, name, teamName, points: 0, touchdowns: 0, latePoints: 0, defensiveDisruptions: 0, interceptions: 0, sacks: 0, discipline: 0, penalties: 0, unsportsmanlike: 0 };
}

export function buildAdminAnalytics(
  subject: AdminAnalyticsSubject,
  games: AnalyticsGameRecord[],
  events: AnalyticsEventRecord[],
): AdminAnalyticsResponseDto {
  const teams = new Map<string, TeamRow>();
  const players = new Map<string, PlayerRow>();
  const getTeam = (id: string, name = "Equipo sin nombre") => {
    const existing = teams.get(id);
    if (existing) return existing;
    const created = teamRow(id, name);
    teams.set(id, created);
    return created;
  };

  for (const game of games) {
    if (!game.homeTeam || !game.awayTeam) continue;
    const home = getTeam(game.homeTeam.id, game.homeTeam.name);
    const away = getTeam(game.awayTeam.id, game.awayTeam.name);
    home.games += 1;
    away.games += 1;
    home.pointsFor += game.homeScore;
    home.pointsAgainst += game.awayScore;
    away.pointsFor += game.awayScore;
    away.pointsAgainst += game.homeScore;
    if (game.homeScore > game.awayScore) home.wins += 1;
    if (game.awayScore > game.homeScore) away.wins += 1;
  }

  for (const event of events) {
    const isPenalty = event.type === "penalty";
    const isUnsportsmanlike = event.type === "unsportsmanlike";
    if (isPenalty || isUnsportsmanlike) {
      const team = getTeam(event.teamId);
      team.discipline += 1;
      if (isPenalty) team.penalties += 1;
      if (isUnsportsmanlike) team.unsportsmanlike += 1;
    }
    const isInterception = event.type === "interception" || event.type === "pick_six";
    const isSack = event.type === "sack";
    const points = Number(event.points || 0);
    const isLateScore = event.quarter >= 4 && points > 0;
    const team = getTeam(event.teamId);
    if (isLateScore) team.latePoints += points;
    if (isInterception) team.interceptions += 1;
    if (isSack) team.sacks += 1;
    if (isInterception || isSack) team.defensiveDisruptions += 1;
    if (!event.player) continue;
    const player = players.get(event.player.id) || playerRow(event.player.id, event.player.name, event.player.teamName);
    players.set(player.id, player);
    player.points += points;
    if (event.type === "touchdown") player.touchdowns += 1;
    if (isLateScore) player.latePoints += points;
    if (isInterception) player.interceptions += 1;
    if (isSack) player.sacks += 1;
    if (isInterception || isSack) player.defensiveDisruptions += 1;
    if (isPenalty || isUnsportsmanlike) {
      player.discipline += 1;
      if (isPenalty) player.penalties += 1;
      if (isUnsportsmanlike) player.unsportsmanlike += 1;
    }
  }

  const teamRows = [...teams.values()].map((row) => ({ ...row, pointDifferential: row.pointsFor - row.pointsAgainst }));
  const playerRows = [...players.values()];
  const discipline = (rows: Array<TeamRow | PlayerRow>) => rows.reduce((sum, row) => sum + row.discipline, 0);
  const penalties = (rows: Array<TeamRow | PlayerRow>) => rows.reduce((sum, row) => sum + row.penalties, 0);
  const unsportsmanlike = (rows: Array<TeamRow | PlayerRow>) => rows.reduce((sum, row) => sum + row.unsportsmanlike, 0);

  if (subject === "teams") {
    return {
      subject,
      totals: {
        entities: teamRows.length,
        games: games.length,
        points: teamRows.reduce((sum, row) => sum + row.pointsFor, 0),
        touchdowns: 0,
        latePoints: teamRows.reduce((sum, row) => sum + row.latePoints, 0),
        defensiveDisruptions: teamRows.reduce((sum, row) => sum + row.defensiveDisruptions, 0),
        interceptions: teamRows.reduce((sum, row) => sum + row.interceptions, 0),
        sacks: teamRows.reduce((sum, row) => sum + row.sacks, 0),
        discipline: discipline(teamRows), penalties: penalties(teamRows), unsportsmanlike: unsportsmanlike(teamRows),
      },
      teams: {
        lateScoring: top(teamRows.filter((row) => row.latePoints > 0), (row) => row.latePoints),
        defense: top(teamRows.filter((row) => row.defensiveDisruptions > 0), (row) => row.defensiveDisruptions),
        discipline: top(teamRows.filter((row) => row.discipline > 0), (row) => row.discipline),
      },
      players: null,
    };
  }

  return {
    subject,
    totals: {
      entities: playerRows.length,
      games: games.length,
      points: playerRows.reduce((sum, row) => sum + row.points, 0),
      touchdowns: playerRows.reduce((sum, row) => sum + row.touchdowns, 0),
      latePoints: playerRows.reduce((sum, row) => sum + row.latePoints, 0),
      defensiveDisruptions: playerRows.reduce((sum, row) => sum + row.defensiveDisruptions, 0),
      interceptions: playerRows.reduce((sum, row) => sum + row.interceptions, 0),
      sacks: playerRows.reduce((sum, row) => sum + row.sacks, 0),
      discipline: discipline(playerRows), penalties: penalties(playerRows), unsportsmanlike: unsportsmanlike(playerRows),
    },
    teams: null,
    players: {
      lateScoring: top(playerRows.filter((row) => row.latePoints > 0), (row) => row.latePoints),
      defense: top(playerRows.filter((row) => row.defensiveDisruptions > 0), (row) => row.defensiveDisruptions),
      discipline: top(playerRows.filter((row) => row.discipline > 0), (row) => row.discipline),
    },
  };
}
