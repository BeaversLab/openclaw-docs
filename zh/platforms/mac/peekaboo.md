---
title: "Peekaboo 桥接"
summary: "用于 macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - 在 OpenClaw.app 中托管 PeekabooBridge
  - 通过 Swift Package Manager 集成 Peekaboo
  - 修改 PeekabooBridge 协议/路径
---

# Peekaboo Bridge（macOS UI 自动化）

OpenClaw 可将 **PeekabooBridge** 作为本地、权限感知的 UI 自动化 broker 托管。
这允许 `peekaboo` CLI 在复用 macOS 应用 TCC 权限的同时驱动 UI 自动化。

## 这是什么（以及不是什么）

- **Host**：OpenClaw.app 可作为 PeekabooBridge host。
- **Client**：使用 `peekaboo` CLI（没有单独的 `openclaw ui ...` 接口）。
- **UI**：可视化覆盖层仍在 Peekaboo.app 中；OpenClaw 只是轻量 broker host。

## 启用 Bridge

在 macOS 应用中：

- Settings → **Enable Peekaboo Bridge**

启用后，OpenClaw 会启动本地 UNIX socket 服务器。禁用后 host 会停止，
`peekaboo` 会回退到其他可用的 host。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试 host：

1. Peekaboo.app（完整 UX）
2. Claude.app（若已安装）
3. OpenClaw.app（轻量 broker）

使用 `peekaboo bridge status --verbose` 查看当前激活的 host 与使用的 socket 路径。你也可以覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全与权限

- Bridge 会校验 **调用方代码签名**；强制 TeamID allowlist（Peekaboo host TeamID + OpenClaw app TeamID）。
- 请求约 10 秒超时。
- 若缺少所需权限，bridge 会返回明确错误信息，而不是打开系统设置。

## 快照行为（自动化）

快照存储在内存中，短时间后自动过期。如需更长时间保留，请从客户端重新抓取。

## 故障排查

- 若 `peekaboo` 报 “bridge client is not authorized”，请确保客户端已正确签名，
  或仅在 **debug** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 运行 host。
- 若找不到 host，打开某个 host 应用（Peekaboo.app 或 OpenClaw.app），并确认权限已授予。
