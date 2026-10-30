import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildJoinUrl, isValidRoomCode, normalizeRoomCode, parseJoinRoute, workshopErrorMessage } from "./joinRouting";

describe("join deep links", () => {
  it("extracts one complete path segment and normalizes lowercase/encoded codes", () => {
    expect(parseJoinRoute("/")).toBeNull();
    expect(parseJoinRoute("/joinery/ABC234")).toBeNull();
    expect(parseJoinRoute("/join/abc234/")).toEqual({ code: "ABC234" });
    expect(parseJoinRoute("/join/%41BC234")).toEqual({ code: "ABC234" });
    for (const path of ["/join", "/join/", "/join/ABC234/extra", "/join/%E0%A4%A"]) {
      expect(parseJoinRoute(path)).toEqual({ code: "" });
    }
  });

  it("validates exactly the database's six-character alphabet", () => {
    expect(normalizeRoomCode(" abc234 ")).toBe("ABC234");
    for (const code of ["ABC234", "abc234", "IOZ999"]) expect(isValidRoomCode(code)).toBe(true);
    for (const code of ["ABC123", "ABC023", "ABC23", "ABC2345", "ABC-34", "ABC/34", ""]) expect(isValidRoomCode(code)).toBe(false);
  });

  it("builds the canonical link using the current frontend production origin", () => {
    expect(buildJoinUrl("https://sayntax-mini-game.vercel.app", "abc234")).toBe("https://sayntax-mini-game.vercel.app/join/ABC234");
    expect(buildJoinUrl("https://arena.example.com", "ABC234")).toBe("https://arena.example.com/join/ABC234");
    expect(buildJoinUrl("http://localhost:4173", "ABC234")).toBe("http://localhost:4173/join/ABC234");
    expect(buildJoinUrl("https://arena.example.com", "")).toBeNull();
    expect(buildJoinUrl("https://arena.example.com", "ABC123")).toBeNull();
  });

  it("explains the grouped backend denial without inventing a precise room state", () => {
    const message = workshopErrorMessage("not_found");
    expect(message).toContain("không tồn tại");
    expect(message).toContain("hết hạn");
    expect(message).toContain("khóa/đóng");
    expect(workshopErrorMessage("room_team_limit_reached")).toBe("Phòng đã đủ 8 đội.");
  });

  it("configures Vercel for the Vite build and full-document SPA entry", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.framework).toBe("vite");
    expect(config.buildCommand).toBe("npm run build");
    expect(config.outputDirectory).toBe("dist");
    for (const path of ["/", "/join/ABC234", "/join/ABC123", "/join/ABC234/"]) {
      expect(config.rewrites.some((rule: { source: string; destination: string }) => new RegExp(`^${rule.source}$`).test(path) && rule.destination === "/index.html")).toBe(true);
    }
  });
});
