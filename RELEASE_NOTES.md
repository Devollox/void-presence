# Desktop Tabs, Navigation & Tooltips

## New

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
- **Japanese & Chinese Localization** — added full Japanese (`ja`) and Chinese (`zh`) language support across the interface.
- **Synchronized Status Indicators** — unified the main connection dot and the `Logs` indicators in the sidebar and tab bar around real-time Discord RPC states. The main dot pulses while online; the `Logs` dots appear only for syncing (warning) or offline (error) states, with the tab indicator positioned next to the close button.
-

## Improved

- **Theme Tokens & Typography** — unified `:root` and `html.dark` variables, transition timings, and `Inter Variable` font styling across light and dark themes.
- **Workspace Content Surface & Headers** — styled the main view container as a rounded framed surface with unified view headers and pill action buttons.
- **Account Dialog** — updated the account modal with a blurred backdrop, elevated surface styling, profile card layout, and click-outside dismissal.
- **Sidebar Toggle & Log Badges** — added animated panel expansion for the sidebar toggle icon with state persistence and status badges on the `Logs` tab.
- **Sidebar Motion & Layout** — reworked sidebar and main-content transitions to coordinate expansion and collapse while keeping overlay previews independent of the main layout.
- **Tab Drag-and-Drop** — updated dragging to move the entire tab together with its close button, exclude hidden tabs, and synchronize reordered tabs with navigation persistence.
- **Tab Styling & Title Fade** — restored flexible tab sizing, enforced single-line titles with a right-edge gradient fade mask on narrow inactive tabs, and added hover, focus, active, dragging, and dropping states.
- **Drag Interaction Handling** — added click suppression after tab dragging and cancellation handling for `Escape`, pointer cancellation, and window focus loss.
- **Reduced Motion** — added reduced-motion support for tab dragging, close-button transitions, sidebar resizing, previews, and backdrop animations.
- **Sidebar Toggle** — added animated panel expansion for the sidebar toggle icon with state persistence.
