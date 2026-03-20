---
summary: "OpenClaw CLI 的腳本化入門與代理程式設定"
read_when:
  - 您正在腳本或 CI 中自動化入門流程
  - 您需要特定提供者的非互動式範例
title: "CLI Automation"
sidebarTitle: "CLI automation"
---

# CLI 自動化

使用 `--non-interactive` 來自動化 `openclaw onboard`。

<Note>
  `--json` 並不意味著非互動模式。請使用 `--non-interactive` (以及 `--workspace`) 來撰寫腳本。
</Note>

## 基準非互動範例

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
  --skip-skills
```

新增 `--json` 以取得機器可讀的摘要。

使用 `--secret-input-mode ref` 在認證設定檔中儲存環境變數參照，而非明文值。
在入門流程中，可進行環境變數參照與已設定提供者參照 (`file` 或 `exec`) 之間的互動式選擇。

在非互動式 `ref` 模式下，必須在程序環境中設定提供者環境變數。
若未設定對應的環境變數，直接傳遞內聯金鑰標誌將會立即失敗。

範例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

## Provider 特定範例

<AccordionGroup>
  <Accordion title="Gemini example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway example">
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
  <Accordion title="Moonshot example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Mistral example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Synthetic example">
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
  <Accordion title="自訂提供者範例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --custom-api-key "$CUSTOM_API_KEY" \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    `--custom-api-key` 為選填。若省略，onboarding 會檢查 `CUSTOM_API_KEY`。

    Ref 模式變體：

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
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    在此模式下，onboarding 會將 `apiKey` 儲存為 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。

  </Accordion>
</AccordionGroup>

## 新增另一個 Agent

使用 `openclaw agents add <name>` 建立擁有自己工作區、階段作業與 auth 設定檔的獨立代理程式。若不使用 `--workspace` 執行，則會啟動精靈。

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
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
- 新增 `bindings` 以路由傳送傳入訊息（精靈可執行此動作）。
- 非互動式標誌：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 相關文件

- 入職中心：[入職 (CLI)](/zh-Hant/start/wizard)
- 完整參考：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference)
- 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
