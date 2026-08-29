const API_BASE_URL = "https://car-hunter-backend-production.up.railway.app";

const statusBox = document.getElementById("statusBox");
const resultsBox = document.getElementById("results");
const checkStatusBox = document.getElementById("checkStatusBox");
const checkResultBox = document.getElementById("checkResult");

function setStatus(message, type) {
  statusBox.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function setCheckStatus(message, type) {
  checkStatusBox.innerHTML = `<div class="status ${type}">${message}</div>`;
}

async function runCheckListing() {
  const url = document.getElementById("checkUrlInput").value.trim();
  checkResultBox.innerHTML = "";
  if (!url) {
    setCheckStatus("اول لینک آگهی رو بچسبون", "error");
    return;
  }
  setCheckStatus("در حال بررسی…", "loading");

  try {
    const res = await fetch(`${API_BASE_URL}/check-listing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (res.status === 401) {
      setCheckStatus("نشست دیوار منقضی شده", "error");
      return;
    }
    if (!res.ok) {
      setCheckStatus("خطا: " + res.status, "error");
      return;
    }

    const d = await res.json();
    setCheckStatus("بررسی شد ✓", "ok");

    const badge = d.is_dealer
      ? `<span class="badge dealer">دلال احتمالی</span>`
      : `<span class="badge personal">فروشنده شخصی</span>`;

    checkResultBox.innerHTML = `<div class="card">
      <div class="meta">${d.seller_display_name || d.seller_username || "بدون نام مشخص"}</div>
      <div>${badge}</div>
      <div class="meta" style="margin-top:8px;">
        این هفته: <b>${d.ads_this_week}</b> آگهی &nbsp;·&nbsp;
        این ماه: <b>${d.ads_this_month}</b> آگهی
      </div>
    </div>`;
  } catch (err) {
    setCheckStatus("اتصال به سرور برقرار نشد", "error");
  }
}

async function runSearch() {
  const query = document.getElementById("queryInput").value.trim();
  resultsBox.innerHTML = "";
  setStatus("در حال جستجو در دیوار… ممکنه چند ثانیه طول بکشه", "loading");

  try {
    const res = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, fetch_details: true, max_items: 15 }),
    });

    if (res.status === 401) {
      setStatus("نشست دیوار منقضی شده", "error");
      return;
    }
    if (!res.ok) {
      setStatus(`خطا: ${res.status}`, "error");
      return;
    }

    const data = await res.json();
    setStatus(`${data.count} آگهی پیدا شد ✓`, "ok");
    renderResults(data.best_deals || data.items || []);
  } catch (err) {
    setStatus("اتصال به سرور برقرار نشد. آدرس API_BASE_URL رو بررسی کن.", "error");
  }
}

function renderResults(items) {
  if (!items.length) {
    resultsBox.innerHTML = `<div class="empty">آگهی‌ای پیدا نشد</div>`;
    return;
  }

  resultsBox.innerHTML = items.map(renderCard).join("");
}

function renderCard(item) {
  const dealerBadge = item.is_dealer === true
    ? `<span class="badge dealer">دلال احتمالی</span>`
    : item.is_dealer === false
      ? `<span class="badge personal">فروشنده شخصی</span>`
      : "";

  const flags = (item.flags || [])
    .map(f => `<span class="badge flag">${f}</span>`)
    .join("");

  const priceText = item.price
    ? `${Number(item.price).toLocaleString("fa-IR")} تومان`
    : (item.price_text || "قیمت نامشخص");

  const verdictMap = {
    "خوب": { emoji: "🟢", cls: "personal" },
    "منصفانه": { emoji: "🟡", cls: "flag" },
    "گران": { emoji: "🔴", cls: "dealer" },
    "نامشخص": { emoji: "⚪", cls: "flag" },
  };
  let aiVerdictHtml = "";
  if (item.ai_verdict) {
    const v = verdictMap[item.ai_verdict.verdict] || verdictMap["نامشخص"];
    aiVerdictHtml = `
      <div class="ai-verdict">
        ${v.emoji} <b>${item.ai_verdict.verdict}</b>
        <span style="color:#888; font-size:12px;">(اطمینان: ${item.ai_verdict.confidence})</span>
        <div style="font-size:12px; color:#555; margin-top:2px;">${item.ai_verdict.reason || ""}</div>
      </div>`;
  }

  return `
    <div class="card">
      <div class="title">${item.title || ""}</div>
      <div class="price">${priceText}</div>
      <div class="meta">
        ${item.year ? `سال ${item.year}` : ""} 
        ${item.mileage ? `· ${Number(item.mileage).toLocaleString("fa-IR")} کیلومتر` : ""}
        ${item.price_score != null ? `· امتیاز آماری: ${item.price_score}` : ""}
      </div>
      ${aiVerdictHtml}
      <div>${dealerBadge}${flags}</div>
      ${item.seller_username ? `<div class="meta">فروشنده: ${item.seller_display_name || item.seller_username}</div>` : ""}
      <a href="${item.url}" target="_blank">مشاهده در دیوار ←</a>
    </div>
  `;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
    }
