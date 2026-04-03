---
summary: "OpenClaw 中的 OAuth：令牌交换、存储和多账户模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want setup-token or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw 通过 OAuth 为支持该功能的提供商提供“订阅认证”（特别是 **OpenAI Codex (ChatGPT OAuth)**）。对于 Anthropic 订阅，您可以使用 **setup-token** 流程，也可以在网关主机上重用本地 **Claude CLI** 登录。过去 Anthropic 曾限制某些用户在 Claude Code 之外使用订阅，因此请将其视为用户自行承担的风险，并自行核实当前的 Anthropic 政策。明确支持在外部工具（如 OpenClaw）中使用 OpenAI Codex OAuth。本页解释了：

对于生产环境中的 Anthropic，API 密钥认证是比订阅 setup-token 认证更安全、更推荐的路径。

- OAuth **令牌交换** 的工作原理 (PKCE)
- 令牌的 **存储位置**（以及原因）
- 如何处理 **多个账户**（配置文件 + 每会话覆盖）

OpenClaw 还支持自带 OAuth 或 API 密钥流程的 **提供商插件**。
通过以下方式运行它们：

```bash
openclaw models auth login --provider <id>
```

## 令牌接收器（存在原因）

OAuth 提供商通常会在登录/刷新流程期间生成 **新的刷新令牌**。当为同一用户/应用颁发新令牌时，某些提供商（或 OAuth 客户端）可能会使旧的刷新令牌失效。

实际表现：

- 您通过 OpenClaw _以及_ Claude Code / Codex CLI 登录 → 其中一个随后随机“注销”

为了减少这种情况，OpenClaw 将 `auth-profiles.json` 视为 **令牌汇聚点 (token sink)**：

- 运行时从 **一个地方** 读取凭据
- 我们可以保留多个配置文件并确定性地路由它们

## 存储（令牌所在地）

机密按 **代理** 存储：

- 认证配置文件 (OAuth + API 密钥 + 可选的值级引用): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版兼容性文件: `~/.openclaw/agents/<agentId>/agent/auth.json`
  (发现静态 `api_key` 条目时会将其清除)

旧版仅导入文件（仍受支持，但不是主存储）：

- `~/.openclaw/credentials/oauth.json` (首次使用时导入到 `auth-profiles.json`)

上述所有内容也遵循 `$OPENCLAW_STATE_DIR` (状态目录覆盖)。完整参考: [/gateway/configuration](/en/gateway/configuration-reference#auth-storage)

有关静态密钥引用和运行时快照激活行为，请参阅 [密钥管理](/en/gateway/secrets)。

## Anthropic setup-token (订阅授权)

<Warning>Anthropic setup-token 支持属于技术兼容性，而非政策保证。 Anthropic 过去曾阻止某些在 Claude Code 之外的订阅使用。 请自行决定是否使用订阅认证，并核实 Anthropic 的当前条款。</Warning>

在任何机器上运行 `claude setup-token`，然后将其粘贴到 OpenClaw 中：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您在其他地方生成了令牌，请手动粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

验证：

```bash
openclaw models status
```

## Anthropic Claude CLI 迁移

如果网关主机上已安装并登录 Claude CLI，您可以
将 Anthropic 模型选择切换到本地 CLI 后端：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

新手引导捷径：

```bash
openclaw onboard --auth-choice anthropic-cli
```

这会保留现有的 Anthropic 认证配置文件以便回滚，但会将主
default-模型 路径从 `anthropic/...` 重写为 `claude-cli/...`。

## OAuth 交换 (登录工作原理)

OpenClaw 的交互式登录流程在 `@mariozechner/pi-ai` 中实现，并连接到向导/命令。

### Anthropic setup-token / Claude CLI

流程形式：

Setup-token 路径：

1. 运行 `claude setup-token`
2. 将令牌粘贴到 OpenClaw 中
3. 存储为令牌身份验证配置文件（无刷新）

Claude CLI 路径：

1. 在网关主机上使用 `claude auth login` 登录
2. 运行 `openclaw models auth login --provider anthropic --method cli --set-default`
3. 不存储新的身份验证配置文件；将模型选择切换到 `claude-cli/...`

向导路径：

- `openclaw onboard` → auth choice `anthropic-cli`
- `openclaw onboard` → auth choice `setup-token` (Anthropic)

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

流程形式 (PKCE)：

1. 生成 PKCE 验证器/挑战 + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试在 `http://127.0.0.1:1455/auth/callback` 上捕获回调
4. 如果回调无法绑定（或者您处于远程/无头模式），请粘贴重定向 URL/代码
5. 在 `https://auth.openai.com/oauth/token` 处交换
6. 从访问令牌中提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径为 `openclaw onboard` → auth choice `openai-codex`。

## 刷新 + 过期

配置文件存储一个 `expires` 时间戳。

运行时：

- 如果 `expires` 在未来 → 使用存储的访问令牌
- 如果已过期 → 刷新（在文件锁下）并覆盖存储的凭据

刷新流程是自动的；您通常不需要手动管理令牌。

## 多个账户（配置文件）+ 路由

两种模式：

### 1) 首选：独立的代理

如果您希望“个人”和“工作”互不干扰，请使用隔离的代理（独立的会话 + 凭据 + 工作区）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后按代理配置身份验证（向导）并将聊天路由到正确的代理。

### 2) 高级：一个代理中的多个配置文件

`auth-profiles.json` 支持同一提供商的多个配置文件 ID。

选择使用的配置文件：

- 通过配置顺序全局设置 (`auth.order`)
- 通过 `/model ...@<profileId>` 按会话设置

示例（会话覆盖）：

- `/model Opus@anthropic:work`

如何查看存在的配置文件 ID：

- `openclaw channels list --json` （显示 `auth[]`）

相关文档：

- [/concepts/模型-failover](/en/concepts/model-failover) （轮换 + 冷却规则）
- [/tools/slash-commands](/en/tools/slash-commands) （命令界面）

## 相关

- [身份验证](/en/gateway/authentication) — 模型提供商身份验证概述
- [密钥](/en/gateway/secrets) — 凭据存储和 SecretRef
- [配置参考](/en/gateway/configuration-reference#auth-storage) — 身份验证配置键
