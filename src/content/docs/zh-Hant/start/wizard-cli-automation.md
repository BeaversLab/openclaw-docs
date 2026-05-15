---
summary: "OpenClaw CLI 的腳本化入門和代理程式設定"
read_when:
  - You are automating onboarding in scripts or CI
  - You need non-interactive examples for specific providers
title: "CLI 自動化"
sidebarTitle: "CLI 自動化"
---

使用 `--non-interactive` 來自動化 `openclaw onboard`。

<Note>`--json` 並不意味著非互動模式。請在腳本中使用 `--non-interactive` (以及 `--workspace`)。</Note>

## 基礎非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --secret-input-mode plaintext \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-bootstrap \
  --skip-skills
```

新增 `--json` 以取得機器可讀取的摘要。

當您的自動化預先植入工作區檔案，並且不希望入門流程建立預設的啟動檔案時，請使用 `--skip-bootstrap`。

使用 `--secret-input-mode ref` 將環境變數支援的參照 (env-backed refs) 儲存在設定檔中，而不是純文字值。
在入門流程中，可以進行環境變數參照與已設定的提供者參照 (`file` 或 `exec`) 之間的互動式選擇。

在非互動式 `ref` 模式下，必須在程序環境中設定提供者環境變數。
現在，如果傳遞內聯金鑰旗標但沒有相符的環境變數，將會快速失敗。

範例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

## 特定提供者的範例

<AccordionGroup>
  <Accordion title="Anthropic API 金鑰範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice apiKey \
      --anthropic-api-key "$ANTHROPIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Gemini 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice cloudflare-ai-gateway-api-key \
      --cloudflare-ai-gateway-account-id "your-account-id" \
      --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
      --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Moonshot 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Mistral 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="綜合範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="OpenCode 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
    切換至 `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"` 以使用 Go 目錄。
  </Accordion>
  <Accordion title="Ollama 範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ollama \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="自訂供應商範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --custom-api-key "$CUSTOM_API_KEY" \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --custom-image-input \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    `--custom-api-key` 是可選的。如果省略，入門向導會檢查 `CUSTOM_API_KEY`。
    OpenClaw 會自動將常見的視覺模型 ID 標記為具備影像處理能力。為未知的自訂視覺 ID 新增 `--custom-image-input`，或新增 `--custom-text-input` 以強制僅使用文字元資料。

    參照模式變體：

    ```bash
    export CUSTOM_API_KEY="your-key"
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --secret-input-mode ref \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --custom-image-input \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    在此模式下，入門向導會將 `apiKey` 儲存為 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。

  </Accordion>
</AccordionGroup>

Anthropic setup-token 仍然可用作支援的 onboarding token 路徑，但 OpenClaw 現在會優先使用可用的 Claude CLI。對於生產環境，建議使用 Anthropic API 金鑰。

## 新增另一個代理程式

使用 `openclaw agents add <name>` 建立一個擁有自己工作區、
工作階段和驗證設定檔的獨立代理程式。若未帶 `--workspace` 執行則會啟動精靈。

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

設定項目：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

備註：

- 預設工作區遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳送傳入訊息（精靈可以執行此操作）。
- 非互動式旗標：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 相關文件

- 入門中心：[入門 (CLI)](/zh-Hant/start/wizard)
- 完整參考：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference)
- 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
