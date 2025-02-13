export class InternalRequestError extends Error {
  status: number = 500;
  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = "InternalRequestError";
  }
}

export class InternalValidationError extends InternalRequestError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}
