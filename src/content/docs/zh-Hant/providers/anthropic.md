---
summary: "在 OpenClaw 中透過 API 金鑰或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 建構了 **Claude** 模型系列。OpenClaw 支援兩種驗證方式：

- **API 金鑰** — 直接存取 Anthropic API，並依使用量計費 (`anthropic/*` 模型)
- **Claude CLI** — 在相同主機上重複使用現有的 Claude CLI 登入

<Warning>
Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，
否則 OpenClaw 將 Claude CLI 重複使用和 `claude -p` 使用視為獲准。

對於長期執行的閘道主機，Anthropic API 金鑰仍然是最清晰且
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
    **最適合用於：** 標準 API 存取和依使用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        在 [Anthropic Console](https://console.anthropic.com/) 中建立 API 金鑰。
      </Step>
      <Step title="執行上手引導">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或者直接傳遞金鑰：

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
    **最適合：** 重用現有的 Claude CLI 登入，無需額外的 API 金鑰。

    <Steps>
      <Step title="確保 Claude CLI 已安裝並已登入">
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

        OpenClaw 會偵測並重用現有的 Claude CLI 憑證。
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    有關 Claude CLI 後端的設定和執行時詳細資訊，請參閱 [CLI Backends](/en/gateway/cli-backends)。
    </Note>

    <Tip>
    如果您希望計費路徑最清晰，請改用 Anthropic API 金鑰。OpenClaw 也支援來自 [OpenAI Codex](/en/providers/openai)、[Qwen Cloud](/en/providers/qwen)、[MiniMax](/en/providers/minimax) 和 [Z.AI / GLM](/en/providers/glm) 的訂閱式選項。
    </Tip>

  </Tab>
</Tabs>

## 思考預設值 (Claude 4.6)

當未設定明確的思考等級時，Claude 4.6 模型在 OpenClaw 中預設為 `adaptive` 思考。

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
  <Accordion title="每個代理的快取覆寫">
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

    設定合併順序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params` (比對 `id`，依鍵值覆寫)

    這允許一個代理保持長效快取，而同一模型上的另一個代理則針對突發/低重複性流量停用快取。

  </Accordion>

  <Accordion title="Bedrock Claude 注意事項">
    - Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在設定時接受 `cacheRetention` 透傳。
    - 非 Anthropic Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。
    - API 金鑰智慧預設值也會在未設定明確值時，為 Bedrock 上的 Claude 參照植入 `cacheRetention: "short"`。
  </Accordion>
</AccordionGroup>

## 進階組態

<AccordionGroup>
  <Accordion title="快速模式">
    OpenClaw 的共用 `/fast` 切換開關支援直接 Anthropic 流量 (API 金鑰和 OAuth 到 `api.anthropic.com`)。

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
    - 僅針對直接 `api.anthropic.com` 請求注入。代理路由會保持 `service_tier` 不變。
    - 明確的 `serviceTier` 或 `service_tier` 參數會在兩者都設定時覆寫 `/fast`。
    - 在沒有 Priority Tier 容量的帳戶上，`service_tier: "auto"` 可能會解析為 `standard`。
    </Note>

  </Accordion>

  <Accordion title="媒體理解（圖片與 PDF）">
    內建的 Anthropic 外掛註冊了圖片與 PDF 理解功能。OpenClaw 會從設定的 Anthropic 驗證資訊自動解析媒體功能——無需額外設定。

    | 屬性          | 數值                  |
    | -------------- | -------------------- |
    | 預設模型       | `claude-opus-4-6`    |
    | 支援的輸入格式 | 圖片、PDF 文件       |

    當圖片或 PDF 附加至對話時，OpenClaw 會透過 Anthropic 媒體理解提供者自動進行路由。

  </Accordion>

  <Accordion title="1M 上下文視窗（測試版）">
    Anthropic 的 1M 上下文視窗處於測試版封鎖狀態。請依模型啟用它：

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

    <Warning>
    您的 Anthropic 憑證需要具備長上下文存取權限。舊版 Token 驗證（`sk-ant-oat-*`）將被拒絕用於 1M 上下文請求——OpenClaw 會記錄警告並回退至標準上下文視窗。
    </Warning>

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="401 錯誤 / Token 突然失效">
    Anthropic 的 Token 驗證可能會過期或被撤銷。對於新的安裝設定，請遷移至 Anthropic API 金鑰。
  </Accordion>

<Accordion title='未找到提供者 "anthropic" 的 API 金鑰'>驗證是**依代理程式**進行的。新的代理程式不會繼承主要代理程式的金鑰。請為該代理程式重新執行上架流程，或在閘道主機上設定 API 金鑰，然後使用 `openclaw models status` 進行驗證。</Accordion>

<Accordion title='未找到設定檔 "anthropic:default" 的憑證'>執行 `openclaw models status` 以查看目前啟用的驗證設定檔。請重新執行上架流程，或為該設定檔路徑設定 API 金鑰。</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    檢查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 的速率限制冷卻可能是特定於模型的，因此同系列的另一個 Anthropic 模型可能仍然可用。請新增另一個 Anthropic 設定檔或等待冷卻結束。
  </Accordion>
</AccordionGroup>

<Note>更多協助：[疑難排解](/en/help/troubleshooting) 和 [常見問題](/en/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="CLI backends" href="/en/gateway/cli-backends" icon="terminal">
    Claude CLI 後端設定和執行時期詳細資訊。
  </Card>
  <Card title="Prompt caching" href="/en/reference/prompt-caching" icon="database">
    提示快取如何跨提供者運作。
  </Card>
  <Card title="OAuth and auth" href="/en/gateway/authentication" icon="key">
    驗證詳細資訊和認證重用規則。
  </Card>
</CardGroup>
