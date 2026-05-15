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
  <Step title="Build candidate chain">根据当前模型选择以及该选择源的故障转移策略构建模型候选链。配置的默认值、定时任务主模型和自动选择的故障转移模型可以使用配置的故障转移；显式的用户会话选择是严格的。</Step>
  <Step title="尝试当前提供商">使用身份验证配置文件轮换/冷却规则尝试当前提供商。</Step>
  <Step title="遇故障转移错误时推进">如果该提供商因符合故障转移条件的错误而耗尽，则移动到下一个模型候选。</Step>
  <Step title="Persist fallback override">在重试开始之前持久化所选的故障转移覆盖，以便其他会话读取者能看到运行程序即将使用的相同提供商/模型。持久化的模型覆盖被标记为 `modelOverrideSource: "auto"`。</Step>
  <Step title="失败时精确回滚">如果回退候选失败，则当它们仍匹配该失败的候选时，仅回滚回退拥有的会话覆盖字段。</Step>
  <Step title="Throw FallbackSummaryError if exhausted">如果每个候选者都失败了，则抛出一个 `FallbackSummaryError`，其中包含每次尝试的详细信息，以及已知情况下的最快冷却到期时间。</Step>
</Steps>

这故意做得比“保存和恢复整个会话”更窄。回复运行程序仅持久化其为回退拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这可以防止失败的故障转移重试覆盖较新的、不相关的会话变更，例如在尝试运行期间发生的手动 `/model` 变更或会话轮换更新。

## 选择源策略

OpenClaw 将所选的提供商/模型与选择它的原因分离开来。该来源控制是否允许故障转移链：

- **配置的默认值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主模型**：`agents.list[].model` 是严格的，除非该 agent 模型对象包含其自己的 `fallbacks`。使用 `fallbacks: []` 使严格行为显式化，或者提供一个非空列表以使该 agent 选择加入模型故障转移。
- **自动故障转移覆盖**：运行时故障转移会在重试前写入 `providerOverride`、`modelOverride` 和 `modelOverrideSource: "auto"`。该自动覆盖可以继续遍历配置的故障转移链，并由 `/new`、`/reset` 和 `sessions.reset` 清除。
- **用户会话覆盖**：`/model`（模型选择器）、`session_status(model=...)` 和 `sessions.patch` 会写入 `modelOverrideSource: "user"`OpenClaw。这是一个精确的会话选择。如果选定的提供商/模型在生成回复之前失败，OpenClaw 将报告失败，而不是使用无关的配置故障转移来回答。
- **旧版会话覆盖**：较旧的会话条目可能包含 `modelOverride` 但没有 `modelOverrideSource`OpenClaw。OpenClaw 将这些视为用户覆盖，因此明确的旧选择不会被静默转换为故障转移行为。
- **Cron 负载模型**：Cron 作业 `payload.model` / `--model` 是作业主要属性，而不是用户会话覆盖。它使用配置的故障转移，除非作业提供了 `payload.fallbacks`；`payload.fallbacks: []` 使 cron 运行变为严格模式。

## 身份验证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌都使用 **身份验证配置文件 (auth profiles)**。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时身份验证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` 仅用于 **元数据 + 路由**（不包含密钥）。
- 旧版仅导入 OAuth 文件：OAuth`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）。

更多详情：[OAuth](OAuth/en/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` （对于某些提供商为 + `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个账户可以共存。

- 默认值：当没有可用的电子邮件时为 `provider:default`。
- 带电子邮件的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 下的 `profiles` 中。

## 轮换顺序

当提供商拥有多个配置文件时，OpenClaw 会按如下顺序选择：

<Steps>
  <Step title="Explicit config">`auth.order[provider]`（如果已设置）。</Step>
  <Step title="Configured profiles">按提供商过滤的 `auth.profiles`。</Step>
  <Step title="Stored profiles">该提供商在 `auth-profiles.json` 中的条目。</Step>
</Steps>

如果未配置显式顺序，OpenClaw 将使用轮询顺序：

- **主键：** 配置文件类型（**OAuth 优先于 API 密钥**）。
- **次键：** `usageStats.lastUsed`（每种类型中最旧的优先）。
- **冷却/禁用的配置文件** 被移至末尾，按最早到期的时间排序。

### 会话粘性（缓存友好）

OpenClaw **会在每个会话中锁定选定的身份验证配置文件**，以保持提供商缓存温热。它**不会**在每次请求时轮换。锁定的配置文件会被重复使用，直到：

- 会话被重置（`/new` / `/reset`）
- 完成一次压缩（压缩计数增加）
- 配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行手动选择会为该会话设置**用户覆盖**，并且在开始新会话之前不会自动轮换。

<Note>自动固定的配置文件（由会话路由器选择）被视为一种**偏好**：它们会被首先尝试，但 OpenClaw 可能会在遇到速率限制/超时时轮换到另一个配置文件。用户固定的配置文件将保持锁定在该配置文件上；如果它失败且配置了模型回退，OpenClaw 将移动到下一个模型，而不是切换配置文件。</Note>

### 为什么 OAuth 可能会“看起来丢失”

如果您为同一个提供商同时拥有 OAuth 配置文件和 API 密钥配置文件，除非已固定，否则轮询（round-robin）可能会在消息之间切换它们。要强制使用单个配置文件：

- 使用 `auth.order[provider] = ["provider:profileId"]` 进行固定，或者
- 通过 `/model …` 使用每会话覆盖（per-会话 override）并配合配置文件覆盖（当您的 UI/聊天界面支持时）。

## 冷却

当配置文件由于身份验证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为冷却状态并移动到下一个配置文件。

<AccordionGroup>
  <Accordion title="哪些情况归类为速率限制/超时桶">
    该速率限制桶的范围比单纯的 `429` 更广：它还包括提供商消息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，例如 `weekly/monthly limit reached`。

    格式/无效请求错误通常是致命的，因为重试相同的负载会以同样的方式失败，因此 OpenClaw 会直接显示这些错误，而不是轮换身份验证配置文件。已知的重试修复路径可以显式选择加入：例如，Cloud Code Assist 工具调用 ID 验证失败会被清理，并通过 `allowFormatRetry` 策略重试一次。与 OpenAI 兼容的停止原因错误，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，被归类为超时/故障转移信号。

    当源匹配已知的瞬态模式时，通用服务器文本也可能归入该超时桶。例如，裸露的 pi-ai 流包装器消息 `An unknown error occurred` 被视为对每个提供商都值得进行故障转移，因为当提供商流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结束且没有具体细节时，pi-ai 会发出此消息。包含瞬态服务器文本（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 负载也被视为值得进行故障转移的超时。

    特定于 OpenRouter 的通用上游文本（例如裸露的 `Provider returned error`）仅在提供商上下文实际上是 OpenRouter 时才被视为超时。通用内部回退文本（例如 `LLM request failed with an unknown error.`）保持保守，不会自行触发故障转移。

  </Accordion>
  <Accordion title="SDK 重试上限">
    否则，某些提供商 SDK 可能会在长时间 `Retry-After`OpenClawAnthropicOpenAIOpenClaw 窗口内休眠，然后将控制权返回给 OpenClaw。对于基于 Stainless 的 SDK（如 Anthropic 和 OpenAI），OpenClaw 默认将 SDK 内部的 `retry-after-ms` / `retry-after` 等待上限设为 60 秒，并立即显示更长的可重试响应，以便运行此故障转移路径。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用该上限；请参阅[重试行为](/zh/concepts/retry)。
  </Accordion>
  <Accordion title="模型范围冷却"OpenClaw>
    速率限制冷却也可以是模型范围的：

    - 当已知失败的模型 ID 时，OpenClaw 会记录速率限制失败的 `cooldownModel`。
    - 当冷却范围针对不同的模型时，仍可以尝试同一提供商上的同级模型。
    - 计费/禁用窗口仍然会阻止跨模型的整个配置文件。

  </Accordion>
</AccordionGroup>

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

计费/信用失败（例如“余额不足” / “信用余额过低”）被视为值得故障转移，但它们通常不是暂时的。OpenClaw 不会进行短时间的冷却，而是将配置文件标记为**已禁用**（具有更长的退避时间），并轮换到下一个配置文件/提供商。

<Note>
并非每个与账单相关的响应都是 `402`，也并非每个 HTTP `402` 都会归入此处。即使提供商返回 `401` 或 `403`，OpenClaw 仍会将明确的账单文本保留在账单通道中，但特定于提供商的匹配器仅限于拥有它们的提供商（例如 OpenRouter `403 Key limit exceeded`）。

同时，临时的 `402` 使用窗口和组织/工作区支出限制错误，在消息看起来可重试时（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`）会被归类为 `rate_limit`。这些错误将保持在简短的冷却/故障转移路径上，而不是长期的账单禁用路径上。

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

- 账单退避从 **5 小时** 开始，每次账单失败翻倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时**（可配置）内未失败，退避计数器将重置。
- 过载重试允许在模型故障转移之前进行 **1 次同一提供商的配置文件轮换**。
- 过载重试默认使用 **0 毫秒退避**。

## 模型故障转移

如果提供商的所有配置文件都失败，OpenClaw 将移动到 `agents.defaults.model.fallbacks` 中的下一个模型。这适用于已耗尽配置文件轮换的身份验证失败、速率限制和超时（其他错误不会推进故障转移）。未暴露足够细节的提供商错误在故障转移状态中仍被精确标记：`empty_response` 表示提供商未返回可用消息或状态，`no_error_details` 表示提供商显式返回了 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始预览但尚未有分类器匹配它。

与计费冷却相比，过载和速率限制错误会被更积极地处理。默认情况下，OpenClaw 允许在同一个提供商内进行一次身份配置文件重试，然后无需等待即切换到下一个配置的模型回退。提供商繁忙信号（例如 OpenClaw`ModelNotReadyException`）归入该过载类别。可以使用 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 对此进行调整。

当运行从配置的默认主模型、定时任务主模型、具有显式回退的代理主模型或自动选择的回退覆盖开始时，OpenClaw 可以遍历匹配的配置回退链。没有显式回退的代理主模型和显式的用户选择（例如 OpenClaw`/model ollama/qwen3.5:27b`、模型选择器 `sessions.patch`CLIOpenClaw 或一次性 CLI 提供商/模型覆盖）是严格的：如果该提供商/模型无法访问或在生成回复之前失败，OpenClaw 将报告失败，而不是从无关的回退进行回答。

### 候选链规则

OpenClaw 根据当前请求的 OpenClaw`provider/model` 以及配置的回退来构建候选列表。

<AccordionGroup>
  <Accordion title="规则"OpenClawOpenClaw>
    - 请求的模型始终排在第一位。
    - 显式配置的回退项会被去重，但不会受模型允许列表过滤。它们被视为显式的操作员意图。
    - 如果当前运行已位于同一提供商系列中的某个配置回退项上，OpenClaw 将继续使用完整的配置链。
    - 如果当前运行位于与配置不同的提供商上，且当前模型尚未属于配置的回退链的一部分，OpenClaw 不会追加来自其他提供商的不相关配置回退项。
    - 当未向回退运行器提供显式回退覆盖时，配置的主选项将被追加到末尾，以便在早期候选者耗尽后，链可以回落到正常的默认值。
    - 当调用方提供 `fallbacksOverride` 时，运行器将仅使用请求的模型加上该覆盖列表。空列表会禁用模型回退，并防止将配置的主选项追加为隐藏的重试目标。

  </Accordion>
</AccordionGroup>

### 哪些错误会推进回退

<Tabs>
  <Tab title="继续执行">
    - 身份验证失败
    - 速率限制和冷却耗尽
    - 过载/提供商繁忙错误
    - 超时类型的故障转移错误
    - 计费禁用
    - `LiveSessionModelSwitchError`，它会被标准化为故障转移路径，以便过时的持久化模型不会创建外部重试循环
    - 当仍有剩余候选者时的其他无法识别的错误

  </Tab>
  <Tab title="不继续执行">
    - 非超时/故障转移类型的显式中止
    - 应保留在压缩/重试逻辑内部的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 当没有剩余候选者时的最终未知错误

  </Tab>
</Tabs>

### 冷却跳过与探测行为

当提供商的每个身份验证配置文件都已处于冷却状态时，OpenClaw 不会永久自动跳过该提供商。它会针对每个候选者做出决定：

<AccordionGroup>
  <Accordion title="每个候选项的决定">
    - 持续的身份验证失败会立即跳过整个提供商。
    - 计费禁用通常会跳过，但主候选项仍可能在节流时被探测，以便无需重启即可恢复。
    - 主候选项可能会在冷却期快到期时被探测，带有针对每个提供商的节流。
    - 当故障看起来是暂时性的（`rate_limit`、`overloaded` 或未知）时，可以尝试同一提供商的回退同级，尽管处于冷却期。当速率限制是模型范围且同级模型可能仍立即恢复时，这一点尤其相关。
    - 暂时性冷却探测限制为每次回退运行每个提供商一次，以便单个提供商不会阻塞跨提供商回退。

  </Accordion>
</AccordionGroup>

## 会话覆盖和实时模型切换

会话模型更改是共享状态。活动运行器、`/model` 命令、压缩/会话更新和实时会话协调都读取或写入同一会话条目的部分内容。

这意味着回退重试必须与实时模型切换相协调：

- 只有显式的用户驱动的模型更改才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改（如回退轮换、心跳覆盖或压缩）绝不会自行标记待处理的实时切换。
- 用户驱动的模型覆盖被视为回退策略的精确选择，因此无法访问的所选提供商会显示为失败，而不是被 `agents.defaults.model.fallbacks` 掩盖。
- 在开始回退重试之前，回复运行器会将所选的回退覆盖字段持久化到会话条目中。
- 自动回退覆盖在随后的轮次中保持选中状态，以便 OpenClaw 不会在每条消息时探测已知不良的主选项。`/new`、`/reset` 和 `sessions.reset` 清除自动源覆盖并将会话返回到配置的默认值。
- `/status` 显示所选模型，并且当回退状态不同时，显示活动回退模型和原因。
- 实时会话协调优先使用已持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果实时切换错误指向活动故障转移链中较后的候选项，OpenClaw 会直接跳转到该选定的模型，而不是先遍历不相关的候选项。
- 如果故障转移尝试失败，运行器仅回滚其写入的覆盖字段，且仅在这些字段仍与该失败的候选项匹配时才回滚。

这可以防止典型的竞态问题：

<Steps>
  <Step title="主模型失败">选定的主模型失败。</Step>
  <Step title="在内存中选择回退">在内存中选择回退候选项。</Step>
  <Step title="会话存储仍显示旧主模型">会话存储仍反映旧的主模型。</Step>
  <Step title="实时协调读取过时状态">实时会话协调读取过时的会话状态。</Step>
  <Step title="重试被回退">在故障转移尝试开始之前，重试会被回退到旧模型。</Step>
</Steps>

持久化的回退覆盖关闭了这个窗口，而狭窄的回滚则保持了较新的手动或运行时会话更改的完整性。

## 可观察性和故障摘要

`runWithModelFallback(...)` 记录每次尝试的详细信息，这些信息用于生成日志和面向用户的冷却消息：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的故障转移原因）
- 可选的状态/代码
- 人类可读的错误摘要

结构化 `model_fallback_decision` 日志还包含扁平的 `fallbackStep*` 字段，当候选者失败、被跳过或后续回退成功时。这些字段明确显示了尝试的转换（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），因此日志和诊断导出器即使在最终回退也失败的情况下，也能重建主要失败原因。

当每个候选者都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外部回复运行器可以使用它来构建更具体的消息，例如“所有模型暂时受到速率限制”，并在已知的情况下包含最近的冷却到期时间。

该冷却摘要是模型感知的：

- 针对尝试的提供商/模型链，会忽略不相关的模型范围速率限制
- 如果剩余的阻塞项是匹配的模型范围速率限制，OpenClaw 会报告仍然阻塞该模型的最后一个匹配的到期时间

## 相关配置

有关以下内容，请参阅 [Gateway(网关) 配置](/zh/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和回退概述，请参阅 [模型](/zh/concepts/models)。
