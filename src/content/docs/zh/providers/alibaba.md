---
title: "Alibaba Model Studio"
summary: "OpenClaw 中的 Alibaba Model Studio Wan 视频生成"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw 附带了一个内置的 `alibaba` 视频生成提供商，用于 Alibaba Model Studio / DashScope 上的 Wan 模型。

- 提供商： `alibaba`
- 首选认证： `MODELSTUDIO_API_KEY`
- 也可接受： `DASHSCOPE_API_KEY`, `QWEN_API_KEY`
- API：DashScope / Model Studio 异步视频生成

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice qwen-standard-api-key
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
  <Step title="验证提供商是否可用">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>任何接受的认证密钥（`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`、`QWEN_API_KEY`）均可使用。`qwen-standard-api-key` 新手引导选项会配置共享的 DashScope 凭证。</Note>

## 内置 Wan 模型

内置的 `alibaba` 提供商目前注册了：

| 模型引用                   | 模式                 |
| -------------------------- | -------------------- |
| `alibaba/wan2.6-t2v`       | 文本生成视频         |
| `alibaba/wan2.6-i2v`       | 图片生成视频         |
| `alibaba/wan2.6-r2v`       | 参考生成视频         |
| `alibaba/wan2.6-r2v-flash` | 参考生成视频（快速） |
| `alibaba/wan2.7-r2v`       | 参考生成视频         |

## 当前限制

| 参数          | 限制                                                      |
| ------------- | --------------------------------------------------------- |
| 输出视频      | 每个请求最多 **1** 个                                     |
| 输入图片      | 最多 **1** 张                                             |
| 输入视频      | 最多 **4** 个                                             |
| 时长          | 最长 **10 秒**                                            |
| 支持的控制项  | `size`、`aspectRatio`、`resolution`、`audio`、`watermark` |
| 参考图片/视频 | 仅限远程 `http(s)` URL                                    |

<Warning>参考图片/视频模式目前需要 **远程 http(s) URL**。不支持本地文件路径作为参考输入。</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="与 Qwen 的关系">
    内置的 `qwen` 提供商也使用阿里托管的 DashScope 端点进行
    Wan 视频生成。使用：

    - `qwen/...` 当您需要规范的 Qwen 提供商接口
    - `alibaba/...` 当您需要直接的供应商拥有的 Wan 视频接口

    有关更多详细信息，请参阅 [Qwen 提供商文档](/zh/providers/qwen)。

  </Accordion>

  <Accordion title="Auth key priority">
    OpenClaw 按以下顺序检查认证密钥：

    1. `MODELSTUDIO_API_KEY`（首选）
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    其中任何一个都可以对 `alibaba` 提供商进行身份验证。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Qwen" href="/zh/providers/qwen" icon="microchip">
    Qwen 提供商设置和 DashScope 集成。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference#agent-defaults" icon="gear">
    代理默认设置和模型配置。
  </Card>
</CardGroup>
