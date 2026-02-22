// Contracts
import {
  IUserRepository,
  ITournamentRepository,
  ITeamRepository,
  IPlayerRepository,
  IGameRepository,
  IStandingRepository,
  IDivisionRepository,
} from "./contracts";

// MongoDB implementations
import { MongoUserRepository } from "./mongodb/MongoUserRepository";
import { MongoTournamentRepository } from "./mongodb/MongoTournamentRepository";
import { MongoTeamRepository } from "./mongodb/MongoTeamRepository";
import { MongoPlayerRepository } from "./mongodb/MongoPlayerRepository";
import { MongoGameRepository } from "./mongodb/MongoGameRepository";
import { MongoStandingRepository } from "./mongodb/MongoStandingRepository";
import { MongoDivisionRepository } from "./mongodb/MongoDivisionRepository";

/**
 * Dependency Injection Container para repositorios
 * Proporciona instancias singleton de todos los repositorios
 */
class RepositoryContainer {
  private static userRepo: IUserRepository | null = null;
  private static tournamentRepo: ITournamentRepository | null = null;
  private static teamRepo: ITeamRepository | null = null;
  private static playerRepo: IPlayerRepository | null = null;
  private static gameRepo: IGameRepository | null = null;
  private static standingRepo: IStandingRepository | null = null;
  private static divisionRepo: IDivisionRepository | null = null;

  /**
   * Obtiene el repositorio de usuarios
   */
  static getUserRepository(): IUserRepository {
    if (!this.userRepo) {
      this.userRepo = new MongoUserRepository();
    }
    return this.userRepo;
  }

  /**
   * Obtiene el repositorio de torneos
   */
  static getTournamentRepository(): ITournamentRepository {
    if (!this.tournamentRepo) {
      this.tournamentRepo = new MongoTournamentRepository();
    }
    return this.tournamentRepo;
  }

  /**
   * Obtiene el repositorio de equipos
   */
  static getTeamRepository(): ITeamRepository {
    if (!this.teamRepo) {
      this.teamRepo = new MongoTeamRepository();
    }
    return this.teamRepo;
  }

  /**
   * Obtiene el repositorio de jugadores
   */
  static getPlayerRepository(): IPlayerRepository {
    if (!this.playerRepo) {
      this.playerRepo = new MongoPlayerRepository();
    }
    return this.playerRepo;
  }

  /**
   * Obtiene el repositorio de partidos
   */
  static getGameRepository(): IGameRepository {
    if (!this.gameRepo) {
      this.gameRepo = new MongoGameRepository();
    }
    return this.gameRepo;
  }

  /**
   * Obtiene el repositorio de standings
   */
  static getStandingRepository(): IStandingRepository {
    if (!this.standingRepo) {
      this.standingRepo = new MongoStandingRepository();
    }
    return this.standingRepo;
  }

  /**
   * Obtiene el repositorio de divisiones
   */
  static getDivisionRepository(): IDivisionRepository {
    if (!this.divisionRepo) {
      this.divisionRepo = new MongoDivisionRepository();
    }
    return this.divisionRepo;
  }

  /**
   * Resetea todas las instancias (útil para testing)
   */
  static reset(): void {
    this.userRepo = null;
    this.tournamentRepo = null;
    this.teamRepo = null;
    this.playerRepo = null;
    this.gameRepo = null;
    this.standingRepo = null;
    this.divisionRepo = null;
  }
}

export default RepositoryContainer;
