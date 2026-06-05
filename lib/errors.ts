// Domain errors so callers (the API routes, the feed) can tell *why* a scrape
// failed — bad credentials vs. the Sykes site changing — and surface the right
// message to the user.

export class AuthError extends Error {
  constructor(message = "Sykes authentication failed") {
    super(message);
    this.name = "AuthError";
  }
}

export class ExtractionError extends Error {
  constructor(message = "Could not read data from Sykes — the site may have changed") {
    super(message);
    this.name = "ExtractionError";
  }
}
