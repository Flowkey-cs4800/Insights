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
  goalDays: number; // Bit flags: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
}

export interface Metric {
  metricId: string;
  metricTypeId: string;
  metricTypeName: string;
  date: string;
  value: number;
}

export interface ComparePoint {
  date: string;
  x: number;
  y: number;
}

export interface CompareResult {
  metricX: string;
  metricY: string;
  unitX: string | null;
  unitY: string | null;
  points: ComparePoint[];
  correlation: number | null;
}

export interface ComparisonGroup {
  label: string;
  value: number;
  count: number;
}

export interface ComparisonData {
  groupA: ComparisonGroup;
  groupB: ComparisonGroup;
  valueType: "percentage" | "average";
  percentDiff: number;
  threshold: number | null;
  unit: string | null;
}

export interface InsightItem {
  metricTypeIdX: string;
  metricTypeIdY: string | null;
  metricX: string;
  metricY: string | null;
  unitX: string | null;
  unitY: string | null;
  strength: number;
  direction: "positive" | "negative" | "neutral";
  summary: string;
  dataPoints: number;
  insightType: "correlation" | "streak" | "consistency" | "average";
  comparisonType:
    | "boolean_boolean"
    | "boolean_numeric"
    | "numeric_numeric"
    | null;
  comparisonData: ComparisonData | null;
  scatterData: ComparePoint[] | null;
}

export interface InsightsResponse {
  insights: InsightItem[];
}

// Metric Types
export const getMetricTypes = () => callApi<MetricType[]>("/api/metric-types");

export const createMetricType = (
  name: string,
  kind: string,
  unit?: string,
  goalCadence: GoalCadence = 1,
  goalValue: number = 0,
  goalDays: number = 127
) =>
  callApi<MetricType>("/api/metric-types", "POST", {
    name,
    kind,
    unit,
    goalCadence,
    goalValue,
    goalDays,
  });

export const updateMetricType = (
  metricTypeId: string,
  name: string,
  kind: string,
  unit?: string,
  goalCadence: GoalCadence = 1,
  goalValue: number = 0,
  goalDays: number = 127
) =>
  callApi<MetricType>(`/api/metric-types/${metricTypeId}`, "PUT", {
    name,
    kind,
    unit,
    goalCadence,
    goalValue,
    goalDays,
  });

export const deleteMetricType = (id: string) =>
  callApi(`/api/metric-types/${id}`, "DELETE");

// Metrics
export const getMetrics = (
  from?: string,
  to?: string,
  metricTypeId?: string
) => {
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

export const deleteMetric = (id: string) =>
  callApi(`/api/metrics/${id}`, "DELETE");

// Compare two specific metrics
export const compareMetrics = (metricTypeIdX: string, metricTypeIdY: string) =>
  callApi<CompareResult>(
    `/api/metrics/compare?metricTypeIdX=${metricTypeIdX}&metricTypeIdY=${metricTypeIdY}`
  );

// Get top insights (auto-discovered correlations)
export const getInsights = () =>
  callApi<InsightsResponse>("/api/metrics/insights");

// Analytics interfaces
export interface BarDataPoint {
  label: string;
  value: number;
  isGoalMet: boolean;
}

export interface DayConsistency {
  dayName: string;
  count: number;
  percentage: number;
}

export interface MetricAnalyticsResponse {
  metricName: string;
  kind: "Duration" | "Number" | "Boolean";
  unit: string | null;
  currentStreak: number;
  maxStreak: number;
  average: number;
  consistentDays: DayConsistency[];
  weeklyData: BarDataPoint[];
  monthlyData: BarDataPoint[];
}

// Get analytics for a single metric
export const getMetricAnalytics = (metricTypeId: string) =>
  callApi<MetricAnalyticsResponse>(`/api/metrics/analytics/${metricTypeId}`);