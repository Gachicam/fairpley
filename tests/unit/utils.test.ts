import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("should merge class names", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  it("should handle conditional class names", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("should filter out falsy values", () => {
    const result = cn("base-class", false && "never", null, undefined, "final-class");
    expect(result).toBe("base-class final-class");
  });

  it("should merge Tailwind classes correctly", () => {
    // tailwind-merge should handle conflicting classes
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle array input", () => {
    const result = cn(["class-a", "class-b"]);
    expect(result).toBe("class-a class-b");
  });
});
