---
summary: "OpenClaw 中的 OAuth：令牌交换、存储和多账户模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw 支持通过 OAuth 进行“订阅认证”，适用于提供此功能的提供商
（尤其是 **OpenAI Codex (ChatGPT OAuth)**）。对于 Anthropic，实际的划分
现在是：

- **Anthropic API 密钥**：标准的 Anthropic API 计费
- **Anthropic Claude CLI / subscription auth inside OpenClaw**: Anthropic staff
  told us this usage is allowed again

OpenAI Codex OAuth 明确支持用于 OpenClaw 等外部工具。本页面解释：

对于生产环境中的 Anthropic，API 密钥认证是更安全的推荐路径。

- OAuth **令牌交换** 是如何工作的 (PKCE)
- 令牌 **存储** 在哪里（以及为什么）
- 如何处理 **多个账户** (配置文件 + 每次会话覆盖)

OpenClaw 还支持 **提供商插件**，它们自带 OAuth 或 API‑key
流程。通过以下方式运行它们：

```bash
openclaw models auth login --provider <id>
```

## 令牌汇聚（其存在原因）

OAuth 提供商通常在登录/刷新流程中颁发一个 **新的刷新令牌**。当为同一用户/应用颁发新令牌时，某些提供商（或 OAuth 客户端）会使旧的刷新令牌失效。

实际表现：

- 你通过 OpenClaw _以及_ Claude Code / Codex CLI 登录 → 其中一个稍后会随机“被登出”

为了减少这种情况，OpenClaw 将 `auth-profiles.json` 视为 **令牌汇聚**：

- 运行时从 **一个地方** 读取凭据
- 我们可以保留多个配置文件并确定性地路由它们
- 当从 Codex CLI 等外部 CLI 重用凭据时，OpenClaw
  会按来源复制它们并重新读取该外部来源，而不是
  自行轮换刷新令牌

## 存储（令牌所在地）

机密按 **代理** 存储：

- 认证配置文件 (OAuth + API 密钥 + 可选的值级引用): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版兼容性文件: `~/.openclaw/agents/<agentId>/agent/auth.json`
  (发现静态 `api_key` 条目时会将其清除)

旧版仅导入文件（仍受支持，但不是主要存储）：

- `~/.openclaw/credentials/oauth.json` (首次使用时导入到 `auth-profiles.json`)

All of the above also respect `$OPENCLAW_STATE_DIR` (state dir override). Full reference: [/gateway/configuration](/zh/gateway/configuration-reference#auth-storage)

For static secret refs and runtime snapshot activation behavior, see [Secrets Management](/zh/gateway/secrets).

## Anthropic 遗留令牌兼容性

<Warning>
Anthropic's public Claude Code docs say direct Claude Code use stays within
Claude subscription limits, and Anthropic staff told us OpenClaw-style Claude
CLI usage is allowed again. OpenClaw therefore treats Claude CLI reuse and
`claude -p` usage as sanctioned for this integration unless Anthropic
publishes a new policy.

For Anthropic's current direct-Claude-Code plan docs, see [Using Claude Code
with your Pro or Max
plan](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
and [Using Claude Code with your Team or Enterprise
plan](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/).

If you want other subscription-style options in OpenClaw, see [OpenAI
Codex](/zh/providers/openai), [Qwen Cloud Coding
Plan](/zh/providers/qwen), [MiniMax Coding Plan](/zh/providers/minimax),
and [Z.AI / GLM Coding Plan](/zh/providers/glm).

</Warning>

OpenClaw also exposes Anthropic setup-token as a supported token-auth path, but it now prefers Claude CLI reuse and `claude -p` when available.

## Anthropic Claude CLI 迁移

OpenClaw supports Anthropic Claude CLI reuse again. If you already have a local
Claude login on the host, 新手引导/configure can reuse it directly.

## OAuth 交换 (登录工作原理)

OpenClaw’s interactive login flows are implemented in `@mariozechner/pi-ai` and wired into the wizards/commands.

### Anthropic setup-token

流程形式：

1. 从 Anthropic 启动 OpenClaw setup-token 或粘贴令牌
2. OpenClaw 将生成的 Anthropic 凭据存储在身份验证配置文件中
3. 模型 selection stays on `anthropic/...`
4. 现有的 Anthropic 身份验证配置文件仍可用于回滚/顺序控制

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

流程形状 (PKCE)：

1. generate PKCE verifier/challenge + random `state`
2. open `https://auth.openai.com/oauth/authorize?...`
3. try to capture callback on `http://127.0.0.1:1455/auth/callback`
4. 如果回调无法绑定（或者您处于远程/无头模式），请粘贴重定向 URL/代码
5. exchange at `https://auth.openai.com/oauth/token`
6. extract `accountId` from the access token and store `{ access, refresh, expires, accountId }`

Wizard path is `openclaw onboard` → auth choice `openai-codex`.

## 刷新 + 过期

Profiles store an `expires` timestamp.

运行时：

- 如果 `expires` 在未来 → 使用存储的访问令牌
- 如果已过期 → 刷新（在文件锁定下）并覆盖存储的凭据
- 例外：重用的外部 CLI 凭据保持外部管理；OpenClaw 重新读取 CLI 认证存储，并且自身从不使用复制的刷新令牌

刷新流程是自动的；通常您不需要手动管理令牌。

## 多个账户（配置文件）+ 路由

两种模式：

### 1) 推荐：独立的代理

如果您希望“个人”和“工作”互不干扰，请使用隔离的代理（独立的会话 + 凭据 + 工作区）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后为每个代理配置认证（向导）并将聊天路由到正确的代理。

### 2) 高级：一个代理中的多个配置文件

`auth-profiles.json` 支持同一提供商的多个配置文件 ID。

选择使用哪个配置文件：

- 通过配置顺序全局设置（`auth.order`）
- 通过 `/model ...@<profileId>` 按会话设置

示例（会话覆盖）：

- `/model Opus@anthropic:work`

如何查看存在哪些配置文件 ID：

- `openclaw channels list --json` （显示 `auth[]`）

相关文档：

- [/concepts/模型-failover](/zh/concepts/model-failover) （轮换 + 冷却规则）
- [/tools/slash-commands](/zh/tools/slash-commands) （命令界面）

## 相关

- [Authentication](/zh/gateway/authentication) — 模型提供商身份验证概览
- [Secrets](/zh/gateway/secrets) — 凭据存储和 SecretRef
- [Configuration Reference](/zh/gateway/configuration-reference#auth-storage) — 身份验证配置键
