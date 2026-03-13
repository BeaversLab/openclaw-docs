---
summary: "OpenClaw 如何轮换身份验证配置文件并在模型之间进行故障转移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
title: "模型故障转移"
---

# 模型故障转移

OpenClaw 分两个阶段处理故障：

1. 当前提供商内的**身份配置文件轮换**。
2. **模型故障转移**到 `agents.defaults.model.fallbacks` 中的下一个模型。

本文档解释了运行时规则及其背后的数据。

## 身份存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌都使用**身份配置文件**。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 配置 `auth.profiles` / `auth.order` 是**仅元数据 + 路由**（不包含密钥）。
- 旧版仅导入 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json` 中）。

更多详情：[/concepts/oauth](/en/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（对于某些提供程序，加上 `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个帐户共存。

- 默认值：当没有可用电子邮件时为 `provider:default`。
- 带电子邮件的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件位于 `profiles` 下的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

## 轮换顺序

当提供商有多个配置文件时，OpenClaw 按如下方式选择顺序：

1. **显式配置**：`auth.order[provider]`（如果已设置）。
2. **已配置的配置文件**：按提供程序过滤的 `auth.profiles`。
3. **存储的配置文件**：该提供程序在 `auth-profiles.json` 中的条目。

如果未配置显式顺序，OpenClaw 使用轮询顺序：

- **主键**：配置文件类型（**OAuth 优先于 API 密钥**）。
- **次要键**：`usageStats.lastUsed`（每种类型中最旧的优先）。
- **冷却/禁用的配置文件**被移至末尾，按最早到期时间排序。

### 会话粘性（缓存友好）

OpenClaw **在每个会话中固定所选的身份配置文件**，以保持提供商缓存处于热状态。
它并**不会**在每个请求上进行轮换。固定的配置文件将被重复使用，直到：

- 会话被重置（`/new` / `/reset`）
- 完成压缩（压缩计数增加）
- 该配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行手动选择会为该会话设置**用户覆盖**，
并且在开始新会话之前不会自动轮换。

自动固定的配置文件（由会话路由器选择）被视为一种**偏好**：
它们会被优先尝试，但在遇到速率限制/超时时，OpenClaw 可能会轮换到另一个配置文件。
用户固定的配置文件则会锁定在该配置文件上；如果它失败并且配置了模型降级，
OpenClaw 将移动到下一个模型，而不是切换配置文件。

### 为什么 OAuth 会“看起来丢失”

如果您针对同一提供商同时拥有 OAuth 配置文件和 API 密钥配置文件，除非进行了固定，否则轮询可能会在消息之间切换。要强制使用单个配置文件：

- 使用 `auth.order[provider] = ["provider:profileId"]` 固定，或者
- 通过 `/model …` 使用每会话覆盖并结合配置文件覆盖（当您的 UI/聊天界面支持时）。

## 冷却期

当由于身份验证/速率限制错误（或看起来像速率限制的超时）导致配置文件失败时，OpenClaw 会将其标记为冷却状态并移动到下一个配置文件。格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID 验证失败）被视为值得故障转移的情况，并使用相同的冷却时间。OpenAI 兼容的停止原因错误，如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error` 被归类为超时/故障转移信号。

冷却期使用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-profiles.json` 中的 `usageStats` 下：

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

## 计费禁用

计费/信用失败（例如“信用不足” / “信用余额过低”）被视为值得进行故障转移，但它们通常不是暂时的。OpenClaw 不会使用短暂的冷却期，而是将配置文件标记为**已禁用**（具有更长的退避时间）并轮换到下一个配置文件/提供商。

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

- 计费退避从 **5 小时**开始，每次计费失败时加倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时**内未失败（可配置），退避计数器将重置。

## 模型回退

如果提供商的所有配置文件都失败了，OpenClaw 将移动到 `agents.defaults.model.fallbacks` 中的下一个模型。这适用于身份验证失败、速率限制以及耗尽配置文件轮换的超时（其他错误不会推进故障转移）。

当运行以模型覆盖（hooks 或 CLI）开始时，在尝试任何配置的故障转移后，故障转移仍然结束于 `agents.defaults.model.primary`。

## 相关配置

参见 [Gateway configuration](/en/gateway/configuration) 了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

参见 [Models](/en/concepts/models) 了解更广泛的模型选择和回退概述。

import zh from '/components/footer/zh.mdx';

<zh />
