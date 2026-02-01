---
summary: "模型认证：OAuth、API keys 与 setup-token"
read_when:
  - 排查模型认证或 OAuth 过期
  - 记录认证或凭据存储
---
# Authentication

OpenClaw 支持模型 providers 的 OAuth 与 API keys。对 Anthropic 账号，推荐使用 **API key**。若使用 Claude 订阅，请使用 `claude setup-token` 生成的长效 token。

完整 OAuth 流程与存储布局见 [/concepts/oauth](/zh/concepts/oauth)。

## 推荐的 Anthropic 配置（API key）

若直接使用 Anthropic，请使用 API key。

1) 在 Anthropic Console 创建 API key。
2) 将其放在**gateway 主机**上（运行 `openclaw gateway` 的机器）。

```bash
export ANTHROPIC_API_KEY="..."
openclaw models status
```

3) 若 Gateway 由 systemd/launchd 运行，建议将 key 放入
`~/.openclaw/.env` 以便 daemon 读取：

```bash
cat >> ~/.openclaw/.env <<'EOT'
ANTHROPIC_API_KEY=...
EOT
```

然后重启 daemon（或重启 Gateway 进程）并复查：

```bash
openclaw models status
openclaw doctor
```

如果不想手动管理 env vars，onboarding 向导可为 daemon 存储 API keys：`openclaw onboard`。

有关 env 继承细节参见 [Help](/zh/help)（`env.shellEnv`、`~/.openclaw/.env`、systemd/launchd）。

## Anthropic：setup-token（订阅认证）

对 Anthropic，推荐路径是 **API key**。若使用 Claude 订阅，亦支持 setup-token。请在**gateway 主机**上运行：

```bash
claude setup-token
```

然后粘贴到 OpenClaw：

```bash
openclaw models auth setup-token --provider anthropic
```

若 token 在其他机器生成，可手动粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

若看到 Anthropic 错误：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

……请改用 Anthropic API key。

手动 token 录入（任意 provider；写入 `auth-profiles.json` 并更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

自动化友好检查（过期/缺失退出码 `1`，即将过期退出码 `2`）：

```bash
openclaw models status --check
```

可选运维脚本（systemd/Termux）见：
[/automation/auth-monitoring](/zh/automation/auth-monitoring)

> `claude setup-token` 需要交互式 TTY。

## 检查模型认证状态

```bash
openclaw models status
openclaw doctor
```

## 控制使用哪份凭据

### 按会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 固定当前会话的 provider 凭据（示例 profile ids：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）查看紧凑选择器；`/model status` 查看完整视图（候选 + 下一 auth profile，以及配置时的 provider endpoint 细节）。

### 按 agent（CLI 覆盖）

为某个 agent 设置显式 auth profile 顺序覆盖（存入该 agent 的 `auth-profiles.json`）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

用 `--agent <id>` 指定目标 agent；省略则使用默认 agent。

## 排查

### “No credentials found”

若缺少 Anthropic token profile，请在**gateway 主机**运行 `claude setup-token`，再复查：

```bash
openclaw models status
```

### Token 即将过期/已过期

运行 `openclaw models status` 查看哪个 profile 即将过期。若 profile 缺失，重新运行 `claude setup-token` 并再次粘贴。

## 要求

- Claude Max 或 Pro 订阅（用于 `claude setup-token`）
- 安装 Claude Code CLI（可用 `claude` 命令）
