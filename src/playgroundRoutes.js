export const PLAYGROUND_CHAT_BOTS = '/playground/ai-chat-bots';
export const PLAYGROUND_IMAGERY = '/playground/ai-imagery';
export const PLAYGROUND_FACT_CHECK = '/playground/fact-check';

export const VIEW_PATHS = {
  aichat: PLAYGROUND_CHAT_BOTS,
  aichatbots: PLAYGROUND_CHAT_BOTS,
  dalle: PLAYGROUND_IMAGERY,
  'ai-imagery': PLAYGROUND_IMAGERY,
  factcheck: PLAYGROUND_FACT_CHECK,
  'fact-check': PLAYGROUND_FACT_CHECK,
};

export const pathForView = (view) => VIEW_PATHS[view] || PLAYGROUND_CHAT_BOTS;
