---
summary: "全局语音唤醒词（网关所有）及其在节点间的同步方式"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "语音唤醒"
---

# 语音唤醒（全局唤醒词）

OpenClaw 将唤醒词视为由**网关拥有的单一全局列表**。

- **没有每个节点的自定义唤醒词**。
- **任何节点/应用 UI 都可以编辑**该列表；更改由网关持久化并广播给所有人。
- macOS 和 iOS 保留本地的**语音唤醒启用/禁用**开关（本地 UX 和权限不同）。
- Android 目前保持语音唤醒关闭，并在语音选项卡中使用手动麦克风流程。

## 存储（网关主机）

唤醒词存储在网关机器的以下位置：

- `~/.openclaw/settings/voicewake.json`

形状：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 协议

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- 带有参数 `{ triggers: string[] }` 的 `voicewake.set` → `{ triggers: string[] }`

备注：

- 触发器会被规范化（修剪、去除空白）。空列表会回退到默认值。
- 出于安全考虑实施了限制（数量/长度上限）。

### 事件

- `voicewake.changed` 负载 `{ triggers: string[] }`

接收者：

- 所有 WebSocket 客户端（macOS 应用、WebChat 等）
- 所有连接的节点（iOS/Android），并且在节点连接时作为初始“当前状态”推送。

## 客户端行为

### macOS 应用

- 使用全局列表来控制 `VoiceWakeRuntime` 触发器。
- 在语音唤醒设置中编辑“触发词”会调用 `voicewake.set`，然后依赖广播来保持其他客户端同步。

### iOS 节点

- 使用全局列表进行 `VoiceWakeManager` 触发检测。
- 在设置中编辑唤醒词会调用 `voicewake.set`（通过网关 WS），并保持本地唤醒词检测的响应性。

### Android 节点

- Android 运行时/设置中当前禁用了语音唤醒。
- Android 语音在语音选项卡中使用手动麦克风捕获，而不是唤醒词触发。
