---
summary: "在 OpenClaw 中设置 Runway 视频生成"
title: "Runway"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

OpenClaw 附带了一个捆绑的 OpenClaw`runway` 提供商，用于托管视频生成。该插件默认启用，并针对 `videoGenerationProviders` 协议注册 `runway` 提供商。

| 属性          | 值                                                    |
| ------------- | ----------------------------------------------------- |
| 提供商 ID     | `runway`                                              |
| 插件          | 捆绑，`enabledByDefault: true`                        |
| 认证环境变量  | `RUNWAYML_API_SECRET` (规范) 或 `RUNWAY_API_KEY`      |
| 入门引导标志  | `--auth-choice runway-api-key`                        |
| 直接 CLI 标志 | `--runway-api-key <key>`                              |
| API           | Runway 基于任务的视频生成 (`GET /v1/tasks/{id}` 轮询) |
| 默认模型      | `runway/gen4.5`                                       |

## 入门指南

<Steps>
  <Step title="API设置 API 密钥">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="将 Runway 设置为默认视频提供商">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="生成视频">让代理生成视频。将自动使用 Runway。</Step>
</Steps>

## 支持的模式和模型

该提供商公开了七种 Runway 模型，分为三种模式。同一个模型 ID 可以服务于多种模式（例如 `gen4.5` 适用于文本生成视频和图像生成视频）。

| 模式         | 模型                                                                   | 参考输入           |
| ------------ | ---------------------------------------------------------------------- | ------------------ |
| 文本生成视频 | `gen4.5` (默认)，`veo3.1`，`veo3.1_fast`，`veo3`                       | 无                 |
| 图像生成视频 | `gen4.5`，`gen4_turbo`，`gen3a_turbo`，`veo3.1`，`veo3.1_fast`，`veo3` | 1 张本地或远程图像 |
| 视频生成视频 | `gen4_aleph`                                                           | 1 个本地或远程视频 |

支持通过数据 URI 引用本地图像和视频。

| 宽高比         | 允许的值                                    |
| -------------- | ------------------------------------------- |
| 文本生成视频   | `16:9`，`9:16`                              |
| 图像和视频编辑 | `1:1`、`16:9`、`9:16`、`3:4`、`4:3`、`21:9` |

<Warning>视频转视频目前需要 `runway/gen4_aleph`。其他 Runway 模型 ID 会拒绝视频参考输入。</Warning>

<Note>如果从错误的列中选择 Runway 模型 ID，在 API 请求离开 OpenClaw 之前会产生显式错误。提供商会根据该模式在 `extensions/runway/video-generation-provider.ts` 中的允许列表（`TEXT_ONLY_MODELS`、`IMAGE_MODELS`、`VIDEO_MODELS`）来验证 `model`。</Note>

## 配置

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="Environment variable aliases">
    OpenClaw 能够识别 `RUNWAYML_API_SECRET`（规范名称）和 `RUNWAY_API_KEY`。
    其中任一变量均可对 Runway 提供商进行身份验证。
  </Accordion>

  <Accordion title="Task polling">
    Runway 使用基于任务的 API。提交生成请求后，OpenClaw
    会轮询 `GET /v1/tasks/{id}` 直到视频准备就绪。轮询行为无需额外配置。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享的 参数、提供商选择和异步行为。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/config-agents#agent-defaults" icon="gear">
    代理默认设置，包括视频生成模型。
  </Card>
</CardGroup>
