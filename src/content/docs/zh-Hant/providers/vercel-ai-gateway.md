---
summary: "Vercel AI Gateway 設定 (驗證 + 模型選擇)"
title: "Vercel AI gateway"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供統一的 API，透過單一端點存取數百個模型。

| 屬性     | 值                         |
| -------- | -------------------------- |
| 提供者   | `vercel-ai-gateway`        |
| 驗證     | `AI_GATEWAY_API_KEY`       |
| API      | Anthropic 訊息相容         |
| 模型目錄 | 透過 `/v1/models` 自動探索 |

<Tip>OpenClaw 會自動探索 Gateway `/v1/models` 目錄，因此 `/models vercel-ai-gateway` 包含目前的模型參照，例如 `vercel-ai-gateway/openai/gpt-5.5` 和 `vercel-ai-gateway/moonshotai/kimi-k2.6`。</Tip>

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    執行 onboarding 並選擇 AI Gateway 驗證選項：

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="設定預設模型">
    將模型加入您的 OpenClaw 設定：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
        },
      },
    }
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## 非互動式範例

對於腳本或 CI 設定，請在指令列上傳遞所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 模型 ID 簡寫

OpenClaw 接受 Vercel Claude 簡寫模型參照，並在執行時將其正規化：

| 簡寫輸入                            | 正規化的模型參照                              |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>您可以在設定中使用簡寫或完整的模型參照。OpenClaw 會自動解析標準形式。</Tip>

## 進階設定

<AccordionGroup>
  <Accordion title="Daemon 處理程序的環境變數">
    如果 OpenClaw Gateway 以 daemon (launchd/systemd) 形式執行，請確保
    `AI_GATEWAY_API_KEY` 對該處理程序可用。

    <Warning>
    僅在互動式 shell 中匯出的金鑰將無法被
    launchd/systemd daemon 看見，除非該環境被明確匯入。請在 `~/.openclaw/.env` 中設定金鑰，或透過 `env.shellEnv` 設定，以確保 gateway
    處理程序可以讀取它。
    </Warning>

  </Accordion>

  <Accordion title="提供者路由">
    Vercel AI Gateway 會根據模型
    ref 前綴將請求路由至上游提供者。例如，`vercel-ai-gateway/anthropic/claude-opus-4.6` 會
    透過 Anthropic 路由，而 `vercel-ai-gateway/openai/gpt-5.5` 會透過
    OpenAI 路由，`vercel-ai-gateway/moonshotai/kimi-k2.6` 則會透過
    MoonshotAI 路由。您單一的 `AI_GATEWAY_API_KEY` 會處理所有
    上游提供者的驗證。
  </Accordion>
  <Accordion title="思考層級">
    當 OpenClaw 知道
    上游提供者合約時，`/think` 選項會遵循受信任的上游模型前綴。`vercel-ai-gateway/anthropic/...` 使用
    Claude 思考設定檔，包括針對 Claude 4.6 模型的自適應預設值。
    `vercel-ai-gateway/openai/gpt-5.4`、`gpt-5.5` 和 Codex 風格的 ref 會公開
    `/think xhigh`，就像直接的 OpenAI/OpenAI Codex 提供者一樣。其他
    命名空間的 ref 會保持正常的推理層級，除非其目錄
    元資料宣告了更多設定。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
