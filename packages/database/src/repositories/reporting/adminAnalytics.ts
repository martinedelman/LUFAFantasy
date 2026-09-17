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
  return { id, name, games: 0, wins: 0, pointsFor: 0, pointsAgainst: 0, pointDifferential: 0, firstHalfPoints: 0, secondHalfPoints: 0, firstHalfScores: 0, secondHalfScores: 0, topScorerShare: 0, topScorerName: "", discipline: 0, penalties: 0, unsportsmanlike: 0 };
}

function playerRow(id: string, name: string, teamName: string): PlayerRow {
  return { id, name, teamName, points: 0, touchdowns: 0, firstHalfPoints: 0, secondHalfPoints: 0, firstHalfScores: 0, secondHalfScores: 0, eventVariety: 0, discipline: 0, penalties: 0, unsportsmanlike: 0 };
}

export function buildAdminAnalytics(
  subject: AdminAnalyticsSubject,
  games: AnalyticsGameRecord[],
  events: AnalyticsEventRecord[],
): AdminAnalyticsResponseDto {
  const teams = new Map<string, TeamRow>();
  const players = new Map<string, PlayerRow>();
  const playerEventTypes = new Map<string, Set<string>>();
  const teamScorerPoints = new Map<string, Map<string, number>>();
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
    const points = Number(event.points || 0);
    const isFirstHalfScore = event.quarter === 1 && points > 0;
    const isSecondHalfScore = event.quarter === 2 && points > 0;
    const team = getTeam(event.teamId);
    if (isFirstHalfScore) {
      team.firstHalfPoints += points;
      team.firstHalfScores += 1;
    }
    if (isSecondHalfScore) {
      team.secondHalfPoints += points;
      team.secondHalfScores += 1;
    }
    if (!event.player) continue;
    const player = players.get(event.player.id) || playerRow(event.player.id, event.player.name, event.player.teamName);
    players.set(player.id, player);
    player.points += points;
    if (event.type === "touchdown") player.touchdowns += 1;
    if (isFirstHalfScore) {
      player.firstHalfPoints += points;
      player.firstHalfScores += 1;
    }
    if (isSecondHalfScore) {
      player.secondHalfPoints += points;
      player.secondHalfScores += 1;
    }
    if (points > 0 || ["interception", "pick_six", "sack", "first_down"].includes(event.type)) {
      const types = playerEventTypes.get(player.id) || new Set<string>();
      types.add(event.type);
      playerEventTypes.set(player.id, types);
    }
    if (points > 0) {
      const scorers = teamScorerPoints.get(event.teamId) || new Map<string, number>();
      scorers.set(player.id, (scorers.get(player.id) || 0) + points);
      teamScorerPoints.set(event.teamId, scorers);
    }
    if (isPenalty || isUnsportsmanlike) {
      player.discipline += 1;
      if (isPenalty) player.penalties += 1;
      if (isUnsportsmanlike) player.unsportsmanlike += 1;
    }
  }

  const teamRows = [...teams.values()].map((row) => {
    const scorers = teamScorerPoints.get(row.id);
    const totalCreditedPoints = [...(scorers?.values() || [])].reduce((sum, points) => sum + points, 0);
    const topScorer = [...(scorers?.entries() || [])].sort((left, right) => right[1] - left[1])[0];
    const player = topScorer ? players.get(topScorer[0]) : undefined;
    return {
      ...row,
      pointDifferential: row.pointsFor - row.pointsAgainst,
      topScorerName: player?.name || "",
      topScorerShare: topScorer && totalCreditedPoints ? Math.round((topScorer[1] / totalCreditedPoints) * 100) : 0,
    };
  });
  const playerRows = [...players.values()].map((row) => ({ ...row, eventVariety: playerEventTypes.get(row.id)?.size || 0 }));
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
        firstHalfPoints: teamRows.reduce((sum, row) => sum + row.firstHalfPoints, 0),
        secondHalfPoints: teamRows.reduce((sum, row) => sum + row.secondHalfPoints, 0),
        firstHalfScores: teamRows.reduce((sum, row) => sum + row.firstHalfScores, 0),
        secondHalfScores: teamRows.reduce((sum, row) => sum + row.secondHalfScores, 0),
        versatilePlayers: 0,
        discipline: discipline(teamRows), penalties: penalties(teamRows), unsportsmanlike: unsportsmanlike(teamRows),
      },
      teams: {
        secondHalfScoring: top(teamRows.filter((row) => row.secondHalfPoints > 0), (row) => row.secondHalfPoints),
        offensiveDependence: top(teamRows.filter((row) => row.topScorerShare > 0), (row) => row.topScorerShare),
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
      firstHalfPoints: playerRows.reduce((sum, row) => sum + row.firstHalfPoints, 0),
      secondHalfPoints: playerRows.reduce((sum, row) => sum + row.secondHalfPoints, 0),
      firstHalfScores: playerRows.reduce((sum, row) => sum + row.firstHalfScores, 0),
      secondHalfScores: playerRows.reduce((sum, row) => sum + row.secondHalfScores, 0),
      versatilePlayers: playerRows.filter((row) => row.eventVariety >= 2).length,
      discipline: discipline(playerRows), penalties: penalties(playerRows), unsportsmanlike: unsportsmanlike(playerRows),
    },
    teams: null,
    players: {
      secondHalfScoring: top(playerRows.filter((row) => row.secondHalfPoints > 0), (row) => row.secondHalfPoints),
      versatility: top(playerRows.filter((row) => row.eventVariety >= 2), (row) => row.eventVariety),
      discipline: top(playerRows.filter((row) => row.discipline > 0), (row) => row.discipline),
    },
  };
}
