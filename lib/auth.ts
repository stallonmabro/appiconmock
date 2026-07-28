import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: UserRole;
};

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
  }
}
