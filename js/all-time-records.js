const reloadButton = document.getElementById("reloadButton");
const metaOutput = document.getElementById("metaOutput");
const rankingOutput = document.getElementById("rankingOutput");

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ja-JP");
}

function formatTimeRange(entry) {
  if (!entry) return "-";
  if (entry.startLocal && entry.endLocal) {
    const start = new Date(entry.startLocal);
    const end = new Date(entry.endLocal);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
    return `${start.toLocaleString("ja-JP")} - ${end.toLocaleString("ja-JP")}`;
  }
  return formatDateTime(entry.observedAt);
}

function formatValue(value, unit) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(1)}${unit || ""}`;
}

function buildRankingRows(rankings, topCount, unit) {
  const rows = [];
  for (let index = 0; index < topCount; index += 1) {
    const entry = rankings[index] || null;
    rows.push(`
      <li class="record-ranking-item">
        <div class="record-ranking-rank">${index + 1}位</div>
        <div class="record-ranking-body">
          <div class="record-ranking-value">${formatValue(entry?.value, unit)}</div>
          <div class="record-ranking-meta">日付: ${entry?.sourceDate || "-"}</div>
          <div class="record-ranking-meta">時刻: ${formatTimeRange(entry)}</div>
        </div>
      </li>
    `);
  }
  return rows.join("");
}

function renderMeta(data) {
  metaOutput.innerHTML = `
    <div class="meta-card">
      <strong>生成日時</strong>
      <span>${formatDateTime(data.generatedAt)}</span>
    </div>
    <div class="meta-card">
      <strong>集計日数</strong>
      <span>${data.sourceFileCount ?? "-"}</span>
    </div>
    <div class="meta-card">
      <strong>表示件数</strong>
      <span>${data.topCount ?? 5}</span>
    </div>
  `;
}

function renderRankings(data) {
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const topCount = Number.isFinite(Number(data.topCount)) ? Number(data.topCount) : 5;

  rankingOutput.innerHTML = metrics.map((metric) => `
    <div class="record-summary-card">
      <strong>${metric.label}</strong>
      <ol class="record-ranking-list">
        ${buildRankingRows(Array.isArray(metric.rankings) ? metric.rankings : [], topCount, metric.unit)}
      </ol>
    </div>
  `).join("");
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function loadAllTimeRecords() {
  reloadButton.disabled = true;
  try {
    const data = await fetchJson("data/all_time_records.json");
    renderMeta(data);
    renderRankings(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    metaOutput.innerHTML = `
      <div class="meta-card">
        <strong>エラー</strong>
        <span>${message}</span>
      </div>
    `;
    rankingOutput.innerHTML = `
      <div class="record-summary-card">
        <strong>読み込み失敗</strong>
        <div class="record-summary-values">
          <span>${message}</span>
        </div>
      </div>
    `;
  } finally {
    reloadButton.disabled = false;
  }
}

reloadButton.addEventListener("click", loadAllTimeRecords);
loadAllTimeRecords();
