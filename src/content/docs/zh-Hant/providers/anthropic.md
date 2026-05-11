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
Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用方式再次被允許，因此除非 Anthropic 發布新政策，
否則 OpenClaw 將 Claude CLI 的重複使用和 `claude -p` 使用視為獲得授權。

對於長期運作的閘道主機，Anthropic API 金鑰仍然是最清晰且
最可預測的生產環境途徑。

Anthropic 目前的公開文件：

- [Claude Code CLI 參考資料](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概觀](https://platform.claude.com/docs/en/agent-sdk/overview)
- [使用您的 Pro 或 Max 方案搭配 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [使用您的 Team 或 Enterprise 方案搭配 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## 開始使用

<Tabs>
  <Tab title="API 金鑰">
    **最適用於：** 標準 API 存取與依使用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        在 [Anthropic Console](https://console.anthropic.com/) 中建立 API 金鑰。
      </Step>
      <Step title="執行引導程式">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或直接傳入金鑰：

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
    **最適用於：** 重複使用現有的 Claude CLI 登入，而不需要額外的 API 金鑰。

    <Steps>
      <Step title="確保已安裝並登入 Claude CLI">
        驗證方式：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="執行 onboarding">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        OpenClaw 會偵測並重複使用現有的 Claude CLI 憑證。
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 後端的設定與執行時詳細資訊，請參考 [CLI 後端](/zh-Hant/gateway/cli-backends)。
    </Note>

    ### 設定範例

    建議使用標準的 Anthropic 模型參照，再加上 CLI 執行時覆寫：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          agentRuntime: { id: "claude-cli" },
        },
      },
    }
    ```

    舊版 `claude-cli/claude-opus-4-7` 模型參照為了相容性仍可運作，但新設定應將提供者/模型選擇保持為 `anthropic/*`，並將執行後端放在 `agentRuntime.id`。

    <Tip>
    如果您希望計費路徑最清晰，請改用 Anthropic API 金鑰。OpenClaw 也支援來自 [OpenAI Codex](/zh-Hant/providers/openai)、[Qwen Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 和 [Z.AI / GLM](/zh-Hant/providers/glm) 的訂閱式選項。
    </Tip>

  </Tab>
</Tabs>

## 思考預設值 (Claude 4.6)

當未設定明確的思考層級時，Claude 4.6 模型在 OpenClaw 中預設為 `adaptive` 思考。

使用 `/think:<level>` 針對每則訊息覆寫，或在模型參數中設定：

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
  <Accordion title="Per-agent cache overrides">
    使用模型層級參數作為基準，然後透過 `agents.list[].params` 覆寫特定代理程式：

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

    這允許一個代理程式保持長效快取，而使用相同模型的另一個代理程式則針對突發/低重用流量停用快取。

  </Accordion>

  <Accordion title="Bedrock Claude notes">
    - Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在設定時接受 `cacheRetention` 傳遞。
    - 非 Anthropic Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。
    - API 金鑰智慧預設值也會在未設定明確值時，為 Bedrock 上的 Claude 參照植入 `cacheRetention: "short"`。
  </Accordion>
</AccordionGroup>

## 進階設定

<AccordionGroup>
  <Accordion title="Fast mode">
    OpenClaw 的共用 `/fast` 切換開關支援直接的 Anthropic 流量 (API 金鑰和 OAuth 到 `api.anthropic.com`)。

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
    - 僅針對直接 `api.anthropic.com` 請求注入。Proxy 路由會保留 `service_tier` 不變。
    - 當兩者都設定時，明確的 `serviceTier` 或 `service_tier` 參數會覆寫 `/fast`。
    - 在沒有 Priority Tier 容量的帳戶上，`service_tier: "auto"` 可能會解析為 `standard`。
    </Note>

  </Accordion>

  <Accordion title="媒體理解（圖片與 PDF）">
    內建的 Anthropic 外掛註冊了圖片與 PDF 理解功能。OpenClaw
    會從設定的 Anthropic 驗證自動解析媒體能力 — 無需
    額外設定。

    | 屬性       | 值                |
    | -------------- | -------------------- |
    | 預設模型  | `claude-opus-4-6`    |
    | 支援的輸入 | 圖片、PDF 文件 |

    當圖片或 PDF 附加至對話時，OpenClaw 會自動
    透過 Anthropic 媒體理解提供者進行路由。

  </Accordion>

  <Accordion title="1M 上下文視窗（beta）">
    Anthropic 的 1M 上下文視窗為 beta 閘控功能。請依模型啟用：

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

    OpenClaw 會在請求時將其對應至 `anthropic-beta: context-1m-2025-08-07`。

    `params.context1m: true` 也適用於 Claude CLI 後端
    （`claude-cli/*`），針對合格的 Opus 與 Sonnet 模型，將那些 CLI 會話的執行時
    上下文視窗擴展以符合直接 API 的行為。

    <Warning>
    需要您的 Anthropic 憑證具備長上下文存取權限。舊版 Token 驗證（`sk-ant-oat-*`）會被 1M 上下文請求拒絕 — OpenClaw 會記錄警告並回退至標準上下文視窗。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M 上下文">
    `anthropic/claude-opus-4.7` 及其 `claude-cli` 變體預設即具備 1M 上下文
    視窗 — 無需 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="401 錯誤 / token 突然失效">
    Anthropic token 驗證會過期且可能被撤銷。對於新設定，請改用 Anthropic API 金鑰。
  </Accordion>

<Accordion title='找不到提供者 "anthropic" 的 API 金鑰'>Anthropic 驗證是**依代理程式**進行的 — 新代理程式不會繼承主代理程式的金鑰。請為該代理程式重新執行入門設定（或是在閘道主機上設定 API 金鑰），然後使用 `openclaw models status` 驗證。</Accordion>

<Accordion title='找不到設定檔 "anthropic:default" 的憑證'>執行 `openclaw models status` 以查看目前使用的驗證設定檔。重新執行入門設定，或為該設定檔路徑設定 API 金鑰。</Accordion>

  <Accordion title="沒有可用的驗證設定檔（全部在冷卻中）">
    檢查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 的速率限制冷卻可能是模型範圍的，因此同系列的 Anthropic 模型可能仍可使用。新增另一個 Anthropic 設定檔或等待冷卻結束。
  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

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
