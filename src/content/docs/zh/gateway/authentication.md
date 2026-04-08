---
summary: "模型身份验证：OAuth、API 密钥和旧版 Anthropic 设置令牌"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "身份验证"
---

# 身份验证（模型提供商）

<Note>本页面涵盖 **模型提供商** 的身份验证（API 密钥、OAuth 和旧版 Anthropic 设置令牌）。有关 **网关连接** 的身份验证（令牌、密码、受信任代理），请参阅 [配置](/en/gateway/configuration) 和 [受信任代理身份验证](/en/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支持针对模型提供商的 OAuth 和 API 密钥。对于长期运行的网关
主机，API 密钥通常是最可预测的选项。当它们与您的提供商账户模型匹配时，
订阅/OAuth 流程也受支持。

有关完整的 OAuth 流程和存储布局，请参阅 [/concepts/oauth](/en/concepts/oauth)。
对于基于 SecretRef 的身份验证（`env`/`file`/`exec` 提供商），请参阅 [密钥管理](/en/gateway/secrets)。
有关 `models status --probe` 使用的凭据资格/原因代码规则，请参阅[身份验证凭据语义](/en/auth-credential-semantics)。

## 推荐的设置（API 密钥，任何提供商）

如果您正在运行长期运行的网关，请首先为您选择的
提供商使用 API 密钥。
具体对于 Anthropic，API 密钥身份验证是安全的选择。
OpenClaw 内部的 Anthropic 订阅式身份验证是旧版设置令牌路径，
应视为**额外使用**路径，而非计划限制路径。

1. 在您的提供商控制台中创建一个 API 密钥。
2. 将其放在 **网关主机**（运行 `openclaw gateway` 的机器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 在 systemd/launchd 下运行，最好将密钥放在
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

## Anthropic：旧版令牌兼容性

Anthropic 设置令牌身份验证在 OpenClaw 中仍作为
旧版/手动路径可用。Anthropic 的公共 Claude Code 文档仍涵盖
Claude 计划下的直接 Claude Code 终端使用，但 Anthropic 单独告知
OpenClaw 用户，**OpenClaw** Claude 登录路径被视为第三方
工具使用，并且需要独立于订阅计费的 **额外使用**。

为了获得最清晰的设置路径，请使用 Anthropic API 密钥。如果您必须在 OpenClaw 中保留订阅式的 Anthropic 路径，请使用旧版 setup-token 路径，并预期 Anthropic 会将其视为 **Extra Usage**。

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

Anthropic `claude-cli` 后端已被移除。

- 在 OpenClaw 中为 Anthropic 流量使用 API Anthropic 密钥。
- Anthropic setup-token 仍然是旧版/手动路径，应结合 Anthropic 向 OpenClaw 用户传达的 Extra Usage 计费预期来使用。
- `openclaw doctor` 现在可以检测已过时的已移除 Anthropic Claude CLI 状态。如果存储的凭据字节仍然存在，doctor 会将它们转换回 Anthropic 令牌/OAuth 配置文件。如果没有，doctor 会移除过时的 Claude CLI 配置，并指引您进行 API 密钥或 setup-token 恢复。

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

为代理设置显式的身份验证配置文件顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

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

如果 Anthropic 配置文件缺失，请在 **网关主机** 上配置 Anthropic API 密钥或设置旧版 Anthropic 设置令牌路径，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果旧的 Anthropic 令牌配置文件缺失或已过期，请通过 setup-token 刷新该设置，或迁移到 Anthropic API 密钥。

如果机器上仍有来自旧版本的陈旧已移除的 Anthropic Claude CLI 状态，请运行：

```bash
openclaw doctor --yes
```

当存储的凭据字节仍然存在时，Doctor 会将 `anthropic:claude-cli` 转换回 Anthropic 令牌/OAuth。否则，它会移除过时的 Claude CLI 配置文件/配置/模型引用，并保留后续步骤指导。
