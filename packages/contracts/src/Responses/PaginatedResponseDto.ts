import type { PaginationDto } from "./PaginationDto";

export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationDto;
}
