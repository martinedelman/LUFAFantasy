import Avatar from "@/components/Avatar";
import Skeleton from "@/components/Skeleton";
import Table, { TableColumn } from "@/components/Table";

export interface Standing {
  _id: string;
  position: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifferential: number;
  percentage: number;
  streak?: string;
  lastFiveGames?: string;
  team: {
    _id: string;
    name: string;
    shortName: string;
    logo?: string;
    colors: {
      primary: string;
      secondary?: string;
    };
  };
  division: {
    _id: string;
    name: string;
    category: string;
    tournament: {
      _id: string;
      name: string;
      year: number;
    };
  };
}

export function StandingsSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm" aria-label="Cargando posiciones">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Pos", "Equipo", "G", "P", "E", "%", "PF", "PC", "DIF", "Racha"].map((label) => (
                <th
                  key={label}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="px-6 py-4">
                  <Skeleton className="mx-auto h-5 w-6 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                </td>
                {Array.from({ length: 8 }).map((__, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4">
                    <Skeleton className="mx-auto h-4 w-10 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((__, metricIndex) => (
                <Skeleton key={metricIndex} className="h-8 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPercentage(percentage: number) {
  return (percentage * 100).toFixed(1);
}

function getStreakColor(streak?: string) {
  if (!streak) return "bg-gray-100 text-gray-800";
  if (streak.startsWith("W")) return "bg-green-100 text-green-800";
  if (streak.startsWith("L")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function createStandingsColumns(standings: Standing[]): TableColumn<Standing>[] {
  const shouldShowTiesColumn = standings.some((standing) => standing.ties > 0);

  return [
    {
      key: "position",
      label: "Pos",
      align: "center",
      headerClassName: "sticky left-0 z-30 w-14 min-w-[3.5rem] bg-gray-50 !px-0",
      cellClassName: "sticky left-0 z-20 w-14 min-w-[3.5rem] bg-white !px-0 group-hover:bg-slate-50",
      render: (value) => {
        const pos = value as number;
        const icons: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
        return <div className="flex items-center justify-center">{icons[pos] || pos}</div>;
      },
    },
    {
      key: "team",
      label: "Equipo",
      align: "left",
      headerClassName:
        "sticky left-14 z-30 w-48 min-w-[10rem] border-r border-gray-200 bg-gray-50 !px-0 shadow-[8px_0_14px_-14px_rgba(15,23,42,0.6)]",
      cellClassName:
        "sticky left-14 z-20 w-48 min-w-[10rem] border-r border-gray-100 bg-white !px-0  group-hover:bg-slate-50",
      render: (value) => {
        const team = value as Standing["team"];
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex-shrink-0 h-8 w-8">
              <Avatar
                imageUrl={team.logo}
                alt={team.name}
                fallback={(team.shortName || team.name.substring(0, 2)).toUpperCase()}
                backgroundColor={team.colors.primary}
                size="sm"
                fallbackClassName="text-xs"
              />
            </div>
            <span className="truncate text-sm font-medium text-gray-900">{team.name}</span>
          </div>
        );
      },
    },
    {
      key: "wins",
      label: "G",
      align: "center",
      render: (value) => <div className="font-medium">{value as number}</div>,
    },
    {
      key: "losses",
      label: "P",
      align: "center",
      render: (value) => <div>{value as number}</div>,
    },
    ...(shouldShowTiesColumn
      ? [
          {
            key: "ties" as const,
            label: "E",
            align: "center" as const,
            render: (value: unknown) => <div>{value as number}</div>,
          },
        ]
      : []),
    {
      key: "percentage",
      label: "%",
      align: "center",
      render: (value) => <div className="font-medium">{formatPercentage(value as number)}%</div>,
    },
    {
      key: "pointsFor",
      label: "PF",
      align: "center",
      render: (value) => <div>{value as number}</div>,
    },
    {
      key: "pointsAgainst",
      label: "PC",
      align: "center",
      render: (value) => <div>{value as number}</div>,
    },
    {
      key: "pointsDifferential",
      label: "DIF",
      align: "center",
      render: (value) => {
        const diff = value as number;
        return (
          <div className={`font-medium ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
            {diff >= 0 ? "+" : ""}
            {diff}
          </div>
        );
      },
    },
    {
      key: "streak",
      label: "Racha",
      align: "center",
      render: (value) => {
        const streak = value as string | undefined;
        return streak ? (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStreakColor(streak)}`}
          >
            {streak}
          </span>
        ) : (
          <div className="text-gray-400">—</div>
        );
      },
    },
  ];
}

export function StandingsTable({
  standings,
  emptyMessage = "No hay equipos en esta división",
  onRowClick,
}: {
  standings: Standing[];
  emptyMessage?: string;
  onRowClick?: (standing: Standing) => void;
}) {
  return (
    <Table<Standing>
      columns={createStandingsColumns(standings)}
      data={standings}
      loading={false}
      emptyMessage={emptyMessage}
      idKey="_id"
      onRowClick={onRowClick}
    />
  );
}
