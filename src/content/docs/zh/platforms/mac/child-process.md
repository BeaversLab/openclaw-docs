---
summary: "Gateway(网关) 网关 lifecycle on macOS (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway(网关)macOSmacOS 上的 Gateway(网关) 生命周期"
---

macOS 应用默认**通过 launchd 管理 Gateway(网关)**，不将 Gateway(网关)作为子进程生成。它首先尝试连接到配置端口上已运行的 Gateway(网关)；如果无法访问，它会通过外部 macOSGateway(网关)Gateway(网关)Gateway(网关)`openclaw`CLI CLI 启用 launchd 服务（无嵌入式运行时）。这为您提供了可靠的登录时自动启动和崩溃后重启功能。
子进程模式（由应用直接生成的 Gateway(网关)）目前**未使用**。
如果您需要与 UI 更紧密地结合，

子进程模式（由应用直接生成的 Gateway(网关)）目前**未使用**。
如果您需要与 UI 更紧密地结合，请在终端中手动运行 Gateway(网关)。

## 默认行为

- 该应用会安装一个标记为 `ai.openclaw.gateway` 的每用户 LaunchAgent
  （或在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；支持传统的 `com.openclaw.*`）。
- 启用本地模式时，应用会确保 LaunchAgent 已加载，
  并在需要时启动 Gateway(网关)。
- 日志会写入 launchd gateway 日志路径（在调试设置中可见）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，请将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发构建

`scripts/restart-mac.sh --no-sign` 适用于没有
签名密钥时的快速本地构建。为了防止 launchd 指向未签名的中继二进制文件，它会：

- 写入 `~/.openclaw/disable-launchagent`。

`scripts/restart-mac.sh` 的已签名运行如果存在该标记，
会清除此覆盖。要手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

要强制 macOS 应用**永不安装或管理 launchd**，请使用
macOS`--attach-only`（或 `--no-launchd`）启动它。这会设置 `~/.openclaw/disable-launchagent`Gateway(网关)，
因此应用仅附加到已运行的 Gateway(网关)。您可以在调试设置中切换相同
的行为。

## 远程模式

远程模式从不启动本地 Gateway(网关)。应用使用通往
远程主机的 SSH 隧道并通过该隧道进行连接。

## 为什么我们首选 launchd

- 登录时自动启动。
- 内置的重启/KeepAlive 语义。
- 可预测的日志和监管。

如果将来再次需要真正的子进程模式，应将其记录为一种
独立的、明确的仅限开发模式的选项。

## 相关

- [macOS 应用](/zh/platforms/macos)
- [Gateway(网关) 运维手册](/zh/gateway)
