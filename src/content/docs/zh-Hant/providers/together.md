---
title: "Together AI"
summary: "Together AI 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) 透過統一 API 提供對領先的開源模型（包括 Llama、DeepSeek、Kimi 等）的存取。

- 提供者： `together`
- 驗證： `TOGETHER_API_KEY`
- API：OpenAI 相容

## 快速入門

1. 設定 API 金鑰（建議：為 Gateway 儲存金鑰）：

```bash
openclaw onboard --auth-choice together-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "together/moonshotai/Kimi-K2.5" },
    },
  },
}
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

這會將 `together/moonshotai/Kimi-K2.5` 設定為預設模型。

## 環境注意事項

如果 Gateway 以精靈程序（launchd/systemd）執行，請確保 `TOGETHER_API_KEY`
可供該程序使用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 可用模型

Together AI 提供對許多熱門開源模型的存取：

- **GLM 4.7 Fp8** - 具有 200K 上下文視窗的預設模型
- **Llama 3.3 70B Instruct Turbo** - 快速、高效的指令遵循
- **Llama 4 Scout** - 具備圖片理解能力的視覺模型
- **Llama 4 Maverick** - 進階視覺與推理能力
- **DeepSeek V3.1** - 強大的程式碼與推理模型
- **DeepSeek R1** - 進階推理模型
- **Kimi K2 Instruct** - 具有 262K 上下文視窗的高效能模型

所有模型都支援標準的聊天完成功能，且與 OpenAI API 相容。
