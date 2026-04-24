---
summary: "通过 OpenClaw 的捆绑 qwen 提供商使用 Qwen 云"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth 已被移除。** 以前使用 `portal.qwen.ai` 端点的免费层 OAuth 集成 (`qwen-portal`) 不再可用。
请参阅 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 了解
背景信息。

</Warning>

OpenClaw 现在将 Qwen 视为具有规范 ID `qwen` 的一流捆绑提供商。该捆绑提供商面向 Qwen 云 / Alibaba DashScope 和 Coding Plan 端点，并保留旧版 `modelstudio` ID 作为兼容性别名继续工作。

- 提供商：`qwen`
- 首选环境变量：`QWEN_API_KEY`
- 为兼容性也接受：`MODELSTUDIO_API_KEY`，`DASHSCOPE_API_KEY`
- API 风格：OpenAI 兼容

<Tip>如果您想要 `qwen3.6-plus`，请首选 **标准（按量付费）** 端点。 Coding Plan 支持可能滞后于公开目录。</Tip>

## 入门指南

选择您的计划类型并按照设置步骤操作。

<Tabs>
  <Tab title="Coding Plan (订阅)">
    **最适合：** 通过 Qwen Coding Plan 进行基于订阅的访问。

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
    旧版 `modelstudio-*` 认证选择 ID 和 `modelstudio/...` 模型引用仍

可作为兼容性别名使用，但新的设置流程应优先使用规范
`qwen-*` 认证选择 ID 和 `qwen/...` 模型引用。
</Note>

  </Tab>

  <Tab title="Standard (pay-as-you-go)">
    **Best for:** pay-as-you-go access through the Standard Model Studio endpoint, including models like `qwen3.6-plus` that may not be available on the Coding Plan.

    <Steps>
      <Step title="Get your API key">
        Create or copy an API key from [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Run 新手引导">
        For the **Global** endpoint:

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        For the **China** endpoint:

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="Set a default 模型">
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
      <Step title="Verify the 模型 is available">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Legacy `modelstudio-*` auth-choice ids and `modelstudio/...` 模型 refs still
    work as compatibility aliases, but new setup flows should prefer the canonical
    `qwen-*` auth-choice ids and `qwen/...` 模型 refs.
    </Note>

  </Tab>
</Tabs>

## 计划类型和端点

| 计划                       | 区域 | 认证选项                   | 端点                                             |
| -------------------------- | ---- | -------------------------- | ------------------------------------------------ |
| Standard (pay-as-you-go)   | 中国 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go)   | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (subscription) | 中国 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (subscription) | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供商会根据您的认证选项自动选择端点。规范选项使用 `qwen-*` 系列；`modelstudio-*` 仅作为兼容性保留。您可以在配置中使用自定义 `baseUrl` 进行覆盖。

<Tip>**Manage keys:** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **Docs:** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## 内置目录

OpenClaw 目前附带此内置的 Qwen 目录。配置的目录具有端点感知能力：Coding Plan 配置会省略那些已知仅在 Standard 端点上工作的模型。

| 模型参考                    | 输入       | 上下文    | 备注                                       |
| --------------------------- | ---------- | --------- | ------------------------------------------ |
| `qwen/qwen3.5-plus`         | 文本、图像 | 1,000,000 | 默认模型                                   |
| `qwen/qwen3.6-plus`         | 文本、图像 | 1,000,000 | 当您需要此模型时，请优先使用 Standard 端点 |
| `qwen/qwen3-max-2026-01-23` | 文本       | 262,144   | Qwen Max 系列                              |
| `qwen/qwen3-coder-next`     | 文本       | 262,144   | 编程                                       |
| `qwen/qwen3-coder-plus`     | 文本       | 1,000,000 | 编程                                       |
| `qwen/MiniMax-M2.5`         | 文本       | 1,000,000 | 已启用推理                                 |
| `qwen/glm-5`                | 文本       | 202,752   | GLM                                        |
| `qwen/glm-4.7`              | 文本       | 202,752   | GLM                                        |
| `qwen/kimi-k2.5`            | 文本、图像 | 262,144   | 通过阿里云实现的 Moonshot AI               |

<Note>即使模型存在于内置目录中，其可用性仍可能因端点和计费计划而异。</Note>

## 多模态附加功能

`qwen` 插件还在 **标准版** DashScope 端点（而非 Coding Plan 端点）上暴露了多模态能力：

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

<Note>请参阅[视频生成](/zh/tools/video-generation)以了解共享工具参数、提供商选择和故障转移行为。</Note>

## 高级

<AccordionGroup>
  <Accordion title="图像和视频理解">
    内置的 Qwen 插件在 **Standard** DashScope 端点（而非 Coding Plan 端点）上注册了针对图像和视频的媒体理解功能。

    | 属性      | 值                 |
    | ------------- | --------------------- |
    | 模型         | `qwen-vl-max-latest`  |
    | 支持的输入 | 图像、视频       |

    媒体理解功能会根据配置的 Qwen 身份验证自动解析——无需
    额外配置。请确保您使用的是 Standard（按量付费）
    端点以获得媒体理解支持。

  </Accordion>

  <Accordion title="Qwen 3.6 Plus 可用性">
    `qwen3.6-plus` 可在标准（按量付费）Model Studio
    端点上使用：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端点针对
    `qwen3.6-plus` 返回“不支持的模型”错误，
    请切换到标准（按量付费）而不是 Coding Plan
    端点/密钥对。

  </Accordion>

  <Accordion title="Capability plan">
    `qwen` 插件正被定位为完整的 Qwen Cloud 表面的官方供应商，而不仅仅是编码/文本模型。

    - **文本/聊天模型：** 现已内置
    - **工具调用、结构化输出、思考：** 继承自 OpenAI 兼容传输层
    - **图像生成：** 计划在 提供商-plugin 层面实现
    - **图像/视频理解：** 已在标准端点上内置
    - **语音/音频：** 计划在 提供商-plugin 层面实现
    - **记忆嵌入/重排：** 计划通过嵌入适配器表面实现
    - **视频生成：** 已通过共享的视频生成能力内置

  </Accordion>

  <Accordion title="视频生成详情">
    对于视频生成，OpenClaw 会在提交作业之前将配置的 Qwen 区域映射到相应的
    DashScope AIGC 主机：

    - 全球/国际：`https://dashscope-intl.aliyuncs.com`
    - 中国：`https://dashscope.aliyuncs.com`

    这意味着指向 Coding Plan 或标准 Qwen 主机的普通 `models.providers.qwen.baseUrl` 仍然会将视频生成保留在正确的
    区域 DashScope 视频端点上。

    当前捆绑的 Qwen 视频生成限制：

    - 每个请求最多 **1** 个输出视频
    - 最多 **1** 张输入图片
    - 最多 **4** 个输入视频
    - 最长 **10 秒** 时长
    - 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 参考图片/视频模式目前需要 **远程 http(s) URL**。本地
      文件路径会被预先拒绝，因为 DashScope 视频端点不接受
      针对这些引用上传的本地缓冲区。

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Model Studio 端点在共享的 `openai-completions` 传输上通告流式使用兼容性。
    OpenClaw 密钥现在会关闭端点功能，因此针对相同原生主机的 DashScope 兼容自定义提供商 ID
    会继承相同的流式使用行为，而
    不需要专门使用内置的 `qwen` 提供商 ID。

    原生流式使用兼容性适用于 Coding Plan 主机和
    标准 DashScope 兼容主机：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模态端点区域">
    多模态表面（视频理解和 Wan 视频生成）使用
    **标准** DashScope 端点，而不是 Coding Plan 端点：

    - 全球/国际标准基础 URL：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - 中国标准基础 URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="环境和守护程序设置">
    如果 Gateway(网关) 作为守护程序运行，请确保该进程可以使用 `QWEN_API_KEY`（例如，在 `~/.openclaw/.env` 中或通过
    `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="阿里巴巴 (ModelStudio)" href="/zh/providers/alibaba" icon="cloud">
    旧版 ModelStudio 提供商和迁移说明。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题。
  </Card>
</CardGroup>
