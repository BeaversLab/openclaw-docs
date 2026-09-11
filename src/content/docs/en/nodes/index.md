---
summary: "Nodes: pairing, capabilities, permissions, and CLI helpers for camera/screen/device/notifications/system and the macOS widget panel"
read_when:
  - Pairing iOS/watchOS/Android nodes to a gateway
  - Enabling isolated OpenClaw session hosting on a paired node
  - Using node camera or screen capture for agent context
  - Presenting a hosted widget on a Mac
  - Adding new node commands or CLI helpers
title: "Nodes"
doc-schema-version: 1
---

A **node** is a companion device (macOS/iOS/watchOS/Android/headless) that connects to the Gateway with `role: "node"` and exposes a command surface (e.g. `camera.*`, `device.*`, `notifications.*`, `system.*`) via `node.invoke`. Most nodes use the Gateway WebSocket on the operator port. The optional direct Apple Watch node uses signed HTTPS polling on that same port because watchOS blocks generic low-level networking for ordinary apps. Protocol details: [Gateway protocol](/en/gateway/protocol).

macOS can also run in **node mode**: the menu bar app connects to the Gateway's
WS server as one node (so `openclaw nodes …` works against this Mac). The app
adds native widget-panel, camera, screen, notification, and computer-control commands
to the same node-host command surface used by `openclaw node run`. Do not start a
second CLI node on that Mac; the app runs the matching CLI node-host runtime as
an internal worker and remains the sole Gateway connection and node identity.
The app's **Instances** UI shows each device under a friendly hardware name; see
[Device model database](/en/reference/device-models) for how Apple model
identifiers are vendored and mapped.

Nodes are **peripherals**, not gateways: they don't run the gateway service, and channel messages (Telegram, WhatsApp, etc.) land on the gateway, not on nodes.

Troubleshooting runbook: [/nodes/troubleshooting](/en/nodes/troubleshooting)

## Node pages

Set up a node:

- [Node pairing and status](/en/nodes/pairing-and-status) - Approve a node, read its status and host stats, and upgrade a fleet in order.
- [Run a node host](/en/nodes/node-host) - Foreground, service, SSH-tunnel, and headless hosts, their identity state, and system commands.

Give a node work:

- [Run commands on a node](/en/nodes/node-exec) - Allowlist commands, point exec at a node, invoke raw RPC, and bind a target.
- [Node-hosted MCP servers and skills](/en/nodes/mcp-and-skills) - Publish MCP tools, skills, and local model inference from the node machine.
- [Host OpenClaw sessions on a node](/en/nodes/session-hosting) - Worker session hosting, device placement, capacity, and container isolation.
- [Node session catalogs](/en/nodes/session-catalogs) - Codex, Claude, OpenCode, and Pi sessions discovered on the Gateway and paired nodes.
- [Node file transfers](/en/nodes/file-transfers) - Terminal uploads and the File Transfer plugin's directory listing, fetch, and write tools.

Govern and invoke device capabilities:

- [Node command policy](/en/nodes/command-policy) - Platform default allowlists, dangerous-command opt-ins, and the `gateway.nodes` config.
- [Node device commands](/en/nodes/device-commands) - Widget panel, camera, screen recording, location, SMS, and device data helpers.

Node capabilities in depth:

- [Active computer presence](/en/nodes/presence) - Which Mac the Gateway treats as active, and where node alerts land.
- [Camera capture](/en/nodes/camera) - Per-platform photo and clip limits and the capture pipeline.
- [Computer use](/en/nodes/computer-use) - Desktop control on a paired node, and the gates around it.
- [Location command](/en/nodes/location-command) - Full parameter and response shape for `location.get`.
- [Talk mode](/en/nodes/talk) - Live voice conversation on a node.
- [Voice wake](/en/nodes/voicewake) - Wake-word capture on a node.
- [Media understanding](/en/nodes/media-understanding) - How the agent reads node-captured media.
- [Media playback](/en/nodes/media-playback) - Playing audio and video through a node.
- [Image and media support](/en/nodes/images) - Image formats and attachment handling.
- [Audio and voice notes](/en/nodes/audio) - Audio capture and voice-note handling.
- [Node troubleshooting](/en/nodes/troubleshooting) - Pairing, foreground, permission, and tool failures.
- [`openclaw nodes`](/en/cli/nodes) - CLI reference for listing, inspecting, and managing nodes.

## Where each section moved

Every anchor this page used to publish still resolves here. Each entry below carries the original anchor and links to its new home.

**[Node pairing and status](/en/nodes/pairing-and-status)**

- <a id="pairing-%2B-status" /><a id="pairing-+-status" />[Pairing + status](/en/nodes/pairing-and-status#pairing-+-status)
- <a id="version-skew-and-upgrade-order" />[Version skew and upgrade order](/en/nodes/pairing-and-status#version-skew-and-upgrade-order)

**[Run a node host](/en/nodes/node-host)**

- <a id="remote-node-host-(system.run)" /><a id="remote-node-host-system-run" />[Remote node host (system.run)](/en/nodes/node-host#remote-node-host-system-run)
- <a id="gateway-deployments-that-cannot-host-nodes" />[Gateway deployments that cannot host nodes](/en/nodes/node-host#gateway-deployments-that-cannot-host-nodes)
- <a id="start-a-node-host-(foreground)" /><a id="start-a-node-host-foreground" />[Start a node host (foreground)](/en/nodes/node-host#start-a-node-host-foreground)
- <a id="remote-gateway-via-ssh-tunnel-(loopback-bind)" /><a id="remote-gateway-via-ssh-tunnel-loopback-bind" />[Remote gateway via SSH tunnel (loopback bind)](/en/nodes/node-host#remote-gateway-via-ssh-tunnel-loopback-bind)
- <a id="start-a-node-host-(service)" /><a id="start-a-node-host-service" />[Start a node host (service)](/en/nodes/node-host#start-a-node-host-service)
- <a id="pair-%2B-name" /><a id="pair-+-name" />[Pair + name](/en/nodes/node-host#pair-+-name)
- <a id="headless-identity-state" />[Headless identity state](/en/nodes/node-host#headless-identity-state)
- <a id="system-commands-(node-host-%2F-mac-node)" /><a id="system-commands-node-host-/-mac-node" />[System commands (node host / mac node)](/en/nodes/node-host#system-commands-node-host-/-mac-node)
- <a id="headless-node-host-(cross-platform)" /><a id="headless-node-host-cross-platform" />[Headless node host (cross-platform)](/en/nodes/node-host#headless-node-host-cross-platform)
- <a id="mac-node-mode" />[Mac node mode](/en/nodes/node-host#mac-node-mode)

**[Node-hosted MCP servers and skills](/en/nodes/mcp-and-skills)**

- <a id="node-hosted-mcp-servers" />[Node-hosted MCP servers](/en/nodes/mcp-and-skills#node-hosted-mcp-servers)
- <a id="node-hosted-skills" />[Node-hosted skills](/en/nodes/mcp-and-skills#node-hosted-skills)
- <a id="local-model-inference" />[Local model inference](/en/nodes/mcp-and-skills#local-model-inference)

**[Run commands on a node](/en/nodes/node-exec)**

- <a id="allowlist-the-commands" />[Allowlist the commands](/en/nodes/node-exec#allowlist-the-commands)
- <a id="point-exec-at-the-node" />[Point exec at the node](/en/nodes/node-exec#point-exec-at-the-node)
- <a id="invoking-commands" />[Invoking commands](/en/nodes/node-exec#invoking-commands)
- <a id="exec-node-binding" />[Exec node binding](/en/nodes/node-exec#exec-node-binding)

**[Node session catalogs](/en/nodes/session-catalogs)**

- <a id="codex-sessions-and-transcripts" />[Codex sessions and transcripts](/en/nodes/session-catalogs#codex-sessions-and-transcripts)
- <a id="claude-sessions-and-transcripts" />[Claude sessions and transcripts](/en/nodes/session-catalogs#claude-sessions-and-transcripts)
- <a id="opencode-and-pi-sessions" />[OpenCode and Pi sessions](/en/nodes/session-catalogs#opencode-and-pi-sessions)

**[Host OpenClaw sessions on a node](/en/nodes/session-hosting)**

- <a id="host-openclaw-sessions" />[Host OpenClaw sessions](/en/nodes/session-hosting#host-openclaw-sessions)
- <a id="isolate-hosted-worker-sessions-in-containers" />[Isolate hosted worker sessions in containers](/en/nodes/session-hosting#isolate-hosted-worker-sessions-in-containers)

**[Node file transfers](/en/nodes/file-transfers)**

- <a id="terminal-file-uploads" />[Terminal file uploads](/en/nodes/file-transfers#terminal-file-uploads)
- <a id="agent-file-transfers" />[Agent file transfers](/en/nodes/file-transfers#agent-file-transfers)

**[Node command policy](/en/nodes/command-policy)**

- <a id="command-policy" />[Command policy](/en/nodes/command-policy#command-policy)
- <a id="config-(openclaw.json)" /><a id="config-openclaw-json" />[Config (`openclaw.json`)](/en/nodes/command-policy#config-openclaw-json)
- <a id="permissions-map" />[Permissions map](/en/nodes/command-policy#permissions-map)

**[Node device commands](/en/nodes/device-commands)**

- <a id="macos-widget-panel" />[macOS widget panel](/en/nodes/device-commands#macos-widget-panel)
- <a id="photos-%2B-videos-(node-camera)" /><a id="photos-+-videos-node-camera" />[Photos + videos (node camera)](/en/nodes/device-commands#photos-+-videos-node-camera)
- <a id="screen-recordings-(nodes)" /><a id="screen-recordings-nodes" />[Screen recordings (nodes)](/en/nodes/device-commands#screen-recordings-nodes)
- <a id="location-(nodes)" /><a id="location-nodes" />[Location (nodes)](/en/nodes/device-commands#location-nodes)
- <a id="sms-(android-nodes)" /><a id="sms-android-nodes" />[SMS (Android nodes)](/en/nodes/device-commands#sms-android-nodes)
- <a id="device-and-personal-data-commands" />[Device and personal data commands](/en/nodes/device-commands#device-and-personal-data-commands)
