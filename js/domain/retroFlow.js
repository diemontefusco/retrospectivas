import { shouldSkipVotingStep } from "./topics.js";

const STEPS = [
  "Inicio",
  "Check-in",
  "Actividad",
  "Agrupación",
  "Votación",
  "Preguntas",
  "Acciones",
  "Cierre"
];

const POST_MORTEM_STEPS = [
  "Ficha técnica",
  "Actividad",
  "Acciones",
  "Cierre"
];

function getRetroSteps(retroType) {
  return retroType === "post_mortem" ? POST_MORTEM_STEPS : STEPS;
}

function normalizeStepForTopics(step) {
  const numericStep = Number(step);
  return numericStep === 4 && shouldSkipVotingStep() ? 5 : numericStep;
}

function getProgressMeta(step, retroType = "standard") {
  if (retroType === "post_mortem") {
    return {
      current: Math.max(0, Number(step)) + 1,
      total: POST_MORTEM_STEPS.length
    };
  }

  const skippedVoting = shouldSkipVotingStep();
  const visibleSteps = skippedVoting
    ? STEPS.filter((_, index) => index !== 4)
    : STEPS;
  const visibleIndex = visibleSteps.indexOf(STEPS[Number(step)]);

  return {
    current: Math.max(0, visibleIndex) + 1,
    total: visibleSteps.length
  };
}

export { STEPS, POST_MORTEM_STEPS, getRetroSteps, normalizeStepForTopics, getProgressMeta };
