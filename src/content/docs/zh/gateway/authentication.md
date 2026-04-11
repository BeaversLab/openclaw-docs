---
summary: "模型身份验证：OAuth、API 密钥、Claude CLI 复用以及 Anthropic setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "身份验证"
---

# 身份验证（模型提供商）

<Note>本页涵盖**模型提供商**身份验证（API 密钥、OAuth、Claude CLI 复用以及 Anthropic setup-token）。有关 **Gateway(网关) 连接**身份验证（令牌、密码、trusted-proxy），请参阅 [配置](/en/gateway/configuration) 和 [可信代理身份验证](/en/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支持针对模型提供商的 OAuth 和 API 密钥。对于长期运行的网关
主机，API 密钥通常是最可预测的选项。当它们与您的提供商账户模型匹配时，
订阅/OAuth 流程也受支持。

请参阅 [/concepts/oauth](/en/concepts/oauth) 以了解完整的 OAuth 流程和存储
布局。
对于基于 SecretRef 的身份验证（`env`/`file`/`exec` 提供商），请参阅 [机密管理](/en/gateway/secrets)。
有关 `models status --probe` 使用的凭据资格/原因代码规则，请参阅
[身份验证凭据语义](/en/auth-credential-semantics)。

## 推荐的设置（API 密钥，任何提供商）

如果您运行的是长时间存活的 Gateway(网关)，请首先为您选择的
提供商使用 API 密钥。
对于 Anthropic，API 密钥身份验证仍然是最可预测的服务器
设置方式，但 OpenClaw 也支持复用本地的 Claude CLI 登录。

1. 在您的提供商控制台中创建一个 API 密钥。
2. 将其放在 **Gateway(网关) 主机**（运行 `openclaw gateway` 的机器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway(网关) 在 systemd/launchd 下运行，最好将密钥放入
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

有关环境变量继承的详细信息（`env.shellEnv`，
`~/.openclaw/.env`，systemd/launchd），请参阅 [帮助](/en/help)。

## Anthropic：Claude CLI 和令牌兼容性

Anthropic setup-token 身份验证在 OpenClaw 中仍然作为受支持的令牌
路径可用。Anthropic 工作人员随后告诉我们，OpenClaw 风格的 Claude CLI 使用
再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为
此集成的认可方式。当主机上可用 Claude CLI
复用时，这现在是首选路径。

对于长期运行的网关主机，Anthropic API 密钥仍然是最可预测的设置方式。如果您想在同一主机上复用现有的 Claude 登录信息，请在 新手引导/configure 中使用 Anthropic Claude CLI 路径。

手动令牌输入（任何提供商；写入 `auth-profiles.json` + 更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

静态凭据也支持身份配置文件引用：

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式配置文件不支持 SecretRef 凭据；如果 `auth.profiles.<id>.mode` 设置为 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。

自动化友好检查（过期/缺失时退出 `1`，即将过期时退出 `2`）：

```bash
openclaw models status --check
```

实时身份验证探测：

```bash
openclaw models status --probe
```

备注：

- 探测行可以来自身份配置文件、环境凭据或 `models.json`。
- 如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测将针对该配置文件报告 `excluded_by_auth_order`，而不是尝试它。
- 如果身份验证存在，但 OpenClaw 无法解析该提供商的可探测模型候选项，探测将报告 `status: no_model`。
- 速率限制冷却可以是模型范围的。针对一个模型冷却的配置文件对于同一提供商上的同级模型仍然可用。

可选的运维脚本（systemd/Termux）记录在此处：
[Auth monitoring scripts](/en/help/scripts#auth-monitoring-scripts)

## Anthropic 备注

Anthropic `claude-cli` 后端再次受支持。

- Anthropic 工作人员告知我们，此 OpenClaw 集成路径再次被允许。
- 因此，除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 复用和 `claude -p` 的使用视为在 Anthropic 支持的运行中被允许。
- 对于长期运行的网关主机和显式的服务器端计费控制，Anthropic API 密钥仍然是最可预测的选择。

## 检查模型身份验证状态

```bash
openclaw models status
openclaw doctor
```

## API 密钥轮换行为（网关）

当 API 调用达到提供商速率限制时，某些提供商支持使用备用密钥重试请求。

- 优先级顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供商还包括 `GOOGLE_API_KEY` 作为额外的备用方案。
- 相同的密钥列表在使用前会进行去重。
- OpenClaw 仅针对速率限制错误（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached` 或
  `workers_ai ... quota limit exceeded`）使用下一个密钥进行重试。
- 非速率限制错误不会使用备用密钥进行重试。
- 如果所有密钥均失败，则返回最后一次尝试的最终错误。

## 控制使用哪个凭证

### 每次会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 为当前会话指定特定的提供商凭证（示例配置文件 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`） 以获得紧凑的选择器；使用 `/model status` 查看完整视图（候选项 + 下一个身份验证配置文件，以及在配置时提供的提供商端点详情）。

### 每个代理（CLI 覆盖）

为代理设置显式的身份验证配置文件顺序覆盖（存储在该代理的 `auth-state.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 以定位特定代理；省略它则使用配置的默认代理。
当您调试顺序问题时，`openclaw models status --probe` 会将省略的存储配置文件显示为 `excluded_by_auth_order`，而不是静默跳过它们。
当您调试冷却问题时，请记住速率限制冷却可能绑定到某个模型 ID，而不是整个提供商配置文件。

## 故障排除

### "未找到凭证"

如果 Anthropic 配置文件丢失，请在**网关主机**上配置 Anthropic API 密钥或设置 Anthropic setup-token 路径，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果 Anthropic 令牌配置文件丢失或已过期，请通过 setup-token 刷新该设置，或迁移到 Anthropic API 密钥。
