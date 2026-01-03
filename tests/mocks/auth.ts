import { vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

export const createMockSession = (overrides: Partial<Session["user"]> = {}): Session => ({
  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    image: null,
    role: "MEMBER" as UserRole,
    ...overrides,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
});

export const mockAuth = vi.fn();
export const mockSignIn = vi.fn();
export const mockSignOut = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  signIn: mockSignIn,
  signOut: mockSignOut,
}));
