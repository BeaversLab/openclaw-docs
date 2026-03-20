---
summary: "OpenClaw 中的 OAuth：令牌交换、存储和多账户模式"
read_when:
  - 您希望端到端地了解 OpenClaw OAuth
  - 您遇到了令牌失效/注销问题
  - 您需要 setup-token 或 OAuth 认证流程
  - 您需要多个账户或配置文件路由
title: "OAuth"
---

# OAuth

OpenClaw 支持通过 OAuth 为提供此服务的提供商实现“订阅认证”（特别是 **OpenAI Codex (ChatGPT OAuth)**）。对于 Anthropic 订阅，请使用 **setup-token** 流程。过去，某些用户在 Claude Code 之外使用 Anthropic 订阅受到了限制，因此请将其视为用户自行选择的风险，并自行核实当前的 Anthropic 政策。OpenAI Codex OAuth 明确支持在外部工具（如 OpenClaw）中使用。本页面解释了：

在生产环境中使用 Anthropic 时，API 密钥认证是比订阅 setup-token 认证更安全的推荐路径。

- OAuth **令牌交换** 的工作原理 (PKCE)
- 令牌的 **存储** 位置（及原因）
- 如何处理 **多个账户**（配置文件 + 每次会话覆盖）

OpenClaw 还支持自带 OAuth 或 API‑密钥流程的 **提供商插件**。通过以下方式运行它们：

```bash
openclaw models auth login --provider <id>
```

## 令牌接收器（为何存在）

OAuth 提供商通常在登录/刷新流程中颁发 **新的刷新令牌**。当为同一用户/应用颁发新令牌时，某些提供商（或 OAuth 客户端）可能会使旧的刷新令牌失效。

实际表现：

- 您通过 OpenClaw _并且_ 通过 Claude Code / Codex CLI 登录 → 其中一个随后会随机“注销”

为了减少这种情况，OpenClaw 将 `auth-profiles.json` 视为 **令牌接收器**：

- 运行时从 **同一位置** 读取凭据
- 我们可以保留多个配置文件并确定性地路由它们

## 存储（令牌所在位置）

机密信息是 **按代理** 存储的：

- 认证配置文件 (OAuth + API 密钥 + 可选的值级引用): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版兼容文件: `~/.openclaw/agents/<agentId>/agent/auth.json`
  （当发现静态 `api_key` 条目时，它们会被清除）

旧版仅导入文件（仍受支持，但不是主要存储）：

- `~/.openclaw/credentials/oauth.json` （首次使用时导入到 `auth-profiles.json`）

以上所有操作也遵循 `$OPENCLAW_STATE_DIR`（状态目录覆盖）。完整参考：[/gateway/configuration](/zh/gateway/configuration#auth-storage-oauth--api-keys)

有关静态密钥引用和运行时快照激活行为，请参阅 [Secrets Management](/zh/gateway/secrets)。

## Anthropic setup-token（订阅认证）

<Warning>
  对 Anthropic setup-token 的支持属于技术兼容性，而非政策保证。 Anthropic 过去曾阻止在 Claude Code
  之外使用某些订阅。 请自行决定是否使用订阅认证，并验证 Anthropic 的当前条款。
</Warning>

在任何机器上运行 `claude setup-token`，然后将其粘贴到 OpenClaw 中：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您是在其他地方生成的令牌，请手动粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

验证：

```bash
openclaw models status
```

## OAuth exchange（登录工作原理）

OpenClaw 的交互式登录流程在 `@mariozechner/pi-ai` 中实现，并连接到向导/命令。

### Anthropic setup-token

流程形状：

1. 运行 `claude setup-token`
2. 将令牌粘贴到 OpenClaw
3. 存储为令牌认证配置文件（无刷新）

向导路径为 `openclaw onboard` → 认证选择 `setup-token` (Anthropic)。

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流程。

流程形状 (PKCE)：

1. 生成 PKCE 验证器/质询 + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试在 `http://127.0.0.1:1455/auth/callback` 上捕获回调
4. 如果回调无法绑定（或者您处于远程/无头环境），请粘贴重定向 URL/代码
5. 在 `https://auth.openai.com/oauth/token` 处交换
6. 从访问令牌中提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径为 `openclaw onboard` → 认证选择 `openai-codex`。

## 刷新 + 过期

配置文件存储一个 `expires` 时间戳。

运行时：

- 如果 `expires` 在未来 → 使用存储的访问令牌
- 如果已过期 → 刷新（在文件锁定下）并覆盖存储的凭据

刷新流程是自动的；通常您不需要手动管理令牌。

## 多个账户（配置文件）+ 路由

两种模式：

### 1) 推荐：独立的代理

如果您希望“个人”和“工作”互不干扰，请使用隔离的代理（独立的会话 + 凭证 + 工作空间）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后为每个代理配置身份验证（向导）并将聊天路由到正确的代理。

### 2) 高级：在一个代理中使用多个配置文件

`auth-profiles.json` 支持同一提供商的多个配置文件 ID。

选择使用哪个配置文件：

- 通过配置顺序全局进行 (`auth.order`)
- 通过 `/model ...@<profileId>` 按会话进行

示例（会话覆盖）：

- `/model Opus@anthropic:work`

如何查看存在哪些配置文件 ID：

- `openclaw channels list --json` (显示 `auth[]`)

相关文档：

- [/concepts/模型-failover](/zh/concepts/model-failover) (轮换 + 冷却规则)
- [/tools/slash-commands](/zh/tools/slash-commands) (命令界面)

import zh from "/components/footer/zh.mdx";

<zh />
