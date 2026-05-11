---
summary: "OpenClaw 如何轮换身份验证配置文件并在模型之间进行故障转移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障转移"
sidebarTitle: "模型故障转移"
---

OpenClaw 分两个阶段处理故障：

1. 当前提供商内的**身份配置文件轮换**。
2. **模型回退** 到 `agents.defaults.model.fallbacks` 中的下一个模型。

本文档解释了运行时规则及其背后的数据。

## 运行时流程

对于正常的文本运行，OpenClaw 按以下顺序评估候选项：

<Steps>
  <Step title="解析会话状态">解析活动的会话模型和身份验证配置文件首选项。</Step>
  <Step title="构建候选链">从当前选定的会话模型开始构建模型候选链，然后按顺序遍历 `agents.defaults.model.fallbacks`，如果运行始于覆盖设置，则以配置的主模型结束。</Step>
  <Step title="尝试当前提供商">使用身份验证配置文件轮换/冷却规则尝试当前提供商。</Step>
  <Step title="遇故障转移错误时推进">如果该提供商因符合故障转移条件的错误而耗尽，则移动到下一个模型候选。</Step>
  <Step title="持久化回退覆盖">在重试开始之前持久化所选的回退覆盖，以便其他会话读取者能看到运行程序即将使用的相同提供商/模型。持久化的模型覆盖被标记为 `modelOverrideSource: "auto"`。</Step>
  <Step title="失败时精确回滚">如果回退候选失败，则当它们仍匹配该失败的候选时，仅回滚回退拥有的会话覆盖字段。</Step>
  <Step title="若耗尽则抛出 FallbackSummaryError">如果每个候选都失败，则抛出 `FallbackSummaryError`，其中包含每次尝试的详细信息以及已知的最近冷却过期时间。</Step>
</Steps>

这故意做得比“保存和恢复整个会话”更窄。回复运行程序仅持久化其为回退拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这可以防止失败的回退重试覆盖较新的无关会话变更，例如在尝试运行期间发生的手动 `/model` 更改或会话轮换更新。

## Auth storage (keys + OAuth)

OpenClaw 对 API 密钥和 OAuth 令牌均使用 **auth profiles**。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时 auth-routing 状态存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` 仅包含 **元数据 + 路由**（不包含密钥）。
- 旧版仅导入 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json` 中）。

更多详情：[OAuth](/zh/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（对于某些提供商，还需要 `projectId`/`enterpriseUrl`）

## Profile IDs

OAuth 登录会创建不同的配置文件，以便多个帐户可以共存。

- 默认值：当没有可用的电子邮件时，为 `provider:default`。
- 带有电子邮件的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## 轮换顺序

当提供商拥有多个配置文件时，OpenClaw 会按如下顺序选择：

<Steps>
  <Step title="显式配置">`auth.order[provider]`（如果已设置）。</Step>
  <Step title="已配置的配置文件">按提供商过滤的 `auth.profiles`。</Step>
  <Step title="存储的配置文件">提供商在 `auth-profiles.json` 中的条目。</Step>
</Steps>

如果没有配置显式顺序，OpenClaw 使用循环顺序：

- **主键：** 配置文件类型（**OAuth 优先于 API 密钥**）。
- **次键：** `usageStats.lastUsed`（每种类型中最旧的优先）。
- **冷却/已禁用的配置文件** 被移至末尾，按最早的过期时间排序。

### 会话粘性（对缓存友好）

OpenClaw **将会话所选的身份验证配置固定**，以保持提供商缓存处于热状态。它并**不**会在每次请求时进行轮换。固定的配置会被重用，直到：

- 会话被重置 (`/new` / `/reset`)
- 一次压缩完成（压缩计数增加）
- 该配置处于冷却/禁用状态

通过 `/model …@<profileId>` 进行手动选择会为该会话设置一个**用户覆盖**，并且在开启新会话之前不会自动轮换。

<Note>自动固定的配置（由会话路由器选择）被视为一种**偏好设置**：它们会被优先尝试，但 OpenClaw 可能会在遇到速率限制/超时时轮换到另一个配置。用户固定的配置会锁定在该配置；如果该配置失败且配置了模型回退，OpenClaw 将移动到下一个模型，而不是切换配置。</Note>

### 为什么 OAuth 可能会“看起来丢失”

如果您同时拥有同一提供商的 OAuth 配置和 API 密钥配置，除非被固定，否则轮询可能会在消息之间切换它们。要强制使用单一配置：

- 使用 `auth.order[provider] = ["provider:profileId"]` 固定，或
- 通过 `/model …` 使用每个会话的覆盖并配合配置覆盖（当您的 UI/聊天界面支持时）。

## 冷却

当配置因身份验证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为冷却状态并移动到下一个配置。

<AccordionGroup>
  <Accordion title="What lands in the rate-limit / timeout bucket">
    该速率限制（rate-limit）类别比单纯的 `429` 更广泛：它还包括提供商消息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，例如 `weekly/monthly limit reached`。

    格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID 验证失败）被视为值得故障转移的，并使用相同的冷却期。与 OpenAI 兼容的停止原因（stop-reason）错误，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，被归类为超时/故障转移信号。

    当源匹配已知瞬态模式时，通用服务器文本也可能落入该超时类别中。例如，裸露的 pi-ai 流包装器消息 `An unknown error occurred` 对每个提供商都被视为值得故障转移，因为当提供商流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结束而没有具体细节时，pi-ai 会发出此消息。带有瞬态服务器文本（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 负载也被视为值得故障转移的超时。

    特定于 OpenRouter 的通用上游文本（例如裸露的 `Provider returned error`）仅在提供商上下文实际上为 OpenRouter 时才被视为超时。通用内部回退文本（例如 `LLM request failed with an unknown error.`）保持保守，本身不会触发故障转移。

  </Accordion>
  <Accordion title="SDK retry-after caps">
    某些提供商 SDK 否则可能会在长时间的 `Retry-After` 窗口内休眠，然后将控制权返回给 OpenClaw。对于基于 Stainless 的 SDK（例如 Anthropic 和 OpenAI），OpenClaw 默认将 SDK 内部的 `retry-after-ms` / `retry-after` 等待时间上限限制为 60 秒，并立即返回更长的可重试响应，以便运行此故障转移路径。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用上限；请参阅 [重试行为](/zh/concepts/retry)。
  </Accordion>
  <Accordion title="Model-scoped cooldowns">
    速率限制冷却也可以限定于模型范围：

    - 当失败的模型 ID 已知时，OpenClaw 会记录速率限制失败的 `cooldownModel`。
    - 当冷却范围限定于不同的模型时，仍可以尝试同一提供商上的同级模型。
    - 计费/禁用窗口仍然会阻止跨模型的整个配置文件。

  </Accordion>
</AccordionGroup>

冷却使用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `usageStats` 下的 `auth-state.json` 中：

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

计费/信用失败（例如“insufficient credits”/“credit balance too low”）被视为可以进行故障转移，但它们通常不是瞬时的。OpenClaw 不会进行短时间的冷却，而是将配置文件标记为 **disabled（已禁用）**（并伴有更长的退避时间），然后轮换到下一个配置文件/提供商。

<Note>
并非所有计费相关的响应都是 `402`，也并非所有 HTTP `402` 都会归类于此。即使提供商返回 `401` 或 `403`，OpenClaw 仍会将明确的计费文本保留在计费通道中，但特定于提供商的匹配器仍归其所有提供商所有（例如 OpenRouter `403 Key limit exceeded`）。

同时，临时的 `402` 使用窗口和组织/工作区支出限制错误在消息看起来可重试时（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`）被归类为 `rate_limit`。这些错误将保持在短暂的冷却/故障转移路径上，而不是漫长的计费禁用路径上。

</Note>

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

- 计费退避始于 **5 小时**，每次计费失败翻倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时**内未失败，退避计数器将重置（可配置）。
- 过载重试在模型回退之前允许 **1 次同一提供商配置文件轮换**。
- 过载重试默认使用 **0 毫秒退避**。

## 模型回退

如果提供商的所有配置文件都失败，OpenClaw 将移动到 `agents.defaults.model.fallbacks` 中的下一个模型。这适用于身份验证失败、速率限制以及耗尽配置文件轮换的超时（其他错误不会推进回退）。未暴露足够详细信息的提供商错误在回退状态中仍被精确标记：`empty_response` 表示提供商未返回可用的消息或状态，`no_error_details` 表示提供商明确返回了 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始预览但尚未匹配到任何分类器。

超载和限流错误的处理比计费冷却更激进。默认情况下，OpenClaw 允许进行一次同一提供商的身份配置文件重试，然后无需等待即切换到下一个配置的模型回退。提供商忙信号（例如 `ModelNotReadyException`）归入该超载类别。可以通过 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 对此进行调整。

当运行以模型覆盖（钩子或 CLI）开始时，在尝试任何配置的回退后，回退仍会在 `agents.defaults.model.primary` 处结束。

### 候选链规则

OpenClaw 根据当前请求的 `provider/model` 以及配置的回退来构建候选列表。

<AccordionGroup>
  <Accordion title="Rules">
    - 请求的模型始终排在第一位。 - 显式配置的回退会进行去重，但不会受模型允许列表的过滤。它们被视为显式的操作员意图。 - 如果当前运行已在同一提供商系列的配置回退上，OpenClaw 将继续使用完整的配置链。 - 如果当前运行所在的提供商与配置不同，且当前模型尚未属于配置的回退链的一部分，OpenClaw 不会追加来自其他提供商的不相关配置回退。 -
    当运行始于覆盖时，配置的主要模型会追加在末尾，以便在早期的候选者耗尽后，链可以回退到正常的默认值。
  </Accordion>
</AccordionGroup>

### 哪些错误会触发回退

<Tabs>
  <Tab title="Continues on">- 身份验证失败 - 速率限制和冷却耗尽 - 超载/提供商忙错误 - 超时形状的故障转移错误 - 计费禁用 - `LiveSessionModelSwitchError`，它被规范化为故障转移路径，以免过时的持久化模型创建外部重试循环 - 当仍有剩余候选者时的其他未识别错误</Tab>
  <Tab title="不继续进行">- 不属于超时/故障转移类型的显式中止 - 应保留在压缩/重试逻辑内的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`） - 当没有剩余候选者时的最终未知错误</Tab>
</Tabs>

### 冷却跳过与探测行为

当提供商的所有身份验证配置文件都已处于冷却状态时，OpenClaw 不会永远自动跳过该提供商。它会针对每个候选者做出决定：

<AccordionGroup>
  <Accordion title="针对每个候选者的决定">
    - 持续的身份验证失败会立即跳过整个提供商。 - 计费禁用通常会跳过，但在限流情况下仍可探测主候选者，以便无需重启即可恢复。 - 可以在冷却即将到期时探测主候选者，并对每个提供商进行限流。 - 当故障看起来是暂时的（`rate_limit`、`overloaded` 或未知）时，即使处于冷却状态，也可以尝试同一提供商下的故障转移同级项。当速率限制仅针对特定模型且同级模型可能立即恢复时，这一点尤为重要。 -
    每次故障转移运行中，针对每个提供商的暂时冷却探测限制为一次，以免单个提供商阻碍跨提供商的故障转移。
  </Accordion>
</AccordionGroup>

## 会话覆盖与实时模型切换

会话模型变更是共享状态。活动运行器、`/model` 命令、压缩/会话更新以及实时会话协调都会读取或写入同一会话条目的某些部分。

这意味着故障转移重试必须与实时模型切换相互协调：

- 只有显式的由用户驱动的模型变更才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型变更（如故障转移轮换、心跳覆盖或压缩）绝不会自行标记待处理的实时切换。
- 在故障转移重试开始之前，回复运行器会将选定的故障转移覆盖字段持久化到会话条目中。
- Auto fallback overrides remain selected on subsequent turns so OpenClaw does not probe a known-bad primary on every message. `/new`, `/reset`, and `sessions.reset` clear auto-sourced overrides and return the 会话 to the configured default.
- `/status` shows the selected 模型 and, when fallback state differs, the active fallback 模型 and reason.
- Live-会话 reconciliation prefers persisted 会话 overrides over stale runtime 模型 fields.
- If a live-switch error points at a later candidate in the active fallback chain, OpenClaw jumps directly to that selected 模型 instead of walking unrelated candidates first.
- If the fallback attempt fails, the runner rolls back only the override fields it wrote, and only if they still match that failed candidate.

This prevents the classic race:

<Steps>
  <Step title="Primary fails">The selected primary 模型 fails.</Step>
  <Step title="Fallback chosen in memory">Fallback candidate is chosen in memory.</Step>
  <Step title="Session store still says old primary">Session store still reflects the old primary.</Step>
  <Step title="Live reconciliation reads stale state">Live-会话 reconciliation reads the stale 会话 state.</Step>
  <Step title="Retry snapped back">The retry gets snapped back to the old 模型 before the fallback attempt starts.</Step>
</Steps>

The persisted fallback override closes that window, and the narrow rollback keeps newer manual or runtime 会话 changes intact.

## Observability and failure summaries

`runWithModelFallback(...)` records per-attempt details that feed logs and user-facing cooldown messaging:

- 提供商/模型 attempted
- reason (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, and similar failover reasons)
- optional status/code
- human-readable error summary

结构化 `model_fallback_decision` 日志在候选对象失败、被跳过或后续回退成功时，还包含扁平的 `fallbackStep*` 字段。这些字段使尝试的转换变得显式（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），以便日志和诊断导出器即使在终端回退也失败的情况下也能重构主要故障。

当所有候选对象都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外部回复运行器可以使用它来构建更具体的消息，例如“所有模型都暂时受到速率限制”，并在已知的情况下包含最近的冷却过期时间。

该冷却摘要具有模型感知能力：

- 对于尝试的提供商/模型链，将忽略不相关的模型范围速率限制
- 如果剩余的阻塞是匹配的模型范围速率限制，OpenClaw 将报告仍然阻塞该模型的最后一个匹配的过期时间

## 相关配置

有关 Gateway(网关) 配置，请参阅 [Gateway(网关) configuration](/zh/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和回退概述，请参阅 [Models](/zh/concepts/models)。
