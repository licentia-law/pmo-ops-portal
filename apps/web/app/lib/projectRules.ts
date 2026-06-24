import type { ProjectStatusCode } from "@pmo/shared-types";

export const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatusCode, ProjectStatusCode[]> = {
  proposing: ["presented", "drop"],
  presented: ["win", "loss"],
  win: ["running"],
  loss: [],
  drop: [],
  running: ["done"],
  support: ["done"],
  done: []
};

export function canTransitionStatus(current: ProjectStatusCode, next: ProjectStatusCode): boolean {
  return current === next || ALLOWED_STATUS_TRANSITIONS[current].includes(next);
}

export type ProjectFormFieldKey =
  | "proposalPm"
  | "presentPm"
  | "deliveryPm"
  | "proposalSubmissionDate"
  | "proposalPresentationDate"
  | "submissionFormat"
  | "presentationFormat";

type ProjectPmValidationInput = {
  proposalPm?: string | null;
  presentPm?: string | null;
  deliveryPm?: string | null;
  proposalSubmissionDate?: string | null;
  proposalPresentationDate?: string | null;
  submissionFormat?: string | null;
  presentationFormat?: string | null;
};

const REQUIRED_ERROR_MESSAGE: Record<string, string> = {
  presentPm: "제안PM 선택 시 발표PM을 선택하세요.",
  proposalSubmissionDate: "제안PM 선택 시 제출일을 입력하세요.",
  proposalPresentationDate: "제안PM 선택 시 발표일을 입력하세요.",
  submissionFormat: "제안PM 선택 시 제출 형식을 선택하세요.",
  presentationFormat: "제안PM 선택 시 발표 형식을 선택하세요.",
};

function hasText(value: string | null | undefined): boolean {
  return !!String(value ?? "").trim();
}

export function getProjectPmValidationErrors(input: ProjectPmValidationInput): Partial<Record<ProjectFormFieldKey, string>> {
  const errors: Partial<Record<ProjectFormFieldKey, string>> = {};
  if (!hasText(input.proposalPm) && !hasText(input.deliveryPm)) {
    const message = "제안PM 또는 수행PM 중 1명 이상 선택하세요.";
    errors.proposalPm = message;
    errors.deliveryPm = message;
  }
  if (hasText(input.proposalPm) && !hasText(input.presentPm)) {
    errors.presentPm = REQUIRED_ERROR_MESSAGE.presentPm;
  }
  if (hasText(input.proposalPm)) {
    if (!hasText(input.proposalSubmissionDate)) errors.proposalSubmissionDate = REQUIRED_ERROR_MESSAGE.proposalSubmissionDate;
    if (!hasText(input.proposalPresentationDate)) errors.proposalPresentationDate = REQUIRED_ERROR_MESSAGE.proposalPresentationDate;
    if (!hasText(input.submissionFormat)) errors.submissionFormat = REQUIRED_ERROR_MESSAGE.submissionFormat;
    if (!hasText(input.presentationFormat)) errors.presentationFormat = REQUIRED_ERROR_MESSAGE.presentationFormat;
  }
  return errors;
}

const SERVER_REQUIRED_LABEL_TO_FIELD: Record<string, ProjectFormFieldKey[]> = {
  "제안PM": ["proposalPm"],
  "발표PM": ["presentPm"],
  "수행PM": ["deliveryPm"],
  "제안PM 또는 수행PM": ["proposalPm", "deliveryPm"],
  "제안 제출일": ["proposalSubmissionDate"],
  "제안 발표일": ["proposalPresentationDate"],
  "제출 형식": ["submissionFormat"],
  "발표 형식": ["presentationFormat"],
};

export function mapProjectSaveErrorToFieldErrors(message: string): Partial<Record<ProjectFormFieldKey, string>> {
  const prefix = "필수 항목 누락:";
  if (!message.startsWith(prefix)) return {};
  const labels = message.slice(prefix.length).split(",").map((label) => label.trim()).filter(Boolean);
  const errors: Partial<Record<ProjectFormFieldKey, string>> = {};
  for (const label of labels) {
    const fields = SERVER_REQUIRED_LABEL_TO_FIELD[label];
    if (!fields?.length) continue;
    const mapped =
      label === "제안PM 또는 수행PM"
        ? "제안PM 또는 수행PM 중 1명 이상 선택하세요."
        : `${label}은(는) 필수입니다.`;
    for (const field of fields) {
      errors[field] = errors[field] ?? mapped;
    }
  }
  return errors;
}
