---
summary: "使用 Qianfan 的統一 API 來存取 OpenClaw 中的多種模型"
read_when:
  - 您想要單一 API 金鑰用於多個 LLM
  - 您需要 Baidu Qianfan 設定指引
title: "Qianfan"
---

# Qianfan 提供者指南

Qianfan 是百度 的 MaaS 平台，提供一個 **統一 API**，可以將請求路由到單一端點和 API 金鑰背後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可使用。

## 先決條件

1. 一個具備 Qianfan API 存取權限的百度雲帳號
2. 從 Qianfan 控制台取得的 API 金鑰
3. 您的系統上已安裝 OpenClaw

## 取得您的 API 金鑰

1. 造訪 [Qianfan Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 建立一個新的應用程式或選擇現有的應用程式
3. 產生 API 金鑰 (格式：`bce-v3/ALTAK-...`)
4. 複製 API 金鑰以供 OpenClaw 使用

## CLI 設定

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 相關文件

- [OpenClaw Configuration](/zh-Hant/gateway/configuration)
- [Model Providers](/zh-Hant/concepts/model-providers)
- [Agent Setup](/zh-Hant/concepts/agent)
- [Qianfan API Documentation](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)

import en from "/components/footer/en.mdx";

<en />
