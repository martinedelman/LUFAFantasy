export interface TopPlayerResponseDto {
  id: string;
  name: string;
  position: string;
  secondaryPosition?: string;
  profilePicture?: string;
  team: string;
  stat: number;
  statLabel: string;
}
