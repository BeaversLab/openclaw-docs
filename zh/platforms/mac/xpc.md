> [!NOTE]
> 本页正在翻译中。

---
summary: "OpenClaw macOS 应用、gateway 节点传输与 PeekabooBridge 的 IPC 架构"
read_when:
  - 编辑 IPC 契约或菜单栏应用 IPC
---
# OpenClaw macOS IPC 架构

**当前模型：** 本地 Unix socket 连接 **node host service** 与 **macOS 应用**，用于 exec 审批 + `system.run`。存在 `openclaw-mac` debug CLI 用于发现/连接检查；代理动作仍通过 Gateway WebSocket 与 `node.invoke` 进行。UI 自动化使用 PeekabooBridge。

## 目标
- 单一 GUI 应用实例负责所有 TCC 相关工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 小而清晰的自动化接口：Gateway + node 命令，以及用于 UI 自动化的 PeekabooBridge。
- 可预测权限：始终使用相同的签名 bundle ID，并由 launchd 启动，以保证 TCC 授权稳定。

## 工作方式
### Gateway + node 传输
- 应用运行 Gateway（本地模式），并作为 node 连接到它。
- 代理动作通过 `node.invoke` 执行（如 `system.run`、`system.notify`、`canvas.*`）。

### Node service + 应用 IPC
- 无界面的 node host service 连接 Gateway WebSocket。
- `system.run` 请求通过本地 Unix socket 转发给 macOS 应用。
- 应用在 UI 上下文中执行命令，必要时提示，并返回输出。

示意图（SCI）：
```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）
- UI 自动化使用独立的 UNIX socket，名为 `bridge.sock`，并遵循 PeekabooBridge JSON 协议。
- Host 优先级（客户端）：Peekaboo.app → Claude.app → OpenClaw.app → 本地执行。
- 安全：bridge host 需要允许的 TeamID；DEBUG-only 的同 UID 逃生口由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 控制（Peekaboo 约定）。
- 详见：[PeekabooBridge usage](/zh/platforms/mac/peekaboo)。

## 运行流程
- 重启/重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 终止现有实例
  - Swift 构建 + 打包
  - 写入/引导/启动 LaunchAgent
- 单实例：若已存在相同 bundle ID 的实例运行，应用会提前退出。

## 加固说明
- 所有特权面优先要求 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅 DEBUG）可能允许同 UID 调用，用于本地开发。
- 所有通信保持本地；不暴露网络 socket。
- TCC 提示仅来自 GUI 应用 bundle；重建时保持签名 bundle ID 稳定。
- IPC 加固：socket 模式 `0600`、token、peer-UID 校验、HMAC challenge/response、短 TTL。
