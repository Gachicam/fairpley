import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import type { UserRole } from "@prisma/client";

// Node.js Runtime用の設定（API routeで使用）
// アダプターとDB接続を含む
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // user is only present on initial sign in (runtime check)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      // セッション更新時にDBから最新のロールを取得
      if (trigger === "update" && typeof token.id === "string") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
  },
  events: {
    // 新規ユーザー作成時のロール設定
    async createUser({ user }) {
      // 初回ユーザーは管理者、以降は承認待ち
      const userCount = await prisma.user.count();
      const role: UserRole = userCount === 1 ? "ADMIN" : "PENDING";
      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
    },
  },
});

// 型拡張は auth.config.ts で定義済み
export type { UserRole };
