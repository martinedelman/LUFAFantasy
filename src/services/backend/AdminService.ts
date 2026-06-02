import connectToDatabase from "@/lib/mongodb";
import { GameModel, JudgeModel, PlayerModel, TeamModel, TournamentModel, UserModel } from "@/models";
import type { AdminSystemStatsResponseDto } from "@/app/DTOs";

export class AdminService {
  async getSystemStats(): Promise<AdminSystemStatsResponseDto> {
    await connectToDatabase();

    const [
      totalUsers,
      totalAdmins,
      totalJudges,
      activeTournaments,
      totalTeams,
      totalPlayers,
      totalGames,
      completedGames,
    ] = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ role: "admin", isActive: true }),
      JudgeModel.countDocuments({}),
      TournamentModel.countDocuments({ status: { $in: ["active", "upcoming"] } }),
      TeamModel.countDocuments({}),
      PlayerModel.countDocuments({}),
      GameModel.countDocuments({}),
      GameModel.countDocuments({ status: "completed" }),
    ]);

    return {
      totalUsers,
      totalAdmins,
      totalJudges,
      activeTournaments,
      totalTeams,
      totalPlayers,
      totalGames,
      completedGames,
      scheduledGames: await GameModel.countDocuments({ status: "scheduled" }),
      inProgressGames: await GameModel.countDocuments({ status: "in_progress" }),
    };
  }
}
