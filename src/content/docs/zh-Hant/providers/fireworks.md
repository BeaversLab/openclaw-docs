---
title: "Fireworks"
summary: "Fireworks 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) 透過相容 OpenAI 的 API 提供開放權重和路由模型。OpenClaw 包含內建的 Fireworks 供應商外掛。

| 屬性     | 值                                                     |
| -------- | ------------------------------------------------------ |
| 供應商   | `fireworks`                                            |
| 驗證     | `FIREWORKS_API_KEY`                                    |
| API      | 相容 OpenAI 的聊天/完成                                |
| 基礎 URL | `https://api.fireworks.ai/inference/v1`                |
| 預設模型 | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## 開始使用

<Steps>
  <Step title="透過入職導覽設定 Fireworks 驗證">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    這會將您的 Fireworks 金鑰儲存在 OpenClaw 設定中，並將 Fire Pass 入門模型設為預設值。

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## 非互動式範例

對於腳本或 CI 設定，請在命令列傳遞所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 內建目錄

| 模型參考                                               | 名稱                        | 輸入       | 內容    | 最大輸出 | 備註                           |
| ------------------------------------------------------ | --------------------------- | ---------- | ------- | -------- | ------------------------------ |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | text,image | 256,000 | 256,000  | Fireworks 上的預設內建入門模型 |

<Tip>如果 Fireworks 發布了較新的模型（例如全新的 Qwen 或 Gemma 版本），您可以直接使用其 Fireworks 模型 id 切換過去，無需等待內建目錄更新。</Tip>

## 自訂 Fireworks 模型 id

OpenClaw 也接受動態的 Fireworks 模型 id。使用 Fireworks 顯示的確切模型或路由器 id，並在其前面加上 `fireworks/`。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="模型 id 前綴如何運作">
    OpenClaw 中的每個 Fireworks 模型參考都以 `fireworks/` 開頭，後面接著來自 Fireworks 平台的確切 id 或路由路徑。例如：

    - Router 模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - Direct 模型：`fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在建構 API 請求時會移除 `fireworks/` 前綴，並將剩餘路徑發送到 Fireworks 端點。

  </Accordion>

  <Accordion title="環境提示">
    如果 Gateway 在您的互動式 shell 之外運行，請確保 `FIREWORKS_API_KEY` 對該程序也可用。

    <Warning>
    僅存在於 `~/.profile` 中的金鑰對 launchd/systemd 守護程序沒有幫助，除非該環境也同時被匯入。請在 `~/.openclaw/.env` 或透過 `env.shellEnv` 設定金鑰，以確保 gateway 程序能夠讀取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關內容

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解和常見問題。
  </Card>
</CardGroup>
