---
summary: "常見問題：模型預設值、選擇、別名、切換、容錯移轉與認證設定檔"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "常見問題：模型與認證"
sidebarTitle: "模型常見問題"
---

模型與認證設定檔問答。如需關於設定、工作階段、閘道、通道與疑難排解的資訊，請參閱主要的 [常見問題](/zh-Hant/help/faq)。

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定的任何內容：

    ```
    agents.defaults.model.primary
    ```

    模型被引用為 `provider/model` (例如：`openai/gpt-5.5` 或 `openai-codex/gpt-5.5`)。如果您省略提供者，OpenClaw 首先會嘗試別名，然後是該特定模型 ID 的唯一設定提供者相符項，只有在這之後才會退回到設定的預設提供者，作為已棄用的相容性路徑。如果該提供者不再公開設定的預設模型，OpenClaw 將退回到第一個設定的提供者/模型，而不會顯示陳舊的已移除提供者預設值。您仍然應該 **明確地** 設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪個模型？">
    **建議預設：** 使用您的供應商堆疊中最強大的最新世代模型。
    **對於啟用工具或輸入不受信任的代理：** 優先考慮模型強度而非成本。
    **對於例行/低風險聊天：** 使用較便宜的備用模型，並依代理角色進行路由。

    MiniMax 有其自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
    [本機模型](/zh-Hant/gateway/local-models)。

    經驗法則：對於高風險工作，使用您**負擔得起的最佳模型**；對於例行聊天或摘要，使用較便宜的模型。您可以針對每個代理進行模型路由，並使用子代理來並行處理長任務（每個子代理都會消耗 Token）。請參閱 [模型](/zh-Hant/concepts/models) 和
    [子代理](/zh-Hant/tools/subagents)。

    強烈警告：較弱/過度量化模型更容易受到提示注入和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

    更多背景資訊：[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除設定的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **model** 欄位。避免完全替換設定。

    安全選項：

    - 在聊天中使用 `/model`（快速，僅限當前工作階段）
    - `openclaw models set ...`（僅更新模型設定）
    - `openclaw configure --section model`（互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個設定，否則避免使用包含部分物件的 `config.apply`。對於 RPC 編輯，請先使用 `config.schema.lookup` 進行檢查，並偏好使用 `config.patch`。查找 Payload 會提供您標準化路徑、淺層結構描述文件/約束條件以及直接子項摘要。
    用於部分更新。
    如果您確實覆蓋了設定，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文件：[模型](/zh-Hant/concepts/models)、[設定](/zh-Hant/cli/configure)、[Config](/zh-Hant/cli/config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管的模型 (llama.cpp, vLLM, Ollama) 嗎？">
    可以。對於本地模型，Ollama 是最簡單的途徑。

    最快的設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 拉取一個本地模型，例如 `ollama pull gemma4`
    3. 如果您也想要雲端模型，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    備註：

    - `Cloud + Local` 提供雲端模型以及您的本地 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 等雲端模型不需要本地拉取
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全性備註：較小或高度量化的模型更容易受到提示注入攻擊。我們強烈建議對任何可以使用工具的機器人使用 **大型模型**。如果您仍想使用小型模型，請啟用沙箱機制和嚴格的工具允許列表。

    文件：[Ollama](/zh-Hant/providers/ollama)、[本地模型](/zh-Hant/gateway/local-models)、
    [模型提供者](/zh-Hant/concepts/model-providers)、[安全性](/zh-Hant/gateway/security)、
    [沙箱機制](/zh-Hant/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 對於模型使用什麼？">- 這些部署可能有所不同，且可能會隨時間變更；沒有固定的提供者建議。 - 使用 `openclaw models status` 檢查每個閘道上的當前運行時設定。 - 對於安全性敏感/已啟用工具的代理，請使用可用的最強大的最新世代模型。</Accordion>

  <Accordion title="如何即時切換模型（無需重新啟動）？">
    將 `/model` 指令作為獨立訊息使用：

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    這些是內建的別名。可以透過 `agents.defaults.models` 新增自訂別名。

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用的模型。

    `/model`（以及 `/model list`）會顯示一個精簡的帶號碼選擇器。透過數字進行選擇：

    ```
    /model 3
    ```

    您也可以針對供應商強制指定特定的 auth profile（每個 session）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示目前啟用的是哪個 agent、正在使用哪個 `auth-profiles.json` 檔案，以及接下來將嘗試哪個 auth profile。
    當有可用時，它也會顯示設定的供應商端點（`baseUrl`）和 API 模式（`api`）。

    **我要如何取消透過 @profile 設定的 profile 固定？**

    **不帶** `@profile` 後綴重新執行 `/model`：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想回到預設值，請從 `/model` 中選取（或傳送 `/model <default provider/model>`）。
    使用 `/model status` 確認目前啟用的 auth profile。

  </Accordion>

  <Accordion title="我可以在日常任務中使用 GPT 5.5，而在編程中使用 Codex 5.5 嗎？">
    可以。將其中一個設為預設，並根據需要進行切換：

    - **快速切換（每個 session）：** 針對目前直接的 OpenAI API-key 任務使用 `/model openai/gpt-5.5`，或針對 GPT-5.5 Codex OAuth 任務使用 `/model openai-codex/gpt-5.5`。
    - **預設：** 將 `agents.defaults.model.primary` 設定為 `openai/gpt-5.5` 以使用 API-key，或設定為 `openai-codex/gpt-5.5` 以使用 GPT-5.5 Codex OAuth。
    - **子代理：** 將編程任務路由到具有不同預設模型的子代理。

    參見[模型](/zh-Hant/concepts/models)和[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何為 GPT 5.5 設定快速模式？">
    使用工作階段切換或組態預設值：

    - **每個工作階段：**當工作階段使用 `openai/gpt-5.5` 或 `openai-codex/gpt-5.5` 時，傳送 `/fast on`。
    - **每個模型預設值：**將 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 或 `agents.defaults.models["openai-codex/gpt-5.5"].params.fastMode` 設定為 `true`。

    範例：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    對於 OpenAI，快速模式對應到受支援的原生回應請求上的 `service_tier = "priority"`。工作階段 `/fast` 會覆寫 beat 組態預設值。

    請參閱 [思考與快速模式](/zh-Hant/tools/thinking) 和 [OpenAI 快速模式](/zh-Hant/providers/openai#fast-mode)。

  </Accordion>

  <Accordion title='為什麼我會看到「Model ... is not allowed」，然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它就會成為 `/model` 和任何
    工作階段覆寫值的 **允許清單**。選擇不在該清單中的模型會傳回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會被傳回，**而不是**正常的回覆。修正方法：將模型新增到
    `agents.defaults.models`，移除允許清單，或從 `/model list` 中挑選一個模型。

  </Accordion>

  <Accordion title='為什麼我會看到 "Unknown model: minimax/MiniMax-M2.7"？'>
    這表示 **未設定供應商** (找不到 MiniMax 供應商設定或驗證設定檔)，因此無法解析該模型。

    修正檢查清單：

    1. 升級至最新的 OpenClaw 版本 (或從原始碼執行 `main`)，然後重新啟動閘道。
    2. 確認 MiniMax 已設定 (透過精靈或 JSON)，或者 MiniMax 驗證資訊存在於 env/auth 設定檔中，以便注入相符的供應商
       (對於 `minimax`、`MINIMAX_OAUTH_TOKEN` 使用 `MINIMAX_API_KEY`，或為 `minimax-portal` 儲存 MiniMax OAuth)。
    3. 針對您的驗證路徑，請使用完全相同的模型 ID (區分大小寫)：
       若為 API-key 設定請使用 `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`，
       若為 OAuth 設定請使用 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選取 (或在聊天中輸入 `/model list`)。

    請參閱 [MiniMax](/zh-Hant/providers/minimax) 與 [Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 設為預設，並在複雜任務時使用 OpenAI 嗎？">
    可以。請使用 **MiniMax 作為預設模型**，並在需要時 **依會話 (per session) 切換模型**。
    備援機制是為了 **錯誤** 而非「困難任務」設計的，因此請使用 `/model` 或獨立的代理程式。

    **選項 A：依會話切換**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.5": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然後：

    ```
    /model gpt
    ```

    **選項 B：分開的代理程式**

    - Agent A 預設：MiniMax
    - Agent B 預設：OpenAI
    - 依代理程式路由或使用 `/agent` 進行切換

    文件：[Models](/zh-Hant/concepts/models)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 附帶了一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 時才會套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.5`（針對 API 金鑰設定），或在設定為 Codex OAuth 時為 `openai-codex/gpt-5.5`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了自己的別名且名稱相同，則以您的設定為準。

  </Accordion>

  <Accordion title="如何定義/覆寫模型捷徑（別名）？">
    別名來自 `agents.defaults.models.<modelId>.alias`。範例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然後 `/model sonnet`（或在支援時為 `/<alias>`）將解析為該模型 ID。

  </Accordion>

  <Accordion title="如何新增來自 OpenRouter 或 Z.AI 等其他提供商的模型？">
    OpenRouter（依 token 計費；多種模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI（GLM 模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果您參照了某個提供商/模型，但缺少所需的提供商金鑰，您會收到執行階段的授權錯誤（例如 `No API key found for provider "zai"`）。

    **新增 agent 後找不到該提供商的 API 金鑰**

    這通常表示**新 agent** 的授權儲存區是空的。授權是以 agent 為單位，並儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    解決選項：

    - 執行 `openclaw agents add <id>` 並在精靈設定期間設定授權。
    - 或將主要 agent 的 `agentDir` 中的 `auth-profiles.json` 複製到新 agent 的 `agentDir` 中。

    請**勿**跨 agent 重複使用 `agentDir`；這會導致授權/會衝突。

  </Accordion>
</AccordionGroup>

## 模型容錯移轉與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="故障轉移是如何運作的？">
    故障轉移分兩個階段進行：

    1. 在同一個供應商內進行 **Auth profile 輪替**。
    2. **模型備援** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻時間會套用至失敗的 profile（指數退避），因此即使供應商被速率限制或暫時故障，OpenClaw 仍能持續回應。

    速率限制的範疇涵蓋的不僅僅是單純的 `429` 回應。OpenClaw 也會將諸如 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted` 以及週期性
    使用視窗限制（`weekly/monthly limit reached`）等訊息視為值得進行故障轉移的
    速率限制。

    某些看起來與計費相關的回應並非 `402`，而某些 HTTP `402`
    回應也會保留在暫態類別中。如果供應商在 `401` 或 `403` 上回傳明確的計費文字，OpenClaw 仍可將其保留在
    計費通道中，但特定供應商的文字比對器仍僅限於擁有它們的供應商（例如 OpenRouter `Key limit exceeded`）。如果 `402`
    訊息看起來像是可重試的使用視窗或
    組織/工作空間支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 會將其視為
    `rate_limit`，而非長期的計費停用。

    內容溢出錯誤則不同：諸如 `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 等特徵會保留在壓縮/重試路徑上，而不會推進模型備援。

    通用伺服器錯誤文字刻意設計得比「任何包含 unknown/error 的內容」更狹隘。OpenClaw 確實會處理供應商範圍內的暫態形式，例如 Anthropic 單純的 `An unknown error occurred`、OpenRouter 單純的
    `Provider returned error`、如 `Unhandled stop reason:
    error`, JSON `api_error` 的停止原因錯誤，以及包含暫態伺服器文字（`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`), and provider-busy errors such as `ModelNotReadyException`）的 payload，並在符合供應商情境時將其視為
    值得進行故障轉移的超時/過載訊號。
    通用內部備援文字，如 `LLM request failed with an unknown
    error.`，則保持保守，本身不會觸發模型備援。

  </Accordion>

  <Accordion title='「No credentials found for profile anthropic:default」是什麼意思？'>
    這表示系統嘗試使用身分驗證設定檔 ID `anthropic:default`，但在預期的身分驗證存放區中找不到其憑證。

    **修復檢查清單：**

    - **確認身分驗證設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其置於 `~/.openclaw/.env` 中或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的 agent**
      - 多 agent 設定意味著可能有多個 `auth-profiles.json` 檔案。
    - **健全性檢查模型/身分驗證狀態**
      - 使用 `openclaw models status` 來檢視已設定的模型以及供應商是否已通過身分驗證。

    **針對「No credentials found for profile anthropic」的修復檢查清單**

    這表示執行已固定至 Anthropic 身分驗證設定檔，但 Gateway
    在其身分驗證存放區中找不到該設定檔。

    - **使用 Claude CLI**
      - 在 gateway 主機上執行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您想要改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 放入 **gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的固定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您是在 gateway 主機上執行指令**
      - 在遠端模式下，身分驗證設定檔位於 gateway 機器上，而非您的筆記型電腦上。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試使用它。如果您尚未配置 Google 憑證，您將會看到 `No API key found for provider "google"`。

    修復方法：提供 Google 驗證，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由指向那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：對話記錄包含 **未簽名的思考區塊**（通常來自
    中斷/部分串流）。Google Antigravity 要求思考區塊必須有簽名。

    修復方法：OpenClaw 現在會針對 Google Antigravity Claude 移除未簽名的思考區塊。如果問題仍然出現，請開啟 **新對話** 或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles：它們是什麼以及如何管理它們

相關：[/concepts/oauth](/zh-Hant/concepts/oauth) （OAuth 流程、權杖儲存、多帳號模式）

<AccordionGroup>
  <Accordion title="什麼是 auth profile？">
    Auth profile 是綁定到提供者的具名憑證記錄（OAuth 或 API 金鑰）。Profile 存活於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的 profile ID 是什麼？">
    OpenClaw 使用提供者前綴的 ID，例如：

    - `anthropic:default` （當不存在電子郵件身分時很常見）
    - `anthropic:<email>` 用於 OAuth 身分
    - 您選擇的自訂 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個驗證設定檔嗎？">
    可以。設定支援設定檔的可選元數據以及每個供應商的順序 (`auth.order.<provider>`)。這**不會**儲存機密；它將 ID 對應到供應商/模式並設定輪替順序。

    如果驗證設定檔處於短暫的 **冷卻** (速率限制/逾時/驗證失敗) 或較長的 **停用** (計費/額度不足) 狀態，OpenClaw 可能會暫時跳過該設定檔。若要檢查此狀態，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷卻時間可能僅限於特定模型。如果某個設定檔正在為一個模型冷卻，它對同一供應商上的兄弟模型可能仍然可用，但計費/停用視窗仍會阻擋整個設定檔。

    您也可以透過 CLI 設定 **每個代理程式** 的順序覆寫 (儲存在該代理程式的 `auth-state.json` 中)：

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    若要鎖定特定代理程式：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    若要驗證實際會嘗試的內容，請使用：

    ```bash
    openclaw models status --probe
    ```

    如果儲存的設定檔未包含在明確順序中，探測會對該設定檔回報 `excluded_by_auth_order`，而不是在靜默中嘗試它。

  </Accordion>

  <Accordion title="OAuth 與 API 金鑰 - 有什麼區別？">
    OpenClaw 支援這兩種方式：

    - **OAuth** 通常利用訂閱存取權 (在適用情況下)。
    - **API 金鑰** 使用按 Token 付費的計費方式。

    精靈明確支援 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 金鑰。

  </Accordion>
</AccordionGroup>

## 相關

- [FAQ](/zh-Hant/help/faq) — 主要常見問題
- [FAQ — 快速開始和首次執行設定](/zh-Hant/help/faq-first-run)
- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型失效備援](/zh-Hant/concepts/model-failover)
