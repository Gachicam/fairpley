import { auth } from "./auth";
import { prisma } from "./prisma";

// Re-export role helpers for convenience
export { getRedirectPathForRole, hasRole } from "./role-helpers";

/**
 * イベントへのアクセス権を確認
 * イベントの参加者であればアクセス可能
 */
export async function checkEventAccess(eventId: string): Promise<boolean> {
  const session = await auth();
  if (!session) {
    return false;
  }

  const member = await prisma.eventMember.findFirst({
    where: {
      eventId,
      userId: session.user.id,
    },
  });

  return member !== null;
}

/**
 * イベントのオーナーかどうかを確認
 */
export async function checkEventOwner(eventId: string): Promise<boolean> {
  const session = await auth();
  if (!session) {
    return false;
  }

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId: session.user.id,
    },
  });

  return event !== null;
}

/**
 * 管理者かどうかを確認
 */
export async function checkAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user.role === "ADMIN";
}
