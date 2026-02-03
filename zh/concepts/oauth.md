---
summary: "OpenClaw 的 OAuth：token 交换、存储与多账号模式"
read_when:
  - 想了解 OpenClaw OAuth 全流程
  - 遇到 token 失效 / 登出问题
  - 想使用 setup-token 或 OAuth 认证流程
  - 需要多账号或 profile 路由
title: "OAuth"
---

# OAuth

OpenClaw 通过 OAuth 支持“订阅认证”（支持该方式的 providers，尤其是 **OpenAI Codex（ChatGPT OAuth）**）。Anthropic 订阅请使用 **setup-token** 流程。本文解释：

- OAuth **token exchange** 如何工作（PKCE）
- tokens **存储**在哪里（以及原因）
- 如何处理**多账号**（profiles + per-session 覆盖）

OpenClaw 还支持 **provider plugins**，它们自带 OAuth 或 API‑key 流程。使用：

```bash
openclaw models auth login --provider <id>
```

## Token sink（为何存在）

OAuth providers 通常在登录/刷新时生成**新的 refresh token**。部分 providers（或 OAuth 客户端）会在同一用户/应用生成新 token 时使旧 token 失效。

实际症状：
- 你同时用 OpenClaw *和* Claude Code / Codex CLI 登录 → 其中一个会在之后“随机掉线”

为降低此问题，OpenClaw 将 `auth-profiles.json` 视为 **token sink**：
- 运行时只从**一个地方**读取凭据
- 可保留多个 profile 并进行确定性路由

## 存储（token 在哪里）

Secrets **按 agent 存储**：

- Auth profiles（OAuth + API keys）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 运行时缓存（自动管理，不要编辑）：`~/.openclaw/agents/<agentId>/agent/auth.json`

旧版仅导入文件（仍支持，但非主存储）：
- `~/.openclaw/credentials/oauth.json`（首次使用时导入 `auth-profiles.json`）

以上路径均支持 `$OPENCLAW_STATE_DIR` 覆盖。完整参考：[/gateway/configuration](/zh/gateway/configuration#auth-storage-oauth--api-keys)

## Anthropic setup-token（订阅认证）

在任意机器运行 `claude setup-token`，然后粘贴到 OpenClaw：

```bash
openclaw models auth setup-token --provider anthropic
```

若 token 在别处生成，可手动粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

验证：

```bash
openclaw models status
```

## OAuth exchange（登录如何工作）

OpenClaw 的交互式登录流程由 `@mariozechner/pi-ai` 实现，并接入向导/命令。

### Anthropic（Claude Pro/Max）setup-token

流程：

1. 运行 `claude setup-token`
2. 粘贴 token 到 OpenClaw
3. 作为 token auth profile 存储（不刷新）

向导路径：`openclaw onboard` → auth choice `setup-token`（Anthropic）。

### OpenAI Codex（ChatGPT OAuth）

流程（PKCE）：

1. 生成 PKCE verifier/challenge + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试在 `http://127.0.0.1:1455/auth/callback` 捕获回调
4. 若回调无法绑定（或你在远程/无头环境），粘贴 redirect URL/code
5. 在 `https://auth.openai.com/oauth/token` 交换
6. 从 access token 提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径：`openclaw onboard` → auth choice `openai-codex`。

## 刷新 + 过期

Profiles 存储 `expires` 时间戳。

运行时：
- `expires` 在未来 → 使用已存储的 access token
- 已过期 → 刷新（加文件锁）并覆盖已存储的凭据

刷新流程自动完成；通常无需手动管理 tokens。

## 多账号（profiles）+ 路由

两种模式：

### 1) 推荐：分离 agents

若希望 “personal” 与 “work” 永不交叉，请使用隔离 agents（独立 sessions + credentials + workspace）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后为每个 agent 配置 auth（向导）并将聊天路由到正确的 agent。

### 2) 高级：单 agent 多 profiles

`auth-profiles.json` 可为同一 provider 存储多个 profile ID。

选择使用哪个 profile：
- 全局：通过配置顺序（`auth.order`）
- 会话级：通过 `/model ...@<profileId>`

示例（会话覆盖）：
- `/model Opus@anthropic:work`

查看已有 profile IDs：
- `openclaw channels list --json`（显示 `auth[]`）

相关文档：
- [/concepts/model-failover](/zh/concepts/model-failover)（轮换 + 冷却规则）
- [/tools/slash-commands](/zh/tools/slash-commands)（命令面）
