---
summary: "Hy3 預覽的騰訊雲 TokenHub 設定"
title: "騰訊雲 (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

騰訊雲作為 OpenClaw 中的內建供應商插件隨附。它使用與 OpenAI 相容的 API，透過 TokenHub 端點 (`tencent-tokenhub`) 提供對騰訊 Hy3 預覽的存取權。

| 屬性          | 值                                                |
| ------------- | ------------------------------------------------- |
| 供應商 ID     | `tencent-tokenhub`                                |
| 插件          | 內建，`enabledByDefault: true`                    |
| 認證環境變數  | `TOKENHUB_API_KEY`                                |
| 入門旗標      | `--auth-choice tokenhub-api-key`                  |
| 直接 CLI 旗標 | `--tokenhub-api-key <key>`                        |
| API           | OpenAI 相容 (`openai-completions`)                |
| 預設基礎 URL  | `https://tokenhub.tencentmaas.com/v1`             |
| 全域基礎 URL  | `https://tokenhub-intl.tencentmaas.com/v1` (覆寫) |
| 預設模型      | `tencent-tokenhub/hy3-preview`                    |

## 快速開始

<Steps>
  <Step title="建立 TokenHub API 金鑰">
    在騰訊雲 TokenHub 中建立 API 金鑰。如果您選擇了金鑰的有限存取範圍，請在允許的模型中包含 **Hy3 preview**。
  </Step>
  <Step title="執行入門程序">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice tokenhub-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY"
```

```bash Env only
export TOKENHUB_API_KEY=...
```

    </CodeGroup>

  </Step>
  <Step title="Verify the model">
    ```bash
    openclaw models list --provider tencent-tokenhub
    ```
  </Step>
</Steps>

## 非互動式設定

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## 內建目錄

| 模型參照                       | 名稱                | 輸入 | 語境    | 最大輸出 | 備註               |
| ------------------------------ | ------------------- | ---- | ------- | -------- | ------------------ |
| `tencent-tokenhub/hy3-preview` | Hy3 預覽 (TokenHub) | 文字 | 256,000 | 64,000   | 預設；具備推理能力 |

Hy3 預覽是騰訊混元的大規模 MoE 語言模型，適用於推理、長語境指令遵循、程式碼和代理工作流程。騰訊的 OpenAI 相容範例使用 `hy3-preview` 作為模型 ID，並支援標準的 chat-completions 工具呼叫以及 `reasoning_effort`。

<Tip>模型 ID 是 `hy3-preview`。請勿將其與騰訊的 `HY-3D-*` 模型混淆，後者是 3D 生成 API，並非由此供應商設定的 OpenClaw 聊天模型。</Tip>

## 分級定價

內建目錄隨附了隨輸入視窗長度縮放的分級成本元數據，因此無需手動覆寫即可填入成本估計值。

| 輸入 token 範圍 | 輸入費率 | 輸出費率 | 快取讀取 |
| --------------- | -------- | -------- | -------- |
| 0 - 16,000      | 0.176    | 0.587    | 0.059    |
| 16,000 - 32,000 | 0.235    | 0.939    | 0.088    |
| 32,000+         | 0.293    | 1.173    | 0.117    |

費率為騰訊公佈的每百萬 Token 美元價格。僅在您需要不同的顯示價格時，才在 `models.providers.tencent-tokenhub` 下覆蓋定價。

## 進階設定

<AccordionGroup>
  <Accordion title="Endpoint override">
    OpenClaw 預設使用騰訊雲的 `https://tokenhub.tencentmaas.com/v1` 端點。騰訊也記載了國際版 TokenHub 端點：

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
    ```

    僅在您的 TokenHub 帳號或區域有要求時才覆蓋端點。

  </Accordion>

  <Accordion title="Environment availability for the daemon">
    如果 Gateway 作為受管服務（launchd、systemd、Docker）運行，`TOKENHUB_API_KEY` 對該程序必須是可見的。請在 `~/.openclaw/.env` 中設定或透過 `env.shellEnv` 設定，以便 launchd、systemd 或 Docker exec 環境可以讀取它。

    <Warning>
      僅在 `~/.profile` 中設定的金鑰對受管的 gateway 程序是不可見的。請使用 env 檔案或 config 縫隙以確保持久可用性。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration" icon="gear">
    完整的配置架構，包括供應商設定。
  </Card>
  <Card title="Tencent TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    騰訊雲的 TokenHub 產品頁面。
  </Card>
  <Card title="Hy3 preview model card" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    騰訊混元 Hy3 preview 的詳細資訊和基準測試。
  </Card>
</CardGroup>
