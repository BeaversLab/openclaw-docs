---
summary: "在 OpenClaw 中透過 API 金鑰或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 建構了 **Claude** 模型系列。OpenClaw 支援兩種驗證方式：

- **API 金鑰** — 直接存取 Anthropic API 並依使用量計費 (`anthropic/*` 模型)
- **Claude CLI** — 在相同主機上重複使用現有的 Claude CLI 登入

<Warning>
Anthropic 的人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，
否則 OpenClaw 將視為重複使用 Claude CLI 和 `claude -p` 使用是經過核准的。

對於長期運作的閘道主機，Anthropic API 金鑰仍然是最清晰且
最可預測的生產環境途徑。

Anthropic 目前的公開文件：

- [Claude Code CLI 參考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概觀](https://platform.claude.com/docs/en/agent-sdk/overview)
- [使用 Pro 或 Max 方案搭配 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [使用 Team 或 Enterprise 方案搭配 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## 開始使用

<Tabs>
  <Tab title="API 金鑰">
    **最適用於：** 標準 API 存取和依使用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        在 [Anthropic Console](https://console.anthropic.com/) 中建立 API 金鑰。
      </Step>
      <Step title="執行入門引導">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或直接傳遞金鑰：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### 設定範例

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "sk-ant-..." },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最適用於：** 重用現有的 Claude CLI 登入，無需額外的 API 金鑰。

    <Steps>
      <Step title="確保 Claude CLI 已安裝並已登入">
        使用以下指令驗證：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="執行 onboarding">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        OpenClaw 會偵測並重用現有的 Claude CLI 憑證。
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 後端的設定與執行時詳細資訊位於 [CLI Backends](/zh-Hant/gateway/cli-backends)。
    </Note>

    <Tip>
    如果您希望帳單路徑最清晰，請改用 Anthropic API 金鑰。OpenClaw 也支援來自 [OpenAI Codex](/zh-Hant/providers/openai)、[Qwen Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 和 [Z.AI / GLM](/zh-Hant/providers/glm) 的訂閱制選項。
    </Tip>

  </Tab>
</Tabs>

## 思考預設值 (Claude 4.6)

當未設定明確的思考等級時，Claude 4.6 模型在 OpenClaw 中預設為 `adaptive` 思考模式。

使用 `/think:<level>` 或在模型參數中覆寫每則訊息的設定：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { thinking: "adaptive" },
        },
      },
    },
  },
}
```

<Note>相關 Anthropic 文件： - [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) - [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)</Note>

## 提示快取

OpenClaw 支援 Anthropic 的提示快取功能，適用於 API 金鑰驗證。

| 數值             | 快取持續時間 | 描述                    |
| ---------------- | ------------ | ----------------------- |
| `"short"` (預設) | 5 分鐘       | 自動套用於 API 金鑰驗證 |
| `"long"`         | 1 小時       | 延伸快取                |
| `"none"`         | 無快取       | 停用提示快取            |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="個別代理快取覆寫">
    使用模型層級的參數作為基準，然後透過 `agents.list[].params` 覆寫特定代理：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": {
              params: { cacheRetention: "long" },
            },
          },
        },
        list: [
          { id: "research", default: true },
          { id: "alerts", params: { cacheRetention: "none" } },
        ],
      },
    }
    ```

    設定合併順序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params` (符合 `id`，依鍵值覆寫)

    這允許一個代理保持長效快取，而同一模型上的另一個代理則針對突發/低重用的流量停用快取。

  </Accordion>

  <Accordion title="Bedrock Claude 說明">
    - Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在配置時接受 `cacheRetention` 透傳。
    - 非 Anthropic 的 Bedrock 模型在執行時被強制設為 `cacheRetention: "none"`。
    - 當未設定明確值時，API 金鑰智慧預設值也會為 Claude-on-Bedrock refs 植入 `cacheRetention: "short"`。
  </Accordion>
</AccordionGroup>

## 進階組態

<AccordionGroup>
  <Accordion title="快速模式">
    OpenClaw 共用的 `/fast` 切換開關支援直接 Anthropic 流量 (API 金鑰和 OAuth 至 `api.anthropic.com`)。

    | 指令 | 對應至 |
    |---------|---------|
    | `/fast on` | `service_tier: "auto"` |
    | `/fast off` | `service_tier: "standard_only"` |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-sonnet-4-6": {
              params: { fastMode: true },
            },
          },
        },
      },
    }
    ```

    <Note>
    - 僅針對直接 `api.anthropic.com` 請求注入。Proxy 路由保持 `service_tier` 不變。
    - 當兩者皆設定時，明確的 `serviceTier` 或 `service_tier` 參數會覆寫 `/fast`。
    - 對於沒有 Priority Tier 容量的帳戶，`service_tier: "auto"` 可能會解析為 `standard`。
    </Note>

  </Accordion>

  <Accordion title="媒體理解 (圖片與 PDF)">
    內建的 Anthropic 外掛程式會註冊圖片與 PDF 理解功能。OpenClaw
    會自動從已設定的 Anthropic 驗證解析媒體功能 — 無需
    額外設定。

    | 屬性       | 值                |
    | -------------- | -------------------- |
    | 預設模型  | `claude-opus-4-6`    |
    | 支援的輸入 | 圖片、PDF 文件 |

    當圖片或 PDF 附加至對話時，OpenClaw 會自動
    透過 Anthropic 媒體理解提供者進行路由。

  </Accordion>

  <Accordion title="1M context window (beta)">
    Anthropic 的 1M context window 處於 beta 測試階段。請針對每個模型啟用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {
              params: { context1m: true },
            },
          },
        },
      },
    }
    ```

    OpenClaw 會在請求中將其映射到 `anthropic-beta: context-1m-2025-08-07`。

    <Warning>
    您的 Anthropic 憑證需要具備長內容存取權限。舊版 token 認證（`sk-ant-oat-*`）將被 1M context 請求拒絕 —— OpenClaw 會記錄警告並回退到標準 context window。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M context normalization">
    Claude Opus 4.7 (`anthropic/claude-opus-4.7`) 及其 `claude-cli` 變體在解析後的執行時元數據和 active-agent 狀態/內容報告中被標準化為 1M context window。您不需要為 Opus 4.7 設定 `params.context1m: true`；它不再繼承過時的 200k 回退值。

    壓縮和溢出處理會自動使用 1M window。其他 Anthropic 模型則保持其發布的限制。

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="401 errors / token suddenly invalid">
    Anthropic token 認證可能會過期或被撤銷。對於新的設定，請遷移至 Anthropic API key。
  </Accordion>

<Accordion title='No API key found for provider "anthropic"'>認證是 **針對每個 agent** 的。新 agent 不會繼承主要 agent 的金鑰。請為該 agent 重新執行 onboarding，或在 gateway host 上設定 API key，然後使用 `openclaw models status` 進行驗證。</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>執行 `openclaw models status` 以查看目前作用的認證設定檔。重新執行 onboarding，或為該設定檔路徑設定 API key。</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    檢查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 的速率限制冷卻時間可能以模型為範圍，因此同層級的 Anthropic 模型可能仍可使用。請新增另一個 Anthropic 設定檔或等待冷卻結束。
  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 與 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照與故障轉移行為。
  </Card>
  <Card title="CLI 後端" href="/zh-Hant/gateway/cli-backends" icon="terminal">
    Claude CLI 後端設定與執行時期細節。
  </Card>
  <Card title="提示詞快取" href="/zh-Hant/reference/prompt-caching" icon="database">
    提示詞快取如何在各提供者間運作。
  </Card>
  <Card title="OAuth 與驗證" href="/zh-Hant/gateway/authentication" icon="key">
    驗證細節與認證重複使用規則。
  </Card>
</CardGroup>
