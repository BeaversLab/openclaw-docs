---
summary: "Gateway lifecycle on macOS (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway Lifecycle"
---

# macOS 上的 Gateway 生命周期

macOS 应用程序默认情况下 **通过 launchd 管理 Gateway**，而不会将 Gateway 作为子进程生成。它首先尝试连接到配置端口上已运行的 Gateway；如果无法连接到任何 Gateway，它会通过外部 `openclaw` CLI 启用 launchd 服务（无嵌入式运行时）。这为您提供了可靠的登录时自动启动和崩溃后重启功能。子进程模式（由应用程序直接生成 Gateway）目前**未被使用**。

子进程模式（Gateway 由应用直接生成）目前**未使用**。
如果您需要与 UI 紧密耦合，请在终端中手动运行 Gateway。

## 默认行为

- 该应用程序安装了一个标记为 `ai.openclaw.gateway` 的每用户 LaunchAgent
  （或在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；支持旧版 `com.openclaw.*`）。
- 启用本地模式时，应用会确保 LaunchAgent 已加载，
  并在需要时启动 Gateway。
- 日志会写入到 launchd gateway 日志路径（可在调试设置中查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，请将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发构建

`scripts/restart-mac.sh --no-sign` 用于在没有签名密钥时进行快速本地构建。为了防止 launchd 指向未签名的中继二进制文件，它会：

- 写入 `~/.openclaw/disable-launchagent`。

如果存在标记，`scripts/restart-mac.sh` 的已签名运行会清除此覆盖。要手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

若要强制 macOS 应用程序 **永不安装或管理 launchd**，请使用 `--attach-only`（或 `--no-launchd`）启动它。这将设置 `~/.openclaw/disable-launchagent`，因此应用程序仅附加到已运行的 Gateway。您可以在调试设置中切换相同的行为。

## 远程模式

远程模式从不启动本地 Gateway。应用使用到远程主机的
SSH 隧道并通过该隧道进行连接。

## 为什么我们首选 launchd

- 登录时自动启动。
- 内置的重启/KeepAlive 语义。
- 可预测的日志和监管。

如果将来再次需要真正的子进程模式，应将其文档化为一个单独的、明确的仅限开发者的模式。"

import zh from '/components/footer/zh.mdx';

<zh />
