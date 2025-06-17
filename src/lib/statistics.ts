// Utilitarios para cálculos de estadísticas de Flag Football

import { PassingStats, RushingStats, ReceivingStats } from "../types";

/**
 * Calcula el rating de pase (passer rating) para un jugador
 */
export function calculatePasserRating(stats: PassingStats): number {
  if (stats.attempts === 0) return 0;

  const completion = (stats.completions / stats.attempts - 0.3) * 5;
  const yards = (stats.yards / stats.attempts - 3) * 0.25;
  const touchdowns = (stats.touchdowns / stats.attempts) * 20;
  const interceptions = 2.375 - (stats.interceptions / stats.attempts) * 25;

  const rating =
    Math.max(0, Math.min(2.375, completion)) +
    Math.max(0, Math.min(2.375, yards)) +
    Math.max(0, Math.min(2.375, touchdowns)) +
    Math.max(0, Math.min(2.375, interceptions));

  return Math.round((rating / 6) * 100 * 100) / 100;
}

/**
 * Calcula el promedio de yardas por intento para rushing
 */
export function calculateRushingAverage(stats: RushingStats): number {
  if (stats.attempts === 0) return 0;
  return Math.round((stats.yards / stats.attempts) * 100) / 100;
}

/**
 * Calcula el promedio de yardas por recepción
 */
export function calculateReceivingAverage(stats: ReceivingStats): number {
  if (stats.receptions === 0) return 0;
  return Math.round((stats.yards / stats.receptions) * 100) / 100;
}

/**
 * Calcula el porcentaje de completación de pases
 */
export function calculateCompletionPercentage(stats: PassingStats): number {
  if (stats.attempts === 0) return 0;
  return Math.round((stats.completions / stats.attempts) * 10000) / 100;
}

/**
 * Calcula la eficiencia en terceras oportunidades
 */
export function calculateThirdDownEfficiency(made: number, attempted: number): number {
  if (attempted === 0) return 0;
  return Math.round((made / attempted) * 10000) / 100;
}

/**
 * Calcula la eficiencia en zona roja
 */
export function calculateRedZoneEfficiency(scores: number, attempts: number): number {
  if (attempts === 0) return 0;
  return Math.round((scores / attempts) * 10000) / 100;
}

/**
 * Calcula el porcentaje de victorias
 */
export function calculateWinPercentage(wins: number, losses: number, ties: number): number {
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return Math.round(((wins + ties * 0.5) / totalGames) * 10000) / 100;
}

/**
 * Calcula las yardas promedio por juego
 */
export function calculateAverageYardsPerGame(totalYards: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return Math.round((totalYards / gamesPlayed) * 100) / 100;
}

/**
 * Calcula los puntos promedio por juego
 */
export function calculateAveragePointsPerGame(totalPoints: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return Math.round((totalPoints / gamesPlayed) * 100) / 100;
}

/**
 * Calcula el diferencial de turnover
 */
export function calculateTurnoverDifferential(forcedTurnovers: number, lostTurnovers: number): number {
  return forcedTurnovers - lostTurnovers;
}

/**
 * Calcula la precisión del kicker
 */
export function calculateKickingAccuracy(made: number, attempted: number): number {
  if (attempted === 0) return 0;
  return Math.round((made / attempted) * 10000) / 100;
}

/**
 * Calcula el promedio de punt
 */
export function calculatePuntAverage(totalYards: number, totalPunts: number): number {
  if (totalPunts === 0) return 0;
  return Math.round((totalYards / totalPunts) * 100) / 100;
}

/**
 * Genera una cadena de racha (streak) basada en los últimos resultados
 */
export function generateStreak(results: ("W" | "L" | "T")[]): string {
  if (results.length === 0) return "";

  const lastResult = results[results.length - 1];
  let count = 1;

  for (let i = results.length - 2; i >= 0; i--) {
    if (results[i] === lastResult) {
      count++;
    } else {
      break;
    }
  }

  return `${lastResult}${count}`;
}

/**
 * Formatea el tiempo de posesión en formato MM:SS
 */
export function formatTimeOfPossession(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Convierte tiempo en formato MM:SS a segundos
 */
export function parseTimeOfPossession(timeString: string): number {
  const [minutes, seconds] = timeString.split(":").map(Number);
  return minutes * 60 + seconds;
}

/**
 * Calcula la posición en la tabla basada en el porcentaje de victorias y diferencial de puntos
 */
export function sortStandings(
  standings: {
    percentage: number;
    pointsDifferential: number;
    pointsFor: number;
  }[]
): typeof standings {
  return standings.sort((a, b) => {
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
}

/**
 * Valida si un número de jersey es válido (1-99)
 */
export function isValidJerseyNumber(number: number): boolean {
  return number >= 1 && number <= 99;
}

/**
 * Valida si una puntuación de cuarto es válida
 */
export function isValidQuarterScore(score: number): boolean {
  return score >= 0 && score <= 100; // Máximo razonable por cuarto
}

/**
 * Calcula la edad basada en la fecha de nacimiento
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
