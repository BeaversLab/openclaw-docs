---
summary: "Fireworks 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) 透過與 OpenAI 相容的 API 提供開放權重和路由模型。OpenClaw 現在包含內建的 Fireworks 提供者外掛程式。

- 提供者：`fireworks`
- 驗證：`FIREWORKS_API_KEY`
- API：與 OpenAI 相容的 chat/completions
- Base URL：`https://api.fireworks.ai/inference/v1`
- 預設模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`

## 快速入門

透過入門流程設定 Fireworks 驗證：

```bash
openclaw onboard --auth-choice fireworks-api-key
```

這會將您的 Fireworks 金鑰儲存在 OpenClaw 設定中，並將 Fire Pass 入門模型設定為預設值。

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 環境注意事項

如果 Gateway 在您的互動式 shell 外執行，請確保 `FIREWORKS_API_KEY`
也對該程序可用。僅存在於 `~/.profile` 中的金鑰將無
法幫助 launchd/systemd daemon，除非該環境也在那裡被匯入。

## 內建目錄

| 模型參考                                               | 名稱                        | 輸入       | 上下文  | 最大輸出 | 備註                           |
| ------------------------------------------------------ | --------------------------- | ---------- | ------- | -------- | ------------------------------ |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | 文字、圖像 | 256,000 | 256,000  | Fireworks 上預設的內建入門模型 |

## 自訂 Fireworks 模型 ID

OpenClaw 也接受動態 Fireworks 模型 ID。使用 Fireworks 顯示的確切模型或路由器 ID，並加上 `fireworks/` 前綴。

範例：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

如果 Fireworks 發布了較新的模型（例如全新的 Qwen 或 Gemma 版本），您可以直接使用其 Fireworks 模型 ID 切換到該模型，無需等待內建目錄更新。
