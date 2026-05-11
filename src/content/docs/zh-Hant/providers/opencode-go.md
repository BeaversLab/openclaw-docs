---
summary: "使用共享的 OpenCode 設定來使用 OpenCode Go 目錄"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

OpenCode Go 是 [OpenCode](/zh-Hant/providers/opencode) 內的 Go 目錄。
它使用與 Zen 目錄相同的 `OPENCODE_API_KEY`，但保留 runtime
provider id 為 `opencode-go`，以便上游的每個模型路由保持正確。

| 屬性             | 值                                 |
| ---------------- | ---------------------------------- |
| Runtime provider | `opencode-go`                      |
| 驗證             | `OPENCODE_API_KEY`                 |
| 父級設定         | [OpenCode](/zh-Hant/providers/opencode) |

## 內建目錄

OpenClaw 大部分 Go 目錄項目來自捆綁的 pi 模型註冊表，並在註冊表趕上進度時補充當前的上游項目。執行
`openclaw models list --provider opencode-go` 以取得目前的模型列表。

此提供者包含：

| 模型參照                        | 名稱                |
| ------------------------------- | ------------------- |
| `opencode-go/glm-5`             | GLM-5               |
| `opencode-go/glm-5.1`           | GLM-5.1             |
| `opencode-go/kimi-k2.5`         | Kimi K2.5           |
| `opencode-go/kimi-k2.6`         | Kimi K2.6 (3x 限制) |
| `opencode-go/deepseek-v4-pro`   | DeepSeek V4 Pro     |
| `opencode-go/deepseek-v4-flash` | DeepSeek V4 Flash   |
| `opencode-go/mimo-v2-omni`      | MiMo V2 Omni        |
| `opencode-go/mimo-v2-pro`       | MiMo V2 Pro         |
| `opencode-go/minimax-m2.5`      | MiniMax M2.5        |
| `opencode-go/minimax-m2.7`      | MiniMax M2.7        |
| `opencode-go/qwen3.5-plus`      | Qwen3.5 Plus        |
| `opencode-go/qwen3.6-plus`      | Qwen3.6 Plus        |

## 開始使用

<Tabs>
  <Tab title="互動式">
    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="Set a Go model as default">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="非互動式">
    <Steps>
      <Step title="Pass the key directly">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Verify models are available">
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
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.6" } } },
}
```

## 進階設定

<AccordionGroup>
  <Accordion title="路由行為">
    當模型參照使用 `opencode-go/...` 時，OpenClaw 會自動處理每個模型的路由。無需額外的提供者設定。
  </Accordion>

<Accordion title="Runtime 參照慣例">Runtime 參照保持明確：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`。 這讓上游的每個模型路由在兩個目錄之間保持正確。</Accordion>

  <Accordion title="Shared credentials">
    Zen 和 Go 目錄使用相同的 `OPENCODE_API_KEY`。在設定期間輸入金鑰會同時儲存這兩個執行時提供者的憑證。
  </Accordion>
</AccordionGroup>

<Tip>請參閱 [OpenCode](/zh-Hant/providers/opencode) 以了解共用的入門概述以及完整的 Zen + Go 目錄參考資料。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="OpenCode (parent)" href="/zh-Hant/providers/opencode" icon="server">
    共用的入門流程、目錄概述及進階說明。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
</CardGroup>
