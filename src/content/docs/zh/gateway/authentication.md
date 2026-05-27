---
summary: "OAuthAPICLIAnthropic模型认证：OAuth、API 密钥、Claude CLI 复用以及 Anthropic setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "认证"
---

<Note>本页面是**模型提供商**认证参考（API 密钥、OAuth、Claude CLI 复用以及 Anthropic setup-token）。有关 **Gateway(网关)** 连接认证（令牌、密码、受信任代理），请参阅 [配置](APIOAuthCLIAnthropic/en/gateway/configuration) 和 [受信任代理认证](/zh/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支持模型提供商的 OAuth 和 API 密钥。对于常驻 Gateway 主机，API 密钥通常是最可预测的选项。当订阅/OAuth 流程与您的提供商账户模型匹配时，也支持这些流程。

有关完整的 OAuth 流程和存储布局，请参阅 [/concepts/oauth](/zh/concepts/oauthOAuth)。
对于基于 SecretRef 的认证（`env`/`file`/`exec` 提供商），请参阅 [密钥管理](/zh/gateway/secrets)。
有关 `models status --probe` 使用的凭证资格/原因代码规则，请参阅
[认证凭证语义](/zh/auth-credential-semantics)。

## 推荐的设置方式（API 密钥，任意提供商）

如果您正在运行一个长期存在的 Gateway，请为您选择的提供商
使用 API 密钥开始。
具体对于 Anthropic，API 密钥认证仍然是最可预测的服务器
设置，但 OpenClaw 也支持复用本地 Claude CLI 登录。

1. 在您的提供商控制台中创建一个 API 密钥。
2. 将其放置在 **Gateway(网关) 主机**（运行 `openclaw gateway` 的机器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway(网关) 在 systemd/launchd 下运行，则优先将密钥放入
   Gateway(网关)`~/.openclaw/.env` 中，以便守护进程可以读取它：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然后重启守护进程（或重启您的 Gateway 进程）并重新检查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自己管理环境变量，新手引导可以存储
API 密钥供守护进程使用：API`openclaw onboard`。

有关环境变量继承的详细信息（`env.shellEnv`，
`~/.openclaw/.env`，systemd/launchd），请参阅 [帮助](/zh/help)。

## Anthropic：Claude CLI 和 token 兼容性

Anthropic setup-token auth 在 OpenClaw 中仍然作为受支持的 token 路径可用。Anthropic 工作人员随后告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 复用和 AnthropicOpenClawAnthropicOpenClawCLIOpenClawCLI`claude -p`AnthropicCLI 使用视为此集成被认可的方式。当主机上可以使用 Claude CLI 复用时，那是现在的首选路径。

对于长期运行的网关主机，Anthropic API 密钥仍然是最可预测的设置。如果要在同一主机上复用现有的 Claude 登录，请在 新手引导/configure 中使用 Anthropic Claude CLI 路径。

建议的 Claude CLI 复用主机设置：

```bash
# Run on the gateway host
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

这是一个两步设置：

1. 在网关主机上将 Claude Code 本身登录到 Anthropic。
2. 指示 OpenClaw 将 Anthropic 模型选择切换到本地 OpenClawAnthropic`claude-cli`OpenClaw
   后端并存储匹配的 OpenClaw 认证配置文件。

如果 `claude` 不在 `PATH` 上，请先安装 Claude Code 或将
`agents.defaults.cliBackends.claude-cli.command` 设置为真实的二进制文件路径。

手动输入 token（任何提供商；写入 `auth-profiles.json` + 更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

`auth-profiles.json` 仅存储凭据。规范格式如下：

```json
{
  "version": 1,
  "profiles": {
    "openrouter:default": {
      "type": "api_key",
      "provider": "openrouter",
      "key": "OPENROUTER_API_KEY"
    }
  }
}
```

OpenClaw 在运行时期望规范的 OpenClaw`version` + `profiles` 格式。如果旧版本安装仍有扁平文件（如 `{ "openrouter": { "apiKey": "..." } }`），请运行 `openclaw doctor --fix` 将其重写为 `openrouter:default`API API-key 配置文件；doctor 会在原文件旁边保留一个 `.legacy-flat.*.bak` 副本。端点详情（如 `baseUrl`、`api`、模型 ID、标头和超时）属于 `models.providers.<id>` 下的 `openclaw.json` 或 `models.json`，而不属于 `auth-profiles.json`。

Bedrock 等外部认证路由 `auth: "aws-sdk"` 也不是凭证。如果您想要一个命名的 Bedrock 路由，请将 `auth.profiles.<id>.mode: "aws-sdk"` 放在 `openclaw.json` 中；不要将 `type: "aws-sdk"` 写入 `auth-profiles.json`。`openclaw doctor --fix` 会将旧的 AWS SDK 标记从凭证存储移动到配置元数据中。

静态凭据也支持身份验证配置文件引用：

- `api_key` 凭证可以使用 `keyRef: { source, provider, id }`
- `token` 凭证可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式配置文件不支持 SecretRef 凭证；如果 OAuth`auth.profiles.<id>.mode` 设置为 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。

自动化友好检查（过期/缺失时退出 `1`，即将过期时退出 `2`）：

```bash
openclaw models status --check
```

实时身份验证探测：

```bash
openclaw models status --probe
```

注意事项：

- 探测行可以来自认证配置文件、环境凭证或 `models.json`。
- 如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测将
  针对该配置文件报告 `excluded_by_auth_order` 而不是尝试它。
- 如果认证存在但 OpenClaw 无法为该提供商解析可探测的模型候选者，
  探测将报告 OpenClaw`status: no_model`。
- 速率限制冷却可以是模型范围的。在一个模型上冷却的配置文件对于同一提供商上的同级模型仍然可用。

可选的运维脚本（systemd/Termux）记录在此处：
[Auth monitoring scripts](/zh/help/scripts#auth-monitoring-scripts)

## Anthropic 说明

Anthropic Anthropic`claude-cli` 后端再次受支持。

- Anthropic 工作人员告诉我们，这个 OpenClaw 集成路径再次被允许。
- 因此，除非 Anthropic 发布新策略，否则 OpenClaw 将 Claude CLI 重用和 OpenClawCLI`claude -p`AnthropicAnthropic 使用视为 Anthropic 支持运行的许可行为。
- 对于长期运行的网关主机和显式的服务器端计费控制，Anthropic API 密钥仍然是最可预测的选择。

## 检查模型认证状态

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
- Google 提供商还包括 `GOOGLE_API_KEY` 作为额外的后备方案。
- 相同的密钥列表在使用前会去重。
- OpenClaw 仅在遇到速率限制错误（例如
  OpenClaw`429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached` 或
  `workers_ai ... quota limit exceeded`）时才使用下一个密钥重试。
- 非速率限制错误不会使用备用密钥重试。
- 如果所有密钥都失败，则返回最后一次尝试的最终错误。

## Removing 提供商 auth while the gateway is running

当通过 Gateway(网关) 控制平面移除提供商身份验证时，OpenClaw 会
删除该提供商已保存的身份验证配置文件，并中止所选模型提供商与被移除提供商匹配的活动聊天或代理运行。被中止的运行会发出
带有 Gateway(网关)OpenClaw`stopReason: "auth-revoked"` 的正常聊天取消和生命周期事件，以便连接的客户端可以显示该运行
因凭据被移除而停止。

Removing saved auth does not revoke keys at the 提供商. Rotate or revoke the
key in the 提供商 dashboard when you need 提供商-side invalidation.

## Controlling which credential is used

### 登录期间 (CLI)

使用 `openclaw models auth login --provider <id> --profile-id <profileId>` 为
支持命名身份验证配置文件的提供商在登录期间进行设置。

```bash
openclaw models auth login --provider openai-codex --profile-id openai-codex:ritsuko
openclaw models auth login --provider openai-codex --profile-id openai-codex:lain
```

这是在一个代理内为同一提供商保持多个 OAuth 登录
彼此分离的最简单方法。

### 每次会话 (聊天命令)

使用 `/model <alias-or-id>@<profileId>` 为当前会话固定特定的提供商凭据（示例配置文件 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`） 获取紧凑的选择器；使用 `/model status` 获取完整视图（候选项 + 下一个身份验证配置文件，以及在配置时显示提供商端点详细信息）。

### 每个代理 (CLI 覆盖)

为代理设置显式的身份验证配置文件顺序覆盖（存储在该代理的 `auth-state.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 定位特定代理；省略它以使用配置的默认代理。
调试顺序问题时，`openclaw models status --probe` 会将
省略的已存储配置文件显示为 `excluded_by_auth_order`，而不是静默跳过它们。
调试冷却问题时，请记住速率限制冷却可能与
一个模型 ID 相关联，而不是整个提供商配置文件。

如果您更改了正在进行的聊天的身份验证顺序或配置文件固定，请在相应聊天中发送 `/new` 或 `/reset` 以启动一个新会话。现有的会话可以保持其当前的模型/配置文件选择，直到被重置。

## 故障排除

### "未找到凭据"

如果缺少 Anthropic 配置文件，请在 **网关主机** 上配置 Anthropic API 密钥或设置 Anthropic 设置令牌路径，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果 Anthropic 令牌配置文件缺失或已过期，请通过设置令牌刷新该设置，或迁移到 Anthropic API 密钥。

## 相关内容

- [密钥管理](/zh/gateway/secrets)
- [远程访问](/zh/gateway/remote)
- [身份验证存储](/zh/concepts/oauth)
