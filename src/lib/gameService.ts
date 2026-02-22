import mongoose from "mongoose";
import { GameModel, StandingModel } from "@/models";
import { calculateWinPercentage, generateStreak } from "./statistics";

/**
 * Recalcula el Standing de un equipo basado en sus partidos completados
 * Se ejecuta dentro de una transacción
 */
export async function recalculateTeamStanding(teamId: string, divisionId: string, session: mongoose.ClientSession) {
  const teamObjectId = new mongoose.Types.ObjectId(teamId);
  const divisionObjectId = new mongoose.Types.ObjectId(divisionId);

  // Obtener todos los partidos completados del equipo en esta división
  const games = await GameModel.find(
    {
      division: divisionObjectId,
      status: "completed",
      $or: [{ homeTeam: teamObjectId }, { awayTeam: teamObjectId }],
    },
    null,
    { session },
  );

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  let homeWins = 0;
  let homeLosses = 0;
  let homeTies = 0;
  let awayWins = 0;
  let awayLosses = 0;
  let awayTies = 0;
  const results: ("W" | "L" | "T")[] = [];
  const lastFiveResults: ("W" | "L" | "T")[] = [];

  // Procesar cada partido
  for (const game of games) {
    const isHome = game.homeTeam?.toString() === teamObjectId.toString();
    const homeScore = game.score.home.total;
    const awayScore = game.score.away.total;

    if (isHome) {
      pointsFor += homeScore;
      pointsAgainst += awayScore;

      if (homeScore > awayScore) {
        wins++;
        homeWins++;
        results.push("W");
      } else if (homeScore < awayScore) {
        losses++;
        homeLosses++;
        results.push("L");
      } else {
        ties++;
        homeTies++;
        results.push("T");
      }
    } else {
      pointsFor += awayScore;
      pointsAgainst += homeScore;

      if (awayScore > homeScore) {
        wins++;
        awayWins++;
        results.push("W");
      } else if (awayScore < homeScore) {
        losses++;
        awayLosses++;
        results.push("L");
      } else {
        ties++;
        awayTies++;
        results.push("T");
      }
    }
  }

  // Últimos 5 juegos
  if (results.length > 0) {
    for (let i = Math.max(0, results.length - 5); i < results.length; i++) {
      lastFiveResults.push(results[i]);
    }
  }

  const percentage = calculateWinPercentage(wins, losses, ties);
  const pointsDifferential = pointsFor - pointsAgainst;
  const streak = results.length > 0 ? generateStreak(results) : "";
  const lastFiveGames = lastFiveResults.join("");

  // Actualizar o crear Standing
  const standing = await StandingModel.findOneAndUpdate(
    {
      team: teamObjectId,
      division: divisionObjectId,
    },
    {
      wins,
      losses,
      ties,
      pointsFor,
      pointsAgainst,
      pointsDifferential,
      percentage,
      streak,
      lastFiveGames,
      homeRecord: {
        wins: homeWins,
        losses: homeLosses,
        ties: homeTies,
      },
      awayRecord: {
        wins: awayWins,
        losses: awayLosses,
        ties: awayTies,
      },
      // position será calculado en GET, no se actualiza aquí
    },
    {
      new: true,
      session,
      upsert: true,
      runValidators: true,
    },
  );

  return standing;
}

/**
 * Obtiene y ordena los standings de una división
 * Ejecuta sortStandings() para asignar posiciones dinámicamente
 */
export async function getOrderedStandingsByDivision(divisionId: string) {
  const divisionObjectId = new mongoose.Types.ObjectId(divisionId);

  // Obtener todos los standings de esta división con equipos populados
  const standings = await StandingModel.find({
    division: divisionObjectId,
  })
    .populate("team")
    .populate("division");

  // Ordenar usando la lógica de tiebreaker
  const sorted = standings.sort((a, b) => {
    // Primero por porcentaje de victorias
    if (a.percentage !== b.percentage) {
      return b.percentage - a.percentage;
    }

    // Luego por diferencial de puntos
    if (a.pointsDifferential !== b.pointsDifferential) {
      return b.pointsDifferential - a.pointsDifferential;
    }

    // Finalmente por puntos a favor
    return b.pointsFor - a.pointsFor;
  });

  // Asignar posiciones dinámicamente (sin persistir)
  return sorted.map((standing, index) => ({
    ...standing.toObject(),
    position: index + 1,
  }));
}

/**
 * Wrapper para crear standings iniciales para ambos equipos de un partido
 * Se ejecuta dentro de una transacción
 */
export async function ensureTeamStandingsExist(
  homeTeamId: string | null,
  awayTeamId: string | null,
  divisionId: string,
  session: mongoose.ClientSession,
) {
  const divisionObjectId = new mongoose.Types.ObjectId(divisionId);

  if (homeTeamId) {
    const homeTeamObjectId = new mongoose.Types.ObjectId(homeTeamId);
    await StandingModel.findOneAndUpdate(
      {
        team: homeTeamObjectId,
        division: divisionObjectId,
      },
      {
        team: homeTeamObjectId,
        division: divisionObjectId,
        position: 0, // Placeholder, será calculado en GET
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDifferential: 0,
        percentage: 0,
      },
      {
        session,
        upsert: true,
        runValidators: false,
      },
    );
  }

  if (awayTeamId) {
    const awayTeamObjectId = new mongoose.Types.ObjectId(awayTeamId);
    await StandingModel.findOneAndUpdate(
      {
        team: awayTeamObjectId,
        division: divisionObjectId,
      },
      {
        team: awayTeamObjectId,
        division: divisionObjectId,
        position: 0, // Placeholder, será calculado en GET
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDifferential: 0,
        percentage: 0,
      },
      {
        session,
        upsert: true,
        runValidators: false,
      },
    );
  }
}

/**
 * Valida que el score sea válido antes de actualizar
 */
export function validateGameScore(scoreData: unknown) {
  if (!scoreData || typeof scoreData !== "object") {
    return { valid: false, error: "Estructura de score inválida" };
  }

  const score = scoreData as Record<string, unknown>;

  // Validar que tenga home y away
  if (!score.home || typeof score.home !== "object") {
    return { valid: false, error: "Score del equipo local inválido" };
  }

  if (!score.away || typeof score.away !== "object") {
    return { valid: false, error: "Score del equipo visitante inválido" };
  }

  const home = score.home as Record<string, unknown>;
  const away = score.away as Record<string, unknown>;

  // Validar cuartos (0-100 puntos máximo razonable por cuarto)
  const homeQuarters = ["q1", "q2", "q3", "q4", "overtime"];
  const awayQuarters = ["q1", "q2", "q3", "q4", "overtime"];

  for (const quarter of homeQuarters) {
    const value = home[quarter];
    if (typeof value !== "number" || value < 0 || value > 100) {
      return { valid: false, error: `Score del local en ${quarter} inválido` };
    }
  }

  for (const quarter of awayQuarters) {
    const value = away[quarter];
    if (typeof value !== "number" || value < 0 || value > 100) {
      return { valid: false, error: `Score del visitante en ${quarter} inválido` };
    }
  }

  return { valid: true };
}
