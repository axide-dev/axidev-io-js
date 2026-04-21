export class AxidevIoError extends Error {
  readonly action: string;
  readonly details: string | null;

  constructor(action: string, details?: string | null) {
    super(details ? `${action} failed: ${details}` : `${action} failed`);
    this.name = "AxidevIoError";
    this.action = action;
    this.details = details ?? null;
  }
}

export class AxidevIoStateError extends Error {
  readonly action: string;
  readonly details: string;
  readonly code = "AXIDEV_IO_NOT_INITIALIZED" as const;

  constructor(
    action: string,
    details = "keyboard.initialize() to be called first",
  ) {
    super(`${action} requires ${details}`);
    this.name = "AxidevIoStateError";
    this.action = action;
    this.details = details;
  }
}
