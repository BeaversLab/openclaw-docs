---
summary: "OpenClawOpenClaw 如何轮换身份验证配置文件并在模型之间进行故障转移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障转移"
sidebarTitle: "模型故障转移"
---

OpenClaw 分两个阶段处理故障：

1. 当前提供商内的**身份配置文件轮换**。
2. **模型故障转移**到 `agents.defaults.model.fallbacks` 中的下一个模型。

本文档解释了运行时规则及其背后的数据。

## 运行时流程

对于正常的文本运行，OpenClaw 按以下顺序评估候选项：

<Steps>
  <Step title="解析会话状态">解析活动会话模型和身份验证配置文件偏好。</Step>
  <Step title="构建候选链">根据当前模型选择和该选择源的故障转移策略构建模型候选链。配置的默认值、定时作业主节点和自动选择的故障转移模型可以使用配置的故障转移；显式用户会话选择是严格的。</Step>
  <Step title="尝试当前提供商">尝试使用当前提供商以及身份验证配置文件轮换/冷却规则。</Step>
  <Step title="在值得故障转移的错误时推进">如果该提供商因值得故障转移的错误而耗尽，则移动到下一个模型候选。</Step>
  <Step title="持久化故障转移覆盖">在重试开始之前持久化所选的故障转移覆盖，以便其他会话读取者看到运行程序即将使用的同一提供商/模型。持久化的模型覆盖被标记为 `modelOverrideSource: "auto"`。</Step>
  <Step title="失败时精确回滚">如果故障转移候选失败，则当它们仍与该失败的候选匹配时，仅回滚故障转移拥有的会话覆盖字段。</Step>
  <Step title="如果耗尽则抛出 FallbackSummaryError">如果每个候选都失败，则抛出一个 `FallbackSummaryError`，其中包含每次尝试的详细信息以及已知情况下的最早冷却到期时间。</Step>
</Steps>

这故意做得比“保存和恢复整个会话”更窄。回复运行程序仅持久化其为回退拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这可以防止失败的回退重试覆盖较新的、无关的会话突变，例如在尝试运行期间发生的手动 `/model` 更改或会话轮换更新。

## 选择源策略

OpenClaw 将所选的提供商/模型与选择它的原因分离开来。该来源控制是否允许故障转移链：

- **配置的默认值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主选项**：`agents.list[].model` 是严格的，除非该 agent 模型对象包含其自己的 `fallbacks`。使用 `fallbacks: []` 可使严格行为显式化，或提供非空列表以使该 agent 选择启用模型回退。
- **自动回退覆盖**：运行时回退会在重试之前写入 `providerOverride`、`modelOverride`、`modelOverrideSource: "auto"` 以及选定的源模型。该自动覆盖可以继续沿着配置的回退链进行，而无需在每条消息时探测主选项，但当恢复时，OpenClaw 会定期再次探测配置的源并清除自动覆盖。`/new`、`/reset` 和 `sessions.reset` 也会清除自动来源的覆盖。心跳在没有显式 `heartbeat.model` 清除的情况下运行，当其源不再匹配当前配置的默认值时，会清除直接的自动覆盖。
- **用户会话覆盖**：`/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 会写入 `modelOverrideSource: "user"`。这是一个精确的会话选择。如果所选提供商/模型在产生回复之前失败，OpenClaw 将报告失败，而不是从无关的配置回退中进行回答。
- **旧版会话覆盖**：较旧的会话条目可能没有 `modelOverrideSource` 而只有 `modelOverride`。OpenClaw 会将这些视为用户覆盖，因此明确的旧选择不会被静默转换为回退行为。
- **Cron 载荷模型**：一个 cron 任务 `payload.model` / `--model` 是任务主选，而不是用户会话覆盖。它使用配置的回退，除非任务提供 `payload.fallbacks`；`payload.fallbacks: []` 使 cron 运行变为严格模式。

自动回退的主探测间隔为五分钟且不可配置。OpenClaw 会记住每个会话和主模型的最近探测，因此不会在每一轮都重试失败的主模型。当会话切换到回退时，OpenClaw 会发送一条可见通知，当它返回到选定的主模型时发送另一条通知；它不会在每一次粘性回退轮次中重复该通知。

## 用户可见的回退通知

当会话切换到自动选择的回退时，OpenClaw 会在同一回复界面中发送状态通知：

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

当后续探测成功且会话返回到选定的主模型时，OpenClaw 会发送：

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

这些通知是操作消息，而非助手内容。它们在每次状态更改时传递一次，包括仅在可行时传递副作用轮次，但粘性回退轮次不会重复它们。传递过程绕过正常的源回复抑制，该通知不会占用线程化频道的第一个助手回复槽位，并且它被排除在文本转语音和承诺提取之外。

## 认证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌均使用 **认证配置** (auth profiles)。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时认证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` 仅包含 **元数据 + 路由**（不包含密钥）。
- 旧版仅导入 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）。

更多详情：[OAuth](/zh/concepts/oauth)

凭证类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` （对于某些提供商为 `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个帐户共存。

- 默认值：当没有可用的电子邮件时为 `provider:default`。
- 带有电子邮件的 OAuth：OAuth`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件存在于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 下的 `profiles` 中。

## 轮换顺序

当提供商有多个配置文件时，OpenClaw 会按如下方式选择顺序：

<Steps>
  <Step title="Explicit config">`auth.order[provider]`（如果已设置）。</Step>
  <Step title="Configured profiles">按提供商过滤的 `auth.profiles`。</Step>
  <Step title="Stored profiles">该提供商在 `auth-profiles.json` 中的条目。</Step>
</Steps>

如果未配置显式顺序，OpenClaw 使用轮询顺序：

- **主键：** 配置文件类型（**OAuth 优先于 API 密钥**）。
- **次键：** `usageStats.lastUsed`（每种类型中最早的优先）。
- **冷却/禁用的配置文件**被移至末尾，按最早到期时间排序。

### 会话粘性（缓存友好）

OpenClaw **为每个会话固定选定的身份验证配置文件**，以保持提供商缓存处于预热状态。它并**不会**在每次请求时进行轮换。固定的配置文件会被重复使用，直到：

- 会话被重置（`/new` / `/reset`）
- 完成一次压缩（压缩计数增加）
- 配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行的手动选择会为该会话设置**用户覆盖**，并且在开始新会话之前不会自动轮换。

<Note>自动固定配置文件（由会话路由器选择）被视为一种**偏好**：它们会首先被尝试，但在遇到速率限制/超时时，OpenClaw 可能会轮换到另一个配置文件。当原始配置文件再次可用时，新的运行可以再次优先选择它，而无需更改选定的模型或运行时。用户固定的配置文件会锁定在该配置文件上；如果它失败并且配置了模型回退，OpenClaw 将移动到下一个模型，而不是切换配置文件。</Note>

### OpenAI Codex 订阅加上 API 密钥备份

对于 OpenAI 代理模型，身份验证和运行时是分开的。`openai/gpt-*` 保持在
Codex 挂载上，而身份验证可以在 Codex 订阅配置文件和
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

现有的 Codex 订阅配置文件可能仍使用旧的
`openai-codex:*` 配置文件 ID。有序的 API 密钥备份可以是一个普通的
`openai:*` API 密钥配置文件。当订阅达到 Codex 使用限制时，
OpenClaw 会在 Codex 提供时记录确切的重置时间，尝试下一个
有序身份验证配置文件，并将运行保持在 Codex 挂载内。一旦重置
时间过去，订阅配置文件将再次符合资格，下一次自动
选择可以返回到它。

仅当您希望为该会话强制使用一个帐户/密钥时，才使用用户固定配置文件。用户固定配置文件是有意设置得严格的，不会静默跳转到另一个配置文件。

## 冷却

当配置文件由于身份验证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为冷却并移动到下一个配置文件。

<AccordionGroup>
  <Accordion title="哪些情况属于速率限制/超时桶">
    该速率限制桶的范围比单纯的 `429` 更广：它还包括提供商消息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，如 `weekly/monthly limit reached`。

    格式/无效请求错误通常是致命的，因为重试相同的负载会以相同的方式失败，因此 OpenClaw 会将这些错误直接抛出，而不是轮换身份验证配置文件。已知的重试修复路径可以显式选择加入：例如，Cloud Code Assist 工具调用 ID 验证失败会被清理，并通过 `allowFormatRetry` 策略重试一次。OpenAI 兼容的停止原因错误（如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`）被归类为超时/故障转移信号。

    当来源匹配已知的瞬态模式时，通用的服务器文本也可能落入该超时桶。例如，裸露的 pi-ai 流包装器消息 `An unknown error occurred` 对每个提供商都被视为值得故障转移，因为当提供商流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结尾且没有具体细节时，pi-ai 会发出此消息。包含瞬态服务器文本（如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 负载也被视为值得故障转移的超时。

    OpenRouter 特有的通用上游文本（如裸露的 `Provider returned error`）仅在提供商上下文确实是 OpenRouter 时才被视为超时。通用的内部回退文本（如 `LLM request failed with an unknown error.`）保持保守，本身不会触发故障转移。

  </Accordion>
  <Accordion title="SDK 重试上限">
    部分提供商 SDK 在将控制权返回给 OpenClaw 之前，可能会休眠一个很长的 `Retry-After` 窗口。对于基于 Stainless 的 SDK（如 Anthropic 和 OpenAI），OpenClaw 默认将 SDK 内部的 `retry-after-ms` / `retry-after` 等待时间上限设定为 60 秒，并立即暴露更长的可重试响应，以便运行此故障转移路径。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用该上限；请参阅 [重试行为](/zh/concepts/retry)。
  </Accordion>
  <Accordion title="模型范围冷却">
    速率限制冷却也可以是模型范围的：

    - 当失败的模型 ID 已知时，OpenClaw 会记录速率限制失败的 `cooldownModel`。
    - 当冷却范围限定于不同的模型时，同一提供商上的同级模型仍然可以被尝试。
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

计费/信用失败（例如“余额不足”/“信用余额过低”）被视为可故障转移的，但它们通常不是瞬时的。OpenClaw 不会进行短时间的冷却，而是将该配置文件标记为 **disabled**（禁用）（并具有更长的退避时间），并轮换到下一个配置文件/提供商。

<Note>
并非每个计费形式的响应都是 `402`，也并非每个 HTTP `402`OpenClaw 都会落入此处。即使提供商返回 `401` 或 `403`OpenRouter，OpenClaw 仍会将明确的计费文本保留在计费通道中，但特定于提供商的匹配器仍仅限于拥有它们的提供商（例如 OpenRouter `403 Key limit exceeded`）。

同时，临时的 `402` 使用窗口以及组织/工作区支出限制错误，在消息看起来可重试时（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`），会被归类为 `rate_limit`。这些情况会保持在短暂的冷却/故障转移路径上，而不是漫长的计费禁用路径上。

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

- 计费退避从 **5 小时**开始，每次计费失败时翻倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时**内未出现故障（可配置），退避计数器将重置。
- 过载重试允许在模型回退之前进行 **1 次同提供商配置文件轮换**。
- 过载重试默认使用 **0 毫秒退避**。

## 模型回退

如果提供商的所有配置文件都失败了，OpenClaw 将移动到 OpenClaw`agents.defaults.model.fallbacks` 中的下一个模型。这适用于已耗尽配置文件轮换的身份验证失败、速率限制和超时（其他错误不会推进回退）。未暴露足够详细信息的提供商错误在回退状态下仍会被精确标记：`empty_response` 表示提供商未返回可用的消息或状态，`no_error_details` 表示提供商显式返回 `Unknown error (no error details in response)`，而 `unclassified`OpenClaw 表示 OpenClaw 保留了原始预览但尚未有匹配的分类器。

过载和速率限制错误的处理比计费冷却更激进。默认情况下，OpenClaw 允许一次同提供商认证配置文件重试，然后立即切换到下一个配置的模型回退，无需等待。提供商繁忙信号（如 `ModelNotReadyException`）属于该过载类别。可以通过 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 对此进行调整。

当运行从配置的默认主节点、cron 作业主节点、具有显式回退的代理主节点或自动选择的回退覆盖开始时，OpenClaw 可以遍历匹配的配置回退链。没有显式回退的代理主节点和显式用户选择（例如 `/model ollama/qwen3.5:27b`、模型选择器 `sessions.patch`，或一次性 CLI 提供商/模型覆盖）是严格的：如果该提供商/模型不可达或在生成回复前失败，OpenClaw 将报告失败，而不是从不相关的回退进行回答。

### 候选链规则

OpenClaw 根据当前请求的 `provider/model` 以及配置的回退来构建候选列表。

<AccordionGroup>
  <Accordion title="规则"OpenClaw>
    - 请求的模型始终排在第一位。
    - 显式配置的回退模型会进行去重，但不会受模型允许列表的过滤。它们被视为操作员的显式意图。
    - 如果当前运行已在同一提供商家族中的某个配置回退模型上，OpenClaw 将继续使用完整的配置链。
    - 当未提供显式回退覆盖时，即使请求的模型使用不同的提供商，也会在配置的主模型之前尝试配置的回退模型。
    - 当未向回退运行器提供显式回退覆盖时，配置的主模型会被追加到末尾，以便在较早的候选者耗尽后，链可以回落到正常的默认值。
    - 当调用者提供 `fallbacksOverride` 时，运行器将精确使用请求的模型加上该覆盖列表。空列表将禁用模型回退，并防止将配置的主模型作为隐藏的重试目标追加。

  </Accordion>
</AccordionGroup>

### 哪些错误会推进回退

<Tabs>
  <Tab title="继续执行">
    - 身份验证失败
    - 速率限制和冷却耗尽
    - 过载/提供商繁忙错误
    - 超时型回退错误
    - 计费禁用
    - `LiveSessionModelSwitchError`，它被规范化为一条回退路径，以便过时的持久化模型不会产生外层重试循环
    - 当仍有剩余候选者时的其他无法识别的错误

  </Tab>
  <Tab title="不继续执行">
    - 非超时/回退型的显式中止
    - 应保留在压缩/重试逻辑内的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 当没有剩余候选者时的最终未知错误

  </Tab>
</Tabs>

### 冷却跳过与探测行为

当提供商的每个身份验证配置文件都处于冷却状态时，OpenClaw 不会永远自动跳过该提供商。它会针对每个候选者做出决定：

<AccordionGroup>
  <Accordion title="Per-candidate decisions">
    - 持久性身份验证失败会立即跳过整个提供商。
    - 计费禁用通常会跳过，但主候选者仍可在节流时进行探测，以便在不重启的情况下恢复。
    - 在冷却期即将结束时，可能会对主候选者进行探测，并带有针对每个提供商的节流。
    - 当故障看起来是暂时的（`rate_limit`、`overloaded` 或未知）时，尽管处于冷却期，仍可尝试同一提供商的备用兄弟模型。当速率限制属于模型范围且兄弟模型可能立即恢复时，这一点尤为重要。
    - 每次故障转移运行中，每个提供商的暂时冷却探测仅限一次，以免单个提供商阻塞跨提供商的故障转移。

  </Accordion>
</AccordionGroup>

## 会话覆盖和实时模型切换

会话模型更改是共享状态。活动运行器、`/model` 命令、压缩/会话更新以及实时会话协调都会读取或写入同一会话条目的部分内容。

这意味着故障转移重试必须与实时模型切换相协调：

- 只有显式的用户驱动的模型更改才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改（如故障转移轮换、心跳覆盖或压缩）绝不会自行标记待处理的实时切换。
- 用户驱动的模型覆盖被视为故障转移策略的精确选择，因此无法访问的选定提供商会显示为失败，而不是被 `agents.defaults.model.fallbacks` 掩盖。
- 在故障转移重试开始之前，回复运行器会将选定的故障转移覆盖字段持久化到会话条目中。
- 自动故障转移覆盖在后续轮次中保持选中状态，因此 OpenClaw 不会在每条消息上探测已知的不良主模型。OpenClaw 会定期探测配置的源，并在恢复后清除自动覆盖；`/new`、`/reset` 和 `sessions.reset` 会立即清除自动来源的覆盖。
- 用户回复会在每次状态更改时公布故障转移转换和已清除故障转移的恢复。粘性故障转移轮次不会重复该通知。
- `/status` 显示所选模型，并且在故障转移状态不同时，显示当前活动的故障转移模型及原因。
- 实时会话协调优先于过时的运行时模型字段使用持久化的会话覆盖。
- 如果实时切换错误指向活动故障转移链中的后一个候选者，OpenClaw 将直接跳转到该所选模型，而不是先遍历无关的候选者。
- 如果故障转移尝试失败，运行器仅回滚其写入的覆盖字段，且仅当这些字段仍匹配该失败的候选者时才执行。

这防止了典型的竞态问题：

<Steps>
  <Step title="主要模型失败">所选的主要模型失败。</Step>
  <Step title="内存中选择故障转移">在内存中选择故障转移候选者。</Step>
  <Step title="会话存储仍显示旧主要模型">会话存储仍反映旧的主要模型。</Step>
  <Step title="实时协调读取过时状态">实时会话协调读取过时的会话状态。</Step>
  <Step title="重试被回退">在故障转移尝试开始之前，重试被回退到旧模型。</Step>
</Steps>

持久化的故障转移覆盖关闭了该窗口，而窄回滚则保持较新的手动或运行时会话更改完好无损。

## 可观测性和故障摘要

`runWithModelFallback(...)` 记录每次尝试的详细信息，这些信息用于提供日志和面向用户的冷却消息：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的故障转移原因）
- 可选的状态/代码
- 人类可读的错误摘要

当候选项失败、被跳过或后续回退成功时，结构化 `model_fallback_decision` 日志还会包含扁平的 `fallbackStep*` 字段。这些字段明确显示了尝试的转换（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），因此即使最终的回退也失败了，日志和诊断导出器也能重建主要故障。

当所有候选项都失败时，OpenClaw 会抛出 OpenClaw`FallbackSummaryError`。外部回复运行器可以使用该错误构建更具体的消息，例如“所有模型暂时受到速率限制”，并在已知的情况下包含最近的冷却过期时间。

该冷却摘要是感知模型的：

- 对于尝试的提供商/模型链，将忽略不相关的模型范围速率限制
- 如果剩余的阻塞是匹配的模型范围速率限制，OpenClaw 将报告仍然阻塞该模型的最后一个匹配过期时间

## 相关配置

有关以下内容，请参阅 [Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>)：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和回退概述，请参阅 [模型](/zh/concepts/models)。
