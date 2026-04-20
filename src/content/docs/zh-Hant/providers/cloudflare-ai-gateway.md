---
title: "Cloudflare AI Gateway"
summary: "Cloudflare AI Gateway 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Cloudflare AI Gateway with OpenClaw
  - You need the account ID, gateway ID, or API key env var
---

# Cloudflare AI Gateway

Cloudflare AI Gateway 位於供應商 API 的前端，可讓您新增分析、快取和控制項。對於 Anthropic，OpenClaw 會透過您的 Gateway 端點使用 Anthropic Messages API。

| 屬性     | 數值                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 提供商   | `cloudflare-ai-gateway`                                                              |
| 基礎 URL | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`           |
| 預設模型 | `cloudflare-ai-gateway/claude-sonnet-4-5`                                            |
| API 金鑰 | `CLOUDFLARE_AI_GATEWAY_API_KEY` （您的提供商 API 金鑰，用於透過 Gateway 發出的請求） |

<Note>對於透過 Cloudflare AI Gateway 路由的 Anthropic 模型，請使用您的 **Anthropic API 金鑰** 作為提供商金鑰。</Note>

## 開始使用

<Steps>
  <Step title="設定提供商 API 金鑰和 Gateway 詳細資訊">
    執行 onboarding 並選擇 Cloudflare AI Gateway 驗證選項：

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    這將提示您輸入帳戶 ID、gateway ID 和 API 金鑰。

  </Step>
  <Step title="設定預設模型">
    將模型新增至您的 OpenClaw 設定：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
        },
      },
    }
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## 非互動式範例

對於腳本或 CI 設定，請在命令列傳遞所有數值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## 進階設定

<AccordionGroup>
  <Accordion title="已驗證的 Gateway">
    如果您在 Cloudflare 中啟用了 Gateway 驗證，請新增 `cf-aig-authorization` 標頭。這是**除了**您的提供商 API 金鑰**之外**的設定。

    ```json5
    {
      models: {
        providers: {
          "cloudflare-ai-gateway": {
            headers: {
              "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
            },
          },
        },
      },
    }
    ```

    <Tip>
    `cf-aig-authorization` 標頭是用來與 Cloudflare Gateway 本身進行驗證，而提供商 API 金鑰（例如您的 Anthropic 金鑰）則是用來與上游提供商進行驗證。
    </Tip>

  </Accordion>

  <Accordion title="環境備註">
    如果 Gateway 作為守護程序 (launchd/systemd) 運行，請確保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 對該程序可用。

    <Warning>
    僅存在於 `~/.profile` 中的金鑰對 launchd/systemd 守護程序沒有幫助，除非該環境也已在其中匯入。請在 `~/.openclaw/.env` 中設定金鑰或透過 `env.shellEnv` 設定，以確保 gateway 程序可以讀取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和故障轉移行為。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
