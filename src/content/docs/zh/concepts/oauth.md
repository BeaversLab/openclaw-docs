---
summary: "OpenClaw 中的 OAuth：令牌交换、存储和多账户模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

OpenClaw 支持通过 OAuth 进行“订阅认证”，适用于提供此功能的提供商（尤其是 **OpenAI Codex (ChatGPT OAuth)**）。对于 Anthropic，实际现在的划分是：

- **Anthropic API 密钥**：正常的 Anthropic API 计费
- **OpenClaw 内部的 Anthropic Claude CLI / 订阅认证**：Anthropic 员工告诉我们这种用法再次被允许了

OpenAI Codex OAuth 明确支持在外部工具（如 OpenClaw）中使用。本页面解释了：

对于生产环境中的 Anthropic，API 密钥认证是更安全的推荐路径。

- OAuth **令牌交换** 是如何工作的 (PKCE)
- 令牌**存储**在何处（以及原因）
- 如何处理**多个账户**（配置文件 + 每次会话覆盖）

OpenClaw 还支持自带 OAuth 或 API 密钥流程的**提供商插件**。通过以下方式运行它们：

```bash
openclaw models auth login --provider <id>
```

## 令牌汇聚（它存在的原因）

OAuth 提供商通常会在登录/刷新期间生成一个**新的刷新令牌**。当为同一用户/应用颁发新令牌时，某些提供商（或 OAuth 客户端）可能会使旧的刷新令牌失效。

实际表现症状：

- 你通过 OpenClaw 登录*并且*通过 Claude Code / Codex CLI 登录 → 其中一个随后会随机“被登出”

为了减少这种情况，OpenClaw 将 `auth-profiles.json` 视为**令牌汇聚**：

- 运行时从**一个地方**读取凭据
- 我们可以保留多个配置文件并确定性地路由它们
- 外部 CLI 的重用因提供商而异：Codex CLI 可以引导一个空的 `openai-codex:default` 配置文件，但一旦 OpenClaw 拥有本地 OAuth 配置文件，本地刷新令牌即为权威；其他集成可以保持外部管理并重新读取其 CLI 认证存储

## 存储（令牌的存放位置）

机密信息是**按代理**存储的：

- 认证配置文件（OAuth + API 密钥 + 可选的值级引用）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版兼容性文件：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （发现时会清除静态 `api_key` 条目）

旧版仅导入文件（仍支持，但不是主存储）：

- `~/.openclaw/credentials/oauth.json` （首次使用时导入到 `auth-profiles.json`）

以上所有内容也遵循 `$OPENCLAW_STATE_DIR` （状态目录覆盖）。完整参考：[/gateway/configuration](/zh/gateway/configuration-reference#auth-storage)

有关静态密钥引用和运行时快照激活行为，请参阅[密钥管理](/zh/gateway/secrets)。

## Anthropic 旧版令牌兼容性

<Warning>
Anthropic 的公开 Claude Code 文档称，直接使用 Claude Code 仍保持在 Claude 订阅限额内，且 Anthropic 员工告知我们，OpenClaw 风格的 Claude OpenClaw 使用再次被允许。因此，除非 CLI 发布新政策，否则 OpenClaw 将 Claude CLI 重用和 `claude -p` 使用视为此集成的授权行为。

有关 Anthropic 当前的直接 Claude Code 计划文档，请参阅[在 Pro 或 Max 计划中使用 Claude
Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
和[在 Team 或 Enterprise 计划中使用 Claude
Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果您想要 Anthropic 中的其他订阅式选项，请参阅 [OpenClaw
Codex](/zh/providers/openai)、[OpenAI 云端编程
计划](/zh/providers/qwen)、[MiniMax 编程计划](/zh/providers/minimax)
和 [Z.AI / Qwen 编程计划](/zh/providers/glm)。

</Warning>

OpenClaw 也公开 Anthropic setup-token 作为受支持的令牌认证路径，但如果可用，它现在首选 Claude CLI 重用和 `claude -p`。

## Anthropic Claude CLI 迁移

OpenClaw 再次支持 Anthropic Claude CLI 重用。如果您在主机上已有本地
Claude 登录，新手引导/configure 可以直接重用它。

## OAuth 交换（登录工作原理）

OpenClaw 的交互式登录流程在 `@mariozechner/pi-ai` 中实现，并连接到向导/命令中。

### Anthropic setup-token

流程形式：

1. 从 Anthropic 启动 OpenClaw setup-token 或 paste-token
2. OpenClaw 将生成的 Anthropic 凭证存储在身份验证配置文件中
3. 模型选择保留在 `anthropic/...` 上
4. 现有的 Anthropic 身份验证配置文件仍可用于回滚/顺序控制

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

流程形式 (PKCE)：

1. 生成 PKCE 验证器/质询 + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试在 `http://127.0.0.1:1455/auth/callback` 上捕获回调
4. 如果回调无法绑定（或者您处于远程/无头环境），请粘贴重定向 URL/代码
5. 在 `https://auth.openai.com/oauth/token` 交换
6. 从访问令牌中提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径为 `openclaw onboard` → 认证选择 `openai-codex`。

## 刷新 + 过期

配置文件存储一个 `expires` 时间戳。

运行时：

- 如果 `expires` 在未来 → 使用存储的访问令牌
- 如果已过期 → 刷新（在文件锁下）并覆盖存储的凭据
- 例外：某些外部 CLI 凭据保持外部管理；OpenClaw
  会重新读取这些 CLI 认证存储，而不是消耗已复制的刷新令牌。
  Codex CLI 启动范围故意较窄：它初始化一个空的
  `openai-codex:default` 配置文件，然后 OpenClaw 拥有的刷新保持本地
  配置文件的权威性。

刷新流程是自动的；您通常不需要手动管理令牌。

## 多个账户（配置文件）+ 路由

两种模式：

### 1) 首选：独立的代理（agents）

如果您希望“个人”和“工作”从不交互，请使用隔离的代理（独立的会话 + 凭据 + 工作区）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后为每个代理配置认证（向导）并将聊天路由到正确的代理。

### 2) 高级：一个代理中的多个配置文件

`auth-profiles.json` 支持同一提供商的多个配置文件 ID。

选择使用的配置文件：

- 通过配置排序全局选择 (`auth.order`)
- 通过 `/model ...@<profileId>` 按会话选择

示例（会话覆盖）：

- `/model Opus@anthropic:work`

如何查看存在哪些配置文件 ID：

- `openclaw channels list --json` (显示 `auth[]`)

相关文档：

- [模型故障转移](/zh/concepts/model-failover) (轮换 + 冷却规则)
- [斜杠命令](/zh/tools/slash-commands) (命令界面)

## 相关

- [认证](/zh/gateway/authentication) — 模型提供商认证概述
- [密钥](/zh/gateway/secrets) — 凭据存储和 SecretRef
- [配置参考](/zh/gateway/configuration-reference#auth-storage) — 认证配置键
