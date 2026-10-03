import type { DataProvenance } from "../../shared/footballDomain";

export type ProviderConflict = {
  matchId: string;
  field: string;
  providerA: string;
  valueA: unknown;
  providerB: string;
  valueB: unknown;
  selectedValue: unknown;
  reason: string;
  timestamp: string;
  resolved: boolean;
};

export function provenance(source: string, updatedAt: string | null, confidence: DataProvenance["confidence"], verificationState: DataProvenance["verificationState"]): DataProvenance {
  return { source, lastUpdated: updatedAt, confidence, verificationState };
}

export function detectConflicts(matchId: string, snapshots: Array<{ provider: string; value: Record<string, unknown> }>, priority: string[]): ProviderConflict[] {
  if (snapshots.length < 2) return [];
  const fields = new Set(snapshots.flatMap(snapshot => Object.keys(snapshot.value)));
  const conflicts: ProviderConflict[] = [];
  for (const field of Array.from(fields)) {
    const values = snapshots.filter(snapshot => snapshot.value[field] !== undefined);
    const distinct = new Set(values.map(snapshot => JSON.stringify(snapshot.value[field])));
    if (distinct.size < 2) continue;
    const winner = values.slice().sort((a, b) => priority.indexOf(a.provider) - priority.indexOf(b.provider))[0];
    const other = values.find(value => value.provider !== winner.provider)!;
    conflicts.push({ matchId, field, providerA: winner.provider, valueA: winner.value[field], providerB: other.provider, valueB: other.value[field], selectedValue: winner.value[field], reason: `deterministic source priority: ${winner.provider}`, timestamp: new Date().toISOString(), resolved: true });
  }
  return conflicts;
}
