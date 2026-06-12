// ====== CONFIG ======

// Random question count per game (safe for API)
const MIN_QUESTIONS = 10;
const MAX_QUESTIONS = 30;

// Random time: 15–25 seconds per question
const MIN_SECONDS_PER_QUESTION = 15;
const MAX_SECONDS_PER_QUESTION = 25;

// Difficulty mapping for label and Open Trivia DB
// Docs: https://opentdb.com/api_config.php
const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", apiDifficulty: "easy" },
  medium: { label: "Medium", apiDifficulty: "medium" },
  intermediate: { label: "Intermediate", apiDifficulty: "medium" },
  hard: { label: "Hard", apiDifficulty: "hard" },
  expert: { label: "Expert", apiDifficulty: "hard" }
};




// ====== STATE ======
let quizData = [];
let currentQuestionIndex = 0;
let score = 0;
let timeLeft = 0;
let timerId = null;
let userAnswers = [];

// Important: Start as null so no button is blue by default
let selectedDifficulty = null;
// ====== DOM ELEMENTS ======
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const endBtn = document.getElementById("end-btn");
const restartBtn = document.getElementById("restart-btn");
const refreshBtn = document.getElementById("refresh-btn");
const homeBtn = document.getElementById("home-btn");

const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const currentQuestionSpan = document.getElementById("current-question");
const totalQuestionsSpan = document.getElementById("total-questions");

const timeSpan = document.getElementById("time");
const scoreText = document.getElementById("score-text");
const detailText = document.getElementById("detail-text");
const reviewContainer = document.getElementById("review-container");
const summaryBox = document.getElementById("summary-box");
const paletteContainer = document.getElementById("question-palette");

const difficultyButtons = document.querySelectorAll(".difficulty-btn");

// ====== EVENT LISTENERS ======
startBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", handleNextQuestion);
prevBtn.addEventListener("click", handlePrevQuestion);

// End quiz immediately (no confirm)
endBtn.addEventListener("click", () => endQuiz(false));

// Refresh quiz immediately (new random questions & time)
refreshBtn.addEventListener("click", () => {
  clearInterval(timerId);
  startQuiz();
});

// Home: go straight back to start screen when in quiz
homeBtn.addEventListener("click", () => {
  if (!quizScreen.classList.contains("hidden")) goHome();
});

restartBtn.addEventListener("click", restartQuiz);

// Difficulty tabs
difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedDifficulty = btn.dataset.difficulty;
    difficultyButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ====== HELPERS ======
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const textArea = document.createElement("textarea");
function decodeHTML(str) {
  textArea.innerHTML = str;
  return textArea.value;
}

function playCardEnter(card) {
  card.classList.remove("card-enter");
  void card.offsetWidth; // reflow
  card.classList.add("card-enter");
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Fetch random questions with Auto-Retry for Rate Limits
async function loadQuestions(amount, difficultyKey) {
  const cfg = DIFFICULTY_CONFIG[difficultyKey] || DIFFICULTY_CONFIG.easy;
  const diffParam = cfg.apiDifficulty
    ? `&difficulty=${encodeURIComponent(cfg.apiDifficulty)}`
    : "";

  // Helper function to fetch with retries
  const fetchWithRetry = async (retries = 1) => {
    // We add a timestamp t=${Date.now()} to ensure questions are random
    const url = `https://opentdb.com/api.php?amount=${amount}&type=multiple${diffParam}&t=${Date.now()}`;
    console.log(`[Quiz] Fetching ${amount} ${cfg.label} questions from:`, url);

    const res = await fetch(url);
    if (!res.ok) throw new Error("Check your internet connection.");

    const data = await res.json();

    // CODE 5: Rate Limit (Too many requests)
    // If this happens, we wait 5 seconds and try one more time automatically.
    if (data.response_code === 5) {
      if (retries > 0) {
        console.warn("Server busy (Rate Limit). Retrying in 5 seconds...");
        // Change button text to let user know
        if (typeof startBtn !== 'undefined') startBtn.textContent = "Please wait...";
        
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchWithRetry(retries - 1);
      } else {
        throw new Error("The quiz server is busy. Please wait 10 seconds and try again.");
      }
    }

    // CODE 1: Not enough questions (Common in 'Hard' difficulty)
    if (data.response_code === 1) {
      throw new Error(`Not enough '${cfg.label}' questions available. Try a lower difficulty.`);
    }

    // Generic API error
    if (data.response_code !== 0) {
      throw new Error(`API Error Code: ${data.response_code}`);
    }

    return data.results;
  };

  // Start the fetch
  const results = await fetchWithRetry();

  // Process the results
  const questions = results.map((q) => {
    const decodedQuestion = decodeHTML(q.question);
    const incorrect = q.incorrect_answers.map(decodeHTML);
    const correct = decodeHTML(q.correct_answer);

    const optionsWithFlag = [
      ...incorrect.map((text) => ({ text, isCorrect: false })),
      { text: correct, isCorrect: true }
    ];

    shuffle(optionsWithFlag);
    const answerIndex = optionsWithFlag.findIndex((opt) => opt.isCorrect);

    return {
      question: decodedQuestion,
      options: optionsWithFlag.map((opt) => opt.text),
      answer: answerIndex
    };
  });

  shuffle(questions);
  return questions;
}

function saveCurrentAnswer() {
  const selected = document.querySelector('input[name="option"]:checked');
  if (selected) {
    userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  } else {
    userAnswers[currentQuestionIndex] = null;
  }
}

/* ===== Question Palette ===== */
function buildQuestionPalette() {
  paletteContainer.innerHTML = "";
  if (!quizData.length) return;

  for (let i = 0; i < quizData.length; i++) {
    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.textContent = String(i + 1).padStart(2, "0");
    btn.dataset.index = i;
    btn.addEventListener("click", () => jumpToQuestion(i));
    paletteContainer.appendChild(btn);
  }
  updatePaletteStatus();
}

function updatePaletteStatus() {
  const buttons = paletteContainer.querySelectorAll(".palette-btn");

  buttons.forEach((btn, i) => {
    btn.classList.remove(
      "current",
      "answered",
      "unanswered"
    );

    if (i === currentQuestionIndex) {
      btn.classList.add("current");
    } else if (
      userAnswers[i] !== null &&
      userAnswers[i] !== undefined
    ) {
      btn.classList.add("answered");
    } else {
      btn.classList.add("unanswered");
    }
  });
}

function jumpToQuestion(targetIndex) {
  if (targetIndex < 0 || targetIndex >= quizData.length) return;
  saveCurrentAnswer();
  currentQuestionIndex = targetIndex;
  renderQuestion();
}

// ====== MAIN FLOW ======
async function startQuiz() {
  console.log(`[Quiz] Starting quiz with difficulty: ${selectedDifficulty}`);
  
  if (!selectedDifficulty) {
    alert("Please select a difficulty level first!");
    return;
  }

  const cfg = DIFFICULTY_CONFIG[selectedDifficulty] || DIFFICULTY_CONFIG.easy;
  console.log(`[Quiz] Difficulty config:`, cfg);
  const originalText = startBtn && startBtn.textContent ? startBtn.textContent : "Start Quiz";

  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = "Loading...";
  }

  const requestedCount = getRandomInt(MIN_QUESTIONS, MAX_QUESTIONS);

  try {
    quizData = await loadQuestions(requestedCount, selectedDifficulty);
  } catch (err) {
    alert(err && err.message ? err.message : "Could not load questions. Try again.");
    console.error(err);
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = originalText;
    }
    return;
  }

  if (!quizData || !quizData.length) {
    alert("No questions received. Please try again.");
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = originalText;
    }
    return;
  }

  currentQuestionIndex = 0;
  score = 0;

  const secondsPerQuestion = getRandomInt(
    MIN_SECONDS_PER_QUESTION,
    MAX_SECONDS_PER_QUESTION
  );
  timeLeft = quizData.length * secondsPerQuestion;
  if (timeSpan) timeSpan.textContent = formatTime(timeLeft);

  if (totalQuestionsSpan) totalQuestionsSpan.textContent = quizData.length;
  userAnswers = new Array(quizData.length).fill(null);
  if (reviewContainer) reviewContainer.innerHTML = "";
  if (summaryBox) summaryBox.innerHTML = "";
  if (paletteContainer) paletteContainer.innerHTML = "";

  buildQuestionPalette();
  document.body.classList.remove("showing-result");

  // Show quiz screen
  if (startScreen) startScreen.classList.add("hidden");
  if (resultScreen) resultScreen.classList.add("hidden");
  if (quizScreen) quizScreen.classList.remove("hidden");
  playCardEnter(quizScreen);

  if (homeBtn) homeBtn.classList.add("visible");

  startTimer();
  renderQuestion();

  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = originalText;
  }
}

function startTimer() {
  clearInterval(timerId);

  timerId = setInterval(() => {
    timeLeft--;
    timeSpan.textContent = formatTime(timeLeft);

    if (timeLeft <= 0) {
      timeLeft = 0;
      timeSpan.textContent = formatTime(timeLeft);
      clearInterval(timerId);
      endQuiz(true);
    }
  }, 1000);
}

function renderQuestion() {
  const currentQuestion = quizData[currentQuestionIndex];

  currentQuestionSpan.textContent = currentQuestionIndex + 1;
  questionText.textContent = currentQuestion.question;

  optionsContainer.innerHTML = "";

  currentQuestion.options.forEach((option, index) => {
    const label = document.createElement("label");
    label.classList.add("option-label");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "option";
    input.value = index;

    const span = document.createElement("span");
    span.textContent = option;

    label.appendChild(input);
    label.appendChild(span);
    optionsContainer.appendChild(label);
  });

  const saved = userAnswers[currentQuestionIndex];
  if (saved !== null && saved !== undefined) {
    const toCheck = optionsContainer.querySelector(
      `input[value="${saved}"]`
    );
    if (toCheck) toCheck.checked = true;
  }

  prevBtn.disabled = currentQuestionIndex === 0;
  nextBtn.disabled = currentQuestionIndex === quizData.length - 1;

  updatePaletteStatus();
}

function handleNextQuestion() {
  saveCurrentAnswer();
  currentQuestionIndex++;

  if (currentQuestionIndex < quizData.length) {
    renderQuestion();
  } else {
    endQuiz(false);
  }
}

function handlePrevQuestion() {
  if (currentQuestionIndex === 0) return;
  saveCurrentAnswer();
  currentQuestionIndex--;
  renderQuestion();
}

function endQuiz(endedByTimer = false) {
  clearInterval(timerId);
  saveCurrentAnswer();

  score = 0;
  quizData.forEach((q, i) => {
    if (userAnswers[i] === q.answer) score++;
  });

  const cfg = DIFFICULTY_CONFIG[selectedDifficulty] || DIFFICULTY_CONFIG.easy;

  quizScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");
  document.body.classList.add("showing-result");
  playCardEnter(resultScreen);

  const total = quizData.length;
  const unanswered = userAnswers.filter(
    (a) => a === null || a === undefined
  ).length;
  const attempted = total - unanswered;
  const incorrect = attempted - score;

  scoreText.textContent = `You scored ${score} out of ${total}.`;
  const percent = Math.round((score / total) * 100);
  detailText.textContent = `Difficulty: ${cfg.label}. That is ${percent}% correct.${
    endedByTimer ? " (Time is up!)" : ""
  }`;

  summaryBox.innerHTML = `
    <div class="summary-row">
      <span class="label">Total questions:</span>
      <span>${total}</span>
    </div>
    <div class="summary-row">
      <span class="label">Attempted:</span>
      <span>${attempted}</span>
    </div>
    <div class="summary-row">
      <span class="label">Correct:</span>
      <span>${score}</span>
    </div>
    <div class="summary-row">
      <span class="label">Incorrect:</span>
      <span>${incorrect}</span>
    </div>
    <div class="summary-row not-marked">
      <span class="label">Not marked:</span>
      <span>${unanswered} question${unanswered === 1 ? "" : "s"}</span>
    </div>
  `;

  renderReview();
}

function renderReview() {
  reviewContainer.innerHTML = "";
  let wrongCount = 0;

  quizData.forEach((q, index) => {
    const userAns = userAnswers[index];
    if (userAns === q.answer) return;

    wrongCount++;

    const item = document.createElement("section");
    item.className = "review-item";
    item.style.animationDelay = `${(wrongCount - 1) * 0.08}s`;

    const qEl = document.createElement("h2");
    qEl.className = "review-question";
    qEl.textContent = `Q${index + 1}. ${q.question}`;
    item.appendChild(qEl);

    const yourEl = document.createElement("p");
    yourEl.className = "review-answer wrong";
    const yourText =
      userAns === null || userAns === undefined
        ? "No answer selected"
        : q.options[userAns];
    yourEl.innerHTML = `<span class="label">Your answer:</span> ${yourText}`;
    item.appendChild(yourEl);

    const correctEl = document.createElement("p");
    correctEl.className = "review-answer correct";
    correctEl.innerHTML = `<span class="label">Correct answer:</span> ${
      q.options[q.answer]
    }`;
    item.appendChild(correctEl);

    reviewContainer.appendChild(item);
  });

  if (wrongCount === 0) {
    const allCorrect = document.createElement("div");
    allCorrect.className = "all-correct";
    allCorrect.textContent =
      "Perfect! You answered every question correctly. Great job.";
    reviewContainer.appendChild(allCorrect);
  }
}

function restartQuiz() {
  resultScreen.classList.add("card-leave");

  resultScreen.addEventListener(
    "animationend",
    () => {
      resultScreen.classList.add("hidden");
      resultScreen.classList.remove("card-leave");
      reviewContainer.innerHTML = "";
      summaryBox.innerHTML = "";
      startScreen.classList.remove("hidden");
      homeBtn.classList.remove("visible");
      document.body.classList.remove("showing-result");
      playCardEnter(startScreen);
    },
    { once: true }
  );
}

function goHome() {
  clearInterval(timerId);

  quizScreen.classList.add("card-leave");
  quizScreen.addEventListener(
    "animationend",
    () => {
      quizScreen.classList.add("hidden");
      quizScreen.classList.remove("card-leave");
      reviewContainer.innerHTML = "";
      summaryBox.innerHTML = "";
      paletteContainer.innerHTML = "";
      startScreen.classList.remove("hidden");
      homeBtn.classList.remove("visible");
      document.body.classList.remove("showing-result");
      playCardEnter(startScreen);
    },
    { once: true }
  );
}
