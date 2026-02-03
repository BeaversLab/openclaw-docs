---
summary: "OpenClaw 如何轮换 auth profiles 并在模型间回退"
read_when:
  - 诊断 auth profile 轮换、冷却或模型回退行为
  - 更新 auth profiles 或模型的 failover 规则
title: "模型故障转移"
---

# 模型失败处理

OpenClaw 以两阶段处理失败：

1. 当前 provider 内的 **Auth profile 轮换**。
2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

本文解释运行时规则及其背后的数据。

## Auth 存储（keys + OAuth）

OpenClaw 对 API keys 与 OAuth tokens 都使用 **auth profiles**。

- 密钥存放在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（旧路径：`~/.openclaw/agent/auth-profiles.json`）。
- 配置 `auth.profiles` / `auth.order` **仅是元数据 + 路由**（不含密钥）。
- 旧版仅导入 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入 `auth-profiles.json`）。

更多细节：[/concepts/oauth](/zh/concepts/oauth)

凭据类型：
- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（部分 provider 还包含 `projectId`/`enterpriseUrl`）

## Profile IDs

OAuth 登录会创建独立 profile，从而支持多个账号共存。
- 默认：无 email 时使用 `provider:default`。
- OAuth 有 email：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

Profiles 存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 的 `profiles` 中。

## 轮换顺序

当一个 provider 有多个 profile 时，OpenClaw 按以下顺序选择：

1. **显式配置**：`auth.order[provider]`（若设置）。
2. **配置中的 profiles**：`auth.profiles` 中按 provider 过滤。
3. **已存储 profiles**：`auth-profiles.json` 中该 provider 的条目。

若无显式顺序，OpenClaw 使用轮询（round‑robin）：
- **主排序**：profile 类型（**OAuth 优先于 API keys**）。
- **次排序**：`usageStats.lastUsed`（每种类型内，最久未使用优先）。
- **冷却/禁用** profile 被移到末尾，按最早过期排序。

### 会话粘性（缓存友好）

OpenClaw 会**按会话固定所选 auth profile**以保持 provider 缓存热。
它**不会**每次请求都轮换。固定的 profile 会持续复用直到：
- 会话重置（`/new` / `/reset`）
- 压缩完成（压缩计数增加）
- profile 进入冷却/禁用

通过 `/model …@<profileId>` 的手动选择会为该会话设置**用户覆盖**，在新会话开始前不会自动轮换。

自动固定的 profiles（由会话路由选择）被视为**偏好**：
它们会先尝试，但当出现限流/超时时，OpenClaw 可能轮换到其他 profile。
用户固定的 profile 会保持锁定；若它失败且配置了模型回退，OpenClaw 会转到下一个模型，而不是切换 profile。

### 为什么 OAuth 会“看起来丢失”

若同一 provider 同时存在 OAuth profile 与 API key profile，除非固定，否则轮询可能在消息之间切换。要强制使用单一 profile：
- 用 `auth.order[provider] = ["provider:profileId"]` 固定，或
- 通过 `/model …` 的 profile 覆盖进行会话级选择（如果 UI/聊天表面支持）。

## 冷却

当 profile 因认证/限流错误（或看似限流的超时）失败时，OpenClaw 将其标记为冷却并切换到下一个 profile。
格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID 校验失败）也视为可回退失败，并使用相同冷却机制。

冷却采用指数退避：
- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（封顶）

状态存储在 `auth-profiles.json` 的 `usageStats` 中：

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

## Billing 禁用

Billing/额度失败（如 “insufficient credits” / “credit balance too low”）被视为可回退失败，但通常不是瞬态。因此 OpenClaw 会将该 profile 标记为**禁用**（更长退避）并轮换到下一个 profile/provider，而非短冷却。

状态存储在 `auth-profiles.json`：

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

默认：
- Billing 退避从 **5 小时**开始，每次 billing 失败翻倍，上限 **24 小时**。
- 若 profile 在 **24 小时**内未失败，退避计数重置（可配置）。

## 模型回退

若某 provider 的所有 profiles 都失败，OpenClaw 会转到 `agents.defaults.model.fallbacks` 中的下一个模型。该行为适用于认证失败、限流以及已耗尽 profile 轮换的超时（其他错误不会推进回退）。

当运行以模型覆盖（hooks 或 CLI）启动时，回退仍会在尝试完所有回退后回到 `agents.defaults.model.primary`。

## 相关配置

参见 [Gateway configuration](/zh/gateway/configuration)：
- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

另见 [Models](/zh/concepts/models) 了解更广泛的模型选择与回退概览。
