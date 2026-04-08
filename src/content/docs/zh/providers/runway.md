---
title: "Runway"
summary: "在 OpenClaw 中设置 Runway 视频生成"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw 内置了一个捆绑的 `runway` 提供商，用于托管视频生成。

- 提供商 ID：`runway`
- 认证：`RUNWAYML_API_SECRET` (规范) 或 `RUNWAY_API_KEY`
- API：基于任务的 Runway 视频生成 (`GET /v1/tasks/{id}` 轮询)

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice runway-api-key
```

2. 将 Runway 设置为默认视频提供商：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
```

3. 要求代理生成视频。将自动使用 Runway。

## 支持的模式

| 模式           | 模型            | 参考输入           |
| -------------- | --------------- | ------------------ |
| Text-to-video  | `gen4.5` (默认) | 无                 |
| Image-to-video | `gen4.5`        | 1 张本地或远程图片 |
| Video-to-video | `gen4_aleph`    | 1 个本地或远程视频 |

- 支持通过 data URI 引用本地图片和视频。
- 目前，Video-to-video 特别需要 `runway/gen4_aleph`。
- 目前，Text-only 运行提供 `16:9` 和 `9:16` 宽高比。

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

## 相关

- [视频生成](/en/tools/video-generation) -- 共享的工具参数、提供商选择和异步行为
- [配置参考](/en/gateway/configuration-reference#agent-defaults)
