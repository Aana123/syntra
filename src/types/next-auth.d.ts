// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      avatarId: number;
      streak: number;
      optimizationVector?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    avatarId: number;
    streak: number;
    optimizationVector?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    avatarId: number;
    streak: number;
    optimizationVector?: string;
  }
}
