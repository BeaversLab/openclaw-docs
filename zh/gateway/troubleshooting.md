---
summary: "OpenClaw 常见故障的快速排查指南"
read_when:
  - 排查运行时问题或失败
title: "故障排查"
---

# 故障排查 🔧

当 OpenClaw 表现异常时，这里是修复思路。

如果你只需要快速分诊，先看 FAQ 的 [前 60 秒](/zh/help/faq#first-60-seconds-if-somethings-broken)。本页更深入运行时失败与诊断。

按 provider 的捷径：[/zh/channels/troubleshooting](/zh/channels/troubleshooting)

## 状态与诊断

快速分诊命令（按顺序）：

| 命令                               | 说明                                                                               | 何时使用                     |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `openclaw status`                  | 本地摘要：OS + 更新、gateway 可达性/模式、服务、agents/sessions、provider 配置状态 | 首次检查、快速概览           |
| `openclaw status --all`            | 完整本地诊断（只读、可粘贴、较安全）含日志尾                                       | 需要分享调试报告时           |
| `openclaw status --deep`           | 运行 gateway 健康检查（含 provider 探测；需要可达的 gateway）                      | “配置好但不工作”时           |
| `openclaw gateway probe`           | Gateway 发现 + 可达性（本地 + 远程目标）                                           | 怀疑在探测错误 gateway 时    |
| `openclaw channels status --probe` | 询问运行中的 gateway 频道状态（可选探测）                                          | gateway 可达但频道异常       |
| `openclaw gateway status`          | 监督器状态（launchd/systemd/schtasks）、运行 PID/退出、最近 gateway 错误           | 服务“像是加载了”但实际没运行 |
| `openclaw logs --follow`           | 实时日志（运行时问题的最佳信号）                                                   | 需要真实失败原因             |

**分享输出：**优先 `openclaw status --all`（会脱敏 token）。若粘贴 `openclaw status`，考虑先设 `OPENCLAW_SHOW_SECRETS=0`（token 预览）。

另见：[健康检查](/zh/gateway/health) 与 [日志](/zh/logging)。

## 常见问题

### No API key found for provider "anthropic"

这表示 **agent 的认证存储为空** 或缺少 Anthropic 凭据。
认证是 **按 agent** 的，新 agent 不会继承主 agent 的 key。

修复选项：

- 重新运行 onboarding 并为该 agent 选择 **Anthropic**。
- 或在 **gateway 主机** 粘贴 setup-token：
  ```bash
  openclaw models auth setup-token --provider anthropic
  ```
- 或将主 agent 目录的 `auth-profiles.json` 复制到新 agent 目录。

验证：

```bash
openclaw models status
```

### OAuth token refresh failed（Anthropic Claude 订阅）

这表示存储的 Anthropic OAuth token 已过期且刷新失败。
如果你使用 Claude 订阅（无 API key），最可靠的修复是
切换为 **Claude Code setup-token** 并在 **gateway 主机** 粘贴。

**推荐（setup-token）：**

```bash
# 在 gateway 主机运行（粘贴 setup-token）
openclaw models auth setup-token --provider anthropic
openclaw models status
```

若你在其它地方生成了 token：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models status
```

更多细节：[Anthropic](/zh/providers/anthropic) 与 [OAuth](/zh/concepts/oauth)。

### Control UI 在 HTTP 下失败（"device identity required" / "connect failed"）

如果你通过纯 HTTP 打开控制台（如 `http://<lan-ip>:18789/` 或
`http://<tailscale-ip>:18789/`），浏览器处于 **非安全上下文**，
会阻止 WebCrypto，导致无法生成设备身份。

**修复：**

- 优先使用 [Tailscale Serve](/zh/gateway/tailscale) 的 HTTPS。
- 或在 gateway 主机本地打开：`http://127.0.0.1:18789/`。
- 若必须使用 HTTP，启用 `gateway.controlUi.allowInsecureAuth: true` 并
  使用 gateway token（仅 token；无设备身份/配对）。见
  [Control UI](/zh/web/control-ui#insecure-http)。

### CI Secrets 扫描失败

表示 `detect-secrets` 发现了尚未加入 baseline 的新候选项。
请参照 [Secret 扫描](/zh/gateway/security#secret-scanning-detect-secrets)。

### 服务已安装但没有运行

如果 gateway 服务已安装但进程立刻退出，服务可能显示“已加载”但实际无进程。

**检查：**

```bash
openclaw gateway status
openclaw doctor
```

Doctor/服务会显示运行状态（PID/最近退出）与日志提示。

**日志：**

- 推荐：`openclaw logs --follow`
- 文件日志（始终）：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或你配置的 `logging.file`）
- macOS LaunchAgent（若安装）：`$OPENCLAW_STATE_DIR/logs/gateway.log` 与 `gateway.err.log`
- Linux systemd（若安装）：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

**开启更多日志：**

- 提高文件日志细节（持久化 JSONL）：
  ```json
  { "logging": { "level": "debug" } }
  ```
- 提高控制台冗余（仅 TTY 输出）：
  ```json
  { "logging": { "consoleLevel": "debug", "consoleStyle": "pretty" } }
  ```
- 快速提示：`--verbose` 只影响 **控制台** 输出。文件日志仍由 `logging.level` 控制。

日志格式/配置/访问概览见：[/zh/logging](/zh/logging)。

### "Gateway start blocked: set gateway.mode=local"

这表示配置存在但 `gateway.mode` 未设置（或不是 `local`），因此 Gateway 拒绝启动。

**修复（推荐）：**

- 运行向导并将 Gateway 运行模式设为 **Local**：
  ```bash
  openclaw configure
  ```
- 或直接设置：
  ```bash
  openclaw config set gateway.mode local
  ```

**如果你想运行远程 Gateway：**

- 设定远程 URL，并保持 `gateway.mode=remote`：
  ```bash
  openclaw config set gateway.mode remote
  openclaw config set gateway.remote.url "wss://gateway.example.com"
  ```

**临时/开发：**传 `--allow-unconfigured` 以在没有 `gateway.mode=local` 的情况下启动 gateway。

**还没有配置文件？**运行 `openclaw setup` 创建起始配置，然后重试 gateway。

### 服务环境（PATH + runtime）

gateway 服务使用 **最小 PATH** 以避免 shell/管理器干扰：

- macOS：`/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
- Linux：`/usr/local/bin`, `/usr/bin`, `/bin`

这会刻意排除版本管理器（nvm/fnm/volta/asdf）与包管理器（pnpm/npm），
因为服务不会加载你的 shell init。像 `DISPLAY` 这样的运行时变量
应放在 `~/.openclaw/.env`（gateway 会在早期加载）。
当 exec 在 `host=gateway` 上运行时会把你的登录 shell `PATH` 合并进 exec 环境，
因此缺失工具通常意味着你的 shell init 没导出它们（或设置
`tools.exec.pathPrepend`）。见 [/zh/tools/exec](/zh/tools/exec)。

WhatsApp + Telegram 频道需要 **Node**；不支持 Bun。若服务使用 Bun 或版本管理器的 Node 路径安装，请运行 `openclaw doctor` 迁移到系统 Node。

### 沙盒内技能缺 API key

**症状：**技能在宿主可用，但在沙盒中报缺 API key。

**原因：**沙盒 exec 在 Docker 内运行，**不** 继承宿主 `process.env`。

**修复：**

- 设置 `agents.defaults.sandbox.docker.env`（或每 agent `agents.list[].sandbox.docker.env`）
- 或将 key 烘焙进自定义沙盒镜像
- 然后运行 `openclaw sandbox recreate --agent <id>`（或 `--all`）

### 服务在跑但端口不监听

若服务显示 **running** 但 gateway 端口无监听，Gateway 很可能拒绝绑定。

**这里的“running”含义：**

- `Runtime: running` 表示 supervisor（launchd/systemd/schtasks）认为进程还活着。
- `RPC probe` 表示 CLI 实际连上 gateway WebSocket 并调用了 `status`。
- 始终以 `Probe target:` + `Config (service):` 作为“我们到底探测了哪里”的准绳。

**检查：**

- `gateway.mode` 必须为 `local` 才能运行 `openclaw gateway` 与服务。
- 若你设置了 `gateway.mode=remote`，**CLI 默认** 会指向远程 URL。服务可能仍在本地运行，但 CLI 在探测错误位置。使用 `openclaw gateway status` 查看服务解析的端口 + 探测目标（或传 `--url`）。
- 当服务看似运行但端口关闭时，`openclaw gateway status` 与 `openclaw doctor` 会从日志中显示 **最近 gateway 错误**。
- 非 loopback 绑定（`lan`/`tailnet`/`custom`，或 loopback 不可用时的 `auto`）需要认证：
  `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- `gateway.remote.token` 仅用于远程 CLI 调用；**不** 启用本地认证。
- `gateway.token` 被忽略；请使用 `gateway.auth.token`。
