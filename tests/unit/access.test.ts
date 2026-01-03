import { describe, it, expect } from "vitest";
import { getRedirectPathForRole, hasRole } from "@/lib/role-helpers";

describe("getRedirectPathForRole", () => {
  it("should return /login for undefined role", () => {
    expect(getRedirectPathForRole(undefined)).toBe("/login");
  });

  it("should return /pending for PENDING role", () => {
    expect(getRedirectPathForRole("PENDING")).toBe("/pending");
  });

  it("should return / for MEMBER role", () => {
    expect(getRedirectPathForRole("MEMBER")).toBe("/");
  });

  it("should return / for ADMIN role", () => {
    expect(getRedirectPathForRole("ADMIN")).toBe("/");
  });
});

describe("hasRole", () => {
  describe("when checking for ADMIN role", () => {
    it("should return true for ADMIN user", () => {
      expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    });

    it("should return false for MEMBER user", () => {
      expect(hasRole("MEMBER", "ADMIN")).toBe(false);
    });

    it("should return false for PENDING user", () => {
      expect(hasRole("PENDING", "ADMIN")).toBe(false);
    });

    it("should return false for undefined role", () => {
      expect(hasRole(undefined, "ADMIN")).toBe(false);
    });
  });

  describe("when checking for MEMBER role", () => {
    it("should return true for ADMIN user", () => {
      expect(hasRole("ADMIN", "MEMBER")).toBe(true);
    });

    it("should return true for MEMBER user", () => {
      expect(hasRole("MEMBER", "MEMBER")).toBe(true);
    });

    it("should return false for PENDING user", () => {
      expect(hasRole("PENDING", "MEMBER")).toBe(false);
    });

    it("should return false for undefined role", () => {
      expect(hasRole(undefined, "MEMBER")).toBe(false);
    });
  });

  describe("when checking for PENDING role", () => {
    it("should return true for any defined role", () => {
      expect(hasRole("ADMIN", "PENDING")).toBe(true);
      expect(hasRole("MEMBER", "PENDING")).toBe(true);
      expect(hasRole("PENDING", "PENDING")).toBe(true);
    });

    it("should return false for undefined role", () => {
      expect(hasRole(undefined, "PENDING")).toBe(false);
    });
  });
});
