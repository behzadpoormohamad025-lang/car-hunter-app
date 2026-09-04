// ⚠️ بعد از deploy کردن بک‌اند، این آدرس رو با آدرس واقعی سرورت جایگزین کن
// مثال: "https://car-hunter-backend.up.railway.app"
const API_BASE_URL = "https://car-hunter-backend-production.up.railway.app";

const statusBox = document.getElementById("statusBox");
const resultsBox = document.getElementById("results");
const checkStatusBox = document.getElementById("checkStatusBox");
const checkResultBox = document.getElementById("checkResult");
const budgetStatusBox = document.getElementById("budgetStatusBox");
const budgetResultsBox = document.getElementById("budgetResults");

function setStatus(message, type) {
  statusBox.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function setBudgetStatus(message, type) {
  budgetStatusBox.innerHTML = `<div class="status ${type}">${message}</div>`;
}

async function runBudgetSearch() {
  const budget = document.getElementById("budgetInput").value.trim();
  budgetResultsBox.innerHTML = "";
  if (!budget) {
    setBudgetStatus("اول بودجه‌تو بنویس (تومان)", "error");
    return;
  }
  setBudgetStatus("در حال بررسی بازار قم…", "loading");

  try {
    const res = await fetch(`${API_BASE_URL}/best-value-qom?budget=${encodeURIComponent(budget)}`);
    if (!res.ok) {
      setBudgetStatus("خطا: " + res.status, "error");
      return;
    }
    const data = await res.json();
    if (!data.results || !data.results.length) {
      setBudgetStatus("هنوز داده‌ی کافی برای این بودجه جمع نشده - چند روز دیگه دوباره امتحان کن", "loading");
      return;
    }
    setBudgetStatus(`${data.results.length} مدل پیدا شد ✓`, "ok");
    budgetResultsBox.innerHTML = data.results.map(r => `
      <div class="sell-row">
        <div>
          <div class="model-name">${r.model}</div>
          <div class="model-meta">از ${r.sample_count} آگهی، ${r.sold_count} تا فروخته شده${r.avg_price ? ` · میانگین ${Number(r.avg_price).toLocaleString("fa-IR")} تومان` : ""}</div>
        </div>
        <div class="sell-percent">${r.sell_through_percent}%</div>
      </div>
    `).join("");
  } catch (err) {
    setBudgetStatus("اتصال به سرور برقرار نشد", "error");
  }
}

function setCheckStatus(message, type) {
  checkStatusBox.innerHTML = `<div class="status ${type}">${message}</div>`;
}

async function runCheckListing() {
  const raw = document.getElementById("checkUrlInput").value.trim();
  checkResultBox.innerHTML = "";
  if (!raw) {
    setCheckStatus("اول لینک آگهی یا شماره تلفن رو بنویس", "error");
    return;
  }

  // اگه شبیه شماره موبایل بود (فقط عدد، ۱۰-۱۱ رقم)، مستقیم به‌عنوان شماره بفرست
  const digitsOnly = raw.replace(/\D/g, "");
  const isPhone = digitsOnly.length >= 10 && digitsOnly.length <= 11 && !raw.startsWith("http");

  setCheckStatus("در حال بررسی…", "loading");

  try {
    let res, d;
    if (isPhone) {
      res = await fetch(`${API_BASE_URL}/report-seller`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digitsOnly }),
      });
      if (!res.ok) {
        setCheckStatus("خطا: " + res.status, "error");
        return;
      }
      d = await res.json();
      setCheckStatus("ثبت شد ✓", "ok");
      const badge = d.is_dealer
        ? `<span class="badge dealer">دلال احتمالی</span>`
        : `<span class="badge personal">فروشنده شخصی</span>`;
      checkResultBox.innerHTML = `<div class="card">
        <div class="meta">شماره: ${d.phone}</div>
        <div>${badge}</div>
        <div class="meta" style="margin-top:8px;">
          این هفته: <b>${d.ads_this_week}</b> آگهی &nbsp;·&nbsp;
          این ماه: <b>${d.ads_this_month}</b> آگهی
        </div>
      </div>`;
      return;
    }

    res = await fetch(`${API_BASE_URL}/check-listing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: raw }),
    });

    if (res.status === 401) {
      setCheckStatus("نشست دیوار منقضی شده", "error");
      return;
    }
    if (!res.ok) {
      setCheckStatus("خطا: " + res.status, "error");
      return;
    }

    d = await res.json();
    setCheckStatus("بررسی شد ✓", "ok");

    const badge = d.is_dealer
      ? `<span class="badge dealer">دلال احتمالی</span>`
      : `<span class="badge personal">فروشنده شخصی</span>`;

    checkResultBox.innerHTML = `<div class="card">
      <div class="meta">${d.seller_display_name || d.seller_username || "بدون نام مشخص - اگه شماره‌شو داری، مستقیم همون شماره رو اینجا بنویس"}</div>
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
      setStatus("نشست دیوار منقضی شده — باید یک‌بار روی سرور دوباره لاگین بشه (به README مراجعه کن)", "error");
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

// ثبت Service Worker برای قابلیت نصب روی گوشی
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  }
