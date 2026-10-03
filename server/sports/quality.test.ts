import { describe, expect, it } from "vitest";
import { adaptiveRefreshMs, canonicalMatchState, formatIraqDate, realMadridPriority, sortRealMadridFirst } from "../../shared/footballDomain";
import { detectConflicts } from "./quality";

describe("canonical football domain", () => {
  it("maps provider statuses to one match state", () => {
    expect(canonicalMatchState("in progress")).toBe("LIVE");
    expect(canonicalMatchState("postponed")).toBe("POSTPONED");
    expect(canonicalMatchState("FT")).toBe("FINISHED");
  });
  it("prioritizes Real Madrid live matches", () => {
    const rows = [{ status: "scheduled", isRealMadrid: true, startTimeUtc: 2 }, { status: "live", isRealMadrid: false, startTimeUtc: 1 }, { status: "live", isRealMadrid: true, startTimeUtc: 3 }];
    expect(sortRealMadridFirst(rows)[0].isRealMadrid).toBe(true);
    expect(realMadridPriority(rows[2])).toBe(0);
  });
  it("uses adaptive cadence and Iraq timezone formatting", () => {
    expect(adaptiveRefreshMs("live")).toBe(15_000);
    expect(formatIraqDate("2026-09-15T12:00:00Z")).toContain("أيلول");
  });
  it("records disagreements instead of silently dropping them", () => {
    const conflicts = detectConflicts("m1", [{ provider: "ESPN", value: { score: "2-1" } }, { provider: "TheSportsDB", value: { score: "1-1" } }], ["ESPN", "TheSportsDB"]);
    expect(conflicts[0]).toMatchObject({ field: "score", selectedValue: "2-1", resolved: true });
  });
});
