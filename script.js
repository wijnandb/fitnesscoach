let currentLevel = 1;
let setsCompleted = 0;
let totalXP = 0;
let streak = 0;

const exercises = [
  { level: 1, name: "Wall Push-ups", sets: 3, reps: 10 },
  { level: 2, name: "Incline Push-ups", sets: 3, reps: 10 },
  { level: 3, name: "Knee Push-ups", sets: 3, reps: 10 },
  { level: 4, name: "Full Push-ups", sets: 3, reps: 10 }
  // Add more levels later!
];

// Save state to localStorage
function saveProgress() {
  const progress = {
    currentLevel,
    setsCompleted,
    totalXP,
    streak
  };
  localStorage.setItem('fitnessProgress', JSON.stringify(progress));
}

// Load state from localStorage
function loadProgress() {
  const storedProgress = localStorage.getItem('fitnessProgress');
  if (storedProgress) {
    const progress = JSON.parse(storedProgress);
    currentLevel = progress.currentLevel || 1;
    setsCompleted = progress.setsCompleted || 0;
    totalXP = progress.totalXP || 0;
    streak = progress.streak || 0;
  }
}

function completeSet() {
  setsCompleted++;
  document.getElementById('progress').innerText = `Sets Completed: ${setsCompleted}/3`;

  if (setsCompleted >= 3) {
    document.querySelector('.level-up-btn').disabled = false;
    totalXP += 50;
    streak += 1;
  }
}

function levelUp() {
  if (currentLevel < exercises.length) {
    currentLevel++;
    setsCompleted = 0;
    document.querySelector('.level-up-btn').disabled = true;
    updateWorkoutScreen();
  }
}

function updateWorkoutScreen() {
  const exercise = exercises[currentLevel - 1];
  document.getElementById('level-title').innerText = `Level ${exercise.level}: ${exercise.name}`;
  document.getElementById('exercise-desc').innerText = `Do ${exercise.sets} Sets of ${exercise.reps} Reps Today`;
  document.getElementById('progress').innerText = `Sets Completed: ${setsCompleted}/${exercise.sets}`;
}

function showWorkout() {
  document.getElementById('workout-screen').classList.remove('hidden');
  document.getElementById('levels-screen').classList.add('hidden');
  document.getElementById('profile-screen').classList.add('hidden');
  updateWorkoutScreen();
}

function showLevels() {
  const levelsList = document.getElementById('levels-list');
  levelsList.innerHTML = '';
  exercises.forEach(ex => {
    let status = ex.level === currentLevel ? '🔥 You are here!' :
                 ex.level < currentLevel ? '✅' : '🔒';
    const li = document.createElement('li');
    li.innerText = `Level ${ex.level}: ${ex.name} ${status}`;
    levelsList.appendChild(li);
  });

  document.getElementById('workout-screen').classList.add('hidden');
  document.getElementById('levels-screen').classList.remove('hidden');
  document.getElementById('profile-screen').classList.add('hidden');
}

function showProfile() {
  document.getElementById('profile-level').innerText = `Current Level: ${currentLevel}`;
  document.getElementById('profile-xp').innerText = `Total XP: ${totalXP}`;
  document.getElementById('profile-streak').innerText = `Streak: ${streak} days`;

  document.getElementById('workout-screen').classList.add('hidden');
  document.getElementById('levels-screen').classList.add('hidden');
  document.getElementById('profile-screen').classList.remove('hidden');
}

function completeSet() {
  setsCompleted++;
  document.getElementById('progress').innerText = `Sets Completed: ${setsCompleted}/3`;

  if (setsCompleted >= 3) {
    document.querySelector('.level-up-btn').disabled = false;
    totalXP += 50;
    streak += 1;
  }

  saveProgress(); // Save after completing a set
}

function levelUp() {
  if (currentLevel < exercises.length) {
    currentLevel++;
    setsCompleted = 0;
    document.querySelector('.level-up-btn').disabled = true;
    updateWorkoutScreen();
  }

  saveProgress(); // Save after leveling up
}

loadProgress();
showWorkout(); // Render the workout screen with loaded data

