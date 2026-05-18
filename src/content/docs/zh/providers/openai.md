---
summary: "OpenAIAPIOpenClaw在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAIOpenAI"
---

OpenAI 提供 GPT 模型的开发者 API，并且通过 OpenAI 的 Codex 客户端，Codex 也可作为 ChatGPT 计划的编码代理使用。OpenClaw 将这些界面分开，以便配置保持可预测。

OpenClaw 使用 OpenClaw`openai/*`OpenAIOpenAIOpenAIAPIOpenAI 作为规范的 OpenAI 模型路由。默认情况下，嵌入式代理通过原生 Codex 应用服务器运行时启用 OpenAI 模型；对于非代理 OpenAI 界面（如图像、嵌入、语音和实时），直接的 OpenAI API 密钥认证仍然可用。

- **Agent 模型** - `openai/*` 模型通过 Codex 运行时；使用 Codex 登录以进行 ChatGPT/Codex 订阅使用，或者在您有意使用 API-key 认证时，配置一个与 Codex 兼容的 OpenAI APIAPI-key 备份。
- **非代理 OpenAI API** - 通过 OpenAIOpenAI`OPENAI_API_KEY`OpenAIAPI 或 OpenAI API 密钥新手引导，直接访问 OpenAI 平台，并采用按量计费。
- **传统配置** - `openai-codex/*` 模型引用会被 `openclaw doctor --fix` 修复为 `openai/*` 以及 Codex 运行时。

OpenAI 明确支持在外部工具和工作流程（如 OpenClaw）中使用订阅 OAuth。

提供商、模型、运行时和渠道是不同的层级。如果将这些标签混淆在一起，请在更改配置前阅读 [Agent runtimes](/zh/concepts/agent-runtimes)。

## 快速选择

| 目标                                        | 使用                                               | 备注                                                                   |
| ------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| ChatGPT/Codex 订阅搭配原生 Codex 运行时     | `openai/gpt-5.5`                                   | 默认的 OpenAI 代理设置。使用 Codex 认证登录。                          |
| 代理模型的直接 API 密钥计费                 | `openai/gpt-5.5`API 加上 Codex 兼容的 API 密钥配置 | 使用 `auth.order.openai` 将备份放置在订阅验证之后。                    |
| 通过显式项目 ID (PI) 进行直接 API 密钥计费  | `openai/gpt-5.5` 加上提供商/模型运行时 `pi`        | 选择一个普通的 `openai` API 密钥配置。                                 |
| 最新的 ChatGPT Instant API 别名             | `openai/chat-latest`                               | 仅限直接 API 密钥。用于实验的变动别名，而非默认值。                    |
| 通过显式 PI 进行 ChatGPT/Codex 订阅身份验证 | `openai/gpt-5.5` 加上提供商/模型运行时 `pi`        | 为兼容性路由选择 `openai-codex` 身份验证配置文件。                     |
| 图像生成或编辑                              | `openai/gpt-image-2`                               | 适用于 `OPENAI_API_KEY` 或 OpenAI Codex OAuth。                        |
| 透明背景图像                                | `openai/gpt-image-1.5`                             | 使用 `outputFormat=png` 或 `webp` 和 `openai.background=transparent`。 |

## 命名映射

名称相似但不可互换：

| 您看到的名称                         | 层级                      | 含义                                                                                              |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------- |
| `openai`                             | 提供商前缀                | 规范的 OpenAI 模型路由；代理轮次使用 Codex 运行时。                                               |
| `openai-codex`                       | 旧版身份验证/配置文件前缀 | 旧版 OpenAI Codex OAuth/订阅配置文件命名空间。现有配置文件和 `auth.order.openai-codex` 仍然有效。 |
| `codex` 插件                         | 插件                      | 捆绑的 OpenClaw 插件，提供原生 Codex 应用服务器运行时和 `/codex` 聊天控件。                       |
| 提供商/模型 `agentRuntime.id: codex` | 代理运行时                | 为匹配的嵌入式轮次强制使用原生 Codex 应用服务器容器。                                             |
| `/codex ...`                         | 聊天命令集                | 从对话中绑定/控制 Codex 应用服务器线程。                                                          |
| `runtime: "acp", agentId: "codex"`   | ACP 会话路由              | 通过 ACP/acpx 运行 Codex 的显式回退路径。                                                         |

这意味着配置可以有意包含 `openai/*` 模型引用，同时身份验证配置文件仍指向 Codex 兼容的凭据。对于新配置，首选 `auth.order.openai`；现有的 `openai-codex:*` 配置文件和 `auth.order.openai-codex` 仍然受支持。`openclaw doctor --fix` 会将旧版 `openai-codex/*` 模型引用重写为规范的 OpenAI 模型路由。

<Note>GPT-5.5 可通过直接 OpenAI 平台 API 密钥访问以及 订阅/OAuth 路由使用。对于 ChatGPT/Codex 订阅及原生 Codex 执行，请使用 `openai/gpt-5.5`；未设置的运行时配置现在会为 OpenAI 代理轮次 选择 Codex 驱动器。仅当您希望为 OpenAI 代理模型 使用直接的 API 密钥认证时，才使用 API OpenAI 密钥配置文件。</Note>

<Note>OpenAI 代理模型轮次需要捆绑的 Codex 应用服务器插件。显式 PI 运行时配置仍然作为可选兼容性路径可用。当使用 OpenAI`openai-codex`OpenClaw 身份验证配置文件显式选择 PI 时，OpenClaw 将 公共模型引用保持为 `openai/*`，并通过旧版 Codex 身份验证传输在内部路由 PI。运行 `openclaw doctor --fix` 以修复过时的 `openai-codex/*`、`codex-cli/*` 或并非来自显式运行时配置的旧 PI 会话固定项。</Note>

## OpenClaw 功能覆盖

| OpenAI 功能            | OpenClaw 表面                                                         | 状态                               |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| 聊天 / 响应            | `openai/<model>` 模型提供商                                           | 是                                 |
| Codex 订阅模型         | `openai/<model>` 与 `openai-codex` OAuth                              | 是                                 |
| 传统 Codex 模型引用    | `openai-codex/<model>` 或 `codex-cli/<model>`                         | 由医生修复为 `openai/<model>`      |
| Codex 应用服务器驱动器 | `openai/<model>` 省略 runtime 或 提供商/模型 `agentRuntime.id: codex` | 是                                 |
| 服务器端网页搜索       | 原生 OpenAI 响应工具                                                  | 是，当启用网页搜索且未固定提供商时 |
| 图像                   | `image_generate`                                                      | 是                                 |
| 视频                   | `video_generate`                                                      | 是                                 |
| 文本转语音             | `messages.tts.provider: "openai"` / `tts`                             | 是                                 |
| 批量语音转文本         | `tools.media.audio` / 媒体理解                                        | 是                                 |
| 流式语音转文本         | 语音通话 `streaming.provider: "openai"`                               | 是                                 |
| 实时语音               | 语音通话 `realtime.provider: "openai"` / 控制界面对话                 | 是                                 |
| 嵌入                   | 内存嵌入提供商                                                        | 是                                 |

## 内存嵌入

OpenClaw 可以使用 OpenAI 或兼容 OpenAI 的嵌入端点，用于
`memory_search` 索引和查询嵌入：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

对于需要非对称嵌入标签的 OpenAI 兼容端点，请在 `memorySearch` 下设置 `queryInputType` 和 `documentInputType`。OpenClaw 会将这些作为提供商特定的 `input_type` 请求字段转发：查询嵌入使用 `queryInputType`；索引内存块和批量索引使用 `documentInputType`。有关完整示例，请参阅 [Memory configuration reference](/zh/reference/memory-config#provider-specific-config)。

## 入门指南

选择您首选的身份验证方法并按照设置步骤进行操作。

<Tabs>
  <Tab title="APIOpenAIAPI 密钥 (OpenAI Platform)"API>
    **最适合：** 直接 API 访问和按使用量计费。

    <Steps>
      <Step title="API获取您的 API 密钥"APIOpenAI>
        从 [OpenAI Platform 仪表板](https://platform.openai.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或者直接传递密钥：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用              | 运行时配置             | 路由                       | 身份验证             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | 省略 / 提供商/模型 `agentRuntime.id: "codex"`OpenAI | Codex app-server harness | Codex 兼容的 OpenAI 配置文件 |
    | `openai/gpt-5.4-mini` | 省略 / 提供商/模型 `agentRuntime.id: "codex"`OpenAI | Codex app-server harness | Codex 兼容的 OpenAI 配置文件 |
    | `openai/gpt-5.5`      | 提供商/模型 `agentRuntime.id: "pi"`              | PI 嵌入式运行时      | `openai` 配置文件或选定的 `openai-codex` 配置文件 |

    <Note>
    `openai/*`APIAPI 代理模型使用 Codex 应用服务器适配器。要对代理模型使用 API 密钥
    身份验证，请创建一个 Codex 兼容的 API 密钥配置文件并使用 `auth.order.openai` 对其进行排序；对于
    非代理 OpenAI API 表面，`OPENAI_API_KEY`OpenAIAPI 仍然是直接的后备选项。较旧的 `auth.order.openai-codex` 条目仍然
    有效。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```OpenAIAPI

    要从 OpenAI API 尝试 ChatGPT 当前的 Instant 模型，请将模型
    设置为 `openai/chat-latest`：

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest`OpenAI 是一个动态别名。OpenAI 将其记录为 ChatGPT 中使用的最新 Instant
    模型，并推荐 `gpt-5.5`API 用于生产环境 API 使用，因此
    除非您明确想要该
    别名行为，否则请将 `openai/gpt-5.5` 保持为稳定的默认值。该别名目前仅接受 `medium`OpenClawOpenAIOpenClaw 文本冗长度，因此
    OpenClaw 会针对此
    模型规范化不兼容的 OpenAI 文本冗长度覆盖设置。

    <Warning>
    OpenClaw **不会** 公开 `openai/gpt-5.3-codex-spark`OpenAIAPI。实时的 OpenAI API 请求会拒绝该模型，并且当前的 Codex 目录也不公开它。
    </Warning>

  </Tab>

  <Tab title="Codex subscription">
    **Best for:** 使用您的 ChatGPT/Codex 订阅以及原生 Codex 应用服务器执行，而不是单独的 API 密钥。Codex 云端需要 ChatGPT 登录。

    <Steps>
      <Step title="Run Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或者直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        对于无头或回调不友好的环境，添加 `--device-code` 以使用 ChatGPT 设备代码流登录，而不是本地主机浏览器回调：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Use the canonical OpenAI 模型 route">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        默认路径不需要运行时配置。OpenAI 智能体轮次
        会自动选择原生 Codex 应用服务器运行时，当选择此路由时，OpenClaw
        会安装或修复捆绑的 Codex 插件。
      </Step>
      <Step title="Verify Codex auth is available">
        ```bash
        openclaw models list --provider openai-codex
        ```

        网关运行后，在聊天中发送 `/codex status` 或 `/codex models`
        以验证原生应用服务器运行时。
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 运行时配置 | 路由 | 身份验证 |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omitted / 提供商/模型 `agentRuntime.id: "codex"` | Native Codex app-server harness | Codex sign-in or ordered `openai` auth profile |
    | `openai/gpt-5.5` | 提供商/模型 `agentRuntime.id: "pi"` | PI embedded runtime with internal Codex-auth transport | Selected `openai-codex` profile |
    | `openai-codex/gpt-5.5` | repaired by doctor | Legacy route rewritten to `openai/gpt-5.5` | Existing `openai-codex` profile |
    | `codex-cli/gpt-5.5` | repaired by doctor | Legacy CLI route rewritten to `openai/gpt-5.5` | Codex app-server auth |

    <Warning>
    Do not configure older `openai-codex/gpt-5.1*`, `openai-codex/gpt-5.2*`, or
    `openai-codex/gpt-5.3*` 模型 refs. ChatGPT/Codex OAuth accounts now reject
    those models. Use `openai/gpt-5.5`; OpenAI agent turns now select the Codex
    runtime by default.
    </Warning>

    <Note>
    The `openai-codex/*` 模型 prefix is legacy config repaired by doctor. For
    the common subscription plus native runtime setup, sign in with Codex auth
    but keep the 模型 ref as `openai/gpt-5.5`. New config should put OpenAI
    agent auth order under `auth.order.openai`; older `auth.order.openai-codex`
    entries remain valid.
    </Note>

    ### 配置示例

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
    }
    ```

    With an API-key backup, keep the 模型 on `openai/gpt-5.5` and put the
    auth order under `openai`. OpenClaw will try the subscription first, then
    the API key, while staying on the Codex harness:

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
      auth: {
        order: {
          openai: [
            "openai-codex:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```

    <Note>
    新手引导 no longer imports OAuth material from `~/.codex`. Sign in with browser OAuth (default) or the device-code flow above — OpenClaw manages the resulting credentials in its own agent auth store.
    </Note>

    ### 检查并恢复 Codex OAuth 路由

    Use these commands to see which 模型, runtime, and auth route your default
    agent is using:

    ```bash
    openclaw models status
    openclaw models auth list --provider openai-codex
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    For a specific agent, add `--agent <id>`:

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai-codex
    ```

    If an older config still has `openai-codex/gpt-*` or a stale OpenAI PI
    会话 pin without explicit runtime config, repair it:

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    If `models auth list --provider openai-codex` shows no usable profile, sign
    in again:

    ```bash
    openclaw models auth login --provider openai-codex
    openclaw models status --probe --probe-provider openai-codex
    ```

    `openai/*` is the 模型 route for OpenAI agent turns through Codex. The
    `openai-codex` auth/profile 提供商 id remains accepted for existing
    profiles and CLI listing.

    ### 状态指示器

    Chat `/status` shows which 模型 runtime is active for the current 会话.
    The bundled Codex app-server harness appears as `Runtime: OpenAI Codex` for
    OpenAI agent 模型 turns. Stale PI 会话 pins are repaired to Codex unless
    config explicitly pins PI.

    ### Doctor warning

    If `openai-codex/*` routes or stale OpenAI PI pins remain in config or
    会话 state, `openclaw doctor --fix` rewrites them to `openai/*` with the
    Codex runtime unless PI is explicitly configured.

    ### Context window cap

    OpenClaw treats 模型 metadata and the runtime context cap as separate values.

    For `openai/gpt-5.5` through the Codex OAuth catalog:

    - Native `contextWindow`: `1000000`
    - Default runtime `contextTokens` cap: `272000`

    The smaller default cap has better latency and quality characteristics in practice. Override it with `contextTokens`:

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Use `contextWindow` to declare native 模型 metadata. Use `contextTokens` to limit the runtime context budget.
    </Note>

    ### Catalog recovery

    OpenClaw uses upstream Codex catalog metadata for `gpt-5.5` when it is
    present. If live Codex discovery omits the `gpt-5.5` row while
    the account is authenticated, OpenClaw synthesizes that OAuth 模型 row so
    cron, sub-agent, and configured default-模型 runs do not fail with
    `Unknown model`.

  </Tab>
</Tabs>

## 原生 Codex 应用服务器认证

原生 Codex 应用服务器工具链使用 `openai/*` 模型引用以及省略的运行时配置或提供商/模型 `agentRuntime.id: "codex"`OpenClaw，但其身份验证仍基于帐户。OpenClaw 按以下顺序选择身份验证：

1. 为代理提供排序的 OpenAI 身份验证配置文件，最好位于 OpenAI`auth.order.openai` 下。现有的 `openai-codex:*` 配置文件和 `auth.order.openai-codex` 对于较旧的安装仍然有效。
2. 应用服务器的现有账户，例如本地 Codex CLI ChatGPT 登录。
3. 仅对于本地 stdio 应用服务器启动，当应用服务器报告没有帐户且仍需要 OpenAI 身份验证时，依次使用 `CODEX_API_KEY`，然后使用 `OPENAI_API_KEY`OpenAI。

这意味着本地 ChatGPT/Codex 订阅登录不会仅仅因为网关进程也拥有用于直接 OpenAI 模型或嵌入的 `OPENAI_API_KEY`OpenAIAPIOpenClaw 而被替换。环境 API 密钥回退仅是本地 stdio 无账户路径；它不会发送到 WebSocket 应用服务器连接。当选择订阅式 Codex 配置文件时，OpenClaw 还会将 `CODEX_API_KEY` 和 `OPENAI_API_KEY`RPCOpenClaw 排除在衍生出的 stdio 应用服务器子进程之外，并通过应用服务器登录 RPC 发送所选凭据。当该订阅配置文件被 Codex 使用限制阻止时，OpenClaw 可以轮换到下一个有序的 `openai:*`API API 密钥配置文件，而无需更改所选模型或退出 Codess 框架。一旦订阅重置时间过去，订阅配置文件便再次符合条件。

## 图像生成

捆绑的 `openai` 插件通过 `image_generate`OpenAIAPIOAuth 工具注册了图像生成功能。
它通过同一个 `openai/gpt-image-2` 模型引用，同时支持 OpenAI API 密钥图像生成和 Codex OAuth 图像生成。

| 功能                 | OpenAI API 密钥             | Codex OAuth                 |
| -------------------- | --------------------------- | --------------------------- |
| 模型引用             | `openai/gpt-image-2`        | `openai/gpt-image-2`        |
| 认证                 | `OPENAI_API_KEY`            | OpenAI Codex OAuth 登录     |
| 传输                 | OpenAI Images API           | Codex Responses 后端        |
| 每个请求的最大图像数 | 4                           | 4                           |
| 编辑模式             | 已启用（最多 5 张参考图像） | 已启用（最多 5 张参考图片） |
| 尺寸覆盖             | 支持，包括 2K/4K 尺寸       | 支持，包括 2K/4K 尺寸       |
| 纵横比 / 分辨率      | 未转发到 OpenAI Images API  | 安全时会映射到支持的尺寸    |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [图像生成](/zh/tools/image-generation)。</Note>

`gpt-image-2`OpenAI 是 OpenAI 文本生成图像和图像编辑的默认选项。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可作为显式模型覆盖使用。使用 `openai/gpt-image-1.5` 获取透明背景的 PNG/WebP 输出；当前的 `gpt-image-2`API API 拒绝 `background: "transparent"`。

对于透明背景请求，代理应使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"` 以及 `background: "transparent"` 调用 `image_generate`；较旧的 `openai.background` 提供商选项仍然被接受。OpenClaw 还通过将默认 `openai/gpt-image-2` 透明请求重写为 `gpt-image-1.5` 来保护公共 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自定义 OpenAI 兼容端点将保留其配置的部署/模型名称。

无头 CLI 运行也公开了相同的设置：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

从输入文件启动时，对 `openclaw infer image edit` 使用相同的 `--output-format` 和 `--background` 标志。`--openai-background` 仍可作为 OpenAI 专用的别名使用。

对于 Codex OAuth 安装，请保持相同的 `openai/gpt-image-2` 引用。当配置了 `openai-codex` OAuth 配置文件时，OpenClaw 会解析该存储的 OAuth 访问令牌，并通过 Codex Responses 后端发送图像请求。它不会首先尝试 `OPENAI_API_KEY` 或静默回退到 API 密钥。当您需要直接的 API Images OpenAI 路由时，请使用 API 密钥、自定义基础 URL 或 Azure 端点显式配置 `models.providers.openai`。
如果该自定义图像端点位于受信任的 LAN/专用地址上，还请设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非存在此选择加入选项，否则 OpenClaw 会阻止专用/内部 OpenAI 兼容的图像端点。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

生成透明 PNG：

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

编辑：

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## 视频生成

捆绑的 `openai` 插件通过 `video_generate` 工具注册了视频生成功能。

| 功能     | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 默认模型 | `openai/sora-2`                                                          |
| 模式     | 文本生成视频、图像生成视频、单个视频编辑                                 |
| 参考输入 | 1 张图像或 1 个视频                                                      |
| 尺寸覆盖 | 支持                                                                     |
| 其他覆盖 | `aspectRatio`、`resolution`、`audio`、`watermark` 将被忽略并显示工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>请参阅 [视频生成](/zh/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

## GPT-5 提示词贡献

OpenClaw 为跨提供商的 GPT-5 系列运行添加了共享的 GPT-5 提示贡献。它根据模型 ID 应用，因此 `openai/gpt-5.5`、旧版修复前引用如 `openai-codex/gpt-5.5`、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 以及其他兼容的 GPT-5 引用会收到相同的覆盖。较旧的 GPT-4.x 模型则不会。

内置的原生 Codex 控制通过 Codex 应用服务器开发者指令使用相同的 GPT-5 行为和心跳覆盖，因此通过 Codex 路由的 `openai/gpt-5.x` 会话即使 Codex 拥有控制提示词的其余部分，也能保持相同的跟进和主动心跳指导。

GPT-5 贡献为角色持久性、执行安全性、工具纪律、输出形状、完成检查和验证添加了带标签的行为契约。特定于通道的回复和静默消息行为保留在共享的 OpenClaw 系统提示词和出站交付策略中。对于匹配的模型，GPT-5 指导始终处于启用状态。友好的交互风格层是独立的且可配置。

| 值                   | 效果                 |
| -------------------- | -------------------- |
| `"friendly"`（默认） | 启用友好的交互风格层 |
| `"on"`               | `"friendly"` 的别名  |
| `"off"`              | 仅禁用友好风格层     |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLICLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>值在运行时不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好风格层。</Tip>

<Note>当未设置共享的 `agents.defaults.promptOverlays.gpt5.personality` 设置时，仍会读取旧版 `plugins.entries.openai.config.personality` 作为兼容性回退。</Note>

## 语音和讲话

<AccordionGroup>
  <Accordion title="语音合成 (TTS)">
    内置的 `openai` 插件为 `messages.tts` 表面注册了语音合成功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 语音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | (未设置) |
    | 指令 | `messages.tts.providers.openai.instructions` | (未设置，仅限 `gpt-4o-mini-tts`) |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音笔记为 `opus`，文件为 `mp3` |
    | API 密钥 | `messages.tts.providers.openai.apiKey` | 回退至 `OPENAI_API_KEY` |
    | Base URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | 额外请求体 | `messages.tts.providers.openai.extraBody` / `extra_body` | (未设置) |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用语音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 会在 OpenClaw 生成的字段之后合并到 `/audio/speech` 请求 JSON 中，因此请将其用于需要额外键（如 `lang`）的 OpenAI 兼容端点。原型键将被忽略。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    设置 `OPENAI_TTS_BASE_URL` 以覆盖 TTS 基础 URL，而不影响聊天 API 端点。OpenAI TTS 仍通过 API 密钥配置；对于仅限 OAuth 的实时对话，请使用 Realtime 语音路径，而不是代理模式的 STT -> TTS 语音。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录表面注册了批量语音转文本功能。

    - 默认模型： `gpt-4o-transcribe`
    - 端点： OpenAI REST `/v1/audio/transcriptions`
    - 输入路径： 多部分音频文件上传
    - OpenClaw 在任何使用 `tools.media.audio` 进行入站音频转录的地方均提供支持，
      包括 Discord 语音频道片段和频道音频附件

    要强制使用 OpenAI 进行入站音频转录：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    当通过共享音频媒体配置或单次转录请求提供时，语言和提示提示将转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为语音通话插件注册实时转录功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | (未设置) |
    | 提示词 | `...openai.prompt` | (未设置) |
    | 静音时长 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 认证 | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai-codex`OAuth OAuth | APIOAuth 密钥直接连接；OAuth 会生成一个实时转录客户端密钥 |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，采用 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音频。当仅配置了 `openai-codex` OAuthGateway(网关) 时，Gateway 会在打开 WebSocket 之前生成一个临时的实时转录客户端密钥。此流式提供商用于语音通话的实时转录路径；Discord 语音目前录制短片段并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    捆绑的 `openai` 插件为 Voice Call 插件注册了实时语音。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | 语音 | `...openai.voice` | `alloy` |
    | Temperature (Azure 部署桥接) | `...openai.temperature` | `0.8` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 静音时长 | `...openai.silenceDurationMs` | `500` |
    | 前缀填充 | `...openai.prefixPaddingMs` | `300` |
    | 推理强度 | `...openai.reasoningEffort` | (未设置) |
    | 认证 | `...openai.apiKey`, `OPENAI_API_KEY`, 或 `openai-codex` OAuth | Browser Talk 和非 Azure 后端桥接可以使用 Codex OAuth |

    适用于 `gpt-realtime-2` 的可用内置实时语音：`alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`。
    OpenAI 推荐使用 `marin` 和 `cedar` 以获得最佳实时质量。这
    是与上述文本转语音语音分开的一组；不要假设诸如 `fable`, `nova`, 或 `onyx` 的 TTS
    语音对实时会话有效。

    <Note>
    后端 OpenAI 实时桥接使用 GA Realtime WebSocket 会话形状，它不接受 `session.temperature`。Azure OpenAI 部署仍然可以通过 `azureEndpoint` 和 `azureDeployment` 获得，并保持与部署兼容的会话形状。支持双向工具调用和 G.711 u-law 音频。
    </Note>

    <Note>
    实时语音是在创建会话时选择的。OpenAI 允许大多数
    会话字段稍后更改，但在该
    模型在该会话中发出音频后无法更改语音。OpenClaw 目前将
    内置实时语音 id 暴露为字符串。
    </Note>

    <Note>
    控制 UI Talk 使用 OpenAI 浏览器实时会话，并带有由 Gateway(网关) 创建的
    临时客户端密钥以及针对
    OpenAI Realtime API 的直接浏览器 WebRTC SDP 交换。当未配置直接 OpenAI API 密钥时，
    Gateway(网关) 可以使用所选的 `openai-codex` OAuth
    配置文件来创建该客户端密钥。Gateway(网关) 中继和 Voice Call 后端实时 WebSocket 桥接
    对原生 OAuth 端点使用相同的 OpenAI 后备方案。维护者实时
    验证可通过
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 使用；
    OpenAI 端点在不记录密钥的情况下验证后端 WebSocket 桥接和浏览器
    WebRTC SDP 交换。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端点

通过覆盖基础 URL，内置的 `openai`OpenAIOpenClaw 提供商可以指定用于图像生成的 Azure OpenAI 资源。在图像生成路径上，OpenClaw 会检测 `models.providers.openai.baseUrl` 上的 Azure 主机名，并自动切换到 Azure 的请求形状。

<Note>Realtime voice uses a separate configuration path (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) and is not affected by `models.providers.openai.baseUrl`. See the **Realtime voice** accordion under [Voice and speech](#voice-and-speech) for its Azure settings.</Note>

在以下情况下使用 Azure OpenAI：

- 您已经拥有 Azure OpenAI 订阅、配额或企业协议
- 您需要 Azure 提供的区域数据驻留或合规性控制
- 您希望将流量保留在现有的 Azure 租户中

### 配置

对于通过捆绑的 `openai` 提供商进行的 Azure 图像生成，请将 `models.providers.openai.baseUrl` 指向您的 Azure 资源，并将 `apiKey` 设置为 Azure OpenAI 密钥（而不是 OpenAI 平台密钥）：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw 识别以下 Azure 图像生成路由的 Azure 主机后缀：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于已识别 Azure 主机上的图像生成请求，OpenClaw 会：

- 发送 `api-key` 标头而不是 `Authorization: Bearer`
- 使用部署范围的路径 (`/openai/deployments/{deployment}/...`)
- 将 `?api-version=...` 附加到每个请求
- Azure 图像生成调用使用 600 秒的默认请求超时。每次调用的 `timeoutMs` 值仍会覆盖此默认值。

其他基础 URL（公共 OpenAI、OpenAI 兼容代理）保持标准的
OpenAI 图像请求格式。

<Note>`openai` 提供商的图像生成路径的 Azure 路由需要 OpenClaw 2026.4.22 或更高版本。早期版本会将任何自定义 `openai.baseUrl` 视为公共 OpenAI 端点，并且在针对 Azure 图像部署时会失败。</Note>

### API 版本

设置 `AZURE_OPENAI_API_VERSION` 以固定 Azure 图像生成路径的特定 Azure 预览版或正式版 (GA) 版本：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

当未设置该变量时，默认值为 `2024-12-01-preview`。

### 模型名称即部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑的 `openai` 提供商路由的 Azure 图像生成请求，OpenClaw 中的 `model` 字段
必须是在 Azure 门户中配置的 **Azure 部署名称**，而不是
公共 OpenAI 模型 id。

如果您创建一个名为 `gpt-image-2-prod` 的部署来提供 `gpt-image-2` 服务：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

同样的部署名称规则也适用于通过捆绑的 `openai` 提供商路由的图像生成调用。

### 区域可用性

Azure 图像生成目前仅在部分区域可用（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、`uaenorth`）。在创建部署之前，请查看 Microsoft 当前的区域列表，并确认您的区域是否提供特定的模型。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。
Azure 可能会拒绝公共 OpenAI 允许的选项（例如 `gpt-image-2` 上的某些
`background` 值），或者仅在特定的模型版本上公开这些选项。这些差异源于
Azure 和基础模型，而非 OpenClaw。如果 Azure 请求因验证错误而失败，请在
Azure 门户中检查您的特定部署和 API 版本支持的参数集。

<Note>
Azure OpenAI 使用本机传输和兼容行为，但不会接收
OpenClaw 的隐藏归因标头 — 请参阅 [Advanced configuration](#advanced-configuration) 下的 **Native vs OpenAI-compatible
routes**（本机与 API 兼容路由）折叠部分。

对于 Azure 上的聊天或 Responses 流量（除了图像生成之外），请使用
新手引导 流程或专用的 Azure 提供商 配置 — 仅靠 `openai.baseUrl`
无法识别 Azure API/auth 形状。存在一个单独的
`azure-openai-responses/*` 提供商；请参阅
下方的 Server-side compaction（服务端压缩）折叠部分。

</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="传输（WebSocket 与 SSE）">
    OpenClaw 对 `openai/*` 优先使用 WebSocket，并回退到 SSE (`"auto"`)。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前重试一次早期的 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级约 60 秒，并在冷却期间使用 SSE
    - 为重试和重新连接附加稳定的会话和轮次标识头
    - 跨传输变体标准化使用计数器 (`input_tokens` / `prompt_tokens`)

    | 值 | 行为 |
    |-------|----------|
    | `"auto"` (默认) | WebSocket 优先，SSE 回退 |
    | `"sse"` | 强制仅使用 SSE |
    | `"websocket"` | 强制仅使用 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相关 OpenAI 文档：
    - [带有 WebSocket 的实时 API](https://platform.openai.com/docs/guides/realtime-websocket)
    - [流式 API 响应 (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Fast mode">
    OpenClaw 为 `openai/*` 提供了一个共享的快速模式切换开关：

    - **Chat/UI（聊天/界面）：** `/fast status|on|off`
    - **Config（配置）：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用后，OpenClaw 会将快速模式映射到 OpenAI 优先处理（`service_tier = "priority"`）。现有的 `service_tier` 值将被保留，且快速模式不会重写 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    会话覆盖优先于配置。在会话 UI 中清除会话覆盖可将会话恢复为配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)"OpenAIAPI>
    OpenAI 的 API 通过 `service_tier`OpenClaw 暴露优先处理功能。在 OpenClaw 中按模型进行设置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier`OpenAI 仅会转发到原生 OpenAI 端点（`api.openai.com`）和原生 Codex 端点（`chatgpt.com/backend-api`OpenClaw）。如果您通过代理路由任一提供商，OpenClaw 将保持 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="API服务器端压缩 (Responses API)"OpenAI>
    对于直接的 OpenAI Responses 模型（`openai/*` 上的 `api.openai.com`OpenAI），OpenAI 插件的 Pi-harness 流包装器会自动启用服务器端压缩：

    - 强制 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（或者在不可用时使用 `80000`OpenAIOpenAI）

    这适用于内置的 Pi harness 路径以及嵌入式运行所使用的 OpenAI 提供程序钩子。原生 Codex 应用服务器 harness 通过 Codex 管理自己的上下文，并由 OpenAI 的默认代理路由或提供程序/模型运行时策略进行配置。

    <Tabs>
      <Tab title="显式启用"OpenAI>
        对于兼容的端点（如 Azure OpenAI Responses）很有用：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="自定义阈值">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="禁用">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` 仅控制 `context_management`OpenAI 的注入。直接的 OpenAI Responses 模型仍然会强制 `store: true`，除非兼容性设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    对于在 `openai/*`OpenClaw 上运行的 GPT-5 系列，OpenClaw 可以使用更严格的嵌入式执行契约：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic`OpenClaw 时，OpenClaw：
    - 当有工具操作可用时，不再将仅计划的回合视为成功的进展
    - 使用立即行动 (act-now) 引导重试该回合
    - 为实质工作自动启用 `update_plan`OpenAI
    - 如果模型持续计划而不采取行动，则显示明确的受阻状态

    <Note>
    仅适用于 OpenAI 和 Codex 的 GPT-5 系列运行。其他提供商和旧系列模型保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="OpenAINative vs OpenAI-compatible routes"OpenClawOpenAIOpenAIOpenAI>
    OpenClaw treats direct OpenAI, Codex, and Azure OpenAI endpoints differently from generic OpenAI-compatible `/v1` proxies:

    **Native routes** (`openai/*`OpenAI, Azure OpenAI):
    - Keep `reasoning: { effort: "none" }`OpenAI only for models that support the OpenAI `none` effort
    - Omit disabled reasoning for models or proxies that reject `reasoning.effort: "none"`OpenAI
    - Default 工具 schemas to strict mode
    - Attach hidden attribution headers on verified native hosts only
    - Keep OpenAI-only request shaping (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **Proxy/compatible routes:**
    - Use looser compat behavior
    - Strip Completions `store` from non-native `openai-completions` payloads
    - Accept advanced `params.extra_body`/`params.extraBody`OpenAI pass-through JSON for OpenAI-compatible Completions proxies
    - Accept `params.chat_template_kwargs`OpenAIOpenAI for OpenAI-compatible Completions proxies such as vLLM
    - Do not force strict 工具 schemas or native-only headers

    Azure OpenAI uses native transport and compat behavior but does not receive the hidden attribution headers.

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Image generation" href="/zh/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="OAuthOAuth and auth" href="/zh/gateway/authentication" icon="key">
    身份验证详细信息和凭据重用规则。
  </Card>
</CardGroup>
