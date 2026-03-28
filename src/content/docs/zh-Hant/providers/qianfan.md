---
summary: "使用 Qianfan 的統一 API 存取 OpenClaw 中的多種模型"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "Qianfan"
---

# Qianfan 提供者指南

Qianfan 是百度的 MaaS 平台，提供一個 **統一 API**，可將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## 先決條件

1. 具備 Qianfan API 存取權限的百度雲端帳戶
2. 來自 Qianfan 控制台的 API 金鑰
3. 系統上已安裝 OpenClaw

## 取得您的 API 金鑰

1. 造訪 [Qianfan 控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 建立一個新的應用程式或選取現有的應用程式
3. 產生 API 金鑰（格式：`bce-v3/ALTAK-...`）
4. 複製 API 金鑰以供 OpenClaw 使用

## CLI 設定

```exec
openclaw onboard --auth-choice qianfan-api-key
```

## 相關文件

- [OpenClaw 設定](/zh-Hant/gateway/configuration)
- [模型供應商](/zh-Hant/concepts/model-providers)
- [Agent 設定](/zh-Hant/concepts/agent)
- [Qianfan API 文件](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
