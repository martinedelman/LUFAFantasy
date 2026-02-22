import { Game, GameStatus, GameStatistics } from "../Game";
import { Venue } from "../valueObjects/Venue";
import { GameScore, QuarterScore } from "../valueObjects/Score";
import { TeamStatistics } from "../valueObjects/TeamStatistics";

/**
 * Factory para crear instancias de Game
 */
export class GameFactory {
  /**
   * Crea una entidad Game desde un documento de base de datos
   */
  static fromDatabase(doc: any): Game {
    const venue = new Venue(doc.venue.name, doc.venue.address);

    const homeScore = new QuarterScore(
      doc.score?.home?.q1 || 0,
      doc.score?.home?.q2 || 0,
      doc.score?.home?.q3 || 0,
      doc.score?.home?.q4 || 0,
      doc.score?.home?.overtime || 0,
    );

    const awayScore = new QuarterScore(
      doc.score?.away?.q1 || 0,
      doc.score?.away?.q2 || 0,
      doc.score?.away?.q3 || 0,
      doc.score?.away?.q4 || 0,
      doc.score?.away?.overtime || 0,
    );

    const score = new GameScore(homeScore, awayScore);

    const statistics: GameStatistics = {
      home: doc.statistics?.home ? new TeamStatistics(doc.statistics.home) : TeamStatistics.empty(),
      away: doc.statistics?.away ? new TeamStatistics(doc.statistics.away) : TeamStatistics.empty(),
    };

    return new Game(
      doc.tournament?.toString() || doc.tournament,
      doc.division?.toString() || doc.division,
      venue,
      new Date(doc.scheduledDate),
      doc.status as GameStatus,
      doc.homeTeam?.toString() || doc.homeTeam,
      doc.awayTeam?.toString() || doc.awayTeam,
      score,
      statistics,
      doc.week,
      doc.round,
      doc.actualStartTime ? new Date(doc.actualStartTime) : undefined,
      doc.actualEndTime ? new Date(doc.actualEndTime) : undefined,
      doc.notes,
      doc._id?.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad Game a formato de persistencia
   */
  static toPersistence(game: Game): any {
    return {
      _id: game.id,
      tournament: game.tournament,
      division: game.division,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue: {
        name: game.venue.name,
        address: game.venue.address,
      },
      scheduledDate: game.scheduledDate,
      actualStartTime: game.actualStartTime,
      actualEndTime: game.actualEndTime,
      status: game.status,
      week: game.week,
      round: game.round,
      score: {
        home: {
          q1: game.score.home.q1,
          q2: game.score.home.q2,
          q3: game.score.home.q3,
          q4: game.score.home.q4,
          overtime: game.score.home.overtime,
          total: game.score.home.total,
        },
        away: {
          q1: game.score.away.q1,
          q2: game.score.away.q2,
          q3: game.score.away.q3,
          q4: game.score.away.q4,
          overtime: game.score.away.overtime,
          total: game.score.away.total,
        },
      },
      statistics: {
        home: {
          passingYards: game.statistics.home.passingYards,
          rushingYards: game.statistics.home.rushingYards,
          totalYards: game.statistics.home.totalYards,
          completions: game.statistics.home.completions,
          attempts: game.statistics.home.attempts,
          interceptions: game.statistics.home.interceptions,
          fumbles: game.statistics.home.fumbles,
          penalties: game.statistics.home.penalties,
          penaltyYards: game.statistics.home.penaltyYards,
          timeOfPossession: game.statistics.home.timeOfPossession,
          thirdDownConversions: game.statistics.home.thirdDownConversions,
          redZoneEfficiency: game.statistics.home.redZoneEfficiency,
        },
        away: {
          passingYards: game.statistics.away.passingYards,
          rushingYards: game.statistics.away.rushingYards,
          totalYards: game.statistics.away.totalYards,
          completions: game.statistics.away.completions,
          attempts: game.statistics.away.attempts,
          interceptions: game.statistics.away.interceptions,
          fumbles: game.statistics.away.fumbles,
          penalties: game.statistics.away.penalties,
          penaltyYards: game.statistics.away.penaltyYards,
          timeOfPossession: game.statistics.away.timeOfPossession,
          thirdDownConversions: game.statistics.away.thirdDownConversions,
          redZoneEfficiency: game.statistics.away.redZoneEfficiency,
        },
      },
      notes: game.notes,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  /**
   * Crea una entidad Game desde un request de API
   */
  static fromApiRequest(data: any): Game {
    const venue = new Venue(data.venue.name, data.venue.address);

    const homeScore = data.score?.home
      ? new QuarterScore(
          data.score.home.q1 || 0,
          data.score.home.q2 || 0,
          data.score.home.q3 || 0,
          data.score.home.q4 || 0,
          data.score.home.overtime || 0,
        )
      : QuarterScore.zero();

    const awayScore = data.score?.away
      ? new QuarterScore(
          data.score.away.q1 || 0,
          data.score.away.q2 || 0,
          data.score.away.q3 || 0,
          data.score.away.q4 || 0,
          data.score.away.overtime || 0,
        )
      : QuarterScore.zero();

    const score = new GameScore(homeScore, awayScore);

    const statistics: GameStatistics = {
      home: data.statistics?.home ? new TeamStatistics(data.statistics.home) : TeamStatistics.empty(),
      away: data.statistics?.away ? new TeamStatistics(data.statistics.away) : TeamStatistics.empty(),
    };

    return new Game(
      data.tournament,
      data.division,
      venue,
      new Date(data.scheduledDate),
      data.status || "scheduled",
      data.homeTeam || null,
      data.awayTeam || null,
      score,
      statistics,
      data.week,
      data.round,
      data.actualStartTime ? new Date(data.actualStartTime) : undefined,
      data.actualEndTime ? new Date(data.actualEndTime) : undefined,
      data.notes,
    );
  }

  /**
   * Convierte una entidad Game a formato de respuesta API
   */
  static toApiResponse(game: Game): any {
    return {
      _id: game.id,
      id: game.id,
      tournament: game.tournament,
      division: game.division,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue: {
        name: game.venue.name,
        address: game.venue.address,
      },
      scheduledDate: game.scheduledDate,
      actualStartTime: game.actualStartTime,
      actualEndTime: game.actualEndTime,
      status: game.status,
      week: game.week,
      round: game.round,
      score: {
        home: {
          q1: game.score.home.q1,
          q2: game.score.home.q2,
          q3: game.score.home.q3,
          q4: game.score.home.q4,
          overtime: game.score.home.overtime,
          total: game.score.home.total,
        },
        away: {
          q1: game.score.away.q1,
          q2: game.score.away.q2,
          q3: game.score.away.q3,
          q4: game.score.away.q4,
          overtime: game.score.away.overtime,
          total: game.score.away.total,
        },
      },
      statistics: {
        home: game.statistics.home,
        away: game.statistics.away,
      },
      notes: game.notes,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }
}
