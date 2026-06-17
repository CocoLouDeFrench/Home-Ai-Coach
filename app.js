const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

const exercises = {
  legs: [
    ["Goblet Squat", "2–3 เซ็ต x 8–12 ครั้ง", "ช้า คุมลง 3 วินาที"],
    ["Romanian Deadlift", "2–3 เซ็ต x 8–12 ครั้ง", "หลังตรง รู้สึกที่ก้น/หลังขา"],
    ["Split Squat", "2 เซ็ต x 8–10 ครั้ง/ข้าง", "เริ่มเบา อย่าโชว์โหดวันแรก"]
  ],
  chest: [
    ["Push-up", "2–3 เซ็ต x 6–12 ครั้ง", "เหลือแรงไว้ 2–3 ครั้ง"],
    ["Dumbbell Floor Press", "2–3 เซ็ต x 8–12 ครั้ง", "หยุดนิดหนึ่งตอนศอกแตะพื้น"]
  ],
  back: [
    ["One Arm Dumbbell Row", "3 เซ็ต x 8–12 ครั้ง/ข้าง", "ดึงศอกไปหลัง ไม่ใช่ยกมือขึ้น"],
    ["Band Row", "2–3 เซ็ต x 12–15 ครั้ง", "บีบสะบักท้ายท่า"]
  ],
  shoulders: [
    ["Dumbbell Shoulder Press", "2–3 เซ็ต x 8–10 ครั้ง", "ไม่แอ่นหลัง"],
    ["Lateral Raise", "2 เซ็ต x 12–15 ครั้ง", "เบาแต่คุมให้ดี"]
  ],
  core: [
    ["Plank", "2–3 เซ็ต x 30–45 วินาที", "เกร็งท้องเหมือนโดนต่อย"],
    ["Dead Bug", "2 เซ็ต x 8–10 ครั้ง/ข้าง", "ช้าและนิ่ง"]
  ]
};

function getPain() {
  const pain = {};
  $$("input[data-muscle]").forEach(i => pain[i.dataset.muscle] = Number(i.value));
  return pain;
}

function coachDecision() {
  const energy = Number($("#energy").value);
  const time = Number($("#time").value);
  const goal = $("#goal").value;
  const pain = getPain();

  let avoid = Object.entries(pain).filter(([_, v]) => v >= 7).map(([k]) => k);
  let caution = Object.entries(pain).filter(([_, v]) => v >= 4 && v < 7).map(([k]) => k);
  let available = Object.keys(exercises).filter(m => !avoid.includes(m));

  if (energy <= 4) available = available.filter(m => pain[m] <= 3);
  if (available.length < 3) available = ["back", "chest", "core"].filter(m => !avoid.includes(m));

  const chosen = available.slice(0, time === 20 ? 3 : time === 30 ? 4 : 5);
  const workout = chosen.flatMap(m => exercises[m].slice(0, 1));

  let tone = "";
  if (energy <= 4) {
    tone = "วันนี้ไม่ใช่วันทำลายสถิติ วันนี้คือวันรักษาวินัย เล่นเบาแต่ทำให้เสร็จ นี่แหละคนมีวินัยจริง.";
  } else if (avoid.length) {
    tone = `กล้ามเนื้อที่ปวดมาก: ${avoid.join(", ")} — ไม่ต้องฝืน เล่นฉลาด ไม่ใช่เล่นจนพัง.`;
  } else if (goal === "restart") {
    tone = "กลับมาใหม่ต้องชนะด้วยระบบ ไม่ใช่อีโก้ วันนี้เอาพอดีๆ ให้ร่างกายจำว่าเราเป็นคนฟิตอีกครั้ง.";
  } else {
    tone = "วันนี้ร่างกายพร้อมพอสมควร โฟกัสฟอร์ม คุมจังหวะ และอย่ารีบหนักแบบเศรษฐีใจร้อน.";
  }

  if (caution.length) tone += ` ระวังโซน ${caution.join(", ")} ลดน้ำหนักหรือจำนวนเซ็ตลง 20–30%.`;

  return { tone, workout };
}

function renderWorkout() {
  const { tone, workout } = coachDecision();
  $("#coachText").innerText = tone;
  $("#workoutList").innerHTML = workout.map(e => `
    <div class="exercise">
      <strong>${e[0]}</strong>
      <span>${e[1]} · ${e[2]}</span>
    </div>
  `).join("");
}

function loadStats() {
  const s = JSON.parse(localStorage.getItem("homeAiCoachStats") || '{"sessions":0,"xp":0,"streak":0,"history":[]}');
  $("#sessions").innerText = s.sessions;
  $("#xp").innerText = s.xp;
  $("#streak").innerText = s.streak;
  $("#history").innerHTML = s.history.slice(-5).reverse().map(h => `✅ ${h}`).join("<br>");
}

function saveSession() {
  const s = JSON.parse(localStorage.getItem("homeAiCoachStats") || '{"sessions":0,"xp":0,"streak":0,"history":[]}');
  const today = new Date().toLocaleDateString("th-TH");
  const last = s.history[s.history.length - 1] || "";
  if (!last.includes(today)) {
    s.streak += 1;
  }
  s.sessions += 1;
  s.xp += 100;
  s.history.push(`${today}: workout completed +100 XP`);
  localStorage.setItem("homeAiCoachStats", JSON.stringify(s));
  loadStats();
  $("#coachText").innerText = "เสร็จแล้ว ดีมาก. วันนี้คุณไม่ได้แค่เล่นกล้าม คุณโหวตให้ตัวเองเวอร์ชันใหม่หนึ่งครั้ง.";
}

$("#energy").addEventListener("input", e => $("#energyVal").innerText = `${e.target.value}/10`);
$$("input[data-muscle]").forEach(i => i.addEventListener("input", e => e.target.nextElementSibling.innerText = e.target.value));
$("#generateBtn").addEventListener("click", renderWorkout);
$("#saveBtn").addEventListener("click", saveSession);

loadStats();
renderWorkout();
