---
title: "Runway"
summary: "在 OpenClaw 中设置 Runway 视频生成"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw 附带了一个用于托管视频生成的捆绑 `runway` 提供商。

| 属性      | 值                                                    |
| --------- | ----------------------------------------------------- |
| 提供商 ID | `runway`                                              |
| 身份验证  | `RUNWAYML_API_SECRET` (规范) 或 `RUNWAY_API_KEY`      |
| API       | Runway 基于任务的视频生成 (`GET /v1/tasks/{id}` 轮询) |

## 入门指南

<Steps>
  <Step title="Set the API key">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="Set Runway as the default video provider">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="生成视频">要求智能体生成视频。Runway 将被自动使用。</Step>
</Steps>

## 支持的模式

| 模式       | 模型            | 参考输入           |
| ---------- | --------------- | ------------------ |
| 文生视频   | `gen4.5` (默认) | 无                 |
| 图生视频   | `gen4.5`        | 1 张本地或远程图像 |
| 视频生视频 | `gen4_aleph`    | 1 个本地或远程视频 |

<Note>通过数据 URI 支持本地图像和视频引用。纯文本运行目前提供 `16:9` 和 `9:16` 纵横比。</Note>

<Warning>视频生视频目前特别需要 `runway/gen4_aleph`。</Warning>

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

## 高级说明

<AccordionGroup>
  <Accordion title="环境变量别名">
    OpenClaw 识别 `RUNWAYML_API_SECRET` (规范) 和 `RUNWAY_API_KEY`。
    两个变量均可对 Runway 提供商进行身份验证。
  </Accordion>

  <Accordion title="任务轮询">
    Runway 使用基于任务的 API。提交生成请求后，OpenClaw 会轮询 `GET /v1/tasks/{id}` 直到视频准备就绪。轮询行为无需额外配置。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享工具参数、提供商选择和异步行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference#agent-defaults" icon="gear">
    智能体默认设置，包括视频生成模型。
  </Card>
</CardGroup>
