import { MyTeam } from "@/components/MyTeam";

export default async function MyTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MyTeam leagueId={id} />;
}
