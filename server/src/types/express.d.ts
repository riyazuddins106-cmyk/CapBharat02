import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        /** Populated from the JWT payload. May be undefined for tokens issued
         *  before role was added to the payload; requireRole handles the fallback. */
        role?: string;
      };
    }
  }
}

export {};
