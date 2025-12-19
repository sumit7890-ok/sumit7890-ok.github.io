# 🎮 Quiz Arcade

**Quiz Arcade** is a tiny web arcade for your brain.  
It’s a single‑page quiz experience designed to feel more like a mini‑game than a form: soft gradients, floating shapes, a retro pixel title, and a timer that quietly pushes you to move.

When you open it, the flow is intentionally simple:

1. **Soak in the hero screen** – the “QUIZ ARCADE” title, a small aesthetic quote, and a floating question‑mark orb that sets the tone.
2. **Pick your mood** – Easy, Medium, or Hard. Each difficulty lights up with a gentle glow when selected.
3. **Hit “Start Quiz”** – questions stream in from Open Trivia DB and a timer starts running in the background.
4. **Play your run** – answer, jump around with the palette, change your mind, or just let the timer guide your pace.
5. **Submit from anywhere** – on the last question the “Next” button becomes “Submit”. Whether you reach it via Next or by clicking a number, the behaviour stays consistent.
6. **Study the result** – the app doesn’t just tell you a score; it breaks your run into totals, attempts, correctness, and a scrollable list of only the questions you missed.

---

## ✨ What this project is really about

> It’s less “just a quiz” and more a small demo of **how I think about UI, UX and state in vanilla JavaScript**.

**Interaction design**

- 🎚 **Difficulty selection**  
  - Buttons behave like game modes: subtle hover, animated active state, and the ability to deselect a mode by clicking it again.
- ⏱ **Responsive timer**  
  - Total time scales with the number of questions.  
  - Calm **green** state while you have breathing room, automatic **red** state under 45 seconds to create a gentle sense of urgency.
- 🧭 **Question palette**  
  - Each question gets a tiny pill: current, answered, or unanswered.  
  - You can always jump directly to any question; your selection is remembered as you move.
- 🔁 **Navigation logic**  
  - “Next” becomes **“Submit”** only on the final question.  
  - That logic is index‑safe (no out‑of‑range bugs) and works even if you reach the last question via the palette.

**Result experience**

- 📊 **Clear breakdown**  
  - Total questions, Attempted, Correct, Incorrect, Not marked — calculated from the same state that powered the quiz.  
  - Handles corner cases (for example: submitting without answering anything gives 0 attempted / 0 incorrect, not negative values).
- 🔍 **Focused review**  
  - Only wrong or skipped questions are listed, so the review view is compact and meaningful.  
  - Each card clearly separates your answer and the correct answer.

**Visual details**

- 🎨 **Pastel arcade aesthetic**  
  - Floating background blobs, soft shadows, pixel “QUIZ ARCADE” title.
- 💡 **Glowing states**  
  - Selected difficulty modes and primary buttons use layered shadows to suggest depth and activity without being loud.
- 📱 **Responsive layout**  
  - On mobile, the layout collapses into a clean vertical flow: the orb sits above the title, buttons expand, and the quiz/result remain comfortable to use with one thumb.

---

## 🧠 Under the hood

Even though the UI feels “gamey”, the implementation is intentionally minimal:

- **HTML** – one page (`index.html`) with three logical screens (start / quiz / result) controlled by classes.
- **CSS** –  
  - Flexbox and Grid for structure  
  - Custom keyframe animations for the floating orb and subtle card entrance  
  - Media queries tuned so the interface stays readable and clickable on phones
- **JavaScript** –  
  - Pure vanilla, no frameworks  
  - Handles:
    - difficulty selection & toggle  
    - fetching questions from **Open Trivia DB**  
    - keeping quiz state (current index, user answers, score)  
    - timer tick + color changes  
    - palette sync  
    - clean result computation & review rendering

---

## 💬 Why I built this

I wanted a project that:

- Stays **small enough to read in one sitting**, but  
- Still shows how I handle:
  - UI polish  
  - edge cases  
  - user‑driven navigation  
  - and a bit of animation and theming.

If you’re viewing this as an interviewer or reviewer, I’d recommend:

- Browsing the **`script.js`** file for the state / timer / palette logic.  
- Skimming **`style.css`** to see how the aesthetic and responsive layout are built from scratch.  
- Simply **playing one full run** — the experience from selecting a mode to reading your mistakes is the core of the project.