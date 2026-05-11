---
summary: "在 OpenClaw 中使用 OpenCode Zen 和 Go 目錄"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

OpenCode 在 OpenClaw 中公開了兩個託管目錄：

| 目錄    | 前綴              | Runtime provider |
| ------- | ----------------- | ---------------- |
| **Zen** | `opencode/...`    | `opencode`       |
| **Go**  | `opencode-go/...` | `opencode-go`    |

這兩個目錄使用相同的 OpenCode API 金鑰。OpenClaw 保持 runtime provider id 分開，以便上游按模型的路由保持正確，但入門指南和文件將它們視為一個 OpenCode 設定。

## 開始使用

<Tabs>
  <Tab title="Zen 目錄">
    **最適合用於：** 經過策劃的 OpenCode 多模型代理（Claude、GPT、Gemini）。

    <Steps>
      <Step title="執行入門">
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
    **最適合用於：** 由 OpenCode 託管的 Kimi、GLM 和 MiniMax 系列。

    <Steps>
      <Step title="執行入門">
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
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
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

## 內建目錄

### Zen

| 屬性             | 值                                                                      |
| ---------------- | ----------------------------------------------------------------------- |
| Runtime provider | `opencode`                                                              |
| 範例模型         | `opencode/claude-opus-4-6`, `opencode/gpt-5.5`, `opencode/gemini-3-pro` |

### Go

| 屬性             | 值                                                                       |
| ---------------- | ------------------------------------------------------------------------ |
| Runtime provider | `opencode-go`                                                            |
| 範例模型         | `opencode-go/kimi-k2.6`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## 進階設定

<AccordionGroup>
  <Accordion title="API 金鑰別名">
    `OPENCODE_ZEN_API_KEY` 也支援作為 `OPENCODE_API_KEY` 的別名。
  </Accordion>

<Accordion title="共用認證">在設定期間輸入一個 OpenCode 金鑰會儲存這兩個執行時提供者的 認證資訊。您不需要分別為每個目錄進行上架。</Accordion>

<Accordion title="計費與儀表板">您登入 OpenCode，新增計費詳細資訊，並複製您的 API 金鑰。計費 和目錄可用性是從 OpenCode 儀表板進行管理的。</Accordion>

<Accordion title="Gemini 重播行為">支援 Gemini 的 OpenCode 參照會停留在 proxy-Gemini 路徑上，因此 OpenClaw 會在該處保留 Gemini 思維簽章清理，而不啟用原生的 Gemini 重播驗證或啟動重寫。</Accordion>

  <Accordion title="非 Gemini 重播行為">
    非 Gemini 的 OpenCode 參照會保持最少的 OpenAI 相容重播原則。
  </Accordion>
</AccordionGroup>

<Tip>在設定期間輸入一個 OpenCode 金鑰會為 Zen 和 Go 這兩個執行時提供者儲存認證資訊，因此您只需上架一次。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理程式、模型和提供者的完整設定參考。
  </Card>
</CardGroup>
