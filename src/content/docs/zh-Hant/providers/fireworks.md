---
summary: "Fireworks 設定（驗證 + 模型選擇）"
title: "Fireworks"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
  - You are debugging Kimi thinking-off behavior on Fireworks
---

[Fireworks](https://fireworks.ai) 透過與 OpenAI 相容的 API 提供開放權重和路由模型。OpenClaw 包含一個內建的 Fireworks 提供者外掛程式，隨附兩個已預編錄的 Kimi 模型，並在執行時接受任何 Fireworks 模型或路由器 ID。

| 屬性          | 值                                                     |
| ------------- | ------------------------------------------------------ |
| 提供者 ID     | `fireworks` (別名：`fireworks-ai`)                     |
| 外掛程式      | 內建，`enabledByDefault: true`                         |
| 驗證環境變數  | `FIREWORKS_API_KEY`                                    |
| 入門旗標      | `--auth-choice fireworks-api-key`                      |
| 直接 CLI 旗標 | `--fireworks-api-key <key>`                            |
| API           | OpenAI 相容 (`openai-completions`)                     |
| 基礎 URL      | `https://api.fireworks.ai/inference/v1`                |
| 預設模型      | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |
| 預設別名      | `Kimi K2.5 Turbo`                                      |

## 開始使用

<Steps>
  <Step title="設定 Fireworks API 金鑰">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice fireworks-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY"
```

```bash Env only
export FIREWORKS_API_KEY=fw-...
```

    </CodeGroup>

    入門程序會將金鑰儲存在您的驗證設定檔中的 `fireworks` 提供者下，並將 **Fire Pass** Kimi K2.5 Turbo 路由器設為預設模型。

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```

    清單應包含 `Kimi K2.6` 和 `Kimi K2.5 Turbo (Fire Pass)`。如果 `FIREWORKS_API_KEY` 未解析，`openclaw models status --json` 會在 `auth.unusableProfiles` 下回報遺失的憑證。

  </Step>
</Steps>

## 非互動式設定

對於指令碼或 CI 安裝，請在命令列中傳遞所有內容：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 內建目錄

| 模型參照                                               | 名稱                        | 輸入        | 脈絡    | 最大輸出 | 思考             |
| ------------------------------------------------------ | --------------------------- | ----------- | ------- | -------- | ---------------- |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | 文字 + 圖片 | 262,144 | 262,144  | 強制關閉         |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | 文字 + 圖片 | 256,000 | 256,000  | 強制關閉（預設） |

<Note>OpenClaw 將所有 Fireworks Kimi 模型固定為 `thinking: off`，因為 Fireworks 在生產環境中拒絕 Kimi 思維參數。透過 [Moonshot](/zh-Hant/providers/moonshot) 直接路由相同模型可保留 Kimi 推理輸出。請參閱 [思維模式](/zh-Hant/tools/thinking) 以了解如何在提供者之間切換。</Note>

## 自訂 Fireworks 模型 ID

OpenClaw 在執行時接受任何 Fireworks 模型或路由器 ID。請使用 Fireworks 顯示的確切 ID，並加上 `fireworks/` 前綴。動態解析會複製 Fire Pass 模板（文字 + 圖片輸入、OpenAI 相容 API、預設成本為零），並在 ID 符合 Kimi 模式時自動停用思維功能。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/models/<your-model-id>",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="模型 ID 前綴如何運作">
    OpenClaw 中的每個 Fireworks 模型引用都以 `fireworks/` 開頭，後面接著來自 Fireworks 平台的确切 ID 或路由路徑。例如：

    - Router 模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - Direct 模型：`fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在建構 API 請求時會移除 `fireworks/` 前綴，並將剩餘路徑作為 OpenAI 相容的 `model` 欄位發送到 Fireworks 端點。

  </Accordion>

  <Accordion title="為什麼對 Kimi 強制關閉思考">
    即使 Kimi 支援透過 Moonshot 自己的 API 進行思考，但如果請求攜帶 `reasoning_*` 參數，Fireworks K2.6 會傳回 400。隨附的政策 (`extensions/fireworks/thinking-policy.ts`) 僅宣佈 Kimi 模型 ID 的 `off` 思考層級，因此手動 `/think` 開關與提供者政策介面會與執行時期合約保持一致。

    若要端對端使用 Kimi 推理，請設定 [Moonshot 提供者](/zh-Hant/providers/moonshot) 並透過它路由同一個模型。

  </Accordion>

  <Accordion title="Environment availability for the daemon">
    如果 Gateway 作為受管服務（launchd、systemd、Docker）執行，Fireworks 金鑰必須對該程序可見——而不僅僅是對您的互動式 shell 可見。

    <Warning>
      僅存在於 `~/.profile` 中的金鑰將無法幫助 launchd 或 systemd 守護程序，除非該環境也在那裡被匯入。在 `~/.openclaw/.env` 或透過 `env.shellEnv` 設定金鑰，以使閘道程序可以讀取它。
    </Warning>

    在 macOS 上，`openclaw gateway install` 已經將 `~/.openclaw/.env` 連接到 LaunchAgent 環境檔案中。輪換金鑰後請重新執行安裝（或 `openclaw doctor --fix`）。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Thinking modes" href="/zh-Hant/tools/thinking" icon="brain">
    `/think` 層級、提供者政策，以及路由具備推理能力的模型。
  </Card>
  <Card title="Moonshot" href="/zh-Hant/providers/moonshot" icon="moon">
    透過 Moonshot 自己的 API 執行具有原生思考輸出的 Kimi。
  </Card>
  <Card title="Troubleshooting" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
