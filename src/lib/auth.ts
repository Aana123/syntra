// src/lib/auth.ts
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { rl } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  // Use JSON Web Tokens for secure session storage
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days session validity
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Missing credentials.");
          }

          // IP-based brute-force protection — 10 attempts per 15 minutes
          const ip =
            (req as any)?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
            (req as any)?.headers?.["x-real-ip"] ||
            "unknown";
          const loginLimit = rl.login(ip);
          if (!loginLimit.allowed) {
            throw new Error(`Too many login attempts. Try again in ${loginLimit.retryAfterSec}s.`);
          }

          await connectDB();

          // 1. Locate the User Profile
          const user = await User.findOne({ 
            email: credentials.email.trim().toLowerCase()
          }).select("+password");

          if (!user) {
            console.log(`[AUTH-DEBUG] User not found for email: "${credentials.email}"`);
            throw new Error("No Digital Twin mapped to this email.");
          }

          // 2. Validate Secure Password Encryption
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordValid) {
            console.log(`[AUTH-DEBUG] Password mismatch for user: "${credentials.email}"`);
            throw new Error("Invalid password.");
          }

          // 3. Pass Authorized Data to the JWT Lifecycle
          // FIXED: Explicitly mapping the nested gamification streak to the root return object
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatarId: user.avatarId,
            streak: user.gamification?.currentStreak ?? 0, 
            optimizationVector: user.optimizationVector ?? "career",
          };
        } catch (err: any) {
          console.error("[AUTH-ERROR] Authorization failed:", err.message || err);
          return null;
        }
      }
    })
  ],
  callbacks: {
    // Save structural fields from the authorize return statement into the encrypted JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.avatarId = user.avatarId;
        token.streak = user.streak; // Now correctly grabs the value!
        token.optimizationVector = user.optimizationVector;
      }
      return token;
    },
    // Expose those token details so Khwaish can read them on the client via useSession()
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.avatarId = token.avatarId;
        session.user.streak = token.streak;
        session.user.optimizationVector = token.optimizationVector;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", 
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Helper function to securely fetch the current user's session on the server.
 * Your frontend team can import this directly into their layout/pages.
 */
export async function getSession() {
  return await getServerSession(authOptions);
}