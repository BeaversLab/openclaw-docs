---
summary: "使用共享的 OpenCode 設定來使用 OpenCode Go 目錄"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go 是 [OpenCode](/zh-Hant/providers/opencode) 內的 Go 目錄。
它使用與 Zen 目錄相同的 `OPENCODE_API_KEY`，但保持運行時
提供者 ID 為 `opencode-go`，以便上游的每個模型路由保持正確。

| 屬性         | 值                                 |
| ------------ | ---------------------------------- |
| 運行時提供者 | `opencode-go`                      |
| 驗證         | `OPENCODE_API_KEY`                 |
| 父級設定     | [OpenCode](/zh-Hant/providers/opencode) |

## 支援的模型

| 模型參考                   | 名稱         |
| -------------------------- | ------------ |
| `opencode-go/kimi-k2.5`    | Kimi K2.5    |
| `opencode-go/glm-5`        | GLM 5        |
| `opencode-go/minimax-m2.5` | MiniMax M2.5 |

## 開始使用

<Tabs>
  <Tab title="互動">
    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="Set a Go model as default">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="非互動">
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

## 配置範例

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## 進階說明

<AccordionGroup>
  <Accordion title="路由行為">
    當模型參照使用 `opencode-go/...` 時，OpenClaw 會自動處理每個模型的路由。不需要額外的提供者配置。
  </Accordion>

<Accordion title="Runtime 參照慣例">Runtime 參照保持明確：Zen 為 `opencode/...`，Go 為 `opencode-go/...`。 這能確保上游每個模型的路由在兩個目錄中保持正確。</Accordion>

  <Accordion title="共用認證">
    Zen 和 Go 目錄使用相同的 `OPENCODE_API_KEY`。在設定期間輸入金鑰會同時儲存這兩個 runtime 提供者的認證。
  </Accordion>
</AccordionGroup>

<Tip>請參閱 [OpenCode](/zh-Hant/providers/opencode) 以了解共用的入門概述以及完整的 Zen + Go 目錄參照。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="OpenCode (上層)" href="/zh-Hant/providers/opencode" icon="server">
    共用入門、目錄概述及進階說明。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
</CardGroup>
