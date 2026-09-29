"use client";

import { useEffect, useState } from "react";
import type { PublicSiteSettingsResponseDto } from "@lufa/contracts";

export interface DashboardStats {
  activeTournaments: number;
  totalTeams: number;
  totalPlayers: number;
  completedGames: number;
  nextGames: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    division: string;
    venue: string;
    scheduledDate: string;
    status: string;
    score?: {
      home: number;
      away: number;
    };
  }>;
  topPlayers: Array<{
    id: string;
    name: string;
    position: string;
    secondaryPosition?: string;
    profilePicture?: string;
    team: string;
    stat: number;
    statLabel: string;
  }>;
}

export interface TeamCarouselItem {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  division: {
    name: string;
  };
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

/** Dashboard, active teams and public site settings shown on a home page. */
export function useHomeData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teams, setTeams] = useState<TeamCarouselItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<PublicSiteSettingsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsResponse, teamsResponse, settingsResponse] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/teams?status=active&limit=100"),
          fetch("/api/site-settings", { cache: "no-store" }),
        ]);

        if (!statsResponse.ok) throw new Error("Failed to fetch dashboard data");
        const { data } = await statsResponse.json();
        setStats(data);

        if (teamsResponse.ok) {
          const teamsPayload = await teamsResponse.json();
          if (teamsPayload?.success && Array.isArray(teamsPayload.data)) {
            const sortedTeams = teamsPayload.data
              .filter((team: TeamCarouselItem) => team?._id)
              .sort((a: TeamCarouselItem, b: TeamCarouselItem) =>
                a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
              );
            setTeams(sortedTeams);
          }
        }

        if (settingsResponse.ok) {
          const settingsPayload = await settingsResponse.json();
          if (settingsPayload?.success && settingsPayload.data) {
            setSiteSettings(settingsPayload.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, teams, siteSettings, loading, error };
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
