---
summary: "通过 OpenClaw 的捆绑 qwen 提供商使用 Qwen 云"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

<Warning>

**Qwen OAuth 已被移除。** 使用 `portal.qwen.ai` 端点的免费版 OAuth 集成
(`qwen-portal`) 不再可用。
请参阅 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 了解
背景信息。

</Warning>

OpenClaw 现在将 Qwen 视为具有规范 ID
`qwen` 的一等捆绑提供商。该捆绑提供商针对 Qwen Cloud / Alibaba DashScope 和
Coding Plan 端点，并保持旧版 `modelstudio` ID 作为
兼容性别名正常工作。

- 提供商：`qwen`
- 首选环境变量：`QWEN_API_KEY`
- 出于兼容性也接受：`MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- API 风格：OpenAI 兼容

<Tip>如果您想要 `qwen3.6-plus`，请优先选择 **Standard (pay-as-you-go)** 端点。 Coding Plan 支持可能落后于公共目录。</Tip>

## 入门指南

选择您的计划类型并按照设置步骤进行操作。

<Tabs>
  <Tab title="Coding Plan (subscription)">
    **最适用于：** 通过 Qwen Coding Plan 进行的基于订阅的访问。

    <Steps>
      <Step title="获取您的 API 密钥">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行新手引导">
        对于 **Global** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        对于 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧版 `modelstudio-*` auth-choice id 和 `modelstudio/...` 模型引用
    仍然作为兼容性别名工作，但新的设置流程应首选规范化的
    `qwen-*` auth-choice id 和 `qwen/...` 模型引用。如果您定义了具有其他 `api` 值的
    精确自定义 `models.providers.modelstudio` 条目，则该自定义提供商
    拥有 `modelstudio/...` 引用，而不是 Qwen 兼容性
    别名。
    </Note>

  </Tab>

  <Tab title="Standard (pay-as-you-go)">
    **适用于：** 通过 Standard Model Studio 端点进行按量付费访问，包括可能在 Coding Plan 上不可用的模型，如 `qwen3.6-plus`。

    <Steps>
      <Step title="API获取您的 API 密钥">
        在 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制一个 API 密钥。
      </Step>
      <Step title="运行新手引导">
        对于 **Global（全球）** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        对于 **China（中国）** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型可用性">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧的 `modelstudio-*` 身份验证选择 ID 和 `modelstudio/...` 模型引用仍然
    作为兼容性别名工作，但新的设置流程应首选规范的
    `qwen-*` 身份验证选择 ID 和 `qwen/...` 模型引用。如果您定义了具有其他 `api` 值的精确自定义 `models.providers.modelstudio` 条目，则该
    自定义提供商将拥有 `modelstudio/...`Qwen 引用，而不是 Qwen 兼容性
    别名。
    </Note>

  </Tab>
</Tabs>

## 计划类型和端点

| 计划                       | 区域 | 身份验证选项               | 端点                                             |
| -------------------------- | ---- | -------------------------- | ------------------------------------------------ |
| Standard (pay-as-you-go)   | 中国 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go)   | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (subscription) | 中国 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (subscription) | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供商会根据您的身份验证选项自动选择端点。规范选项使用 `qwen-*` 系列；`modelstudio-*` 仅供兼容性使用。
您可以在配置中使用自定义 `baseUrl` 进行覆盖。

<Tip>**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## 内置目录

OpenClaw 目前附带此捆绑的 Qwen 目录。配置的目录具有端点感知能力：Coding Plan 配置会省略已知仅在 Standard 端点上工作的模型。

| 模型引用                    | 输入       | 上下文    | 备注                                   |
| --------------------------- | ---------- | --------- | -------------------------------------- |
| `qwen/qwen3.5-plus`         | 文本、图像 | 1,000,000 | 默认模型                               |
| `qwen/qwen3.6-plus`         | 文本、图像 | 1,000,000 | 当您需要此模型时，请首选 Standard 端点 |
| `qwen/qwen3-max-2026-01-23` | 文本       | 262,144   | Qwen Max 系列                          |
| `qwen/qwen3-coder-next`     | 文本       | 262,144   | 编程                                   |
| `qwen/qwen3-coder-plus`     | 文本       | 1,000,000 | 编程                                   |
| `qwen/MiniMax-M2.5`         | 文本       | 1,000,000 | 已启用推理                             |
| `qwen/glm-5`                | 文本       | 202,752   | GLM                                    |
| `qwen/glm-4.7`              | 文本       | 202,752   | GLM                                    |
| `qwen/kimi-k2.5`            | 文本、图像 | 262,144   | 通过阿里云使用的 Moonshot AI           |

<Note>即使模型出现在捆绑目录中，其可用性仍可能因端点和计费计划而异。</Note>

## 思维控制

对于已启用推理的 Qwen Cloud 模型，捆绑提供商将 OpenClaw 思维级别映射到 DashScope 的顶层 `enable_thinking` 请求标志。禁用思维将发送 `enable_thinking: false`；其他思维级别将发送 `enable_thinking: true`。

## 多模态附加组件

`qwen` 插件还在 **Standard** DashScope 端点（而非 Coding Plan 端点）上公开了多模态功能：

- **视频理解** 通过 `qwen-vl-max-latest`
- **Wan 视频生成** 通过 `wan2.6-t2v`（默认）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v`

要将 Qwen 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [视频生成](/zh/tools/video-generation)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="图像和视频理解">
    内置的 Qwen 插件在 **标准版** DashScope 端点（而非编码计划端点）上注册了针对图像和视频的媒体理解功能。

    | 属性      | 值                 |
    | ------------- | --------------------- |
    | 模型         | `qwen-vl-max-latest`  |
    | 支持的输入 | 图像、视频       |

    媒体理解功能会根据已配置的 Qwen 身份验证自动解析——无需额外的配置。请确保您使用的是标准版（按量付费）端点以获得媒体理解支持。

  </Accordion>

  <Accordion title="QwenQwen 3.6 Plus 可用性">
    `qwen3.6-plus` 可在标准（按需付费）Model Studio
    端点上使用：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端点为
    `qwen3.6-plus`OpenClawQwen 返回“不支持的模型”错误，请改用标准（按需付费）计划，而不是 Coding Plan
    端点/密钥对。

    OpenClaw 的捆绑 Qwen 目录不会在 Coding
    Plan 端点上公布 `qwen3.6-plus`，但在 `models.providers.qwen.models`API 下显式配置的 `qwen/qwen3.6-plus` 条目
    在 Coding Plan baseUrl 上受到尊重，因此如果阿里云在您的订阅上启用了该模型，您可以选择加入该模型。
    上游 API 仍然决定调用是否成功。

  </Accordion>

  <Accordion title="功能计划">
    `qwen`QwenOpenAI 插件被定位为完整 Qwen
    Cloud 表面的供应商主页，而不仅仅是编码/文本模型。

    - **文本/聊天模型：** 现已捆绑
    - **工具调用、结构化输出、思考：** 继承自 OpenAI 兼容传输
    - **图像生成：** 计划在提供商插件层实现
    - **图像/视频理解：** 现已在标准端点上捆绑
    - **语音/音频：** 计划在提供商插件层实现
    - **记忆嵌入/重排序：** 计划通过嵌入适配器表面实现
    - **视频生成：** 现已通过共享视频生成功能捆绑

  </Accordion>

  <Accordion title="视频生成详情"OpenClawQwen>
    对于视频生成，OpenClaw 会在提交作业之前将配置的 Qwen 区域映射到匹配的 DashScope AIGC 主机：

    - Global/Intl（全球/国际）：`https://dashscope-intl.aliyuncs.com`
    - China（中国）：`https://dashscope.aliyuncs.com`

    这意味着，指向 Coding Plan 或标准 Qwen 主机的普通 `models.providers.qwen.baseUrl`QwenQwen 仍然会将视频生成保持在正确的区域性 DashScope 视频端点上。

    当前捆绑的 Qwen 视频生成限制：

    - 每个请求最多生成 **1** 个输出视频
    - 最多 **1** 个输入图像
    - 最多 **4** 个输入视频
    - 最长时长 **10 秒**
    - 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 参考图像/视频模式当前需要 **远程 http(s) URL**。由于 DashScope 视频端点不接受为这些引用上传的本地缓冲区，本地文件路径会被提前拒绝。

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Model Studio 端点在共享的 `openai-completions`OpenClaw 传输上宣传了流式使用兼容性。OpenClaw 现在关闭了端点功能，因此针对相同原生主机的 DashScope 兼容自定义提供商 ID 会继承相同的流式使用行为，而无需专门要求内置的 `qwen` 提供商 ID。

    原生流式使用兼容性适用于 Coding Plan 主机和标准 DashScope 兼容主机：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模态端点区域">
    多模态功能（视频理解和 Wan 视频生成）使用 **Standard**（标准）DashScope 端点，而不是 Coding Plan 端点：

    - Global/Intl Standard base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - China Standard base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="环境和守护进程设置"Gateway(网关)>
    如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `QWEN_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/zh/providers/alibaba" icon="cloud">
    旧版 ModelStudio 提供商和迁移说明。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题。
  </Card>
</CardGroup>
