---
summary: "全局语音唤醒词（Gateway(网关) 所有）以及它们如何在节点间同步"
read_when:
  - 更改语音唤醒词行为或默认值
  - 添加需要唤醒词同步的新节点平台
title: "Voice Wake"
---

# Voice Wake (Global Wake Words)

OpenClaw 将唤醒词视为由 **Gateway(网关)** 拥有的单个全局列表。

- 不存在**按节点自定义的唤醒词**。
- **任何节点/应用 UI 均可编辑**该列表；更改由 Gateway(网关) 持久化，并向所有人广播。
- macOS 和 iOS 保留本地的**启用/禁用 Voice Wake（语音唤醒）**开关（本地 UX 和权限不同）。
- Android 目前保持 Voice Wake 关闭状态，并在 Voice（语音）标签页中使用手动麦克风流程。

## Storage (Gateway(网关) host)

唤醒词存储在网关机器上的以下位置：

- `~/.openclaw/settings/voicewake.json`

形状：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## Protocol

### Methods

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` with params `{ triggers: string[] }` → `{ triggers: string[] }`

Notes:

- 触发器会被标准化（去除首尾空格，删除空值）。空列表会回退到默认值。
- 出于安全考虑，强制执行限制（计数/长度上限）。

### Events

- `voicewake.changed` payload `{ triggers: string[] }`

谁接收它：

- 所有 WebSocket 客户端（macOS 应用、WebChat 等）
- 所有连接的节点（iOS/Android），并在节点连接时作为初始“当前状态”推送。

## Client behavior

### macOS app

- 使用全局列表来控制 `VoiceWakeRuntime` 触发器。
- 在 Voice Wake 设置中编辑“触发词”会调用 `voicewake.set`，然后依赖广播以使其他客户端保持同步。

### iOS node

- 使用全局列表进行 `VoiceWakeManager` 触发器检测。
- 在设置中编辑唤醒词会调用 `voicewake.set`（通过 Gateway(网关) WS），并保持本地唤醒词检测的响应性。

### Android node

- Voice Wake 目前在 Android 运行时/设置中处于禁用状态。
- Android 语音在 Voice（语音）标签页中使用手动麦克风捕获，而不是唤醒词触发器。

import zh from "/components/footer/zh.mdx";

<zh />
