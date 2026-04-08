---
title: "Alibaba Model Studio"
summary: "OpenClaw 中的 Alibaba Model Studio Wan 影片生成"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw 內建了一個 `alibaba` 影片生成供應商，專用於 Alibaba Model Studio / DashScope 上的 Wan 模型。

- 供應商：`alibaba`
- 首選驗證方式：`MODELSTUDIO_API_KEY`
- 也接受：`DASHSCOPE_API_KEY`、`QWEN_API_KEY`
- API：DashScope / Model Studio 非同步影片生成

## 快速開始

1. 設定 API 金鑰：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

2. 設定預設影片模型：

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

## 內建 Wan 模型

內建的 `alibaba` 供應商目前註冊了：

- `alibaba/wan2.6-t2v`
- `alibaba/wan2.6-i2v`
- `alibaba/wan2.6-r2v`
- `alibaba/wan2.6-r2v-flash`
- `alibaba/wan2.7-r2v`

## 目前限制

- 每個請求最多 **1** 個輸出影片
- 最多 **1** 個輸入圖片
- 最多 **4** 個輸入影片
- 長度最長 **10 秒**
- 支援 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
- 參考圖片/影片模式目前需要 **遠端 http(s) URL**

## 與 Qwen 的關係

內建的 `qwen` 供應商也使用 Alibaba 託管的 DashScope 端點來進行 Wan 影片生成。使用：

- 當您想要標準的 Qwen 供應商介面時使用 `qwen/...`
- 當您想要直接由供應商擁有的 Wan 影片介面時使用 `alibaba/...`

## 相關

- [影片生成](/en/tools/video-generation)
- [Qwen](/en/providers/qwen)
- [組態參考](/en/gateway/configuration-reference#agent-defaults)
