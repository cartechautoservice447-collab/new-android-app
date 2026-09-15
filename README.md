# Liquid Glass Studio — Android

Modern native Android study workspace application built with Kotlin, Jetpack Compose, Material 3, and Room local persistence.

## Architecture & Features

- **Course Folders & Workspaces**: Create and manage course folders with accent colors (Sky, Violet, Amber, Emerald, Rose, Cyan), real-time progress indicators, and note counters.
- **Collections & Notes**: Organize study material into focused collections with full CRUD capabilities.
- **Rich Markdown Note Editor & Preview**:
  - Live editing with word and character statistics.
  - Dedicated formatting toolbar (H1, H2, H3, Bold, Italic, Strikethrough, Code, Lists, Checkboxes, Quotes).
  - GitHub-style callout banners (`[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]`).
  - Real-time markdown preview rendering.
  - Debounced autosave to local Room database.
- **Study Hub & Pomodoro Timer**:
  - Circular animated timer ring with countdown.
  - Multiple focus intervals (Focus 25m, Short Break 5m, Long Break 15m).
  - Study rhythms (Deep Study, Balanced, Classic).
  - Daily streak and completed session counters.
- **Daily Planner**:
  - Scheduled reminders, exams, projects, and deadlines.
  - Recurrence settings (Daily, Weekdays, Specific Date).
  - Task completion toggles and category filtering.
- **Liquid Glass Visual Engine**:
  - Dark and light theme modes.
  - Adjustable physics controls (Density, Transparency, Gel elasticity).
  - Performance modes (High, Ultra).
- **Persistence**: Powered by Android Room database with Flow reactive state management.

