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

一般供應商 (`volcengine`)：

| Model ref                                    | 名稱                            | 輸入       | Context |
| -------------------------------------------- | ------------------------------- | ---------- | ------- |
| `volcengine/doubao-seed-1-8-251228`          | Doubao Seed 1.8                 | 文字、圖片 | 256,000 |
| `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | 文字、圖片 | 256,000 |
| `volcengine/kimi-k2-5-260127`                | Kimi K2.5                       | 文字、圖片 | 256,000 |
| `volcengine/glm-4-7-251222`                  | GLM 4.7                         | 文字、圖片 | 200,000 |
| `volcengine/deepseek-v3-2-251201`            | DeepSeek V3.2                   | 文字、圖片 | 128,000 |

程式碼撰寫供應商 (`volcengine-plan`)：

| Model ref                                         | 名稱                     | 輸入 | Context |
| ------------------------------------------------- | ------------------------ | ---- | ------- |
| `volcengine-plan/ark-code-latest`                 | Ark Coding Plan          | 文字 | 256,000 |
| `volcengine-plan/doubao-seed-code`                | Doubao Seed Code         | 文字 | 256,000 |
| `volcengine-plan/glm-4.7`                         | GLM 4.7 Coding           | 文字 | 200,000 |
| `volcengine-plan/kimi-k2-thinking`                | Kimi K2 Thinking         | 文字 | 256,000 |
| `volcengine-plan/kimi-k2.5`                       | Kimi K2.5 Coding         | 文字 | 256,000 |
| `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | 文字 | 256,000 |

`openclaw onboard --auth-choice volcengine-api-key` 目前將
`volcengine-plan/ark-code-latest` 設定為預設模型，同時也註冊
一般 `volcengine` 目錄。

在上架/設定模型選擇期間，Volcengine 身份驗證選項會優先顯示
`volcengine/*` 和 `volcengine-plan/*` 這兩列。如果這些模型尚未
載入，OpenClaw 將改為回退到未篩選的目錄，而不是顯示
空的供應商範圍選擇器。

## 環境說明

如果 Gateway 以 daemon (launchd/systemd) 形式執行，請確保
`VOLCANO_ENGINE_API_KEY` 對該程序可用 (例如，在
`~/.openclaw/.env` 中或透過 `env.shellEnv`)。
