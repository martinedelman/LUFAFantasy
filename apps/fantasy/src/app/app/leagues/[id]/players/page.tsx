import { PlayersBrowser } from "@/components/PlayersBrowser";

export default async function PlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayersBrowser leagueId={id} />;
}
