---
summary: "模型身份验证：OAuth、API 密钥和 setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "身份验证"
---

# 身份验证（模型提供商）

<Note>本页面涵盖**模型提供商**身份验证（API 密钥、OAuth、设置令牌）。有关**网关连接**身份验证（令牌、密码、受信任代理），请参阅 [Configuration](/en/gateway/configuration) 和 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支持针对模型提供商的 OAuth 和 API 密钥。对于长期运行的网关
主机，API 密钥通常是最可预测的选项。当它们与您的提供商账户模型匹配时，
订阅/OAuth 流程也受支持。

有关完整的 OAuth 流程和存储
布局，请参阅 [/concepts/oauth](/en/concepts/oauth)。
对于基于 SecretRef 的身份验证（`env`/`file`/`exec` 提供商），请参阅 [Secrets Management](/en/gateway/secrets)。
有关 `models status --probe` 使用的凭据资格/原因代码规则，请参阅
[Auth Credential Semantics](/en/auth-credential-semantics)。

## 推荐的设置（API 密钥，任何提供商）

如果您正在运行长期存在的网关，请先为您选择的提供商
创建一个 API 密钥。
特别是对于 Anthropic，API 密钥身份验证是安全的方式，
推荐使用它而不是订阅设置令牌身份验证。

1. 在您的提供商控制台中创建一个 API 密钥。
2. 将其放在 **网关主机**（运行 `openclaw gateway` 的机器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway(网关) 在 systemd/launchd 下运行，最好将密钥放在
   `~/.openclaw/.env` 中，以便守护进程可以读取它：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然后重启守护进程（或重启您的 Gateway(网关) 进程）并重新检查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自己管理环境变量，新手引导 可以存储
供守护进程使用的 API 密钥：`openclaw onboard`。

有关环境继承的详细信息，请参阅 [Help](/en/help)（`env.shellEnv`，
`~/.openclaw/.env`，systemd/launchd）。

## Anthropic：setup-token（订阅身份验证）

如果您使用的是 Claude 订阅，则支持 setup-token 流程。在
**网关主机**上运行它：

```bash
claude setup-token
```

然后将其粘贴到 OpenClaw 中：

```bash
openclaw models auth setup-token --provider anthropic
```

如果令牌是在另一台机器上创建的，请手动粘贴它：

```bash
openclaw models auth paste-token --provider anthropic
```

如果您看到 Anthropic 错误，例如：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

……请改用 Anthropic API 密钥。

<Warning>Anthropic setup-token 支持仅限技术兼容性。Anthropic 过去曾阻止在 Claude Code 之外的部分订阅使用。仅在您认为政策风险可接受时使用，并请自行核实 Anthropic 的当前条款。</Warning>

手动令牌输入（任意提供商；写入 `auth-profiles.json` + 更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

静态凭据也支持 Auth profile 引用：

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式配置文件不支持 SecretRef 凭据；如果 `auth.profiles.<id>.mode` 设置为 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。

自动化友好的检查（过期/缺失时退出 `1`，即将过期时退出 `2`）：

```bash
openclaw models status --check
```

可选的运维脚本（systemd/Termux）在此处记录：
[/automation/auth-monitoring](/en/automation/auth-monitoring)

> `claude setup-token` 需要交互式 TTY。

## Anthropic：Claude CLI 迁移

如果在网关主机上已经安装并登录了 Claude CLI，您可以将现有的 Anthropic 设置切换到 CLI 后端，而无需粘贴 setup-token：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

这将保留您现有的 Anthropic 身份验证配置文件以便回滚，但会将默认模型选择更改为 `claude-cli/...`，并在 `agents.defaults.models` 下添加匹配的 Claude CLI 允许列表条目。

新手引导快捷方式：

```bash
openclaw onboard --auth-choice anthropic-cli
```

## 检查模型身份验证状态

```bash
openclaw models status
openclaw doctor
```

## API 密钥轮换行为（网关）

当 API 调用达到提供商速率限制时，某些提供商支持使用备用密钥重试请求。

- 优先级顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单一覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供商还包括 `GOOGLE_API_KEY` 作为额外的备用。
- 相同的密钥列表在使用前会进行去重。
- OpenClaw 仅在遇到速率限制错误（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`）时才使用下一个密钥进行重试。
- 非速率限制错误不会使用备用密钥进行重试。
- 如果所有密钥都失败，则返回最后一次尝试的最终错误。

## 控制使用哪个凭据

### 每次会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 为当前会话固定特定的提供商凭据（示例配置文件 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）打开紧凑选择器；使用 `/model status` 查看完整视图（候选配置文件 + 下一个认证配置文件，以及在配置时显示的提供商端点详细信息）。

### 每个代理（CLI 覆盖）

为代理设置显式的认证配置文件顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 指定特定代理；省略它以使用配置的默认代理。

## 故障排除

### “未找到凭据”

如果 Anthropic 令牌配置文件丢失，请在
**网关主机**上运行 `claude setup-token`，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果配置文件
丢失，请重新运行 `claude setup-token` 并再次粘贴令牌。

## 要求

- Anthropic 订阅帐户（用于 `claude setup-token`）
- 已安装 Claude Code CLI（可用 `claude` 命令）
