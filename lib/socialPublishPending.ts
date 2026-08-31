export class SocialPublishPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialPublishPendingError";
  }
}

export function isSocialPublishPendingError(error: unknown): error is SocialPublishPendingError {
  return error instanceof Error && error.name === "SocialPublishPendingError";
}
