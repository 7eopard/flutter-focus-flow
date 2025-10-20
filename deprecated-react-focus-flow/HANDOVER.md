> 阅读简体中文版本: [产品交接文档 (HANDOVER.zh-hans.md)](./HANDOVER.zh-hans.md)

# Product Handover: Pomodoro Productivity Hub

This document outlines the core "Design Pillars" of the application. These pillars explain the rationale behind the unique user experience, connecting our design choices to established productivity and cognitive science concepts.

> For a guide on how to use the application's features from an end-user perspective, please see the **[User Manual (README.md)](./README.md)**.

## Design Pillar 1: Adaptive Focus & Intrinsic Motivation

-   **The Design Priority:** To move beyond rigid, one-size-fits-all timers. Our primary goal was to create a system that adapts to the user's natural work rhythm and promotes sustained focus through positive reinforcement, not interruption.
-   **The Rationale (The 'Why'):** Standard Pomodoro timers can be counter-productive by breaking a user's state of "flow" and failing to accommodate deep work. Our design is rooted in **Goal-Setting Theory** and principles of **intrinsic motivation**: users are more engaged when they work towards self-set goals and are rewarded for their effort.
-   **Key Features Implementing This Pillar:**
    1.  **Minimum Focus Goal:** This is the core mechanism. It transforms the session from a passive countdown into an active pursuit of a personal target.
    2.  **Dynamic Break Accrual:** This is the reward system. Instead of a fixed break, users *earn* their rest, directly linking longer focus with a tangible reward. This encourages users to continue when they are in a state of flow.

## Design Pillar 2: Mindful Transitions Between States

-   **The Design Priority:** To treat the moments of transition—from work to rest and back—as critical parts of the productivity cycle that require conscious user action.
-   **The Rationale (The 'Why'):** Cognitive science shows that abrupt context switches lead to "attention residue," where the mind is still on the previous task, making rest less effective. Our design aims to create clear mental boundaries by requiring deliberate, physical-feeling gestures.
-   **Key Features Implementing This Pillar:**
    1.  **Long-Press to Break:** This is a deliberate, sustained action, not an accidental click. The progress bar filling up creates a moment of commitment, forcing the user to consciously acknowledge, "I am now choosing to end my focus session," which aids mental closure.
    2.  **Drag Knob to Drop Zone:** This interaction serves as a small ritual. By physically dragging the knob to a target, the user makes a strong pre-commitment to a defined goal and an immediate, earned break, reinforcing the work-reward cycle.

## Design Pillar 3: An Unobtrusive, Immersive Focus Environment

-   **The Design Priority:** The tool itself must never be the source of distraction. The interface should provide essential information gracefully and fade into the background during deep work.
-   **The Rationale (The 'Why'):** Minimizing cognitive load is paramount for maintaining focus. The user's mental energy should be spent on their task, not on deciphering or fighting with the tool.
-   **Key Features Implementing This Pillar:**
    1.  **Dual-View "Glance" Feature:** This feature acknowledges that users need different types of temporal information, allowing frictionless access to different contexts without a disruptive mode change.
    2.  **Zen Mode:** The most direct implementation of this pillar, removing all non-essential UI elements.
    3.  **Organic, Non-Repetitive Audio:** The soundscape is designed to be a non-intrusive background element that can be *felt* more than actively *heard*, avoiding auditory fatigue over long sessions.

## Design Pillar 4: Nostalgic Fidelity & User Agency

-   **The Design Priority:** To offer an alternative, "low-fi" experience that acts as an antidote to modern, visually-saturated interfaces. The goal is to maximize focus by minimizing stimulus and maximizing user control.
-   **The Rationale (The 'Why'):** The "Legacy Phone Mode" is more than a theme; it's a tool for **digital detox**. By simulating the constraints and simplicity of older technology, it removes distracting animations and complex graphics. This philosophy is rooted in the idea that giving users fine-grained **agency** over their digital environment (e.g., controlling animation speed down to the frame) fosters a more deliberate and conscious interaction with the tool.
-   **Key Features Implementing This Pillar:**
    1.  **Legacy Phone Mode:** A self-contained, text-based UI that intentionally limits features to the bare essentials of time-keeping.
    2.  **Granular Animation Control:** Users can set the animation frame rate from 8 FPS down to 0 (static text), or even -1 (a classic blinking colon). This hands ultimate control over motion back to the user.
    3.  **Text-Based Progress & Unstyled Controls:** Progress bars are rendered with block characters, and buttons use native browser styling. This ensures maximum compatibility and embraces a minimalist aesthetic that reduces cognitive load.

## Design Pillar 5: From To-Do List to Actionable Workflow

-   **The Design Priority:** To evolve the simple checklist into a system that mirrors real-world, often chaotic, workflows by handling task decomposition, unforeseen dependencies, and list hygiene.
-   **The Rationale (The 'Why'):** Knowledge work is rarely linear. Plans change, tasks are more complex than they first appear, and dependencies emerge *during* execution, not just during planning. A productivity tool must be designed for this "messy reality," offering flexibility without imposing the heavy overhead of formal project management methodologies.
-   **Key Features Implementing This Pillar:**
    1.  **Subtasks:** This feature directly acknowledges that tasks often have hidden complexity. It allows users to break down large, intimidating goals into small, actionable steps, a core principle of **Getting Things Done (GTD)**.
    2.  **Lightweight Dependencies ("Blocked By"):** This is a direct response to the reality of "in-execution discovery." We explicitly rejected complex project dependencies (like Start-to-Start) in favor of a simple, intuitive Finish-to-Start model. This allows users to instantly capture an emergent prerequisite without breaking their flow, turning a moment of interruption into a structured plan.
    3.  **Task Archiving:** This provides a crucial outlet for "list rot" and cognitive clutter. By allowing users to move irrelevant or completed tasks out of sight without permanent deletion, it supports the psychological need for a clean, focused workspace while preserving a complete history of work. This is essential for long-term usability and mental clarity.