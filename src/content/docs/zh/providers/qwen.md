---
summary: "QwenOpenClaw通过 OpenClaw 的内置 qwen 提供商使用 Qwen Cloud"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "QwenQwen"
---

OpenClaw 现在将 Qwen 视为一等内置提供商，其规范 ID 为
OpenClawQwen`qwen`Qwen。该内置提供商针对 Qwen Cloud / 阿里云百炼和
Coding Plan 端点，保留旧版 `modelstudio`Qwen ID 作为兼容性
别名使用，并且还暴露了 Qwen Portal 令牌流作为提供商 `qwen-oauth`。

- 提供商：`qwen`
- Portal 提供商：[`qwen-oauth`](/zh/providers/qwen-oauth)
- 首选环境变量：`QWEN_API_KEY`
- 出于兼容性也接受：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 风格：OpenAI 兼容

<Tip>如果您想要 `qwen3.6-plus`，请首选 **Standard (pay-as-you-go)** 端点。 Coding Plan 支持可能会滞后于公共目录。</Tip>

## 入门指南

选择您的计划类型并按照设置步骤进行操作。

<Tabs>
  <Tab title="Coding Plan (subscription)"Qwen>
    **适用于：** 通过 Qwen Coding Plan 进行的基于订阅的访问。

    <Steps>
      <Step title="API获取您的 API 密钥"API>
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
      <Step title="验证模型可用性">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧的 `modelstudio-*` auth-choice ID 和 `modelstudio/...` 模型引用仍可
    作为兼容性别名使用，但新的设置流程应优先使用规范的
    `qwen-*` auth-choice ID 和 `qwen/...` 模型引用。如果您定义了一个精确的
    自定义 `models.providers.modelstudio` 条目并使用了另一个 `api` 值，
    那么该自定义提供商将拥有 `modelstudio/...`Qwen 引用，而不是 Qwen 兼容性别名。
    </Note>

  </Tab>

  <Tab title="Standard (pay-as-you-go)">
    **最适用于：** 通过 Standard Model Studio 端点进行按量付费访问，包括在 Coding Plan 上可能不可用的模型，例如 `qwen3.6-plus`。

    <Steps>
      <Step title="API获取您的 API 密钥"API>
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制一个 API 密钥。
      </Step>
      <Step title="运行新手引导">
        对于 **Global**（全球）端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        对于 **China**（中国）端点：

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
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    传统的 `modelstudio-*` auth-choice ID 和 `modelstudio/...` 模型引用仍然
    作为兼容性别名工作，但新的设置流程应优先使用规范
    `qwen-*` auth-choice ID 和 `qwen/...` 模型引用。如果您定义了一个精确
    自定义 `models.providers.modelstudio` 条目并使用另一个 `api` 值，则
    该自定义提供商将拥有 `modelstudio/...`Qwen 引用，而不是 Qwen 兼容性
    别名。
    </Note>

  </Tab>

  <Tab title="QwenOAuthQwen OAuth / Portal"Qwen>
    **最适用于：** 针对用于 `https://portal.qwen.ai/v1`QwenOAuth 的 Qwen Portal 令牌。

    请参阅 [Qwen OAuth / Portal](/zh/providers/qwen-oauth) 了解专门的提供商
    页面和迁移说明。

    <Steps>
      <Step title="提供您的门户令牌">
        ```bash
        openclaw onboard --auth-choice qwen-oauth
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen-oauth/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen-oauth
        ```
      </Step>
    </Steps>

    <Note>
    `qwen-oauth` 使用与 DashScope
    提供商相同的 `QWEN_API_KEY` 环境变量名称，但在通过 OpenClaw 新手引导配置时，
    会将身份验证信息存储在 `qwen-oauth`OpenClaw 提供商 ID 下。
    </Note>

  </Tab>
</Tabs>

## 计划类型和端点

| 计划               | 区域 | 身份验证选项               | 端点                                             |
| ------------------ | ---- | -------------------------- | ------------------------------------------------ |
| 标准版（按量付费） | 中国 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 标准版（按量付费） | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| 编码计划（订阅）   | 中国 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| 编码计划（订阅）   | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |
| Qwen Portal        | 全球 | `qwen-oauth`               | `portal.qwen.ai/v1`                              |

该提供商会根据您的身份验证选项自动选择端点。规范
选项使用 `qwen-*` 系列；`modelstudio-*` 保留仅用于兼容性。
您可以在配置中通过自定义 `baseUrl` 进行覆盖。

<Tip>**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## 内置目录

OpenClaw 目前附带此内置 Qwen 目录。配置的目录
感知端点：Coding Plan 配置会省去仅在 Standard 端点上已知有效的模型。

| 模型引用                    | 输入       | 上下文    | 备注                           |
| --------------------------- | ---------- | --------- | ------------------------------ |
| `qwen/qwen3.5-plus`         | 文本、图像 | 1,000,000 | 默认模型                       |
| `qwen/qwen3.6-plus`         | 文本、图像 | 1,000,000 | 需要此模型时首选 Standard 端点 |
| `qwen/qwen3-max-2026-01-23` | 文本       | 262,144   | Qwen Max 系列                  |
| `qwen/qwen3-coder-next`     | 文本       | 262,144   | 代码                           |
| `qwen/qwen3-coder-plus`     | 文本       | 1,000,000 | 代码                           |
| `qwen/MiniMax-M2.5`         | 文本       | 1,000,000 | 已启用推理                     |
| `qwen/glm-5`                | 文本       | 202,752   | GLM                            |
| `qwen/glm-4.7`              | 文本       | 202,752   | GLM                            |
| `qwen/kimi-k2.5`            | 文本、图像 | 262,144   | 通过阿里云接入的 Moonshot AI   |
| `qwen-oauth/qwen3.5-plus`   | 文本、图像 | 1,000,000 | Qwen Portal 默认               |

<Note>即使模型存在于内置目录中，其可用性仍可能因端点和计费计划而异。</Note>

## 思维控制

对于启用推理功能的 Qwen Cloud 模型，内置提供商将 OpenClaw 的
思维级别映射到 DashScope 的顶级 `enable_thinking` 请求标志。禁用
思维会发送 `enable_thinking: false`；其他思维级别会发送
`enable_thinking: true`。

## 多模态附加功能

`qwen` 插件还在 **Standard**
DashScope 端点上公开多模态功能（而非 Coding Plan 端点）：

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

<Note>请参阅 [视频生成](/zh/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="图像和视频理解">
    捆绑的 Qwen 插件在 **Standard** DashScope 端点上（而非 Coding Plan 端点）为图像和视频注册了媒体理解功能。

    | 属性      | 值                 |
    | ------------- | --------------------- |
    | 模型         | `qwen-vl-max-latest`  |
    | 支持的输入 | 图像，视频       |

    媒体理解功能会根据配置的 Qwen 身份验证自动解析 —— 无需额外配置。请确保您正在使用 Standard（按量付费）端点以支持媒体理解。

  </Accordion>

  <Accordion title="Qwen 3.6 Plus 可用性">
    `qwen3.6-plus` 在 Standard（按量付费）Model Studio 端点上可用：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端点针对 `qwen3.6-plus` 返回“不支持的模型”错误，请改用 Standard（按量付费），而不是 Coding Plan 端点/密钥对。

    OpenClaw 的捆绑 Qwen 目录不会在 Coding Plan 端点上通告 `qwen3.6-plus`，但 `models.providers.qwen.models` 下明确配置的 `qwen/qwen3.6-plus` 条目在 Coding Plan baseUrls 上受到尊重，因此如果阿里云在您的订阅中启用了该模型，您可以选择加入该模型。上游 API 仍将决定调用是否成功。

  </Accordion>

  <Accordion title="Capability plan">
    `qwen` 插件被定位为完整 Qwen
    Cloud 表面的供应商主页，而不仅仅是编码/文本模型。

    - **Text/chat models:** 现已内置
    - **Tool calling, structured output, thinking:** 继承自 OpenAI 兼容传输
    - **Image generation:** 计划在提供商插件层实现
    - **Image/video understanding:** 现已在 Standard 端点上内置
    - **Speech/audio:** 计划在提供商插件层实现
    - **Memory embeddings/reranking:** 计划通过嵌入适配器表面实现
    - **Video generation:** 现已通过共享视频生成功能内置

  </Accordion>

  <Accordion title="Video generation details">
    对于视频生成，OpenClaw 在提交作业之前，将配置的 Qwen 区域映射到匹配的
    DashScope AIGC 主机：

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - China: `https://dashscope.aliyuncs.com`

    这意味着指向 Coding Plan 或 Standard Qwen 主机的普通 `models.providers.qwen.baseUrl`
    仍然可以将视频生成保持在正确的区域性 DashScope 视频端点上。

    当前内置 Qwen 视频生成限制：

    - 每个请求最多 **1** 个输出视频
    - 最多 **1** 个输入图像
    - 最多 **4** 个输入视频
    - 最长 **10 秒** 时长
    - 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 参考图像/视频模式当前需要 **远程 http(s) URL**。本地
      文件路径会被提前拒绝，因为 DashScope 视频端点不接受
      针对这些引用的上传本地缓冲区。

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Model Studio 端点在共享的 `openai-completions` 传输上宣传了流式使用兼容性。OpenClaw 密钥现在会关闭端点功能，因此针对相同原生主机的 DashScope 兼容自定义提供商 ID 会继承相同的流式使用行为，而不需要专门使用内置的 `qwen` 提供商 ID。

    原生流式使用兼容性适用于 Coding Plan 主机和标准 DashScope 兼容主机：

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
    如果 Gateway(网关) 作为守护程序运行，请确保 `QWEN_API_KEY`
    对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
    `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/zh/providers/alibaba" icon="cloud">
    旧版 ModelStudio 提供商和迁移说明。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    一般故障排除和常见问题。
  </Card>
</CardGroup>
