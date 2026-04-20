---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Vercel AI Gateway

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供統一的 API，
透過單一端點存取數百個模型。

| 屬性     | 值                         |
| -------- | -------------------------- |
| 供應商   | `vercel-ai-gateway`        |
| 驗證     | `AI_GATEWAY_API_KEY`       |
| API      | Anthropic Messages 相容    |
| 模型目錄 | 透過 `/v1/models` 自動探索 |

<Tip>OpenClaw 會自動探索 Gateway 的 `/v1/models` 目錄，因此 `/models vercel-ai-gateway` 包含目前的模型參考，例如 `vercel-ai-gateway/openai/gpt-5.4`。</Tip>

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    執行引導程式並選擇 AI Gateway 驗證選項：

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="設定預設模型">
    將模型新增至您的 OpenClaw 設定：

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
  <Step title="Verify the model is available">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## 非互動式範例

對於指令碼或 CI 設定，請在命令列傳遞所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 模型 ID 簡寫

OpenClaw 接受 Vercel Claude 簡寫模型參考，並在執行時將其正規化：

| 簡寫輸入                            | 正規化模型參考                                |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>您可以在設定中使用簡寫或完整模型參考。OpenClaw 會自動解析標準形式。</Tip>

## 進階說明

<AccordionGroup>
  <Accordion title="守護進程的環境變數">
    如果 OpenClaw Gateway 作為守護進程（launchd/systemd）運行，請確保
    `AI_GATEWAY_API_KEY` 對該進程可用。

    <Warning>
    僅在 `~/.profile` 中設定的金鑰將無法被 launchd/systemd
    守護進程看到，除非該環境被顯式匯入。請在
    `~/.openclaw/.env` 中設定金鑰，或透過 `env.shellEnv` 設定，以確保修道進程可以
    讀取它。
    </Warning>

  </Accordion>

  <Accordion title="提供者路由">
    Vercel AI Gateway 會根據模型參照前綴將請求路由到上游提供者。例如，`vercel-ai-gateway/anthropic/claude-opus-4.6` 會
    透過 Anthropic 路由，而 `vercel-ai-gateway/openai/gpt-5.4` 則透過
    OpenAI 路由。您單一的 `AI_GATEWAY_API_KEY` 處理所有
    上游提供者的驗證。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
