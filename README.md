# DEADLOCK-DETECTOR-AND-RECOVERY-SIMULATOR..

https://deadlock-visualizer.onrender.com 

# DEADLOCKSIM — Deadlock Detection & Recovery Simulator

**DEADLOCKSIM** is an interactive Operating Systems laboratory and deadlock simulation platform designed to visualize, analyze, detect, and recover from resource-allocation deadlocks.

The simulator represents processes and resources through a dynamic **Resource Allocation Graph (RAG)** while simultaneously exposing the underlying system matrices used by classical deadlock algorithms.

Users can experiment with different process/resource configurations, modify allocation and maximum-claim matrices, generate potential demand through the Need Matrix, issue dynamic resource requests, and observe how the system's safety state changes.

## Core Capabilities

### System Matrices

The simulator provides editable system matrices including:

* Allocation Matrix
* Maximum Claim (MAX) Matrix
* Need Matrix / Potential Demand
* Available/Resource state information

The Need Matrix is derived from the relationship between maximum claims and current allocations.

### Resource Allocation Graph

The simulator visually represents:

* Processes
* Resources
* Resource allocations
* Resource requests

The graph provides a visual representation of the current resource-allocation state, allowing users to understand how processes and resources interact.

### Banker's Algorithm

The simulator includes Banker's Algorithm functionality for analyzing whether the current resource state is safe.

It can determine:

* Whether the system is safe
* Whether a safe sequence exists
* The safe sequence of processes
* Resource utilization
* Effects of resource requests on system safety

Example:

```text
SYSTEM IS SAFE

SAFE SEQUENCE FOUND

P1 → P3 → P4 → P0 → P2
```

### Deadlock Detection

The simulator provides a dedicated detection mechanism for identifying potentially unsafe/deadlocked states.

The interface distinguishes system states and provides visual feedback about the current condition.

### Dynamic Resource Requests

Users can select a process and submit a dynamic resource request.

This allows experimentation with questions such as:

* Can the process receive the requested resources?
* Would granting the request preserve system safety?
* What happens to the system state after the request?
* Does the request create an unsafe condition?

### Recovery Simulation

DEADLOCKSIM includes recovery-oriented controls for experimenting with different deadlock recovery strategies, including:

* Abort
* Victim selection
* Preemption

These controls allow users to study how different recovery strategies can alter the resource-allocation state.

### Presets

The simulator provides predefined configurations so users can quickly load different system states without manually entering every matrix value.

### Execution Logs

The simulator maintains an execution log that records important simulator events and actions, allowing users to follow what happened during an experiment.

### Resource Utilization

The system displays utilization information for individual resources, including:

* Current allocation
* Total resource capacity
* Utilization percentage

This provides an additional view of system resource consumption.

### Save / Load / Reset

The interface includes controls for:

* Saving simulator state
* Loading previously saved state
* Resetting the simulator
* Returning to previous states/views where supported

## Educational Purpose

DEADLOCKSIM is designed to make Operating Systems deadlock concepts more interactive than traditional matrix-based calculations.

Instead of only calculating a safe sequence on paper, users can observe the relationship between:

```text
Processes
     ↓
Resource Allocation
     ↓
Allocation / Maximum / Need
     ↓
Resource Allocation Graph
     ↓
Banker's Algorithm
     ↓
Safety Analysis
     ↓
Detection
     ↓
Recovery
```

The project therefore combines **algorithmic computation, graphical visualization, and interactive simulation** into a single Operating Systems learning environment.

## Technology / Architecture

The implementation should preserve the project's existing architecture and technologies.

Do not replace the current implementation merely for the sake of introducing another framework or library.

The simulator's core priority is correctness of:

* Resource allocation calculations
* Matrix relationships
* Safe-state analysis
* Safe-sequence generation
* Deadlock detection
* Dynamic resource requests
* Recovery simulation
* Graph visualization
