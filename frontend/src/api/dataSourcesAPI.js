import api from "./baseAPI";

// WattTime
export const getWattTimeStats = () => api.get("/api/v1/admin/watttime/stats");
export const syncWattTime = (zone, toNow = true) =>
  api.post("/api/v1/admin/watttime/sync", { zone, to_now: toNow });
export const backfillWattTime = (zones, start_iso, end_iso) =>
  api.post("/api/v1/admin/watttime/backfill", { zones, start_iso, end_iso });

// MBER
export const getMBERStats = () => api.get("/api/v1/admin/mber/stats");

// EIA
export const getEIAStats = () => api.get("/api/v1/admin/eia/stats");

export default {
  getWattTimeStats,
  syncWattTime,
  backfillWattTime,
  getMBERStats,
  getEIAStats,
};

