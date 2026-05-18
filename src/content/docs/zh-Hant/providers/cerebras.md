---
summary: "Cerebras 設定（驗證 + 模型選擇）"
title: "Cerebras"
read_when:
  - You want to use Cerebras with OpenClaw
  - You need the Cerebras API key env var or CLI auth choice
---

[Cerebras](https://www.cerebras.ai) 在自訂推論硬體上提供高速的 OpenAI 相容推論。OpenClaw 包含了一個內建的 Cerebras 提供者外掛，並附帶一個靜態的四模型目錄。

| 屬性          | 值                                  |
| ------------- | ----------------------------------- |
| 提供者 ID     | `cerebras`                          |
| 外掛          | 內建，`enabledByDefault: true`      |
| 驗證環境變數  | `CEREBRAS_API_KEY`                  |
| 入門旗標      | `--auth-choice cerebras-api-key`    |
| 直接 CLI 旗標 | `--cerebras-api-key <key>`          |
| API           | OpenAI 相容（`openai-completions`） |
| 基礎 URL      | `https://api.cerebras.ai/v1`        |
| 預設模型      | `cerebras/zai-glm-4.7`              |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在 [Cerebras Cloud Console](https://cloud.cerebras.ai) 中建立 API 金鑰。
  </Step>
  <Step title="執行入門程式">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice cerebras-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

```bash Env only
export CEREBRAS_API_KEY=csk-...
```

    </CodeGroup>

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider cerebras
    ```

    列表應包含所有四個內建模型。如果 `CEREBRAS_API_KEY` 未解析，`openclaw models status --json` 會在 `auth.unusableProfiles` 下回報遺失的憑證。

  </Step>
</Steps>

## 非互動式設定

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## 內建目錄

OpenClaw 附帶一個靜態的 Cerebras 目錄，反映公開的 OpenAI 相容端點。所有四個模型都共享 128k 上下文和 8,192 個最大輸出 token。

| 模型參考                                  | 名稱                 | 推理 | 備註                   |
| ----------------------------------------- | -------------------- | ---- | ---------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | 是   | 預設模型；預覽推理模型 |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | 是   | 生產環境推理模型       |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | 否   | 預覽非推理模型         |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | 否   | 生產環境速度優先模型   |

<Warning>Cerebras 將 `zai-glm-4.7` 和 `qwen-3-235b-a22b-instruct-2507` 標記為預覽模型，且 `llama3.1-8b` 加上 `qwen-3-235b-a22b-instruct-2507` 已記錄將於 2026 年 5 月 27 日棄用。在依賴這些模型用於生產工作負載之前，請查看 Cerebras 的 supported-models 頁面。</Warning>

## 手動配置

由於包含捆綁的插件，通常您只需要 API 金鑰。當您想要覆寫模型元數據或針對靜態目錄在 `mode: "merge"` 中執行時，請使用明確的 `models.providers.cerebras` 配置：

```json5
{
  env: { CEREBRAS_API_KEY: "csk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/zai-glm-4.7" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "Z.ai GLM 4.7" },
          { id: "gpt-oss-120b", name: "GPT OSS 120B" },
        ],
      },
    },
  },
}
```

<Note>如果 Gateway 以 daemon (launchd, systemd, Docker) 形式執行，請確保 `CEREBRAS_API_KEY` 對該程序可用 — 例如在 `~/.openclaw/.env` 中或透過 `env.shellEnv`。僅在互動式 shell 中匯出的金鑰將無助於受管理的服務，除非環境變數被單獨匯入。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="模型提供者" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="思考模式" href="/zh-Hant/tools/thinking" icon="brain">
    兩個具備推理能力的 Cerebras 模型的推理努力等級。
  </Card>
  <Card title="配置參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值和模型配置。
  </Card>
  <Card title="模型常見問題" href="/zh-Hant/help/faq-models" icon="circle-question">
    驗證設定檔、切換模型以及解決「no profile」錯誤。
  </Card>
</CardGroup>
