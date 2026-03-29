---
title: "Volcengine (Doubao)"
summary: "Volcano Engine 設定（Doubao 模型，一般 + 編程端點）"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Volcengine 提供者允許存取 Doubao 模型和託管在 Volcano Engine 上的第三方模型，並針對一般和編程工作負載提供不同的端點。

- 提供者：`volcengine` (一般) + `volcengine-plan` (編程)
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
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 編程模型 |

這兩個提供者都使用單一 API 金鑰進行設定。設定過程會自動註冊這兩者。

## 可用模型

- **doubao-seed-1-8** - Doubao Seed 1.8 (一般，預設)
- **doubao-seed-code-preview** - Doubao 編程模型
- **ark-code-latest** - 編程方案預設
- **Kimi K2.5** - Moonshot AI (透過 Volcano Engine)
- **GLM-4.7** - GLM (透過 Volcano Engine)
- **DeepSeek V3.2** - DeepSeek (透過 Volcano Engine)

大多數模型支援文字 + 圖片輸入。上下文視窗範圍從 128K 到 256K tokens。

## 環境注意事項

如果 Gateway 以守護程序 (launchd/systemd) 執行，請確認
`VOLCANO_ENGINE_API_KEY` 對該程序可用 (例如，在
`~/.openclaw/.env` 中或透過 `env.shellEnv`)。
