---
summary: "Gateway 网关 lifecycle on macOS (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway 网关 Lifecycle"
---

# macOS 上的 Gateway 网关 生命周期

macOS 应用程序默认情况下 **通过 launchd 管理 Gateway 网关**，而不会将 Gateway 网关 作为子进程生成。它首先尝试连接到配置端口上已运行的 Gateway 网关；如果无法连接到任何 Gateway 网关，它会通过外部 `openclaw` CLI 启用 launchd 服务（无嵌入式运行时）。这为您提供了可靠的登录时自动启动和崩溃后重启功能。子进程模式（由应用程序直接生成 Gateway 网关）目前**未被使用**。

子进程模式（Gateway 网关 由应用直接生成）目前**未使用**。
如果您需要与 UI 紧密耦合，请在终端中手动运行 Gateway 网关。

## 默认行为

- 该应用程序会安装一个标有 `ai.openclaw.gateway` 的每用户 LaunchAgent
  （在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；支持传统的 `com.openclaw.*`）。
- 当启用本地模式时，应用程序会确保 LaunchAgent 已加载，并在需要时启动 Gateway(网关)。
- 日志会写入 launchd 网关日志路径（可在调试设置中查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，请将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发版本

`scripts/restart-mac.sh --no-sign` 用于在没有签名密钥时进行快速本地构建。为了防止 launchd 指向未签名的中继二进制文件，它会：

- 写入 `~/.openclaw/disable-launchagent`。

如果存在标记，`scripts/restart-mac.sh` 的签名运行会清除此覆盖。要手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

若要强制 macOS 应用**永不安装或管理 launchd**，请使用
`--attach-only`（或 `--no-launchd`）启动它。这将设置
`~/.openclaw/disable-launchagent`，因此该应用仅附加到正在运行的 Gateway。您可以在
调试设置中切换相同的行为。

## 远程模式

Remote mode never starts a local Gateway(网关). The app uses an SSH tunnel to the
remote host and connects over that tunnel.

## 为什么我们倾向于使用 launchd

- 登录时自动启动。
- 内置的重启/KeepAlive 语义。
- 可预测的日志和监控。

如果再次需要真正的子进程模式，应将其记录为一个
独立的、仅用于开发的显式模式。
