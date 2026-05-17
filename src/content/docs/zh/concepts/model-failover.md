---
summary: "OpenClawOpenClaw 如何轮换身份配置文件并在模型之间进行故障转移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障转移"
sidebarTitle: "模型故障转移"
---

OpenClaw 分两个阶段处理故障：

1. 当前提供商内的**身份配置文件轮换**。
2. **模型故障转移**至 `agents.defaults.model.fallbacks` 中的下一个模型。

本文档解释了运行时规则及其背后的数据。

## 运行时流程

对于正常的文本运行，OpenClaw 按以下顺序评估候选项：

<Steps>
  <Step title="解析会话状态">解析活动会话模型和身份配置文件首选项。</Step>
  <Step title="构建候选链">根据当前的模型选择和该选择源的故障转移策略构建模型候选链。配置的默认值、定时任务主选项和自动选择的故障转移模型可以使用配置的故障转移；显式的用户会话选择则是严格的。</Step>
  <Step title="Try the current 提供商">尝试使用当前提供商并应用认证配置文件轮换/冷却规则。</Step>
  <Step title="Advance on failover-worthy errors">如果该提供商因具备故障转移价值的错误而耗尽，则移动到下一个模型候选项。</Step>
  <Step title="Persist fallback override">在重试开始之前持久化所选的故障转移覆盖，以便其他会话读取者能看到运行程序即将使用的相同提供商/模型。持久化的模型覆盖被标记为 `modelOverrideSource: "auto"`。</Step>
  <Step title="Roll back narrowly on failure">如果候选项失败，当回退拥有的会话覆盖字段仍然与该失败的候选项匹配时，仅回退这些字段。</Step>
  <Step title="Throw FallbackSummaryError if exhausted">如果每个候选项都失败，则抛出一个 `FallbackSummaryError`，其中包含每次尝试的详细信息以及（如果已知）最近的冷却过期时间。</Step>
</Steps>

这故意做得比“保存和恢复整个会话”更窄。回复运行程序仅持久化其为回退拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这可以防止失败的回退重试覆盖较新的无关会话变更，例如在尝试运行期间发生的手动 `/model` 更改或会话轮换更新。

## 选择源策略

OpenClaw 将所选的提供商/模型与选择它的原因分离开来。该来源控制是否允许故障转移链：

- **配置默认值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主模型**：`agents.list[].model` 是严格的，除非该 agent 模型对象包含其自己的 `fallbacks`。使用 `fallbacks: []` 使严格行为显式化，或提供一个非空列表以选择该 agent 进行模型回退。
- **自动故障转移覆盖**：运行时故障转移会在重试之前写入 `providerOverride`、`modelOverride`、`modelOverrideSource: "auto"` 以及选定的原始模型。该自动覆盖可以继续遍历已配置的故障转移链，并由 `/new`、`/reset` 和 `sessions.reset` 清除。在没有显式 `heartbeat.model` 的情况下运行的 Heartbeat 也会在原始模型不再匹配当前配置的默认值时清除直接的自动覆盖。
- **用户会话覆盖**：`/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 会写入 `modelOverrideSource: "user"`OpenClaw。这是一种确切的会话选择。如果所选的提供商/模型在生成回复之前失败，OpenClaw 将报告失败，而不是从不相关的配置的回退中进行回答。
- **旧版会话覆盖**：较旧的会话条目可能具有 `modelOverride` 而没有 `modelOverrideSource`OpenClaw。OpenClaw 将这些视为用户覆盖，因此显式的旧选择不会被静默转换为回退行为。
- **Cron 负载模型**：一个 cron 作业 `payload.model` / `--model` 是作业主选，而不是用户会话覆盖。它使用配置的回退，除非作业提供了 `payload.fallbacks`；`payload.fallbacks: []` 使 cron 运行变为严格模式。

## 身份验证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌都使用 **身份验证配置文件 (auth profiles)**。

- Secrets 存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时身份验证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` **仅包含元数据和路由**（不包含密钥）。
- 旧版仅导入 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json` 中）。

更多详情：[OAuth](/zh/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` （对于某些提供商，+ `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个账户可以共存。

- 默认：当没有可用的电子邮件时，使用 `provider:default`。
- 带有电子邮件的 OAuth：`provider:<email>` （例如 `google-antigravity:user@gmail.com`）。

配置文件位于 `profiles` 下的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

## 轮换顺序

当提供商拥有多个配置文件时，OpenClaw 会按如下顺序选择：

<Steps>
  <Step title="显式配置">`auth.order[provider]` （如果已设置）。</Step>
  <Step title="已配置的配置文件">按提供商过滤的 `auth.profiles`。</Step>
  <Step title="已存储的配置文件">该提供商在 `auth-profiles.json` 中的条目。</Step>
</Steps>

如果未配置显式顺序，OpenClaw 将使用轮询顺序：

- **主键：** 配置文件类型（**OAuth 优先于 API 密钥**）。
- **Secondary key:** `usageStats.lastUsed` (oldest first, within each type).
- **冷却/禁用的配置文件** 被移至末尾，按最早到期的时间排序。

### 会话粘性（缓存友好）

OpenClaw **会在每个会话中锁定选定的身份验证配置文件**，以保持提供商缓存温热。它**不会**在每次请求时轮换。锁定的配置文件会被重复使用，直到：

- 会话 被重置 (`/new` / `/reset`)
- 完成一次压缩（压缩计数增加）
- 配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行手动选择为该会话设置了 **user override**（用户覆盖），并且在新的会话开始之前不会自动轮换。

<Note>
  Auto-pinned profiles (selected by the 会话 router) are treated as a **preference**: they are tried first, but OpenClaw may rotate to another profile on rate limits/timeouts. When the original profile becomes available again, new runs can prefer it again without changing the selected 模型 or runtime. User-pinned profiles stay locked to that profile; if it fails and 模型 fallbacks are configured,
  OpenClaw moves to the next 模型 instead of switching profiles.
</Note>

### OpenAI Codex 订阅加上 API 密钥备份

对于 OpenAI 代理模型，身份验证和运行时是分离的。`openai/gpt-*` 保留在
Codex 约束中，而身份验证可以在 Codex 订阅配置文件和
OpenAI API 密钥备份之间轮换。

使用 `auth.order.openai` 设置面向用户的顺序：

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

现有的 Codex 订阅配置文件可能仍使用旧版 `openai-codex:*` 配置文件 ID。有序的 API 密钥备份可以是一个普通的 `openai:*` API 密钥配置文件。当订阅达到 Codex 使用限制时，OpenClaw 会记录 Codex 提供的确切重置时间，尝试下一个有序的认证配置文件，并在 Codex 驱动程序内保持运行。一旦重置时间过去，订阅配置文件将再次符合条件，下一次自动选择可以返回到它。

仅当您想为该会话强制使用特定账户/密钥时，才使用用户固定的配置文件。用户固定的配置文件是有意严格设置的，不会静默跳转到另一个配置文件。

## 冷却期

当配置文件因身份验证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为冷却状态并移动到下一个配置文件。

<AccordionGroup>
  <Accordion title="归入速率限制 / 超时桶的内容">
    该速率限制桶的范围比单纯的 `429` 更广：它还包括提供商消息，如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及定期使用窗口限制，如 `weekly/monthly limit reached`。

    格式/无效请求错误通常是终结性的，因为重试相同的负载会以相同的方式失败，因此 OpenClaw 会直接暴露这些错误，而不是轮换身份验证配置文件。已知的重试修复路径可以显式选择加入：例如，Cloud Code Assist 工具调用 ID 验证失败会被清理，并通过 `allowFormatRetry` 策略重试一次。OpenAI 兼容的停止原因错误（如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`）被归类为超时/故障转移信号。

    当源匹配已知的瞬态模式时，通用服务器文本也可能落入该超时桶。例如，裸露的 pi-ai 流包装器消息 `An unknown error occurred` 被视为对每个提供商都值得故障转移，因为 pi-ai 在提供商流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结束且没有具体细节时会发出此消息。带有瞬态服务器文本（如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 负载也被视为值得故障转移的超时。

    OpenRouter 特定的通用上游文本（如裸露的 `Provider returned error`）仅在提供商上下文实际上是 OpenRouter 时才被视为超时。通用内部回退文本（如 `LLM request failed with an unknown error.`）保持保守，本身不会触发故障转移。

  </Accordion>
  <Accordion title="SDK retry-after caps">
    某些提供商 SDK 否则可能会在将控制权返回给 OpenClaw 之前休眠一个很长的 `Retry-After` 窗口。对于基于 Stainless 的 SDK，例如 Anthropic 和 OpenAI，OpenClaw 默认将 SDK 内部的 `retry-after-ms` / `retry-after` 等待时间上限设为 60 秒，并立即显露更长的可重试响应，以便运行此故障转移路径。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用该上限；请参阅 [Retry behavior](/zh/concepts/retry)。
  </Accordion>
  <Accordion title="Model-scoped cooldowns"OpenClaw>
    速率限制冷却也可以是模型作用域的：

    - 当失败的模型 ID 已知时，OpenClaw 会为速率限制失败记录 `cooldownModel`。
    - 当冷却范围针对不同的模型时，同一提供商下的同级模型仍可尝试。
    - 计费/禁用时段仍然会在所有模型间阻塞整个配置文件。

  </Accordion>
</AccordionGroup>

冷却使用指数退避策略：

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

计费/信用失败（例如“积分不足”/“信用余额过低”）被视为可进行故障转移，但它们通常不是暂时性的。OpenClaw 不会设置短暂的冷却，而是将配置文件标记为 **已禁用**（具有更长的退避时间），并轮换到下一个配置文件/提供商。OpenClaw

<Note>
并非每个与计费相关的响应都是 `402`，也并非每个 HTTP `402` 都会到达此处。即使提供商返回 `401` 或 `403`，OpenClaw 仍会将明确的计费文本保留在计费通道中，但特定于提供商的匹配器仅限于拥有它们的提供商（例如 OpenRouter `403 Key limit exceeded`）。

同时，临时的 `402` 使用窗口和组织/工作区支出限制错误，在消息看起来可重试时（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`），会被归类为 `rate_limit`。这些错误会停留在短冷却/故障转移路径上，而不是长计费禁用路径上。

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

- 计费退避开始于 **5 小时**，每次计费失败翻倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时**（可配置）内未失败，退避计数器将重置。
- 过载重试允许在模型回退之前进行 **1 次同一提供商的配置文件轮换**。
- 过载重试默认使用 **0 毫秒退避**。

## 模型回退

如果提供商的所有配置文件都失败，OpenClaw 将转移到 OpenClaw`agents.defaults.model.fallbacks` 中的下一个模型。这适用于身份验证失败、速率限制以及耗尽配置文件轮换的超时（其他错误不会推进回退）。未暴露足够详细信息的提供商错误在回退状态下仍被精确标记：`empty_response` 表示提供商未返回可用的消息或状态，`no_error_details` 表示提供商显式返回了 `Unknown error (no error details in response)`，而 `unclassified`OpenClaw 表示 OpenClaw 保留了原始预览，但尚未有分类器匹配它。

过载和限流错误比计费冷却处理得更激进。默认情况下，OpenClaw 允许一次同一提供商的身份配置文件重试，然后无需等待即可切换到下一个配置的模型回退。提供商忙信号，例如 `ModelNotReadyException`，会被归类到该过载桶中。使用 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 进行调整。

当运行从配置的默认主选项、cron 作业主选项、具有显式回退的代理主选项或自动选择的回退覆盖开始时，OpenClaw 可以遍历匹配的配置回退链。没有显式回退的代理主选项和显式用户选择（例如 `/model ollama/qwen3.5:27b`，模型选择器，`sessions.patch`，或一次性 CLI 提供商/模型覆盖）是严格的：如果该提供商/模型不可达或在产生回复之前失败，OpenClaw 会报告失败，而不是从不相关的回退进行回答。

### 候选链规则

OpenClaw 根据当前请求的 `provider/model` 以及配置的回退来构建候选列表。

<AccordionGroup>
  <Accordion title="规则"OpenClaw>
    - 请求的模型始终排在第一位。
    - 显式配置的回退项会进行去重，但不受模型允许列表过滤。它们被视为显式的操作员意图。
    - 如果当前运行已经在同一提供商系列中的某个配置回退项上，OpenClaw 将继续使用完整的配置链。
    - 当未提供显式回退覆盖时，即使请求的模型使用不同的提供商，也会在配置的主项之前尝试配置的回退项。
    - 当未向回退运行器提供显式回退覆盖时，配置的主项会追加到末尾，以便在较早的候选者耗尽后，链可以回落到正常的默认值。
    - 当调用者提供 `fallbacksOverride` 时，运行器将完全使用请求的模型加上该覆盖列表。空列表将禁用模型回退，并阻止将配置的主项追加为隐藏的重试目标。

  </Accordion>
</AccordionGroup>

### 哪些错误会触发回退

<Tabs>
  <Tab title="继续">
    - 身份验证失败
    - 速率限制和冷却耗尽
    - 过载/提供商忙碌错误
    - 超时 shaped 的故障转移错误
    - 计费禁用
    - `LiveSessionModelSwitchError`，其被规范化为一条故障转移路径，因此过时的持久化模型不会创建外部重试循环
    - 当仍有剩余候选项时的其他未识别错误

  </Tab>
  <Tab title="Does not continue on">
    - 非超时/故障转移类型的显式中止
    - 应保持在压缩/重试逻辑内的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 当没有剩余候选项时的最终未知错误

  </Tab>
</Tabs>

### 冷却跳过与探测行为

当提供商的所有身份配置文件都处于冷却状态时，OpenClaw 不会永远自动跳过该提供商。它会针对每个候选项做出决定：

<AccordionGroup>
  <Accordion title="Per-candidate decisions">
    - 持续的认证失败会立即跳过整个提供商。
    - 计费禁用通常会跳过，但主要候选可能会在节流状态下被探测，以便在不重启的情况下恢复。
    - 主要候选可能会在冷却即将到期时被探测，并带有针对每个提供商的节流。
    - 当故障看起来是暂时的（`rate_limit`、`overloaded` 或未知）时，即使处于冷却期，也可以尝试同一提供商下的备用候选项。这在速率限制仅针对特定模型且兄弟模型可能立即恢复时尤为重要。
    - 每次故障转移运行中，每个提供商的临时冷却探测仅限一次，以免单个提供商阻碍跨提供商的故障转移。

  </Accordion>
</AccordionGroup>

## 会话覆盖和实时模型切换

会话模型变更是共享状态。活跃的运行器、`/model` 命令、压缩/会话更新以及实时会话协调都读取或写入同一会话条目的部分内容。

这意味着故障转移重试必须与实时模型切换相协调：

- 只有显式的用户驱动的模型变更才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型变更（如故障转移轮换、心跳覆盖或压缩）绝不会自行标记待处理的实时切换。
- 用户驱动的模型覆盖被视为故障转移策略的精确选择，因此无法访问的选定提供商会作为失败呈现，而不是被 `agents.defaults.model.fallbacks` 遮蔽。
- 在开始故障转移重试之前，回复运行器会将所选的故障转移覆盖字段持久化到会话条目中。
- 自动故障转移覆盖会在后续轮次中保持选中状态，因此 OpenClaw 不会在每次消息时探测已知不可用的主要模型。OpenClaw`/new`、`/reset` 和 `sessions.reset` 会清除自动来源的覆盖，并将会话返回到配置的默认值。
- `/status` 显示所选的模型，并且当故障转移状态不同时，显示活动的故障转移模型及原因。
- 实时会话协调优先于持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果实时切换错误指向活动故障转移链中的后续候选者，OpenClaw 会直接跳转到该选定的模型，而不是先遍历不相关的候选者。
- 如果回退尝试失败，运行程序仅回滚其写入的覆盖字段，且仅当它们仍与该失败的候选项匹配时。

这防止了经典的竞态条件：

<Steps>
  <Step title="Primary fails">选定的主模型失败。</Step>
  <Step title="Fallback chosen in memory">在内存中选择了回退候选项。</Step>
  <Step title="Session store still says old primary">会话存储仍然反映旧的主模型。</Step>
  <Step title="Live reconciliation reads stale state">实时会话协调读取了过时的会话状态。</Step>
  <Step title="Retry snapped back">在回退尝试开始之前，重试会立即切换回旧模型。</Step>
</Steps>

持久化的回退覆盖关闭了那个窗口，而 narrow rollback 则保留更新的手动或运行时会话更改。

## 可观测性和故障摘要

`runWithModelFallback(...)` 记录了每次尝试的详细信息，这些信息用于生成日志和面向用户的冷却消息：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的故障转移原因）
- 可选状态/代码
- 人类可读的错误摘要

当候选失败、被跳过或后续回退成功时，结构化 `model_fallback_decision` 日志还包含扁平的 `fallbackStep*` 字段。这些字段明确显示了尝试的转换（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），以便日志和诊断导出器即使在最终回退也失败的情况下，也能重构主要失败原因。

当每个候选都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外部回复运行器可以使用它来构建更具体的消息，例如“所有模型暂时受到速率限制”，并在已知的情况下包含最近的冷却到期时间。

该冷却摘要具有模型感知能力：

- 对于尝试的提供商/模型链，会忽略不相关的模型范围速率限制
- 如果剩余的拦截是匹配的模型范围速率限制，OpenClaw 会报告仍然拦截该模型的最后一个匹配的过期时间

## 相关配置

请参阅 [Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>) 了解以下内容：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

请参阅 [模型](/zh/concepts/models) 以获取更广泛的模型选择和故障转移概览。
