---
summary: "模型身份验证：OAuth、API 密钥和 setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "身份验证"
---

# 身份验证

OpenClaw 支持模型提供商的 OAuth 和 API 密钥。对于常驻网关
主机，API 密钥通常是最可预测的选项。当订阅/OAuth
流程符合您的提供商账户模型时，也支持这些流程。

有关完整的 OAuth 流程和存储布局，请参阅 [/concepts/oauth](/en/concepts/oauth)。
对于基于 SecretRef 的身份验证（`env`/`file`/`exec` 提供商），请参阅 [密钥管理](/en/gateway/secrets)。
有关 `models status --probe` 使用的凭据资格/原因代码规则，请参阅
[Auth Credential Semantics](/en/auth-credential-semantics)。

## 推荐设置（API 密钥，任何提供商）

如果您运行的是长期存在的网关，请首先为您选择的
提供商使用 API 密钥。
对于 Anthropic，API 密钥身份验证是安全路径，推荐
使用而不是订阅 setup-token 身份验证。

1. 在您的提供商控制台中创建一个 API 密钥。
2. 将其放在 **gateway host**（运行 `openclaw gateway` 的计算机）上。

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

如果您不想自己管理环境变量，新手引导可以存储
API 密钥供守护进程使用：`openclaw onboard`。

有关环境变量继承的详细信息，请参阅 [帮助](/en/help)（`env.shellEnv`，
`~/.openclaw/.env`，systemd/launchd）。

## Anthropic：setup-token（订阅身份验证）

如果您使用的是 Claude 订阅，则支持 setup-token 流程。请在
**Gateway 主机**上运行它：

```bash
claude setup-token
```

然后将其粘贴到 OpenClaw 中：

```bash
openclaw models auth setup-token --provider anthropic
```

如果令牌是在另一台机器上创建的，请手动粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

如果您看到类似如下的 Anthropic 错误：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

...请改用 Anthropic API 密钥。

<Warning>Anthropic setup-token 支持仅限技术兼容性。Anthropic 过去曾在 Claude Code 之外阻止部分订阅使用。仅当您确定政策风险可接受时才使用它，并自行验证 Anthropic 的当前条款。</Warning>

手动令牌输入（任何提供商；写入 `auth-profiles.json` + 更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

静态凭据也支持身份验证配置文件引用：

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`

自动化友好的检查（过期/缺失时退出 `1`，即将过期时退出 `2`）：

```bash
openclaw models status --check
```

此处记录了可选的运维脚本（systemd/Termux）：
[/automation/auth-monitoring](/en/automation/auth-monitoring)

> `claude setup-token` 需要交互式 TTY。

## Anthropic：Claude CLI 迁移

如果 gateway host 上已安装并登录 Claude CLI，您可以将现有的 Anthropic 设置切换到 CLI 后端，而不是粘贴 setup-token：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

这将保留您现有的 Anthropic 身份验证配置文件以便回滚，但会将默认模型选择更改为 `claude-cli/...` 并在 `agents.defaults.models` 下添加匹配的 Claude CLI 允许列表条目。

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

- 优先顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供商还包括 `GOOGLE_API_KEY` 作为额外的备用。
- 相同的密钥列表在使用前会进行去重。
- OpenClaw 仅针对速率限制错误（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）使用下一个密钥进行重试。
- 非速率限制错误不会使用备用密钥重试。
- 如果所有密钥都失败，将返回最后一次尝试的最终错误。

## 控制使用的凭证

### 每次会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 为当前会话锁定特定的提供商凭证（示例配置文件 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`） 获取紧凑选择器；使用 `/model status` 获取完整视图（候选者 + 下一个身份验证配置文件，以及配置时的提供商端点详细信息）。

### 每个代理（CLI 覆盖）

为代理设置显式的身份验证配置文件顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 来指定特定的代理；省略它以使用配置的默认代理。

## 故障排除

### "未找到凭证"

如果 Anthropic 令牌配置文件缺失，请在 **网关主机** 上运行 `claude setup-token`，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果配置文件缺失，请重新运行 `claude setup-token` 并再次粘贴令牌。

## 要求

- Anthropic 订阅账户（用于 `claude setup-token`）
- 已安装 Claude Code CLI（`claude` 命令可用）
