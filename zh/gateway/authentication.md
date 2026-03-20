---
summary: "模型身份验证：OAuth、API 密钥和 setup-token"
read_when:
  - 调试模型身份验证或 OAuth 过期
  - 记录身份验证或凭据存储
title: "Authentication"
---

# Authentication

OpenClaw 支持模型提供商的 OAuth 和 API 密钥。对于长期运行的 Gateway 主机，API 密钥通常是可预测性最高的选项。当订阅/OAuth 流程符合您的提供商账户模型时，也支持这些流程。

请参阅 [/concepts/oauth](/zh/concepts/oauth) 以了解完整的 OAuth 流程和存储布局。
对于基于 SecretRef 的身份验证（`env`/`file`/`exec` 提供商），请参阅 [Secrets Management](/zh/gateway/secrets)。
有关 `models status --probe` 使用的凭据资格/原因代码规则，请参阅 [Auth Credential Semantics](/zh/auth-credential-semantics)。

## Recommended setup (API key, any 提供商)

如果您运行的是长期存在的 Gateway，请先为您选择的提供商创建一个 API 密钥。
特别是对于 Anthropic，API 密钥身份验证是安全路径，建议使用它而不是订阅 setup-token 身份验证。

1. 在您的提供商控制台中创建一个 API 密钥。
2. 将其放在 **gateway host** 上（运行 `openclaw gateway` 的机器）。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 在 systemd/launchd 下运行，建议将密钥放在
   `~/.openclaw/.env` 中，以便守护程序读取它：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然后重启守护程序（或重启您的 Gateway 进程）并再次检查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自己管理环境变量，新手引导可以存储
API 密钥供守护程序使用：`openclaw onboard`。

请参阅 [Help](/zh/help) 了解有关环境继承的详细信息（`env.shellEnv`，
`~/.openclaw/.env`，systemd/launchd）。

## Anthropic: setup-token (subscription auth)

如果您使用的是 Claude 订阅，则支持 setup-token 流程。请
在 **gateway host** 上运行它：

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

...请改用 Anthropic API 密钥。

<Warning>
Anthropic setup-token 支持仅限于技术兼容性。Anthropic 过去曾阻止在 Claude Code 之外的部分订阅使用。仅当您决定可以接受政策风险时才使用它，并请自行验证 Anthropic 的当前条款。
</Warning>

手动输入令牌（任何提供商；写入 `auth-profiles.json` + 更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

静态凭据也支持 Auth profile 引用：

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`

适合自动化的检查（过期/缺失时退出 `1`，即将过期时退出 `2`）：

```bash
openclaw models status --check
```

可选的运维脚本（systemd/Termux）在此处有记录：
[/automation/auth-monitoring](/zh/automation/auth-monitoring)

> `claude setup-token` 需要交互式 TTY。

## 检查模型身份验证状态

```bash
openclaw models status
openclaw doctor
```

## API 密钥轮换行为（网关）

当 API 调用达到提供商速率限制时，部分提供商支持使用备用密钥重试请求。

- 优先级顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单一覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供商还包括 `GOOGLE_API_KEY` 作为额外的回退选项。
- 相同的密钥列表在使用前会去重。
- OpenClaw 仅针对速率限制错误（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）使用下一个密钥进行重试。
- 非速率限制错误不会使用备用密钥进行重试。
- 如果所有密钥都失败，则返回最后一次尝试的最终错误。

## 控制使用哪个凭据

### 每次会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 为当前会话固定特定的提供商凭据（示例配置文件 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）打开紧凑选择器；使用 `/model status` 查看完整视图（候选项 + 下一个身份验证配置文件，以及配置时的提供商端点详细信息）。

### 每个代理（CLI 覆盖）

为代理设置显式的身份验证配置文件顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 来定位特定代理；省略它以使用配置的默认代理。

## 故障排除

### "未找到凭据"

如果 Anthropic 令牌配置文件缺失，请在
**网关主机** 上运行 `claude setup-token`，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果配置文件
缺失，请重新运行 `claude setup-token` 并再次粘贴令牌。

## 要求

- Anthropic 订阅账户（用于 `claude setup-token`）
- 已安装 Claude Code CLI（`claude` 命令可用）

import en from "/components/footer/en.mdx";

<en />
