export class DeepSeekApiError extends Error {
  constructor(
    public status: number,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'DeepSeekApiError';
  }
}

export class FlowParseError extends Error {
  constructor(
    message: string,
    public rawOutput?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'FlowParseError';
  }
}
