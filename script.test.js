const fs = require("fs");
const path = require("path");

// Set up the DOM from index.html before loading script.js
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
document.documentElement.innerHTML = html;

// Mock localStorage
const store = {};
const localStorageMock = {
  getItem: jest.fn((key) => store[key] || null),
  setItem: jest.fn((key, val) => { store[key] = String(val); }),
  removeItem: jest.fn((key) => { delete store[key]; }),
  clear: jest.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });

const app = require("./script");

function resetLogs() {
  app._setLogs([]);
  localStorageMock.clear();
}

// ─── Exercise Data ─────────────────────────────────────────────

describe("DEFAULT_EXERCISES", () => {
  test("contains 12 exercises", () => {
    expect(app.DEFAULT_EXERCISES).toHaveLength(12);
  });

  test("each exercise has required fields", () => {
    app.DEFAULT_EXERCISES.forEach((ex) => {
      expect(ex).toHaveProperty("id");
      expect(ex).toHaveProperty("name");
      expect(ex).toHaveProperty("icon");
      expect(ex).toHaveProperty("unit");
      expect(ex).toHaveProperty("defaultReps");
      expect(ex).toHaveProperty("hasWeight");
      expect(typeof ex.id).toBe("string");
      expect(typeof ex.defaultReps).toBe("number");
      expect(ex.defaultReps).toBeGreaterThan(0);
    });
  });

  test("exercise IDs are unique", () => {
    const ids = app.DEFAULT_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── findExercise ──────────────────────────────────────────────

describe("findExercise", () => {
  test("finds an exercise by id", () => {
    const ex = app.findExercise("pushups");
    expect(ex).toBeDefined();
    expect(ex.name).toBe("Push-ups");
  });

  test("returns undefined for unknown id", () => {
    expect(app.findExercise("nonexistent")).toBeUndefined();
  });
});

// ─── getToday / getDayKey ──────────────────────────────────────

describe("getToday", () => {
  test("returns YYYY-MM-DD format", () => {
    expect(app.getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getDayKey", () => {
  test("extracts date from ISO string", () => {
    expect(app.getDayKey("2025-03-15T14:30:00.000Z")).toBe("2025-03-15");
  });

  test("handles date objects", () => {
    const d = new Date("2025-06-01T08:00:00Z");
    expect(app.getDayKey(d.toISOString())).toBe("2025-06-01");
  });
});

// ─── localStorage ──────────────────────────────────────────────

describe("loadLogs / saveLogs", () => {
  beforeEach(resetLogs);

  test("loadLogs returns empty array when nothing stored", () => {
    expect(app.loadLogs()).toEqual([]);
  });

  test("saveLogs persists and loadLogs retrieves data", () => {
    const testLogs = [{ id: "a", exerciseId: "pushups", reps: 10, timestamp: new Date().toISOString() }];
    app.saveLogs(testLogs);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("repstack_logs", JSON.stringify(testLogs));
  });

  test("loadLogs returns empty array for corrupted data", () => {
    store["repstack_logs"] = "not valid json{{{";
    expect(app.loadLogs()).toEqual([]);
  });
});

// ─── getStreak ─────────────────────────────────────────────────

describe("getStreak", () => {
  beforeEach(resetLogs);

  test("returns 0 with no logs", () => {
    expect(app.getStreak()).toBe(0);
  });

  test("returns 1 for a single day with logs today", () => {
    app._setLogs([
      { exerciseId: "pushups", reps: 10, timestamp: new Date().toISOString() },
    ]);
    expect(app.getStreak()).toBe(1);
  });

  test("returns 2 for consecutive days (today + yesterday)", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    app._setLogs([
      { exerciseId: "pushups", reps: 10, timestamp: new Date().toISOString() },
      { exerciseId: "pushups", reps: 10, timestamp: yesterday },
    ]);
    expect(app.getStreak()).toBe(2);
  });

  test("returns 0 if most recent log is older than yesterday", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    app._setLogs([
      { exerciseId: "pushups", reps: 10, timestamp: threeDaysAgo },
    ]);
    expect(app.getStreak()).toBe(0);
  });

  test("breaks streak on a gap day", () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    app._setLogs([
      { exerciseId: "pushups", reps: 10, timestamp: today },
      { exerciseId: "pushups", reps: 10, timestamp: yesterday },
      // gap: 2 days ago missing
      { exerciseId: "pushups", reps: 10, timestamp: threeDaysAgo },
    ]);
    expect(app.getStreak()).toBe(2);
  });
});

// ─── getPersonalBests ──────────────────────────────────────────

describe("getPersonalBests", () => {
  beforeEach(resetLogs);

  test("returns empty object with no logs", () => {
    expect(app.getPersonalBests()).toEqual({});
  });

  test("tracks max reps per exercise", () => {
    app._setLogs([
      { exerciseId: "pushups", reps: 10, weight: 0, timestamp: new Date().toISOString() },
      { exerciseId: "pushups", reps: 15, weight: 0, timestamp: new Date().toISOString() },
      { exerciseId: "pushups", reps: 8, weight: 0, timestamp: new Date().toISOString() },
    ]);
    const bests = app.getPersonalBests();
    expect(bests.pushups.reps).toBe(15);
  });

  test("tracks max weight per exercise", () => {
    app._setLogs([
      { exerciseId: "squats", reps: 10, weight: 40, timestamp: new Date().toISOString() },
      { exerciseId: "squats", reps: 10, weight: 60, timestamp: new Date().toISOString() },
      { exerciseId: "squats", reps: 10, weight: 50, timestamp: new Date().toISOString() },
    ]);
    const bests = app.getPersonalBests();
    expect(bests.squats.weight).toBe(60);
  });

  test("tracks max volume (reps * weight)", () => {
    app._setLogs([
      { exerciseId: "bench", reps: 8, weight: 60, timestamp: new Date().toISOString() },
      { exerciseId: "bench", reps: 5, weight: 80, timestamp: new Date().toISOString() },
    ]);
    const bests = app.getPersonalBests();
    expect(bests.bench.volume).toBe(480); // 8*60=480 vs 5*80=400
  });

  test("uses reps*1 for volume when no weight", () => {
    app._setLogs([
      { exerciseId: "pushups", reps: 20, weight: 0, timestamp: new Date().toISOString() },
    ]);
    const bests = app.getPersonalBests();
    expect(bests.pushups.volume).toBe(20);
  });
});

// ─── getTodayStats ─────────────────────────────────────────────

describe("getTodayStats", () => {
  beforeEach(resetLogs);

  test("returns zeros with no logs", () => {
    const stats = app.getTodayStats();
    expect(stats.sets).toBe(0);
    expect(stats.totalReps).toBe(0);
    expect(stats.exercises).toBe(0);
    expect(stats.logs).toHaveLength(0);
  });

  test("counts today's logs correctly", () => {
    const now = new Date().toISOString();
    app._setLogs([
      { exerciseId: "pushups", reps: 10, timestamp: now },
      { exerciseId: "squats", reps: 15, timestamp: now },
      { exerciseId: "pushups", reps: 12, timestamp: now },
    ]);
    const stats = app.getTodayStats();
    expect(stats.sets).toBe(3);
    expect(stats.totalReps).toBe(37);
    expect(stats.exercises).toBe(2);
  });

  test("excludes logs from other days", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    app._setLogs([
      { exerciseId: "pushups", reps: 10, timestamp: new Date().toISOString() },
      { exerciseId: "pushups", reps: 10, timestamp: yesterday },
    ]);
    const stats = app.getTodayStats();
    expect(stats.sets).toBe(1);
  });
});

// ─── getTodayCounts ────────────────────────────────────────────

describe("getTodayCounts", () => {
  beforeEach(resetLogs);

  test("returns empty object with no logs", () => {
    expect(app.getTodayCounts()).toEqual({});
  });

  test("counts sets per exercise for today", () => {
    const now = new Date().toISOString();
    app._setLogs([
      { exerciseId: "pushups", reps: 10, timestamp: now },
      { exerciseId: "pushups", reps: 10, timestamp: now },
      { exerciseId: "squats", reps: 15, timestamp: now },
    ]);
    const counts = app.getTodayCounts();
    expect(counts.pushups).toBe(2);
    expect(counts.squats).toBe(1);
  });
});

// ─── logExercise ───────────────────────────────────────────────

describe("logExercise", () => {
  beforeEach(resetLogs);

  test("adds a log entry with default reps", () => {
    const ex = app.findExercise("pushups");
    app.logExercise(ex);
    const logs = app._getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].exerciseId).toBe("pushups");
    expect(logs[0].reps).toBe(10);
    expect(logs[0].weight).toBe(0);
    expect(logs[0].unit).toBe("reps");
  });

  test("adds a log entry with custom reps and weight", () => {
    const ex = app.findExercise("squats");
    app.logExercise(ex, 20, 80);
    const logs = app._getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].reps).toBe(20);
    expect(logs[0].weight).toBe(80);
  });

  test("saves to localStorage after logging", () => {
    const ex = app.findExercise("pushups");
    localStorageMock.setItem.mockClear();
    app.logExercise(ex);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  test("generates unique IDs", () => {
    const ex = app.findExercise("pushups");
    app.logExercise(ex);
    app.logExercise(ex);
    const logs = app._getLogs();
    expect(logs[0].id).not.toBe(logs[1].id);
  });

  test("sets timestamp on each log", () => {
    const ex = app.findExercise("pushups");
    app.logExercise(ex);
    const logs = app._getLogs();
    expect(logs[0].timestamp).toBeDefined();
    expect(() => new Date(logs[0].timestamp)).not.toThrow();
  });
});

// ─── Modal ─────────────────────────────────────────────────────

describe("modal operations", () => {
  beforeEach(resetLogs);

  test("openModal sets the exercise and default values", () => {
    app.openModal("squats");
    expect(app._getCurrentModalExercise().id).toBe("squats");
    expect(app._getModalReps()).toBe(15); // squats default
    expect(app._getModalWeight()).toBe(0);
    expect(document.getElementById("custom-modal").classList.contains("hidden")).toBe(false);
  });

  test("openModal shows weight group for weighted exercises", () => {
    app.openModal("squats");
    expect(document.getElementById("weight-group").classList.contains("hidden")).toBe(false);
  });

  test("openModal hides weight group for bodyweight exercises", () => {
    app.openModal("pushups");
    expect(document.getElementById("weight-group").classList.contains("hidden")).toBe(true);
  });

  test("openModal does nothing for unknown exercise", () => {
    app.closeModal(); // ensure clean state
    app.openModal("nonexistent");
    expect(app._getCurrentModalExercise()).toBeFalsy();
  });

  test("closeModal hides modal and clears exercise", () => {
    app.openModal("pushups");
    app.closeModal();
    expect(document.getElementById("custom-modal").classList.contains("hidden")).toBe(true);
    expect(app._getCurrentModalExercise()).toBeNull();
  });

  test("adjustReps changes reps value", () => {
    app.openModal("pushups");
    const initial = app._getModalReps();
    app.adjustReps(5);
    expect(app._getModalReps()).toBe(initial + 5);
  });

  test("adjustReps does not go below 0", () => {
    app.openModal("pushups");
    app.adjustReps(-100);
    expect(app._getModalReps()).toBe(0);
  });

  test("adjustWeight changes weight value", () => {
    app.openModal("squats");
    app.adjustWeight(10);
    expect(app._getModalWeight()).toBe(10);
  });

  test("adjustWeight does not go below 0", () => {
    app.openModal("squats");
    app.adjustWeight(-100);
    expect(app._getModalWeight()).toBe(0);
  });

  test("submitCustomLog creates a log and closes modal", () => {
    app.openModal("bench");
    app.adjustReps(-app._getModalReps() + 5); // set to 5
    app.adjustWeight(60);
    app.submitCustomLog();
    const logs = app._getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].exerciseId).toBe("bench");
    expect(logs[0].reps).toBe(5);
    expect(logs[0].weight).toBe(60);
    expect(app._getCurrentModalExercise()).toBeNull();
  });

  test("submitCustomLog does nothing when no exercise selected", () => {
    app.closeModal();
    app.submitCustomLog();
    expect(app._getLogs()).toHaveLength(0);
  });
});

// ─── Tab Switching ─────────────────────────────────────────────

describe("switchTab", () => {
  test("switches to history view", () => {
    app.switchTab("history");
    expect(document.getElementById("tab-history").classList.contains("active")).toBe(true);
    expect(document.getElementById("tab-log").classList.contains("active")).toBe(false);
    expect(document.getElementById("view-log").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("view-history").classList.contains("hidden")).toBe(false);
  });

  test("switches back to log view", () => {
    app.switchTab("history");
    app.switchTab("log");
    expect(document.getElementById("tab-log").classList.contains("active")).toBe(true);
    expect(document.getElementById("tab-history").classList.contains("active")).toBe(false);
    expect(document.getElementById("view-log").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("view-history").classList.contains("hidden")).toBe(true);
  });
});

// ─── Rendering ─────────────────────────────────────────────────

describe("rendering", () => {
  beforeEach(resetLogs);

  test("renderAll does not throw", () => {
    expect(() => app.renderAll()).not.toThrow();
  });

  test("exercise grid renders 12 buttons", () => {
    app.renderAll();
    const buttons = document.querySelectorAll(".exercise-btn");
    expect(buttons).toHaveLength(12);
  });

  test("exercise buttons have correct data-exercise attributes", () => {
    app.renderAll();
    const ids = Array.from(document.querySelectorAll(".exercise-btn"))
      .map((btn) => btn.getAttribute("data-exercise"));
    expect(ids).toContain("pushups");
    expect(ids).toContain("squats");
    expect(ids).toContain("bench");
  });

  test("stats show zeros when no logs", () => {
    app.renderAll();
    expect(document.getElementById("stat-sets").textContent).toBe("0");
    expect(document.getElementById("stat-reps").textContent).toBe("0");
    expect(document.getElementById("stat-exercises").textContent).toBe("0");
  });

  test("stats update after logging", () => {
    const ex = app.findExercise("pushups");
    app.logExercise(ex, 15);
    expect(document.getElementById("stat-sets").textContent).toBe("1");
    expect(document.getElementById("stat-reps").textContent).toBe("15");
    expect(document.getElementById("stat-exercises").textContent).toBe("1");
  });

  test("today count badge appears on exercise button after logging", () => {
    const ex = app.findExercise("pushups");
    app.logExercise(ex);
    const btn = document.querySelector('[data-exercise="pushups"]');
    const badge = btn.querySelector(".ex-today-count");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("1");
  });

  test("recent section shows after logging", () => {
    app.renderAll(); // ensure clean render with no logs
    expect(document.getElementById("recent-section").classList.contains("hidden")).toBe(true);
    const ex = app.findExercise("pushups");
    app.logExercise(ex);
    expect(document.getElementById("recent-section").classList.contains("hidden")).toBe(false);
  });

  test("week chart renders 7 days", () => {
    app.renderAll();
    const days = document.querySelectorAll(".chart-day");
    expect(days).toHaveLength(7);
  });

  test("week chart last day is marked as today", () => {
    app.renderAll();
    const labels = document.querySelectorAll(".chart-day-label");
    const lastLabel = labels[labels.length - 1];
    expect(lastLabel.classList.contains("today")).toBe(true);
  });

  test("history view shows empty message when no logs", () => {
    app.switchTab("history");
    expect(document.getElementById("history-content").textContent).toContain("No exercises logged yet");
  });

  test("history view shows logged entries", () => {
    const ex = app.findExercise("squats");
    app.logExercise(ex, 20, 60);
    app.switchTab("history");
    const content = document.getElementById("history-content").innerHTML;
    expect(content).toContain("Squats");
    expect(content).toContain("20");
  });

  test("streak badge hidden when no streak", () => {
    app.renderAll();
    expect(document.getElementById("streak-badge").classList.contains("hidden")).toBe(true);
  });

  test("streak badge visible after logging today", () => {
    const ex = app.findExercise("pushups");
    app.logExercise(ex);
    expect(document.getElementById("streak-badge").classList.contains("hidden")).toBe(false);
  });

  test("notification shows on log", () => {
    const ex = app.findExercise("pushups");
    app.logExercise(ex);
    const notif = document.getElementById("notification");
    expect(notif.classList.contains("hidden")).toBe(false);
    expect(notif.textContent.length).toBeGreaterThan(0);
  });
});

// ─── Exercise button click opens modal ─────────────────────────

describe("exercise button interaction", () => {
  beforeEach(resetLogs);

  test("clicking an exercise button opens the modal", () => {
    app.renderAll();
    const btn = document.querySelector('[data-exercise="pushups"]');
    btn.click();
    expect(document.getElementById("custom-modal").classList.contains("hidden")).toBe(false);
    expect(app._getCurrentModalExercise().id).toBe("pushups");
    app.closeModal();
  });
});
