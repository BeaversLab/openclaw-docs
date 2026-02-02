> [!NOTE]
> 本页正在翻译中。

---
summary: "macOS 上的 Gateway 生命周期（launchd）"
read_when:
  - 将 mac 应用与 Gateway 生命周期集成
---
# macOS 上的 Gateway 生命周期

macOS 应用默认 **通过 launchd 管理 Gateway**，不会将 Gateway 作为子进程启动。
它会先尝试附加到配置端口上已运行的 Gateway；如果不可达，则通过外部 `openclaw` CLI
启用 launchd 服务（不内置运行时）。这样可以在登录时自动启动，并在崩溃时自动重启。

子进程模式（由应用直接启动 Gateway）当前 **未使用**。如果你需要与 UI 更紧密的耦合，
请在终端中手动运行 Gateway。

## 默认行为（launchd）

- 应用安装按用户的 LaunchAgent，label 为 `bot.molt.gateway`
  （使用 `--profile`/`OPENCLAW_PROFILE` 时为 `bot.molt.<profile>`；支持旧的 `com.openclaw.*`）。
- 启用本地模式时，应用确保 LaunchAgent 已加载，并在需要时启动 Gateway。
- 日志写入 launchd 的 gateway 日志路径（在 Debug Settings 可见）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/bot.molt.gateway
launchctl bootout gui/$UID/bot.molt.gateway
```

使用命名 profile 时，将 label 替换为 `bot.molt.<profile>`。

## 未签名的开发构建

`scripts/restart-mac.sh --no-sign` 适用于没有签名密钥时的快速本地构建。
为防止 launchd 指向未签名的 relay 二进制，它会：

- 写入 `~/.openclaw/disable-launchagent`。

有签名的 `scripts/restart-mac.sh` 运行会在存在标记时清除此覆盖。若需手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

要强制 macOS 应用 **永不安装或管理 launchd**，使用 `--attach-only`
（或 `--no-launchd`）启动。这会设置 `~/.openclaw/disable-launchagent`，
因此应用只会附加到已运行的 Gateway。你也可以在 Debug Settings 中切换同样的行为。

## 远程模式

远程模式不会启动本地 Gateway。应用会建立到远程主机的 SSH 隧道，并通过该隧道连接。

## 为什么我们偏好 launchd

- 登录时自动启动。
- 内建重启/KeepAlive 语义。
- 可预测的日志与监督。

如果未来需要真正的子进程模式，应作为独立、明确的仅开发模式进行文档说明。
