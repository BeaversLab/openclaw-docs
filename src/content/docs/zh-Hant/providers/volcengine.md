---
title: "Volcengine (Doubao)"
summary: "Volcano Engine 設定（Doubao 模型，一般 + 編碼端點）"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Volcengine 提供者允許存取 Doubao 模型和託管在 Volcano Engine 上的第三方模型，並針對一般和編程工作負載提供不同的端點。

| 詳細   | 數值                                           |
| ------ | ---------------------------------------------- |
| 提供者 | `volcengine` (一般) + `volcengine-plan` (編碼) |
| 驗證   | `VOLCANO_ENGINE_API_KEY`                       |
| API    | OpenAI 相容                                    |

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    執行互動式設定嚮導：

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    這會透過單一 API 金鑰同時註冊一般 (`volcengine`) 與編碼 (`volcengine-plan`) 提供者。

  </Step>
  <Step title="設定預設模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
若要進行非互動式設定（CI、腳本），請直接傳入金鑰：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## 提供者與端點

| 提供者            | 端點                                      | 使用情境 |
| ----------------- | ----------------------------------------- | -------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 一般模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 編碼模型 |

<Note>兩個提供者皆透過單一 API 金鑰設定。設定程序會自動註冊兩者。</Note>

## 可用模型

<Tabs>
  <Tab title="一般 (volcengine)">
    | 模型參照 | 名稱 | 輸入 | 上下文 | | -------------------------------------------- | ------------------------------- | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | text, image | 256,000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | text, image | 256,000 | | `volcengine/kimi-k2-5-260127` | Kimi K2.5 | text, image |
    256,000 | | `volcengine/glm-4-7-251222` | GLM 4.7 | text, image | 200,000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | text, image | 128,000 |
  </Tab>
  <Tab title="編碼 (volcengine-plan)">
    | 模型參考 | 名稱 | 輸入 | 上下文 | | ------------------------------------------------- | ------------------------ | ----- | ------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | text | 256,000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | text | 256,000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | text | 200,000 | | `volcengine-plan/kimi-k2-thinking` | Kimi K2
    Thinking | text | 256,000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | text | 256,000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | text | 256,000 |
  </Tab>
</Tabs>

## 進階說明

<AccordionGroup>
  <Accordion title="入會後的預設模型">
    `openclaw onboard --auth-choice volcengine-api-key` 目前將
    `volcengine-plan/ark-code-latest` 設為預設模型，同時也註冊了
    一般的 `volcengine` 目錄。
  </Accordion>

<Accordion title="模型選擇器的後備行為">在入會/設定模型選擇期間，Volcengine 驗證選項偏好 `volcengine/*` 和 `volcengine-plan/*` 這兩列。如果這些模型尚未 載入，OpenClaw 會後備到未過濾的目錄，而不是顯示 空白的提供者範圍選擇器。</Accordion>

  <Accordion title="守護程序的環境變數">
    如果 Gateway 作為守護程序 (launchd/systemd) 運行，請確保
    `VOLCANO_ENGINE_API_KEY` 可供該程序使用（例如，在
    `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

<Warning>當將 OpenClaw 作為背景服務運行時，在您的互動 shell 中設定的環境變數不會自動繼承。請參閱上述關於守進程序的說明。</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參考和故障轉移行為。
  </Card>
  <Card title="Configuration" href="/en/configuration" icon="gear">
    代理、模型和供應商的完整配置參考。
  </Card>
  <Card title="Troubleshooting" href="/en/help/troubleshooting" icon="wrench">
    常見問題和除錯步驟。
  </Card>
  <Card title="FAQ" href="/en/help/faq" icon="circle-question">
    關於 OpenClaw 設定的常見問題。
  </Card>
</CardGroup>
