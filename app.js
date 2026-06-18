const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

const storeKey = "homeAiCoachPro";
const defaultState = {
  stats: { sessions: 0, xp: 0, streak: 0, history: [], lastWorkoutDate: "" },
  body: [],
  photos: { before: "", after: "" },
  quests: {},
};

function load() {
  return JSON.parse(localStorage.getItem(storeKey) || JSON.stringify(defaultState));
}
function save(state) {
  localStorage.setItem(storeKey, JSON.stringify(state));
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

let deferredPrompt;
const installBtn = $("#installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");

$$(".bottom-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".bottom-nav button").forEach(b => b.classList.remove("active"));
    $$(".screen").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    $("#" + btn.dataset.tab).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (btn.dataset.tab === "body") setTimeout(drawChart, 80);
  });
});

const exercises = {
  legs: [
    ["Goblet Squat", "2–4 เซ็ต x 8–12 ครั้ง", "คุมลง 3 วินาที"],
    ["Romanian Deadlift", "2–4 เซ็ต x 8–12 ครั้ง", "หลังตรง รู้สึกที่ก้น/หลังขา"],
    ["Split Squat", "2–3 เซ็ต x 8–10 ครั้ง/ข้าง", "เริ่มเบา อย่าโชว์อีโก้"]
  ],
  chest: [
    ["Push-up", "2–4 เซ็ต x 6–15 ครั้ง", "เหลือแรงไว้ 1–3 ครั้ง"],
    ["Dumbbell Floor Press", "2–4 เซ็ต x 8–12 ครั้ง", "หยุดนิดตอนศอกแตะพื้น"]
  ],
  back: [
    ["One Arm Dumbbell Row", "3–4 เซ็ต x 8–12 ครั้ง/ข้าง", "ดึงศอกไปหลัง"],
    ["Band Row", "2–4 เซ็ต x 12–15 ครั้ง", "บีบสะบักท้ายท่า"]
  ],
  shoulders: [
    ["Dumbbell Shoulder Press", "2–4 เซ็ต x 8–10 ครั้ง", "ไม่แอ่นหลัง"],
    ["Lateral Raise", "2–3 เซ็ต x 12–20 ครั้ง", "เบาแต่คุม"]
  ],
  core: [
    ["Plank", "2–3 เซ็ต x 30–60 วินาที", "เกร็งท้อง"],
    ["Dead Bug", "2–3 เซ็ต x 8–12 ครั้ง/ข้าง", "ช้าและนิ่ง"]
  ]
};

function getPain() {
  const pain = {};
  $$("input[data-muscle]").forEach(i => pain[i.dataset.muscle] = Number(i.value));
  return pain;
}

function getRank(xp) {
  if (xp >= 5000) return "Elite";
  if (xp >= 2500) return "Athlete";
  if (xp >= 1000) return "Builder";
  if (xp >= 300) return "Starter";
  return "Rookie";
}

function latestWeight() {
  const s = load();
  if (!s.body.length) return null;
  return Number(s.body[s.body.length - 1].weight);
}

function coachDecision() {
  const energy = Number($("#energy").value);
  const sleep = Number($("#sleep").value || 0);
  const protein = Number($("#proteinToday").value || 0);
  const time = Number($("#time").value);
  const goal = $("#goal").value;
  const pain = getPain();
  const weight = latestWeight() || 57;
  const proteinTarget = Math.round(weight * 1.8);

  let avoid = Object.entries(pain).filter(([_, v]) => v >= 7).map(([k]) => k);
  let caution = Object.entries(pain).filter(([_, v]) => v >= 4 && v < 7).map(([k]) => k);
  let available = Object.keys(exercises).filter(m => !avoid.includes(m));

  let readiness = energy;
  if (sleep < 6) readiness -= 2;
  if (protein < proteinTarget * 0.7) readiness -= 1;
  if (avoid.length >= 2) readiness -= 1;
  readiness = Math.max(1, Math.min(10, readiness));

  if (readiness <= 4) available = available.filter(m => pain[m] <= 3);
  if (available.length < 3) available = ["back", "chest", "core"].filter(m => !avoid.includes(m));
  if (available.length === 0) available = ["core"];

  const count = time === 20 ? 3 : time === 30 ? 4 : 5;
  const chosen = available.slice(0, count);
  const workout = chosen.flatMap(m => exercises[m].slice(0, 1));

  let lines = [];
  lines.push(`Readiness วันนี้: ${readiness}/10`);
  if (readiness <= 4) {
    lines.push("วันนี้เล่นแบบรักษาวินัย ไม่ใช่วันทำลายสถิติ เล่นเบาแต่ต้องจบ.");
  } else if (readiness <= 7) {
    lines.push("วันนี้เล่นกลาง ๆ โฟกัสฟอร์ม คุมจังหวะ และอย่ารีบเพิ่มน้ำหนัก.");
  } else {
    lines.push("วันนี้พร้อมดัน Performance ได้ แต่ยังต้องเหลือแรงไว้ 1–2 ครั้งต่อเซ็ต.");
  }
  if (sleep < 6) lines.push("นอนน้อย: ลด Volume ลง 20–30% ไม่งั้น Recovery จะพัง.");
  if (protein < proteinTarget) lines.push(`โปรตีนยังต่ำ: เป้าหมายวันนี้ประมาณ ${proteinTarget}g ตอนนี้ ${protein}g.`);
  if (avoid.length) lines.push(`เลี่ยงกล้ามเนื้อที่ปวดมาก: ${avoid.join(", ")}.`);
  if (caution.length) lines.push(`ระวังโซน: ${caution.join(", ")} ลดน้ำหนักหรือเซ็ตลง.`);
  if (goal === "restart") lines.push("เป้าหมายกลับมาใหม่: ชนะด้วยความสม่ำเสมอ ไม่ใช่วันแรกแล้วเดินไม่ได้สามวัน.");

  return { tone: lines.join("\n"), workout, readiness };
}

function updateHero(readiness) {
  const pct = readiness * 10;
  $("#readinessScore").innerText = `${readiness}/10`;
  $("#ringValue").innerText = `${pct}%`;
  $(".ring").style.background = `radial-gradient(circle at center, #0b1224 58%, transparent 60%), conic-gradient(var(--accent) ${pct}%, rgba(255,255,255,.12) 0)`;
  $("#energyMini").innerText = `${$("#energy").value}/10`;
  $("#sleepMini").innerText = `${$("#sleep").value || 0}h`;
  $("#proteinMini").innerText = `${$("#proteinToday").value || 0}g`;
  $("#heroCoach").innerText = readiness <= 4 ? "Recovery first. Do the minimum, keep the streak." : readiness <= 7 ? "Solid day. Focus on clean reps." : "Strong day. Push performance, but stay smart.";
}

function renderWorkout() {
  const { tone, workout, readiness } = coachDecision();
  updateHero(readiness);
  $("#coachText").innerText = tone;
  $("#workoutList").innerHTML = workout.map(e => `
    <div class="exercise">
      <strong>${e[0]}</strong>
      <span>${e[1]} · ${e[2]}</span>
    </div>
  `).join("");
}

function saveWorkout() {
  const s = load();
  const d = todayKey();
  if (s.stats.lastWorkoutDate !== d) {
    s.stats.streak += 1;
    s.stats.lastWorkoutDate = d;
  }
  s.stats.sessions += 1;
  s.stats.xp += 120;
  s.stats.history.push(`${new Date().toLocaleDateString("th-TH")}: Workout completed +120 XP`);
  if (!s.quests[d]) s.quests[d] = {};
  s.quests[d].workout = true;
  save(s);
  $("#coachText").innerText = "เสร็จแล้ว ดีมาก. วันนี้คุณไม่ได้แค่ออกกำลังกาย คุณโหวตให้ตัวเองเวอร์ชันใหม่หนึ่งครั้ง.";
  renderGame();
}

function saveBodyCheckin() {
  const weight = Number($("#weight").value);
  const waist = Number($("#waist").value);
  const note = $("#bodyNote").value.trim();
  if (!weight || !waist) {
    alert("ใส่น้ำหนักและรอบเอวก่อน");
    return;
  }
  const s = load();
  s.body.push({ date: todayKey(), weight, waist, note });
  s.stats.xp += 40;
  if (!s.quests[todayKey()]) s.quests[todayKey()] = {};
  s.quests[todayKey()].body = true;
  save(s);
  $("#mealWeight").value = weight;
  $("#weight").value = "";
  $("#waist").value = "";
  $("#bodyNote").value = "";
  renderBodyHistory();
  drawChart();
  renderGame();
}

function renderBodyHistory() {
  const s = load();
  $("#bodyHistory").innerHTML = s.body.slice(-7).reverse().map(x =>
    `📌 ${x.date}: ${x.weight}kg · เอว ${x.waist}cm ${x.note ? "· " + x.note : ""}`
  ).join("<br>") || "ยังไม่มีข้อมูล";
}

function drawChart() {
  const canvas = $("#progressChart");
  if (!canvas) return;
  const s = load();
  const ctx = canvas.getContext("2d");
  const ratio = devicePixelRatio || 1;
  const w = canvas.width = canvas.offsetWidth * ratio;
  const h = canvas.height = 220 * ratio;
  ctx.clearRect(0, 0, w, h);

  const data = s.body.slice(-10);
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1 * ratio;
  for (let i = 0; i < 4; i++) {
    const y = 35*ratio + i*((h-70*ratio)/3);
    ctx.beginPath();
    ctx.moveTo(20*ratio, y);
    ctx.lineTo(w - 20*ratio, y);
    ctx.stroke();
  }

  if (data.length < 2) {
    ctx.fillStyle = "#9aa6bd";
    ctx.font = `${14*ratio}px sans-serif`;
    ctx.fillText("บันทึกอย่างน้อย 2 ครั้ง เพื่อดูกราฟ", 24*ratio, 88*ratio);
    return;
  }

  const weights = data.map(d => d.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const xStep = (w - 60*ratio) / (data.length - 1);

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#7dd3fc");
  grad.addColorStop(1, "#f5c56b");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 4 * ratio;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = 30*ratio + i*xStep;
    const y = h - 35*ratio - ((d.weight - min) / (max - min)) * (h - 70*ratio);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  data.forEach((d, i) => {
    const x = 30*ratio + i*xStep;
    const y = h - 35*ratio - ((d.weight - min) / (max - min)) * (h - 70*ratio);
    ctx.beginPath();
    ctx.arc(x, y, 4.5*ratio, 0, Math.PI*2);
    ctx.fill();
  });
}

function mealPlan() {
  const weight = Number($("#mealWeight").value || latestWeight() || 57);
  const goal = $("#mealGoal").value;
  const meals = Number($("#mealsPerDay").value);
  let protein = Math.round(weight * (goal === "fatloss" ? 2.0 : 1.8));
  let calories = Math.round(weight * (goal === "muscle" ? 35 : goal === "fatloss" ? 26 : 31));
  const proteinMeal = Math.round(protein / meals);

  const examples = [
    ["Meal 1", `ไข่ 2 ฟอง + Greek yogurt/Skyr + ผลไม้`, `${proteinMeal}g protein target`],
    ["Meal 2", `ข้าว + ไก่/เต้าหู้ + ผัก`, `${proteinMeal}g protein target`],
    ["Meal 3", `ก๋วยเตี๋ยว/ข้าว + เนื้อสัตว์ไม่ติดมัน`, `${proteinMeal}g protein target`],
    ["Meal 4", `โปรตีนเชคหรือทูน่า/ไข่/Skyr`, `${proteinMeal}g protein target`],
    ["Meal 5", `ของว่างโปรตีนสูง`, `${proteinMeal}g protein target`],
  ].slice(0, meals);

  const shopping = ["ไข่", "อกไก่หรือไก่งวง", "เต้าหู้", "Skyr/Greek yogurt", "ข้าวหรือมันฝรั่ง", "ผักแช่แข็ง", "ผลไม้", "ทูน่า", "โปรตีนผงถ้ามีงบ"];

  $("#mealOutput").innerHTML = `
    <div class="meal-box"><strong>Daily target</strong><span>Protein ${protein}g · Calories ${calories} kcal</span></div>
    ${examples.map(m => `<div class="meal-box"><strong>${m[0]}</strong><span>${m[1]}<br>${m[2]}</span></div>`).join("")}
    <div class="meal-box"><strong>Shopping list</strong><span>${shopping.map(x => "• " + x).join("<br>")}</span></div>
  `;

  const s = load();
  s.stats.xp += 30;
  if (!s.quests[todayKey()]) s.quests[todayKey()] = {};
  s.quests[todayKey()].meal = true;
  save(s);
  renderGame();
}

function photoToData(input, img, key) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    img.src = reader.result;
    img.style.display = "block";
    const s = load();
    s.photos[key] = reader.result;
    save(s);
  };
  reader.readAsDataURL(file);
}

function loadPhotos() {
  const s = load();
  if (s.photos.before) {
    $("#beforePreview").src = s.photos.before;
    $("#beforePreview").style.display = "block";
  }
  if (s.photos.after) {
    $("#afterPreview").src = s.photos.after;
    $("#afterPreview").style.display = "block";
  }
}

function analyzePhotos() {
  const s = load();
  let msg = [];
  if (!s.photos.before || !s.photos.after) {
    msg.push("ใส่รูป Before และ After/Current ก่อน ระบบถึงจะเปรียบเทียบได้.");
  } else {
    msg.push("รูปถูกบันทึกแล้ว. เวอร์ชันนี้ยังไม่ใช้ AI Vision จริง แต่ใช้เป็นฐานสำหรับ Before/After Tracking.");
    msg.push("คำแนะนำ: ถ่ายรูปทุก 2 สัปดาห์ แสงเดียวกัน มุมเดียวกัน ระยะเดียวกัน ตอนเช้าหลังเข้าห้องน้ำ.");
    msg.push("AI Vision จริงต้องต่อ Backend/API เพิ่มภายหลัง เพื่อวิเคราะห์ไขมัน กล้ามเนื้อ และจุดที่ควรพัฒนา.");
    s.stats.xp += 50;
    if (!s.quests[todayKey()]) s.quests[todayKey()] = {};
    s.quests[todayKey()].photo = true;
    save(s);
  }
  $("#photoAnalysis").innerText = msg.join("\n\n");
  renderGame();
}

function renderGame() {
  const s = load();
  $("#sessions").innerText = s.stats.sessions;
  $("#xp").innerText = s.stats.xp;
  $("#streak").innerText = s.stats.streak;
  $("#rank").innerText = getRank(s.stats.xp);
  $("#history").innerHTML = s.stats.history.slice(-10).reverse().join("<br>") || "ยังไม่มีประวัติ";

  const q = s.quests[todayKey()] || {};
  const quests = [
    ["workout", "ทำ Workout วันนี้", 120],
    ["body", "บันทึกน้ำหนักและรอบเอว", 40],
    ["meal", "สร้าง Meal Plan วันนี้", 30],
    ["photo", "อัปเดตรูป Progress", 50],
  ];
  $("#quests").innerHTML = quests.map(([key, name, xp]) =>
    `<div class="quest">${q[key] ? "✅" : "⬜"} ${name} <span class="${q[key] ? "badge-ok" : "badge-lock"}">+${xp} XP</span></div>`
  ).join("");

  const achievements = [
    ["First Sweat", s.stats.sessions >= 1, "เล่น workout ครั้งแรก"],
    ["Consistency Rookie", s.stats.sessions >= 5, "ครบ 5 sessions"],
    ["Body Data CEO", s.body.length >= 3, "บันทึก body check-in 3 ครั้ง"],
    ["XP Hunter", s.stats.xp >= 1000, "สะสม 1000 XP"],
    ["Comeback Arc", s.stats.streak >= 7, "streak 7 วัน"],
  ];
  $("#achievements").innerHTML = achievements.map(([name, ok, desc]) =>
    `<div class="achievement">${ok ? "🏆" : "🔒"} <strong>${name}</strong><br><span class="${ok ? "badge-ok" : "badge-lock"}">${desc}</span></div>`
  ).join("");
}

$("#energy").addEventListener("input", e => { $("#energyVal").innerText = `${e.target.value}/10`; renderWorkout(); });
$("#sleep").addEventListener("input", renderWorkout);
$("#proteinToday").addEventListener("input", renderWorkout);
$$("input[data-muscle]").forEach(i => i.addEventListener("input", e => { e.target.nextElementSibling.innerText = e.target.value; renderWorkout(); }));
$("#generateBtn").addEventListener("click", renderWorkout);
$("#saveWorkoutBtn").addEventListener("click", saveWorkout);
$("#saveBodyBtn").addEventListener("click", saveBodyCheckin);
$("#mealBtn").addEventListener("click", mealPlan);
$("#beforePhoto").addEventListener("change", e => photoToData(e.target, $("#beforePreview"), "before"));
$("#afterPhoto").addEventListener("change", e => photoToData(e.target, $("#afterPreview"), "after"));
$("#photoAnalysisBtn").addEventListener("click", analyzePhotos);

renderWorkout();
renderBodyHistory();
loadPhotos();
renderGame();
