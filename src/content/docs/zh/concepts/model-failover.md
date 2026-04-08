---
summary: "OpenClaw 如何轮换身份验证配置文件并在模型之间进行故障转移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障转移"
---

# 模型故障转移

OpenClaw 分两个阶段处理故障：

1. 当前提供商内的**身份配置文件轮换**。
2. **模型故障转移**到 `agents.defaults.model.fallbacks` 中的下一个模型。

本文档解释了运行时规则及其背后的数据。

## 运行时流程

对于正常的文本运行，OpenClaw 按以下顺序评估候选项：

1. 当前选定的会话模型。
2. 按顺序配置 `agents.defaults.model.fallbacks`。
3. 当运行从覆盖开始时，最后配置的原始模型。

在每个候选项内部，OpenClaw 在进入下一个模型候选项之前会先尝试身份验证配置文件故障转移。

高层序列：

1. 解析活动的会话模型和身份验证配置文件首选项。
2. 构建模型候选项链。
3. 尝试当前提供商，并应用身份验证配置文件轮换/冷却规则。
4. 如果该提供商因值得进行故障转移的错误而耗尽，则移动到下一个
   模型候选项。
5. 在重试开始之前持久化所选的故障转移覆盖，以便其他
   会话读取者能够看到运行器即将使用的相同提供商/模型。
6. 如果故障转移候选项失败，则仅当它们仍与该失败的候选项匹配时，回滚仅由故障转移拥有的会话
   覆盖字段。
7. 如果所有候选项都失败，则抛出带有每次尝试
   详细信息的 `FallbackSummaryError`，并在已知的情况下提供最近的冷却到期时间。

这故意比“保存和恢复整个会话”更狭窄。回复运行器仅持久化其拥有的用于故障转移的模型选择字段：

- `providerOverride`
- `modelOverride`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这可以防止失败的故障转移重试覆盖较新的无关会话
变更，例如在尝试运行期间发生的手动 `/model` 变更或会话轮换更新。

## 身份验证存储（密钥 + OAuth）

OpenClaw 使用 **auth profiles** 来同时处理 API 密钥和 OAuth 令牌。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 配置 `auth.profiles` / `auth.order` 仅包含 **元数据 + 路由**（不包含密钥）。
- 旧版仅导入 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json` 中）。

更多详情：[/concepts/oauth](/en/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` （对于某些提供商，包含 `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个账户共存。

- 默认值：当没有可用电子邮件时为 `provider:default`。
- 带电子邮件的 OAuth：`provider:<email>` （例如 `google-antigravity:user@gmail.com`）。

配置文件位于 `profiles` 下的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

## 轮换顺序

当提供商拥有多个配置文件时，OpenClaw 会按如下顺序选择：

1. **显式配置**：`auth.order[provider]` （如果已设置）。
2. **已配置的配置文件**：按提供商过滤的 `auth.profiles`。
3. **存储的配置文件**：提供商在 `auth-profiles.json` 中的条目。

如果未配置显式顺序，OpenClaw 将使用循环轮询顺序：

- **主键**：配置文件类型 （**OAuth 优先于 API 密钥**）。
- **次键**：`usageStats.lastUsed` （每种类型中，按时间先后排序，最旧的在前）。
- **冷却/禁用的配置文件**会被移至末尾，按即将过期的顺序排列。

### 会话粘性 （对缓存友好）

OpenClaw **为每个会话锁定所选的认证配置文件**，以保持提供商缓存处于热状态。
它**不会**在每次请求时进行轮换。锁定的配置文件会被重复使用，直到：

- 会话被重置 （`/new` / `/reset`）
- 压缩完成 （压缩计数增加）
- 该配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行手动选择会为该会话设置**用户覆盖**，
并且在开始新会话之前不会自动轮换。

自动锁定的配置文件 （由会话路由器选择）被视为一种**偏好**：
它们会首先被尝试，但 OpenClaw 可能会在达到速率限制/超时时轮换到另一个配置文件。
用户锁定的配置文件将保持锁定在该配置文件；如果它失败并且配置了模型回退，
OpenClaw 将移动到下一个模型，而不是切换配置文件。

### 为什么 OAuth 可能会“看起来丢失”

如果您同时拥有同一提供商的 OAuth 配置文件和 API 密钥配置文件，除非被锁定，否则循环轮询可能会在不同消息之间切换它们。若要强制使用单个配置文件：

- 使用 `auth.order[provider] = ["provider:profileId"]` 锁定，或者
- 当您的 UI/聊天界面支持时，通过 `/model …` 使用每次会话的覆盖配置并配合配置文件覆盖。

## 冷却期

当配置文件因身份验证/速率限制错误（或看似速率限制的超时）而失败时，OpenClaw 会将其标记为冷却状态并移动到下一个配置文件。
该速率限制范围比单纯的 `429` 更广：它还包括提供商消息，例如 `Too many concurrent requests`、`ThrottlingException`、
`concurrency limit reached`、`workers_ai ... quota limit exceeded`、
`throttled`、`resource exhausted`，以及定期的使用窗口限制，例如 `weekly/monthly limit reached`。
格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID 验证失败）被视为值得故障转移的，并使用相同的冷却期。
与 OpenAI 兼容的停止原因错误，如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error`，被归类为超时/故障转移信号。
提供商范围的通用服务器文本在源匹配已知瞬态模式时，也可能归入该超时范围。例如，带有瞬态服务器文本（如 `internal server error`、`unknown error, 520`、`upstream error`
或 `backend error`）的 Anthropic 裸露 `An unknown error occurred` 和 JSON `api_error` 载荷被视为值得故障转移的超时。仅当提供商上下文实际为 OpenRouter 时，OpenRouter 特定的通用上游文本（如裸露 `Provider returned error`）才被视为超时。通用内部回退文本（如 `LLM request failed with an unknown error.`）保持保守，且本身不会触发故障转移。

速率限制冷却期也可以是模型范围的：

- 当失败的 `cooldownModel` 已知时，OpenClaw 会记录速率限制失败。
- 当冷却期限定于不同模型时，同一提供商上的同级模型仍可被尝试。
- 计费/禁用窗口仍然会跨模型阻止整个配置文件。

冷却期使用指数退避策略：

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

## 计费禁用

计费/信用失败（例如“余额不足” /“信用余额过低”）被视为可故障转移的，但它们通常不是瞬时的。OpenClaw 不会使用短暂的冷却期，而是将配置文件标记为 **disabled**（使用更长的退避时间），并轮换到下一个配置文件/提供商。

并非每个具有计费特征的响应都是 `402`，也不是每个 HTTP `402` 都会落在
此处。OpenClaw 将明确的计费文本保留在计费通道中，即使
提供商返回的是 `401` 或 `403`，但特定于提供商的匹配器仍然
局限于拥有它们的提供商（例如 OpenRouter 的 `403 Key limit
exceeded`). Meanwhile temporary `402` 使用窗口以及
组织/工作区支出限制错误在
消息看起来可重试时被归类为 `rate_limit`（例如 `weekly usage limit exhausted`，`daily
limit reached, resets tomorrow`, or `organization spending limit exceeded`））。
这些保留在短暂的冷却/故障转移路径上，而不是长期的
计费禁用路径上。

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

- 计费退避从 **5 小时** 开始，每次计费失败翻倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时** 内未发生失败（可配置），退避计数器将重置。
- 过载重试在模型回退之前允许 **1 次同一提供商的配置文件轮换**。
- 过载重试默认使用 **0 毫秒退避**。

## 模型回退

如果某个提供商的所有配置文件均失败，OpenClaw 将移至
`agents.defaults.model.fallbacks` 中的下一个模型。这适用于身份验证失败、速率限制和
已耗尽配置文件轮换的超时（其他错误不会触发回退）。

过载和速率限制错误的处理比计费冷却更激进。默认情况下，OpenClaw 允许一次同一提供商身份配置文件的重试，然后无需等待即可切换到下一个配置的模型回退。提供商繁忙信号（如 `ModelNotReadyException`）归入该过载类别。可以通过 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 进行调整。

当运行以模型覆盖（钩子或 CLI）开始时，回退在尝试任何配置的回退后仍会在 `agents.defaults.model.primary` 结束。

### 候选链规则

OpenClaw 根据当前请求的 `provider/model` 以及配置的回退来构建候选列表。

规则：

- 请求的模型始终排在第一位。
- 显式配置的回退会去重，但不会受模型允许列表过滤。它们被视为明确的操作员意图。
- 如果当前运行已在同一提供商系列中的某个配置回退上，OpenClaw 将继续使用完整的配置链。
- 如果当前运行所在的提供商与配置不同，且当前模型尚未成为配置回退链的一部分，OpenClaw 不会附加来自另一个提供商的不相关配置回退。
- 当运行从覆盖开始时，配置的主模型会被附加在末尾，以便在较早的候选耗尽后，链可以回落到正常的默认值。

### 哪些错误会触发回退

模型回退在以下情况下继续：

- 身份验证失败
- 速率限制和冷却耗尽
- 过载/提供商繁忙错误
- 超时类故障转移错误
- 计费禁用
- `LiveSessionModelSwitchError`，它被规范化为回退路径，因此过时的持久化模型不会创建外部重试循环
- 当仍有剩余候选时的其他未识别错误

模型回退不会在以下情况下继续：

- 非超时/故障转移类的显式中止
- 应该保持在压缩/重试逻辑内的上下文溢出错误
  (例如 `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the 模型`, or `ollama error: context
length exceeded`)
- 当没有剩余候选时的最终未知错误

### 冷却跳过与探测行为

当提供商的每个身份配置文件都已在冷却中时，OpenClaw 不会
永远自动跳过该提供商。它会针对每个候选做出决定：

- 持久的身份验证失败会立即跳过整个提供商。
- 计费禁用通常会跳过，但在节流情况下仍可探测主要候选，
  因此无需重启即可恢复。
- 可以在接近冷却到期时探测主要候选，并对每个提供商进行节流。
- 当故障看起来是瞬时的 (`rate_limit`, `overloaded`, 或未知) 时，即使处于冷却状态，也可以尝试同一提供商的故障转移同级。当速率限制是模型范围的，且同级模型可能仍能立即恢复时，这一点尤为重要。
- 瞬态冷却探测限制为每次故障转移运行每个提供商一次，以
  防止单个提供商停滞跨提供商故障转移。

## 会话覆盖和实时模型切换

会话模型更改是共享状态。活跃运行器、`/model` 命令、
压缩/会话更新和实时会话协调都读取或写入
同一会话条目的部分内容。

这意味着故障转移重试必须与实时模型切换协调：

- 只有显式的用户驱动的模型更改才会标记待处理的实时切换。这
  包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改（如故障转移轮换、心跳覆盖
  或压缩）绝不会自行标记待处理的实时切换。
- 在故障转移重试开始之前，回复运行器会将选定的
  故障转移覆盖字段持久化到会话条目中。
- 实时会话协调优先考虑持久化的会话覆盖，而不是过时的
  运行时模型字段。
- 如果重试尝试失败，运行程序仅回滚其写入的覆盖字段，且仅在这些字段仍与该失败的候选匹配时才回滚。

这防止了经典的竞态问题：

1. 主节点失败。
2. 在内存中选择备用候选项。
3. 会话存储仍然显示旧的主节点。
4. 实时会话协调读取了陈旧的会话状态。
5. 在备用尝试开始之前，重试会被强制恢复到旧模型。

持久化的备用覆盖关闭了该窗口，而窄回滚则保持较新的手动或运行时会话更改不受影响。

## 可观测性和故障摘要

`runWithModelFallback(...)` 记录了每次尝试的详细信息，这些信息用于提供日志和面向用户的冷却消息：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的故障转移原因）
- 可选的状态/代码
- 人类可读的错误摘要

当所有候选项都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外部回复运行程序可以使用它来构建更具体的消息，例如“所有模型都暂时受到速率限制”，并在已知的情况下包含最近的冷却过期时间。

该冷却摘要是感知模型的：

- 对于尝试的提供商/模型链，无关的模型范围速率限制将被忽略
- 如果剩余的阻塞是匹配的模型范围速率限制，OpenClaw 会报告仍然阻塞该模型的最后一个匹配的过期时间

## 相关配置

请参阅 [Gateway(网关) 配置](/en/gateway/configuration) 了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

请参阅 [模型](/en/concepts/models) 以了解更广泛的模型选择和故障转移概述。
