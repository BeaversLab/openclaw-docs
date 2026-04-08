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
- `openclaw channels status --probe` → 可达的网关返回实时的每个账户传输状态以及探测/审计结果，例如 `works` 或 `audit ok`；如果网关不可达，该命令将回退到仅配置摘要。
- `openclaw logs --follow` → 稳定的活动，没有重复的致命错误。

## Anthropic 长上下文 429 错误

如果您看到：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`，
请转至 [/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

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
  <Accordion title="无回复">
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
    - 您的渠道显示传输已连接，并且在支持的情况下，在 `channels status --probe` 中显示 `works` 或 `audit ok`
    - 发送者看起来已获批准（或私信策略为开放/允许列表）

    常见日志签名：

    - `drop guild message (mention required` → 提及门控在 Discord 中阻止了该消息。
    - `pairing request` → 发送者未获批准，正在等待私信配对批准。
    - 渠道日志中的 `blocked` / `allowlist` → 发送者、房间或组已被过滤。

    深度页面：

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
    - 日志中没有身份验证循环

    常见日志特征：

    - `device identity required` → HTTP/非安全上下文无法完成设备身份验证。
    - `origin not allowed` → 浏览器 `Origin` 不被允许用于控制 UI
      网关目标。
    - `AUTH_TOKEN_MISMATCH` 且带有重试提示 (`canRetryWithDeviceToken=true`) → 可能会自动发生一次受信任的设备令牌重试。
    - 该缓存令牌重试会重复使用与配对设备令牌一起存储的缓存范围集。显式 `deviceToken` / 显式 `scopes` 调用方则
      保留其请求的范围集。
    - 在异步 Tailscale Serve 控制路径上，针对同一
      `{scope, ip}` 的失败尝试会在限制器记录失败之前进行序列化，因此
      第二个并发的不良重试可能已经显示 `retry later`。
    - 来自本地主机
      浏览器源头的 `too many failed authentication attempts (retry later)` → 来自同一 `Origin` 的重复失败将暂时
      被锁定；另一个本地主机源使用单独的存储桶。
    - 该重试后重复出现 `unauthorized` → 令牌/密码错误、身份验证模式不匹配或过期的配对设备令牌。
    - `gateway connect failed:` → UI 针向了错误的 URL/端口或无法访问的网关。

    深度页面：

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

    - `Gateway start blocked: set gateway.mode=local` or `existing config is missing gateway.mode` → gateway mode is remote, or the config file is missing the local-mode stamp and should be repaired.
    - `refusing to bind gateway ... without auth` → non-loopback bind without a valid gateway auth path (token/password, or trusted-proxy where configured).
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

    - Channel transport is connected.
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

  <Accordion title="Cron 或心跳未触发或未传递">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw cron status
    openclaw cron list
    openclaw cron runs --id <jobId> --limit 20
    openclaw logs --follow
    ```

    良好的输出如下所示：

    - `cron.status` 显示已启用，并有下次唤醒时间。
    - `cron runs` 显示最近的 `ok` 条目。
    - 心跳已启用，且不在活跃时间之外。

    常见日志签名：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
- `heartbeat skipped` 且带有 `reason=quiet-hours` → 超出配置的活跃时间。
- `heartbeat skipped` 且带有 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但仅包含空白/仅标题的脚手架。
- `heartbeat skipped` 且带有 `reason=no-tasks-due` → `HEARTBEAT.md` 任务模式处于活动状态，但尚未达到任何任务间隔。
- `heartbeat skipped` 且带有 `reason=alerts-disabled` → 所有心跳可见性均已禁用（`showOk`、`showAlerts` 和 `useIndicator` 均为关闭状态）。
- `requests-in-flight` → 主通道繁忙；心跳唤醒已推迟。 - `unknown accountId` → 心跳传递目标帐户不存在。

      深度页面：

      - [/gateway/故障排除#cron-and-heartbeat-delivery](/en/gateway/troubleshooting#cron-and-heartbeat-delivery)
      - [/automation/cron-jobs#故障排除](/en/automation/cron-jobs#troubleshooting)
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

      良好的输出如下所示：

      - 节点被列为已连接并已针对角色 `node` 进行配对。
      - 您正在调用的命令存在 Capability。
      - 工具的权限状态已获授予。

      常见日志签名：

      - `NODE_BACKGROUND_UNAVAILABLE` → 将节点应用置于前台。
      - `*_PERMISSION_REQUIRED` → 操作系统权限被拒绝或缺失。
      - `SYSTEM_RUN_DENIED: approval required` → 批准待执行。
      - `SYSTEM_RUN_DENIED: allowlist miss` → 命令不在执行允许列表中。

      深度页面：

      - [/gateway/故障排除#node-paired-工具-fails](/en/gateway/troubleshooting#node-paired-tool-fails)
      - [/nodes/故障排除](/en/nodes/troubleshooting)
      - [/tools/exec-approvals](/en/tools/exec-approvals)

    </Accordion>

    <Accordion title="Exec突然请求批准">
    ```bash
    openclaw config get tools.exec.host
    openclaw config get tools.exec.security
    openclaw config get tools.exec.ask
    openclaw gateway restart
    ```

      变更内容：

      - 如果未设置 `tools.exec.host`，默认值为 `auto`。
      - 当沙箱运行时处于活动状态时，`host=auto` 解析为 `sandbox`，否则解析为 `gateway`。
      - `host=auto` 仅涉及路由；无提示“YOLO”行为来自于网关/节点上的 `security=full` 加上 `ask=off`。
      - 在 `gateway` 和 `node` 上，未设置的 `tools.exec.security` 默认为 `full`。
      - 未设置的 `tools.exec.ask` 默认为 `off`。
      - 结果：如果您看到批准请求，说明某些主机本地或每次会话的策略将执行权限收紧，使其偏离了当前的默认值。

      恢复当前的默认无批准行为：

      ```bash
      openclaw config set tools.exec.host gateway
      openclaw config set tools.exec.security full
      openclaw config set tools.exec.ask off
      openclaw gateway restart
      ```

      更安全的替代方案：

      - 如果您只想要稳定的主机路由，请仅设置 `tools.exec.host=gateway`。
      - 如果您想要主机执行但仍希望在允许列表遗漏时进行审查，请将 `security=allowlist` 与 `ask=on-miss` 一起使用。
      - 如果您希望 `host=auto` 解析回 `sandbox`，请启用沙箱模式。

      常见日志特征：

      - `Approval required.` → 命令正在等待 `/approve ...`。
      - `SYSTEM_RUN_DENIED: approval required` → 节点主机执行批准待定。
      - `exec host=sandbox requires a sandbox runtime for this session` → 隐式/显式沙箱选择，但沙箱模式已关闭。

      深入页面：

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

      良好的输出如下所示：

      - 浏览器状态显示 `running: true` 以及所选的浏览器/配置文件。
      - `openclaw` 已启动，或者 `user` 可以看到本地 Chrome 标签页。

      常见日志特征：

      - `unknown command "browser"` 或 `unknown command 'browser'` → `plugins.allow` 已设置且不包含 `browser`。
      - `Failed to start Chrome CDP on port` → 本地浏览器启动失败。
      - `browser.executablePath not found` → 配置的二进制路径错误。
      - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的方案。
      - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
      - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
      - `Remote CDP for profile "<name>" is not reachable` → 无法从此主机访问配置的远程 CDP 端点。
      - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有活动的 CDP 目标。
      - 仅附加或远程 CDP 配置文件上的视口/深色模式/区域设置/离线覆盖过期 → 运行 `openclaw browser stop --browser-profile <name>` 以关闭活动控制会话并释放模拟状态，而无需重启 gateway。

      深入页面：

      - [/gateway/故障排除#browser-工具-fails](/en/gateway/troubleshooting#browser-tool-fails)
      - [/tools/browser#missing-browser-command-or-工具](/en/tools/browser#missing-browser-command-or-tool)
      - [/tools/browser-linux-故障排除](/en/tools/browser-linux-troubleshooting)
      - [/tools/browser-wsl2-windows-remote-cdp-故障排除](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

    </Accordion>
</AccordionGroup>

## 相关

- [常见问题](/en/help/faq) — 常见问题
- [Gateway 故障排除](/en/gateway/troubleshooting) — Gateway 特定的问题
- [Doctor](/en/gateway/doctor) — 自动化健康检查和修复
- [渠道故障排除](/en/channels/troubleshooting) — 渠道连接问题
- [自动化故障排除](/en/automation/cron-jobs#troubleshooting) — cron 和 heartbeat 问题
