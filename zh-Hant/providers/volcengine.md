---
title: "Volcengine (Doubao)"
summary: "Volcano Engine 設定（Doubao 模型，一般 + 編碼端點）"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Volcengine 提供者提供存取 Doubao 模型和託管於 Volcano Engine 的第三方模型，並針對一般和編碼工作負載提供獨立的端點。

- 提供者：`volcengine` (一般) + `volcengine-plan` (編碼)
- 驗證：`VOLCANO_ENGINE_API_KEY`
- API：OpenAI 相容

## 快速開始

1. 設定 API 金鑰：

```bash
openclaw onboard --auth-choice volcengine-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "volcengine-plan/ark-code-latest" },
    },
  },
}
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

## 提供者與端點

| 提供者            | 端點                                      | 使用案例 |
| ----------------- | ----------------------------------------- | -------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 一般模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 編碼模型 |

兩個提供者皆由單一 API 金鑰進行設定。設定程序會自動註冊這兩者。

## 可用模型

- **doubao-seed-1-8** - Doubao Seed 1.8（通用，預設）
- **doubao-seed-code-preview** - Doubao 編碼模型
- **ark-code-latest** - 編碼計劃預設
- **Kimi K2.5** - 透過火山引擎存取 Moonshot AI
- **GLM-4.7** - 透過火山引擎存取 GLM
- **DeepSeek V3.2** - 透過火山引擎存取 DeepSeek

大多數模型支援文字與圖片輸入。內容視窗範圍從 128K 到 256K 個 token。

## 環境注意事項

如果 Gateway 以 Daemon（launchd/systemd）形式執行，請確保該程序能存取 `VOLCANO_ENGINE_API_KEY`（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
