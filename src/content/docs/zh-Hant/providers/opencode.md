---
summary: "在 OpenClaw 中使用 OpenCode Zen 和 Go 目錄"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

# OpenCode

OpenCode 在 OpenClaw 中公開了兩個託管目錄：

| 目錄    | 前綴              | 執行時提供者  |
| ------- | ----------------- | ------------- |
| **Zen** | `opencode/...`    | `opencode`    |
| **Go**  | `opencode-go/...` | `opencode-go` |

這兩個目錄使用同一個 OpenCode API 金鑰。OpenClaw 將執行時提供者 ID 分開，以便上游的每個模型路由保持正確，但在入門和文件中，將它們視為一個 OpenCode 設定。

## 開始使用

<Tabs>
  <Tab title="Zen 目錄">
    **最適合：** 經過策劃的 OpenCode 多模型代理 (Claude、GPT、Gemini)。

    <Steps>
      <Step title="執行入門設定">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        或直接傳遞金鑰：

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="將 Zen 模型設為預設">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode/claude-opus-4-6"
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Go 目錄">
    **最適合：** OpenCode 託管的 Kimi、GLM 和 MiniMax 陣容。

    <Steps>
      <Step title="執行入門設定">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        或直接傳遞金鑰：

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="將 Go 模型設為預設">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 設定範例

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 目錄

### Zen

| 屬性         | 值                                                                      |
| ------------ | ----------------------------------------------------------------------- |
| 執行時提供者 | `opencode`                                                              |
| 範例模型     | `opencode/claude-opus-4-6`, `opencode/gpt-5.4`, `opencode/gemini-3-pro` |

### Go

| 屬性         | 值                                                                       |
| ------------ | ------------------------------------------------------------------------ |
| 執行時提供者 | `opencode-go`                                                            |
| 範例模型     | `opencode-go/kimi-k2.5`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## 進階說明

<AccordionGroup>
  <Accordion title="API 金鑰別名">
    `OPENCODE_ZEN_API_KEY` 也支援作為 `OPENCODE_API_KEY` 的別名。
  </Accordion>

<Accordion title="共享憑證">在設定期間輸入一個 OpenCode 金鑰即可儲存這兩個執行時提供者的憑證。 您不需要分別為每個目錄進行註冊。</Accordion>

<Accordion title="計費與儀表板">您登入 OpenCode、新增計費詳細資料，並複製您的 API 金鑰。計費 和目錄可用性是在 OpenCode 儀表板中管理的。</Accordion>

<Accordion title="Gemini 重新播放行為">由 Gemini 支援的 OpenCode refs 會保持在 proxy-Gemini 路徑上，因此 OpenClaw 會 在那裡保留 Gemini 思考簽章清理，而不啟用原生的 Gemini 重新播放驗證或 bootstrap 重寫。</Accordion>

  <Accordion title="非 Gemini 重新播放行為">
    非 Gemini 的 OpenCode refs 保持最低限度的 OpenAI 相容重新播放原則。
  </Accordion>
</AccordionGroup>

<Tip>在設定期間輸入一個 OpenCode 金鑰即可同時儲存 Zen 和 Go 執行時提供者的憑證，因此您只需要註冊一次。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型 refs 和容錯移轉行為。
  </Card>
  <Card title="設定參考" href="/en/gateway/configuration-reference" icon="gear">
    代理程式、模型和提供者的完整設定參考。
  </Card>
</CardGroup>
