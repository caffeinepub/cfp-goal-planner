# CFP Goal Planner

## Current State
The app has a Report tab that shows one goal at a time (with a dropdown to switch between goals). The report includes client details, goal summary, investment strategy, SIP details, Monte Carlo assessment, and annual SIP projection table for the selected goal only.

## Requested Changes (Diff)

### Add
- A "Combined Report" toggle/mode in the Report screen that shows all goals for the active client side-by-side in a summary table
- Combined report section: a summary table listing all goals with columns: Goal Name, Present Value, Target Corpus, Strategy, Monthly SIP, Time Horizon, Success Rate, and Median Corpus (50th %ile final)
- Each goal in the combined report runs its own simulation to populate the summary row

### Modify
- Report screen header: add a toggle to switch between "Single Goal" (existing behavior) and "All Goals" (new combined view)
- When "All Goals" mode is active, show the combined summary table instead of the individual goal report

### Remove
- Nothing removed

## Implementation Plan
1. Add a mode toggle (Single / All Goals) to the Report screen header
2. In "All Goals" mode, run simulations for all client goals and render a summary table with key metrics per goal
3. Add a loading state while simulations run for all goals
4. Keep print/PDF support: in "All Goals" mode the combined table prints cleanly
