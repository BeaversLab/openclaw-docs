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

| 屬性         | 值                                      |
| ------------ | --------------------------------------- |
| 運行時提供者 | `opencode-go`                           |
| 驗證         | `OPENCODE_API_KEY`                      |
| 父級設定     | [OpenCode](/zh-Hant/providers/opencode) |

## 支援的模型

| 模型參考                   | 名稱         |
| -------------------------- | ------------ |
| `opencode-go/kimi-k2.5`    | Kimi K2.5    |
| `opencode-go/glm-5`        | GLM 5        |
| `opencode-go/minimax-m2.5` | MiniMax M2.5 |

## 開始使用

<Tabs>
  <Tab title="Interactive">
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

  <Tab title="非互動式">
    <Steps>
      <Step title="直接傳遞金鑰">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
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
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## 進階說明

<AccordionGroup>
  <Accordion title="路由行為">
    當模型參考使用
    `opencode-go/...` 時，OpenClaw 會自動處理每個模型的路由。不需要額外的提供者設定。
  </Accordion>

<Accordion title="運行時參考慣例">運行時參考保持明確：`opencode/...` 用於 Zen，`opencode-go/...` 用於 Go。 這可確保兩個目錄之間的上游每個模型路由保持正確。</Accordion>

  <Accordion title="共用憑證">
    Zen 和 Go 目錄使用相同的 `OPENCODE_API_KEY`。在設定期間輸入金鑰會儲存這兩個運行時提供者的憑證。
  </Accordion>
</AccordionGroup>

<Tip>請參閱 [OpenCode](/zh-Hant/providers/opencode) 以了解共用的入門概述以及完整的 Zen + Go 目錄參考。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="OpenCode (parent)" href="/zh-Hant/providers/opencode" icon="server">
    共用的入門指南、型錄概觀與進階說明。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照與容錯移轉行為。
  </Card>
</CardGroup>
