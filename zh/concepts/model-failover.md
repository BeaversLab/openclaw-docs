---
summary: "How OpenClaw rotates auth profiles and falls back across models"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or 模型 fallback behavior
  - Updating failover rules for auth profiles or models
title: "Model Failover"
---

# 模型故障转移

OpenClaw handles failures in two stages:

1. **Auth profile rotation** within the current 提供商.
2. **Model fallback** to the next 模型 in `agents.defaults.model.fallbacks`.

This doc explains the runtime rules and the data that backs them.

## Auth storage (keys + OAuth)

OpenClaw uses **auth profiles** for both API keys and OAuth tokens.

- Secrets live in `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (legacy: `~/.openclaw/agent/auth-profiles.json`).
- Config `auth.profiles` / `auth.order` are **metadata + routing only** (no secrets).
- Legacy import-only OAuth file: `~/.openclaw/credentials/oauth.json` (imported into `auth-profiles.json` on first use).

More detail: [/concepts/oauth](/zh/concepts/oauth)

Credential types:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` for some providers)

## Profile IDs

OAuth logins create distinct profiles so multiple accounts can coexist.

- Default: `provider:default` when no email is available.
- OAuth with email: `provider:<email>` (for example `google-antigravity:user@gmail.com`).

Profiles live in `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` under `profiles`.

## Rotation order

When a 提供商 has multiple profiles, OpenClaw chooses an order like this:

1. **Explicit config**: `auth.order[provider]` (if set).
2. **Configured profiles**: `auth.profiles` filtered by 提供商.
3. **Stored profiles**: entries in `auth-profiles.json` for the 提供商.

If no explicit order is configured, OpenClaw uses a round‑robin order:

- **Primary key:** profile type (**OAuth before API keys**).
- **Secondary key:** `usageStats.lastUsed` (oldest first, within each type).
- **Cooldown/disabled profiles** are moved to the end, ordered by soonest expiry.

### Session stickiness (cache-friendly)

OpenClaw **pins the chosen auth profile per 会话** 以保持提供商缓存热状态。
它并**不会**对每个请求进行轮换。固定的配置文件将被重复使用，直到：

- 会话 is reset (`/new` / `/reset`)
- compaction 完成（compaction 计数增加）
- 该配置文件处于 cooldown/disabled 状态

通过 `/model …@<profileId>` 进行手动选择会为该 会话 设置 **用户覆盖**
并且在新的 会话 开始之前不会自动轮换。

自动固定的配置文件（由 会话 路由器选择）被视为一种 **偏好**：
它们会被优先尝试，但如果遇到速率限制/超时，OpenClaw 可能会轮换到另一个配置文件。
用户固定的配置文件会锁定在该配置文件上；如果它失败并且配置了模型回退，
OpenClaw 将移动到下一个模型，而不是切换配置文件。

### 为什么 OAuth 可能会“看起来丢失”

如果您为同一个提供商同时拥有 OAuth 配置文件和 API 密钥配置文件，除非固定，否则 round‑robin 可能会在消息之间切换它们。要强制使用单个配置文件：

- 使用 `auth.order[provider] = ["provider:profileId"]` 固定，或者
- 通过 `/model …` 使用每次 会话 的覆盖并配置文件覆盖（当您的 UI/聊天界面支持时）。

## Cooldowns

当配置文件由于 auth/rate‑limit 错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为 cooldown 并移动到下一个配置文件。
格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID
验证失败）被视为可回退的错误，并使用相同的 cooldowns。
OpenAI 兼容的停止原因错误，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error` 被归类为超时/回退
信号。

Cooldowns 使用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-profiles.json` 下的 `usageStats` 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## Billing disables

计费/信用失败（例如“insufficient credits” / “credit balance too low”）被视为可回退的错误，但它们通常不是暂时性的。OpenClaw 不会使用短时间的 cooldown，而是将该配置文件标记为 **disabled**（并使用更长的退避时间），然后轮换到下一个配置文件/提供商。

状态存储在 `auth-profiles.json` 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

默认值：

- 计费退避从 **5 小时** 开始，每次计费失败加倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时** 内未失败（可配置），退避计数器将重置。

## 模型回退

如果提供商的所有配置文件都失败，OpenClaw 将移动到
`agents.defaults.model.fallbacks` 中的下一个模型。这适用于身份验证失败、速率限制和
耗尽配置文件轮换的超时（其他错误不会推进回退）。

当运行以模型覆盖（钩子或 CLI）开始时，在尝试任何已配置的回退后，回退仍然结束于
`agents.defaults.model.primary`。

## 相关配置

有关以下内容，请参阅 [Gateway(网关) 配置](/zh/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和回退概述，请参阅 [模型](/zh/concepts/models)。

import en from "/components/footer/en.mdx";

<en />
