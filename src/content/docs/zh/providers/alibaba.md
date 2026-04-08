---
title: "Alibaba Model Studio"
summary: "OpenClaw 中的 Alibaba Model Studio Wan 视频生成"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw 附带了一个内置的 `alibaba` 视频生成提供商，用于 Alibaba Model Studio / DashScope 上的 Wan 模型。

- 提供商：`alibaba`
- 首选身份验证：`MODELSTUDIO_API_KEY`
- 也接受：`DASHSCOPE_API_KEY`、`QWEN_API_KEY`
- API：DashScope / Model Studio 异步视频生成

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

2. 设置默认视频模型：

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

## 内置 Wan 模型

内置的 `alibaba` 提供商当前注册了：

- `alibaba/wan2.6-t2v`
- `alibaba/wan2.6-i2v`
- `alibaba/wan2.6-r2v`
- `alibaba/wan2.6-r2v-flash`
- `alibaba/wan2.7-r2v`

## 当前限制

- 每个请求最多 **1** 个输出视频
- 最多 **1** 个输入图像
- 最多 **4** 个输入视频
- 最长 **10 秒** 时长
- 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
- 参考图像/视频模式当前需要 **远程 http(s) URL**

## 与 Qwen 的关系

内置的 `qwen` 提供商也使用 Alibaba 托管的 DashScope 端点进行 Wan 视频生成。使用：

- `qwen/...` 当您需要标准的 Qwen 提供商界面时
- `alibaba/...` 当您需要直接的供应商拥有的 Wan 视频界面时

## 相关

- [视频生成](/en/tools/video-generation)
- [Qwen](/en/providers/qwen)
- [配置参考](/en/gateway/configuration-reference#agent-defaults)
