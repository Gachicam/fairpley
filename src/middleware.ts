import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const isLoggedIn = Boolean(session?.user);
  const userRole = session?.user.role;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPendingPage = req.nextUrl.pathname === "/pending";
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  // 認証ルートはスキップ
  if (isAuthRoute) {
    return;
  }

  // 未認証ユーザーはログインページへ
  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  // 認証済みユーザーがログインページにアクセスした場合
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // 承認待ちユーザーは承認待ちページのみアクセス可能
  if (isLoggedIn && userRole === "PENDING" && !isPendingPage) {
    return Response.redirect(new URL("/pending", req.nextUrl));
  }

  // 承認済みユーザーが承認待ちページにアクセスした場合
  if (isLoggedIn && userRole !== "PENDING" && isPendingPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // 管理者ルートは管理者のみアクセス可能
  if (isAdminRoute && userRole !== "ADMIN") {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
