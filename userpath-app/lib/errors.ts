export class DeepSeekApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DeepSeekApiError';
  }
}

export class FlowParseError extends Error {
  constructor(
    message: string,
    public rawOutput?: string,
  ) {
    super(message);
    this.name = 'FlowParseError';
  }
}
