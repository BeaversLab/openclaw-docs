---
summary: "OpenClaw 的基于症状的故障排除中心"
read_when:
  - OpenClaw is not working and you need the fastest path to a fix
  - You want a triage flow before diving into deep runbooks
title: "常规故障排除"
---

# 故障排除

如果您只有 2 分钟，请将此页面作为分流入口。

## 前 60 秒

按顺序运行以下步骤：

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

良好的输出表现（单行）：

- `openclaw status` → 显示已配置的通道，没有明显的身份验证错误。
- `openclaw status --all` → 完整的报告已存在且可共享。
- `openclaw gateway probe` → 预期的网关目标可访问 (`Reachable: yes`)。`RPC: limited - missing scope: operator.read` 是降级的诊断，而不是连接失败。
- `openclaw gateway status` → `Runtime: running` 和 `RPC probe: ok`。
- `openclaw doctor` → 没有阻止性的配置/服务错误。
- `openclaw channels status --probe` → 通道报告 `connected` 或 `ready`。
- `openclaw logs --follow` → 稳定的活动，没有重复的致命错误。

## Anthropic 长上下文 429 错误

如果您看到：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`，
请转到 [/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

## 插件安装因缺少 openclaw 扩展而失败

如果安装失败并显示 `package.json missing openclaw.extensions`，则插件包
使用的是 OpenClaw 不再接受的旧格式。

在插件包中修复：

1. 将 `openclaw.extensions` 添加到 `package.json`。
2. 将条目指向构建的运行时文件（通常是 `./dist/index.js`）。
3. 重新发布插件并再次运行 `openclaw plugins install <package>`。

示例：

```json
{
  "name": "@openclaw/my-plugin",
  "version": "1.2.3",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

参考：[插件架构](/en/plugins/architecture)

## 决策树

```mermaid
flowchart TD
  A[OpenClaw is not working] --> B{What breaks first}
  B --> C[No replies]
  B --> D[Dashboard or Control UI will not connect]
  B --> E[Gateway will not start or service not running]
  B --> F[Channel connects but messages do not flow]
  B --> G[Cron or heartbeat did not fire or did not deliver]
  B --> H[Node is paired but camera canvas screen exec fails]
  B --> I[Browser tool fails]

  C --> C1[/No replies section/]
  D --> D1[/Control UI section/]
  E --> E1[/Gateway section/]
  F --> F1[/Channel flow section/]
  G --> G1[/Automation section/]
  H --> H1[/Node tools section/]
  I --> I1[/Browser section/]
```

<AccordionGroup>
  <Accordion title="No replies">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw channels status --probe
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    ```

    良好的输出如下所示：

    - `Runtime: running`
    - `RPC probe: ok`
    - 您的渠道在 `channels status --probe` 中显示已连接/就绪
    - 发送者显示已批准（或私信策略为开放/允许列表）

    常见日志特征：

    - `drop guild message (mention required` → 提及门控在 Discord 中阻止了消息。
    - `pairing request` → 发送者未获批准，正在等待私信配对批准。
    - 渠道日志中的 `blocked` / `allowlist` → 发送者、房间或群组被过滤。

    深入页面：

    - [/gateway/故障排除#no-replies](/en/gateway/troubleshooting#no-replies)
    - [/channels/故障排除](/en/channels/troubleshooting)
    - [/channels/pairing](/en/channels/pairing)

  </Accordion>

  <Accordion title="Dashboard or Control UI will not connect">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    良好的输出如下所示：

    - `Dashboard: http://...` 显示在 `openclaw gateway status` 中
    - `RPC probe: ok`
    - 日志中没有认证循环

    常见日志特征：

    - `device identity required` → HTTP/非安全上下文无法完成设备认证。
    - `AUTH_TOKEN_MISMATCH` 带有重试提示 (`canRetryWithDeviceToken=true`) → 可能会自动进行一次受信任的设备令牌重试。
    - 重试后重复出现 `unauthorized` → 令牌/密码错误、认证模式不匹配或过时的已配对设备令牌。
    - `gateway connect failed:` → UI 针对的 URL/端口错误或网关不可达。

    深入页面：

    - [/gateway/故障排除#dashboard-control-ui-connectivity](/en/gateway/troubleshooting#dashboard-control-ui-connectivity)
    - [/web/control-ui](/en/web/control-ui)
    - [/gateway/authentication](/en/gateway/authentication)

  </Accordion>

  <Accordion title="Gateway(网关) will not start or service installed but not running">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    Good output looks like:

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `RPC probe: ok`

    Common log signatures:

    - `Gateway start blocked: set gateway.mode=local` → gateway mode is unset/remote.
    - `refusing to bind gateway ... without auth` → non-loopback bind without token/password.
    - `another gateway instance is already listening` or `EADDRINUSE` → port already taken.

    Deep pages:

    - [/gateway/故障排除#gateway-service-not-running](/en/gateway/troubleshooting#gateway-service-not-running)
    - [/gateway/background-process](/en/gateway/background-process)
    - [/gateway/configuration](/en/gateway/configuration)

  </Accordion>

  <Accordion title="渠道 connects but messages do not flow">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    Good output looks like:

    - 渠道 transport is connected.
    - Pairing/allowlist checks pass.
    - Mentions are detected where required.

    Common log signatures:

    - `mention required` → group mention gating blocked processing.
    - `pairing` / `pending` → 私信 sender is not approved yet.
    - `not_in_channel`, `missing_scope`, `Forbidden`, `401/403` → 渠道 permission token issue.

    Deep pages:

    - [/gateway/故障排除#渠道-connected-messages-not-flowing](/en/gateway/troubleshooting#channel-connected-messages-not-flowing)
    - [/channels/故障排除](/en/channels/troubleshooting)

  </Accordion>

  <Accordion title="Cron or heartbeat did not fire or did not deliver">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw cron status
    openclaw cron list
    openclaw cron runs --id <jobId> --limit 20
    openclaw logs --follow
    ```

    良好的输出看起来像：

    - `cron.status` 显示已启用并具有下一次唤醒。
    - `cron runs` 显示最近的 `ok` 条目。
    - 心跳已启用且不在活动时间之外。

    常见日志特征：

    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - 带有 `reason=quiet-hours` 的 `heartbeat skipped` → 超出配置的活动时间。
    - `requests-in-flight` → 主通道忙；心跳唤醒已推迟。
    - `unknown accountId` → 心跳传递目标帐户不存在。

    深度页面：

    - [/gateway/故障排除#cron-and-heartbeat-delivery](/en/gateway/troubleshooting#cron-and-heartbeat-delivery)
    - [/automation/故障排除](/en/automation/troubleshooting)
    - [/gateway/heartbeat](/en/gateway/heartbeat)

  </Accordion>

  <Accordion title="Node is paired but 工具 fails camera canvas screen exec">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw nodes status
    openclaw nodes describe --node <idOrNameOrIp>
    openclaw logs --follow
    ```

    良好的输出看起来像：

    - 节点被列为已连接并已配对角色 `node`。
    - 您正在调用的命令存在功能。
    - 该工具的权限状态已授予。

    常见日志特征：

    - `NODE_BACKGROUND_UNAVAILABLE` → 将节点应用置于前台。
    - `*_PERMISSION_REQUIRED` → OS 权限被拒绝/缺失。
    - `SYSTEM_RUN_DENIED: approval required` → 执行批准待定。
    - `SYSTEM_RUN_DENIED: allowlist miss` → 命令不在执行允许列表上。

    深度页面：

    - [/gateway/故障排除#node-paired-工具-fails](/en/gateway/troubleshooting#node-paired-tool-fails)
    - [/nodes/故障排除](/en/nodes/troubleshooting)
    - [/tools/exec-approvals](/en/tools/exec-approvals)

  </Accordion>

  <Accordion title="Exec suddenly asks for approval">
    ```bash
    openclaw config get tools.exec.host
    openclaw config get tools.exec.security
    openclaw config get tools.exec.ask
    openclaw gateway restart
    ```

    发生了什么变化：

    - 如果 `tools.exec.host` 未设置，默认值为 `auto`。
    - 当沙箱运行时处于活动状态时，`host=auto` 解析为 `sandbox`，否则解析为 `gateway`。
    - 在 `gateway` 和 `node` 上，未设置的 `tools.exec.security` 默认为 `allowlist`。
    - 未设置的 `tools.exec.ask` 默认为 `on-miss`。
    - 结果：普通主机命令现在可以使用 `Approval required` 暂停，而不是立即运行。

    恢复旧的网关无需批准行为：

    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```

    更安全的替代方案：

    - 如果您只想要稳定的主机路由并且仍然希望获得批准，请仅设置 `tools.exec.host=gateway`。
    - 如果您想要主机执行但仍然希望在允许列表遗漏时进行审查，请保持 `security=allowlist` 为 `ask=on-miss`。
    - 如果您希望 `host=auto` 解析回 `sandbox`，请启用沙箱模式。

    常见日志签名：

    - `Approval required.` → 命令正在等待 `/approve ...`。
    - `SYSTEM_RUN_DENIED: approval required` → 节点主机执行批准待处理。
    - `exec host=sandbox requires a sandbox runtime for this session` → 隐式/显式沙箱选择但沙箱模式已关闭。

    深度页面：

    - [/tools/exec](/en/tools/exec)
    - [/tools/exec-approvals](/en/tools/exec-approvals)
    - [/gateway/security#runtime-expectation-drift](/en/gateway/security#runtime-expectation-drift)

  </Accordion>

  <Accordion title="Browser 工具 fails">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw browser status
    openclaw logs --follow
    openclaw doctor
    ```

    良好的输出看起来像这样：

    - 浏览器状态显示 `running: true` 以及所选的浏览器/配置文件。
    - `openclaw` 已启动，或者 `user` 可以看到本地 Chrome 标签页。

    常见日志特征：

    - `unknown command "browser"` 或 `unknown command 'browser'` → `plugins.allow` 已设置且不包含 `browser`。
    - `Failed to start Chrome CDP on port` → 本地浏览器启动失败。
    - `browser.executablePath not found` → 配置的二进制路径错误。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Browser attachOnly is enabled ... not reachable` → 仅附加配置文件没有活动的 CDP 目标。

    深入页面：

    - [/gateway/故障排除#browser-工具-fails](/en/gateway/troubleshooting#browser-tool-fails)
    - [/tools/browser#missing-browser-command-or-工具](/en/tools/browser#missing-browser-command-or-tool)
    - [/tools/browser-linux-故障排除](/en/tools/browser-linux-troubleshooting)
    - [/tools/browser-wsl2-windows-remote-cdp-故障排除](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

  </Accordion>
</AccordionGroup>

## 相关

- [常见问题](/en/help/faq) — 经常被问到的问题
- [Gateway(网关) 故障排除](/en/gateway/troubleshooting) — Gateway(网关)特定的问题
- [Doctor](/en/gateway/doctor) — 自动化健康检查和修复
- [渠道故障排除](/en/channels/troubleshooting) — 渠道连接问题
- [自动化故障排除](/en/automation/troubleshooting) — cron 和心跳问题
