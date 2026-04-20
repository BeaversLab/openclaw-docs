---
summary: "使用 OpenClaw 的小米 MiMo 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "小米 MiMo"
---

# Xiaomi MiMo

小米 MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用小米
OpenAI 相容的端點，並採用 API 金鑰進行驗證。

| 屬性     | 值                              |
| -------- | ------------------------------- |
| 提供者   | `xiaomi`                        |
| 驗證     | `XIAOMI_API_KEY`                |
| API      | OpenAI 相容                     |
| 基礎 URL | `https://api.xiaomimimo.com/v1` |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在 [小米 MiMo 主控台](https://platform.xiaomimimo.com/#/console/api-keys) 中建立 API 金鑰。
  </Step>
  <Step title="執行上手引導">
    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    或直接傳遞金鑰：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    ```
  </Step>
</Steps>

## 可用模型

| 模型參照               | 輸入       | 脈絡      | 最大輸出 | 推理 | 備註     |
| ---------------------- | ---------- | --------- | -------- | ---- | -------- |
| `xiaomi/mimo-v2-flash` | 文字       | 262,144   | 8,192    | 否   | 預設模型 |
| `xiaomi/mimo-v2-pro`   | 文字       | 1,048,576 | 32,000   | 是   | 長脈絡   |
| `xiaomi/mimo-v2-omni`  | 文字、圖片 | 262,144   | 32,000   | 是   | 多模態   |

<Tip>預設模型參照為 `xiaomi/mimo-v2-flash`。當設定 `XIAOMI_API_KEY` 或存在驗證設定檔時，提供者會自動注入。</Tip>

## 設定範例

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="自動注入行為">
    當在您的環境中設定 `XIAOMI_API_KEY` 或存在驗證設定檔時，`xiaomi` 提供者會自動注入。除非您想要覆寫模型中繼資料或基礎 URL，否則您不需要手動設定提供者。
  </Accordion>

  <Accordion title="Model details">
    - **mimo-v2-flash** — 輕量且快速，非常適合通用文字任務。不支援推理功能。
    - **mimo-v2-pro** — 支援推理功能，具備 1M token 的上下文視窗，適合處理長文件工作負載。
    - **mimo-v2-omni** — 具備推理功能的多模組模型，可接受文字和圖像輸入。

    <Note>
    所有模型均使用 `xiaomi/` 前綴（例如 `xiaomi/mimo-v2-pro`）。
    </Note>

  </Accordion>

  <Accordion title="Troubleshooting">
    - 如果未顯示模型，請確認 `XIAOMI_API_KEY` 已設定且有效。
    - 當 Gateway 以守護程序執行時，請確保該程序可存取金鑰（例如在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

    <Warning>
    僅在互動式 Shell 中設定的金鑰，對由守護程序管理的 Gateway 程序是不可見的。請使用 `~/.openclaw/.env` 或 `env.shellEnv` 設定以確保持續可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關連結

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration" icon="gear">
    完整的 OpenClaw 設定參考。
  </Card>
  <Card title="Xiaomi MiMo console" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 儀表板與 API 金鑰管理。
  </Card>
</CardGroup>
