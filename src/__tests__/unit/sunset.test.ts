import { describe, it, expect } from "vitest";
import { sunsetTime, subtractHours } from "@/lib/sunset";

describe("subtractHours", () => {
  it("subtracts whole hours", () => {
    expect(subtractHours("20:00", 2)).toBe("18:00");
  });

  it("subtracts fractional hours", () => {
    expect(subtractHours("20:00", 1.5)).toBe("18:30");
  });

  it("handles minute carry-over", () => {
    expect(subtractHours("18:15", 0.5)).toBe("17:45");
  });

  it("clamps to 00:00 instead of going negative", () => {
    // Going before midnight clamps to 00:00
    expect(subtractHours("01:00", 3)).toBe("00:00");
  });

  it("zero hours returns the same time", () => {
    expect(subtractHours("17:48", 0)).toBe("17:48");
  });
});

describe("sunsetTime", () => {
  // Pengilly, MN: lat 47.5, lng -93.6
  // Summer: CDT = UTC-5; Winter: CST = UTC-6
  const LAT = 47.5;
  const LNG = -93.6;

  it("returns a string in HH:MM format", () => {
    const result = sunsetTime("2024-06-21", LAT, LNG, -5);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("summer sunset is in the evening (after 19:00 CDT)", () => {
    const result = sunsetTime("2024-06-21", LAT, LNG, -5);
    expect(result).not.toBeNull();
    const [h] = result!.split(":").map(Number);
    expect(h).toBeGreaterThanOrEqual(19);
    expect(h).toBeLessThanOrEqual(22);
  });

  it("winter sunset is earlier (before 17:00 CST)", () => {
    const result = sunsetTime("2024-12-21", LAT, LNG, -6);
    expect(result).not.toBeNull();
    const [h] = result!.split(":").map(Number);
    expect(h).toBeLessThan(17);
  });

  it("summer sunset is later than winter sunset", () => {
    const summer = sunsetTime("2024-06-21", LAT, LNG, -5)!;
    const winter = sunsetTime("2024-12-21", LAT, LNG, -6)!;
    // Compare total minutes
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    expect(toMin(summer)).toBeGreaterThan(toMin(winter));
  });

  it("is deterministic for the same inputs", () => {
    const a = sunsetTime("2024-07-04", LAT, LNG, -5);
    const b = sunsetTime("2024-07-04", LAT, LNG, -5);
    expect(a).toBe(b);
  });
});
