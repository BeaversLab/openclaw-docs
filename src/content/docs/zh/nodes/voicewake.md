---
summary: "全局语音唤醒词（Gateway(网关)所有）及其在节点间同步的方式"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "语音唤醒"
---

OpenClaw 将唤醒词视为由 **Gateway(网关)** 拥有的单一全局列表。

- 不存在**针对特定节点的自定义唤醒词**。
- **任何节点/应用 UI 都可以编辑**该列表；更改由 Gateway(网关) 持久化并广播给所有人。
- macOS 和 iOS 保留本地的**语音唤醒启用/禁用**开关（本地 UX 和权限不同）。
- Android 目前保持语音唤醒关闭，并在语音标签中使用手动麦克风流程。

## 存储（Gateway(网关) 主机）

唤醒词存储在网关机器上的：

- `~/.openclaw/settings/voicewake.json`

结构：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 协议

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 带参数 `{ triggers: string[] }` → `{ triggers: string[] }`

注意：

- 触发器会被规范化（去除首尾空格，丢弃空值）。空列表将回退到默认值。
- 为了安全起见，会执行限制（计数/长度上限）。

### 路由方法（触发器 → 目标）

- `voicewake.routing.get` → `{ config: VoiceWakeRoutingConfig }`
- `voicewake.routing.set` 带参数 `{ config: VoiceWakeRoutingConfig }` → `{ config: VoiceWakeRoutingConfig }`

`VoiceWakeRoutingConfig` 结构：

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

路由目标仅支持以下之一：

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

### 事件

- `voicewake.changed` 载荷 `{ triggers: string[] }`
- `voicewake.routing.changed` 载荷 `{ config: VoiceWakeRoutingConfig }`

接收方：

- 所有 WebSocket 客户端（macOS 应用、WebChat 等）
- 所有连接的节点（iOS/Android），并在节点连接时作为初始“当前状态”推送。

## 客户端行为

### macOS 应用

- 使用全局列表来过滤 `VoiceWakeRuntime` 触发器。
- 在语音唤醒设置中编辑“触发词”会调用 `voicewake.set`，然后依赖广播来保持其他客户端同步。

### iOS 节点

- 使用全局列表进行 `VoiceWakeManager` 触发器检测。
- 在设置中编辑唤醒词会调用 `voicewake.set`（通过 Gateway(网关) WS），同时保持本地唤醒词检测的响应性。

### Android 节点

- 语音唤醒目前在 Android 运行时/设置中已禁用。
- Android 语音使用语音选项卡中的手动麦克风捕获，而不是唤醒词触发器。

## 相关

- [对话模式](/zh/nodes/talk)
- [音频和语音笔记](/zh/nodes/audio)
- [媒体理解](/zh/nodes/media-understanding)
