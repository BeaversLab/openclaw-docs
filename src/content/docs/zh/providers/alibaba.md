---
summary: "OpenClawOpenClaw 中的 Alibaba Model Studio Wan 视频生成"
title: "Alibaba Model Studio"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

OpenClaw 随附了一个捆绑的 OpenClaw`alibaba`API 插件，该插件在 Alibaba Model Studio（DashScope 的国际名称）上为 Wan 模型注册了一个视频生成提供商。该插件默认启用；您只需设置一个 API 密钥。

| 属性          | 值                                                                              |
| ------------- | ------------------------------------------------------------------------------- |
| 提供商 ID     | `alibaba`                                                                       |
| 插件          | 捆绑, `enabledByDefault: true`                                                  |
| 认证环境变量  | `MODELSTUDIO_API_KEY` → `DASHSCOPE_API_KEY` → `QWEN_API_KEY` (第一个匹配项生效) |
| 新手引导标志  | `--auth-choice alibaba-model-studio-api-key`                                    |
| 直接 CLI 标志 | `--alibaba-model-studio-api-key <key>`                                          |
| 默认模型      | `alibaba/wan2.6-t2v`                                                            |
| 默认基础 URL  | `https://dashscope-intl.aliyuncs.com`                                           |

## 入门指南

<Steps>
  <Step title="API设置 API 密钥">
    使用新手引导将密钥存储到 `alibaba` 提供商下：

    ```bash
    openclaw onboard --auth-choice alibaba-model-studio-api-key
    ```

    或者在安装/新手引导期间直接传递密钥：

    ```bash
    openclaw onboard --alibaba-model-studio-api-key <your-key>
    ```Gateway(网关)

    或者在启动 Gateway 之前导出任何接受的环境变量：

    ```bash
    export MODELSTUDIO_API_KEY=sk-...
    # or DASHSCOPE_API_KEY=...
    # or QWEN_API_KEY=...
    ```

  </Step>
  <Step title="设置默认视频模型">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "alibaba/wan2.6-t2v",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="验证提供商是否已配置">
    ```bash
    openclaw models list --provider alibaba
    ```

    该列表应包含所有五个捆绑的 Wan 模型。如果 `MODELSTUDIO_API_KEY` 未解析，`openclaw models status --json` 将在 `auth.unusableProfiles` 下报告缺少凭据。

  </Step>
</Steps>

<Note>Alibaba 插件和 [Qwen 插件](Qwen/en/providers/qwen) 均针对 DashScope 进行身份验证并接受重叠的环境变量。使用 `alibaba/...` 模型 ID 来驱动专用的 Wan 视频界面；当您需要 Qwen 的聊天、嵌入或媒体理解界面时，请使用 `qwen/...`Qwen ID。</Note>

## 内置 Wan 模型

| 模型参考                   | 模式                 |
| -------------------------- | -------------------- |
| `alibaba/wan2.6-t2v`       | 文本生成视频（默认） |
| `alibaba/wan2.6-i2v`       | 图像生成视频         |
| `alibaba/wan2.6-r2v`       | 参考生成视频         |
| `alibaba/wan2.6-r2v-flash` | 参考生成视频（快速） |
| `alibaba/wan2.7-r2v`       | 参考生成视频         |

## 功能和限制

内置提供商反映了 DashScope 的 Wan 视频 API 限制。所有三种模式共享相同的单次请求视频数量和时长限制；仅输入形状不同。

| 模式         | 最大输出视频数 | 最大输入图像数 | 最大输入视频数 | 最大时长 | 支持的控件                                                |
| ------------ | -------------- | -------------- | -------------- | -------- | --------------------------------------------------------- |
| 文本生成视频 | 1              | n/a            | n/a            | 10 秒    | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| 图像生成视频 | 1              | 1              | n/a            | 10 秒    | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| 参考生成视频 | 1              | n/a            | 4              | 10 秒    | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |

当请求省略 `durationSeconds` 时，提供商发送 DashScope 接受的默认值 **5 秒**。请在 [视频生成工具](/zh/tools/video-generation) 上显式设置 `durationSeconds` 以延长至 10 秒。

<Warning>参考图像和视频输入必须是远程 `http(s)` URL。DashScope 的参考模式不接受本地文件路径；请先上传至对象存储，或使用已生成公共 URL 的 [媒体工具](/zh/tools/media-overview) 流程。</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="覆盖 DashScope 基础 URL">
    提供商默认使用国际版 DashScope 端点。若要针对中国区域端点，请设置：

    ```json5
    {
      models: {
        providers: {
          alibaba: {
            baseUrl: "https://dashscope.aliyuncs.com",
          },
        },
      },
    }
    ```

    提供商在构建 AIGC 任务 URL 之前会移除末尾的斜杠。

  </Accordion>

  <Accordion title="身份验证环境变量优先级"OpenClawAPI>
    OpenClaw 按以下顺序从环境变量中解析 Alibaba API 密钥，并采用第一个非空值：

    1. `MODELSTUDIO_API_KEY`
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    配置的 `auth.profiles` 条目（通过 `openclaw models auth login` 设置）会覆盖环境变量解析。有关配置文件的轮换、冷却和覆盖机制，请参阅[模型常见问题中的身份验证配置文件](/zh/help/faq-models#what-is-an-auth-profile)。

  </Accordion>

  <Accordion title="Qwen与 Qwen 插件的关系"API>
    这两个内置插件都与 DashScope 通信，并且接受可通用的 API 密钥。请使用：

    - `alibaba/wan*.*` id 来驱动本页面记录的专用 Wan 视频提供商。
    - `qwen/*`QwenQwen id 进行 Qwen 聊天、嵌入和媒体理解（请参阅 [Qwen](/zh/providers/qwen)）。

    由于身份验证环境变量列表有意重叠，因此只需设置一次 `MODELSTUDIO_API_KEY` 即可完成两个插件的身份验证；您无需分别为每个插件进行接入。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="QwenQwen" href="/zh/providers/qwen" icon="microchip" Qwen>
    在同一个 DashScope 身份验证上设置 Qwen 聊天、嵌入和媒体理解。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/config-agents#agent-defaults" icon="gear">
    Agent 默认值和模型配置。
  </Card>
  <Card title="Models 常见问题" href="/zh/help/faq-models" icon="circle-question">
    身份验证配置文件、切换模型以及解决“no profile”错误。
  </Card>
</CardGroup>
