---
summary: "Location command for nodes (location.get), permission modes, and Android foreground behavior"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "Location Command"
---

# Location command (nodes)

## TL;DR

- `location.get` is a node command (via `node.invoke`).
- Off by default.
- Android app settings use a selector: Off / While Using.
- Separate toggle: Precise Location.

## Why a selector (not just a switch)

OS permissions are multi-level. We can expose a selector in-app, but the OS still decides the actual grant.

- iOS/macOS may expose **While Using** or **Always** in system prompts/Settings.
- Android app currently supports foreground location only.
- Precise location is a separate grant (iOS 14+ “Precise”, Android “fine” vs “coarse”).

Selector in UI drives our requested mode; actual grant lives in OS settings.

## Settings 模型

Per node device:

- `location.enabledMode`: `off | whileUsing`
- `location.preciseEnabled`: bool

UI behavior:

- Selecting `whileUsing` requests foreground permission.
- If OS denies requested level, revert to the highest granted level and show status.

## Permissions mapping (node.permissions)

Optional. macOS node reports `location` via the permissions map; iOS/Android may omit it.

## Command: `location.get`

Called via `node.invoke`.

Params (suggested):

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

Response payload:

```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

Errors (stable codes):

- `LOCATION_DISABLED`: selector is off.
- `LOCATION_PERMISSION_REQUIRED`: permission missing for requested mode.
- `LOCATION_BACKGROUND_UNAVAILABLE`: app is backgrounded but only While Using allowed.
- `LOCATION_TIMEOUT`: no fix in time.
- `LOCATION_UNAVAILABLE`: system failure / no providers.

## Background behavior

- Android app denies `location.get` while backgrounded.
- Keep OpenClaw open when requesting location on Android.
- Other node platforms may differ.

## Model/tooling integration

- Tool surface: `nodes` 工具 adds `location_get` action (node required).
- CLI: `openclaw nodes location get --node <id>`.
- Agent 指南：仅当用户启用了位置信息并了解范围时才调用。

## UX 文案（建议）

- 关闭：“位置共享已禁用。”
- 使用期间：“仅当 OpenClaw 打开时。”
- 精确：“使用精确的 GPS 位置。关闭以共享大致位置。”

import zh from "/components/footer/zh.mdx";

<zh />
