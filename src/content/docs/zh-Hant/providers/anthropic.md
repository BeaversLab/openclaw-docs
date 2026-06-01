---
summary: "在 OpenClaw 中透過 API 金鑰或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic 建構了 **Claude** 模型系列。OpenClaw 支援兩種驗證方式：

- **API 金鑰** — 直接存取 Anthropic API 並依使用量計費 (`anthropic/*` 模型)
- **Claude CLI** — 在同一主機上重複使用現有的 Claude Code 登入

<Warning>
OpenClaw 的 Claude CLI 後端會以非互動式列印模式執行已安裝的 Claude Code CLI。Anthropic 目前的 Claude Code 文件將 `claude -p` 描述為 Agent SDK/程式化用途。自 2026 年 6 月 15 日起，Anthropic 表示訂閱方案的 `claude -p` 使用量將不再從一般 Claude 方案額度中扣除；而是先從每月的 Agent SDK 點數扣除，當這些點數用盡後，再以標準 API 費率從使用量點數扣除。

互動式 Claude Code 仍然會從已登入的 Claude 方案額度中扣除。API 金鑰驗證則維持直接按用量計費的 API 帳單。對於長期運作的閘道主機、共用自動化以及可預測的生產環境支出，請使用 Anthropic API 金鑰。

Anthropic 目前的公開文件：

- [Claude Code CLI 參考](https://code.claude.com/docs/en/cli-usage)
- [使用 Claude Agent SDK 搭配您的 Claude 方案](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- [使用 Claude Code 搭配您的 Pro 或 Max 方案](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [使用 Claude Code 搭配您的 Team 或 Enterprise 方案](https://support.claude.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan)
- [管理 Claude Code 成本](https://code.claude.com/docs/en/costs)

</Warning>

## 開始使用

<Tabs>
  <Tab title="API key">
    **最適用於：** 標準 API 存取與按用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        在 [Anthropic Console](https://console.anthropic.com/) 中建立 API 金鑰。
      </Step>
      <Step title="執行導覽設定">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或直接傳入金鑰：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### 設定範例

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-8" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最適用於：** 重複使用現有的 Claude CLI 登入，而不需要額外的 API 金鑰。

    <Steps>
      <Step title="確保 Claude CLI 已安裝並登入">
        使用以下指令驗證：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="執行入門設定">
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
    Claude CLI 後端的設定與執行時詳細資訊位於 [CLI Backends](/zh-Hant/gateway/cli-backends)。
    </Note>

    <Warning>
    重複使用 Claude CLI 預期 OpenClaw 程序會在與
    Claude CLI 登入相同的 主機上執行。容器安裝（例如 [Podman](/zh-Hant/install/podman)）不會
    將主機的 `~/.claude` 掛載至設定或執行時；請在此處使用 Anthropic API 金鑰，
    或選擇一個由 OpenClaw 管理 OAuth 的供應商，例如
    [OpenAI Codex](/zh-Hant/providers/openai)。
    </Warning>

    ### 設定範例

    建議使用標準的 Anthropic 模型參照並搭配 CLI 執行時覆寫：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-8" },
          models: {
            "anthropic/claude-opus-4-8": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    舊版的 `claude-cli/claude-opus-4-7` 模型參照仍可運作以維持
    相容性，但新設定應將供應商/模型選項維持為
    `anthropic/*`，並將執行後端置於供應商/模型執行時策略中。

    ### 計費與 `claude -p`

    OpenClaw 使用 Claude Code 的非互動式 `claude -p` 路徑來執行 Claude CLI。
    Anthropic 目前將該路徑視為 Agent SDK/程式化用途：

    - 直到 2026 年 6 月 15 日，訂閱方案處理方式遵循 Anthropic 針對
      已登入帳戶的現行 Claude Code 規則。
    - 從 2026 年 6 月 15 日開始，訂閱方案的 `claude -p` 使用量會優先從
      使用者的每月 Agent SDK 點數扣除，若啟用使用量點數，接著再從標準
      API 費率的使用量點數扣除。
    - Console/API 金鑰登入使用隨付隨用的 API 計費，且不會收到
      訂閱 Agent SDK 點數。

    Anthropic 可在無需 OpenClaw 發布版的情況下變更 Claude Code 的計費與速率限制行為。當計費可預測性很重要時，請查閱 `claude auth status`、`/status` 以及
    Anthropic 的連結文件。

    <Tip>
    對於共用的生產環境自動化，請使用 Anthropic API 金鑰而非
    Claude CLI。OpenClaw 也支援來自
    [OpenAI Codex](/zh-Hant/providers/openai)、[Qwen Cloud](/zh-Hant/providers/qwen)、
    [MiniMax](/zh-Hant/providers/minimax) 和 [Z.AI / GLM](/zh-Hant/providers/zai) 的訂閱式選項。
    </Tip>

  </Tab>
</Tabs>

## 思維預設值 (Claude 4.8 和 4.6)

Claude Opus 4.8 在 OpenClaw 中預設會關閉思維功能。當您使用 `/think high|xhigh|max` 明確啟用適應性思維時，OpenClaw 會發送 Anthropic Opus 4.8 的 effort 值；Claude 4.6 模型預設為 `adaptive`。

透過 `/think:<level>` 或在模型參數中逐則訊息覆蓋：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-8": {
          params: { thinking: "high" },
        },
      },
    },
  },
}
```

<Note>
相關 Anthropic 文件：
- [適應性思維](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [擴展思維](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

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
  <Accordion title="個別代理的快取覆蓋">
    使用模型層級參數作為基線，然後透過 `agents.list[].params` 覆蓋特定代理：

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
    2. `agents.list[].params` (比對 `id`，依鍵值覆蓋)

    這讓一個代理能保持長期快取，而同一模型上的另一個代理則可針對突發/低重用流量的停用快取。

  </Accordion>

  <Accordion title="Bedrock Claude 說明">
    - Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在設定時接受 `cacheRetention` 透傳。
    - 非 Anthropic 的 Bedrock 模型在執行時會被強制設定為 `cacheRetention: "none"`。
    - API 金鑰智慧預設值也會在未設定明確值時，為 Claude-on-Bedrock 參照填入 `cacheRetention: "short"`。

  </Accordion>
</AccordionGroup>

## 進階設定

<AccordionGroup>
  <Accordion title="Fast mode">
    OpenClaw 的共用 `/fast` 切換開關支援直接的 Anthropic 流量（API 金鑰和 OAuth 到 `api.anthropic.com`）。

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
    - 僅針對直接 `api.anthropic.com` 請求注入。Proxy 路由會讓 `service_tier` 保持不變。
    - 明確的 `serviceTier` 或 `service_tier` 參數會在兩者皆設定時覆寫 `/fast`。
    - 對於沒有 Priority Tier 容量的帳戶，`service_tier: "auto"` 可能會解析為 `standard`。

    </Note>

  </Accordion>

  <Accordion title="Media understanding (image and PDF)">
    內建的 Anthropic 外掛註冊了圖片和 PDF 理解功能。OpenClaw
    會從設定的 Anthropic 驗證自動解析媒體功能 — 無需
    額外設定。

    | 屬性        | 數值                 |
    | --------------- | --------------------- |
    | 預設模型   | `claude-opus-4-8`     |
    | 支援的輸入 | 圖片、PDF 文件 |

    當圖片或 PDF 附加到對話時，OpenClaw 會自動透過 Anthropic 媒體理解提供者進行路由。

  </Accordion>

  <Accordion title="1M context window">
    Anthropic 的 1M context window 可在支援 GA 的 Claude 4.x 模型上使用，
    例如 Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6。OpenClaw 會自動將這些模型的
    context window 大小設為 1M：

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

    較舊的設定可以保留 `params.context1m: true`，但 OpenClaw 不再發送
    已停用的 `context-1m-2025-08-07` beta 標頭。含有該值的舊 `anthropicBeta` 設定
    項目在請求標頭解析時會被忽略，
    且不支援的舊版 Claude 模型會維持其標準 context window。

    `params.context1m: true` 也適用於 Claude CLI 後端
    (`claude-cli/*`)，針對符合資格的支援 GA 的 Opus 和 Sonnet 模型，為
    這些 CLI 會話保留執行時期的 context window，以符合直接 API
    的行為。

    <Warning>
    您的 Anthropic 憑證需要具備長 context 存取權限。OAuth/subscription token 驗證會保留其所需的 Anthropic beta 標頭，但如果舊設定中仍存在已停用的 1M beta 標頭，OpenClaw 會將其移除。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.8 1M context">
    `anthropic/claude-opus-4-8` 及其 `claude-cli` 變體預設擁有 1M context
    window — 不需要 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="401 錯誤 / token 突然失效">
    Anthropic token 驗證會過期且可能被撤銷。對於新設定，請改用 Anthropic API 金鑰。
  </Accordion>

<Accordion title='No API key found for provider "anthropic"'>Anthropic 驗證是**每個 Agent** — 新的 Agent 不會繼承主要 Agent 的金鑰。請為該 Agent 重新執行入門設定（或在 gateway 主機上設定 API 金鑰），然後使用 `openclaw models status` 進行驗證。</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>執行 `openclaw models status` 以查看目前作用中的驗證設定檔。請重新執行入門設定，或為該設定檔路徑設定 API 金鑰。</Accordion>

  <Accordion title="無可用的設定檔（全部冷卻中）">
    檢查 `openclaw models status --json` 的 `auth.unusableProfiles`。Anthropic 的速率限制冷卻可能僅限於特定模型，因此同系列的其他 Anthropic 模型可能仍可使用。請新增另一個 Anthropic 設定檔或等待冷卻結束。
  </Accordion>
</AccordionGroup>

<Note>更多協助：請參閱 [疑難排解](/zh-Hant/help/troubleshooting) 與 [常見問題](/zh-Hant/help/faq)。</Note>

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
