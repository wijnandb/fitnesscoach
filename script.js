// ─── Default Exercises ─────────────────────────────────────────
const DEFAULT_EXERCISES = [
  { id: "pushups", name: "Push-ups", icon: "\u{1F4AA}", unit: "reps", defaultReps: 10, hasWeight: false },
  { id: "squats", name: "Squats", icon: "\u{1F9B5}", unit: "reps", defaultReps: 15, hasWeight: true },
  { id: "pullups", name: "Pull-ups", icon: "\u{1F3CB}\uFE0F", unit: "reps", defaultReps: 5, hasWeight: false },
  { id: "plank", name: "Plank", icon: "\u{1F9D8}", unit: "sec", defaultReps: 30, hasWeight: false },
  { id: "curls", name: "Bicep Curls", icon: "\u{1F4AA}", unit: "reps", defaultReps: 12, hasWeight: true },
  { id: "lunges", name: "Lunges", icon: "\u{1F9BF}", unit: "reps", defaultReps: 10, hasWeight: true },
  { id: "dips", name: "Dips", icon: "\u2B07\uFE0F", unit: "reps", defaultReps: 8, hasWeight: false },
  { id: "deadlift", name: "Deadlift", icon: "\u{1F3D7}\uFE0F", unit: "reps", defaultReps: 8, hasWeight: true },
  { id: "bench", name: "Bench Press", icon: "\u{1F6CB}\uFE0F", unit: "reps", defaultReps: 8, hasWeight: true },
  { id: "ohp", name: "Overhead Press", icon: "\u{1F64C}", unit: "reps", defaultReps: 8, hasWeight: true },
  { id: "rows", name: "Rows", icon: "\u{1F6A3}", unit: "reps", defaultReps: 10, hasWeight: true },
  { id: "situps", name: "Sit-ups", icon: "\u{1F504}", unit: "reps", defaultReps: 20, hasWeight: false },
];

// ─── Local Storage ─────────────────────────────────────────────
const STORAGE_KEY = "repstack_logs";

function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

// ─── State ─────────────────────────────────────────────────────
let logs = loadLogs();
let currentView = "log";
let currentModalExercise = null;
let modalReps = 10;
let modalWeight = 0;
let notificationTimer = null;

// ─── Utility Functions ─────────────────────────────────────────
function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDayKey(date) {
  return new Date(date).toISOString().split("T")[0];
}

function getStreak() {
  if (!logs.length) return 0;
  const daysSet = new Set(logs.map(function(l) { return getDayKey(l.timestamp); }));
  const days = Array.from(daysSet).sort().reverse();
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (days[0] !== today && days[0] !== yesterday) return 0;
  var streak = 1;
  for (var i = 1; i < days.length; i++) {
    var diff = new Date(days[i - 1]) - new Date(days[i]);
    if (diff === 86400000) streak++;
    else break;
  }
  return streak;
}

function getPersonalBests() {
  var bests = {};
  logs.forEach(function(log) {
    var key = log.exerciseId;
    if (!bests[key]) bests[key] = { reps: 0, weight: 0, volume: 0 };
    if (log.reps > bests[key].reps) bests[key].reps = log.reps;
    if ((log.weight || 0) > bests[key].weight) bests[key].weight = log.weight || 0;
    var vol = log.reps * (log.weight || 1);
    if (vol > bests[key].volume) bests[key].volume = vol;
  });
  return bests;
}

function getTodayStats() {
  var today = getToday();
  var todayLogs = logs.filter(function(l) { return getDayKey(l.timestamp) === today; });
  var exerciseSet = new Set(todayLogs.map(function(l) { return l.exerciseId; }));
  return {
    sets: todayLogs.length,
    totalReps: todayLogs.reduce(function(s, l) { return s + l.reps; }, 0),
    exercises: exerciseSet.size,
    logs: todayLogs,
  };
}

function getTodayCounts() {
  var stats = getTodayStats();
  var counts = {};
  stats.logs.forEach(function(l) {
    counts[l.exerciseId] = (counts[l.exerciseId] || 0) + 1;
  });
  return counts;
}

function findExercise(id) {
  return DEFAULT_EXERCISES.find(function(e) { return e.id === id; });
}

// ─── Notification ──────────────────────────────────────────────
function showNotification(msg, isPB) {
  var el = document.getElementById("notification");
  el.textContent = msg;
  el.className = "notification " + (isPB ? "pb" : "normal");
  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(function() {
    el.className = "notification hidden";
    notificationTimer = null;
  }, 2000);
}

// ─── Logging ───────────────────────────────────────────────────
function logExercise(exercise, reps, weight) {
  var actualReps = reps || exercise.defaultReps;
  var actualWeight = weight || 0;
  var pb = getPersonalBests()[exercise.id];
  var isRepsPB = pb && actualReps > pb.reps;
  var isWeightPB = pb && exercise.hasWeight && actualWeight > pb.weight;
  var isNewExercise = !pb;

  var newLog = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    exerciseId: exercise.id,
    reps: actualReps,
    weight: actualWeight,
    unit: exercise.unit,
    timestamp: new Date().toISOString(),
  };

  logs.push(newLog);
  saveLogs(logs);

  if (isRepsPB && !isNewExercise) {
    showNotification("\u{1F3C6} New PB! " + actualReps + " " + exercise.unit + " " + exercise.name + "!", true);
  } else if (isWeightPB && !isNewExercise) {
    showNotification("\u{1F3C6} New PB! " + actualWeight + "kg " + exercise.name + "!", true);
  } else {
    var msgs = ["Stacked! \u{1F525}", "Logged! \u{1F4AA}", "+1 set \u2705", "Nice! \u{1F3AF}", "Keep going! \u26A1"];
    showNotification(msgs[Math.floor(Math.random() * msgs.length)]);
  }

  renderAll();
}

function quickLog(exerciseId) {
  var exercise = findExercise(exerciseId);
  if (exercise) {
    // Flash effect
    var btn = document.querySelector('[data-exercise="' + exerciseId + '"]');
    if (btn) {
      btn.classList.add("flash");
      setTimeout(function() { btn.classList.remove("flash"); }, 400);
    }
    logExercise(exercise);
  }
}

// ─── Modal ─────────────────────────────────────────────────────
function openModal(exerciseId) {
  currentModalExercise = findExercise(exerciseId);
  if (!currentModalExercise) return;

  modalReps = currentModalExercise.defaultReps;
  modalWeight = 0;

  document.getElementById("modal-icon").textContent = currentModalExercise.icon;
  document.getElementById("modal-title").textContent = currentModalExercise.name;
  updateModalValues();

  var weightGroup = document.getElementById("weight-group");
  if (currentModalExercise.hasWeight) {
    weightGroup.classList.remove("hidden");
  } else {
    weightGroup.classList.add("hidden");
  }

  document.getElementById("custom-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("custom-modal").classList.add("hidden");
  currentModalExercise = null;
}

function adjustReps(delta) {
  modalReps = Math.max(0, modalReps + delta);
  updateModalValues();
}

function adjustWeight(delta) {
  modalWeight = Math.max(0, modalWeight + delta);
  updateModalValues();
}

function updateModalValues() {
  var repsEl = document.getElementById("modal-reps");
  var weightEl = document.getElementById("modal-weight");
  var exercise = currentModalExercise;
  repsEl.innerHTML = modalReps + '<span class="number-unit"> ' + (exercise ? exercise.unit : 'reps') + '</span>';
  weightEl.innerHTML = modalWeight + '<span class="number-unit"> kg</span>';
}

function submitCustomLog() {
  if (currentModalExercise) {
    logExercise(currentModalExercise, modalReps, modalWeight);
    closeModal();
  }
}

// ─── Tab Switching ─────────────────────────────────────────────
function switchTab(tab) {
  currentView = tab;
  document.getElementById("tab-log").classList.toggle("active", tab === "log");
  document.getElementById("tab-history").classList.toggle("active", tab === "history");
  document.getElementById("view-log").classList.toggle("hidden", tab !== "log");
  document.getElementById("view-history").classList.toggle("hidden", tab !== "history");

  if (tab === "history") renderHistory();
}

// ─── Render Functions ──────────────────────────────────────────
function renderAll() {
  renderStats();
  renderStreak();
  renderWeekChart();
  renderExerciseGrid();
  renderRecent();
  if (currentView === "history") renderHistory();
}

function renderStats() {
  var stats = getTodayStats();
  document.getElementById("stat-sets").textContent = stats.sets;
  document.getElementById("stat-reps").textContent = stats.totalReps;
  document.getElementById("stat-exercises").textContent = stats.exercises;
}

function renderStreak() {
  var streak = getStreak();
  var badge = document.getElementById("streak-badge");
  if (streak > 0) {
    badge.classList.remove("hidden");
    document.getElementById("streak-value").textContent = "\u{1F525} " + streak;
  } else {
    badge.classList.add("hidden");
  }
}

function renderWeekChart() {
  var container = document.getElementById("chart-bars");
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(Date.now() - i * 86400000);
    var key = d.toISOString().split("T")[0];
    var dayLogs = logs.filter(function(l) { return getDayKey(l.timestamp) === key; });
    days.push({
      label: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 2),
      reps: dayLogs.reduce(function(s, l) { return s + l.reps; }, 0),
      isToday: i === 0,
    });
  }

  var maxReps = Math.max.apply(null, days.map(function(d) { return d.reps; }).concat([1]));
  var html = "";
  days.forEach(function(d) {
    var barHeight = Math.max(4, (d.reps / maxReps) * 60);
    var barClass = d.isToday ? "today" : (d.reps > 0 ? "has-data" : "empty");
    var labelClass = d.isToday ? "today" : "";
    html += '<div class="chart-day">';
    html += '<span class="chart-count">' + (d.reps > 0 ? d.reps : "") + '</span>';
    html += '<div class="chart-bar ' + barClass + '" style="height:' + barHeight + 'px"></div>';
    html += '<span class="chart-day-label ' + labelClass + '">' + d.label + '</span>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function renderExerciseGrid() {
  var container = document.getElementById("exercise-grid");
  var counts = getTodayCounts();
  var html = "";
  DEFAULT_EXERCISES.forEach(function(ex) {
    var count = counts[ex.id] || 0;
    html += '<button class="exercise-btn" data-exercise="' + ex.id + '" ';
    html += 'onclick="quickLog(\'' + ex.id + '\')" ';
    html += 'oncontextmenu="event.preventDefault();openModal(\'' + ex.id + '\')" ';
    html += 'ontouchstart="this._timer=setTimeout(function(){openModal(\'' + ex.id + '\')},500)" ';
    html += 'ontouchend="clearTimeout(this._timer)">';
    html += '<span class="ex-icon">' + ex.icon + '</span>';
    html += '<span class="ex-name">' + ex.name + '</span>';
    html += '<span class="ex-default">' + ex.defaultReps + ' ' + ex.unit + '</span>';
    if (count > 0) {
      html += '<span class="ex-today-count">' + count + '</span>';
    }
    html += '</button>';
  });
  container.innerHTML = html;
}

function renderRecent() {
  var stats = getTodayStats();
  var section = document.getElementById("recent-section");
  var container = document.getElementById("recent-logs");

  if (stats.logs.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  var recent = stats.logs.slice(-5).reverse();
  var html = "";
  recent.forEach(function(log) {
    var ex = findExercise(log.exerciseId);
    var icon = ex ? ex.icon : "\u{1F4AA}";
    var name = ex ? ex.name : log.exerciseId;
    var time = new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    var weightStr = log.weight ? " @ " + log.weight + "kg" : "";

    html += '<div class="log-entry normal">';
    html += '<span class="log-icon">' + icon + '</span>';
    html += '<div class="log-details">';
    html += '<span class="log-name">' + name + '</span>';
    html += '<span class="log-stats">' + log.reps + ' ' + log.unit + weightStr + '</span>';
    html += '</div>';
    html += '<span class="log-time">' + time + '</span>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function renderHistory() {
  var container = document.getElementById("history-content");
  if (logs.length === 0) {
    container.innerHTML = '<div class="history-empty">No exercises logged yet. Start stacking! \u{1F525}</div>';
    return;
  }

  // Group by day
  var groups = {};
  logs.forEach(function(log) {
    var day = getDayKey(log.timestamp);
    if (!groups[day]) groups[day] = [];
    groups[day].push(log);
  });

  var sortedDays = Object.keys(groups).sort().reverse();
  var today = getToday();
  var yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  var html = "";
  sortedDays.forEach(function(day) {
    var dayLogs = groups[day].sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    var totalReps = dayLogs.reduce(function(s, l) { return s + l.reps; }, 0);

    var dayLabel;
    if (day === today) dayLabel = "Today";
    else if (day === yesterday) dayLabel = "Yesterday";
    else dayLabel = new Date(day + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });

    html += '<div class="history-day">';
    html += '<div class="history-day-header">' + dayLabel + ' \u00B7 ' + dayLogs.length + ' sets \u00B7 ' + totalReps + ' reps</div>';

    dayLogs.forEach(function(log) {
      var ex = findExercise(log.exerciseId);
      var icon = ex ? ex.icon : "\u{1F4AA}";
      var name = ex ? ex.name : log.exerciseId;
      var time = new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      var weightStr = log.weight ? " @ " + log.weight + "kg" : "";

      html += '<div class="log-entry normal">';
      html += '<span class="log-icon">' + icon + '</span>';
      html += '<div class="log-details">';
      html += '<span class="log-name">' + name + '</span>';
      html += '<span class="log-stats">' + log.reps + ' ' + log.unit + weightStr + '</span>';
      html += '</div>';
      html += '<span class="log-time">' + time + '</span>';
      html += '</div>';
    });

    html += '</div>';
  });
  container.innerHTML = html;
}

// ─── Initialize ────────────────────────────────────────────────
renderAll();
