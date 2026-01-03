import type { UserRole } from "@prisma/client";

/**
 * ロールに基づくリダイレクト先を決定
 */
export function getRedirectPathForRole(role: UserRole | undefined): string {
  if (!role) {
    return "/login";
  }
  if (role === "PENDING") {
    return "/pending";
  }
  return "/";
}

/**
 * 特定のロールを持っているかを確認
 */
export function hasRole(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) {
    return false;
  }
  if (requiredRole === "ADMIN") {
    return userRole === "ADMIN";
  }
  if (requiredRole === "MEMBER") {
    return userRole === "MEMBER" || userRole === "ADMIN";
  }
  return true;
}
