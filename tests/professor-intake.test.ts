import { describe, expect, it } from "vitest";
import { createProfessorIntake } from "@/features/learning/intake";
import { validateProfessorIntakeStep } from "@/features/learning/intake-validation";
import { makeProfile } from "./fixtures";

describe("Professor Atlas intake", () => {
  it("aceita uma tentativa anterior mesmo quando o campo de conceitos está vazio", () => {
    const intake = {
      ...createProfessorIntake(makeProfile(), "React Native"),
      knowledgeLevel: "basico" as const,
      knownConcepts: "",
      previousAttempts: "Já montei uma tela pelo Replit.",
    };
    expect(validateProfessorIntakeStep(1, intake, "180")).toEqual({});
  });

  it("ignora caracteres invisíveis ao validar respostas", () => {
    const intake = {
      ...createProfessorIntake(makeProfile(), "\u200B"),
      topic: "\u200B\uFEFF",
    };
    expect(validateProfessorIntakeStep(0, intake, "180").topic).toBeTruthy();
  });

  it("aponta somente o campo que precisa de correção", () => {
    const intake = {
      ...createProfessorIntake(makeProfile(), "React Native"),
      desiredOutcome: "",
    };
    expect(validateProfessorIntakeStep(2, intake, "180")).toEqual({
      desiredOutcome: expect.any(String),
    });
  });
});
