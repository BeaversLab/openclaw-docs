---
summary: "在 OpenClaw 中透過 API 金鑰或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic 建構了 **Claude** 模型系列。OpenClaw 支援兩種驗證方式：

- **API 金鑰** — 直接存取 Anthropic API 並依使用量計費 (`anthropic/*` 模型)
- **Claude CLI** — 重複使用同一台主機上既有的 Claude CLI 登入

<Warning>
Anthropic 人員告訴我們，再次允許以 OpenClaw 風格使用 Claude CLI，因此
除非 Anthropic 發布新政策，否則 OpenClaw 將視複用 Claude CLI 和 `claude -p` 使用為獲得授權的行為。

對於長期執行的閘道主機，Anthropic API 金鑰仍然是最清晰且
最可預測的生產環境途徑。

Anthropic 目前的公開文件：

- [Claude Code CLI 參考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概覽](https://platform.claude.com/docs/en/agent-sdk/overview)
- [在您的 Pro 或 Max 方案中使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [在您的 Team 或 Enterprise 方案中使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## 開始使用

<Tabs>
  <Tab title="API 金鑰">
    **最適用於：** 標準 API 存取和依使用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        在 [Anthropic Console](https://console.anthropic.com/) 中建立 API 金鑰。
      </Step>
      <Step title="執行入門設定">
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
      env: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最適用於：** 重複使用現有的 Claude CLI 登入，而不需要額外的 API 金鑰。

    <Steps>
      <Step title="確保 Claude CLI 已安裝並已登入">
        使用以下指令驗證：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="執行上架導覽">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        OpenClaw 會偵測並重複使用現有的 Claude CLI 憑證。
      </Step>
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 後端的設定與執行時細節請參閱 [CLI Backends](/zh-Hant/gateway/cli-backends)。
    </Note>

    ### 設定範例

    建議使用標準的 Anthropic 模型參照，再加上 CLI 執行時覆寫：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          models: {
            "anthropic/claude-opus-4-7": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    舊版 `claude-cli/claude-opus-4-7` 模型參照基於相容性仍然有效，但新設定應將供應商/模型選擇維持為
    `anthropic/*`，並將執行後端放在供應商/模型的執行時原則中。

    <Tip>
    若您希望帳單路徑最清晰，請改用 Anthropic API 金鑰。OpenClaw 也支援來自 [OpenAI Codex](/zh-Hant/providers/openai)、[Qwen Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 與 [Z.AI / GLM](/zh-Hant/providers/zai) 的訂閱式方案。
    </Tip>

  </Tab>
</Tabs>

## 思考預設值 (Claude 4.6)

當未設定明確的思考層級時，Claude 4.6 模型在 OpenClaw 中預設為 `adaptive` 思考。

使用 `/think:<level>` 或在模型參數中針對每則訊息進行覆寫：

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

<Note>
相關的 Anthropic 文件：
- [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

</Note>

## 提示快取

OpenClaw 支援針對 API 金鑰驗證的 Anthropic 提示快取功能。

| 值               | 快取持續時間 | 說明                      |
| ---------------- | ------------ | ------------------------- |
| `"short"` (預設) | 5 分鐘       | 針對 API 金鑰驗證自動套用 |
| `"long"`         | 1 小時       | 延伸快取                  |
| `"none"`         | 不快取       | 停用提示快取              |

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
  <Accordion title="各代理快取覆寫">
    使用模型層級參數作為基準，然後透過 `agents.list[].params` 覆寫特定代理：

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

    配置合併順序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params`（比對 `id`，按鍵覆寫）

    這讓一個代理可以維持長效快取，而使用相同模型的另一個代理則可針對突發性/低重用流量停用快取。

  </Accordion>

  <Accordion title="Bedrock Claude 備註">
    - Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置時接受 `cacheRetention` 傳遞。
    - 非 Anthropic 的 Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。
    - 當未設定明確值時，API 金鑰智慧預設值也會為 Bedrock 上的 Claude 參照植入 `cacheRetention: "short"`。

  </Accordion>
</AccordionGroup>

## 進階設定

<AccordionGroup>
  <Accordion title="快速模式">
    OpenClaw 的共用 `/fast` 切換開關支援直接 Anthropic 流量（API 金鑰與 OAuth 至 `api.anthropic.com`）。

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
    - 僅針對直接 `api.anthropic.com` 請求注入。代理路由會保留 `service_tier` 不變。
    - 當兩者同時設定時，明確的 `serviceTier` 或 `service_tier` 參數會覆寫 `/fast`。
    - 在不具 Priority Tier 容量的帳戶上，`service_tier: "auto"` 可能會解析為 `standard`。

    </Note>

  </Accordion>

  <Accordion title="媒體理解 (圖片和 PDF)">
    內建的 Anthropic 外掛註冊了圖片和 PDF 理解功能。OpenClaw
    會從設定的 Anthropic 驗證自動解析媒體功能 — 不需要
    額外的設定。

    | 屬性        | 值                 |
    | --------------- | --------------------- |
    | 預設模型   | `claude-opus-4-7`     |
    | 支援的輸入 | 圖片、PDF 文件 |

    當圖片或 PDF 附加到對話時，OpenClaw 會自動
    將其路由透過 Anthropic 媒體理解提供者。

  </Accordion>

  <Accordion title="1M context window">
    Anthropic 的 1M 語境視窗（context window）適用於具備 GA 能力的 Claude 4.x 模型，
    例如 Opus 4.6、Opus 4.7 和 Sonnet 4.6。OpenClaw 會自動將這些模型的尺寸設定為
    1M：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {},
          },
        },
      },
    }
    ```

    舊的組態可以保留 `params.context1m: true`，但 OpenClaw 不再發送
    已停用的 `context-1m-2025-08-07` beta 標頭。帶有該值的舊 `anthropicBeta` 組態
    項目在請求標頭解析期間會被忽略，
    而不支援的舊版 Claude 模型將維持其正常的語境視窗。

    `params.context1m: true` 也適用於 Claude CLI 後端
    (`claude-cli/*`)，針對符合資格且具備 GA 能力的 Opus 和 Sonnet 模型，這會保留
    那些 CLI 會話的執行時期語境視窗，以符合直接 API
    的行為。

    <Warning>
    您的 Anthropic 憑證需要具備長語境（long-context）存取權限。OAuth/訂閱權杖驗證會保留其所需的 Anthropic beta 標頭，但如果舊組態中仍存在已停用的 1M beta 標頭，OpenClaw 會將其移除。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M context">
    `anthropic/claude-opus-4-7` 及其 `claude-cli` 變體版本預設具有 1M 語境
    視窗 — 不需要 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="401 錯誤 / token 突然失效">
    Anthropic token 驗證會過期且可能被撤銷。對於新設定，請改用 Anthropic API 金鑰。
  </Accordion>

<Accordion title='No API key found for provider "anthropic"'>Anthropic 驗證是**每個代理程式** 獨立的 — 新代理程式不會繼承主要代理程式的金鑰。請為該代理程式重新執行入門設定（或在閘道主機上設定 API 金鑰），然後使用 `openclaw models status` 進行驗證。</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>執行 `openclaw models status` 以查看目前啟用的是哪個驗證設定檔。請重新執行入門設定，或為該設定檔路徑設定 API 金鑰。</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    檢查 `openclaw models status --json` 是否有 `auth.unusableProfiles`。Anthropic 的速率限制冷卻可能是特定於模型的，因此其他同系列的 Anthropic 模型可能仍可使用。請新增另一個 Anthropic 設定檔或等待冷卻結束。
  </Accordion>
</AccordionGroup>

<Note>更多協助：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="CLI 後端" href="/zh-Hant/gateway/cli-backends" icon="terminal">
    Claude CLI 後端設定和執行時期詳情。
  </Card>
  <Card title="提示詞快取" href="/zh-Hant/reference/prompt-caching" icon="database">
    提示詞快取如何跨提供者運作。
  </Card>
  <Card title="OAuth 和驗證" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳情和憑證重用規則。
  </Card>
</CardGroup>
