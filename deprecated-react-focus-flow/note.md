# 1. Technical Note: Debugging the Tooltip Visibility and Cursor Bug

**Date:** 2025-09-15

This document outlines the root cause analysis and solution for a recurring, hard-to-reproduce bug affecting the application's tooltips.

## 1.1. Symptoms

Users reported two primary, related issues, most frequently on tooltips attached to disabled settings items:

1.  Intermittent Visibility: The tooltip would often fail to appear on hover or focus, with no clear pattern.
2.  Incorrect Cursor: When the tooltip failed to appear, hovering over the info icon (`?`) would incorrectly display a text-selection (I-beam) cursor instead of the expected help (`?`) cursor.

## 1.2. Root Cause Analysis

Initial investigations focused on positioning logic and React Portals, which solved clipping issues but not the core bug. The final analysis revealed two interacting root causes:

### 1.2.1. Cause A: Pointer Event Interception by a "Ghost" Element

The primary cause of the incorrect cursor was how the tooltip was being "hidden." The logic only set `opacity: 0` on the tooltip element.

-   An element with `opacity: 0` is invisible but remains fully interactive and part of the document layout.
-   This "ghost" tooltip element was positioned directly on top of the trigger (`?`) button.
-   When the user hovered over the button, they were actually hovering over the invisible tooltip `div`.
-   Because this `div` contained text nodes, the browser's default behavior was to show the text-selection cursor, overriding the `cursor: help` style on the button underneath.

### 1.2.2. Cause B: Race Condition in Positioning Logic

The intermittent visibility was caused by a race condition between the React component rendering and the layout effect used to calculate its position.

-   The tooltip is rendered into a React Portal, and its content can be dynamic, resulting in a variable `width` and `height`.
-   The `useLayoutEffect` hook that calculated the tooltip's `top` and `left` positions would sometimes execute *before* the browser had painted the tooltip's content.
-   In these cases, `tooltipRef.current.offsetWidth` would return `0`.
-   The positioning logic, receiving a size of `0`, would calculate an incorrect position (often `top: -9999px`) and would not be re-triggered, leaving the tooltip permanently off-screen.

## 1.3. Solution Implemented

A comprehensive solution was implemented in the `useTooltipPositioning` hook to address both root causes.

### 1.3.1. Solution for Pointer Events

The hook's logic was updated to manage the `pointer-events` CSS property directly.
-   When the tooltip is **visible**, its style includes `pointer-events: 'auto'`.
-   When the tooltip is **hidden**, its style is explicitly set to `pointer-events: 'none'`. This makes the element "click-through," allowing the cursor and mouse events to correctly interact with the elements behind it.

### 1.3.2. Solution for Race Condition

To solve the sizing race condition, the hook now leverages a `ResizeObserver`.
-   The `ResizeObserver` is attached to the tooltip element.
-   It only triggers the `calculateAndSetPosition` function when the browser reports that the tooltip's size has changed (i.e., after its content has been rendered and it has a non-zero bounding box).
-   This transforms the positioning from an imperative "guess" into a reactive, event-driven system that only runs when it has the correct data, guaranteeing accurate placement.

## 1.4. Key Takeaways

-   Hiding vs. Disabling Interaction: When hiding an element that overlays other interactive elements, setting `opacity: 0` is insufficient. `pointer-events: none` is mandatory to prevent "ghost" element bugs.
-   Dynamic Element Positioning: For dynamically-sized elements (especially those in portals), do not rely on a single `useLayoutEffect` for positioning. A `ResizeObserver` provides a far more robust and reliable method to avoid race conditions by ensuring measurements are only taken *after* the element has a physical size in the layout.

---

# 2. Technical Note: Architectural Evolution of the Responsive Main Time Display

**Date:** 2025-09-17

This document documents the technical architecture evolution, core technical challenges, and final solution adopted to resolve the responsive layout issues of the main digital time display. This is not just a bug fix, but a summary of a deep practical application of modern CSS layout techniques.

## 2.1. Symptoms

-   PC (Small Window): In wide and short PC windows, the main time display was too large relative to the clock face, overflowing its container and obscuring the "3" and "9" markers.
-   PC (Fullscreen): The relative size of the numbers to the dial was inconsistent, sometimes appearing too large or too small.
-   Mobile: The numbers were too small relative to the dial, failing to make full use of the available space.
-   Core Problem: The layout behavior was inconsistent and unpredictable across different viewport sizes and aspect ratios.

## 2.2. Root Cause Analysis

The problem stemmed from attempting to control a component with complex internal constraints using a single, global CSS rule, leading to a mismatch between the **reference baseline** and the **scaling logic** at different levels.

1.  Incorrect Reference Baseline: Initially, the number scaling was based on the entire **viewport** (`vw`, `vmin`), while its visual parent container (the dial) had its own size constraints (like `max-width`), causing them to scale out of sync.
2.  Incorrect Logic Hierarchy: Even after introducing container queries (`cqw`), the initial reference was the entire dial's outer container. This was logically flawed because it didn't account for the inner safe area required by the ring's thickness and markers, resulting in an oversized font size calculation.
3.  Limitations of a "One-Size-Fits-All" Strategy: After introducing a "picture-in-picture" safe area, we set a fixed ratio for it (e.g., `width: 70%`). This solved the overflow on PCs but unnecessarily constrained the content space on mobile devices where overflow was not a risk.

## 2.3. Incorrect Directions and Attempts

-   **Attempt 1: Mixing Viewport Units (`vw` vs `vmin`)**
    -   Method: Used `vmin` for the dial and `vw` for the numbers.
    -   Failure: In wide, short windows, `vmin` was determined by height (becoming small), while `vw` was determined by width (remaining large), causing a proportional imbalance.

-   **Attempt 2: Unified `vmin` Units + `clamp()` Function**
    -   Method: Both dial and numbers used `vmin` as the scaling baseline, with `clamp()` to limit the number size.
    -   Failure: The scaling behaviors were not synchronized. The dial had linear scaling with a hard `max-width` limit, whereas `clamp()` has its own non-linear scaling range and independent limits. The two could not sync up when they reached their respective thresholds, again causing imbalance.

-   **Attempt 3: Flawed Container Query Application**
    -   Method: Set the entire dial as the container and used `cqw` for the numbers.
    -   Failure:
        1.  The reference container was too large, not accounting for internal padding, which made the calculated `cqw` value too big.
        2.  The sum of the `cqw` widths for the internal elements (digits, symbols) exceeded `100cqw`, a mathematical overflow.

## 2.4. The Correct Solution

The final robust solution is a **Hybrid Architecture** combining multiple modern CSS techniques, correctly designed at the **structural, scaling, and adaptive** levels.

-   Structural Level - "Picture-in-Picture" DOM Structure:
    -   Separation of Concerns: The DOM was refactored into two layers. An outer `div` (`.timer-content-positioner`) is **solely responsible for positioning and defining the safe area's size**. An inner `div` (`.timer-content-inner`) is **solely responsible for acting as the `container` baseline for content scaling**. This structural decoupling was key.

-   Scaling Level - Pure Container Queries:
    -   `cqw` as the Single Standard: `clamp()` and `vmin`/`vw` were completely abandoned. All number-related dimensions (`font-size`, `width`, `margin`) use `cqw` units, calculated based on the inner container.
    -   Pure Linear Scaling: This creates a fully relative, non-overflowing **pure linear scaling system**. The content size is determined only by the current size of its **direct available space**, making it logical and predictable.

-   Adaptive Level - Mobile-First Media Queries:
    -   Differentiated Strategy: The "one-size-fits-all" approach was abandoned.
    -   Default Rule (Mobile-First): The outer positioner `.timer-content-positioner` defaults to a larger width (`width: 90%`) to maximize space on mobile.
    -   Override Rule (Landscape): A `@media (orientation: landscape)` is used to apply a more conservative width (`width: 70%`) for landscape screens (PCs, tablets) where there is a risk of overflow. This precisely applies the stronger safety constraint only when needed.

## 2.5. Key Takeaways

A truly robust responsive component should not attempt to use a single global rule (like `vmin` or `clamp`) for all scenarios. The best practice is to: **decouple positioning and scaling logic via a clear DOM structure (Picture-in-Picture), establish a pure, local parent-child scaling relationship using Container Queries (`cqw`), and finally, apply different structural parameters to this component in different macro-environments (like `landscape`) using Media Queries.**
---

# 3. Technical Note: Iterative Design of a Text-Based UI Element - The Legacy Overtime Progress Bar

**Date:** 2025-09-18

This document chronicles the iterative design process for the "Legacy Phone Mode" overtime progress bar. It serves as a case study on how user feedback and a commitment to a specific aesthetic ("retro fidelity") can guide the evolution of a seemingly simple UI element into a feature-rich, expressive component.

## 3.1. Initial Goal

The requirement was to display progress for focus time that exceeded the user's "Minimum Focus Goal" within the text-based legacy UI.

## 3.2. The Iteration Loop

The final design was the result of a series of refinements, each addressing a flaw in the previous version.

-   **Iteration 1: The Modern Approach**
    -   Implementation: A continuous, smoothly-filling bar, mirroring the modern UI's progress ring.
    -   Feedback: This felt anachronistic and out of place. The core appeal of the legacy mode is its discrete, "clunky" nature. A smooth animation broke the nostalgic illusion.
    -   Lesson: Aesthetic consistency is paramount. "Low-fidelity" does not mean "less designed."

-   **Iteration 2: The Discrete Block Approach**
    -   Implementation: The bar now filled with a solid block character (`▔`) only after a full segment of overtime was completed (e.g., after 1/10th of the next cycle).
    -   Feedback: The feel was much better, but the bar's behavior after completing a full overtime cycle was undefined. It would simply disappear or reset, providing no sense of continued accomplishment.

-   **Iteration 3: The Multi-Lap Logic**
    -   Implementation: The bar was enhanced to use different block characters for subsequent cycles: `▔` for the first lap, then `▀` for the second, and `█` for the third.
    -   Feedback: This was a significant improvement in providing rich feedback. However, the transition between cycles was jarring—the progress from the first lap (the `▔` characters) would vanish completely when the second lap began, making it feel like a reset rather than an upgrade.

-   **Iteration 4: The Typographic Spacing Detour**
    -   Implementation (Parallel to Logic Refinement): To improve readability, `thin spaces` (U+2009) and later `hair spaces` (U+200A) were inserted between the block characters.
    -   Feedback: This was a regression. The spaces, however small, broke the illusion of a solid, contiguous bar, which was crucial to the text-based aesthetic.
    -   Lesson: In text-based UIs, character choice and spacing are as critical as margins and padding in graphical UIs. The "solid block" feel was more important than the micro-readability of individual characters.

-   **Iteration 5: The Final Layered & Rewarding Solution**
    -   Implementation: This version synthesized the lessons from all previous attempts.
        1.  No Spacing: All typographic spaces were removed. A simple vertical margin was re-introduced between the main and overtime bars for separation.
        2.  Layered Progress: The bar now fills *over* its previous state. The second lap replaces `▔` characters with `▀` characters one by one, preserving the sense of a full bar at all times.
        3.  Visual Reward: A final "maxed-out" state was added for completing the third overtime lap (400% total focus). The bar becomes solid `█`, with the final block highlighted in the current theme's accent color, providing a satisfying visual conclusion and reward for exceptional focus.

## 3.3. Key Takeaways

-   Low-Fidelity Requires High-Effort: Creating a convincing retro or text-based UI is not simply about removing styling. It requires a deep consideration of details like animation granularity, character choice, and typographic rhythm to feel authentic.
-   Feedback Drives Expressiveness: A simple progress bar evolved into a multi-stage, layered, and rewarding system because each iteration addressed a specific experiential flaw. The final design communicates far more information (current lap, progress within lap, total laps completed) than the initial concept, all within the same 10-character space.
-   Embrace Constraints: The limitation of a text-only display forced creative solutions. Using different block characters (`▔`, `▀`, `█`) to represent levels of progress is a classic technique from early computing that remains highly effective for conveying rich information in a constrained environment.

---

# 4. Technical Note: Debugging the Abnormal Red Focus Ring Anomaly

**Date:** 2025-09-19

This document outlines the initial debugging process for a UI bug involving a custom red focus ring that appeared during incorrect user interactions.

## 4.1. Symptoms

A red focus ring, intended exclusively for keyboard navigation, was observed appearing during various mouse interactions, most reliably when a control button was first hovered over (triggering an animation) and then clicked.

## 4.2. Root Cause Analysis

The issue stemmed from an interaction between CSS `:hover` animations and the browser's `:focus-visible` heuristic. When a user clicked a button *while* it was animating due to hover, the browser's heuristic was unable to reliably determine that the resulting focus event was mouse-initiated, and it would incorrectly apply the keyboard-only `:focus-visible` styles.

## 4.3. Solution Attempt

An initial fix was attempted using a combination of JavaScript event handlers (`onMouseDown` with `preventDefault()`) and more specific CSS selectors (`:not(:has(:hover))`). While this addressed the immediate visual bug on some components, it proved to be a fragile, localized solution that treated the symptom rather than the underlying architectural flaw. It also introduced new interaction bugs, such as actions firing twice or subsequent keyboard navigation breaking.

## 4.4. Key Takeaways

-   Localized event management (`preventDefault`, `stopPropagation`) for complex focus issues can lead to unpredictable side effects and regressions.
-   Relying on complex CSS selectors to override browser heuristics is a brittle approach. The core problem was the unreliable nature of `:focus-visible` in a dynamic, state-changing application.

---

# 5. Technical Note: Solving the Red Focus Ring Regression with State-Driven CSS

**Date:** 2025-09-20

This note details the final, architectural solution to the red focus ring bug, which re-emerged after a code refactor.

## 5.1. Symptoms

The red focus ring, previously fixed, reappeared on mouse clicks across multiple components (setting items, buttons, inputs). The issue was systemic: any mouse click that resulted in a programmatic `.focus()` call could incorrectly trigger the style.

## 5.2. Root Cause Analysis

The root cause of the regression was the continued reliance on the browser's `:focus-visible` heuristic as the trigger for our custom focus styles. This heuristic is fundamentally unreliable when JavaScript programmatically manages focus in response to mouse events, as it cannot distinguish the user's original intent (mouse) from the code's action (focus).

## 5.3. Solution Implemented

The final solution was to abandon the browser's heuristic entirely and rely on our application's own state as the single source of truth.

1.  **State-Driven Control:** The application's internal `isKeyboardMode` state, which is explicitly managed by our hooks, became the sole authority on whether a keyboard interaction was in progress.
2.  **State-Driven CSS:** All CSS selectors for the custom focus ring were refactored. They no longer use `:focus-visible`. Instead, they depend on a global class (`.keyboard-layout-active`) that our React code adds to the main container only when `isKeyboardMode` is `true`.
    -   Example Selector: `.keyboard-layout-active .setting-item:focus { outline: 2px solid var(--accent-color); }`

## 5.4. Key Takeaways

-   **Heuristics vs. State:** For custom focus styling in a dynamic, stateful application, relying on the browser's `:focus-visible` heuristic is fragile.
-   **Single Source of Truth:** The most robust pattern is to use the application's explicit internal state (e.g., an `isKeyboardMode` flag) to drive styling via a CSS class. This makes the application's state the single source of truth, ensuring predictable, testable behavior that is immune to browser inconsistencies.

---

# 6. Technical Note: Resolving Segmented Control Misalignment in Keyboard Mode

**Date:** 2025-09-20

This note details the analysis and resolution of a layout bug where segmented controls with short labels appeared misaligned in keyboard-navigation mode.

## 6.1. Symptoms

In keyboard mode, segmented controls with short content (e.g., "On / Off") were visually shifted to the left. The navigation arrows were not centered relative to the visible content, creating an inconsistent layout compared to numeric stepper controls, which were correctly right-aligned.

## 6.2. Root Cause Analysis

The misalignment was caused by an interaction between CSS flexbox default behaviors and a container that was shrinking to fit its content.

1.  **Fixed-Width Parent:** In keyboard mode, the parent `.segmented-control` container is a `170px` wide `inline-flex` element to accommodate the navigation arrows.
2.  **Shrink-to-Fit Child:** The inner `.segmented-control-scroll-wrapper` (the visual "filmstrip") is a block-level element. When its content was narrower than `170px`, it would shrink to fit the content's width.
3.  **Default Alignment:** The parent flex container's default alignment (`justify-content: flex-start`) pushed this shrunken wrapper to the left, creating the visual offset.

The JavaScript centering logic was correctly centering the active item *within this shrunken container*, but since the container itself was misplaced, the entire assembly appeared misaligned.

## 6.3. Solution Implemented

The solution was to enforce a stable layout for the inner container, ensuring it always provides a consistent frame of reference for the centering logic, regardless of its content's width.

A single CSS rule was added to `index.css`:
```css
.keyboard-layout-active .segmented-control .segmented-control-scroll-wrapper {
    width: 100%;
}
```
This forces the scroll wrapper to always occupy the full `170px` width of its parent in keyboard mode. It can no longer shrink, eliminating the misalignment and ensuring the JavaScript logic has a stable, centered container to position content within.

## 6.4. Key Takeaways

- When a container's size is dependent on its content (`shrink-to-fit`), its alignment within a parent flexbox can lead to unexpected offsets if the content size varies.
- For dynamic components where internal elements are programmatically positioned (like our centered item), it is crucial that their reference container has a stable, predictable size and position. Explicitly setting `width: 100%` on an intermediate container is an effective way to enforce this stability.
---

# 7. Technical Note: Achieving Responsive Consistency for Mobile and Keyboard Interactions

**Date:** 2025-09-20

This note details the analysis and resolution of two related bugs affecting the user experience on mobile devices: asymmetrical content padding and a broken layout in keyboard mode.

## 7.1. Symptoms

1.  **Asymmetrical Padding:** On mobile devices, card content appeared shifted to the left whenever a vertical scrollbar was visible.
2.  **Broken Layout in Keyboard Mode:** Activating keyboard navigation on a mobile device caused the layout to break, with setting controls overflowing the screen width.

## 7.2. Root Cause Analysis

1.  **Asymmetry Cause:** The vertical scrollbar was consuming space from the content area on the right side. This reduced the effective padding on the right, causing a visual imbalance with the left padding and making the content appear off-center.
2.  **Layout Breakage Cause:** The CSS for Keyboard Mode was not fully responsive. It applied a desktop-optimized two-column grid layout (e.g., `grid-template-columns: ... 370px;`) which was far too wide for mobile viewports. Previous attempts to fix this had incorrectly hidden essential UI elements like the filmstrip's navigation arrows.

## 7.3. Solution Implemented

A two-part, CSS-only solution was implemented in `index.css` to create a robust and consistent mobile experience.

1.  **Layout Symmetry with `scrollbar-gutter`:** The `.settings-content-scrollable` container was updated with the property `scrollbar-gutter: stable both-edges;`. This modern CSS property instructs the browser to reserve space for the scrollbar *on both sides* of the container, even if it's not visible. This prevents the active scrollbar from consuming content space, guarantees symmetrical padding at all times, and eliminates layout shifts.
2.  **Responsive Keyboard Mode:** The mobile media query (`@media (max-width: 768px)`) was updated to correctly handle Keyboard Mode:
    *   A more specific override (`.keyboard-layout-active .setting-item`) was added to ensure the layout remains a single column, preventing the desktop grid from being applied.
    *   Incorrect overrides that hid the navigation arrows and forced the control to be full-width were removed. This restores the desktop-like "filmstrip" interaction (with arrows and gradient) but within a correctly constrained single-column mobile layout.

---

# 8. Technical Note: Resolving the "Phantom Scrollbar" Anomaly in Mobile Layouts

**Date:** 2025-09-20

This document provides a detailed debrief of a complex, language-dependent layout bug. It records the full process from initial observation, through multiple ineffective troubleshooting paths, to the final root cause identification and robust solution.

## 8.1. Initial Anomaly Observed

The initial symptom was language-dependent, inconsistent behavior of the vertical scrollbar in the mobile settings view. When the application language was set to **English**, the **vertical scrollbar was completely invisible**, even when the settings content exceeded the screen height. However, when the language was switched back to **Chinese**, the scrollbar would **appear correctly**.

This was highly deceptive, as the card content area in the English view appeared perfectly symmetrical with correct padding, suggesting a rendering issue with the scrollbar itself rather than a problem with the overall layout width.

## 8.2. Incorrect or Ineffective Troubleshooting

Based on the initial assumption of a "scrollbar rendering failure," the investigation proceeded down several incorrect paths:

-   **Investigating the Scroll Container:** The initial focus was on the `.settings-content-scrollable` container. We checked if its `overflow-y` property was being overridden or if `height` calculations were incorrect. These checks found no issues.
-   **Suspecting a `scrollbar-gutter` Conflict:** Given that `scrollbar-gutter` is a relatively new property, it was suspected that a compatibility issue with `padding` might be causing a rendering glitch on some mobile browsers.
-   **Attempting a Premature `min-width: 0` Fix:** The classic flexbox fix, `min-width: 0`, was applied to the main scrollable container. This was ineffective because the overflow was not originating from this container's own refusal to shrink but was being forced upon it by its children.

These troubleshooting steps were all based on the flawed premise that the problem was confined to the vertical layout axis.

## 8.3. Ultimately Correct Troubleshooting Action

The breakthrough came from a key diagnostic action: **manually reducing the width of the outermost `.settings-view` container in the browser's developer tools.**

This was the decisive step because it immediately revealed two critical facts:
1.  **The Scrollbar Reappeared:** This proved that the scrollbar's rendering mechanism was functional and its disappearance was directly linked to the container's **width**.
2.  **Internal Elements Overflowed:** Simultaneously, it became clear that the segmented control button groups **were visually overflowing the boundaries of their parent card.**

This action pivoted the investigation from a vague "rendering bug" to a concrete **"horizontal overflow" problem**, and pointed directly to the button groups as the source of the overflow.

## 8.4. Final Anomaly Identified

Following the correct troubleshooting path, the true anomaly was identified: **The actual computed width of the entire scrollable container, `.settings-content-scrollable`, was being stretched by its internal content in English mode to be wider than the mobile viewport. This pushed its far-right edge, along with the vertical scrollbar, completely off-screen.**

The "symmetrical" layout was an illusion created by the `overflow: hidden` rule on the `<body>` tag, which simply clipped all overflowing content (including the off-screen scrollbar) and hid the evidence of the true problem.

## 8.5. Incorrect or Ineffective Root Cause Analysis

Even after identifying the horizontal overflow, the initial cause analysis was incomplete.
-   **Blaming Unbreakable Words:** The first analysis correctly identified long English words (like "Escapement" or "Increases") as the trigger. The initial proposed solution was therefore to force these words to break.

This analysis was only partially correct. It identified the "trigger" but failed to explain **why the container layout would allow a single long word to break the entire page layout.** The root cause was not just the content, but the container's own width calculation rules.

## 8.6. Correct Root Cause Analysis

The root cause was a cascading "intrinsic sizing" effect, where a key CSS property acted as an "amplifier."

1.  **Origin - Content's Intrinsic Width:** A long English word set a large `min-content` width for its button.
2.  **Amplifier - `width: max-content`:** This was the core issue. The buttons' direct parent, `.segmented-control-inner`, was styled with `width: max-content`. This is a hard directive that forces the container's width to be the sum of its children's widths, **overriding all width constraints from its parent.**
3.  **Cascade - Width Propagation:** This now oversized button group acted like a rigid strut, forcing its parent card (`.settings-section`) and ultimately the entire scrollable container (`.settings-content-scrollable`) to expand to its enormous width, causing the global horizontal overflow.

## 8.7. Ineffective Solution

-   **Solution A: `overflow-wrap: break-word`:** Adding this to the buttons. This was ineffective because it could not override the powerful `width: max-content` directive on the parent container.
-   **Solution B: `min-width: 0` on buttons:** Similarly, allowing a button to shrink below its content size is irrelevant when its parent container is explicitly instructed to be as wide as all its children combined.

## 8.8. Verified Effective Solution

The final solution was a two-stage process that fixed the bug and then optimized the resulting layout.

1.  **Stage 1 (Constrain the Amplifier):** In the mobile media query, the `width: max-content` on `.segmented-control-inner` was **overridden with `width: 100%`**. This broke the cascade at its source, forcing the button group to respect its parent's boundaries, which solved the overflow and brought the scrollbar back into view.

2.  **Stage 2 (Optimize Button Layout):** The first fix introduced a secondary issue: the buttons' original `flex: 1` rule caused them to divide the now-constrained space equally, leading to unnecessary text wrapping. The final optimization was to remove `flex: 1` and add `justify-content: center` and `flex-wrap: wrap` to the button container. This created a content-aware layout where buttons size themselves naturally, resulting in a robust and aesthetically pleasing final component.

## 8.9. Final Summary / Key Takeaways

-   **Transitive Nature of Layout Bugs:** A high-level symptom (a missing scrollbar) can have a root cause buried deep within a grandchild component's CSS. Effective debugging requires tracing the flow of sizing constraints from the inside out.
-   **Beware `max-content`:** In responsive design, `width: max-content` is a powerful but dangerous property. It gives content ultimate authority over layout, making it a common source of overflow in constrained environments like mobile.
-   **A Complete Solution = Fix + Optimization:** After fixing a bug, one must analyze and address the side effects. Transitioning from a rigid, space-distributing layout (`flex: 1`) to a flexible, content-aware one (`justify-content: center`, `flex-wrap: wrap`) is a common and powerful pattern for building high-quality responsive components.

---
# 9. Technical Note: The Design Journey of the Advanced Task State Model

**Date:** 2025-09-21

> This document records the collaborative design process for the application's advanced task management system. It captures the evolution from initial requirements, through debated concepts, to the final, robust architectural consensus.

## 9.1. Initial Anomaly Observed / Requirement

The initial user request was to enhance the simple to-do list with more granular statuses for in-progress tasks, specifically: `waiting others`, `delayed`, and `postponed`. The goal was to better reflect the complex realities of real-world work.

## 9.2. Incorrect or Ineffective Root Cause Analysis (If applicable)

Several initial ideas were discussed and ultimately discarded, as they failed to address the core complexity in a scalable or intuitive way.

-   **Discarded Idea 1: Flat State Model:** The first impulse was to simply add `waiting`, `delayed`, and `postponed` as new top-level statuses. This was rejected because it created a "flat" and confusing state machine. It failed to capture the hierarchical relationship between these states (e.g., "waiting" is a *reason for* a task being paused, not a parallel state to "doing").
-   **Discarded Idea 2: "Energy Level" Tagging:** An idea was proposed to tag tasks with required energy levels (`@high-energy`, `@low-energy`) to help users match tasks to their current mental state. This was rejected as a good example of a feature that, while seemingly intelligent, introduces significant **"meta-work."** It forces the user to spend more time organizing their work rather than doing it, which conflicts with the application's core philosophy of reducing friction.

## 9.3. Ultimately Correct Troubleshooting Action / The Breakthrough Insight

The key breakthrough came from two user-driven insights:
1.  **"Dependencies are discovered during execution, not just during planning."** This was a critical observation that shifted the design focus away from heavy, upfront project planning (like a Gantt chart) and towards a flexible system that could react to unforeseen blockers.
2.  **Distinguishing "State" from "Action":** A crucial realization was that `waiting` and `delayed` are states of being, whereas `postponed` is the *result of an action* (changing a task's date to the future). This insight allowed us to handle `postponed` without creating a new status, instead using a metadata flag (`isPostponed`).

## 9.4. Final Anomaly Identified / Final Design (The Consensus)

Based on the insights above, a comprehensive, multi-layered model was designed and agreed upon. This model separates a task's objective reality from its contextual priority.

-   **Axis 1: Intrinsic Execution State (The "Fact"):** This is the task's objective, stored state. The final model consists of four core states:
    -   `todo`: Never started.
    -   `doing`: Actively being worked on now.
    -   `suspended`: Started, but now blocked. This state can have an optional `suspensionReason` (`'waiting'` or `'delayed'`).
    -   `done`: Completed.
    -   `archived`: Moved out of view, but not deleted. This provides a crucial "exit" for tasks that are no longer relevant, solving the problem of list clutter.

-   **Axis 2: Dynamic Priority Grouping (The "View"):** This is not a stored state but a real-time, calculated view that organizes tasks for the user.
    -   `Outstanding`: The highest priority. Contains all tasks that are `doing`, overdue, or scheduled for today.
    -   `Pending`: The second priority. Contains all tasks with the `suspended` state.
    -   `Upcoming`: The default priority. Contains all future or unscheduled `todo` tasks.

-   **Lightweight FS Dependency Model:** To address the "emergent dependency" use case, we implemented a simple Finish-to-Start (FS) dependency model. We explicitly rejected more complex dependencies (SS, SF, etc.) as they add project management overhead that is contrary to the app's focus on personal productivity. A task with an unmet prerequisite is given the `suspended` state with a `waiting` reason and is visually marked as "blocked."

## 9.5. Key Takeaways

-   **Design for the "Messy Reality":** The most valuable insights came from analyzing how work *actually* happens (e.g., discovering blockers mid-task), not how it's "supposed" to happen in an ideal workflow.
-   **Separate Concerns (State vs. View):** The final two-axis model is powerful because it separates the objective fact of a task (its intrinsic state) from its subjective importance right now (its priority group). This allows the system to handle the complexity of sorting and presentation, freeing the user to simply describe the task's reality.
-   **Avoid "Meta-Work":** A feature's value must be weighed against the cognitive overhead it imposes. The "Energy Level" idea was rejected because the cost of classifying every task would likely outweigh the benefit of filtering.
-   **Provide Clean Exits:** Not all tasks end by being "done." The `archived` state is a critical feature for long-term usability, as it allows users to maintain a clean, focused workspace without the anxiety of permanently deleting historical data.
---

# 10. Technical Note: Resolving the Floating Action Button (FAB) Positioning Anomaly in Mobile Viewports

**Date:** 2025-09-22

> This document provides a detailed debrief of a complex, mobile-only layout bug. It records the full process from initial observation, through multiple ineffective architectural attempts, to the final root cause identification and robust, responsive solution.

## 10.1. Initial Anomaly Observed

The initial symptom was that in `DevFocusView`, the primary action button (FAB) would incorrectly overlap with the bottom `DevNavBar` in mobile viewports, obscuring the navigation items. However, in `DevTasksView`, the FAB's positioning was correct, floating precisely above the navigation bar.

## 10.2. Incorrect or Ineffective Troubleshooting

The troubleshooting process went down several wrong paths. These attempts, while logically plausible, either failed to solve the root problem or introduced new ones.

-   **Attempt 1: `absolute` Positioning + `relative` Parent**
    -   **Hypothesis:** As long as the FAB's parent container (`<main>`) has `position: relative` and sufficient `padding-bottom`, the FAB's `position: absolute` should position it correctly within that container.
    -   **Reason for Failure:** This was defeated by the `h-full` (`height: 100%`) layout inside `DevFocusView`. Per the CSS box model, `height: 100%` is calculated based on the parent's **content area** (which excludes `padding`). This caused `DevFocusView` itself to become a new, incorrectly sized positioning anchor, "capturing" the FAB's positioning and preventing it from being aware of the parent's `padding` safe area.

-   **Attempt 2: Component Hoisting**
    -   **Hypothesis:** If the internal layout of `DevFocusView` is the problem, moving the FAB component out of it and rendering it directly in the parent `DevView` will solve it.
    -   **Reason for Failure (Regression):** While this "appeared" to fix the overlap on mobile, it completely broke the **desktop layout**. On desktop, the FAB is designed to be part of the content flow, centered below the timer card. Hoisting it to the parent made it a content-agnostic overlay in all views, a major visual and functional regression.

## 10.3. Ultimately Correct Troubleshooting Action

The key breakthrough was understanding the component's **dual layout requirement**: it needs one layout behavior on mobile (a fixed overlay in the bottom-right corner) and a completely different behavior on desktop (a static block within the document flow).

This made it clear that any single, global architectural change (like hoisting) was inappropriate. The solution had to be **responsive and targeted**, applying different CSS positioning strategies at different breakpoints while keeping the component structure stable.

## 10.4. Correct Root Cause Analysis

The root cause was attempting to satisfy two fundamentally different layout requirements with a single positioning scheme (`position: absolute`). While `absolute` positioning was correct for the desktop layout (relative to the content card), it could not correctly calculate its relationship to the screen edge on mobile, where the `fixed` navigation bar had been removed from the document flow.

## 10.5. Verified Effective Solution

The final solution was to return to the component itself and implement a robust, responsive, mixed-positioning strategy.

1.  **Mixed Positioning in `PrimaryActionButton.tsx`:**
    -   **Mobile (Default):** The positioning was changed to `position: fixed` with a precise `bottom` calculation. The nav bar is `80px` (`h-20` or `5rem`) high, and we want a `16px` (`1rem`) gap, so the total offset is `6rem`, corresponding to Tailwind's `bottom-24`. This completely decouples its positioning from the content area and references the viewport only.
    -   **Desktop (`md:`):** Using the `md:relative` media query prefix, the positioning is overridden to `relative` at the `md` breakpoint and above, allowing it to smoothly return to the normal document flow.

2.  **Creating a Safe Area in `DevFocusView.tsx`:**
    -   Since the `fixed` FAB would now cover content beneath it on mobile, we had to "make room" for it in the content container. By adding `pb-[72px]` of bottom padding (FAB height `56px` + gap `16px`), we ensured that the info text below the timer would not be obscured.

## 10.6. Key Takeaways

-   **Beware "Global Fixes" for "Local Problems":** Component hoisting was a global architectural change used to fix a mobile-only layout bug, which resulted in a desktop regression. The best solution is often the most targeted one.
-   **Mixed Positioning is a Powerful Responsive Pattern:** A component does not have to use the same `position` property at all screen sizes. Using responsive prefixes (e.g., `fixed md:relative`) is a clean and powerful way to achieve drastically different mobile and desktop layout patterns within a single component.
-   **Make Room for `fixed` Elements:** When an element is removed from the document flow with `position: fixed`, it is the developer's responsibility to manually create a visual "safe area" for it in the main content area using `padding` or `margin` to prevent content from being obscured. This is a core principle to follow when dealing with floating elements.