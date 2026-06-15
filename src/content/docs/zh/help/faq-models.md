---
summary: "常见问题：模型默认值、选择、别名、切换、故障转移和身份验证配置文件"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "常见问题：模型和身份验证"
sidebarTitle: "模型常见问题"
---

模型和认证资料配置问答。有关设置、会话、网关、通道和
故障排除，请参阅主 [常见问题](/zh/help/faq)。

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'OpenClaw>
    OpenClaw 的默认模型是您设置为以下内容的任何内容：

    ```
    agents.defaults.model.primary
    ```

    模型被引用为 `provider/model`（例如：`openai/gpt-5.5` 或 `anthropic/claude-sonnet-4-6`OpenClawOpenClaw）。如果您省略提供商，OpenClaw 首先尝试别名，然后是该确切模型 ID 的唯一已配置提供商匹配，只有在那时才回退到已配置的默认提供商，作为一种已弃用的兼容性路径。如果该提供商不再公开已配置的默认模型，OpenClaw 将回退到第一个已配置的提供商/模型，而不是显示陈旧的已移除提供商默认值。您仍然应该**显式**设置 `provider/model`。

  </Accordion>

  <Accordion title="您推荐使用哪个模型？">
    **推荐的默认设置：** 使用您提供商堆栈中可用的最强最新一代模型。
    **对于启用工具或不受信任输入的代理：** 优先考虑模型强度而非成本。
    **对于日常/低风险聊天：** 使用更便宜的备用模型，并根据代理角色进行路由。

    MiniMax 有自己的文档：[MiniMax](/zh/providers/minimax) 和
    [本地模型](/zh/gateway/local-models)。

    经验法则：对于高风险工作，使用您能负担的**最佳模型**，而对于日常聊天或摘要，则使用更便宜的模型。您可以根据代理路由模型，并使用子代理来并行化长任务（每个子代理都会消耗 Token）。请参阅 [模型](/zh/concepts/models) 和
    [子代理](/zh/tools/subagents)。

    严重警告：较弱/过度量化的模型更容易受到提示词注入和不安全行为的影响。请参阅 [安全性](/zh/gateway/security)。

    更多背景信息：[模型](/zh/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情况下切换模型？">
    使用 **模型命令** 或仅编辑 **模型** 字段。避免完全替换配置。

    安全选项：

    - 聊天中的 `/model`（快速，针对当前会话）
    - `openclaw models set ...`（仅更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

    除非您打算替换整个配置，否则避免使用部分对象执行 `config.apply`。
    对于 RPC 编辑，请先使用 `config.schema.lookup` 检查，并首选 `config.patch`。查找负载为您提供规范化路径、浅层模式文档/约束以及直接子项摘要。
    用于部分更新。
    如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

    文档：[模型](/zh/concepts/models)、[配置](/zh/cli/configure)、[Config](/zh/cli/config)、[Doctor](/zh/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。对于本地模型而言，Ollama 是最简单的路径。

    最快设置方式：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull gemma4`
    3. 如果您同时也想要云端模型，请运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    说明：

    - `Cloud + Local` 为您提供云端模型以及您的本地 Ollama 模型
    - 诸如 `kimi-k2.5:cloud` 之类的云端模型不需要本地拉取
    - 如需手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：较小或重度量化的模型更容易受到提示词注入的影响。对于任何可以使用工具的机器人，我们强烈建议使用**大型模型**。如果您仍然想使用小型模型，请启用沙箱隔离和严格的工具允许列表。

    文档：[Ollama](/zh/providers/ollama)、[本地模型](/zh/gateway/local-models)、
    [模型提供商](/zh/concepts/model-providers)、[安全性](/zh/gateway/security)、
    [沙箱隔离](/zh/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">
    - 这些部署可能有所不同，并且可能会随时间变化；没有固定的提供商推荐。
    - 在每个网关上使用 `openclaw models status` 检查当前的运行时设置。
    - 对于安全敏感型/启用工具的代理，请使用可用的最强最新一代模型。

  </Accordion>

  <Accordion title="如何即时切换模型（无需重启）？">
    将 `/model` 命令作为独立消息使用：

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

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（以及 `/model list`）显示一个紧凑的带编号选择器。通过数字选择：

    ```
    /model 3
    ```

    您还可以强制提供商使用特定的身份验证配置文件（每个会话）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 显示当前激活的代理、正在使用的哪个 `auth-profiles.json` 文件，以及下次将尝试哪个身份验证配置文件。
    如果可用，它还会显示配置的提供商端点（`baseUrl`）和 API 模式（`api`）。

    **如何取消固定我用 @profile 设置的配置文件？**

n 重新运行 `/model`，但**不带** `@profile` 后缀：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想返回默认值，请从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认哪个身份验证配置文件处于激活状态。

  </Accordion>

  <Accordion title="如果两个提供商提供相同的模型 ID，/模型 使用哪一个？">
    `/model provider/model` 会为该会话选择确切的提供商路由。

    例如，`qianfan/deepseek-v4-flash` 和 `deepseek/deepseek-v4-flash` 是不同的模型引用，即使两者都包含 `deepseek-v4-flash`OpenClaw。仅仅因为裸模型 ID 匹配，OpenClaw 不应在没有提示的情况下从一个提供商切换到另一个提供商。

    用户选择的 `/model` 引用对于回退策略也是严格的。如果所选的提供商/模型不可用，回复将显式失败，而不是从 `agents.defaults.model.fallbacks`OpenClaw 进行回答。配置的回退链仍然适用于配置的默认值、定时任务主要模型和自动选择的回退状态。

    如果允许从非会话覆盖开始的运行使用回退，OpenClaw 会先尝试请求的提供商/模型，然后是配置的回退项，最后才是配置的主要模型。这可以防止重复的裸模型 ID 直接跳回默认提供商。

    请参阅 [模型](/zh/concepts/models) 和 [模型故障转移](/zh/concepts/model-failover)。

  </Accordion>

  <Accordion title="我可以将 GPT 5.5 用于日常任务，将 Codex 5.5 用于编码吗？">
    可以。请将模型选择和运行时选择分开处理：

    - **原生 Codex 编码代理：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.5`。当您需要 ChatGPT/Codex 订阅身份验证时，请使用 `openclaw models auth login --provider openai` 登录。
    - **代理循环之外的直接 OpenAI API 任务：** 为图像、嵌入、语音、实时以及其他非代理 OpenAI API 表面配置 `OPENAI_API_KEY`。
    - **OpenAI 代理 API 密钥身份验证：** 使用带有有序 `openai` API 密钥配置文件的 `/model openai/gpt-5.5`。
    - **子代理：** 将编码任务路由到专注于 Codex 且拥有自己的 `openai/gpt-5.5` 模型的代理。

    参见[模型](/zh/concepts/models)和[斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.5 配置快速模式？">
    使用会话切换开关或配置默认值：

    - **每次会话：** 在会话使用 `openai/gpt-5.5` 时发送 `/fast on`。
    - **每个模型的默认值：** 将 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 设置为 `true`。

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

    对于 OpenAI，快速模式在支持的原生 Responses 请求上映射到 `service_tier = "priority"`。会话 `/fast` 会覆盖配置默认值。

    参见[思考和快速模式](/zh/tools/thinking)和[OpenAI 快速模式](/zh/providers/openai#fast-mode)。

  </Accordion>

  <Accordion title='为什么我会看到“Model ... is not allowed”然后没有回复？'>
    如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何
    会话覆盖的 **允许列表**。选择一个不在该列表中的模型会返回：

    ```
    Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
    Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
    ```

    该错误会在正常回复 **之前** 返回。修复方法：将确切的模型添加到
    `agents.defaults.models`，添加提供商通配符（如 `"provider/*": {}`）以用于动态提供商目录，移除允许列表，或从 `/model list` 中选择一个模型。
    如果命令还包含 `--runtime codex`，请先更新允许列表，然后重试
    相同的 `/model provider/model --runtime codex` 命令。

  </Accordion>

  <Accordion title='为什么我看到“Unknown 模型: minimax/MiniMax-M3”？'>
    这意味着**提供商未配置**（未找到 MiniMax 提供商配置或身份验证配置文件），因此无法解析该模型。

    修复检查清单：

    1. 升级到当前的 OpenClaw 版本（或从源代码运行 `main`），然后重启网关。
    2. 确保 MiniMax 已配置（通过向导或 JSON），或者 env/auth 配置文件中存在 MiniMax 身份验证，以便注入匹配的提供商
       （`MINIMAX_API_KEY` 用于 `minimax`，`MINIMAX_OAUTH_TOKEN` 或存储的 MiniMax
       OAuth 用于 `minimax-portal`）。
    3. 为您的身份验证路径使用精确的模型 ID（区分大小写）：
       `minimax/MiniMax-M3`、`minimax/MiniMax-M2.7` 或
       `minimax/MiniMax-M2.7-highspeed` 用于 API 密钥设置，或
       `minimax-portal/MiniMax-M3`、`minimax-portal/MiniMax-M2.7` 或
       `minimax-portal/MiniMax-M2.7-highspeed` 用于 OAuth 设置。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中 `/model list`）。

    参见 [MiniMax](/zh/providers/minimax) 和 [Models](/zh/concepts/models)。

  </Accordion>

  <Accordion title="MiniMaxOpenAI我可以将 MiniMax 设为默认，并在处理复杂任务时使用 OpenAI 吗？"MiniMax>
    可以。使用 **MiniMax 作为默认模型**，并在需要时**按会话**切换模型。
    回退机制适用于**错误**情况，而非“艰巨任务”，因此请使用 `/model` 或单独的代理。

    **选项 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "minimax" },
            "openai/gpt-5.5": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```MiniMaxOpenAI

    **选项 B：独立的代理**

    - 代理 A 默认：MiniMax
    - 代理 B 默认：OpenAI
    - 通过代理路由，或使用 `/agent` 进行切换

    文档：[模型](/en/concepts/models)，[多代理路由](/en/concepts/multi-agentMiniMax)，[MiniMax](/en/providers/minimaxOpenAI)，[OpenAI](/en/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？"OpenClaw>
    是的。OpenClaw 附带了一些默认简写（仅当 `agents.defaults.models` 中存在该模型时才适用）：

    - `opus` → `anthropic/claude-opus-4-8`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite`

    如果您设置了同名的自定义别名，您的设置将优先。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（别名）？">
    别名来自 `agents.defaults.models.<modelId>.alias`。例如：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
          },
        },
      },
    }
    ```

    然后 `/model sonnet`（或者在支持时使用 `/<alias>`）将解析为该模型 ID。

  </Accordion>

  <Accordion title="如何添加来自其他提供商（如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter（按 token 计费；包含多种模型）：

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

    如果您引用了某个提供商/模型，但缺少所需的提供商密钥，您将收到运行时身份验证错误（例如 `No API key found for provider "zai"`）。

    **添加新代理后未找到提供商的 API 密钥**

    这通常意味着**新代理**的身份验证存储为空。身份验证是按代理进行的，并存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>` 并在向导期间配置身份验证。
    - 或者仅将可移植的静态 `api_key` / `token` 配置文件从主代理的身份验证存储复制到新代理的身份验证存储中。
    - 对于 OAuth 配置文件，当新代理需要自己的账户时，请使用该代理登录；否则 OpenClaw 可以直接读取默认/主代理的配置，而无需克隆刷新令牌。

    请**不要**在代理之间重复使用 `agentDir`；这会导致身份验证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移和“所有模型均失败”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两个阶段进行：

    1. 同一提供商内的**身份配置轮换**。
    2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

    冷却期适用于失败的配置（指数退避），因此即使提供商受到速率限制或暂时出现故障，OpenClaw 也能继续响应。

    速率限制存储桶不仅仅包含简单的 `429` 响应。OpenClaw 还将 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted` 以及周期性的
    使用窗口限制（`weekly/monthly limit reached`）视为触发故障转移的
    速率限制。

    一些看起来像计费的响应并不是 `402`，一些 HTTP `402`
    响应也保留在该临时存储桶中。如果提供商在 `401` 或 `403` 上返回明确的计费文本，OpenClaw 仍可以将其保留在
    计费通道中，但提供商特定的文本匹配器仍然仅限于
    拥有它们的提供商（例如 OpenRouter `Key limit exceeded`）。如果 `402`
    消息看起来像可重试的使用窗口或
    组织/工作区支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 会将其视为
    `rate_limit`，而不是长期的计费禁用。

    上下文溢出错误有所不同：例如
    `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 等签名会保持在压缩/重试路径上，而不是推进模型
    回退。

    通用服务器错误文本故意比“任何包含
    unknown/error 的内容”更狭窄。OpenClaw 确实会处理提供商范围内的临时情况，
    例如 Anthropic 的纯 `An unknown error occurred`，OpenRouter 的纯
    `Provider returned error`，以及像 `Unhandled stop reason:
    error`, JSON `api_error` 这样带有临时服务器文本的
    stop-reason 错误（`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`), and provider-busy errors such as `ModelNotReadyException`），当提供商上下文
    匹配时，它们被视为触发故障转移的超时/过载信号。
    通用的内部回退文本，如 `LLM request failed with an unknown
    error.`，保持保守，不会自行触发模型回退。

  </Accordion>

  <Accordion title='“No credentials found for profile anthropic:default”是什么意思？'>
    这意味着系统尝试使用身份验证配置文件 ID `anthropic:default`，但在预期的身份验证存储中找不到其凭据。

    **修复清单：**

    - **确认身份验证配置文件的位置**（新路径与旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor`Gateway(网关) 迁移）
    - **确认你的环境变量已加载到 Gateway(网关) 中**
      - 如果你在 shell 中设置了 `ANTHROPIC_API_KEY`Gateway(网关)，但通过 systemd/launchd 运行 Gateway(网关)，它可能无法继承该变量。将其放入 `~/.openclaw/.env` 或启用 `env.shellEnv`。
    - **确保你正在编辑正确的 agent**
      - 多 agent 设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **健全性检查 模型/身份验证 状态**
      - 使用 `openclaw models status`AnthropicGateway(网关)CLI 查看已配置的 模型 以及提供商是否已通过身份验证。

    **针对“No credentials found for profile anthropic”的修复清单**

    这意味着运行被固定到 Anthropic 身份验证配置文件，但 Gateway(网关) 在其身份验证存储中找不到它。

    - **使用 Claude CLI**
      - 在 网关主机 上运行 `openclaw models auth login --provider anthropic --method cli --set-default`API。
    - **如果你想改用 API 密钥**
      - 将 `ANTHROPIC_API_KEY` 放入 **网关主机** 上的 `~/.openclaw/.env` 中。
      - 清除任何强制使用缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认你正在网关主机上运行命令**
      - 在远程模式下，身份验证配置文件位于网关计算机上，而不是你的笔记本电脑上。

  </Accordion>

  <Accordion title="为什么它还尝试了 Google Gemini 并失败了？"OpenClaw>
    如果您的模型配置包含 Google Gemini 作为回退（或者您切换到了 Gemini 简写），OpenClaw 将在模型回退期间尝试它。如果您尚未配置 Google 凭据，您将看到 `No API key found for provider "google"`。

    解决方法：提供 Google 身份验证，或者在 `agents.defaults.model.fallbacks`LLMOpenClaw / 别名中移除/避免使用 Google 模型，以免回退路由到那里。

    **LLM 请求被拒绝：需要思考签名 (Google Antigravity)**

    原因：会话历史包含 **没有签名的思考块**（通常来自
    中断/部分流）。Google Antigravity 要求思考块必须具有签名。

    解决方法：OpenClaw 现在会为 Google Antigravity Claude 剥离未签名的思考块。如果仍然出现，请启动一个 **新会话** 或为该代理设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles：它们是什么以及如何管理它们

相关：[/concepts/oauth](/zh/concepts/oauthOAuth) (OAuth 流程、令牌存储、多账户模式)

<AccordionGroup>
  <Accordion title="什么是身份验证配置文件？"OAuthAPI>
    身份验证配置文件是绑定到提供商的命名凭据记录（OAuth 或 API 密钥）。配置文件位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    要在不泄露机密的情况下检查已保存的配置文件，请运行 `openclaw models auth list` （可选 `--provider <id>` 或 `--json`CLI）。详情请参阅 [Models CLI](/zh/cli/models#auth-profiles)。

  </Accordion>

  <Accordion title="典型的配置文件 ID 是什么？"OpenClaw>
    OpenClaw 使用带提供商前缀的 ID，例如：

    - `anthropic:default` （当不存在电子邮件身份时常见）
    - `anthropic:<email>`OAuth 用于 OAuth 身份
    - 您选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先尝试哪个身份配置文件吗？">
    可以。配置支持为配置文件提供可选元数据，并支持每个提供商的排序 (`auth.order.<provider>`OpenClaw)。这**不会**存储机密信息；它将 ID 映射到提供商/模式并设置轮换顺序。

    如果配置文件处于短期的**冷却**（速率限制/超时/身份验证失败）或长期的**禁用**状态（计费/余额不足），OpenClaw 可能会暂时跳过该配置文件。要检查此情况，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调优：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷却范围可以是特定于模型的。如果一个配置文件针对某个模型正在冷却，它对于同一提供商上的同级模型可能仍然可用，而计费/禁用时段仍然会阻止整个配置文件。

    您还可以通过 CLI 设置**每个代理**的顺序覆盖（存储在该代理的 `auth-state.json`CLI 中）：

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

    要定位特定代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    要验证实际将尝试的内容，请使用：

    ```bash
    openclaw models status --probe
    ```

    如果在显式顺序中省略了已存储的配置文件，探测将针对该配置文件报告 `excluded_by_auth_order`，而不是静默尝试它。

  </Accordion>

  <Accordion title="OAuthAPIOAuth vs API 密钥 - 有什么区别？"OpenClawOAuthCLIAnthropicOpenClawCLI>
    OpenClaw 支持以下两种方式：

    - **OAuth / CLI 登录** 通常利用订阅访问权限（在提供商支持的情况下）。对于 Anthropic，OpenClaw 的 Claude CLI 后端使用
      Claude Code `claude -p`AnthropicAPIAnthropicCLIOpenAIOAuthAPI；Anthropic 目前将其视为 Agent
      SDK/程序化使用，拥有独立的每月 Agent SDK 额度，起始日期为
      2026 年 6 月 15 日。
    - **API 密钥** 使用按 token 付费的计费方式。

    向导明确支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 密钥。

  </Accordion>
</AccordionGroup>

## 相关

- [常见问题](/zh/help/faq) — 主要常见问题
- [常见问题 — 快速入门和首次运行设置](/zh/help/faq-first-run)
- [模型选择](/zh/concepts/model-providers)
- [模型故障转移](/zh/concepts/model-failover)
