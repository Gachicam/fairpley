import { describe, it, expect } from "vitest";
import { addMemberSchema } from "@/lib/schemas/member";

describe("addMemberSchema", () => {
  const validInput = {
    eventId: "123e4567-e89b-12d3-a456-426614174000",
    email: "test@example.com",
  };

  describe("正常系", () => {
    it("メールアドレスのみで受け入れる", () => {
      const result = addMemberSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventId).toBe(validInput.eventId);
        expect(result.data.email).toBe("test@example.com");
        expect(result.data.nickname).toBeUndefined();
      }
    });

    it("ニックネーム付きで受け入れる", () => {
      const result = addMemberSchema.safeParse({
        ...validInput,
        nickname: "太郎",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("太郎");
      }
    });

    it("ニックネームが50文字まで受け入れる", () => {
      const result = addMemberSchema.safeParse({
        ...validInput,
        nickname: "あ".repeat(50),
      });
      expect(result.success).toBe(true);
    });

    it("様々なメールアドレス形式を受け入れる", () => {
      const emails = [
        "user@example.com",
        "user.name@example.co.jp",
        "user+tag@example.com",
        "user@sub.domain.com",
      ];

      for (const email of emails) {
        const result = addMemberSchema.safeParse({
          ...validInput,
          email,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("異常系", () => {
    it("イベントIDが無効なUUIDの場合はエラー", () => {
      const result = addMemberSchema.safeParse({
        ...validInput,
        eventId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("メールアドレスが空の場合はエラー", () => {
      const result = addMemberSchema.safeParse({
        ...validInput,
        email: "",
      });
      expect(result.success).toBe(false);
    });

    it("メールアドレス形式が無効な場合はエラー", () => {
      const invalidEmails = [
        "invalid",
        "invalid@",
        "@example.com",
        "user@.com",
        "user@example.",
      ];

      for (const email of invalidEmails) {
        const result = addMemberSchema.safeParse({
          ...validInput,
          email,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.email).toContain(
            "有効なメールアドレスを入力してください"
          );
        }
      }
    });

    it("ニックネームが51文字以上の場合はエラー", () => {
      const result = addMemberSchema.safeParse({
        ...validInput,
        nickname: "あ".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("イベントIDがない場合はエラー", () => {
      const result = addMemberSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("メールアドレスがない場合はエラー", () => {
      const result = addMemberSchema.safeParse({
        eventId: validInput.eventId,
      });
      expect(result.success).toBe(false);
    });
  });
});
