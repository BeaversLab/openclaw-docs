---
summary: "OpenAIAPIOpenClaw在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAIOpenAI"
---

OpenAI 为 GPT 模型提供开发者 API，并且 Codex 也可以通过 OpenAI 的 Codex 客户端作为 ChatGPT 计划的编码代理使用。OpenClaw 对这两种身份验证形状使用同一个提供商 ID，OpenAIOpenAIOpenClaw`openai`。

OpenClaw 使用 OpenClaw`openai/*`OpenAIOpenAIOpenAIAPIOpenAI 作为 OpenAI 模型的规范路由。嵌入式代理默认开启通过原生 Codex 应用服务器运行时运行的 OpenAI 模型；直接的 OpenAI API 密钥身份验证仍可用于非代理 OpenAI 表面，例如图像、嵌入、语音和实时功能。

- **代理模型** - 通过 Codex 运行时的 `openai/*`OpenAIAPIAPI 模型；登录 Codex 身份验证以使用 ChatGPT/Codex 订阅，或者当您有意使用 API 密钥身份验证时，配置一个与 Codex 兼容的 OpenAI API 密钥备份。
- **非代理 OpenAI API** - 通过 OpenAIOpenAI`OPENAI_API_KEY`OpenAIAPI 或 OpenAI API 密钥新手引导，使用基于使用量的计费直接访问 OpenAI 平台。
- **旧版配置** - 旧的 Codex 模型引用由 `openclaw doctor --fix` 修复为 `openai/*` 加上 Codex 运行时。

OpenAI 明确支持在外部工具和工作流程（如 OpenClaw）中使用订阅 OAuth。

提供商、模型、运行时和渠道是独立的层级。如果这些标签混在一起，请在更改配置之前阅读 [代理运行时](/zh/concepts/agent-runtimes)。

## 快速选择

| 目标                                          | 使用                                                   | 备注                                                                     |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| ChatGPT/Codex 订阅搭配原生 Codex 运行时       | `openai/gpt-5.5`                                       | 默认的 OpenAI 代理设置。使用 Codex 认证登录。                            |
| 代理模型的直接 API 密钥计费                   | `openai/gpt-5.5`API 加上 Codex 兼容的 API 密钥配置文件 | 使用 `auth.order.openai` 将备份置于订阅身份验证之后。                    |
| 通过显式 APIOpenClaw 密钥直接计费             | `openai/gpt-5.5` 加上提供商/模型运行时 `openclaw`      | 选择一个正常的 `openai`API API 密钥配置文件。                            |
| 最新的 ChatGPT Instant API 别名               | `openai/chat-latest`                                   | 仅限直接 API 密钥。用于实验的变动别名，而非默认值。                      |
| 通过 OpenClaw 进行 ChatGPT/Codex 订阅身份验证 | `openai/gpt-5.5` 加上提供商/模型运行时 `openclaw`      | 为兼容性路由选择一个 `openai`OAuth OAuth 配置文件。                      |
| 图像生成或编辑                                | `openai/gpt-image-2`                                   | 适用于 `OPENAI_API_KEY`OpenAIOAuth 或 OpenAI Codex OAuth。               |
| 透明背景图像                                  | `openai/gpt-image-1.5`                                 | 使用 `outputFormat=png` 或 `webp` 以及 `openai.background=transparent`。 |

## 命名映射

名称相似但不可互换：

| 您看到的名称                         | 层级         | 含义                                                                         |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------- |
| `openai`                             | 提供商前缀   | 规范的 OpenAI 模型路由；代理轮次使用 Codex 运行时。                          |
| 旧的 OpenAI Codex 前缀               | 旧版前缀     | 较旧的模型/配置文件命名空间。`openclaw doctor --fix` 会将其迁移到 `openai`。 |
| `codex` 插件                         | 插件         | 捆绑的 OpenClaw 插件，提供原生 Codex 应用服务器运行时和 `/codex` 聊天控件。  |
| 提供商/模型 `agentRuntime.id: codex` | 代理运行时   | 为匹配的嵌入式轮次强制使用原生 Codex 应用服务器容器。                        |
| `/codex ...`                         | 聊天命令集   | 从对话中绑定/控制 Codex 应用服务器线程。                                     |
| `runtime: "acp", agentId: "codex"`   | ACP 会话路由 | 通过 ACP/acpx 运行 Codex 的显式回退路径。                                    |

这意味着配置可以有意识地包含 `openai/*` 模型引用，而身份验证配置文件指向 API 密钥或 ChatGPT/Codex OAuth 凭据。使用 `auth.order.openai` 进行配置；`openclaw doctor --fix` 会将旧版
Codex 模型引用、旧版 Codex 身份验证配置文件 ID 以及
旧版 Codex 身份验证顺序重写为 OpenAI 的规范路由。

<Note>GPT-5.5 既可通过直接访问 OpenAI 平台 API 密钥获得， 也可通过订阅/OAuth 路由获得。对于 ChatGPT/Codex 订阅以及原生 Codex 执行，请使用 `openai/gpt-5.5`；未设置的运行时配置现在会为 OpenAI 代理轮次选择 Codex harness。仅当您希望为 OpenAI 代理模型使用直接 API 密钥身份验证时，才使用 API OpenAI 密钥配置文件。</Note>

<Note>OpenAI 代理模型轮次需要捆绑的 Codex 应用服务器插件。显式的 OpenClaw 运行时配置仍然可作为可选的兼容性路由。当 OpenClaw 通过 `openai` OAuth 配置文件被显式选中时，OpenClaw 会将 公共模型引用保持为 `openai/*`，并通过 Codex 身份验证 传输在内部进行路由。运行 `openclaw doctor --fix` 以修复过时的 旧版 Codex 模型引用、`codex-cli/*` 或并非来自 显式运行时配置的旧运行时会话固定。</Note>

## OpenClaw 功能覆盖

| OpenAI 功能            | OpenClaw 表面                                                                            | 状态                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 聊天 / 响应            | `openai/<model>` 模型提供商                                                              | 是                                                       |
| Codex 订阅模型         | `openai/<model>` 搭配 OpenAI OAuth                                                       | 是                                                       |
| 传统 Codex 模型引用    | 旧版 Codex 模型引用或 `codex-cli/<model>`                                                | 由 doctor 修复为 `openai/<model>`                        |
| Codex 应用服务器驱动器 | `openai/<model>` 且省略了 runtime 或 提供商/模型 `agentRuntime.id: codex`                | 是                                                       |
| 服务器端网页搜索       | 原生 OpenAI 响应工具                                                                     | 是，当启用网页搜索且未固定提供商时                       |
| 图像                   | `image_generate`                                                                         | 是                                                       |
| 视频                   | `video_generate`                                                                         | 是                                                       |
| 文本转语音             | `messages.tts.provider: "openai"` / `tts`                                                | 是                                                       |
| 批量语音转文本         | `tools.media.audio` / 媒体理解                                                           | 是                                                       |
| 流式语音转文本         | 语音通话 `streaming.provider: "openai"`                                                  | 是                                                       |
| 实时语音               | 语音通话 `realtime.provider: "openai"` / 控制界面对话 `talk.realtime.provider: "openai"` | 是（需要 OpenAI Platform 额度，而非 Codex/ChatGPT 订阅） |
| 嵌入                   | 内存嵌入提供商                                                                           | 是                                                       |

<Note>
  OpenAI 实时语音（用于语音通话的 OpenAI`realtime.provider: "openai"` 和带有 `talk.realtime.provider: "openai"`OpenAIAPIOpenAIOpenAIOAuth 的控制界面对话）通过公共的 **OpenAI 平台实时 API** 进行，该 API 计费使用 OpenAI 平台额度，而非 Codex/ChatGPT 订阅配额。如果一个运行 Codex 支持的聊天模型正常的 OpenAI OAuth 帐户，如果同一个 OpenAI 组织未设置平台计费，仍可能在第一次实时交互时遇到 `insufficient_quota`OpenAI / "You exceeded your current quota" 错误。

解决方法：在 [platform.openai.com/account/billing](https://platform.openai.com/account/billing) 为您的实时凭证所属的组织充值平台额度。实时接受平台 `OPENAI_API_KEY`（通过 `talk.realtime.providers.openai.apiKey` 为控制界面对话配置，或通过 `plugins.entries.voice-call.config.realtime.providers.openai.apiKey` 为语音通话配置）或基础组织具有平台计费的 `openai`OAuthAPI OAuth 配置文件——两种方式都是通过平台 API 生成实时客户端密钥，因此无论哪种方式，组织都需要有资金支持的平台额度。对于聊天轮次，您仍然可以在同一个 OpenClaw 安装上使用 Codex 支持的 `openai/*`OpenClaw 模型；只有实时路由需要平台计费。

</Note>

## Memory embeddings

OpenClaw 可以使用 OpenAI 或兼容 OpenAI 的嵌入端点来进行 OpenClawOpenAIOpenAI`memory_search` 索引和查询嵌入：

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

对于需要非对称嵌入标签的 OpenAI 兼容端点，请在 `memorySearch` 下设置 `queryInputType` 和 `documentInputType`。OpenClaw 会将这些作为提供商特定的 `input_type` 请求字段进行转发：查询嵌入使用 `queryInputType`；索引的内存块和批量索引使用 `documentInputType`。有关完整示例，请参阅 [内存配置参考](/zh/reference/memory-config#provider-specific-config)。

## 入门指南

选择您偏好的身份验证方法并按照设置步骤进行操作。

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

    | 模型参考              | 运行时配置             | 路由                       | 认证             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omitted / 提供商/模型 `agentRuntime.id: "codex"`OpenAI | Codex app-server harness | Codex-compatible OpenAI profile |
    | `openai/gpt-5.4-mini` | omitted / 提供商/模型 `agentRuntime.id: "codex"`OpenAI | Codex app-server harness | Codex-compatible OpenAI profile |
    | `openai/gpt-5.5`      | 提供商/模型 `agentRuntime.id: "openclaw"`OpenClaw              | OpenClaw embedded runtime      | Selected `openai` profile |

    <Note>
    `openai/*`APIAPI 代理模型使用 Codex 应用服务器工具。要为代理模型使用 API 密钥认证，请创建一个 Codex 兼容的 API 密钥配置文件并使用 `auth.order.openai` 排序；`OPENAI_API_KEY`OpenAIAPI 仍然是非代理 OpenAI API 表面的直接回退。运行 `openclaw doctor --fix` 以迁移较旧的旧版 Codex 认证排序条目。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```OpenAIAPI

    要从 OpenAI API 尝试 ChatGPT 当前的 Instant 模型，请将模型设置为 `openai/chat-latest`：

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest`OpenAI 是一个动态别名。OpenAI 将其记录为 ChatGPT 中使用的最新 Instant 模型，并推荐 `gpt-5.5`API 用于生产 API 使用，因此请将 `openai/gpt-5.5` 保留为稳定的默认值，除非您明确需要该别名行为。该别名目前仅接受 `medium`OpenClawOpenAIOpenClaw 文本详细程度，因此 OpenClaw 会针对此模型规范化不兼容的 OpenAI 文本详细程度覆盖。

    <Warning>
    OpenClaw **不** 在直接 OpenAI API 密钥路由上暴露 `gpt-5.3-codex-spark`OpenAIAPI。它仅在您的登录账户暴露它时通过 Codex 订阅目录条目可用。
    </Warning>

  </Tab>

  <Tab title="Codex 订阅"API>
    **最适用于：** 使用您的 ChatGPT/Codex 订阅配合原生 Codex 应用服务器执行，而不是单独的 API 密钥。Codex 云端需要 ChatGPT 登录。

    <Steps>
      <Step title="OAuth运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai
        ```OAuth

        或直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai
        ```

        对于无头或对回调不友好的设置，添加 `--device-code` 以使用 ChatGPT 设备码流程登录，而不是本地浏览器回调：

        ```bash
        openclaw models auth login --provider openai --device-code
        ```
      </Step>
      <Step title="OpenAI使用规范的 OpenAI 模型路由">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```OpenAIOpenClaw

        默认路径不需要运行时配置。OpenAI 代理回合
        会自动选择原生 Codex 应用服务器运行时，当选择此路由时，OpenClaw
        会安装或修复捆绑的 Codex 插件。
      </Step>
      <Step title="验证 Codex 身份验证可用">
        ```bash
        openclaw models list --provider openai
        ```

        网关运行后，在聊天中发送 `/codex status` 或 `/codex models`
        以验证原生应用服务器运行时。
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 运行时配置 | 路由 | 身份验证 |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | 省略 / 提供商/模型 `agentRuntime.id: "codex"` | 原生 Codex 应用服务器控制 | Codex 登录或排序的 `openai` 身份验证配置文件 |
    | `openai/gpt-5.5` | 提供商/模型 `agentRuntime.id: "openclaw"`OpenClaw | OpenClaw 嵌入式运行时，内部 Codex-auth 传输 | 选定的 `openai`OAuth OAuth 配置文件 |
    | 旧版 Codex GPT-5.5 引用 | 由 doctor 修复 | 重写为 `openai/gpt-5.5`OpenAIOAuth 的旧版路由 | 已迁移的 OpenAI OAuth 配置文件 |
    | `codex-cli/gpt-5.5`CLI | 由 doctor 修复 | 重写为 `openai/gpt-5.5` 的旧版 CLI 路由 | Codex 应用服务器身份验证 |

    <Warning>
    对于新的订阅支持的代理配置，首选 `openai/gpt-5.5`OpenClaw。旧的
    旧版 Codex GPT 引用是旧版 OpenClaw 路由，而非原生 Codex 运行时
    路径；当您要将它们迁移到规范
    `openai/*` 引用时，请运行 `openclaw doctor --fix`。`gpt-5.3-codex-spark`OpenAIAPI 仍然仅限于其
    Codex 订阅目录中包含该模型的帐户；该模型的直接 OpenAI API 密钥
    和 Azure 引用仍然被抑制。
    </Warning>

    <Note>
    旧版 Codex 模型前缀是由 doctor 修复的旧版配置。对于
    常见的订阅加原生运行时设置，请使用 Codex 身份验证登录
    但将模型引用保留为 `openai/gpt-5.5`OpenAI。新配置应将 OpenAI
    代理身份验证顺序置于 `auth.order.openai` 下；doctor 会迁移
    旧的旧版 Codex 身份验证顺序条目。
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
    ```API

    使用 API 密钥备份时，请将模型保留在 `openai/gpt-5.5` 上，并将
    身份验证顺序置于 `openai`OpenClawAPI 下。OpenClaw 将首先尝试订阅，然后
    尝试 API 密钥，同时保持在 Codex 控制上：

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
            "openai:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```OAuth

    <Note>
    新手引导不再从 `~/.codex`OAuthOpenClawOAuth 导入 OAuth 材料。请使用浏览器 OAuth（默认）或上述设备码流程登录 —— OpenClaw 在其自己的代理身份验证存储中管理生成的凭据。
    </Note>

    ### 检查和恢复 Codex OAuth 路由

    使用这些命令查看您的默认
    代理正在使用哪个模型、运行时和身份验证路由：

    ```bash
    openclaw models status
    openclaw models auth list --provider openai
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    对于特定代理，添加 `--agent <id>`：

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai
    ```OpenAI

    如果较旧的配置仍有旧版 Codex GPT 引用或在没有显式运行时配置的情况下存在过时的 OpenAI 运行时
    会话固定，请修复它：

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    如果 `models auth list --provider openai` 显示没有可用的配置文件，请重新
    登录：

    ```bash
    openclaw models auth login --provider openai
    openclaw models status --probe --probe-provider openai
    ```

    当您希望在同一个代理中拥有多个 Codex OAuth 登录
    并希望稍后通过身份验证顺序或 `/model ...@<profileId>` 控制它们时，请使用 `--profile-id`OAuth：

    ```bash
    openclaw models auth login --provider openai --profile-id openai:ritsuko
    openclaw models auth login --provider openai --profile-id openai:lain
    ```

    `openai/*`OpenAI 是通过 Codex 进行 OpenAI 代理回合的模型路由。运行
    `openclaw doctor --fix`OpenAI 以迁移旧的旧版 OpenAI Codex 前缀配置文件 ID
    和顺序条目，然后再依赖配置文件排序。

    ### 状态指示器

    聊天 `/status` 显示当前会话激活的模型运行时。
    捆绑的 Codex 应用服务器控制显示为 `Runtime: OpenAI Codex`OpenAIOpenAIOpenClawOpenAI，用于
    OpenAI 代理模型回合。过时的 OpenAI 运行时会话固定将被修复为 Codex，除非
    配置显式固定了 OpenClaw。

    ### Doctor 警告

    如果配置或
    会话状态中仍然存在旧版 Codex 模型引用或过时的 OpenAI 运行时固定，`openclaw doctor --fix` 会将它们重写为 `openai/*`OpenClawOpenClaw 并使用
    Codex 运行时，除非显式配置了 OpenClaw。

    ### 上下文窗口上限

    OpenClaw 将模型元数据和运行时上下文上限视为单独的值。

    对于通过 Codex OAuth 目录的 `openai/gpt-5.5`OAuth：

    - 原生 `contextWindow`： `1000000`
    - 默认运行时 `contextTokens` 上限： `272000`

    较小的默认上限实际上具有更好的延迟和质量特征。使用 `contextTokens` 覆盖它：

    ```json5
    {
      models: {
        providers: {
          openai: {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 声明原生模型元数据。使用 `contextTokens`OpenClaw 限制运行时上下文预算。
    </Note>

    ### 目录恢复

    OpenClaw 在存在时使用上游 Codex 目录元数据作为 `gpt-5.5`。
    如果实时 Codex 发现省略了 `gpt-5.5`OpenClawOAuth 行，同时
    帐户已通过身份验证，OpenClaw 会综合该 OAuth 模型行，以便
    cron、子代理和配置的默认模型运行不会因
    `Unknown model` 而失败。

  </Tab>
</Tabs>

## 原生 Codex 应用服务器认证

原生 Codex 应用服务器连接器使用 `openai/*` 模型引用加上省略的运行时配置或提供商/模型 `agentRuntime.id: "codex"`OpenClaw，但其身份验证仍然是基于帐户的。OpenClaw 按以下顺序选择身份验证：

1. 针对代理的已排序 OpenAI 身份验证配置文件，最好位于
   OpenAI`auth.order.openai` 下。运行 `openclaw doctor --fix` 以迁移较旧的
   旧版 Codex 身份验证配置文件 ID 和旧版 Codex 身份验证顺序。
2. 应用服务器的现有账户，例如本地 Codex CLI ChatGPT 登录。
3. 仅针对本地 stdio 应用服务器启动，先 `CODEX_API_KEY`，然后
   `OPENAI_API_KEY`OpenAI，当应用服务器报告没有帐户但仍需要
   OpenAI 身份验证时。

这意味着，即使网关进程也拥有用于直接 OpenAI 模型
或嵌入的 `OPENAI_API_KEY`OpenAIAPIOpenClaw，本地 ChatGPT/Codex 订阅登录也不会仅仅因此而被替换。环境 API 密钥回退仅适用于本地 stdio 无帐户路径；它
不会发送到 WebSocket 应用服务器连接。当选择订阅风格的 Codex
配置文件时，OpenClaw 还会将 `CODEX_API_KEY` 和 `OPENAI_API_KEY`RPCOpenClaw
排除在衍生出的 stdio 应用服务器子进程之外，并通过应用服务器登录 RPC
发送所选凭据。当该订阅配置文件被 Codex
使用限制阻止时，OpenClaw 可以轮换到下一个已排序的 `openai:*`API API 密钥
配置文件，而无需更改所选模型或退出 Codex
连接器。一旦订阅重置时间过去，该订阅配置文件将再次变得可用。

## 图像生成

捆绑的 `openai` 插件通过 `image_generate`OpenAIAPIOAuth 工具注册图像生成。
它支持通过同一个 `openai/gpt-image-2` 模型引用进行 OpenAI API 密钥图像生成和 Codex OAuth 图像
生成。

| 功能                 | OpenAI API 密钥             | Codex OAuth                 |
| -------------------- | --------------------------- | --------------------------- |
| 模型参考             | `openai/gpt-image-2`        | `openai/gpt-image-2`        |
| 身份验证             | `OPENAI_API_KEY`            | OpenAI Codex OAuth 登录     |
| 传输                 | OpenAI 图像 API             | Codex Responses 后端        |
| 每次请求的最大图像数 | 4                           | 4                           |
| 编辑模式             | 已启用（最多 5 张参考图片） | 已启用（最多 5 张参考图片） |
| 尺寸覆盖             | 支持，包括 2K/4K 尺寸       | 支持，包括 2K/4K 尺寸       |
| 宽高比 / 分辨率      | 不转发至 OpenAI 图像 API    | 安全时映射到支持的尺寸      |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>请参阅 [图像生成](/zh/tools/image-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

`gpt-image-2`OpenAI 是 OpenAI 文本生成图像和图像编辑的默认模型。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可用作显式模型覆盖。使用 `openai/gpt-image-1.5` 获取透明背景的 PNG/WebP 输出；当前的 `gpt-image-2`API API 拒绝 `background: "transparent"`。

对于透明背景请求，代理应使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"` 以及 `background: "transparent"` 调用 `image_generate`；较旧的 `openai.background`OpenClawOpenAIOpenAIOAuth 提供商选项仍然被接受。OpenClaw 还通过将默认的 `openai/gpt-image-2` 透明请求重写为 `gpt-image-1.5`OpenAI 来保护公共 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自定义 OpenAI 兼容端点将保留其配置的部署/模型名称。

相同的设置也适用于无头 CLI 运行：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

当从输入文件开始时，将相同的 `--output-format` 和 `--background` 标志与 `openclaw infer image edit` 一起使用。
`--openai-background`OpenAI 仍可用作 OpenAI 专用别名。

对于 ChatGPT/Codex OAuth 安装，请保持相同的 `openai/gpt-image-2` 引用。当配置了 `openai` OAuth 配置文件时，OpenClaw 会解析该存储的 OAuth 访问令牌，并通过 Codex Responses 后端发送图像请求。它不会首先尝试 `OPENAI_API_KEY` 或静默回退到该请求的 API 密钥。当您需要直接的 API Images OpenAI 路由时，请使用 API 密钥、自定义基础 URL 或 Azure 端点显式配置 `models.providers.openai`。如果该自定义图像端点位于受信任的 LAN/专用地址上，请同时设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非存在此选择加入选项，否则 OpenClaw 会阻止专用/内部 OpenAI 兼容的图像端点。

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

| 能力     | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 默认模型 | `openai/sora-2`                                                          |
| 模式     | 文本生成视频、图像生成视频、单个视频编辑                                 |
| 参考输入 | 1 张图像或 1 个视频                                                      |
| 尺寸覆盖 | 支持文本生成视频和图像生成视频                                           |
| 其他覆盖 | `aspectRatio`、`resolution`、`audio`、`watermark` 将被忽略并显示工具警告 |

OpenAI 图生视频请求使用带有图像 `input_reference` 的 `POST /v1/videos`。单个视频编辑使用带有 `video` 字段中上传视频的 `POST /v1/videos/edits`。

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅[视频生成](/zh/tools/video-generation)。</Note>

## GPT-5 提示词贡献

OpenClaw 为 OpenClaw 组装的提示词表面上的 GPT-5 系列运行添加了共享的 GPT-5 提示词贡献。它按模型 ID 应用，因此 OpenClaw/提供商路由（如 legacy pre-repair 引用（legacy Codex GPT-5.5 引用）、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 和其他兼容的 GPT-5 引用）会收到相同的覆盖。较旧的 GPT-4.x 模型则不会。

捆绑的原生 Codex 控制装置不会通过 Codex 应用服务器开发者指令接收此 OpenClaw GPT-5 叠加层。原生 Codex 保留 Codex 拥有的基础、模型和项目文档行为，而 OpenClaw 会针对原生线程禁用 Codex 的内置个性，以便代理工作区个性文件保持权威。OpenClaw 仅贡献运行时上下文，例如渠道交付、OpenClaw 动态工具、ACP 委托、工作区上下文和 OpenClaw 技能。

GPT-5 贡献为匹配的 OpenClaw 组装提示词添加了带标签的行为合约，涉及人格持久性、执行安全性、工具纪律、输出形状、完成检查和验证。特定渠道的回复和静默消息行为保留在共享的 OpenClaw 系统提示词和出站交付策略中。友好的交互样式层是独立的且可配置。

| 值                   | 效果                 |
| -------------------- | -------------------- |
| `"friendly"`（默认） | 启用友好的交互样式层 |
| `"on"`               | `"friendly"` 的别名  |
| `"off"`              | 仅禁用友好样式层     |

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

<Tip>运行时值不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好风格层。</Tip>

<Note>当未设置共享 `agents.defaults.promptOverlays.gpt5.personality` 设置时，旧的 `plugins.entries.openai.config.personality` 仍会作为兼容性后备项被读取。</Note>

## 语音与演讲

<AccordionGroup>
  <Accordion title="语音合成 (TTS)">
    捆绑的 `openai` 插件为 `messages.tts` 表面注册语音合成。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 音色 | `messages.tts.providers.openai.speakerVoice` | `coral` |
    | 语速 | `messages.tts.providers.openai.speed` | （未设置） |
    | 指令 | `messages.tts.providers.openai.instructions` | （未设置，仅限 `gpt-4o-mini-tts`） |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音备注为 `opus`，文件为 `mp3` |
    | API 密钥 | `messages.tts.providers.openai.apiKey` | 回退至 `OPENAI_API_KEY` |
    | Base URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | 额外 Body | `messages.tts.providers.openai.extraBody` / `extra_body` | （未设置） |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用音色：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 会在 OpenClaw 生成的字段之后合并到 `/audio/speech` 请求 JSON 中，因此请将其用于需要额外键（例如 `lang`）的 OpenAI 兼容端点。原型键将被忽略。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", speakerVoice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    设置 `OPENAI_TTS_BASE_URL` 以覆盖 TTS Base URL，而不影响聊天 API 端点。OpenAI TTS 仍通过 API 密钥进行配置；对于仅限 OAuth 的实时对讲，请使用 Realtime 语音路径，而不是代理模式 STT -> TTS 语音。
    </Note>

  </Accordion>

  <Accordion title="语音转文字">
    附带的 `openai`OpenClaw 插件通过 OpenClaw 的媒体理解转录表面注册了批量语音转文字。

    - 默认模型：`gpt-4o-transcribe`OpenAI
    - 端点：OpenAI REST `/v1/audio/transcriptions`OpenClaw
    - 输入路径：多部分音频文件上传
    - OpenClaw 在任何使用 `tools.media.audio`DiscordOpenAI 的入站音频转录处均提供支持，包括 Discord 语音频道片段和频道音频附件

    要强制入站音频转录使用 OpenAI：

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
    ```OpenAI

    当通过共享音频媒体配置或每次调用的转录请求提供语言和提示时，它们会被转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为语音通话插件注册实时转录。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | (未设置) |
    | 提示词 | `...openai.prompt` | (未设置) |
    | 静音时长 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 认证 | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai`OAuthAPIOAuth OAuth | API keys 直接连接；OAuth 会生成一个实时转录客户端密钥 |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，采用 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音频。当仅配置了 `openai`OAuthGateway(网关)Discord OAuth 时，Gateway(网关) 会在打开 WebSocket 之前生成一个临时的实时转录客户端密钥。此流式提供商用于语音通话的实时转录路径；Discord 语音目前录制短片段并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    捆绑的 `openai` 插件为 Voice Call 插件注册了实时语音功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | 语音 | `...openai.voice` | `alloy` |
    | 温度（Azure 部署桥接） | `...openai.temperature` | `0.8` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 静音持续时间 | `...openai.silenceDurationMs` | `500` |
    | 前缀填充 | `...openai.prefixPaddingMs` | `300` |
    | 推理强度 | `...openai.reasoningEffort` | （未设置） |
    | 身份验证 | `...openai.apiKey`，`OPENAI_API_KEY`，或 `openai` OAuth | 浏览器 Talk 和非 Azure 后端桥接可以使用 OpenAI OAuth |

    `gpt-realtime-2` 可用的内置实时语音包括：`alloy`、`ash`、
    `ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin`、`cedar`。
    OpenAI 推荐使用 `marin` 和 `cedar` 以获得最佳的实时质量。这是
    与上述文本转语音语音不同的一组语音；不要假设 TTS
    语音（如 `fable`、`nova` 或 `onyx`）对实时会话有效。

    <Note>
    后端 OpenAI 实时桥接使用 GA 实时 WebSocket 会话形式，该形式不接受 `session.temperature`。Azure OpenAI 部署仍可通过 `azureEndpoint` 和 `azureDeployment` 使用，并保留与部署兼容的会话形式。支持双向工具调用和 G.711 u-law 音频。
    </Note>

    <Note>
    实时语音是在创建会话时选择的。OpenAI 允许大多数
    会话字段稍后更改，但在该会话中模型发出音频后无法更改语音。OpenClaw 目前将内置的实时语音 ID 作为字符串公开。
    </Note>

    <Note>
    控制 UI Talk 使用 OpenAI 浏览器实时会话，并使用由 Gateway(网关) 生成的
    临时客户端密钥，以及针对 OpenAI 实时 API 的直接浏览器 WebRTC SDP 交换。
    当未配置直接 OpenAI API 密钥时，
    Gateway(网关) 可以使用所选的 `openai` OAuth
    档案生成该客户端密钥。Gateway(网关) 中继和 Voice Call 后端实时 WebSocket 桥接
    对原生 OAuth 端点使用相同的 OpenAI 回退机制。维护者实时
    验证可通过
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 进行；
    OpenAI 端点会验证后端 WebSocket 桥接和浏览器
    WebRTC SDP 交换，而不会记录密钥。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端点

通过覆盖基础 URL，捆绑的 `openai`OpenAIOpenClaw 提供商可以指定 Azure OpenAI 资源进行图像生成。在图像生成路径上，OpenClaw 会检测 `models.providers.openai.baseUrl` 上的 Azure 主机名，并自动切换到 Azure 的请求格式。

<Note>Realtime voice uses a separate configuration path (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) and is not affected by `models.providers.openai.baseUrl`. See the **Realtime voice** accordion under [Voice and speech](#voice-and-speech) for its Azure settings.</Note>

在以下情况下使用 Azure OpenAI：

- 您已经拥有 Azure OpenAI 订阅、配额或企业协议
- 您需要 Azure 提供的区域数据驻留或合规性控制
- 您希望将流量保留在现有的 Azure 租户内

### 配置

若要通过捆绑的 `openai` 提供商进行 Azure 图像生成，请将 `models.providers.openai.baseUrl` 指向您的 Azure 资源，并将 `apiKey`OpenAIOpenAI 设置为 Azure OpenAI 密钥（而非 OpenAI Platform 密钥）：

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

OpenClaw 为 Azure 图像生成路由识别以下 Azure 主机后缀：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于已识别的 Azure 主机上的图像生成请求，OpenClaw：

- 发送 `api-key` 标头而不是 `Authorization: Bearer`
- 使用部署范围路径 (`/openai/deployments/{deployment}/...`)
- 将 `?api-version=...` 附加到每个请求
- 对 Azure 图像生成调用使用 600 秒的默认请求超时。
  每次调用的 `timeoutMs` 值仍会覆盖此默认值。

其他基础 URL（公共 OpenAI、兼容 OpenAI 的代理）保持标准 OpenAI 图像请求形状。

<Note>Azure routing for the `openai`OpenClaw 提供商's image-generation path requires OpenClaw 2026.4.22 or later. Earlier versions treat any custom `openai.baseUrl`OpenAI like the public OpenAI endpoint and will fail against Azure image deployments.</Note>

### API 版本

设置 `AZURE_OPENAI_API_VERSION` 以锁定特定的 Azure 预览版或正式版 (GA) 版本
用于 Azure 图像生成路径：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

未设置变量时，默认值为 `2024-12-01-preview`。

### 模型名称即部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑的 `openai` 提供商路由的 Azure 图像生成请求，OpenClaw 中的 `model` 字段必须是您在 Azure 门户中配置的 **Azure 部署名称**，而不是公共 OpenAI 模型 ID。

如果您创建一个名为 `gpt-image-2-prod` 的部署来提供 `gpt-image-2`：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

相同的部署名称规则适用于通过捆绑的 `openai` 提供商路由的图像生成调用。

### 区域可用性

Azure 图像生成目前仅在部分区域可用（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、`uaenorth`）。在创建部署之前，请查看 Microsoft 当前的区域列表，并确认您的区域中是否提供特定模型。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。Azure 可能会拒绝公共 OpenAI 允许的选项（例如 `gpt-image-2` 上的某些 `background` 值），或者仅在某些特定模型版本上公开这些选项。这些差异来自 Azure 和底层模型，而非 OpenClaw。如果 Azure 请求因验证错误而失败，请在 Azure 门户中检查您的特定部署和 API 版本支持的参数集。

<Note>
Azure OpenAI 使用原生传输和兼容行为，但不会接收
OpenClaw 的隐藏归因标头 — 请参阅 [高级配置](#advanced-configuration) 下的 **原生与 OpenAI 兼容路由**
折叠面板。

对于 Azure 上的聊天或 Responses 流量（超出图像生成范围），请使用
新手引导流程或专用的 Azure 提供商配置 — 仅靠 `openai.baseUrl`
无法识别 Azure API/auth 形状。存在一个单独的
`azure-openai-responses/*` 提供商；请参阅下方的“服务端压缩”折叠面板。

</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw 对 `openai/*` 优先使用 WebSocket，SSE 作为回退 (`"auto"`)。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前重试一次早期的 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级约 60 秒，并在冷却期间使用 SSE
    - 为重试和重新连接附加稳定的会话和回合标识标头
    - 跨传输变体标准化使用计数器 (`input_tokens` / `prompt_tokens`)

    | Value | Behavior |
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
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Fast mode"OpenClaw>
    OpenClaw 为 `openai/*` 提供了一个共享的快速模式开关：

    - **Chat/UI:** `/fast status|on|off`
    - **Config:** `agents.defaults.models["<provider>/<model>"].params.fastMode`OpenClawOpenAI

    启用后，OpenClaw 会将快速模式映射到 OpenAI 优先处理（`service_tier = "priority"`）。现有的 `service_tier` 值将被保留，快速模式不会重写 `reasoning` 或 `text.verbosity`。

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
    会话覆盖优先于配置。在 Sessions UI 中清除会话覆盖将使会话恢复为配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)"OpenAIAPI>
    OpenAI 的 API 通过 `service_tier`OpenClaw 暴露了优先处理功能。请在 OpenClaw 中为每个模型进行设置：

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
    `serviceTier`OpenAI 仅转发到原生 OpenAI 端点（`api.openai.com`）和原生 Codex 端点（`chatgpt.com/backend-api`OpenClaw）。如果您通过代理路由任一提供商，OpenClaw 将保持 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="API服务器端压缩 (Responses API)"OpenAI>
    对于直接 OpenAI Responses 模型（`openai/*` 上的 `api.openai.com`OpenAIOpenClaw），OpenAI 插件的 OpenClow 流包装器会自动启用服务器端压缩：

    - 强制执行 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（当不可用时为 `80000`OpenClawOpenAIOpenAI）

    这适用于内置的 OpenClaw 运行时路径以及嵌入式运行所使用的 OpenAI 提供商挂钩。原生 Codex 应用服务器工具通过 Codex 管理其自己的上下文，并由 OpenAI 的默认代理路由或提供商/模型运行时策略进行配置。

    <Tabs>
      <Tab title="显式启用"OpenAI>
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
    `responsesServerCompaction` 仅控制 `context_management`OpenAI 的注入。直接的 OpenAI Responses 模型仍会强制执行 `store: true`，除非兼容性设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    对于在 `openai/*`OpenClaw 上运行的 GPT-5 系列，OpenClaw 可以使用更严格的嵌入式执行契约：

    ```json5
    {
      agents: {
        defaults: {
          embeddedAgent: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    通过 `strict-agentic`OpenClaw，OpenClaw：
    - 当工具操作可用时，不再将仅计划的回合视为成功的进展
    - 使用“立即行动”引导重试该回合
    - 为实质性工作自动启用 `update_plan`OpenAI
    - 如果模型持续计划而不采取行动，则显示显式的阻塞状态

    <Note>
    仅适用于 OpenAI 和 Codex GPT-5 系列运行。其他提供商和较旧的模型系列保持默认行为。
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
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="OAuthOAuth and auth" href="/zh/gateway/authentication" icon="key">
    认证详情和凭证重用规则。
  </Card>
</CardGroup>
