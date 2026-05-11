---
summary: "常见问题：模型默认值、选择、别名、切换、故障转移和身份验证配置文件"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "常见问题：模型和身份验证"
sidebarTitle: "模型常见问题"
---

关于模型和身份验证配置文件的问答。有关设置、会话、网关、通道和
故障排除，请参阅主 [常见问题](/zh/help/faq)。

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'>
    OpenClaw 的默认模型是您设置的任何内容：

    ```
    agents.defaults.model.primary
    ```

    模型被引用为 `provider/model`（例如：`openai/gpt-5.5` 或 `openai-codex/gpt-5.5`）。如果您省略提供商，OpenClaw 首先尝试别名，然后尝试该确切模型 ID 的唯一已配置提供商匹配项，只有在那时才会回退到已配置的默认提供商，作为已弃用的兼容性路径。如果该提供商不再暴露已配置的默认模型，OpenClaw 将回退到第一个已配置的提供商/模型，而不是显示过时的已移除提供商默认值。您仍然应该 **显式** 设置 `provider/model`。

  </Accordion>

  <Accordion title="您推荐使用哪个模型？">
    **推荐默认：** 在您的提供商堆栈中使用可用的最强最新一代模型。
    **对于启用工具或不受信任输入的代理：** 优先考虑模型强度而非成本。
    **对于常规/低风险聊天：** 使用更便宜的备用模型，并按代理角色进行路由。

    MiniMax 有自己的文档：[MiniMax](/zh/providers/minimax) 和
    [Local models](/zh/gateway/local-models)。

    经验法则：对于高风险工作，使用您能负担得起的**最佳模型**；对于常规聊天或摘要，使用较便宜的
    模型。您可以为每个代理路由模型，并使用子代理并行化长任务（每个子代理消耗令牌）。请参阅[模型](/zh/concepts/models) 和
    [Sub-agents](/zh/tools/subagents)。

    严重警告：较弱/过度量化的模型更容易受到提示注入和不安全行为的影响。请参阅[安全](/zh/gateway/security)。

    更多背景信息：[Models](/zh/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情况下切换模型？">
    使用 **模型命令** 或仅编辑 **模型** 字段。避免完全替换配置。

    安全选项：

    - 聊天中的 `/model`（快速，单次会话）
    - `openclaw models set ...`（仅更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

    除非您打算替换整个配置，否则避免使用带有部分对象的 `config.apply`。
    对于 RPC 编辑，请先使用 `config.schema.lookup` 检查，并优先使用 `config.patch`。查找负载为您提供规范化路径、浅层模式文档/约束以及直接子级摘要。
    以进行部分更新。
    如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

    文档：[Models](/zh/concepts/models)、[Configure](/zh/cli/configure)、[Config](/zh/cli/config)、[Doctor](/zh/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型 (llama.cpp, vLLM, Ollama) 吗？">
    是的。Ollama 是本地模型最简单的路径。

    最快设置方法：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull gemma4`
    3. 如果你也想要云模型，请运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意事项：

    - `Cloud + Local` 为你提供云模型以及你的本地 Ollama 模型
    - 诸如 `kimi-k2.5:cloud` 之类的云模型不需要本地拉取
    - 如需手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：较小或重度量化的模型更容易受到提示词注入（prompt injection）的攻击。我们强烈建议任何可以使用工具的机器人使用**大型模型**。如果你仍然想使用小模型，请启用沙箱隔离和严格的工具允许列表。

    文档：[Ollama](/zh/providers/ollama), [本地模型](/zh/gateway/local-models),
    [模型提供商](/zh/concepts/model-providers), [安全性](/zh/gateway/security),
    [沙箱隔离](/zh/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">- 这些部署可能会有所不同，并且可能会随时间变化；没有固定的提供商推荐。 - 使用 `openclaw models status` 检查每个网关上的当前运行时设置。 - 对于对安全敏感/启用工具的代理，请使用可用的最强大的最新一代模型。</Accordion>

  <Accordion title="如何即时切换模型（无需重启）？">
    将 `/model` 命令作为独立消息发送：

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    这些是内置别名。可以通过 `agents.defaults.models` 添加自定义别名。

    你可以使用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（和 `/model list`）显示一个紧凑的编号选择器。通过数字进行选择：

    ```
    /model 3
    ```

    你还可以强制提供商（per 会话）使用特定的身份验证配置文件：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 显示当前激活的代理、正在使用的 `auth-profiles.json` 文件以及下一步将尝试使用的身份验证配置文件。
    它还会显示配置的提供商端点（`baseUrl`）和 API 模式（`api`）（如果可用）。

    **如何取消固定通过 @profile 设置的配置文件？**

n 重新运行 `/model`，**不要**带 `@profile` 后缀：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果你想返回默认值，请从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认哪个身份验证配置文件处于激活状态。

  </Accordion>

  <Accordion title="我能否在日常任务中使用 GPT 5.5，在编码时使用 Codex 5.5？">
    是的。将一个设为默认，并根据需要进行切换：

    - **快速切换（每次会话）：** 针对当前直接使用 OpenAI API 密钥的任务使用 `/model openai/gpt-5.5`，或针对 GPT-5.5 Codex OAuth 任务使用 `/model openai-codex/gpt-5.5`。
    - **默认设置：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.5` 以使用 API 密钥，或设置为 `openai-codex/gpt-5.5` 以使用 GPT-5.5 Codex OAuth。
    - **子代理：** 将编码任务路由到具有不同默认模型的子代理。

    请参阅 [模型](/zh/concepts/models) 和 [斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.5 配置快速模式？">
    使用会话切换开关或配置默认值均可：

    - **每次会话：** 当会话正在使用 `openai/gpt-5.5` 或 `openai-codex/gpt-5.5` 时，发送 `/fast on`。
    - **每个模型默认值：** 将 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 或 `agents.defaults.models["openai-codex/gpt-5.5"].params.fastMode` 设置为 `true`。

    示例：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    对于 OpenAI，快速模式在支持的原生 Responses 请求中映射到 `service_tier = "priority"`。会话 `/fast` 会覆盖 beat 配置默认值。

    请参阅 [Thinking and fast mode](/zh/tools/thinking) 和 [OpenAI fast mode](/zh/providers/openai#fast-mode)。

  </Accordion>

  <Accordion title='为什么我会看到“Model ... is not allowed”然后没有回复？'>
    如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何
    会话覆盖的 **允许列表**。选择一个不在该列表中的模型将返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    该错误会在正常回复**之前**返回。修复方法：将模型添加到
    `agents.defaults.models`，移除允许列表，或从 `/model list` 中选择一个模型。

  </Accordion>

  <Accordion title='为什么我会看到“Unknown 模型: minimax/MiniMax-M2.7”？'>
    这意味着**未配置提供商**（未找到 MiniMax 提供商配置或身份验证配置文件），因此无法解析该模型。

    修复清单：

    1. 升级到当前的 OpenClaw 版本（或从源代码 `main` 运行），然后重启网关。
    2. 确保 MiniMax 已配置（通过向导或 JSON），或者环境变量/身份验证配置文件中存在 MiniMax 身份验证，以便注入匹配的提供商
       （`MINIMAX_API_KEY` 用于 `minimax`、`MINIMAX_OAUTH_TOKEN` 或存储的 MiniMax
       OAuth 用于 `minimax-portal`）。
    3. 为您的身份验证路径使用精确的模型 ID（区分大小写）：
       `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed` 用于 API 密钥
       设置，或 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` 用于 OAuth 设置。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中 `/model list`）。

    参见 [MiniMax](/zh/providers/minimax) 和 [模型](/zh/concepts/models)。

  </Accordion>

  <Accordion title="我可以将 MiniMax 设为默认并将 OpenAI 用于复杂任务吗？">
    可以。将 **MiniMax 设为默认**，并在需要时**按会话**切换模型。
    回退（fallback）是针对**错误**的，而非“困难任务”，因此请使用 `/model` 或单独的代理。

    **选项 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.5": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```

    **选项 B：独立的代理**

    - 代理 A 默认：MiniMax
    - 代理 B 默认：OpenAI
    - 按代理路由或使用 `/agent` 进行切换

    文档：[模型](/zh/concepts/models)、[多代理路由](/zh/concepts/multi-agent)、[MiniMax](/zh/providers/minimax)、[OpenAI](/zh/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的。OpenClaw 附带了一些默认简写（仅当该模型存在于 `agents.defaults.models` 时才适用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.5` 适用于 API 密钥设置，或在配置了 Codex OAuth 时为 `openai-codex/gpt-5.5`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果你设置了同名的别名，你的值将优先。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（别名）？">
    别名来自 `agents.defaults.models.<modelId>.alias`。示例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然后 `/model sonnet` （或在支持时为 `/<alias>`）将解析为该模型 ID。

  </Accordion>

  <Accordion title="如何添加来自 OpenRouter 或 Z.AI 等提供商的模型？">
    OpenRouter（按令牌付费；模型众多）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI（GLM 模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果您引用了提供商/模型，但缺少所需的提供商密钥，您将收到运行时身份验证错误（例如 `No API key found for provider "zai"`）。

    **添加新代理后未找到提供商的 API 密钥**

    这通常意味着**新代理**拥有一个空的身份验证存储。身份验证是特定于代理的，并存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>` 并在向导期间配置身份验证。
    - 或者将 `auth-profiles.json` 从主代理的 `agentDir` 复制到新代理的 `agentDir` 中。

    请**勿**在代理之间重用 `agentDir`；这会导致身份验证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移和“所有模型均失败”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两个阶段进行：

    1. 同一提供商内的**身份验证配置轮换**。
    2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

    冷却期适用于失败的配置（指数退避），因此即使提供商受到速率限制或暂时出现故障，OpenClaw 也能继续响应。

    速率限制桶包含的内容不仅仅是普通的 `429` 响应。OpenClaw
    还将 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted` 以及周期性
    使用窗口限制（`weekly/monthly limit reached`）等消息视为
    值得故障转移的速率限制。

    一些看起来像计费的响应并不是 `402`，一些 HTTP `402`
    响应也保留在该瞬态桶中。如果提供商在 `401` 或 `403` 上返回明确的计费文本，OpenClaw 仍然可以将其保留在
    计费通道中，但特定于提供商的文本匹配器仅限于
    拥有它们的提供商（例如 OpenRouter `Key limit exceeded`）。如果 `402`
    消息看起来像是可重试的使用窗口或
    组织/工作区支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 会将其视为
    `rate_limit`，而不是长期的计费禁用。

    上下文溢出错误则不同：诸如
    `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 之类的签名将保留在压缩/重试路径上，而不是推进模型
    回退。

    通用服务器错误文本有意比“任何包含
    unknown/error 的内容”更窄。OpenClaw 确实会处理提供商范围内的瞬态形式，
    例如 Anthropic 裸 `An unknown error occurred`、OpenRouter 裸
    `Provider returned error`、类似 `Unhandled stop reason:
    error`, JSON `api_error` 的停止原因错误（带有瞬态服务器文本
    （`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`), and provider-busy errors such as `ModelNotReadyException`），当提供商上下文
    匹配时，作为值得故障转移的超时/过载信号。
    类似 `LLM request failed with an unknown
    error.` 的通用内部回退文本保持保守，本身不会触发模型回退。

  </Accordion>

  <Accordion title='“找不到配置文件 anthropic:default 的凭据”是什么意思？'>
    这意味着系统尝试使用身份验证配置文件 ID `anthropic:default`，但无法在预期的身份验证存储中找到其凭据。

    **修复清单：**

    - **确认身份验证配置文件的位置**（新路径与旧路径）
      - 当前路径：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认您的环境变量已被 Gateway(网关) 加载**
      - 如果您在 shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway(网关)，它可能无法继承该变量。请将其放入 `~/.openclaw/.env` 或启用 `env.shellEnv`。
    - **确保您正在编辑正确的 agent**
      - 多 agent 设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **健全性检查模型/身份验证状态**
      - 使用 `openclaw models status` 查看已配置的模型以及提供商是否已通过身份验证。

    **针对“找不到配置文件 anthropic 的凭据”的修复清单**

    这意味着运行被固定到了 Anthropic 身份验证配置文件，但 Gateway(网关) 无法在其身份验证存储中找到它。

    - **使用 Claude CLI**
      - 在网关主机上运行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您想改用 API 密钥**
      - 将 `ANTHROPIC_API_KEY` 放在 **网关主机** 上的 `~/.openclaw/.env` 中。
      - 清除任何强制使用缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认您在网关主机上运行命令**
      - 在远程模式下，身份验证配置文件位于网关机器上，而不是您的笔记本电脑上。

  </Accordion>

  <Accordion title="Why did it also try Google Gemini and fail?">
    如果您的模型配置包含 Google Gemini 作为回退（或者您切换到了 Gemini 简写），OpenClaw 会在模型回退期间尝试使用它。如果您尚未配置 Google 凭据，您将看到 `No API key found for provider "google"`。

    修复方法：提供 Google 身份验证，或者在 `agents.defaults.model.fallbacks` / 别名中移除/避免使用 Google 模型，以免回退路由到那里。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：会话历史包含 **没有签名的思考模块**（通常来自中止/部分流）。Google Antigravity 需要思考模块具有签名。

    修复方法：OpenClaw 现在会为 Google Antigravity Claude 剥离未签名的思考模块。如果仍然出现，请开始一个 **新会话** 或为该代理设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles: what they are and how to manage them

相关：[/concepts/oauth](/zh/concepts/oauth)（OAuth 流程、令牌存储、多账户模式）

<AccordionGroup>
  <Accordion title="What is an auth profile?">
    身份验证配置文件是与提供商关联的命名凭据记录（OAuth 或 API 密钥）。配置文件位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="What are typical profile IDs?">
    OpenClaw 使用带提供商前缀的 ID，例如：

    - `anthropic:default`（在不存在电子邮件身份时很常见）
    - `anthropic:<email>` 用于 OAuth 身份
    - 您选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制首先尝试哪个认证配置文件吗？">
    可以。配置支持配置文件的可选元数据和每个提供商（`auth.order.<provider>`）的顺序。这**不**存储密钥；它将 ID 映射到提供商/模式并设置轮换顺序。

    如果配置文件处于短期的 **cooldown**（速率限制/超时/身份验证失败）或较长时间的 **disabled** 状态（计费/额度不足），OpenClaw 可能会暂时跳过该配置文件。要检查这一点，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调整：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷却时间可以是特定于模型的。对于一个模型正在冷却的配置文件，对于同一提供商上的同级模型可能仍然可用，而计费/禁用窗口仍然会阻止整个配置文件。

    您还可以通过 CLI 设置 **per-agent**（每个代理）顺序覆盖（存储在该代理的 `auth-state.json` 中）：

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    要定位特定的代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    要验证实际将尝试的内容，请使用：

    ```bash
    openclaw models status --probe
    ```

    如果从显式顺序中省略了存储的配置文件，探针将报告 `excluded_by_auth_order` 而不是静默尝试该配置文件。

  </Accordion>

  <Accordion title="OAuth 与 API 密钥有什么区别？">
    OpenClaw 支持两者：

    - **OAuth** 通常利用订阅访问（如适用）。
    - **API 密钥** 使用按 token 付费的计费。

    向导明确支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 密钥。

  </Accordion>
</AccordionGroup>

## 相关

- [常见问题](/zh/help/faq) — 主常见问题解答
- [常见问题 — 快速入门和首次运行设置](/zh/help/faq-first-run)
- [模型选择](/zh/concepts/model-providers)
- [模型故障转移](/zh/concepts/model-failover)
