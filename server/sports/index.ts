/** Canonical football domain entry point. Provider code must flow through sportsData. */
export {
  COMPETITIONS,
  fetchLiveBundle,
  fetchMatchSummary,
  fetchCompetitionSnapshot,
  fetchPublishedH2H,
  fetchRealMadridSeasonFixtures,
  getDataCenterStatus,
  runScheduledLiveSync,
  startLiveSyncScheduler,
  stopLiveSyncScheduler,
  markStale,
  mergeProviderMatches,
  type CompetitionKey,
  type MatchRecord,
  type MatchBundle,
} from "../sportsData";
export { sortRealMadridFirst, canonicalMatchState, adaptiveRefreshMs, meaningfulMatchChange, formatIraqDate } from "../../shared/footballDomain";
