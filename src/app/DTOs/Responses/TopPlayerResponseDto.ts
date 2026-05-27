export interface TopPlayerResponseDto {
  id: string;
  name: string;
  position: string;
  secondaryPosition?: string;
  team: string;
  stat: number;
  statLabel: string;
}
