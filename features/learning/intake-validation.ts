import type { ProfessorIntake } from "@/types";
import { sanitizeText } from "@/utils/text";

export type ProfessorIntakeField =
  | "topic"
  | "knownConcepts"
  | "desiredOutcome"
  | "deadline"
  | "weeklyMinutes";

export type ProfessorIntakeErrors = Partial<Record<ProfessorIntakeField, string>>;

export function meaningfulText(value: string, maxLength = 2_000): string {
  return sanitizeText(value.replace(/[\u200B-\u200D\u2060\uFEFF]/g, ""), maxLength);
}

export function validateProfessorIntakeStep(
  step: number,
  intake: ProfessorIntake,
  weeklyMinutesText: string,
): ProfessorIntakeErrors {
  const errors: ProfessorIntakeErrors = {};
  const topic = meaningfulText(intake.topic, 160);
  const knownConcepts = meaningfulText(intake.knownConcepts, 1_200);
  const previousAttempts = meaningfulText(intake.previousAttempts, 1_200);
  const desiredOutcome = meaningfulText(intake.desiredOutcome, 800);

  if (step === 0 && topic.length < 2) {
    errors.topic = "Escreva o assunto ou escolha uma sugestão.";
  }

  // A pessoa pode explicar o que sabe OU contar o que já tentou. Exigir os dois
  // fazia o formulário acusar vazio mesmo quando havia uma resposta útil.
  if (
    step === 1 &&
    intake.knowledgeLevel !== "zero" &&
    knownConcepts.length < 3 &&
    previousAttempts.length < 3
  ) {
    errors.knownConcepts = "Conte o que você já sabe ou o que já tentou. Um dos campos é suficiente.";
  }

  if (step === 2 && desiredOutcome.length < 5) {
    errors.desiredOutcome = "Defina um resultado concreto com pelo menos 5 caracteres.";
  }

  if (step === 2 && intake.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(intake.deadline)) {
    errors.deadline = "Use o formato AAAA-MM-DD ou deixe sem prazo.";
  }

  const weeklyMinutes = Number(weeklyMinutesText);
  if (
    step === 3 &&
    (!Number.isFinite(weeklyMinutes) || weeklyMinutes < 30 || weeklyMinutes > 3_000)
  ) {
    errors.weeklyMinutes = "Use entre 30 e 3000 minutos por semana.";
  }

  return errors;
}
