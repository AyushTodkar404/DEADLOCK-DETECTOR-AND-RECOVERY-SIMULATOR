<div align="center">
  <img src="assets/deadlocklab_logo_v2.jpg" alt="DEADLOCKLAB Logo" width="130" style="border-radius: 20px; box-shadow: 0 0 25px rgba(14, 165, 233, 0.4);">
  <h1>DEADLOCKLAB</h1>
  <p><strong>Operating Systems Deadlock Detection & Recovery Workbench</strong></p>
  <p><em>Don Bosco Institute of Technology (DBIT), Kurla — Academic Session 2025–2026</em></p>
</div>

---

## 🚀 Overview

An interactive, high-fidelity Operating Systems simulator built to visualize, analyze, step through, and resolve deadlock scenarios across single-instance and multi-instance resource environments. Developed for academic excellence at **Don Bosco Institute of Technology (DBIT), Kurla**.

---

## ✨ Core Features & Algorithmic Rigor

- **Banker's Safety Algorithm ($O(m \times n^2)$)**: Full vector safety check calculating Need = Max - Allocation, testing Work vector satisfiability, and determining valid safe execution sequences.
- **Multi-Instance Reduction & Single-Instance Cycle Detection**:
  - **Single-Instance Systems**: Uses Depth First Search (DFS, $O(V+E)$) on the Resource Allocation Graph (RAG) where a cycle is necessary and sufficient for deadlock.
  - **Multi-Instance Systems**: Uses Silberschatz reduction with Work & Finish vectors. Distinguishes harmless cycles (where unblocked processes finish and release instances) from true deadlocks.
- **Interactive Stepper Engine & Sandbox**:
  - **Step Next (`⏭`)**: Walk step-by-step through each decision branch of Banker's or Deadlock detection.
  - **Auto Play (`▶`)**: Hands-free sequential playback with live node highlights.
  - **Random Chaos Mode (`🎲`)**: Generates balanced or entangled randomized configurations to test your intuition.
- **Tactile Audio Haptics**: Native zero-dependency Web Audio synthesiser providing audio feedback on step transitions, safe sequence discoveries, and deadlock warnings.
- **5 Academic Scenario Presets**:
  1. *Textbook Safe State (Banker's)* — Classic 5-process, 3-resource safe state.
  2. *Circular Wait (True Deadlock)* — Mutual circular blocking between $P_0$ and $P_1$.
  3. *Multi-Instance Harmless Cycle (Safe!)* — Directed cycle in RAG where multi-instance release prevents deadlock.
  4. *Resource Starvation (Unsafe State)* — Available pool insufficient to fulfill any process's maximum claim.
  5. *Dining Philosophers (4-Node Cycle)* — Classic 4-process, 4-resource circular wait deadlock.
- **Deadlock Recovery Strategies**:
  - **Abort All**: Drastic termination of all entangled processes.
  - **Victim Selection**: Terminate lowest-priority process.
  - **Resource Preemption**: Reclaim instances with rollback support.
- **Keyboard Shortcuts**:
  - `Space` — Toggle Stepper Auto-Play / Pause
  - `ArrowRight` / `N` — Step Next
  - `S` — Load Safe State preset
  - `D` — Load Deadlock preset
  - `U` — Load Unsafe preset
  - `R` — Reset Simulator
  - `Escape` — Close any active modal dialog
- **OWASP Compliant & Universal Port**:
  - Express server configured with `process.env.PORT || 3000`.
  - Security headers enforced: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 🛠️ Technology Stack

- **Structure**: Semantic HTML5 with ARIA dialog roles and accessible toolbars
- **Styling**: Modern CSS3 (Dark/Light workbench theme, responsive grid, zero AI slop, WCAG AA text contrast)
- **Logic**: Vanilla ES6+ JavaScript with SVG DOM manipulation and Web Audio API
- **Backend**: Node.js & Express.js with OWASP security headers

---

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm start
   ```
3. Open in your browser:
   ```
   http://localhost:3000
   ```

---

## 👨‍💻 Project Team (DBIT Kurla — COMPS Semester 4)

- **Ayush Todkar** (Roll No: 57 | COMPS B | Batch C)
- **Yahiya Siddiqui** (Roll No: 49 | COMPS B | Batch C)
- **Kajal Shetty** (Roll No: 43 | COMPS B | Batch B)

*Mini Project 3 — Operating Systems Laboratory (2025–2026)*
