---
title: "Together AI"
summary: "Together AI 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) 透過統一的 API 提供對領先開源模型（包括 Llama、DeepSeek、Kimi 等）的存取。

- 供應商：`together`
- 驗證：`TOGETHER_API_KEY`
- API：OpenAI 相容
- 基礎 URL：`https://api.together.xyz/v1`

## 快速開始

1. 設定 API 金鑰（建議：為 Gateway 儲存它）：

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

如果 Gateway 作為守護程序（launchd/systemd）運行，請確保 `TOGETHER_API_KEY`
對該程序可用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 內建目錄

OpenClaw 目前隨附此打包的 Together 目錄：

| 模型參照                                                     | 名稱                                   | 輸入       | 語境       | 備註                 |
| ------------------------------------------------------------ | -------------------------------------- | ---------- | ---------- | -------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | 文字、圖片 | 262,144    | 預設模型；已啟用推理 |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | 文字       | 202,752    | 通用文字模型         |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | 文字       | 131,072    | 快速指令模型         |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | 文字、圖片 | 10,000,000 | 多模態               |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | 文字、圖片 | 20,000,000 | 多模態               |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | 文字       | 131,072    | 通用文字模型         |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | 文字       | 131,072    | 推理模型             |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | 文字       | 262,144    | 次要 Kimi 文字模型   |

入門預設集會將 `together/moonshotai/Kimi-K2.5` 設定為預設模型。

## 影片生成

隨附的 `together` 外掛程式也會透過共享的 `video_generate` 工具註冊影片生成。

- 預設影片模型：`together/Wan-AI/Wan2.2-T2V-A14B`
- 模式：文字轉影片和單一圖片參照流程
- 支援 `aspectRatio` 和 `resolution`

若要將 Together 作為預設影片供應商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

請參閱 [影片生成](/en/tools/video-generation) 以了解共享工具參數、提供者選擇和故障轉移行為。
