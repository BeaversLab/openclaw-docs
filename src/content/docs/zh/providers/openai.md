---
summary: "OpenAIAPIOpenClaw在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAIOpenAI"
---

OpenAI 提供 GPT 模型的开发者 API，并且通过 OpenAI 的 Codex 客户端，Codex 也可作为 ChatGPT 计划的编码代理使用。OpenClaw 将这些界面分开，以便配置保持可预测。

OpenClaw 使用 OpenClaw`openai/*`OpenAIOpenAIOpenAIAPIOpenAI 作为规范的 OpenAI 模型路由。默认情况下，嵌入式代理开启通过原生 Codex 应用服务器运行时运行的 OpenAI 模型；直接的 OpenAI API 密钥身份验证仍可用于非代理 OpenAI 表面，例如图像、嵌入、语音和实时功能。

- **代理模型** - 通过 Codex 运行时运行 `openai/*`OpenAIAPIAPI 模型；登录 Codex 身份验证以用于 ChatGPT/Codex 订阅使用，或者当您有意使用 API 密钥身份验证时，配置一个 Codex 兼容的 OpenAI API 密钥备份。
- **非代理 OpenAI API** - 通过 OpenAIOpenAI`OPENAI_API_KEY`OpenAIAPI 或 OpenAI API 密钥新手引导，直接访问 OpenAI 平台并采用基于用量的计费。
- **旧版配置** - `openai-codex/*` 模型引用将由
  `openclaw doctor --fix` 修复为 `openai/*` 加上 Codex 运行时。

OpenAI 明确支持在外部工具和工作流程（如 OpenClaw）中使用订阅 OAuth。

提供商、模型、运行时和渠道是独立的层。如果这些标签混淆在一起，请在更改配置之前阅读 [代理运行时](/zh/concepts/agent-runtimes)。

## 快速选择

| 目标                                        | 使用                                                   | 备注                                                                     |
| ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| ChatGPT/Codex 订阅搭配原生 Codex 运行时     | `openai/gpt-5.5`                                       | 默认的 OpenAI 代理设置。使用 Codex 认证登录。                            |
| 代理模型的直接 API 密钥计费                 | `openai/gpt-5.5`API 加上 Codex 兼容的 API 密钥配置文件 | 使用 `auth.order.openai` 将备份置于订阅身份验证之后。                    |
| 通过显式项目 ID (PI) 进行直接 API 密钥计费  | `openai/gpt-5.5` 加上提供商/模型运行时 `pi`            | 选择一个正常的 `openai`API API 密钥配置文件。                            |
| 最新的 ChatGPT Instant API 别名             | `openai/chat-latest`                                   | 仅限直接 API 密钥。用于实验的变动别名，而非默认值。                      |
| 通过显式 PI 进行 ChatGPT/Codex 订阅身份验证 | `openai/gpt-5.5` 加上提供商/模型运行时 `pi`            | 为兼容路由选择一个 `openai-codex` 身份验证配置文件。                     |
| 图像生成或编辑                              | `openai/gpt-image-2`                                   | 适用于 `OPENAI_API_KEY`OpenAIOAuth 或 OpenAI Codex OAuth。               |
| 透明背景图像                                | `openai/gpt-image-1.5`                                 | 使用 `outputFormat=png` 或 `webp` 以及 `openai.background=transparent`。 |

## 命名映射

名称相似但不可互换：

| 您看到的名称                         | 层级                      | 含义                                                                                                |
| ------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------- |
| `openai`                             | 提供商前缀                | 规范的 OpenAI 模型路由；代理轮次使用 Codex 运行时。                                                 |
| `openai-codex`                       | 旧版身份验证/配置文件前缀 | 旧版 OpenAI Codex OAuth/订阅配置文件命名空间。现有的配置文件和 `auth.order.openai-codex` 仍然可用。 |
| `codex` 插件                         | 插件                      | 捆绑的 OpenClaw 插件，提供原生 Codex 应用服务器运行时和 `/codex` 聊天控件。                         |
| 提供商/模型 `agentRuntime.id: codex` | 代理运行时                | 为匹配的嵌入式轮次强制使用原生 Codex 应用服务器容器。                                               |
| `/codex ...`                         | 聊天命令集                | 从对话中绑定/控制 Codex 应用服务器线程。                                                            |
| `runtime: "acp", agentId: "codex"`   | ACP 会话路由              | 通过 ACP/acpx 运行 Codex 的显式回退路径。                                                           |

这意味着配置可以有意包含 `openai/*` 模型引用，同时身份验证配置文件仍指向 Codex 兼容的凭据。对于新配置，建议使用 `auth.order.openai`；现有的 `openai-codex:*` 配置文件和 `auth.order.openai-codex` 仍然受支持。`openclaw doctor --fix` 会将旧版 `openai-codex/*` 模型引用重写为规范的 OpenAI 模型路由。

<Note>GPT-5.5 可通过直接 OpenAI Platform API-key 访问以及订阅/OAuth 路由获得。对于 ChatGPT/Codex 订阅和原生 Codex 执行，请使用 `openai/gpt-5.5`；未设置的运行时配置现在会为 OpenAI 代理轮次选择 Codex 工具。仅当您希望为 OpenAI 代理模型进行直接 API-key 身份验证时，才使用 API OpenAI-key 配置文件。</Note>

<Note>OpenAI 代理模型轮次需要捆绑的 Codex 应用服务器插件。显式 PI 运行时配置仍然作为可选的兼容性路由提供。当使用 `openai-codex` 身份验证配置文件显式选择 PI 时，OpenClaw 会将公共模型引用保持为 `openai/*`，并通过旧版 Codex 身份验证传输在内部路由 PI。运行 `openclaw doctor --fix` 以修复过时的 `openai-codex/*`、`codex-cli/*` 或并非来自显式运行时配置的旧 PI 会话固定。</Note>

## OpenClaw 功能覆盖

| OpenAI 功能            | OpenClaw 表面                                                                | 状态                               |
| ---------------------- | ---------------------------------------------------------------------------- | ---------------------------------- |
| 聊天 / 响应            | `openai/<model>` 模型提供商                                                  | 是                                 |
| Codex 订阅模型         | `openai/<model>` with `openai-codex`OAuth OAuth                              | 是                                 |
| 传统 Codex 模型引用    | `openai-codex/<model>` or `codex-cli/<model>`                                | 由 doctor 修复为 `openai/<model>`  |
| Codex 应用服务器驱动器 | `openai/<model>`，其中省略了 runtime 或 提供商/模型 `agentRuntime.id: codex` | 是                                 |
| 服务器端网页搜索       | 原生 OpenAI 响应工具                                                         | 是，当启用网页搜索且未固定提供商时 |
| 图像                   | `image_generate`                                                             | 是                                 |
| 视频                   | `video_generate`                                                             | 是                                 |
| 文本转语音             | `messages.tts.provider: "openai"` / `tts`                                    | 是                                 |
| 批量语音转文本         | `tools.media.audio` / 媒体理解                                               | 是                                 |
| 流式语音转文本         | 语音呼叫 `streaming.provider: "openai"`                                      | 是                                 |
| 实时语音               | 语音呼叫 `realtime.provider: "openai"` / 控制界面对话                        | 是                                 |
| 嵌入                   | 内存嵌入提供商                                                               | 是                                 |

## 内存嵌入

OpenClaw 可以使用 OpenAI 或兼容 OpenAI 的嵌入端点来进行
OpenClawOpenAIOpenAI`memory_search` 索引和查询嵌入：

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

对于需要非对称嵌入标签的兼容 OpenAI 端点，请在 `memorySearch`OpenAI 下设置
OpenClaw`queryInputType` 和 `documentInputType`。OpenClaw 会将这些作为特定于提供商的
`input_type` 请求字段进行转发：查询嵌入使用
`queryInputType`；索引的内存块和批量索引使用
`documentInputType`。有关完整示例，请参阅 [Memory configuration reference](/zh/reference/memory-config#provider-specific-config)。

## 入门指南

选择您首选的身份验证方法并按照设置步骤进行操作。

<Tabs>
  <Tab title="APIOpenAIAPI 密钥 (OpenAI 平台)"API>
    **最适用于：** 直接的 API 访问和基于用量的计费。

    <Steps>
      <Step title="API获取您的 API 密钥"APIOpenAI>
        从 [OpenAI 平台控制台](https://platform.openai.com/api-keys) 创建或复制一个 API 密钥。
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
      <Step title="验证模型可用性">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用              | 运行时配置             | 路由                       | 认证             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | 省略 / 提供商/模型 `agentRuntime.id: "codex"`OpenAI | Codex app-server harness | Codex-compatible OpenAI profile |
    | `openai/gpt-5.4-mini` | 省略 / 提供商/模型 `agentRuntime.id: "codex"`OpenAI | Codex app-server harness | Codex-compatible OpenAI profile |
    | `openai/gpt-5.5`      | 提供商/模型 `agentRuntime.id: "pi"`              | PI embedded runtime      | `openai` profile or selected `openai-codex` profile |

    <Note>
    `openai/*`APIAPI agent 模型使用 Codex app-server harness。要为 agent 模型使用 API 密钥
    认证，请创建一个 Codex-compatible API 密钥配置文件，并使用 `auth.order.openai` 对其进行排序；`OPENAI_API_KEY`OpenAIAPI 仍然是
    非 agent OpenAI API 表面的直接回退选项。较旧的 `auth.order.openai-codex` 条目仍然
    有效。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```OpenAIAPI

    要尝试 OpenAI API 中 ChatGPT 当前的 Instant 模型，请将模型
    设置为 `openai/chat-latest`：

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest`OpenAI 是一个动态别名。OpenAI 将其记录为 ChatGPT 中使用的最新 Instant
    模型，并建议在生产环境 API 使用中使用 `gpt-5.5`API，因此，除非您明确需要该
    别名行为，否则请保持 `openai/gpt-5.5` 为稳定的默认值。该别名目前仅接受 `medium`OpenClawOpenAIOpenClaw 文本详细程度，因此
    OpenClaw 会针对此模型规范化的不兼容的 OpenAI 文本详细程度覆盖。

    <Warning>
    OpenClaw **不** 暴露 `openai/gpt-5.3-codex-spark`OpenAIAPI。实时的 OpenAI API 请求会拒绝该模型，并且当前的 Codex 目录也不暴露它。
    </Warning>

  </Tab>

  <Tab title="Codex subscription">
    **Best for:** 使用您的 ChatGPT/Codex 订阅配合原生 Codex 应用服务器执行，而不是使用单独的 API 密钥。Codex 云端需要 ChatGPT 登录。

    <Steps>
      <Step title="Run Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        对于无头或对回调不友好的设置，添加 `--device-code` 以使用 ChatGPT 设备码流程登录，而不是本地主机浏览器回调：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Use the canonical OpenAI 模型 route">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        默认路径不需要运行时配置。OpenAI 代理会自动选择原生 Codex 应用服务器运行时，并且在选择此路由时，OpenClaw 会安装或修复捆绑的 Codex 插件。
      </Step>
      <Step title="Verify Codex auth is available">
        ```bash
        openclaw models list --provider openai-codex
        ```

        网关运行后，在聊天中发送 `/codex status` 或 `/codex models` 以验证原生应用服务器运行时。
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 运行时配置 | 路由 | 身份验证 |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | 省略 / 提供商/模型 `agentRuntime.id: "codex"` | 原生 Codex 应用服务器工具 | Codex 登录或排序的 `openai` 身份验证配置文件 |
    | `openai/gpt-5.5` | 提供商/模型 `agentRuntime.id: "pi"` | 带有内部 Codex-auth 传输的 PI 嵌入式运行时 | 选定的 `openai-codex` 配置文件 |
    | `openai-codex/gpt-5.5` | 由 doctor 修复 | 重写为 `openai/gpt-5.5` 的旧版路由 | 现有的 `openai-codex` 配置文件 |
    | `codex-cli/gpt-5.5` | 由 doctor 修复 | 重写为 `openai/gpt-5.5` 的旧版 CLI 路由 | Codex 应用服务器身份验证 |

    <Warning>
    对于新的订阅支持的代理配置，请首选 `openai/gpt-5.5`。较旧的
    `openai-codex/gpt-*` 引用是旧版 PI 路由，而非原生 Codex 运行时路径；当您想要将其迁移到规范的
    `openai/*` 引用时，请运行 `openclaw doctor --fix`。
    </Warning>

    <Note>
    `openai-codex/*` 模型前缀是由 doctor 修复的旧版配置。对于
    常见的订阅加原生运行时设置，请使用 Codex 身份验证登录，但将模型引用保留为 `openai/gpt-5.5`。新配置应将 OpenAI
    代理身份验证顺序置于 `auth.order.openai` 下；较旧的 `auth.order.openai-codex`
    条目仍然有效。
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

    使用 API 密钥备份时，将模型保持在 `openai/gpt-5.5` 上，并将
    身份验证顺序置于 `openai` 下。OpenClaw 将首先尝试订阅，然后
    尝试 API 密钥，同时保持 Codex 工具激活状态：

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
    新手引导不再从 `~/.codex` 导入 OAuth 材料。请使用浏览器 OAuth（默认）或上述设备码流程登录 —— OpenClaw 在其自己的代理身份验证存储中管理生成的凭据。
    </Note>

    ### 检查并恢复 Codex OAuth 路由

    使用这些命令查看您的默认代理正在使用哪种模型、运行时和身份验证路由：

    ```bash
    openclaw models status
    openclaw models auth list --provider openai-codex
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    对于特定代理，添加 `--agent <id>`：

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai-codex
    ```

    如果较旧的配置仍然有 `openai-codex/gpt-*` 或没有显式运行时配置的过时 OpenAI PI
    会话固定，请对其进行修复：

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    如果 `models auth list --provider openai-codex` 显示没有可用的配置文件，请重新
    登录：

    ```bash
    openclaw models auth login --provider openai-codex
    openclaw models status --probe --probe-provider openai-codex
    ```

    当您希望在同一代理中进行多次 Codex OAuth 登录并希望通过身份验证顺序或 `/model ...@<profileId>` 来控制它们时，请使用 `--profile-id`：

    ```bash
    openclaw models auth login --provider openai-codex --profile-id openai-codex:ritsuko
    openclaw models auth login --provider openai-codex --profile-id openai-codex:lain
    ```

    `openai/*` 是 OpenAI 代理通过 Codex 调用的模型路由。
    `openai-codex` 身份验证/配置文件提供商 ID 对现有
    配置文件和 CLI 列表仍然有效。

    ### 状态指示器

    聊天 `/status` 显示当前会话处于活动状态的模型运行时。
    捆绑的 Codex 应用服务器工具对于
    OpenAI 代理模型调用显示为 `Runtime: OpenAI Codex`。过时的 PI 会话固定将被修复为 Codex，除非
    配置显式固定了 PI。

    ### Doctor 警告

    如果 `openai-codex/*` 路由或过时的 OpenAI PI 固定保留在配置或
    会话状态中，`openclaw doctor --fix` 会将它们重写为 `openai/*` 并使用
    Codex 运行时，除非显式配置了 PI。

    ### 上下文窗口上限

    OpenClaw 将模型元数据和运行时上下文上限视为独立的值。

    对于通过 Codex OAuth 目录的 `openai/gpt-5.5`：

    - 原生 `contextWindow`：`1000000`
    - 默认运行时 `contextTokens` 上限：`272000`

    较小的默认上限在实践中具有更好的延迟和质量特性。使用 `contextTokens` 覆盖它：

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
    使用 `contextWindow` 声明原生模型元数据。使用 `contextTokens` 限制运行时上下文预算。
    </Note>

    ### 目录恢复

    OpenClaw 在存在时使用上游 Codex 目录元数据作为 `gpt-5.5`。如果实时 Codex 发现忽略了
    `gpt-5.5` 行，而
    账户已通过身份验证，OpenClaw 将合成该 OAuth 模型行，以便
    定时任务、子代理和配置的默认模型运行不会因
    `Unknown model` 而失败。

  </Tab>
</Tabs>

## 原生 Codex 应用服务器认证

原生 Codex 应用服务器工具使用 `openai/*` 模型引用以及省略的运行时配置或提供商/模型 `agentRuntime.id: "codex"`OpenClaw，但其身份验证仍基于帐户。OpenClaw 按以下顺序选择身份验证：

1. 为代理排序的 OpenAI 身份验证配置文件，最好位于
   OpenAI`auth.order.openai` 下。现有的 `openai-codex:*` 配置文件和
   `auth.order.openai-codex` 对较旧的安装仍然有效。
2. 应用服务器的现有账户，例如本地 Codex CLI ChatGPT 登录。
3. 仅适用于本地 stdio 应用服务器启动，即 `CODEX_API_KEY`，然后是
   `OPENAI_API_KEY`OpenAI，当应用服务器报告无帐户且仍然需要
   OpenAI 身份验证时。

这意味着本地 ChatGPT/Codex 订阅登录不会被仅仅
因为网关进程也有用于直接 OpenAI 模型
或嵌入的 `OPENAI_API_KEY`OpenAIAPIOpenClaw 而取代。环境 API 密钥回退仅是本地 stdio 无帐户路径；它
不会发送到 WebSocket 应用服务器连接。当选择订阅风格的 Codex
配置文件时，OpenClaw 还会将 `CODEX_API_KEY` 和 `OPENAI_API_KEY`RPCOpenClaw
排除在生成的 stdio 应用服务器子进程之外，并通过应用服务器登录 RPC
发送所选凭据。当该订阅配置文件被 Codex
使用限制阻止时，OpenClaw 可以轮换到下一个排序的 `openai:*`API API 密钥
配置文件，而无需更改所选模型或脱离 Codex
工具。一旦订阅重置时间过去，订阅配置文件将再次
变为可用。

## 图像生成

捆绑的 `openai` 插件通过 `image_generate`OpenAIAPIOAuth 工具注册图像生成。
它通过同一个 `openai/gpt-image-2` 模型引用支持 OpenAI API 密钥图像生成和 Codex OAuth 图像
生成。

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

<Note>请参阅 [Image Generation](/zh/tools/image-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

`gpt-image-2` 是 OpenAI 文本生成图像和图像编辑的默认模型。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可用作显式模型覆盖。使用 `openai/gpt-image-1.5` 生成透明背景的 PNG/WebP 输出；当前的 `gpt-image-2` API 拒绝 `background: "transparent"`。

对于透明背景请求，代理应使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"` 以及 `background: "transparent"` 调用 `image_generate`；较旧的 `openai.background` 提供商选项仍被接受。OpenClaw 还通过将默认 `openai/gpt-image-2` 透明请求重写为 `gpt-image-1.5` 来保护公共 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自定义 OpenAI 兼容端点将保留其配置的部署/模型名称。

无头 CLI 运行也公开了相同的设置：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

从输入文件开始时，将相同的 `--output-format` 和 `--background` 标志与 `openclaw infer image edit` 一起使用。
`--openai-background` 仍可作为 OpenAI 专用别名使用。

对于 Codex OAuth 安装，请保留相同的 `openai/gpt-image-2` 引用。当配置了 `openai-codex` OAuth 配置文件时，OpenClaw 会解析该存储的 OAuth 访问令牌，并通过 Codex Responses 后端发送图像请求。它不会首先尝试 `OPENAI_API_KEY` 或默默回退到该请求的 API 密钥。当您需要直接的 API Images OpenAI 路由时，请使用 API 密钥、自定义基本 URL 或 Azure 端点显式配置 `models.providers.openai`。
如果该自定义图像端点位于受信任的 LAN/专用地址上，请同时设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非存在此选择性加入选项，否则 OpenClaw 会阻止专用/内部 OpenAI 兼容的图像端点。

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

捆绑的 `openai` 插件通过 `video_generate` 工具注册视频生成。

| 功能     | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 默认模型 | `openai/sora-2`                                                          |
| 模式     | 文本生成视频、图像生成视频、单个视频编辑                                 |
| 参考输入 | 1 张图像或 1 个视频                                                      |
| 尺寸覆盖 | 支持文本生成视频和图像生成视频                                           |
| 其他覆盖 | `aspectRatio`、`resolution`、`audio`、`watermark` 将被忽略并附带工具警告 |

OpenAI 图像生成视频请求使用带有图像 `input_reference` 的 `POST /v1/videos`。单视频编辑使用带有 `video` 字段中上传视频的 `POST /v1/videos/edits`。

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

OpenClaw 为 OpenClaw 组装的提示词表面上的 GPT-5 系列运行添加了共享的 GPT-5 提示词贡献。它按模型 ID 应用，因此 PI/提供商路由（例如旧版修复前引用 (`openai-codex/gpt-5.5`)、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 和其他兼容的 GPT-5 引用）会接收相同的覆盖。较旧的 GPT-4.x 模型则不会。

打包的本地 Codex 驱动程序不会通过 Codex 应用服务器开发者指令接收此 OpenClaw GPT-5 覆盖层。本地 Codex 保留 Codex 拥有的基础、模型、个性和项目文档行为；OpenClaw 仅贡献运行时上下文，例如渠道交付、OpenClaw 动态工具、ACP 委托、工作区上下文和 OpenClaw 技能。

GPT-5 贡献为匹配 OpenClaw 组合的提示词添加了标记的行为契约，包括人格持久性、执行安全性、工具纪律、输出形状、完成检查和验证。特定渠道的回复和静默消息行为保留在共享的 OpenClaw 系统提示词和出站交付策略中。友好的交互风格层是独立且可配置的。

| 值                  | 效果                 |
| ------------------- | -------------------- |
| `"friendly"` (默认) | 启用友好的交互风格层 |
| `"on"`              | `"friendly"` 的别名  |
| `"off"`             | 仅禁用友好风格层     |

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
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>值在运行时不区分大小写，因此 `"Off"` 和 `"off"` 均会禁用友好风格层。</Tip>

<Note>当未设置共享 `agents.defaults.promptOverlays.gpt5.personality` 设置时，仍会读取旧版 `plugins.entries.openai.config.personality` 作为兼容性回退方案。</Note>

## 语音和语音

<AccordionGroup>
  <Accordion title="语音合成 (TTS)">
    捆绑的 `openai` 插件为 `messages.tts` 表面注册了语音合成功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 语音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | (未设置) |
    | 指令 | `messages.tts.providers.openai.instructions` | (未设置，仅限 `gpt-4o-mini-tts`) |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音笔记为 `opus`，文件为 `mp3`API |
    | API 密钥 | `messages.tts.providers.openai.apiKey` | 回退到 `OPENAI_API_KEY` |
    | Base URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | 额外正文 | `messages.tts.providers.openai.extraBody` / `extra_body` | (未设置) |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用语音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 在 OpenClaw 生成字段之后被合并到 `/audio/speech` 请求 JSON 中，因此请将其用于需要额外密钥（如 `lang`）的 OpenAI 兼容端点。原型密钥将被忽略。

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
    设置 `OPENAI_TTS_BASE_URL` 可覆盖 TTS Base URL，而不会影响聊天 API 端点。OpenAIAPI TTS 仍通过 API 密钥进行配置；对于仅限 OAuth 的实时对话，请使用 Realtime 语音路径，而不是代理模式 STT -> TTS 语音。
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录表面注册了批量语音转文字功能。

    - 默认模型：`gpt-4o-transcribe`
    - 端点：OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：multipart 音频文件上传
    - 只要入站音频转录使用 `tools.media.audio`，OpenClaw 均提供支持，包括 Discord 语音频道片段和频道音频附件

    要强制为入站音频转录使用 OpenAI：

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

    如果共享音频媒体配置或单次转录请求提供了语言和提示词，它们将被转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    附带的 `openai` 插件为语音通话插件注册实时转录功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | (未设置) |
    | 提示词 | `...openai.prompt` | (未设置) |
    | 静音时长 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 认证 | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai-codex` OAuth | API 密钥直接连接；OAuth 会生成实时转录客户端密钥 |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，采用 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音频。当仅配置了 `openai-codex` OAuthGateway(网关) 时，Gateway 会在打开 WebSocket 之前生成一个临时的实时转录客户端密钥。此流式提供商用于语音通话的实时转录路径；Discord 语音目前录制短片段，并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="实时语音">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时语音功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | 语音 | `...openai.voice` | `alloy` |
    | Temperature (Azure 部署桥接) | `...openai.temperature` | `0.8` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 静音持续时间 | `...openai.silenceDurationMs` | `500` |
    | 前缀填充 | `...openai.prefixPaddingMs` | `300` |
    | 推理强度 | `...openai.reasoningEffort` | (未设置) |
    | 认证 | `...openai.apiKey`, `OPENAI_API_KEY`, 或 `openai-codex` OAuth | Browser Talk 和非 Azure 后端桥接可以使用 Codex OAuth |

    适用于 `gpt-realtime-2` 的可用内置 Realtime 语音有：`alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`。
    OpenAI 推荐使用 `marin` 和 `cedar` 以获得最佳的 Realtime 质量。这
    是与上述 Text-to-speech 语音不同的集合；请勿假设 TTS
    语音（例如 `fable`, `nova`, 或 `onyx`）对 Realtime 会话有效。

    <Note>
    后端 OpenAI realtime 桥接使用 GA Realtime WebSocket 会话形态，这不接受 `session.temperature`。Azure OpenAI 部署仍可通过 `azureEndpoint` 和 `azureDeployment` 使用，并保持与部署兼容的会话形态。支持双向工具调用和 G.711 u-law 音频。
    </Note>

    <Note>
    实时语音是在创建会话时选择的。OpenAI 允许稍后更改
    大多数会话字段，但在该会话中
    模型已发出音频后无法更改语音。OpenClaw 目前将
    内置 Realtime 语音 ID 作为字符串公开。
    </Note>

    <Note>
    Control UI Talk 使用 OpenAI 浏览器实时会话，并带有由 Gateway(网关) 颁发的
    临时客户端密钥，以及针对
    OpenAI Realtime API 的直接浏览器 WebRTC SDP 交换。当未配置直接 OpenAI API 密钥时，
    Gateway(网关) 可以使用所选的 `openai-codex` OAuth
    配置文件来颁发该客户端密钥。Gateway(网关) 中继和 Voice Call 后端实时 WebSocket 桥接对原生 OAuth 端点使用相同的 OpenAI 回退。维护者实时
    验证可通过
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 获得；
    OpenAI 端点会验证后端 WebSocket 桥接和浏览器
    WebRTC SDP 交换，而无需记录密钥。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端点

内置的 `openai` 提供商可以通过覆盖基础 URL 来针对 Azure OpenAI 资源进行图像生成。在图像生成路径上，OpenClaw 检测 `models.providers.openai.baseUrl` 上的 Azure 主机名，并自动切换到 Azure 的请求格式。

<Note>Realtime voice uses a separate configuration path (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) and is not affected by `models.providers.openai.baseUrl`. See the **Realtime voice** accordion under [Voice and speech](#voice-and-speech) for its Azure settings.</Note>

在以下情况下使用 Azure OpenAI：

- 您已经拥有 Azure OpenAI 订阅、配额或企业协议
- 您需要 Azure 提供的区域数据驻留或合规性控制
- 您希望将流量保留在现有的 Azure 租户内

### 配置

要通过内置的 `openai` 提供商进行 Azure 图像生成，请将 `models.providers.openai.baseUrl` 指向您的 Azure 资源，并将 `apiKey` 设置为 Azure OpenAI 密钥（而不是 OpenAI 平台密钥）：

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

OpenClaw 可识别 Azure 图像生成路由的以下 Azure 主机后缀：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于已识别 Azure 主机上的图像生成请求，OpenClaw 会：

- 发送 `api-key` 标头而不是 `Authorization: Bearer`
- 使用部署范围的路径 (`/openai/deployments/{deployment}/...`)
- 将 `?api-version=...` 附加到每个请求
- 对 Azure 图像生成调用使用 600 秒的默认请求超时。每次调用的 `timeoutMs` 值仍会覆盖此默认值。

其他基础 URL（公共 OpenAI、OpenAI 兼容代理）保持标准的 OpenAI 图像请求格式。

<Note>`openai` 提供商的图像生成路径的 Azure 路由需要 OpenClaw 2026.4.22 或更高版本。早期版本会将任何自定义 `openai.baseUrl` 视为公共 OpenAI 端点，并且在 Azure 图像部署上将会失败。</Note>

### API 版本

设置 `AZURE_OPENAI_API_VERSION` 以固定 Azure 图像生成路径的特定 Azure 预览版或正式版 (GA) 版本：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

当未设置变量时，默认值为 `2024-12-01-preview`。

### 模型名称是部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑的 `openai` 提供商路由的 Azure 图像生成请求，
OpenClaw 中的 `model` 字段必须是您在 Azure 门户中配置的 **Azure 部署名称**，而不是
公共 OpenAI 模型 ID。

如果您创建一个名为 `gpt-image-2-prod` 的部署来提供 `gpt-image-2`：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

同样的部署名称规则适用于通过捆绑的 `openai` 提供商路由的图像生成调用。

### 区域可用性

Azure 图像生成目前仅在部分区域可用
（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、
`uaenorth`）。在创建部署之前，请查看 Microsoft 的当前区域列表，并确认您的区域提供特定模型。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。
Azure 可能会拒绝公共 OpenAI 允许的选项（例如 OpenAIOpenAIOpenAI`background` 上的某些
`gpt-image-2`OpenClaw 值），或者仅在特定模型版本上公开这些选项。
这些差异源于 Azure 和基础模型，而非 OpenClaw。如果 Azure 请求因验证错误而失败，
请检查 Azure 门户中您的特定部署和 API 版本支持的参数集。

<Note>
Azure OpenAI 使用原生传输和兼容行为，但不会接收
OpenClaw 的隐藏归属标头 — 请参阅 [Advanced configuration](OpenAIOpenClawOpenAI#advanced-configuration) 下的
**Native vs OpenAI-compatible routes**（原生与 OpenAI 兼容路由）折叠面板。

对于 Azure 上的聊天或 Responses 流量（不包括图像生成），请使用
新手引导流程或专用的 Azure 提供商配置 — 单靠 `openai.baseUrl`API
不会采用 Azure API/auth 形式。存在一个单独的
`azure-openai-responses/*` 提供商；请参阅下面的
Server-side compaction（服务端压缩）折叠面板。

</Note>

## Advanced configuration

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw 优先使用 WebSocket，SSE 作为回退 (`"auto"`)，用于 `openai/*`。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前重试一次早期的 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级约 60 秒，并在冷却期间使用 SSE
    - 附加稳定的会话和轮次标识标头，用于重试和重新连接
    - 跨传输变体标准化使用计数器 (`input_tokens` / `prompt_tokens`)

    | Value | Behavior |
    |-------|----------|
    | `"auto"` (default) | WebSocket first, SSE fallback |
    | `"sse"` | Force SSE only |
    | `"websocket"` | Force WebSocket only |

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
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Fast mode">
    OpenClaw 为 `openai/*` 提供了一个共享的快速模式开关：

    - **Chat/UI:** `/fast status|on|off`
    - **Config:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用后，OpenClaw 将快速模式映射到 OpenAI 优先处理 (`service_tier = "priority"`)。现有的 `service_tier` 值将被保留，快速模式不会重写 `reasoning` 或 `text.verbosity`。

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
    Session overrides win over config. Clearing the 会话 override in the Sessions UI returns the 会话 to the configured default.
    </Note>

  </Accordion>

  <Accordion title="优先处理 (service_tier)"OpenAIAPI>
    OpenAI 的 API 通过 `service_tier`OpenClaw 暴露了优先处理功能。在 OpenClaw 中按模型进行设置：

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
    `serviceTier`OpenAI 仅被转发到原生 OpenAI 端点 (`api.openai.com`) 和原生 Codex 端点 (`chatgpt.com/backend-api`OpenClaw)。如果您通过代理路由任一提供商，OpenClaw 将保持 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="服务端压缩 (Responses API)">
    对于直接的 OpenAI Responses 模型（`openai/*` 上的 `api.openai.com`），OpenAI 插件的 Pi-harness 流包装器会自动启用服务端压缩：

    - 强制启用 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（或者在不可用时使用 `80000`）

    这适用于内置的 Pi harness 路径以及嵌入式运行所使用的 OpenAI 提供商钩子。原生 Codex 应用服务器 harness 通过 Codex 管理其自己的上下文，并由 OpenAI 的默认代理路由或提供商/模型运行时策略进行配置。

    <Tabs>
      <Tab title="显式启用">
        适用于兼容的端点，例如 Azure OpenAI Responses：

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
    `responsesServerCompaction` 仅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍然会强制启用 `store: true`，除非兼容性设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    对于在 `openai/*`OpenClaw 上运行的 GPT-5 系列，OpenClaw 可以使用更严格的嵌入式执行合约：

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
    - 不再将仅计划的轮次视为成功的进度，此时有工具操作可用
    - 使用立即行动的引导重试该轮次
    - 针对实质性工作自动启用 `update_plan`OpenAI
    - 如果模型持续计划而不采取行动，则呈现明确的阻塞状态

    <Note>
    仅适用于 OpenAI 和 Codex GPT-5 系列运行。其他提供商和较旧的模型系列保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="OpenAINative vs OpenAI-compatible routes"OpenClawOpenAIOpenAIOpenAI>
    OpenClaw 将直接的 OpenAI、Codex 和 Azure OpenAI 端点与通用的 OpenAI 兼容 `/v1` 代理区别对待：

    **原生路由** (`openai/*`OpenAI, Azure OpenAI):
    - 仅对支持 OpenAI `none` 计划的模型保留 `reasoning: { effort: "none" }`OpenAI
    - 对于拒绝 `reasoning.effort: "none"`OpenAI 的模型或代理，省略已禁用的推理
    - 默认将工具架构设置为严格模式
    - 仅在经过验证的原生主机上附加隐藏的归属标头
    - 保留 OpenAI 专用的请求塑形 (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **代理/兼容路由：**
    - 使用较宽松的兼容行为
    - 从非原生 `openai-completions` 载荷中剥离 Completions `store`
    - 接受用于 OpenAI 兼容 Completions 代理的高级 `params.extra_body`/`params.extraBody`OpenAI 透传 JSON
    - 接受用于 OpenAI 兼容 Completions 代理（如 vLLM）的 `params.chat_template_kwargs`OpenAIOpenAI
    - 不强制执行严格的工具架构或仅限原生的标头

    Azure OpenAI 使用原生传输和兼容行为，但不会接收隐藏的归属标头。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Image generation" href="/zh/tools/image-generation" icon="image">
    共享的图像工具参数和提供商选择。
  </Card>
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享的 video 工具参数和提供商选择。
  </Card>
  <Card title="OAuthOAuth and auth" href="/zh/gateway/authentication" icon="key">
    Auth 详细信息和凭据重用规则。
  </Card>
</CardGroup>
