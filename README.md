# 🖥️ Deadlock Detection & Recovery Simulator

NOTE : I STRONGLY SUGGEST YOU TO DOWNLOAD THE ZIP FILE TO LOAD THIS APPLICATION IN YOUR LAPTOPS , PC . 

An interactive **Operating Systems Deadlock Detection and Recovery Simulator** designed to bridge the gap between theoretical OS concepts and practical visualization.

The simulator allows users to create and modify multi-process, multi-resource system states and observe how **Banker's Algorithm**, **Resource Allocation Graph (RAG) cycle detection**, and different **deadlock recovery strategies** behave in real time.

---

## 🚀 Overview

Deadlocks are one of the fundamental problems in Operating Systems where a set of processes become permanently blocked because each process is waiting for resources held by another process.

This project provides a visual and interactive environment for understanding:

* Resource allocation
* Maximum resource requirements
* Remaining resource needs
* Safe and unsafe system states
* Deadlock detection using Resource Allocation Graphs
* Circular wait and dependency cycles
* Dynamic resource requests
* Deadlock recovery
* System snapshots and rollback
* Configuration persistence

Instead of only displaying algorithmic output, the simulator lets users **experiment with system states and immediately observe the results**.

---

## ✨ Features

### 🔵 Banker's Algorithm

Performs a complete system safety check using the Banker's Algorithm.

The simulator:

* Calculates the `Need` matrix automatically
* Evaluates whether available resources can satisfy process requirements
* Simulates resource allocation
* Generates a safe sequence when one exists
* Identifies unsafe states when no complete safe sequence can be found
* Displays algorithm activity through the live terminal

The Need matrix is calculated using:

```text
Need = Maximum - Allocation
```

---

### 🟡 Resource Allocation Graph & Deadlock Detection

The simulator constructs a directed **Resource Allocation Graph (RAG)** using:

* Resource → Process edges for allocated resources
* Process → Resource edges for active resource requests

A **Depth-First Search (DFS)** based cycle-detection mechanism is used to identify circular dependencies.

The interface visually highlights the nodes and edges involved in detected cycles.

Complexity:

```text
DFS Cycle Detection: O(V + E)
```

---

### 🔴 Deadlock Recovery

Once a deadlock is detected, the simulator provides multiple recovery strategies:

#### Abort

Terminates a selected process involved in the deadlock and releases its resources.

#### Victim Selection

Selects a suitable process as a victim and removes it to help break the deadlock.

#### Resource Preemption

Reclaims resources from selected processes to restore system progress.

These strategies demonstrate how Operating Systems can recover from an already-established deadlock.

---

### 🟢 Dynamic Resource Requests

Users can enter resource requests for individual processes.

The simulator validates requests against:

```text
Request ≤ Need
Request ≤ Available
```

The request is then evaluated for system safety before being accepted.

This allows users to experiment with different allocation scenarios without manually calculating every step.

---

### 📊 Live System Matrices

The interface provides editable and automatically calculated representations of:

* Allocation Matrix
* Maximum Claim Matrix
* Available Vector
* Current Request Matrix
* Need Matrix

Changing an input immediately updates the system state.

---

### 🎯 Preset Scenarios

The simulator includes predefined scenarios for quickly demonstrating:

* SAFE state
* UNSAFE state
* DEADLOCK state

This makes the project particularly useful for:

* OS laboratory demonstrations
* Classroom presentations
* Mini-project evaluations
* Algorithm experimentation

---

### 💾 Snapshots & Rollback

The simulator supports system-state snapshots.

Users can:

1. Save the current system state
2. Experiment with allocations or recovery
3. Roll back to the previous saved state

This makes experimentation safer and easier.

---

### 📂 JSON Import / Export

System configurations can be exported as JSON files and imported later.

This allows users to save custom scenarios and reproduce experiments.

---

### 📄 PDF Report Generation

The simulator can generate a professional report containing information about the current simulation state.

This can be useful for:

* OS laboratory submissions
* Project documentation
* Demonstrations
* Experiment records

---

### 🌙 Light & Dark Mode

The interface includes both dark and light themes.

The default design uses a modern glassmorphism/neon-inspired interface while maintaining a dedicated light mode.

---

### 🎓 Tutorial / Academic Mode

The interface includes contextual tooltips containing:

* Algorithm descriptions
* OS formulas
* Complexity information
* Explanations of system matrices
* Guidance for simulator controls

This makes the application suitable not only as a demonstration tool but also as a learning aid.

---

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)

### Backend / Local Server

* Node.js
* Express.js

### Fonts

* Outfit
* JetBrains Mono

### Architecture

The project uses a lightweight client-side simulation architecture with an Express server used to serve the application locally.

No database is required.

---

## 📁 Project Structure

```text
deadlock-detection-recovery-simulator/
│
├── index.html
├── simulator.js
├── style.css
│
├── server.js
├── package.json
├── package-lock.json
│
├── Deadlock_Simulator_Documentation.ipynb
├── Future_Enhancements.ipynb
├── generate_nb.py
│
├── start_server.bat
└── README.md
```

> `node_modules/` should not be committed to GitHub. It is generated automatically using `npm install`.

---

# 🚀 Getting Started

## Prerequisites

Make sure you have installed:

* Node.js
* npm
* Git

You can verify the installation with:

```bash
node --version
npm --version
git --version
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/deadlock-detection-recovery-simulator.git
```

Move into the project directory:

```bash
cd deadlock-detection-recovery-simulator
```

---

## 2. Install Dependencies

Run:

```bash
npm install
```

This installs the required Node.js dependencies from `package.json`.

---

## 3. Start the Simulator

Run:

```bash
npm start
```

The server will start on:

```text
http://localhost:3000
```

Open that address in your browser.

---

## ⚡ Development Mode

For development with automatic server restarting:

```bash
npm run dev
```

---

## 🪟 Windows Shortcut

Windows users can also use:

```text
start_server.bat
```

to start the local server.

---

# 🧪 How to Use the Simulator

## Step 1 — Examine the System Matrices

The simulator initially loads a predefined multi-process, multi-resource configuration.

You can inspect:

* Allocation
* Maximum Claim
* Available
* Current Requests
* Need

---

## Step 2 — Run Banker's Algorithm

Click:

```text
BANKER'S
```

The simulator evaluates the current system state.

If all processes can eventually complete, a **Safe Sequence** is displayed.

If no complete sequence exists, the system is reported as **Unsafe**.

---

## Step 3 — Detect Deadlock

Enter or modify active resource requests and click:

```text
DETECT
```

The simulator constructs the Resource Allocation Graph and performs DFS-based cycle detection.

Detected cycles are visually represented in the graph.

---

## Step 4 — Experiment With Recovery

If a deadlock is detected, recovery controls become available.

Try:

```text
ABORT
VICTIM
PREEMPT
```

Observe how releasing or reclaiming resources changes the system state.

---

## Step 5 — Test Resource Requests

Use the **Dynamic Resource Request** section to simulate a process requesting additional resources.

The simulator checks whether granting the request would maintain a safe state.

---

## Step 6 — Save a Scenario

Use:

```text
SAVE
```

to create a checkpoint.

You can then experiment freely.

Use:

```text
BACK
```

to return to the saved state.

---

## Step 7 — Export Your Configuration

Use the JSON export control to save the current simulation configuration.

The exported configuration can later be imported into the simulator.

---

## Step 8 — Generate a Report

Use:

```text
PDF
```

to generate a report of the current simulation state.

---

# 🧠 Algorithms Implemented

## 1. Banker's Algorithm

The simulator uses the standard safety-check procedure:

```text
Need[i][j] = Max[i][j] - Allocation[i][j]
```

The algorithm repeatedly searches for a process whose remaining requirements can be satisfied by the currently available resources.

When a process can finish:

```text
Work = Work + Allocation[i]
```

The process is added to the safe sequence.

If every process can finish, the system is safe.

Otherwise, the state is unsafe.

---

## 2. Resource Allocation Graph

The simulator represents resource relationships using a directed graph.

### Allocation Edge

```text
Resource → Process
```

represents a resource currently allocated to a process.

### Request Edge

```text
Process → Resource
```

represents a process waiting for a resource.

A cycle in the resulting graph can indicate a circular wait and, under the appropriate resource conditions, a deadlock.

---

## 3. DFS Cycle Detection

The simulator uses:

```text
Depth-First Search
```

to traverse the Resource Allocation Graph.

The algorithm maintains:

* Visited nodes
* Current recursion stack
* Nodes participating in cycles
* Edges participating in detected cycles

Complexity:

```text
O(V + E)
```

where:

* `V` = number of graph vertices
* `E` = number of graph edges

---

# 📈 Complexity

| Operation                   | Complexity                              |
| --------------------------- | --------------------------------------- |
| Need Matrix Calculation     | O(P × R)                                |
| Banker's Safety Check       | O(P² × R)                               |
| RAG Construction            | O(P × R)                                |
| DFS Cycle Detection         | O(V + E)                                |
| Resource Request Validation | O(R)                                    |
| Resource Preemption         | Depends on affected resources/processes |

Where:

* `P` = number of processes
* `R` = number of resource types
* `V` = number of RAG vertices
* `E` = number of RAG edges

---

# 🎓 Educational Objectives

This project was developed to demonstrate practical understanding of the following Operating Systems concepts:

* Deadlock
* Deadlock prevention and avoidance
* Deadlock detection
* Deadlock recovery
* Banker's Algorithm
* Safe and unsafe states
* Resource Allocation Graphs
* Circular wait
* Resource requests
* Process-resource relationships
* Resource preemption
* Process termination

The primary goal is to transform traditionally mathematical OS algorithms into an interactive visual simulation.

---

# 🔮 Future Enhancements

Potential improvements include:

* Support for larger numbers of processes and resources
* Step-by-step Banker’s Algorithm execution
* More advanced victim-selection policies
* Additional deadlock detection algorithms
* Simulation history and playback
* Persistent browser storage
* Multi-user scenario sharing
* Performance benchmarking
* More detailed algorithm visualizations
* Mobile-responsive optimization
* Additional export formats

---

# 📚 Documentation

Additional project documentation is included in the repository:

```text
Deadlock_Simulator_Documentation.ipynb
Future_Enhancements.ipynb
```

These notebooks provide supporting technical and project documentation.

---

# 🤝 Contributing

Contributions are welcome.

To contribute:

```bash
git fork
```

Create a new branch:

```bash
git checkout -b feature/your-feature
```

Make your changes and commit them:

```bash
git add .
git commit -m "Add your feature"
```

Push the branch:

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 📜 License

This project is intended primarily for educational and academic purposes.

---

## 👨‍💻 Project

**Deadlock Detection & Recovery Simulator**

Operating Systems Mini Project
Academic Session 2025–2026

Built to make Operating Systems deadlock concepts **interactive, visual, and easier to understand.**

---
