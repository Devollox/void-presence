# Desktop Tabs, Navigation & Tooltips

## New

- **Unified Drag-and-Drop System** — added a shared pointer-based drag-and-drop implementation for desktop tabs, sidebar groups, workspace items, account links, and presence lists. All systems now use the same drag threshold, live sibling shifting, drop animation, click suppression, and `Escape` / focus-loss cancellation behavior.
- **Consistent Reorder Animations** — unified reorder animations across tabs, sidebar groups, workspace items, account links, and presence lists: dragged elements follow the pointer, neighboring items shift smoothly, and the final position is committed after the drop animation.
- **Tab Reordering & Persistence** — added drag-and-drop tab sorting with `localStorage` state persistence and dynamic `Ctrl+1..9` shortcut assignment.
- **Closable Tabs** — added close buttons and middle-click tab closing, automatic switching to a neighboring tab, and protection against closing the last remaining tab.
- **Tab Restoration** — added persistence for open tabs, their order, and the active tab. Closed tabs reopen when selecting their section in the sidebar or navigating through history.
- **Keyboard-Aware Tooltips** — added a global tooltip system with shortcut badges, real-time key press highlighting, and automatic hotkey triggering.
- **Navigation History** — added a `Back` and `Forward` navigation stack with `Alt+←` / `Alt+→` shortcuts and `[` hotkey support for toggling the sidebar.
- **Interactive Sidebar Resizer** — added a draggable sidebar edge handle with cursor-tracking vertical glow, a floating resize/collapse tooltip, click-to-collapse support, and `localStorage` width persistence.
- **Sidebar Peek** — added an overlay preview of the collapsed sidebar with a theme-aware dimmed backdrop, rounded right corners, and dismissal by clicking the backdrop, selecting a navigation item, or pressing `Escape`.
- **Sidebar Reordering & Collapsible Groups** — added drag-and-drop sorting for sidebar groups, workspace items, and account links, along with smooth accordion transitions and `inert` focus management.
- **Changelog Unread Indicator** — added an unread dot badge on the `Changelog` sidebar item with hover scaling and persistent read state.
- **Live Status Indicator** — added a pulsing connection status dot (`Online`, `Syncing`, `Offline`) synced with real-time Discord RPC states.
- **Expanded Localization** — added full support for Chinese (`zh`), Japanese (`ja`), German (`de`), French (`fr`), Korean (`ko`), Portuguese (`pt`), and Spanish (`es`), expanding the interface from English, Russian, and Turkish to 10 available languages.
- **Synchronized Status Indicators** — unified the main connection dot and the `Logs` indicators in the sidebar and tab bar around real-time Discord RPC states. The main dot pulses while online; the `Logs` dots appear only for syncing (warning) or offline (error) states, with the tab indicator positioned next to the close button.
- **Ticket-Based Deep Links** — added a unified one-time ticket system for configuration imports and plugin installation. Deep links now carry only a short-lived ticket instead of raw payloads or download URLs; the app exchanges it for server-validated action data.
- **Held Ctrl Tab Hints** — added a 1-second delay before `Ctrl+1..9` shortcut hints replace desktop tab icons. Releasing `Ctrl` immediately restores the regular icons.
- **Refined Welcome Styling** — cleaned up the welcome stylesheet and retained support for theme and language selection.
- **Polished Onboarding Controls** — improved theme previews, language pills, and the primary continue action with consistent visual states.
- **System-Aware Theme Selection** — the welcome screen now preselects Light or Dark based on the operating system color scheme.
- **Persistent Theme Preference** — a user-selected theme continues to override the system default after onboarding.
- **Added Silent Update Cleanup** — introduced a background cleanup function that removes obsolete Void Presence update and installer files.
- **Preserved Active Installer** — cleanup retains update artifacts matching the currently running application version.
- **Cross-Platform File Maintenance** — cleanup supports Windows, macOS, and Linux update installer formats without user-facing logs.
- **Added First-Run Desktop Tab Reset** — legacy open desktop tabs are closed during first initialization.
- **Added Reset Flag** — added `desktop-tabs-reset-v1` to ensure the cleanup runs only once.
- **Reused Close Tab Behavior** — non-default tabs are closed through the existing `closeTab()` logic.
- **Reset Saved Tab State** — `desktop-tabs-v1` is updated to contain only Presence and Settings after the first-run reset.
- **Config Migration** — added automatic migration that runs on startup, detects missing fields in existing config files in `userData`, and fills them with default values. Adding a new field to any config object in `config.ts` is enough — no manual migration steps required.
- **URL Whitespace Stripping** — spaces are now automatically removed from button URLs and image URLs at input time and on save, preventing broken links caused by accidental whitespace.

## Improved

- **Drag-and-Drop Consistency** — aligned desktop tab, sidebar, and presence-list drag-and-drop implementations around one interaction model: pointer events, a 4 px activation threshold, animated sibling displacement, a 220 ms drop transition, and protection against accidental clicks after dragging.
- **Theme Tokens & Typography** — unified `:root` and `html.dark` variables, transition timings, and `Inter Variable` font styling across light and dark themes.
- **Workspace Content Surface & Headers** — styled the main view container as a rounded framed surface with unified view headers and pill action buttons.
- **Account Dialog** — updated the account modal with a blurred backdrop, elevated surface styling, profile card layout, and click-outside dismissal.
- **Sidebar Toggle & Log Badges** — added animated panel expansion for the sidebar toggle icon with state persistence and status badges on the `Logs` tab.
- **Sidebar Motion & Layout** — reworked sidebar and main-content transitions to coordinate expansion and collapse while keeping overlay previews independent of the main layout.
- **Tab Drag-and-Drop** — updated dragging to move the entire tab together with its close button, exclude hidden tabs, and synchronize reordered tabs with navigation persistence.
- **Tab Styling & Title Fade** — restored flexible tab sizing, enforced single-line titles with a right-edge gradient fade mask on narrow inactive tabs, and added hover, focus, active, dragging, and dropping states.
- **Drag Interaction Handling** — added click suppression after tab dragging and cancellation handling for `Escape`, pointer cancellation, and window focus loss.
-
