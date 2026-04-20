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
- 运行时身份验证路由状态存在于 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` 仅包含 **元数据 + 路由**（无密钥）。
- 传统的仅导入 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json` 中）。

更多详情：[/concepts/oauth](/zh/concepts/oauth)

凭证类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（对于某些提供商，加上 `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个帐户共存。

- 默认值：当没有可用的电子邮件时为 `provider:default`。
- 带电子邮件的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## 轮换顺序

当提供商有多个配置文件时，OpenClaw 会按如下方式选择顺序：

1. **显式配置**：`auth.order[provider]`（如果已设置）。
2. **已配置的配置文件**：按提供商过滤的 `auth.profiles`。
3. **已存储的配置文件**：`auth-profiles.json` 中该提供商的条目。

如果未配置显式顺序，OpenClaw 使用轮询（round‑robin）顺序：

- **主键**：配置文件类型（**OAuth 优先于 API 密钥**）。
- **次键**：`usageStats.lastUsed`（每种类型中最旧的优先）。
- **冷却/禁用的配置文件** 移至末尾，按最早到期时间排序。

### 会话粘性（对缓存友好）

OpenClaw **会为每个会话锁定所选的身份验证配置文件**，以保持提供商缓存热度。
它并**不会**在每次请求时进行轮换。锁定的配置文件会被重复使用，直到：

- 会话被重置（`/new` / `/reset`）
- 一次压缩完成（压缩计数增加）
- 该配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行的手动选择会为该会话设置 **用户覆盖**，
并且在开始新会话之前不会自动轮换。

自动固定的配置文件（由会话路由器选择）被视为一种**偏好**：
它们会被优先尝试，但 OpenClaw 可能会在达到速率限制/超时时轮换到另一个配置文件。
用户固定的配置文件会保持锁定在该配置文件；如果它失败且配置了模型后备，
OpenClaw 会移动到下一个模型，而不是切换配置文件。

### 为什么 OAuth 可能会“看起来丢失”

如果您针对同一个提供商同时拥有 OAuth 配置文件和 API 密钥配置文件，除非固定，否则轮询会在消息之间切换它们。要强制使用单个配置文件：

- 使用 `auth.order[provider] = ["provider:profileId"]` 固定，或者
- 通过 `/model …` 使用每次会话的覆盖并配合配置文件覆盖（当您的 UI/聊天界面支持时）。

## 冷却时间

当由于身份验证/速率限制错误（或看起来像速率限制的超时）导致配置文件失败时，OpenClaw 会将其标记为冷却状态并移动到下一个配置文件。该速率限制类别比普通的 `429` 更广泛：它还包括提供商消息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及定期使用窗口限制，例如 `weekly/monthly limit reached`。格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID 验证失败）被视为可进行故障转移的，并使用相同的冷却期。与 OpenAI 兼容的停止原因错误，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，被归类为超时/故障转移信号。当源与已知的瞬态模式匹配时，提供商范围的通用服务器文本也可能落入该超时类别。例如，Anthropic 纯 `An unknown error occurred` 和带有瞬态服务器文本（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 载荷被视为可故障转移的超时。OpenRouter 特定的通用上游文本（如纯 `Provider returned error`）也仅在提供商上下文实际上是 OpenRouter 时才被视为超时。通用内部回退文本（如 `LLM request failed with an unknown error.`）保持保守，不会自行触发故障转移。

速率限制冷却也可以是模型范围的：

- OpenClaw 会在已知失败的模型 ID 时，为速率限制失败记录 `cooldownModel`。
- 当冷却范围仅限于不同的模型时，同一提供商上的同级模型仍然可以尝试。
- 计费/禁用窗口仍然会阻止跨模型的所有配置文件。

冷却使用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-state.json` 中的 `usageStats` 下：

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

计费/信用失败（例如“余额不足” / “信用余额过低”）被视为可进行故障转移，但它们通常不是暂时性的。与其进行短暂的冷却，OpenClaw 会将该配置文件标记为**已禁用**（并使用更长的退避时间），然后轮换到下一个配置文件/提供商。

并非所有计费形式的响应都是 `402`，也并非每个 HTTP `402` 都会
到达此处。即使提供商返回 `401` 或 `403`，OpenClaw 也会将明确的计费文本保留在计费通道中，但特定于提供商的匹配器仍
仅限于拥有它们的提供商（例如 OpenRouter 的 `403 Key limit
exceeded`). Meanwhile temporary `402` 使用窗口
以及组织/工作区支出限制错误在
消息看起来可重试时被归类为 `rate_limit`（例如 `weekly usage limit exhausted`，`daily
limit reached, resets tomorrow`, or `organization spending limit exceeded`）。
这些情况会保持在短冷却/故障转移路径上，而不是长期的
计费禁用路径上。

状态存储在 `auth-state.json` 中：

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
- 如果配置文件在 **24 小时**内未失败（可配置），退避计数器会重置。
- 过载重试允许在模型回退之前进行 **1 次同一提供商配置文件轮换**。
- 过载重试默认使用 **0 毫秒退避**。

## 模型回退

如果提供商的所有配置文件都失败，OpenClaw 将移动到
`agents.defaults.model.fallbacks` 中的下一个模型。这适用于认证失败、速率限制和
已耗尽配置文件轮换的超时（其他错误不会推进回退）。

过载和速率限制错误比计费冷却处理得
更积极。默认情况下，OpenClaw 允许一次同一提供商认证配置文件重试，
然后无需等待即可切换到下一个配置的模型回退。
诸如 `ModelNotReadyException` 之类的提供商忙碌信号属于该过载
类别。可以使用 `auth.cooldowns.overloadedProfileRotations`、
`auth.cooldowns.overloadedBackoffMs` 和
`auth.cooldowns.rateLimitedProfileRotations` 对此进行调整。

当运行以模型覆盖（hooks 或 CLI）开始时，在尝试了所有配置的回退后，回退仍会在 `agents.defaults.model.primary` 处结束。

### 候选链规则

OpenClaw 根据当前请求的 `provider/model` 以及配置的回退来构建候选列表。

规则：

- 请求的模型始终排在第一位。
- 显式配置的回退会去重，但不会被模型允许列表过滤。它们被视为显式的操作员意图。
- 如果当前运行已经在同一提供商系列中的某个配置的回退上，OpenClaw 将继续使用完整的配置链。
- 如果当前运行所在的提供商与配置不同，且当前模型尚未属于配置的回退链的一部分，OpenClaw 不会追加来自另一个提供商的不相关配置回退。
- 当运行始于覆盖时，配置的主模型会被附加到末尾，这样一旦早期的候选耗尽，链就可以稳定回到正常的默认值。

### 哪些错误会推进回退

模型回退在以下情况下继续：

- 认证失败
- 速率限制和冷却耗尽
- 过载/提供商繁忙错误
- 超时形式的故障转移错误
- 计费禁用
- `LiveSessionModelSwitchError`，它被规范化为故障转移路径，以便陈旧的持久化模型不会产生外部重试循环
- 当仍有剩余候选时的其他无法识别的错误

模型回退不在以下情况下继续：

- 非超时/故障转移形式的显式中止
- 应保留在压缩/重试逻辑中的上下文溢出错误
  （例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the 模型`, or `ollama error: context
length exceeded`）
- 当没有剩余候选时的最终未知错误

### 冷却跳过与探测行为

当提供商的所有认证配置文件都处于冷却状态时，OpenClaw 不会永久自动跳过该提供商。它会针对每个候选做出决定：

- 持续的认证失败会立即跳过整个提供商。
- 计费禁用通常会跳过，但在节流时仍可探测主要候选，以便在不重启的情况下恢复。
- 可能会在冷却期即将结束时，对主要候选进行探测，并针对每个提供商进行节流。
- 当故障看起来是暂时的（`rate_limit`、`overloaded` 或未知）时，即使处于冷却期，也可以尝试同一提供商的故障转移同级模型。当速率限制针对特定模型且同级模型可能立即恢复时，这一点尤为重要。
- 暂时性冷却探测在每个提供商每次故障转移运行中限制为一次，以防止单个提供商阻碍跨提供商的故障转移。

## 会话覆盖和实时模型切换

会话模型更改属于共享状态。活动运行器、`/model` 命令、压缩/会话更新以及实时会话协调都会读取或写入同一会话条目的某些部分。

这意味着故障转移重试必须与实时模型切换进行协调：

- 只有显式的用户驱动的模型更改才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改（如故障转移轮换、心跳覆盖或压缩）绝不会自行标记待处理的实时切换。
- 在故障转移重试开始之前，回复运行器会将选定的故障转移覆盖字段持久化到会话条目中。
- 实时会话协调优先使用持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果故障转移尝试失败，运行器仅回滚其写入的覆盖字段，且仅在这些字段仍匹配该失败候选时才执行。

这避免了经典的竞态条件：

1. 主要模型失败。
2. 在内存中选择故障转移候选。
3. 会话存储仍显示旧的主要模型。
4. 实时会话协调读取了过时的会话状态。
5. 在故障转移尝试开始之前，重试被回退到旧模型。

持久化的故障转移覆盖关闭了该窗口，而有限的回滚则使较新的手动或运行时会话更改保持完整。

## 可观察性和故障摘要

`runWithModelFallback(...)` 记录每次尝试的详细信息，这些信息用于日志和面向用户的冷却消息：

- 尝试的提供商/模型
- 原因 (`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 和
  类似的故障转移原因)
- 可选的状态/代码
- 人类可读的错误摘要

当所有候选都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外部
回复运行器可以使用它来构建更具体的消息，例如“所有模型
暂时受到速率限制”，并在已知的情况下包含最近的冷却到期时间。

该冷却摘要是感知模型的：

- 针对尝试的
  提供商/模型链，将忽略不相关的模型级速率限制
- 如果剩余的阻塞是匹配的模型级速率限制，OpenClaw
  会报告仍然阻塞该模型的最后一个匹配的到期时间

## 相关配置

有关以下内容，请参阅 [Gateway(网关) 配置](/zh/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和故障转移概述，请参阅 [模型](/zh/concepts/models)。
