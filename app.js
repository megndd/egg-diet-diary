"use strict";

const STORAGE_KEY = "eggDietDiaryPWA.v1";

const mealTypes = [
  ["breakfast", "早餐"],
  ["lunch", "午餐"],
  ["dinner", "晚餐"],
  ["snack", "加餐"]
];

const exerciseTypes = ["无", "健身", "跳舞", "跑步", "瑜伽", "其他"];
const intensityLevels = ["低", "中", "高"];
const bloatingTimes = ["饭后立即", "饭后 1 小时", "饭后 2-4 小时", "晚上", "不确定"];
const bowelMovements = ["正常", "偏稀", "偏干", "未排便", "不记录"];
const goalTypes = ["维持体重", "轻微减脂", "增肌塑形", "改善肠胃舒适度"];

const defaultProfile = {
  gender: "女",
  heightCm: 158,
  currentWeightKg: 50.8,
  targetWeightLowerKg: "",
  targetWeightUpperKg: "",
  goalType: "增肌塑形",
  goalDescription: "管理体重，同时兼顾健身和跳舞表现",
  oftenSweats: true,
  sensitiveStomach: true,
  doesFitness: true,
  doesDance: true,
  focus: "记录并观察可能导致胀气的食物"
};

const riskRules = [
  { category: "豆类及豆制品", reason: "豆类低聚糖和较高纤维可能让敏感肠胃更容易产气。", keywords: ["黄豆", "黑豆", "红豆", "绿豆", "豆浆", "豆腐", "豆皮", "豆干", "豆芽", "毛豆"] },
  { category: "乳制品", reason: "乳糖或乳制品中的部分成分可能与胀气同时出现。", keywords: ["牛奶", "酸奶", "奶酪", "芝士", "奶茶", "乳清蛋白", "拿铁", "奶昔"] },
  { category: "洋葱蒜类", reason: "洋葱蒜类含有较多可发酵碳水，敏感时可继续观察。", keywords: ["洋葱", "大蒜", "蒜", "韭菜", "葱"] },
  { category: "十字花科蔬菜", reason: "十字花科蔬菜纤维较多，生食或份量较大时更值得观察。", keywords: ["西兰花", "花椰菜", "卷心菜", "甘蓝", "白菜", "包菜", "娃娃菜"] },
  { category: "小麦制品", reason: "部分小麦制品可能和腹胀、饱胀感同时出现。", keywords: ["面包", "面条", "馒头", "饼干", "蛋糕", "披萨", "包子", "饺子", "意面"] },
  { category: "高 FODMAP 水果", reason: "部分水果果糖或多元醇较高，建议结合份量和出现时间观察。", keywords: ["苹果", "梨", "西瓜", "芒果", "桃子", "李子"] },
  { category: "碳酸饮料", reason: "气泡会增加胃肠道气体感受。", keywords: ["可乐", "苏打水", "气泡水", "雪碧", "碳酸"] },
  { category: "代糖食品", reason: "部分糖醇类甜味剂可能引起腹胀或肠鸣。", keywords: ["无糖饮料", "无糖口香糖", "赤藓糖醇", "木糖醇", "山梨糖醇", "代糖"] },
  { category: "高油高辣生冷", reason: "油辣或生冷刺激可能让敏感肠胃更不舒服。", keywords: ["火锅", "炸鸡", "烧烤", "冰饮", "冰淇淋", "凉拌菜", "麻辣", "辛辣", "冷饮"] }
];

let state = loadState();
let activeTab = "dashboard";

const view = document.getElementById("view");
const foodTemplate = document.getElementById("meal-template");

init();

function init() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      render();
    });
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  render();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.profile && Array.isArray(saved.logs)) return saved;
  } catch (_) {}
  return { profile: { ...defaultProfile }, logs: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(key) {
  const d = new Date(`${key}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(d);
}

function getTodayLog() {
  return state.logs.find(log => log.date === todayKey()) || null;
}

function blankLog(date = todayKey()) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date,
    morningWeightKg: "",
    meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
    waterMl: 1200,
    coffee: false,
    tea: false,
    alcohol: false,
    carbonatedDrink: false,
    exerciseType: "无",
    exerciseMinutes: 0,
    exerciseIntensity: "中",
    sweatLevel: "低",
    bloatingScore: 0,
    bloatingTime: "不确定",
    stomachPain: false,
    acidReflux: false,
    bowelMovement: "不记录",
    notes: ""
  };
}

function saveLog(log) {
  const tagged = retagLog(log);
  const index = state.logs.findIndex(item => item.date === tagged.date);
  if (index >= 0) state.logs[index] = tagged;
  else state.logs.push(tagged);
  state.logs.sort((a, b) => b.date.localeCompare(a.date));
  saveState();
}

function allFoodItems(log) {
  if (!log) return [];
  return mealTypes.flatMap(([key, label]) => (log.meals[key] || []).map(item => ({ ...item, mealKey: key, mealLabel: label })));
}

function detectRiskTags(foodName = "", cookingMethod = "") {
  const text = `${foodName} ${cookingMethod}`.toLowerCase();
  if (!text.trim()) return [];
  return riskRules.flatMap(rule => {
    const keyword = rule.keywords.find(word => text.includes(word.toLowerCase()));
    return keyword ? [{ tagName: keyword, category: rule.category, reason: rule.reason }] : [];
  });
}

function retagLog(log) {
  const updated = structuredCloneSafe(log);
  for (const [key] of mealTypes) {
    updated.meals[key] = (updated.meals[key] || []).map(item => ({
      ...item,
      riskTags: detectRiskTags(item.name, item.cookingMethod)
    }));
  }
  return updated;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function riskExposures(log) {
  if (!log) return [];
  const exposures = [];
  allFoodItems(log).forEach(item => {
    (item.riskTags || []).forEach(tag => {
      exposures.push({ foodName: item.name, mealLabel: item.mealLabel, tag });
    });
  });
  if (log.carbonatedDrink) {
    exposures.push({
      foodName: "今日有碳酸饮料",
      mealLabel: "饮水",
      tag: { tagName: "碳酸饮料", category: "碳酸饮料", reason: "气泡会增加胃肠道气体感受。" }
    });
  }
  return exposures;
}

function bmi(profile) {
  const height = Number(profile.heightCm) / 100;
  const weight = Number(profile.currentWeightKg);
  if (!height || !weight) return 0;
  return weight / (height * height);
}

function latestWeightKg() {
  const latestLog = [...state.logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find(log => log.morningWeightKg !== "" && Number.isFinite(Number(log.morningWeightKg)));
  return latestLog ? Number(latestLog.morningWeightKg) : Number(state.profile.currentWeightKg);
}

function currentBmiInfo() {
  const height = Number(state.profile.heightCm) / 100;
  const weight = latestWeightKg();
  const value = height && weight ? weight / (height * height) : 0;
  const category = value < 18.5 ? "偏瘦" : value < 24 ? "正常" : "超重";
  const percent = Math.min(100, Math.max(0, ((value - 15) / 17) * 100));
  return { value, category, percent, weight };
}

function render() {
  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle("is-active", button.dataset.tab === activeTab);
  });

  const renderers = {
    dashboard: renderDashboard,
    today: renderToday,
    bloating: renderBloating,
    trends: renderTrends,
    profile: renderProfile
  };

  view.innerHTML = renderers[activeTab]();
  bindCurrentView();
}

function bindCurrentView() {
  if (activeTab === "today") bindTodayForm();
  if (activeTab === "profile") bindProfileForm();
  if (activeTab === "trends") drawTrendCharts();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberText(value, suffix = "") {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? `${number.toFixed(1)}${suffix}` : "未填写";
}

function pill(text, tone = "") {
  return `<span class="pill ${tone}">${escapeHtml(text)}</span>`;
}

function renderDashboard() {
  const log = getTodayLog();
  const advice = buildAdvice(log);
  const dietStatus = log && allFoodItems(log).some(item => item.name.trim()) ? "已记录" : "未记录";
  const exerciseStatus = !log || log.exerciseType === "无"
    ? "未运动"
    : `${log.exerciseType}${Number(log.exerciseMinutes) ? ` ${log.exerciseMinutes} 分钟` : ""}`;
  const water = log ? Number(log.waterMl) || 0 : 0;
  const waterMessage = water <= 0
    ? "今天还没有记录饮水，可以先补一杯温水。"
    : water < 1200
      ? `已记录 ${water} ml。今天可以继续小口补水，运动或出汗后更要留意。`
      : `已记录 ${water} ml。保持稳定饮水就很好，出汗多时可考虑一点电解质。`;

  return `
    <section class="screen">
      <header class="screen-header">
        <p class="eyebrow">${formatDate(todayKey())}</p>
        <h1>蛋蛋的轻盈饮食日记</h1>
        <p class="subtle">轻盈不是更少，而是更舒服、更有力。</p>
      </header>

      <div class="band">
        <div class="grid-2">
          <div class="metric"><small>饮食记录</small><strong>${dietStatus}</strong></div>
          <div class="metric"><small>今日体重</small><strong>${log ? numberText(log.morningWeightKg, " kg") : "未填写"}</strong></div>
          <div class="metric"><small>运动状态</small><strong>${exerciseStatus}</strong></div>
          <div class="metric"><small>胀气程度</small><strong>${log ? log.bloatingScore : 0} / 10</strong></div>
        </div>
      </div>

      <article class="card">
        <div class="section-title">
          <h2>饮水提醒</h2>
          <p class="subtle">${waterMessage}</p>
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h2>今日建议</h2>
          <p class="subtle">根据当天记录自动生成，只在本机完成。</p>
        </div>
        <div class="advice-list">
          ${advice.map(item => `
            <div class="advice"><span class="mark">✓</span><p>${escapeHtml(item)}</p></div>
          `).join("")}
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h2>健康边界</h2>
          <p class="subtle">本应用只做记录和生活方式观察，不提供医疗诊断。若有持续严重腹痛、长期腹泻或便秘、便血、呕吐、发热、明显异常体重下降，或胀气持续影响生活，请及时就医。</p>
        </div>
      </article>
    </section>
  `;
}

function buildAdvice(log) {
  if (!log) {
    const info = currentBmiInfo();
    return [
      "今天还没有记录，可以先从一餐和饮水开始，不需要一次填得很完美。",
      `当前BMI约${info.value.toFixed(1)}，处于${info.category}。`
    ];
  }

  const foodText = allFoodItems(log).map(item => item.name).join(" ");
  const exposures = riskExposures(log);
  const messages = [];

  if (log.exerciseType === "跳舞") messages.push("今天有跳舞安排，建议运动前补一点易消化碳水。");
  if (log.exerciseType !== "无" && Number(log.exerciseMinutes) > 45) {
    messages.push("今天有运动，建议保证一餐主食，不要把碳水压得太低，否则可能影响体力和恢复。");
  }
  if (log.sweatLevel === "高" || (state.profile.oftenSweats && log.exerciseType !== "无")) {
    messages.push("今天出汗较多，除了喝水，也可以适当补充一点盐分或电解质。");
  }
  if (lacksProtein(foodText)) {
    messages.push("今天蛋白质来源偏少，建议每餐尽量有一个优质蛋白，比如鸡蛋、鱼、鸡肉、牛肉、豆腐或酸奶。");
  }
  if (Number(log.bloatingScore) >= 5 && exposures.length) {
    messages.push("今天有胀气反应，建议观察这些食物是否与你的肠胃反应有关，不需要马上全部停掉，可以先减少单次份量。");
  } else if (Number(log.bloatingScore) >= 5) {
    messages.push("今天出现胀气，可以同时留意吃饭速度、压力、睡眠和经期，不一定只和某一种食物有关。");
  }
  if (isLightPostWorkoutDinner(log)) {
    messages.push("如果运动后晚餐太轻，可能影响恢复，也容易第二天饿。可以补充一点蛋白质和易消化主食。");
  }
  if (Number(log.bloatingScore) >= 4 && hasColdOrSpicyFood(foodText)) {
    messages.push("今天有生冷或刺激性食物，肠胃敏感时可以优先观察这类食物。");
  }
  if ((log.stomachPain && Number(log.bloatingScore) >= 8) || /便血|呕吐|发热|异常体重下降/.test(log.notes || "")) {
    messages.push("如果持续严重腹痛、长期腹泻或便秘、便血、呕吐、发热、明显异常体重下降，或胀气严重影响生活且持续不缓解，请及时就医。");
  }

  return (messages.length ? messages : ["今天记录看起来比较平稳，可以继续保持规律进食、适量主食和温和观察。"]).slice(0, 5);
}

function lacksProtein(text) {
  return !["鸡蛋", "蛋", "鱼", "虾", "鸡肉", "鸡胸", "牛肉", "猪肉", "豆腐", "豆浆", "酸奶", "牛奶", "乳清", "蛋白", "肉", "鸡"].some(word => text.includes(word));
}

function hasColdOrSpicyFood(text) {
  return ["冰饮", "冰淇淋", "凉拌", "火锅", "麻辣", "辛辣", "烧烤"].some(word => text.includes(word));
}

function isLightPostWorkoutDinner(log) {
  if (log.exerciseType === "无" || Number(log.exerciseMinutes) < 30) return false;
  const dinner = (log.meals.dinner || []).map(item => item.name).join(" ");
  if (!dinner) return false;
  const light = ["水果", "苹果", "梨", "西瓜", "酸奶", "沙拉", "蔬菜", "黄瓜", "番茄"].some(word => dinner.includes(word));
  const filling = ["米饭", "面", "馒头", "红薯", "土豆", "鸡蛋", "鱼", "肉", "鸡", "牛肉", "豆腐"].some(word => dinner.includes(word));
  return light && !filling;
}

function renderToday() {
  const log = structuredCloneSafe(getTodayLog() || blankLog());
  window.currentDraft = log;

  return `
    <section class="screen">
      <header class="screen-header">
        <p class="eyebrow">${formatDate(todayKey())}</p>
        <h1>今日记录</h1>
        <p class="subtle">快速记录饮食、运动、出汗和肠胃感受。保存后会自动标记疑似胀气风险食物。</p>
      </header>

      <form id="today-form" class="form-grid">
        <article class="card">
          <div class="section-title">
            <h2>早晨空腹体重</h2>
            <p class="subtle">只观察趋势，不用纠结单日波动。</p>
          </div>
          <label>体重 kg<input inputmode="decimal" name="morningWeightKg" value="${escapeHtml(log.morningWeightKg)}" placeholder="例如 50.8"></label>
        </article>

        ${mealTypes.map(([key, label]) => renderMealEditor(key, label, log.meals[key] || [])).join("")}

        <article class="card">
          <div class="section-title"><h2>饮水情况</h2></div>
          <div class="inline">
            <label>今日饮水量 ml<input inputmode="numeric" name="waterMl" value="${escapeHtml(log.waterMl)}"></label>
            <label>饮水备注<select name="waterPreset">
              <option value="">自由记录</option>
              <option value="1200">约 1200 ml</option>
              <option value="1600">约 1600 ml</option>
              <option value="2000">约 2000 ml</option>
            </select></label>
          </div>
          ${checkbox("coffee", "喝咖啡", log.coffee)}
          ${checkbox("tea", "喝茶", log.tea)}
          ${checkbox("alcohol", "喝酒", log.alcohol)}
          ${checkbox("carbonatedDrink", "喝碳酸饮料", log.carbonatedDrink)}
        </article>

        <article class="card">
          <div class="section-title"><h2>运动情况</h2></div>
          <label>运动类型${select("exerciseType", exerciseTypes, log.exerciseType)}</label>
          <label>运动时长 分钟<input inputmode="numeric" name="exerciseMinutes" value="${escapeHtml(log.exerciseMinutes)}"></label>
          <label>运动强度${select("exerciseIntensity", intensityLevels, log.exerciseIntensity)}</label>
          <label>出汗程度${select("sweatLevel", intensityLevels, log.sweatLevel)}</label>
        </article>

        <article class="card">
          <div class="section-title"><h2>肠胃反应</h2></div>
          <label>胀气程度：<span id="bloating-value">${log.bloatingScore}</span> / 10
            <input type="range" name="bloatingScore" min="0" max="10" step="1" value="${escapeHtml(log.bloatingScore)}">
          </label>
          <label>胀气出现时间${select("bloatingTime", bloatingTimes, log.bloatingTime)}</label>
          ${checkbox("stomachPain", "是否腹痛", log.stomachPain)}
          ${checkbox("acidReflux", "是否反酸", log.acidReflux)}
          <label>排便情况${select("bowelMovement", bowelMovements, log.bowelMovement)}</label>
          <label>今日备注<textarea name="notes" rows="4" placeholder="例如 饭后两小时开始胀，今天睡眠一般">${escapeHtml(log.notes)}</textarea></label>
        </article>

        <button class="btn" type="submit">保存今日记录</button>
      </form>
    </section>
  `;
}

function checkbox(name, label, checked) {
  return `<label class="check-row"><span>${label}</span><input type="checkbox" name="${name}" ${checked ? "checked" : ""}></label>`;
}

function select(name, options, value) {
  return `<select name="${name}">${options.map(item => `<option value="${escapeHtml(item)}" ${item === value ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>`;
}

function renderMealEditor(key, label, items) {
  return `
    <article class="card meal-card" data-meal="${key}">
      <div class="meal-head">
        <div class="section-title"><h2>${label}</h2></div>
        <button class="icon-btn add-food" type="button" aria-label="添加${label}食物">+</button>
      </div>
      <div class="food-list">
        ${items.length ? items.map(item => renderFoodRow(item)).join("") : `<div class="empty">还没有记录，可以添加一个食物。</div>`}
      </div>
    </article>
  `;
}

function renderFoodRow(item = {}) {
  const tags = detectRiskTags(item.name || "", item.cookingMethod || "");
  return `
    <div class="food-row">
      <div class="row-head">
        <strong>食物</strong>
        <button class="icon-btn danger remove-food" type="button" aria-label="删除食物">×</button>
      </div>
      <label>食物名称<input name="name" value="${escapeHtml(item.name || "")}" placeholder="例如 鸡蛋米饭西兰花"></label>
      <label>大致份量<input name="amount" value="${escapeHtml(item.amount || "")}" placeholder="例如 一碗 / 半份 / 一杯"></label>
      <label>烹饪方式<input name="cookingMethod" value="${escapeHtml(item.cookingMethod || "")}" placeholder="例如 清蒸 / 辛辣 / 冷食"></label>
      <label>备注<textarea name="notes" rows="2" placeholder="可选">${escapeHtml(item.notes || "")}</textarea></label>
      <div class="risk-preview">${renderRiskPreview(tags)}</div>
    </div>
  `;
}

function renderRiskPreview(tags) {
  if (!tags.length) return "";
  return `
    <div class="pill-list">${tags.map(tag => pill(`${tag.category}：疑似风险`, "lavender")).join("")}</div>
    <p class="subtle">建议继续观察，不代表一定导致胀气。</p>
  `;
}

function renderBloating() {
  const log = getTodayLog();
  const exposures = riskExposures(log);
  const suggestions = triggerSuggestions();

  return `
    <section class="screen">
      <header class="screen-header">
        <p class="eyebrow">疑似风险食物只作为观察线索</p>
        <h1>胀气观察</h1>
        <p class="subtle">这里不会直接判断某个食物一定导致胀气，会用多天记录帮助你找到值得继续观察的方向。</p>
      </header>

      <article class="card">
        <div class="section-title">
          <h2>今日疑似胀气食物</h2>
          <p class="subtle">今日胀气程度：${log ? log.bloatingScore : 0} / 10</p>
        </div>
        <div class="row-list">
          ${exposures.length ? exposures.map(exposure => `
            <div class="advice">
              <span class="mark">?</span>
              <div>
                <h3>${escapeHtml(exposure.foodName)}</h3>
                <div class="pill-list">
                  ${pill(exposure.mealLabel, "mint")}
                  ${pill(exposure.tag.category, "lavender")}
                </div>
                <p class="subtle">${escapeHtml(exposure.tag.reason)}</p>
                <p class="subtle">疑似胀气风险食物，建议继续观察。如果多次同时出现，可以加入个人观察清单。</p>
              </div>
            </div>
          `).join("") : `<div class="empty">今天还没有识别到疑似胀气风险食物。</div>`}
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h2>个人疑似触发清单</h2>
          <p class="subtle">同类食物在胀气日出现 3 次以上会显示。</p>
        </div>
        <div class="row-list">
          ${suggestions.length ? suggestions.map(item => `
            <div class="advice">
              <span class="mark">✓</span>
              <div>
                <h3>${escapeHtml(item.category)}</h3>
                <p class="subtle">${escapeHtml(item.message)}</p>
                ${pill(`胀气日共同出现 ${item.count} 次`, "coral")}
              </div>
            </div>
          `).join("") : `<div class="empty">目前记录还不够多。建议至少观察同一种或同一类食物 3 次以上，再判断它是否和胀气有关。</div>`}
        </div>
      </article>

      <article class="card">
        <div class="section-title"><h2>观察建议</h2></div>
        <div class="row-list">
          ${["不要一次性删掉所有高纤维食物，可以先减少份量。", "同一种食物建议观察 3 次以上再判断。", "胀气不只和食物有关，也可能和压力、吃饭速度、经期、睡眠有关。", "如果胀气严重影响生活且持续不缓解，请及时就医。"].map(text => `
            <div class="advice"><span class="mark">✓</span><p>${text}</p></div>
          `).join("")}
        </div>
      </article>
    </section>
  `;
}

function categoryFrequencies({ onlyBloatingDays = false } = {}) {
  const counts = {};
  state.logs
    .filter(log => !onlyBloatingDays || Number(log.bloatingScore) >= 5)
    .forEach(log => {
      const categories = new Set(riskExposures(log).map(exposure => exposure.tag.category));
      categories.forEach(category => counts[category] = (counts[category] || 0) + 1);
    });
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function triggerSuggestions() {
  return categoryFrequencies({ onlyBloatingDays: true })
    .filter(item => item.count >= 3)
    .map(item => ({ ...item, message: triggerMessage(item.category) }));
}

function triggerMessage(category) {
  if (category === "乳制品") return "乳制品可能与你的胀气有关，建议连续观察 1-2 周。";
  if (category === "十字花科蔬菜") return "西兰花、卷心菜等十字花科蔬菜可能与你的胀气有关，建议减少单次份量，并优先熟食。";
  if (category === "豆类及豆制品") return "豆类及豆制品可能与你的胀气有关，可以先减少单次份量，再观察耐受度。";
  return `${category}多次和胀气同时出现，建议继续观察，不需要马上完全停掉。`;
}

function renderTrends() {
  const stats = weeklyExerciseStats();
  const frequencies = categoryFrequencies();

  return `
    <section class="screen">
      <header class="screen-header">
        <p class="eyebrow">看趋势，不放大单日波动</p>
        <h1>趋势统计</h1>
        <p class="subtle">体重受水分、盐分、经期、运动后炎症反应影响，短期波动正常。</p>
      </header>

      <article class="card">
        <div class="section-title">
          <h2>体重趋势</h2>
          <p class="subtle">横轴为日期，纵轴为 kg。</p>
        </div>
        ${hasWeightData() ? `<div class="canvas-wrap"><canvas id="weight-chart" width="640" height="280"></canvas></div>` : `<div class="empty">保存几天体重后，这里会显示趋势。</div>`}
      </article>

      <article class="card">
        <div class="section-title"><h2>胀气程度趋势</h2></div>
        ${state.logs.length ? `<div class="canvas-wrap"><canvas id="bloating-chart" width="640" height="280"></canvas></div>` : `<div class="empty">保存记录后，这里会显示胀气趋势。</div>`}
      </article>

      <article class="card">
        <div class="section-title"><h2>本周运动</h2></div>
        <div class="grid-2">
          <div class="metric"><small>健身次数</small><strong>${stats.fitness} 次</strong></div>
          <div class="metric"><small>跳舞次数</small><strong>${stats.dance} 次</strong></div>
          <div class="metric"><small>运动分钟</small><strong>${stats.minutes} 分钟</strong></div>
          <div class="metric"><small>高出汗天数</small><strong>${stats.highSweatDays} 天</strong></div>
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h2>疑似胀气食物出现频率</h2>
          <p class="subtle">按类别统计，帮助你找到值得继续观察的方向。</p>
        </div>
        ${frequencies.length ? renderFrequencyBars(frequencies) : `<div class="empty">有疑似风险食物后，这里会显示分类频率。</div>`}
      </article>
    </section>
  `;
}

function hasWeightData() {
  return state.logs.some(log => log.morningWeightKg !== "" && Number.isFinite(Number(log.morningWeightKg)));
}

function weeklyExerciseStats() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  const weekLogs = state.logs.filter(log => new Date(`${log.date}T00:00:00`) >= monday);
  return {
    fitness: weekLogs.filter(log => log.exerciseType === "健身").length,
    dance: weekLogs.filter(log => log.exerciseType === "跳舞").length,
    minutes: weekLogs.reduce((sum, log) => sum + Number(log.exerciseMinutes || 0), 0),
    highSweatDays: weekLogs.filter(log => log.sweatLevel === "高").length
  };
}

function renderFrequencyBars(items) {
  const max = Math.max(...items.map(item => item.count), 1);
  return `<div class="row-list">${items.map(item => `
    <div class="bar-row">
      <span class="subtle">${escapeHtml(item.category)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.max(8, item.count / max * 100)}%"></span></span>
      <strong>${item.count}</strong>
    </div>
  `).join("")}</div>`;
}

function renderProfile() {
  const p = state.profile;
  const bmiInfo = currentBmiInfo();
  return `
    <section class="screen">
      <header class="screen-header">
        <p class="eyebrow">本地资料</p>
        <h1>我的资料</h1>
        <p class="subtle">当前BMI约${bmiInfo.value.toFixed(1)}，处于${bmiInfo.category}</p>
      </header>

      <article class="card bmi-card">
        <div class="bmi-scale" aria-label="BMI 范围条">
          <span class="bmi-range thin">偏瘦</span>
          <span class="bmi-range normal">正常</span>
          <span class="bmi-range over">超重</span>
          <span class="bmi-marker" style="left:${bmiInfo.percent}%"></span>
        </div>
        <div class="bmi-labels">
          <span>18.5</span>
          <span>24</span>
        </div>
        <p class="subtle">按身高 ${escapeHtml(p.heightCm)} cm 和最近记录体重 ${Number.isFinite(bmiInfo.weight) ? bmiInfo.weight.toFixed(1) : "--"} kg 计算。</p>
      </article>

      <form id="profile-form" class="form-grid">
        <article class="card">
          <div class="inline">
            <label>身高 cm<input inputmode="decimal" name="heightCm" value="${escapeHtml(p.heightCm)}"></label>
            <label>当前体重 kg<input inputmode="decimal" name="currentWeightKg" value="${escapeHtml(p.currentWeightKg)}"></label>
          </div>
          <div class="inline">
            <label>目标体重下限<input inputmode="decimal" name="targetWeightLowerKg" value="${escapeHtml(p.targetWeightLowerKg)}"></label>
            <label>目标体重上限<input inputmode="decimal" name="targetWeightUpperKg" value="${escapeHtml(p.targetWeightUpperKg)}"></label>
          </div>
        </article>

        <article class="card">
          <label>当前目标${select("goalType", goalTypes, p.goalType)}</label>
          <label>目标描述<textarea name="goalDescription" rows="3">${escapeHtml(p.goalDescription)}</textarea></label>
          ${checkbox("doesFitness", "是否经常健身", p.doesFitness)}
          ${checkbox("doesDance", "是否经常跳舞", p.doesDance)}
          ${checkbox("oftenSweats", "是否容易流汗", p.oftenSweats)}
          ${checkbox("sensitiveStomach", "是否肠胃敏感", p.sensitiveStomach)}
          <label>关注重点<textarea name="focus" rows="3">${escapeHtml(p.focus)}</textarea></label>
        </article>

        <button class="btn" type="submit">保存资料</button>
        <button class="btn secondary" id="export-data" type="button">导出数据</button>
        <button class="btn secondary" id="load-sample" type="button">载入 6 条模拟数据</button>
        <button class="btn danger" id="clear-data" type="button">清空本机数据</button>
      </form>

      <article class="card install-note" id="install-note">
        <div class="section-title">
          <h2>添加到主屏幕</h2>
          <p class="subtle">在 iPhone Safari 中打开网页，点分享按钮，再选择“添加到主屏幕”。</p>
        </div>
      </article>
    </section>
  `;
}

function bindTodayForm() {
  const form = document.getElementById("today-form");
  if (!form) return;

  form.addEventListener("input", event => {
    if (event.target.name === "bloatingScore") {
      document.getElementById("bloating-value").textContent = event.target.value;
    }

    if (["name", "cookingMethod"].includes(event.target.name)) {
      const row = event.target.closest(".food-row");
      if (!row) return;
      const name = row.querySelector('[name="name"]').value;
      const cooking = row.querySelector('[name="cookingMethod"]').value;
      row.querySelector(".risk-preview").innerHTML = renderRiskPreview(detectRiskTags(name, cooking));
    }
  });

  form.addEventListener("change", event => {
    if (event.target.name === "waterPreset" && event.target.value) {
      form.elements.waterMl.value = event.target.value;
    }
  });

  form.querySelectorAll(".add-food").forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-meal]");
      const list = card.querySelector(".food-list");
      list.querySelector(".empty")?.remove();
      list.insertAdjacentHTML("beforeend", renderFoodRow({}));
    });
  });

  form.addEventListener("click", event => {
    if (event.target.classList.contains("remove-food")) {
      const list = event.target.closest(".food-list");
      event.target.closest(".food-row").remove();
      if (!list.querySelector(".food-row")) {
        list.innerHTML = `<div class="empty">还没有记录，可以添加一个食物。</div>`;
      }
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const log = blankLog();
    log.morningWeightKg = data.get("morningWeightKg") || "";
    log.waterMl = Number(data.get("waterMl") || 0);
    log.coffee = data.has("coffee");
    log.tea = data.has("tea");
    log.alcohol = data.has("alcohol");
    log.carbonatedDrink = data.has("carbonatedDrink");
    log.exerciseType = data.get("exerciseType") || "无";
    log.exerciseMinutes = Number(data.get("exerciseMinutes") || 0);
    log.exerciseIntensity = data.get("exerciseIntensity") || "中";
    log.sweatLevel = data.get("sweatLevel") || "低";
    log.bloatingScore = Number(data.get("bloatingScore") || 0);
    log.bloatingTime = data.get("bloatingTime") || "不确定";
    log.stomachPain = data.has("stomachPain");
    log.acidReflux = data.has("acidReflux");
    log.bowelMovement = data.get("bowelMovement") || "不记录";
    log.notes = data.get("notes") || "";

    mealTypes.forEach(([key]) => {
      const card = form.querySelector(`[data-meal="${key}"]`);
      log.meals[key] = Array.from(card.querySelectorAll(".food-row"))
        .map(row => ({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          name: row.querySelector('[name="name"]').value.trim(),
          amount: row.querySelector('[name="amount"]').value.trim(),
          cookingMethod: row.querySelector('[name="cookingMethod"]').value.trim(),
          notes: row.querySelector('[name="notes"]').value.trim(),
          riskTags: []
        }))
        .filter(item => item.name || item.amount || item.cookingMethod || item.notes);
    });

    saveLog(log);
    showToast("已保存今日记录，并自动标记疑似风险食物。");
    activeTab = "dashboard";
    render();
  });
}

function bindProfileForm() {
  const form = document.getElementById("profile-form");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    state.profile = {
      ...state.profile,
      heightCm: data.get("heightCm") || "",
      currentWeightKg: data.get("currentWeightKg") || "",
      targetWeightLowerKg: data.get("targetWeightLowerKg") || "",
      targetWeightUpperKg: data.get("targetWeightUpperKg") || "",
      goalType: data.get("goalType") || "增肌塑形",
      goalDescription: data.get("goalDescription") || "",
      doesFitness: data.has("doesFitness"),
      doesDance: data.has("doesDance"),
      oftenSweats: data.has("oftenSweats"),
      sensitiveStomach: data.has("sensitiveStomach"),
      focus: data.get("focus") || ""
    };
    saveState();
    showToast("资料已保存。");
    render();
  });

  document.getElementById("export-data")?.addEventListener("click", exportData);
  document.getElementById("load-sample")?.addEventListener("click", () => {
    state.logs = sampleLogs().map(retagLog).sort((a, b) => b.date.localeCompare(a.date));
    saveState();
    showToast("已载入模拟数据，可在趋势页查看。");
    activeTab = "trends";
    render();
  });
  document.getElementById("clear-data")?.addEventListener("click", () => {
    if (!confirm("确定要清空本机资料和所有每日记录吗？")) return;
    state = { profile: { ...defaultProfile }, logs: [] };
    saveState();
    showToast("已清空本机数据。");
    activeTab = "dashboard";
    render();
  });
}

function exportData() {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `egg-diet-diary-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = "position:fixed;left:16px;right:16px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:99;max-width:640px;margin:auto;padding:12px 14px;border-radius:8px;background:#26312d;color:#fff;text-align:center;box-shadow:0 12px 30px rgba(0,0,0,.18);";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function drawTrendCharts() {
  const sorted = [...state.logs].sort((a, b) => a.date.localeCompare(b.date));
  const weightData = sorted
    .filter(log => log.morningWeightKg !== "" && Number.isFinite(Number(log.morningWeightKg)))
    .map(log => ({ label: log.date.slice(5), value: Number(log.morningWeightKg) }));
  const bloatingData = sorted.map(log => ({ label: log.date.slice(5), value: Number(log.bloatingScore || 0) }));

  const weightCanvas = document.getElementById("weight-chart");
  if (weightCanvas) drawLineChart(weightCanvas, weightData, { color: "#47715f", fill: "rgba(155,208,173,.18)" });

  const bloatingCanvas = document.getElementById("bloating-chart");
  if (bloatingCanvas) drawLineChart(bloatingCanvas, bloatingData, { color: "#7c73aa", fill: "rgba(200,193,232,.18)", min: 0, max: 10 });
}

function drawLineChart(canvas, data, options = {}) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const pad = { left: 46, right: 18, top: 20, bottom: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const values = data.map(item => item.value);
  let min = options.min ?? Math.min(...values);
  let max = options.max ?? Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }

  ctx.strokeStyle = "#dbe8e3";
  ctx.lineWidth = 1;
  ctx.font = "22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#66736d";

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    const label = (max - ((max - min) / 4) * i).toFixed(1);
    ctx.fillText(label, 4, y + 7);
  }

  const point = (item, index) => {
    const x = pad.left + (data.length === 1 ? plotW / 2 : (plotW / (data.length - 1)) * index);
    const y = pad.top + plotH - ((item.value - min) / (max - min)) * plotH;
    return { x, y };
  };

  const points = data.map(point);
  ctx.beginPath();
  points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.strokeStyle = options.color || "#47715f";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.lineTo(points[points.length - 1].x, pad.top + plotH);
  ctx.lineTo(points[0].x, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = options.fill || "rgba(155,208,173,.16)";
  ctx.fill();

  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = options.color || "#47715f";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.fillStyle = "#66736d";
  data.forEach((item, index) => {
    if (data.length > 6 && index % Math.ceil(data.length / 5) !== 0 && index !== data.length - 1) return;
    const p = point(item, index);
    ctx.save();
    ctx.translate(p.x, height - 10);
    ctx.rotate(-0.45);
    ctx.fillText(item.label, -20, 0);
    ctx.restore();
  });
}

function sampleLogs() {
  const daysAgo = amount => {
    const date = new Date();
    date.setDate(date.getDate() - amount);
    return dateKey(date);
  };

  const food = (name, amount, cookingMethod, notes = "") => ({ id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), name, amount, cookingMethod, notes, riskTags: [] });
  const make = (days, weight, meals, extra) => ({
    ...blankLog(daysAgo(days)),
    morningWeightKg: weight,
    meals,
    ...extra
  });

  return [
    make(0, 50.8, {
      breakfast: [food("鸡蛋全麦面包", "1 份", "煎蛋")],
      lunch: [food("鸡胸肉米饭西兰花", "一碗", "蒸煮")],
      dinner: [food("酸奶水果沙拉", "小碗", "冷食")],
      snack: [food("气泡水", "一罐", "冷饮")]
    }, { waterMl: 1500, carbonatedDrink: true, exerciseType: "跳舞", exerciseMinutes: 60, sweatLevel: "高", bloatingScore: 6, bloatingTime: "晚上", notes: "跳舞后有点胀，晚餐偏轻。" }),
    make(1, 50.6, {
      breakfast: [food("燕麦牛奶", "一碗", "温热")],
      lunch: [food("牛肉饭", "一份", "炒")],
      dinner: [food("番茄鸡蛋面", "一碗", "煮")],
      snack: []
    }, { waterMl: 1700, exerciseType: "健身", exerciseMinutes: 50, sweatLevel: "中", bloatingScore: 3 }),
    make(2, 50.9, {
      breakfast: [food("豆浆馒头", "一杯加一个", "热")],
      lunch: [food("麻辣火锅", "半份", "辛辣")],
      dinner: [food("米饭鱼肉白菜", "一份", "清蒸")],
      snack: []
    }, { waterMl: 1300, bloatingScore: 7, bloatingTime: "饭后 2-4 小时", stomachPain: true }),
    make(3, 50.7, {
      breakfast: [food("鸡蛋粥", "一碗", "温热")],
      lunch: [food("鸡肉饭", "一份", "煎")],
      dinner: [food("豆腐青菜米饭", "一份", "炖")],
      snack: [food("苹果", "半个", "常温")]
    }, { waterMl: 1600, exerciseType: "瑜伽", exerciseMinutes: 40, bloatingScore: 5 }),
    make(4, 50.5, {
      breakfast: [food("酸奶燕麦", "一杯", "冷食")],
      lunch: [food("披萨沙拉", "两块", "烤")],
      dinner: [food("鸡蛋米饭青菜", "一份", "炒")],
      snack: [food("无糖口香糖", "两颗", "")]
    }, { waterMl: 1400, exerciseType: "跳舞", exerciseMinutes: 70, sweatLevel: "高", bloatingScore: 6 }),
    make(5, 50.4, {
      breakfast: [food("鸡蛋面包", "一份", "烤")],
      lunch: [food("虾仁米饭", "一份", "清炒")],
      dinner: [food("鸡胸肉红薯", "一份", "蒸")],
      snack: []
    }, { waterMl: 1800, exerciseType: "跑步", exerciseMinutes: 35, sweatLevel: "中", bloatingScore: 1 })
  ];
}
