/** RETROS - Estado compartido de la aplicación */

export let suppressCardRealtime = false;

export function isUserEditingField() {
  const active = document.activeElement;
  if (!active) return false;

  const tag = String(active.tagName || '').toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const type = String(active.type || 'text').toLowerCase();
    return ['text', 'search', 'email', 'url', 'tel', 'number', 'password', 'date'].includes(type);
  }
  return active.isContentEditable === true;
}

export const state = {
  step: 0,
  energy: null,
  votes: {},
  myVotes: {},
  usedVotes: 0,
  participantSessionId: null,
  participantId: null,
  participant: null,
  cards: [],
  topics: [],
  retroId: null,
  retroType: "standard",
  postMortem: null,
  postMortemRealtimeChannel: null,
  guidingQuestions: [],
  actions: [],
  isFacilitator: false,
  facilitatorSessionId: null,
  facilitatorName: null,
  retroStarted: false,
  retroStartedAt: null,
  retroFinishedAt: null,
  feedbackSubmitted: false,
  feedbackLoaded: false,
  showFeedback: false,
  participants: [],
  actionRealtimeChannel: null,
  activeParticipantSessions: new Set(),
  participantPresenceReady: false,
  participantPresenceChannel: null,
  guidingQuestionsRealtimeChannel: null,
  topicRealtimeChannel: null,
  answerAutosaveTimers: {},
  answerAutosaveStatus: {},
  editingQuestionAnswers: {},
  editingPostMortemFields: {},
  postMortemAutosaveTimers: {},
  postMortemAutosaveStatus: {},
  realtimeFeedback: null
};
