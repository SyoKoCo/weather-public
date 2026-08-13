const loadButton = document.getElementById("loadButton");
const summaryOutput = document.getElementById("summaryOutput");
const recordSummaryOutput = document.getElementById("recordSummaryOutput");
const recordDateInput = document.getElementById("recordDateInput");
const recordDateLoadButton = document.getElementById("recordDateLoadButton");
const selectedRecordSummaryOutput = document.getElementById("selectedRecordSummaryOutput");
const latestLogsOutput = document.getElementById("latestLogsOutput");
const historyOutput = document.getElementById("historyOutput");
const payloadOutput = document.getElementById("payloadOutput");
const allPayloadOutput = document.getElementById("allPayloadOutput");
const trendChart = document.getElementById("trendChart");
const chartMetaText = document.getElementById("chartMetaText");
const rangeButtons = document.getElementById("rangeButtons");
const metricButtons = document.getElementById("metricButtons");
const customControls = document.getElementById("customControls");
const startDateTimeInput = document.getElementById("startDateTimeInput");
const endDateTimeInput = document.getElementById("endDateTimeInput");
const intervalValueInput = document.getElementById("intervalValueInput");
const intervalUnitSelect = document.getElementById("intervalUnitSelect");
const applyRangeButton = document.getElementById("applyRangeButton");

const dailyDateInput = document.getElementById("dailyDateInput");
const dailyLoadButton = document.getElementById("dailyLoadButton");
const dailyRangeButtons = document.getElementById("dailyRangeButtons");
const dailyCustomControls = document.getElementById("dailyCustomControls");
const dailyStartTimeInput = document.getElementById("dailyStartTimeInput");
const dailyEndTimeInput = document.getElementById("dailyEndTimeInput");
const dailyIntervalValueInput = document.getElementById("dailyIntervalValueInput");
const dailyIntervalUnitSelect = document.getElementById("dailyIntervalUnitSelect");
const dailyApplyRangeButton = document.getElementById("dailyApplyRangeButton");
const dailyMetricButtons = document.getElementById("dailyMetricButtons");
const dailyTrendChart = document.getElementById("dailyTrendChart");
const dailyChartMetaText = document.getElementById("dailyChartMetaText");
const dailyPayloadOutput = document.getElementById("dailyPayloadOutput");

const chartTooltip = document.getElementById("chartTooltip");

const IGNORED_VALUES = new Set([-600, -400]);
const JST_OFFSET = "+09:00";
const RANGE_CONFIGS = {
  "5m": { mode: "lookback", label: "5分", durationMs: 5 * 60 * 1000, sampleMs: 30 * 1000 },
  "1h": { mode: "lookback", label: "1時間", durationMs: 60 * 60 * 1000, sampleMs: 5 * 60 * 1000 },
  "3h": { mode: "lookback", label: "3時間", durationMs: 3 * 60 * 60 * 1000, sampleMs: 10 * 60 * 1000 },
  "12h": { mode: "lookback", label: "12時間", durationMs: 12 * 60 * 60 * 1000, sampleMs: 30 * 60 * 1000 },
  "24h": { mode: "lookback", label: "24時間", durationMs: 24 * 60 * 60 * 1000, sampleMs: 60 * 60 * 1000 },
};

const METRICS = [
  { key: "outdoorTemperatureC", label: "外の気温", code: "temp_current_external", scale: 10, className: "chart-line-outdoor", unit: "℃", chartType: "line" },
  { key: "indoorTemperatureC", label: "部屋の気温", code: "temp_current", scale: 10, className: "chart-line-indoor", unit: "℃", chartType: "line" },
  { key: "outdoorHumidityPercent", label: "外の湿度", code: "humidity_outdoor", scale: 1, className: "chart-line-humidity", unit: "%", chartType: "line" },
  { key: "pressureHpa", label: "気圧", code: "atmospheric_pressture", scale: 1, className: "chart-line-pressure", unit: "hPa", chartType: "line" },
  { key: "windAverageMps", label: "平均風速", code: "windspeed_avg", scale: 10, className: "chart-line-wind", unit: "m/s", chartType: "line" },
  { key: "windGustMps", label: "最大瞬間風速", code: "windspeed_gust", scale: 10, className: "chart-line-gust", unit: "m/s", chartType: "line" },
  { key: "rain1hMm", label: "1時間雨量", code: "rain_1h", scale: 10, className: "chart-bar-rain", unit: "mm", chartType: "bar" },
  { key: "rain24hMm", label: "24時間雨量", code: "rain_24h", scale: 10, className: "chart-bar-rain24", unit: "mm", chartType: "bar" },
  { key: "rainRateMmPerHour", label: "雨量強度", code: "rain_rate", scale: 10, className: "chart-bar-rainrate", unit: "mm/h", chartType: "bar", defaultValue: 0, carryForward: false, fillMissingInChart: false },
  { key: "uvIndex", label: "UV指数", code: "uv_index", scale: 1, className: "chart-line-uv", unit: "", chartType: "line" },
  { key: "dewPointC", label: "露点温度", code: "dew_point_temp", scale: 10, className: "chart-line-dew", unit: "℃", chartType: "line" },
  { key: "feelsLikeC", label: "体感温度", code: "feellike_temp", scale: 10, className: "chart-line-feels", unit: "℃", chartType: "line" },
];

let allRecordsCache = [];
let dailyRecordsCache = [];
let previousDayRecordCache = null;
let selectedRangeKey = "24h";
let selectedMetricKey = "outdoorTemperatureC";
let selectedDailyRangeKey = "24h";
let selectedDailyMetricKey = "outdoorTemperatureC";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function normalizeSensorValue(value, scale = 1) {
  const numeric = toNumber(value);
  if (numeric === null || IGNORED_VALUES.has(numeric)) return null;
  return numeric / scale;
}

function normalizeSensorValueOrZero(value, scale = 1) {
  const normalized = normalizeSensorValue(value, scale);
  return normalized === null ? 0 : normalized;
}

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ja-JP");
}

function formatShortTime(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeWithSeconds(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatValue(value, unit = "") {
  if (value === null || value === undefined) return "-";
  return `${value}${unit}`;
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTimeLocalValue(ms) {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultDailyDateValue() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDateInputValue(date);
}

function previousDateValue(dateValue) {
  const date = new Date(`${dateValue}T00:00:00${JST_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 1);
  return formatDateInputValue(date);
}

function todayDateValue() {
  return formatDateInputValue(new Date());
}

function getDateWindowMs(dateValue) {
  const start = new Date(`${dateValue}T00:00:00${JST_OFFSET}`).getTime();
  if (Number.isNaN(start)) return null;
  return {
    startTimeMs: start,
    endTimeMs: start + (24 * 60 * 60 * 1000),
  };
}

function getMetricPrecision(metric) {
  if (metric.unit === "%" || metric.unit === "hPa") return 0;
  return 1;
}

function getNiceStep(range) {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const roughStep = range / 5;
  const exponent = Math.floor(Math.log10(roughStep));
  const fraction = roughStep / (10 ** exponent);

  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * (10 ** exponent);
}

function unwrapJsonLike(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return unwrapJsonLike(JSON.parse(trimmed), depth + 1);
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) return value.map((item) => unwrapJsonLike(item, depth + 1));
  if (typeof value !== "object") return value;
  if (value.summary && Array.isArray(value.logs)) return value;

  for (const key of ["payload", "data", "result", "body"]) {
    if (key in value) {
      const nested = unwrapJsonLike(value[key], depth + 1);
      if (nested !== undefined && nested !== null) return nested;
    }
  }

  return value;
}

function buildSummaryFromPayload(payload) {
  const result = Array.isArray(payload?.status?.result) ? payload.status.result : [];
  const entries = Object.fromEntries(result.map((item) => [item.code, item.value]));

  return {
    observedAt: payload?.observedAt ?? null,
    windowStart: payload?.windowStart ?? null,
    windowEnd: payload?.windowEnd ?? null,
    sampleCount: payload?.sampleCount ?? null,
    indoorTemperatureC: normalizeSensorValue(entries.temp_current, 10),
    indoorHumidityPercent: normalizeSensorValue(entries.humidity_value),
    outdoorTemperatureC: normalizeSensorValue(entries.temp_current_external, 10),
    outdoorHumidityPercent: normalizeSensorValue(entries.humidity_outdoor),
    pressureHpa: normalizeSensorValue(entries.atmospheric_pressture),
    windAverageMps: normalizeSensorValue(entries.windspeed_avg, 10),
    windGustMps: normalizeSensorValue(entries.windspeed_gust, 10),
    rain1hMm: normalizeSensorValue(entries.rain_1h, 10),
    rain24hMm: normalizeSensorValue(entries.rain_24h, 10),
    rainRateMmPerHour: normalizeSensorValueOrZero(entries.rain_rate, 10),
    uvIndex: normalizeSensorValue(entries.uv_index),
    dewPointC: normalizeSensorValue(entries.dew_point_temp, 10),
    feelsLikeC: normalizeSensorValue(entries.feellike_temp, 10),
  };
}

function normalizeSummaryObject(summary) {
  if (!summary || typeof summary !== "object") return null;

  return {
    ...summary,
    indoorTemperatureC: toNumber(summary.indoorTemperatureC),
    indoorHumidityPercent: toNumber(summary.indoorHumidityPercent),
    outdoorTemperatureC: toNumber(summary.outdoorTemperatureC),
    outdoorHumidityPercent: toNumber(summary.outdoorHumidityPercent),
    pressureHpa: toNumber(summary.pressureHpa),
    windAverageMps: normalizeSensorValue(summary.windAverageMps, 10),
    windGustMps: normalizeSensorValue(summary.windGustMps, 10),
    rain1hMm: normalizeSensorValue(summary.rain1hMm, 10),
    rain24hMm: normalizeSensorValue(summary.rain24hMm, 10),
    rainRateMmPerHour: normalizeSensorValueOrZero(summary.rainRateMmPerHour, 10),
    uvIndex: toNumber(summary.uvIndex),
    dewPointC: toNumber(summary.dewPointC),
    feelsLikeC: toNumber(summary.feelsLikeC),
  };
}

function normalizeLog(log) {
  const timestamp = typeof log?.eventTime === "number"
    ? new Date(log.eventTime).toISOString()
    : log?.eventTime ?? null;
  return { ...log, eventTime: timestamp };
}

function normalizeRecord(item) {
  const record = unwrapJsonLike(item);
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;

  const logs = (Array.isArray(record.logs) ? record.logs : [])
    .map(normalizeLog)
    .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());

  return {
    ...record,
    summary: record.summary ? normalizeSummaryObject(record.summary) : buildSummaryFromPayload(record),
    logs,
  };
}

function isRecordLike(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Boolean(value.summary || Array.isArray(value.logs) || Array.isArray(value?.status?.result));
}

function collectRecordsDeep(value, results, seen) {
  const unwrapped = unwrapJsonLike(value);
  if (!unwrapped || typeof unwrapped !== "object") return;
  if (seen.has(unwrapped)) return;
  seen.add(unwrapped);

  if (Array.isArray(unwrapped)) {
    for (const item of unwrapped) collectRecordsDeep(item, results, seen);
    return;
  }

  if (isRecordLike(unwrapped)) {
    const normalized = normalizeRecord(unwrapped);
    if (normalized) results.push(normalized);
  }

  for (const nested of Object.values(unwrapped)) {
    collectRecordsDeep(nested, results, seen);
  }
}

function getRecordTimestampMs(record) {
  const candidates = [
    record?.summary?.observedAt,
    record?.summary?.windowEnd,
    record?.summary?.windowStart,
    record?.observedAt,
    record?.windowEnd,
    record?.windowStart,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  if (Array.isArray(record?.logs) && record.logs.length > 0) {
    const timestamp = new Date(record.logs[0].eventTime).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  return null;
}

function getSummaryTimestampMs(record) {
  const candidates = [
    record?.summary?.observedAt,
    record?.summary?.windowEnd,
    record?.summary?.windowStart,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  return null;
}

function normalizeRecords(data) {
  const results = [];
  collectRecordsDeep(data, results, new WeakSet());

  const deduped = new Map();
  for (const record of results) {
    const summary = record.summary || {};
    const key = [
      summary.observedAt || "",
      summary.windowStart || "",
      summary.windowEnd || "",
      Array.isArray(record.logs) ? record.logs.length : 0,
    ].join("|");
    deduped.set(key, record);
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const aTime = getRecordTimestampMs(a) ?? 0;
    const bTime = getRecordTimestampMs(b) ?? 0;
    return aTime - bTime;
  });
}

function normalizeLatestResponse(data) {
  const payload = unwrapJsonLike(data);
  const records = normalizeRecords(payload);
  const latest = records.at(-1) || null;
  return {
    payload,
    latest,
    summary: latest?.summary || null,
    logs: Array.isArray(latest?.logs) ? latest.logs : [],
  };
}

function configuredLatestApiUrl() {
  const queryUrl = new URLSearchParams(window.location.search).get("latestApi");
  if (queryUrl) return queryUrl;
  const metaUrl = document.querySelector('meta[name="weather-latest-api-url"]')?.content?.trim();
  return metaUrl || "data/latest_weather.json";
}

function configuredAllApiUrl(latestApiUrl) {
  const queryUrl = new URLSearchParams(window.location.search).get("allApi");
  if (queryUrl) return queryUrl;

  const metaUrl = document.querySelector('meta[name="weather-all-api-url"]')?.content?.trim();
  if (metaUrl) return metaUrl;

  if (latestApiUrl.endsWith("/latest")) {
    return `${latestApiUrl.slice(0, -"/latest".length)}/recent`;
  }

  return latestApiUrl;
}

function getRecordsTimeBounds(records) {
  const seriesByMetric = buildMetricSeries(records);
  const allPoints = Object.values(seriesByMetric).flat();
  if (allPoints.length === 0) return null;
  return {
    minTimeMs: Math.min(...allPoints.map((point) => point.t)),
    maxTimeMs: Math.max(...allPoints.map((point) => point.t)),
  };
}

function renderSummary(summary) {
  if (!summary) {
    summaryOutput.innerHTML = `
      <section class="summary-group">
        <h3>表示状態</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <strong>メッセージ</strong>
            <span>表示できるデータがありません。</span>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const groups = [
    {
      title: "観測情報",
      items: [
        ["最新の観測時刻", formatTimestamp(summary.observedAt)],
        ["観測開始", formatTimestamp(summary.windowStart)],
        ["観測終了", formatTimestamp(summary.windowEnd)],
      ],
    },
    {
      title: "部屋",
      items: [
        ["部屋の気温", formatValue(summary.indoorTemperatureC, "℃")],
        ["部屋の湿度", formatValue(summary.indoorHumidityPercent, "%")],
      ],
    },
    {
      title: "外",
      items: [
        ["外の気温", formatValue(summary.outdoorTemperatureC, "℃")],
        ["外の湿度", formatValue(summary.outdoorHumidityPercent, "%")],
        ["気圧", formatValue(summary.pressureHpa, "hPa")],
        ["平均風速", formatValue(summary.windAverageMps, "m/s")],
        ["最大瞬間風速", formatValue(summary.windGustMps, "m/s")],
        ["1時間雨量", formatValue(summary.rain1hMm, "mm")],
        ["24時間雨量", formatValue(summary.rain24hMm, "mm")],
        ["雨量強度", formatValue(summary.rainRateMmPerHour, "mm/h")],
        ["UV指数", formatValue(summary.uvIndex)],
        ["露点温度", formatValue(summary.dewPointC, "℃")],
        ["体感温度", formatValue(summary.feelsLikeC, "℃")],
      ],
    },
  ];

  summaryOutput.innerHTML = groups.map((group) => `
    <section class="summary-group">
      <h3>${group.title}</h3>
      <div class="summary-grid">
        ${group.items.map(([label, value]) => `
          <div class="summary-card">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function getMetricPointsForDay(records, metricKey, dateValue) {
  const window = getDateWindowMs(dateValue);
  if (!window) return [];
  const series = buildMetricSeries(records)[metricKey] || [];
  return series.filter((point) => point.t >= window.startTimeMs && point.t < window.endTimeMs && point.value !== null);
}

function getExtremeMetricValue(records, metricKey, dateValue, mode) {
  const points = getMetricPointsForDay(records, metricKey, dateValue);
  if (points.length === 0) return null;
  const values = points.map((point) => point.value);
  return mode === "min" ? Math.min(...values) : Math.max(...values);
}

function getRollingRainMaximumEntry(records, dateValue, hours) {
  const window = getDateWindowMs(dateValue);
  if (!window) return null;

  const sampled = buildSampledSeriesForWindow(
    records,
    window.startTimeMs,
    window.endTimeMs - 1,
    60 * 60 * 1000,
  );

  if (sampled.length === 0) return null;

  const windowSize = Math.max(1, Math.round(hours));
  const values = sampled.map((point) => {
    const numeric = toNumber(point.rain1hMm);
    return numeric === null ? 0 : Math.max(0, numeric);
  });

  let best = 0;
  let bestIndex = 0;
  for (let index = 0; index < values.length; index += 1) {
    let total = 0;
    for (let offset = 0; offset < windowSize; offset += 1) {
      const targetIndex = index - offset;
      if (targetIndex < 0) break;
      total += values[targetIndex];
    }
    if (total > best) {
      best = total;
      bestIndex = index;
    }
  }

  const endTimeMs = sampled[bestIndex]?.t ?? null;
  const startTimeMs = endTimeMs === null ? null : endTimeMs - (windowSize * 60 * 60 * 1000);
  return {
    value: best,
    t: endTimeMs,
    startTimeMs,
    endTimeMs,
  };
}

function formatRecordSummaryValue(value, unit, precision = 1) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(precision)}${unit}`;
}

function formatRecordDateTime(value) {
  if (value === null || value === undefined) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

function formatRecordClock(value) {
  if (value === null || value === undefined) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}時${minutes}分${seconds}秒`;
}

function formatRecordRange(startValue, endValue) {
  if (startValue === null || startValue === undefined || endValue === null || endValue === undefined) {
    return "-";
  }

  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";

  const startHours = String(start.getHours()).padStart(2, "0");
  const startMinutes = String(start.getMinutes()).padStart(2, "0");
  const endHours = String(end.getHours()).padStart(2, "0");
  const endMinutes = String(end.getMinutes()).padStart(2, "0");
  return `${startHours}時${startMinutes}分～${endHours}時${endMinutes}分`;
}

function formatRecordDisplayTime(entry) {
  if (!entry) return "-";
  if (entry.startTimeMs !== undefined || entry.endTimeMs !== undefined) {
    return formatRecordRange(entry.startTimeMs, entry.endTimeMs);
  }
  return formatRecordClock(entry.t);
}

function getExtremeMetricPoint(records, metricKey, dateValue, mode) {
  const points = getMetricPointsForDay(records, metricKey, dateValue);
  if (points.length === 0) return null;

  return points.reduce((best, point) => {
    if (!best) return point;
    if (mode === "min") return point.value < best.value ? point : best;
    return point.value > best.value ? point : best;
  }, null);
}

function createRecordMetricEntry(value, time = null, startTimeMs = null, endTimeMs = null) {
  if (value === null || value === undefined) {
    return { value: null, t: time, startTimeMs, endTimeMs };
  }
  return { value, t: time, startTimeMs, endTimeMs };
}

function buildRecordSummaryConfigs(targetRecords, compareRecords, targetDate, compareDate, compareLabel = "前日") {
  return [
    {
      label: "外の最高気温",
      primary: getExtremeMetricPoint(targetRecords, "outdoorTemperatureC", targetDate, "max"),
      compare: getExtremeMetricPoint(compareRecords, "outdoorTemperatureC", compareDate, "max"),
      unit: "℃",
      precision: 1,
    },
    {
      label: "外の最低気温",
      primary: getExtremeMetricPoint(targetRecords, "outdoorTemperatureC", targetDate, "min"),
      compare: getExtremeMetricPoint(compareRecords, "outdoorTemperatureC", compareDate, "min"),
      unit: "℃",
      precision: 1,
    },
    {
      label: "1時間の最高雨量",
      primary: (() => {
        const point = getExtremeMetricPoint(targetRecords, "rain1hMm", targetDate, "max");
        return point
          ? createRecordMetricEntry(point.value, point.t, point.t - (60 * 60 * 1000), point.t)
          : createRecordMetricEntry(0, null, null, null);
      })(),
      compare: (() => {
        const point = getExtremeMetricPoint(compareRecords, "rain1hMm", compareDate, "max");
        return point
          ? createRecordMetricEntry(point.value, point.t, point.t - (60 * 60 * 1000), point.t)
          : createRecordMetricEntry(0, null, null, null);
      })(),
      unit: "mm",
      precision: 1,
    },
    {
      label: "3時間の最高雨量",
      primary: getRollingRainMaximumEntry(targetRecords, targetDate, 3) ?? createRecordMetricEntry(0),
      compare: getRollingRainMaximumEntry(compareRecords, compareDate, 3) ?? createRecordMetricEntry(0),
      unit: "mm",
      precision: 1,
    },
    {
      label: "24時間の最高雨量",
      primary: getRollingRainMaximumEntry(targetRecords, targetDate, 24) ?? createRecordMetricEntry(0),
      compare: getRollingRainMaximumEntry(compareRecords, compareDate, 24) ?? createRecordMetricEntry(0),
      unit: "mm",
      precision: 1,
    },
    {
      label: "平均風速",
      primary: getExtremeMetricPoint(targetRecords, "windAverageMps", targetDate, "max"),
      compare: getExtremeMetricPoint(compareRecords, "windAverageMps", compareDate, "max"),
      unit: "m/s",
      precision: 1,
    },
    {
      label: "最大瞬間風速",
      primary: getExtremeMetricPoint(targetRecords, "windGustMps", targetDate, "max"),
      compare: getExtremeMetricPoint(compareRecords, "windGustMps", compareDate, "max"),
      unit: "m/s",
      precision: 1,
    },
    {
      label: "体感温度",
      primary: getExtremeMetricPoint(targetRecords, "feelsLikeC", targetDate, "max"),
      compare: getExtremeMetricPoint(compareRecords, "feelsLikeC", compareDate, "max"),
      unit: "℃",
      precision: 1,
    },
  ].map((item) => ({ ...item, compareLabel }));
}

function renderComparisonRecordSummary(container, configs, primaryLabel) {
  container.innerHTML = configs.map((item) => `
    <div class="record-summary-card">
      <strong>${item.label}</strong>
      <div class="record-summary-values">
        <span>${primaryLabel}: ${formatRecordSummaryValue(item.primary?.value, item.unit, item.precision)}</span>
        <span>${item.compareLabel}: ${formatRecordSummaryValue(item.compare?.value, item.unit, item.precision)}</span>
      </div>
    </div>
  `).join("");
}

function renderSingleRecordSummary(container, configs) {
  container.innerHTML = configs.map((item) => `
    <div class="record-summary-card">
      <strong>${item.label}</strong>
      <div class="record-summary-values">
        <span class="record-summary-time">${formatRecordDisplayTime(item.primary)}</span>
        <span class="record-summary-number">${formatRecordSummaryValue(item.primary?.value, item.unit, item.precision)}</span>
      </div>
    </div>
  `).join("");
}

function renderRecordSummary(todayRecords, previousDayRecord, todayDate, previousDate) {
  const previousRecords = previousDayRecord ? [previousDayRecord] : [];
  const configs = buildRecordSummaryConfigs(todayRecords, previousRecords, todayDate, previousDate, "前日");
  renderComparisonRecordSummary(recordSummaryOutput, configs, "今日");
}

async function loadSelectedRecordSummary() {
  const dateValue = recordDateInput.value;
  if (!dateValue) return;

  recordDateLoadButton.disabled = true;

  try {
    let targetRecords = [];
    if (dateValue === todayDateValue()) {
      targetRecords = allRecordsCache;
    } else {
      const dailyData = await fetchJson(`data/daily/${dateValue}.json`);
      const normalized = normalizeRecord(dailyData);
      targetRecords = normalized ? [normalized] : [];
    }

    const configs = buildRecordSummaryConfigs(targetRecords, [], dateValue, null, "");
    renderSingleRecordSummary(selectedRecordSummaryOutput, configs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    selectedRecordSummaryOutput.innerHTML = `
      <div class="record-summary-card">
        <strong>${dateValue}</strong>
        <div class="record-summary-values">
          <span>${message}</span>
        </div>
      </div>
    `;
  } finally {
    recordDateLoadButton.disabled = false;
  }
}

function renderLatestLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) {
    latestLogsOutput.textContent = "ログがありません。";
    return;
  }

  latestLogsOutput.textContent = logs
    .map((log) => `${formatTimestamp(log.eventTime)} | ${log.code || "-"} | ${formatValue(log.value)}`)
    .join("\n");
}

function renderHistory(records) {
  if (!Array.isArray(records) || records.length === 0) {
    historyOutput.textContent = "直近24時間のデータがありません。";
    return;
  }

  historyOutput.textContent = records.map((record, index) => {
    const summary = record.summary || buildSummaryFromPayload(record);
    return [
      `[${index + 1}] ${summary.windowStart || "-"} -> ${summary.windowEnd || "-"}`,
      `  観測時刻: ${formatTimestamp(summary.observedAt)}`,
      `  外の気温: ${formatValue(summary.outdoorTemperatureC, "℃")}`,
      `  部屋の気温: ${formatValue(summary.indoorTemperatureC, "℃")}`,
      `  外の湿度: ${formatValue(summary.outdoorHumidityPercent, "%")}`,
    ].join("\n");
  }).join("\n\n");
}

function buildMetricSeries(records) {
  const seriesByMetric = Object.fromEntries(METRICS.map((metric) => [metric.key, []]));

  for (const record of records) {
    const summary = record.summary || buildSummaryFromPayload(record);
    const summaryTime = getSummaryTimestampMs(record);

    if (summaryTime !== null) {
      for (const metric of METRICS) {
        const numeric = toNumber(summary[metric.key]);
        const value = numeric ?? null;
        if (value !== null) seriesByMetric[metric.key].push({ t: summaryTime, value });
      }
    }

    const logs = Array.isArray(record.logs) ? record.logs : [];
    for (const log of logs) {
      const timestampMs = log?.eventTime ? new Date(log.eventTime).getTime() : Number.NaN;
      if (Number.isNaN(timestampMs)) continue;

      for (const metric of METRICS) {
        if (log.code !== metric.code) continue;
        const value = normalizeSensorValue(log.value, metric.scale);
        if (value !== null) seriesByMetric[metric.key].push({ t: timestampMs, value });
      }
    }
  }

  for (const metric of METRICS) {
    const deduped = new Map();
    for (const point of seriesByMetric[metric.key]) deduped.set(point.t, point.value);
    seriesByMetric[metric.key] = Array.from(deduped.entries())
      .map(([t, value]) => ({ t, value }))
      .sort((a, b) => a.t - b.t);
  }

  return seriesByMetric;
}

function buildSeedRecordFromPreviousDay(previousRecord, dateValue) {
  if (!previousRecord) return null;

  const previousSeries = buildMetricSeries([previousRecord]);
  const summary = {
    observedAt: `${dateValue}T00:00:00${JST_OFFSET}`,
    windowStart: `${dateValue}T00:00:00${JST_OFFSET}`,
    windowEnd: `${dateValue}T00:00:00${JST_OFFSET}`,
    sampleCount: 0,
  };

  let hasAnyValue = false;
  for (const metric of METRICS) {
    const lastPoint = previousSeries[metric.key]?.at(-1) || null;
    const value = metric.carryForward === false ? null : (lastPoint ? lastPoint.value : null);
    summary[metric.key] = value;
    if (value !== null) hasAnyValue = true;
  }

  if (!hasAnyValue) return null;

  return {
    summary,
    logs: [],
  };
}

function buildSampledSeriesForWindow(records, startTimeMs, endTimeMs, sampleMs) {
  const seriesByMetric = buildMetricSeries(records);
  const allPoints = Object.values(seriesByMetric).flat();
  if (allPoints.length === 0) return [];

  const indices = Object.fromEntries(METRICS.map((metric) => [metric.key, 0]));
  const currentValues = Object.fromEntries(
    METRICS.map((metric) => [metric.key, metric.fillMissingInChart === false ? null : (metric.defaultValue ?? null)]),
  );
  const sampled = [];
  const stepMs = Math.max(60 * 1000, sampleMs);

  for (let bucket = startTimeMs; bucket <= endTimeMs; bucket += stepMs) {
    for (const metric of METRICS) {
      const points = seriesByMetric[metric.key];
      while (indices[metric.key] < points.length && points[indices[metric.key]].t <= bucket) {
        currentValues[metric.key] = points[indices[metric.key]].value;
        indices[metric.key] += 1;
      }
    }

    const point = { t: bucket, label: formatShortTime(bucket) };
    for (const metric of METRICS) {
      point[metric.key] = currentValues[metric.key];
    }
    sampled.push(point);

    for (const metric of METRICS) {
      if (metric.carryForward === false) {
        currentValues[metric.key] = null;
      }
    }
  }

  return sampled;
}

function buildSeriesForConfig(records, config) {
  if (config.mode === "window") {
    return buildSampledSeriesForWindow(records, config.startTimeMs, config.endTimeMs, config.sampleMs);
  }

  const seriesByMetric = buildMetricSeries(records);
  const allPoints = Object.values(seriesByMetric).flat();
  if (allPoints.length === 0) return [];

  const latestTime = Math.max(...allPoints.map((point) => point.t));
  const cutoff = latestTime - config.durationMs;
  const startBucket = Math.floor(cutoff / config.sampleMs) * config.sampleMs;
  const endBucket = Math.floor(latestTime / config.sampleMs) * config.sampleMs;

  return buildSampledSeriesForWindow(records, startBucket, endBucket, config.sampleMs).filter((point) => point.t >= cutoff);
}

function renderMetricButtons(container, selectedKey) {
  container.innerHTML = METRICS.map((metric) => `
    <button class="metric-button${metric.key === selectedKey ? " active" : ""}" data-metric-key="${metric.key}" type="button">
      ${metric.label}
    </button>
  `).join("");
}

function buildLinePath(points, xScale, yScale) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.t).toFixed(1)} ${yScale(point.value).toFixed(1)}`)
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showTooltip(text, event) {
  chartTooltip.textContent = text;
  chartTooltip.hidden = false;
  moveTooltip(event);
}

function moveTooltip(event) {
  if (chartTooltip.hidden) return;
  chartTooltip.style.left = `${event.clientX + 14}px`;
  chartTooltip.style.top = `${event.clientY + 14}px`;
}

function hideTooltip() {
  chartTooltip.hidden = true;
}

function bindChartTooltip(chartElement) {
  chartElement.addEventListener("mousemove", (event) => {
    const target = event.target.closest("[data-tooltip]");
    if (!target) {
      hideTooltip();
      return;
    }
    showTooltip(target.getAttribute("data-tooltip") || "", event);
  });
  chartElement.addEventListener("mouseleave", hideTooltip);
}

function renderTrendChart(records, rangeConfig, metricKey, chartElement, metaElement) {
  const metric = METRICS.find((item) => item.key === metricKey) || METRICS[0];
  const sampledSeries = buildSeriesForConfig(records, rangeConfig);
  const series = sampledSeries
    .map((item) => ({ t: item.t, label: item.label, value: item[metric.key] }))
    .filter((item) => item.value !== null);

  if (series.length === 0 || sampledSeries.length === 0) {
    metaElement.textContent = `${metric.label} / ${rangeConfig.label} に表示できるデータがありません。`;
    chartElement.innerHTML = `<text x="480" y="180" text-anchor="middle" class="chart-empty">この時間の観測はありません</text>`;
    return;
  }

  const padding = { top: 24, right: 28, bottom: 48, left: 56 };
  const width = 960;
  const height = 360;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minTime = sampledSeries[0].t;
  const maxTime = sampledSeries[sampledSeries.length - 1].t;
  const minValue = metric.chartType === "bar" ? 0 : Math.min(...series.map((item) => item.value));
  const maxValue = Math.max(...series.map((item) => item.value));
  const paddingValue = metric.chartType === "bar" ? Math.max(0.5, maxValue * 0.08) : Math.max(0.5, (maxValue - minValue) * 0.08);
  const rawDomainMin = Math.max(0, metric.chartType === "bar" ? 0 : minValue - paddingValue);
  const rawDomainMax = Math.max(maxValue, rawDomainMin + 0.5, maxValue + paddingValue);
  const precision = getMetricPrecision(metric);
  const tickStep = getNiceStep(rawDomainMax - rawDomainMin);
  const domainMin = Math.max(0, Math.floor(rawDomainMin / tickStep) * tickStep);
  const intervalCount = Math.max(2, Math.ceil((rawDomainMax - domainMin) / tickStep));
  const domainMax = domainMin + tickStep * intervalCount;

  const xScale = (value) => padding.left + ((value - minTime) / Math.max(1, maxTime - minTime)) * chartWidth;
  const yScale = (value) => padding.top + chartHeight - ((value - domainMin) / Math.max(1, domainMax - domainMin)) * chartHeight;

  const yAxis = Array.from({ length: intervalCount + 1 }, (_, index) => {
    const ratio = index / Math.max(1, intervalCount);
    const value = domainMax - ratio * (tickStep * intervalCount);
    const y = padding.top + ratio * chartHeight;
    const tickLabel = `${value.toFixed(precision)}${metric.unit || ""}`;
    return `
      <g>
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line"></line>
        <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${tickLabel}</text>
      </g>
    `;
  }).join("");

  const xTicks = Math.min(6, sampledSeries.length);
  const xAxis = Array.from({ length: xTicks }, (_, index) => {
    const ratio = xTicks === 1 ? 0 : index / (xTicks - 1);
    const point = sampledSeries[Math.min(sampledSeries.length - 1, Math.round(ratio * (sampledSeries.length - 1)))];
    const x = xScale(point.t);
    return `
      <g>
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" class="chart-grid-line chart-grid-line-vertical"></line>
        <text x="${x}" y="${height - padding.bottom + 24}" text-anchor="middle" class="chart-axis-label">${point.label}</text>
      </g>
    `;
  }).join("");

  const formatTooltipValue = (value) => `${value.toFixed(precision)}${metric.unit || ""}`;
  let chartBody = "";

  if (metric.chartType === "bar") {
    const barWidth = Math.max(10, Math.min(28, chartWidth / Math.max(1, series.length) * 0.6));
    chartBody = series.map((point) => {
      const x = xScale(point.t) - barWidth / 2;
      const y = yScale(point.value);
      const barHeight = padding.top + chartHeight - y;
      const tooltip = escapeHtml(`${formatTooltipValue(point.value)}\n${formatTimeWithSeconds(point.t)}`);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4" class="chart-bar ${metric.className}" data-tooltip="${tooltip}"></rect>`;
    }).join("");
  } else {
    const linePath = series.length > 1 ? `<path d="${buildLinePath(series, xScale, yScale)}" class="chart-line ${metric.className}"></path>` : "";
    const circles = series.map((point) => {
      const tooltip = escapeHtml(`${formatTooltipValue(point.value)}\n${formatTimeWithSeconds(point.t)}`);
      return `<circle cx="${xScale(point.t).toFixed(1)}" cy="${yScale(point.value).toFixed(1)}" r="5" class="chart-point ${metric.className}" data-tooltip="${tooltip}"></circle>`;
    }).join("");
    chartBody = `${linePath}${circles}`;
  }

  chartElement.innerHTML = `
    <rect x="${padding.left}" y="${padding.top}" width="${chartWidth}" height="${chartHeight}" class="chart-surface"></rect>
    ${yAxis}
    ${xAxis}
    ${chartBody}
  `;

  const sampleLabel = rangeConfig.sampleMs % (60 * 60 * 1000) === 0
    ? `${rangeConfig.sampleMs / (60 * 60 * 1000)}時間間隔`
    : `${rangeConfig.sampleMs / (60 * 1000)}分間隔`;
  const chartTypeLabel = metric.chartType === "bar" ? "棒グラフ" : "線グラフ";
  metaElement.textContent = `${metric.label} / ${rangeConfig.label} / ${series.length}点 / ${sampleLabel} / ${chartTypeLabel}`;
}

function updateActiveRangeButtons(container, selectedKey) {
  for (const button of container.querySelectorAll(".range-button")) {
    button.classList.toggle("active", button.dataset.rangeKey === selectedKey);
  }
}

function setRecentCustomControlsEnabled(enabled) {
  customControls.style.opacity = enabled ? "1" : "0.55";
  for (const element of customControls.querySelectorAll("input, select, button")) {
    element.disabled = !enabled;
  }
}

function applyRecentBoundsToInputs(records) {
  const bounds = getRecordsTimeBounds(records);
  if (!bounds) return;

  const minValue = formatDateTimeLocalValue(bounds.minTimeMs);
  const maxValue = formatDateTimeLocalValue(bounds.maxTimeMs);

  startDateTimeInput.min = minValue;
  startDateTimeInput.max = maxValue;
  endDateTimeInput.min = minValue;
  endDateTimeInput.max = maxValue;

  if (!startDateTimeInput.value || new Date(startDateTimeInput.value).getTime() < bounds.minTimeMs || new Date(startDateTimeInput.value).getTime() > bounds.maxTimeMs) {
    const defaultStart = Math.max(bounds.minTimeMs, bounds.maxTimeMs - (60 * 60 * 1000));
    startDateTimeInput.value = formatDateTimeLocalValue(defaultStart);
  }

  if (!endDateTimeInput.value || new Date(endDateTimeInput.value).getTime() < bounds.minTimeMs || new Date(endDateTimeInput.value).getTime() > bounds.maxTimeMs) {
    endDateTimeInput.value = maxValue;
  }

  if (new Date(startDateTimeInput.value).getTime() >= new Date(endDateTimeInput.value).getTime()) {
    startDateTimeInput.value = minValue;
    endDateTimeInput.value = maxValue;
  }
}

function setDailyCustomControlsEnabled(enabled) {
  dailyCustomControls.style.opacity = enabled ? "1" : "0.55";
  for (const element of dailyCustomControls.querySelectorAll("input, select, button")) {
    element.disabled = !enabled;
  }
}

function buildRecentCustomRangeConfig() {
  const bounds = getRecordsTimeBounds(allRecordsCache);
  if (!bounds) {
    throw new Error("直近24時間のデータがありません。");
  }

  const start = new Date(startDateTimeInput.value);
  const end = new Date(endDateTimeInput.value);
  const intervalValue = Math.max(1, Number(intervalValueInput.value || "30"));
  const unit = intervalUnitSelect.value === "hours" ? "hours" : "minutes";
  const sampleMs = unit === "hours" ? intervalValue * 60 * 60 * 1000 : intervalValue * 60 * 1000;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("開始時刻または終了時刻が不正です。");
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }
  if (start.getTime() < bounds.minTimeMs || end.getTime() > bounds.maxTimeMs) {
    throw new Error("直近24時間の実データ範囲だけ指定できます。");
  }

  return {
    mode: "window",
    label: `${formatTimestamp(start)} - ${formatTimestamp(end)}`,
    startTimeMs: start.getTime(),
    endTimeMs: end.getTime(),
    sampleMs,
  };
}

function getRecentRangeConfig() {
  return selectedRangeKey === "custom" ? buildRecentCustomRangeConfig() : RANGE_CONFIGS["24h"];
}

function renderRecentTrendChart() {
  try {
    renderTrendChart(allRecordsCache, getRecentRangeConfig(), selectedMetricKey, trendChart, chartMetaText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    chartMetaText.textContent = message;
    trendChart.innerHTML = `<text x="480" y="180" text-anchor="middle" class="chart-empty">${message}</text>`;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function buildDailyCustomRangeConfig() {
  const dateValue = dailyDateInput.value || defaultDailyDateValue();
  const startText = dailyStartTimeInput.value || "00:00";
  const endText = dailyEndTimeInput.value || "23:59";
  const intervalValue = Math.max(1, Number(dailyIntervalValueInput.value || "30"));
  const unit = dailyIntervalUnitSelect.value === "hours" ? "hours" : "minutes";
  const sampleMs = unit === "hours" ? intervalValue * 60 * 60 * 1000 : intervalValue * 60 * 1000;

  const start = new Date(`${dateValue}T${startText}:00${JST_OFFSET}`);
  const end = new Date(`${dateValue}T${endText}:00${JST_OFFSET}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("開始時刻または終了時刻が不正です。");
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }

  return {
    mode: "window",
    label: `${startText} - ${endText}`,
    startTimeMs: start.getTime(),
    endTimeMs: end.getTime(),
    sampleMs,
  };
}

function getDailyRangeConfig() {
  return selectedDailyRangeKey === "custom" ? buildDailyCustomRangeConfig() : RANGE_CONFIGS["24h"];
}

function renderDailyTrendChart() {
  try {
    renderTrendChart(dailyRecordsCache, getDailyRangeConfig(), selectedDailyMetricKey, dailyTrendChart, dailyChartMetaText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dailyChartMetaText.textContent = message;
    dailyTrendChart.innerHTML = `<text x="480" y="180" text-anchor="middle" class="chart-empty">${message}</text>`;
  }
}

async function loadDailyWeatherJson() {
  const dateValue = dailyDateInput.value || defaultDailyDateValue();
  dailyLoadButton.disabled = true;
  dailyChartMetaText.textContent = `${dateValue} を読込中...`;

  try {
    const dailyPath = `data/daily/${dateValue}.json`;
    const previousDate = previousDateValue(dateValue);
    const [dailyData, previousDailyData] = await Promise.all([
      fetchJson(dailyPath),
      previousDate ? fetchJson(`data/daily/${previousDate}.json`).catch(() => null) : Promise.resolve(null),
    ]);

    const normalized = normalizeRecord(dailyData);
    const previousNormalized = previousDailyData ? normalizeRecord(previousDailyData) : null;
    const seedRecord = buildSeedRecordFromPreviousDay(previousNormalized, dateValue);

    dailyRecordsCache = [seedRecord, normalized].filter(Boolean);
    dailyPayloadOutput.textContent = JSON.stringify(dailyData, null, 2);
    renderDailyTrendChart();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dailyRecordsCache = [];
    dailyChartMetaText.textContent = `${dateValue} の daily データを読めませんでした。`;
    dailyTrendChart.innerHTML = `<text x="480" y="180" text-anchor="middle" class="chart-empty">${message}</text>`;
    dailyPayloadOutput.textContent = message;
  } finally {
    dailyLoadButton.disabled = false;
  }
}

async function loadWeatherJson() {
  loadButton.disabled = true;
  const latestApiUrl = configuredLatestApiUrl();
  const allApiUrl = configuredAllApiUrl(latestApiUrl);
  const todayDate = todayDateValue();
  const previousDate = previousDateValue(todayDate);

  try {
    const [latestData, allData, previousDayData] = await Promise.all([
      fetchJson(latestApiUrl),
      fetchJson(allApiUrl),
      previousDate ? fetchJson(`data/daily/${previousDate}.json`).catch(() => null) : Promise.resolve(null),
    ]);
    const latest = normalizeLatestResponse(latestData);
    const allRecords = normalizeRecords(allData);
    allRecordsCache = allRecords.length > 0 ? allRecords : (latest.latest ? [latest.latest] : []);
    previousDayRecordCache = previousDayData ? normalizeRecord(previousDayData) : null;
    applyRecentBoundsToInputs(allRecordsCache);

    renderSummary(latest.summary);
    renderRecordSummary(allRecordsCache, previousDayRecordCache, todayDate, previousDate);
    if (!recordDateInput.value) {
      recordDateInput.value = previousDate || todayDate;
    }
    await loadSelectedRecordSummary();
    renderLatestLogs(latest.logs);
    renderHistory(allRecordsCache);
    renderRecentTrendChart();
    payloadOutput.textContent = JSON.stringify(latest.payload, null, 2);
    allPayloadOutput.textContent = JSON.stringify(unwrapJsonLike(allData), null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summaryOutput.innerHTML = `
      <section class="summary-group">
        <h3>エラー</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <strong>メッセージ</strong>
            <span>${message}</span>
          </div>
        </div>
      </section>
    `;
    latestLogsOutput.textContent = message;
    historyOutput.textContent = message;
    payloadOutput.textContent = message;
    allPayloadOutput.textContent = message;
    recordSummaryOutput.innerHTML = `
      <div class="record-summary-card">
        <strong>集計エラー</strong>
        <div class="record-summary-values">
          <span>${message}</span>
        </div>
      </div>
    `;
    selectedRecordSummaryOutput.innerHTML = `
      <div class="record-summary-card">
        <strong>表示エラー</strong>
        <div class="record-summary-values">
          <span>${message}</span>
        </div>
      </div>
    `;
    chartMetaText.textContent = message;
    trendChart.innerHTML = `<text x="480" y="180" text-anchor="middle" class="chart-empty">${message}</text>`;
  } finally {
    loadButton.disabled = false;
  }
}

rangeButtons.addEventListener("click", (event) => {
  const button = event.target.closest(".range-button");
  if (!button) return;
  selectedRangeKey = button.dataset.rangeKey;
  updateActiveRangeButtons(rangeButtons, selectedRangeKey);
  setRecentCustomControlsEnabled(selectedRangeKey === "custom");
  renderRecentTrendChart();
});

metricButtons.addEventListener("click", (event) => {
  const button = event.target.closest(".metric-button");
  if (!button) return;
  selectedMetricKey = button.dataset.metricKey;
  renderMetricButtons(metricButtons, selectedMetricKey);
  renderRecentTrendChart();
});

applyRangeButton.addEventListener("click", () => {
  selectedRangeKey = "custom";
  updateActiveRangeButtons(rangeButtons, selectedRangeKey);
  setRecentCustomControlsEnabled(true);
  renderRecentTrendChart();
});

dailyRangeButtons.addEventListener("click", (event) => {
  const button = event.target.closest(".range-button");
  if (!button) return;
  selectedDailyRangeKey = button.dataset.rangeKey;
  updateActiveRangeButtons(dailyRangeButtons, selectedDailyRangeKey);
  setDailyCustomControlsEnabled(selectedDailyRangeKey === "custom");
  renderDailyTrendChart();
});

dailyMetricButtons.addEventListener("click", (event) => {
  const button = event.target.closest(".metric-button");
  if (!button) return;
  selectedDailyMetricKey = button.dataset.metricKey;
  renderMetricButtons(dailyMetricButtons, selectedDailyMetricKey);
  renderDailyTrendChart();
});

dailyApplyRangeButton.addEventListener("click", () => {
  selectedDailyRangeKey = "custom";
  updateActiveRangeButtons(dailyRangeButtons, selectedDailyRangeKey);
  setDailyCustomControlsEnabled(true);
  renderDailyTrendChart();
});

loadButton.addEventListener("click", async () => {
  dailyDateInput.value = defaultDailyDateValue();
  await loadWeatherJson();
  await loadDailyWeatherJson();
});

dailyLoadButton.addEventListener("click", loadDailyWeatherJson);
recordDateLoadButton.addEventListener("click", loadSelectedRecordSummary);

dailyDateInput.value = defaultDailyDateValue();
recordDateInput.value = defaultDailyDateValue();
renderMetricButtons(metricButtons, selectedMetricKey);
renderMetricButtons(dailyMetricButtons, selectedDailyMetricKey);
updateActiveRangeButtons(rangeButtons, selectedRangeKey);
updateActiveRangeButtons(dailyRangeButtons, selectedDailyRangeKey);
setRecentCustomControlsEnabled(false);
setDailyCustomControlsEnabled(false);
bindChartTooltip(trendChart);
bindChartTooltip(dailyTrendChart);

loadWeatherJson();
loadDailyWeatherJson();
