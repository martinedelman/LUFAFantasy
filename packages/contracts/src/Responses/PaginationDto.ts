export interface PaginationDto {
  current: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
