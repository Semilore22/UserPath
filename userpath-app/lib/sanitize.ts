export function sanitizeInput(input: string): string {
  let cleaned = input;
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/<[^/"'>]+\s*[^>]*/gi, '');
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*(['"]).*?\1/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*[^'"\s>]+/gi, '');
  cleaned = cleaned.trim();
  return cleaned;
}
