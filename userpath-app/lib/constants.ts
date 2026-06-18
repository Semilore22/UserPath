export const SESSION_HEADER = 'x-session-id';

export const MIN_DESCRIPTION_LENGTH = 30;
export const MAX_DESCRIPTION_LENGTH = 500;

export const MAX_GENERATIONS = 5;
export const MAX_GENERATIONS_PER_SESSION = 3;
export const WINDOW_HOURS = 24;

export const MAX_BODY_SIZE = 1024 * 10;

export const DEEPSEEK_TIMEOUT_MS = 45000;
export const DEEPSEEK_RETRIES = 2;

export const ERROR_MESSAGES: Record<string, string> = {
  ERR_INPUT_TOO_SHORT:
    'Tell me a bit more about your product — aim for at least a sentence so I can build an accurate flow.',
  ERR_INPUT_TOO_LONG:
    "That's a bit long — keep your description under 500 characters. Focus on the core product and user.",
  ERR_OFF_TOPIC:
    'I only generate user flows from product descriptions. Tell me about the product you are designing.',
  ERR_FORM_INCOMPLETE:
    'Please fill in all fields before generating your flow.',
  ERR_RATE_LIMIT_EXCEEDED:
    "You have used your 5 free flows for today. Check back in",
};
