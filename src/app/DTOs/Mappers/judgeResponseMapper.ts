import type { JudgeResponseDto } from "../Responses";

type JudgeLike = {
  _id?: unknown;
  id?: unknown;
  firstName?: string;
  lastName?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toJudgeResponseDto(judge: JudgeLike): JudgeResponseDto {
  const firstName = (judge.firstName || "").trim();
  const lastName = (judge.lastName || "").trim();

  return {
    _id: String(judge._id || judge.id || ""),
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    createdAt: judge.createdAt?.toISOString(),
    updatedAt: judge.updatedAt?.toISOString(),
  };
}
