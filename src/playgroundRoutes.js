export const PLAYGROUND_CHAT_BOTS = '/playground/ai-chat-bots';
export const PLAYGROUND_IMAGERY = '/playground/ai-imagery';

export const VIEW_PATHS = {
  aichat: PLAYGROUND_CHAT_BOTS,
  aichatbots: PLAYGROUND_CHAT_BOTS,
  dalle: PLAYGROUND_IMAGERY,
  'ai-imagery': PLAYGROUND_IMAGERY,
};

export const pathForView = (view) => VIEW_PATHS[view] || PLAYGROUND_CHAT_BOTS;
