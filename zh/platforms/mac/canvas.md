---
summary: "<!-- i18n:todo -->Agent-controlled Canvas panel embedded via WKWebView + custom URL scheme<!-- /i18n:todo -->"
read_when:
  - "Implementing the macOS Canvas panel"
  - "Adding agent controls for visual workspace"
  - "Debugging WKWebView canvas loads"
title: "<!-- i18n:todo -->Canvas<!-- /i18n:todo -->"
---

<!-- i18n:todo -->
# Canvas (macOS app)
<!-- /i18n:todo -->

<!-- i18n:todo -->
The macOS app embeds an agent‑controlled **Canvas panel** using %%P1%%. It
is a lightweight visual workspace for HTML/CSS/JS, A2UI, and small interactive
UI surfaces.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Where Canvas lives
<!-- /i18n:todo -->

<!-- i18n:todo -->
Canvas state is stored under Application Support:
<!-- /i18n:todo -->

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

<!-- i18n:todo -->
The Canvas panel serves those files via a **custom URL scheme**:
<!-- /i18n:todo -->

- `openclaw-canvas://<session>/<path>`

<!-- i18n:todo -->
Examples:
<!-- /i18n:todo -->

<!-- i18n:todo -->
- %%P2%% → %%P3%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P4%% → %%P5%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P6%% → %%P7%%
<!-- /i18n:todo -->

<!-- i18n:todo -->
If no %%P8%% exists at the root, the app shows a **built‑in scaffold page**.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Panel behavior
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Borderless, resizable panel anchored near the menu bar (or mouse cursor).
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Remembers size/position per session.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Auto‑reloads when local canvas files change.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Only one Canvas panel is visible at a time (session is switched as needed).
<!-- /i18n:todo -->

<!-- i18n:todo -->
Canvas can be disabled from Settings → **Allow Canvas**. When disabled, canvas
node commands return %%P9%%.
<!-- /i18n:todo -->

## Agent API surface

<!-- i18n:todo -->
Canvas is exposed via the **Gateway WebSocket**, so the agent can:
<!-- /i18n:todo -->

<!-- i18n:todo -->
- show/hide the panel
<!-- /i18n:todo -->
<!-- i18n:todo -->
- navigate to a path or URL
<!-- /i18n:todo -->
<!-- i18n:todo -->
- evaluate JavaScript
<!-- /i18n:todo -->
<!-- i18n:todo -->
- capture a snapshot image
<!-- /i18n:todo -->

<!-- i18n:todo -->
CLI examples:
<!-- /i18n:todo -->

%%CB_9952aca4%%
<!-- i18n:todo -->
Notes:
<!-- /i18n:todo -->

<!-- i18n:todo -->
- %%P10%% accepts **local canvas paths**, %%P11%% URLs, and %%P12%% URLs.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- If you pass %%P13%%, the Canvas shows the local scaffold or %%P14%%.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## A2UI in Canvas
<!-- /i18n:todo -->

<!-- i18n:todo -->
A2UI is hosted by the Gateway canvas host and rendered inside the Canvas panel.
When the Gateway advertises a Canvas host, the macOS app auto‑navigates to the
A2UI host page on first open.
<!-- /i18n:todo -->

<!-- i18n:todo -->
Default A2UI host URL:
<!-- /i18n:todo -->

%%CB_2265b731%%
<!-- i18n:todo -->
### A2UI commands (v0.8)
<!-- /i18n:todo -->

<!-- i18n:todo -->
Canvas currently accepts **A2UI v0.8** server→client messages:
<!-- /i18n:todo -->

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

<!-- i18n:todo -->
%%P15%% (v0.9) is not supported.
<!-- /i18n:todo -->

<!-- i18n:todo -->
CLI example:
<!-- /i18n:todo -->

%%CB_9c68fb61%%
<!-- i18n:todo -->
Quick smoke:
<!-- /i18n:todo -->

%%CB_8a829e9d%%
<!-- i18n:todo -->
## Triggering agent runs from Canvas
<!-- /i18n:todo -->

<!-- i18n:todo -->
Canvas can trigger new agent runs via deep links:
<!-- /i18n:todo -->

- `openclaw://agent?...`

<!-- i18n:todo -->
Example (in JS):
<!-- /i18n:todo -->

%%CB_65f34d1a%%
<!-- i18n:todo -->
The app prompts for confirmation unless a valid key is provided.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Security notes
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Canvas scheme blocks directory traversal; files must live under the session root.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Local Canvas content uses a custom scheme (no loopback server required).
<!-- /i18n:todo -->
<!-- i18n:todo -->
- External %%P16%% URLs are allowed only when explicitly navigated.
<!-- /i18n:todo -->
