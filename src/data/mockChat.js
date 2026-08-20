// The AI reply itself now comes from POST /api/career/ai/chat (still a mock
// on the backend, see career-backend's AiChatService — but it's the backend's
// mock now, not the frontend's). This is just the chat panel's fixed opening
// bubble, which has no backend equivalent.
export const initialChatLog = [
  { id: 1, from: 'ai', text: '안녕하세요, {name}님!\n어떤 커리어 고민이 있으신가요? 😊' },
];
