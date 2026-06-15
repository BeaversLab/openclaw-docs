---
summary: "OpenClawOpenClaw 如何轮换身份验证配置文件并在模型间故障转移"
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
  <Step title="构建候选链">根据当前模型选择和该选择源的故障转移策略构建模型候选链。配置的默认值、定时任务主节点和自动选择的故障转移模型可以使用配置的故障转移；显式的用户会话选择是严格的。</Step>
  <Step title="尝试当前提供商">使用身份验证配置文件轮换/冷却规则尝试当前提供商。</Step>
  <Step title="在可故障转移错误时推进">如果该提供商因可故障转移错误而耗尽，则移动到下一个模型候选者。</Step>
  <Step title="持久化故障转移覆盖">在重试开始之前持久化所选的故障转移覆盖，以便其他会话读取者看到运行程序即将使用的同一提供商/模型。持久化的模型覆盖被标记为 `modelOverrideSource: "auto"`。</Step>
  <Step title="失败时精确回滚">如果故障转移候选者失败，则仅当故障转移拥有的会话覆盖字段仍与该失败的候选者匹配时，才回滚这些字段。</Step>
  <Step title="如果耗尽则抛出 FallbackSummaryError">如果每个候选者都失败，则抛出 `FallbackSummaryError`，其中包含每次尝试的详细信息以及已知的最快冷却过期时间。</Step>
</Steps>

这故意做得比“保存和恢复整个会话”更窄。回复运行程序仅持久化其为回退拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这可以防止失败的回退重试覆盖较新的不相关会话变更，例如在尝试运行期间发生的手动 `/model` 更改或会话轮换更新。

## 选择源策略

OpenClaw 将所选的提供商/模型与选择它的原因分离开来。该来源控制是否允许故障转移链：

- **配置默认值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主模型**：`agents.list[].model` 是严格的，除非该 agent 模型对象包含其自己的 `fallbacks`。使用 `fallbacks: []` 可明确显示严格行为，或提供非空列表以使该 agent 选择加入模型回退。
- **自动回退覆盖**：运行时回退会在重试前写入 `providerOverride`、`modelOverride`、`modelOverrideSource: "auto"` 和选定的原始模型。该自动覆盖可以继续沿着配置的回退链前进，而无需在每条消息时探测主模型，但当恢复时，OpenClaw 会定期再次探测配置的原始模型并清除自动覆盖。`/new`、`/reset` 和 `sessions.reset` 也会清除自动源覆盖。当心跳运行且没有显式的 `heartbeat.model` 清除时，如果其来源不再匹配当前配置的默认值，则会清除直接自动覆盖。
- **用户会话覆盖**：`/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 会写入 `modelOverrideSource: "user"`。这是一个精确的会话选择。如果选定的提供商/模型在生成回复之前失败，OpenClaw 将报告失败，而不是从不相关的配置回退中回答。
- **旧版会话覆盖**：较旧的会话条目可能具有 `modelOverride` 而没有 `modelOverrideSource`。OpenClaw 会将这些视为用户覆盖，因此明确的旧选择不会被静默转换为回退行为。
- **Cron payload 模型**（Cron 负载模型）：一个 cron job `payload.model` / `--model` 是 job primary（作业主选），而非用户 会话（会话）覆盖。它使用配置的 fallbacks（回退选项），除非该 job 提供了 `payload.fallbacks`；`payload.fallbacks: []` 会使 cron 运行变为严格模式。

自动回退的主探测间隔为五分钟且不可配置。OpenClaw 会记住每个会话和主模型的最近探测，因此不会在每一轮都重试失败的主模型。当会话切换到回退时，OpenClaw 会发送一条可见通知，当它返回到选定的主模型时发送另一条通知；它不会在每一次粘性回退轮次中重复该通知。

## Auth failure skip cache（认证失败跳过缓存）

默认情况下，每个新的 turn（轮次）都会保持现有的 fallback retry（回退重试）行为：OpenClaw 将再次尝试每个配置的 fallback candidate（回退候选项），包括最近因 `auth` 或 `auth_permanent` 而失败的非主选候选项。

倾向于抑制这些重复认证失败的操作员可以选择启用：

```bash
OPENCLAW_FALLBACK_SKIP_TTL_MS=60000
```

启用后，在发生认证类故障后，OpenClaw 会在内存中记录一个 会话-scoped（会话范围）的 skip marker（跳过标记），用于标记非主选的 fallback candidate（回退候选项）。该标记以 会话 id（会话 ID）、提供商（提供商）和 模型（模型）作为键。主选候选项永远不会被跳过，因此明确的用户模型选择仍然会显示真实的认证错误。该缓存是 process-local（进程本地）的，并在 Gateway(网关) 重启时清除。

该值为 TTL（生存时间），以毫秒为单位。`0` 或未设置的值将禁用缓存。正值会被限制在 1 秒到 10 分钟之间。

## User-visible fallback notices（用户可见的回退通知）

当 会话（会话）切换到自动选择的 fallback（回退选项）时，OpenClaw 会在相同的回复界面发送状态通知：

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

当后续探测成功且 会话（会话）返回到选定的 primary（主选项）时，OpenClaw 会发送：

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

这些通知是操作消息，而非助手内容。它们在每次状态变更时发送一次，包括在可行时发送仅含副作用的 turns（轮次），但在 sticky fallback（粘性回退）轮次中不会重复发送。发送过程会绕过正常的源回复抑制，该通知不会占用线程化频道的第一个助手回复位置，并且会被排除在文本转语音和承诺提取之外。

## Auth storage (keys + OAuth)

OpenClaw 对 API 密钥和 OAuth 令牌均使用 **auth profiles**（认证配置文件）。

- Secrets（密钥）存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- Runtime auth-routing state（运行时认证路由状态）存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` 是 **仅元数据 + 路由**（无密钥）。
- 传统的仅导入 OAuth 文件：OAuth`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json` 中）。

更多详情：[OAuth](OAuth/en/concepts/oauth)

凭证类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（对于某些提供商 + `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个帐户可以共存。

- 默认值：当没有可用的电子邮件时为 `provider:default`。
- 带电子邮件的 OAuth：OAuth`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件位于 `profiles` 下的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

## 轮换顺序

当提供商拥有多个配置文件时，OpenClaw 会按如下顺序选择：

<Steps>
  <Step title="Explicit config">`auth.order[provider]`（如果已设置）。</Step>
  <Step title="Configured profiles">按提供商筛选的 `auth.profiles`。</Step>
  <Step title="Stored profiles">该提供商在 `auth-profiles.json` 中的条目。</Step>
</Steps>

如果未配置显式顺序，OpenClaw 使用轮询（round-robin）顺序：

- **主键：** 配置文件类型（**OAuth 优先于 API 密钥**）。
- **次键：** `usageStats.lastUsed`（每种类型中最旧的优先）。
- **冷却/已禁用的配置文件** 被移至末尾，按最近到期时间排序。

### 会话粘性（缓存友好）

OpenClaw **在每个会话中固定所选的身份验证配置文件** 以保持提供商缓存温热。它 **不会** 在每次请求时进行轮换。固定的配置文件会被重复使用，直到：

- 会话被重置（`/new` / `/reset`）
- 完成一次压缩（压缩计数递增）
- 该配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行的手动选择会为该会话设置一个**用户覆盖**，并且在新会话开始之前不会自动轮换。

<Note>自动固定的配置文件（由会话路由器选择）被视为一种**偏好**：它们会被优先尝试，但在达到速率限制/超时时，OpenClaw 可能会轮换到另一个配置文件。当原始配置文件再次可用时，新的运行可以再次优先选择它，而无需更改选定的模型或运行时。用户固定的配置文件则锁定在该配置文件上；如果它失败并且配置了模型回退，OpenClaw 将移动到下一个模型，而不是切换配置文件。</Note>

### OpenAI Codex 订阅加上 API 密钥备份

对于 OpenAI 代理模型，身份验证和运行时是分开的。`openai/gpt-*` 保留在
Codex 线程上，而身份验证可以在 Codex 订阅配置文件和
OpenAI API 密钥备份之间轮换。

使用 `auth.order.openai` 设置面向用户的顺序：

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

使用 `openai:*` 同时用于 ChatGPT/Codex OAuth 配置文件和 OpenAI API 密钥
配置文件。当订阅达到 Codex 使用限制时，
OpenClaw 会在 Codex 提供时记录确切的重置时间，尝试下一个
有序的身份验证配置文件，并将运行保持在 Codex 线程内。一旦重置
时间过去，订阅配置文件便再次符合资格，下一次自动
选择可以返回到它。

仅当您想强制该会话使用一个账户/密钥时，才使用用户固定的配置文件。用户固定的配置文件是严格的，并且不会静默跳转
到另一个配置文件。

## 冷却

当配置文件由于身份验证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为冷却状态并移动到下一个配置文件。

<AccordionGroup>
  <Accordion title="归入速率限制/超时桶的内容">
    该速率限制桶比普通的 `429` 更广泛：它还包括提供商消息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，例如 `weekly/monthly limit reached`。

    格式/无效请求错误通常是致命的，因为重试相同的负载会以相同的方式失败，因此 OpenClaw 会直接显示这些错误，而不是轮换身份验证配置文件。已知的重试修复路径可以显式选择加入：例如，Cloud Code Assist 工具调用 ID 验证失败会被清理，并通过 `allowFormatRetry` 策略重试一次。与 OpenAI 兼容的停止原因错误（例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`）被归类为超时/故障转移信号。

    当源匹配已知的瞬态模式时，通用服务器文本也可能归入该超时桶。例如，裸模型运行时流包装器消息 `An unknown error occurred` 对每个提供商都被视为值得故障转移，因为共享模型运行时在提供商流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结束且没有具体详细信息时会发出此消息。包含瞬态服务器文本（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 负载也被视为值得故障转移的超时。

    OpenRouter 特有的通用上游文本（例如裸 `Provider returned error`）仅当提供商上下文确实是 OpenRouter 时才被视为超时。通用内部回退文本（例如 `LLM request failed with an unknown error.`）保持保守，本身不会触发故障转移。

  </Accordion>
  <Accordion title="SDK retry-after caps">
    某些提供商 SDK 可能会在将控制权返回给 OpenClaw 之前休眠一个很长的 `Retry-After` 窗口。对于基于 Stainless 的 SDK（如 Anthropic 和 OpenAI），OpenClaw 默认将 SDK 内部的 `retry-after-ms` / `retry-after` 等待时间上限设为 60 秒，并立即显示更长的可重试响应，以便运行此故障转移路径。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用此上限；请参阅 [Retry behavior](/zh/concepts/retry)。
  </Accordion>
  <Accordion title="Model-scoped cooldowns">
    速率限制冷却期也可以是特定于模型的：

    - 当已知失败的模型 ID 时，OpenClaw 会记录速率限制失败的 `cooldownModel`。
    - 当冷却期作用于不同的模型时，同一提供商上的同级模型仍然可以尝试。
    - 计费/禁用窗口仍然会跨模型阻止整个配置文件。

  </Accordion>
</AccordionGroup>

冷却期使用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-state.json` 下的 `usageStats` 中：

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

计费/信用失败（例如“积分不足”/“信用余额过低”）被视为值得故障转移，但它们通常不是暂时性的。OpenClaw 不会进行短暂的冷却，而是将配置文件标记为**已禁用**（并具有更长的退避时间），然后轮换到下一个配置文件/提供商。

<Note>
并非每个与计费相关的响应都是 `402`，也不是每个 HTTP `402`OpenClaw 都会落在这里。即使提供商返回 `401` 或 `403`OpenRouter，OpenClaw 仍会将明确的计费文本保留在计费通道中，但特定于提供商的匹配器仍仅作用于拥有它们的提供商（例如 OpenRouter `403 Key limit exceeded`）。

同时，临时的 `402` 使用窗口和组织/工作区支出限制错误在消息看起来可重试时（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`）被归类为 `rate_limit`。这些错误保持在短期冷却/故障转移路径上，而不是长期的计费禁用路径上。

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

- 计费退避从 **5 小时** 开始，每次计费失败翻倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时** 内未出现故障（可配置），退避计数器将重置。
- 过载重试在模型故障转移之前允许 **1 次同一提供商内的配置文件轮换**。
- 过载重试默认使用 **0 ms 退避**。

## 模型故障转移

如果提供商的所有配置文件均失败，OpenClaw 将移动到 OpenClaw`agents.defaults.model.fallbacks` 中的下一个模型。这适用于身份验证失败、速率限制和已耗尽配置文件轮换的超时（其他错误不会推进故障转移）。未暴露足够详细信息的提供商错误在故障转移状态下仍会被精确标记：`empty_response` 表示提供商未返回可用的消息或状态，`no_error_details` 表示提供商明确返回了 `Unknown error (no error details in response)`，而 `unclassified`OpenClaw 表示 OpenClaw 保留了原始预览但尚未有分类器匹配它。

超载和速率限制错误比计费冷却更积极地处理。默认情况下，OpenClaw 允许一次同一提供商的身份配置文件重试，然后无需等待即可切换到下一个配置的模型回退。提供商忙信号（例如 `ModelNotReadyException`）归类到超载桶中。可以使用 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 对此进行调整。

当运行从配置的默认主要、定时任务主要、具有显式回退的代理主要或自动选择的回退覆盖开始时，OpenClaw 可以遍历匹配的配置回退链。没有显式回退的代理主要和显式用户选择（例如 `/model ollama/qwen3.5:27b`、模型选择器 `sessions.patch` 或一次性 CLI 提供商/模型覆盖）是严格的：如果该提供商/模型无法访问或在生成回复之前失败，OpenClaw 将报告失败，而不是从不相关的回退进行回答。

### 候选链规则

OpenClaw 根据当前请求的 `provider/model` 以及配置的回退构建候选列表。

<AccordionGroup>
  <Accordion title="规则"OpenClaw>
    - 请求的模型始终排在第一位。
    - 显式配置的回退项会被去重，但不会受模型允许列表（allowlist）的过滤。它们被视为操作员的显式意图。
    - 如果当前运行已经在同一提供商系列下的某个配置回退项上，OpenClaw 将继续使用完整的配置链。
    - 当未提供显式回退覆盖时，即使请求的模型使用不同的提供商，也会在配置的主选项之前尝试配置的回退项。
    - 当未向回退运行器提供显式回退覆盖时，配置的主选项会被追加到末尾，以便在早期候选项耗尽后，链路能回落到正常的默认值。
    - 当调用方提供 `fallbacksOverride` 时，运行器将严格使用请求的模型加上该覆盖列表。空列表将禁用模型回退，并防止将配置的主选项追加为隐藏的重试目标。

  </Accordion>
</AccordionGroup>

### 哪些错误会触发回退

<Tabs>
  <Tab title="继续执行的情况">
    - 认证失败
    - 达到速率限制且冷却耗尽
    - 过载/提供商繁忙错误
    - 超时型（timeout-shaped）故障转移错误
    - 计费禁用
    - `LiveSessionModelSwitchError`，它会被标准化为故障转移路径，以便过时的持久化模型不会导致外层重试循环
    - 当仍有剩余候选项时的其他未识别错误

  </Tab>
  <Tab title="不继续执行的情况">
    - 非超时/故障转移型的显式中止
    - 应保留在压缩/重试逻辑内的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 当没有剩余候选项时的最终未知错误

  </Tab>
</Tabs>

### 冷却跳过与探测行为

当提供商的所有认证配置文件都处于冷却状态时，OpenClaw 不会永远自动跳过该提供商。它会针对每个候选项做出决定：

<AccordionGroup>
  <Accordion title="Per-candidate decisions">
    - 持续的身份验证失败会立即跳过整个提供商。
    - 计费禁用通常会跳过，但可以在节流时探查主要候选，以便在不重启的情况下恢复。
    - 可以在冷却期即将结束时探查主要候选，并针对每个提供商进行节流。
    - 当故障看起来是暂时的（`rate_limit`、`overloaded` 或未知）时，即使处于冷却期，也可以尝试同一提供商内的回退同级模型。当速率限制针对特定模型且同级模型可能立即恢复时，这一点尤为重要。
    - 每次回退运行中，每个提供商的临时冷却探查限制为一次，以免单个提供商延迟跨提供商回退。

  </Accordion>
</AccordionGroup>

## 会话覆盖和实时模型切换

会话模型更改属于共享状态。活跃的运行器、`/model` 命令、压缩/会话更新以及实时会话协调都会读取或写入同一会话条目的部分内容。

这意味着回退重试必须与实时模型切换相协调：

- 只有显式的用户驱动的模型更改才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改（如回退轮换、心跳覆盖或压缩）绝不会自行标记待处理的实时切换。
- 用户驱动的模型覆盖被视为回退策略的精确选择，因此无法访问的所选提供商会显示为故障，而不是被 `agents.defaults.model.fallbacks` 掩盖。
- 在回退重试开始之前，回复运行器会将选定的回退覆盖字段持久保存到会话条目中。
- 自动回退覆盖在后续轮次中保持选中状态，因此 OpenClaw 不会在每条消息上探查已知的主要故障。OpenClaw 会定期重新探查配置的源，并在其恢复时清除自动覆盖；OpenClawOpenClaw`/new`、`/reset` 和 `sessions.reset` 会立即清除自动来源的覆盖。
- 用户回复会在每次状态变更时宣布故障转移转换和故障转移清除的恢复。粘性故障转移轮次不会重复该通知。
- `/status` 显示所选模型，并且当故障转移状态不同时，显示活动故障转移模型及其原因。
- 实时会话协调优先于过时的运行时模型字段，选择已持久化的会话覆盖。
- 如果实时切换错误指向活动故障转移链中的后继候选者，OpenClaw 会直接跳转到该选定模型，而不是先遍历无关的候选者。
- 如果故障转移尝试失败，运行器仅回滚其写入的覆盖字段，且仅当这些字段仍匹配该失败的候选者时。

这防止了典型的竞态问题：

<Steps>
  <Step title="主模型失败">选定的主模型失败。</Step>
  <Step title="内存中选择故障转移">在内存中选择故障转移候选者。</Step>
  <Step title="会话存储仍显示旧主模型">会话存储仍反映旧的主模型。</Step>
  <Step title="实时协调读取过时状态">实时会话协调读取过时的会话状态。</Step>
  <Step title="重试被回退">在故障转移尝试开始之前，重试被强制回退到旧模型。</Step>
</Steps>

持久化的故障转移覆盖关闭了这一窗口，而窄回滚则保持较新的手动或运行时会话更改完整。

## 可观测性和故障摘要

`runWithModelFallback(...)` 记录每次尝试的详细信息，这些信息将用于日志和面向用户的冷却消息：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 及类似的故障转移原因）
- 可选状态/代码
- 人类可读的错误摘要

结构化 `model_fallback_decision` 日志在候选项失败、被跳过或后续回退成功时，还包含扁平 `fallbackStep*` 字段。这些字段明确显示了尝试的转换（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），以便日志和诊断导出器即使在最终回退也失败的情况下，也能重建主要故障原因。

当所有候选项都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外部回复运行器可以使用该错误来构建更具体的消息，例如“所有模型暂时受到速率限制”，并在已知的情况下包含最近的冷却过期时间。

该冷却摘要具有模型感知能力：

- 不相关的模型范围速率限制会被忽略，针对尝试的提供商/模型链
- 如果剩余的阻塞项是匹配的模型范围速率限制，OpenClaw 会报告仍然阻塞该模型的最后一个匹配的过期时间

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
