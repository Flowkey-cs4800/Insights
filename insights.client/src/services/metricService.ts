import { callApi } from "./apiService";

// Goal cadence (matches backend enum numbers)
export type GoalCadence = 0 | 1; // 0 = Daily, 1 = Weekly

// Types
export interface MetricType {
  metricTypeId: string;
  name: string;
  kind: "Duration" | "Number" | "Boolean";
  unit: string | null;

  goalCadence: GoalCadence;
  goalValue: number;
}

export interface Metric {
  metricId: string;
  metricTypeId: string;
  metricTypeName: string;
  date: string;
  value: number;
}

export interface CompareResult {
  metricX: string;
  metricY: string;
  unitX: string | null;
  unitY: string | null;
  points: { date: string; x: number; y: number }[];
  correlation: number | null;
}

// Metric Types
export const getMetricTypes = () => callApi<MetricType[]>("/api/metric-types");

export const createMetricType = (
  name: string,
  kind: string,
  unit?: string,
  goalCadence: GoalCadence = 1,
  goalValue: number = 0
) =>
  callApi<MetricType>("/api/metric-types", "POST", {
    name,
    kind,
    unit,
    goalCadence,
    goalValue,
  });

export const updateMetricType = (
  metricTypeId: string,
  name: string,
  kind: string,
  unit?: string,
  goalCadence: GoalCadence = 1,
  goalValue: number = 0
) =>
  callApi<MetricType>(`/api/metric-types/${metricTypeId}`, "PUT", {
    name,
    kind,
    unit,
    goalCadence,
    goalValue,
  });

export const deleteMetricType = (id: string) =>
  callApi(`/api/metric-types/${id}`, "DELETE");

// Metrics
export const getMetrics = (from?: string, to?: string, metricTypeId?: string) => {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (metricTypeId) params.append("metricTypeId", metricTypeId);
  return callApi<Metric[]>(`/api/metrics?${params}`);
};

export const logMetric = (metricTypeId: string, date: string, value: number) =>
  callApi<Metric>("/api/metrics", "POST", { metricTypeId, date, value });

export const updateMetric = (id: string, value: number) =>
  callApi<Metric>(`/api/metrics/${id}`, "PUT", { value });

export const deleteMetric = (id: string) => callApi(`/api/metrics/${id}`, "DELETE");

// Compare
export const compareMetrics = (metricTypeIdX: string, metricTypeIdY: string) =>
  callApi<CompareResult>(
    `/api/metrics/compare?metricTypeIdX=${metricTypeIdX}&metricTypeIdY=${metricTypeIdY}`
  );