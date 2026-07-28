import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        /** Populated from the JWT access token payload. Always present for tokens
         *  issued by this server (role is a required field in AccessTokenPayload). */
        role: string;
      };
    }
  }
}

export {};
