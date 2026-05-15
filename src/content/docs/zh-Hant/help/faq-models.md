---
summary: "常見問題：模型預設值、選擇、別名、切換、容錯移轉與認證設定檔"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "常見問題：模型與認證"
sidebarTitle: "模型常見問題"
---

模型與授權設定檔的常見問題。關於設定、工作階段、閘道、通道以及疑難排解，請參閱主要的 [常見問題](/zh-Hant/help/faq)。

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定的任何項目：

    ```
    agents.defaults.model.primary
    ```

    模型會被引用為 `provider/model` (例如：`openai/gpt-5.5` 或 `anthropic/claude-sonnet-4-6`)。如果您省略提供者，OpenClaw 會先嘗試別名，然後嘗試該特定模型 ID 的唯一設定提供者匹配項，最後才回退到設定的預設提供者，作為已棄用的相容性路徑。如果該提供者不再公開設定的預設模型，OpenClaw 會回退到第一個設定的提供者/模型，而不是顯示陳舊的已移除提供者預設值。您仍應**明確地**設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪種模型？">
    **建議的預設值：**使用您的提供者堆疊中最強大的最新世代模型。
    **對於已啟用工具或不可信輸入的代理程式：**優先考慮模型強度而非成本。
    **對於例行/低風險的聊天：**使用較便宜的備用模型，並根據代理程式角色進行路由。

    MiniMax 有自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
    [本機模型](/zh-Hant/gateway/local-models)。

    經驗法則：對於高風險工作，使用您**負擔得起的最佳模型**，並對於例行聊天或摘要使用較便宜的模型。您可以針對每個代理程式路由模型，並使用子代理程式來
    並行處理長任務（每個子代理程式都會消耗權杖）。請參閱 [模型](/zh-Hant/concepts/models) 和
    [子代理程式](/zh-Hant/tools/subagents)。

    強烈警告：較弱/過度量化的模型更容易受到提示
    注入和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

    更多背景資訊：[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情況下切換模型？">
    使用 **model commands** 或僅編輯 **model** 欄位。避免完全替換配置。

    安全選項：

    - 在聊天中使用 `/model` （快速，僅限當前會話）
    - `openclaw models set ...` （僅更新模型配置）
    - `openclaw configure --section model` （互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個配置，否則請避免使用帶有部分物件的 `config.apply`。
    進行 RPC 編輯時，請先使用 `config.schema.lookup` 進行檢查，並優先使用 `config.patch`。查詢負載會為您提供標準化路徑、淺層架構文件/約束以及直接子項摘要。
    用於部分更新。
    如果您確實覆蓋了配置，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文件：[Models](/zh-Hant/concepts/models)、[Configure](/zh-Hant/cli/configure)、[Config](/zh-Hant/cli/config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管的模型（llama.cpp、vLLM、Ollama）嗎？">
    可以。Ollama 是本機模型最簡單的路徑。

    最快設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 拉取一個本機模型，例如 `ollama pull gemma4`
    3. 如果您也想要雲端模型，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    備註：

    - `Cloud + Local` 會提供您雲端模型以及您的本機 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 等雲端模型不需要在本機拉取
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全性備註：較小或高度量化的模型更容易受到提示詞注入攻擊。我們強烈建議任何可以使用工具的機器人都使用 **大型模型**。如果您仍想使用小型模型，請啟用沙盒和嚴格的工具允許清單。

    文件：[Ollama](/zh-Hant/providers/ollama)、[Local models](/zh-Hant/gateway/local-models)、
    [Model providers](/zh-Hant/concepts/model-providers)、[Security](/zh-Hant/gateway/security)、
    [Sandboxing](/zh-Hant/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 對於模型的使用有什麼不同？">
    - 這些部署可能會有所不同，且可能會隨時間改變；沒有固定的供應商建議。
    - 請使用 `openclaw models status` 檢查每個閘道上的目前執行時設定。
    - 對於安全性敏感或啟用工具的代理程式，請使用可用的最強大最新一代模型。

  </Accordion>

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

  <Accordion title="我可以在日常任務中使用 GPT 5.5，而在編程時使用 Codex 5.5 嗎？">
    可以。請將模型選擇與運行時選擇分開處理：

    - **原生 Codex 編程代理：** 將 `agents.defaults.model.primary` 設置為 `openai/gpt-5.5`。當您需要 ChatGPT/Codex 訂閱驗證時，請使用 `openclaw models auth login --provider openai-codex` 登入。
    - **代理循環之外的直接 OpenAI API 任務：** 為圖片、嵌入、語音、即時通訊以及其他非代理 OpenAI API 介面配置 `OPENAI_API_KEY`。
    - **OpenAI 代理 API 金鑰驗證：** 搭配有序的 `openai-codex` API 金鑰設定檔使用 `/model openai/gpt-5.5`。
    - **子代理：** 將編程任務路由到專注於 Codex 的代理，該代理擁有自己的 `openai/gpt-5.5` 模型。

    請參閱 [模型](/zh-Hant/concepts/models) 和 [斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="我如何為 GPT 5.5 配置快速模式？">
    使用對話切換或配置預設值：

    - **每個對話：** 當對話使用 `openai/gpt-5.5` 時，發送 `/fast on`。
    - **每個模型預設值：** 將 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 設置為 `true`。

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

    對於 OpenAI，快速模式在支援的原生 Responses 請求上對應到 `service_tier = "priority"`。對話 `/fast` 會覆蓋 beat 配置預設值。

    請參閱 [思考與快速模式](/zh-Hant/tools/thinking) 和 [OpenAI 快速模式](/zh-Hant/providers/openai#fast-mode)。

  </Accordion>

  <Accordion title='為什麼我看到「Model ... is not allowed」然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它將成為 `/model` 和任何
    會話覆寫的 **允許清單**。選擇不在該清單中的模型會傳回：

    ```
    Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
    Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
    ```

    該錯誤會**代替**正常回覆被傳回。解決方法：將確切的模型新增至
    `agents.defaults.models`，針對動態供應商目錄新增供應商萬用字元（例如 `"provider/*": {}`），移除允許清單，或從 `/model list` 中選擇一個模型。
    如果指令也包含了 `--runtime codex`，請先更新允許清單，然後重試
    同一個 `/model provider/model --runtime codex` 指令。

  </Accordion>

  <Accordion title='為什麼我看到「Unknown model: minimax/MiniMax-M2.7」？'>
    這表示 **供應商未設定**（找不到 MiniMax 供應商設定或驗證設定檔），因此無法解析該模型。

    解決檢查清單：

    1. 升級至最新的 OpenClaw 版本（或從原始碼執行 `main`），然後重新啟動閘道。
    2. 確認 MiniMax 已設定（精靈或 JSON），或 env/auth 設定檔中存在 MiniMax 驗證，
       以便插入相符的供應商
       （針對 `minimax` 使用 `MINIMAX_API_KEY`，針對 `minimax-portal` 使用
       `MINIMAX_OAUTH_TOKEN` 或已儲存的 MiniMax OAuth）。
    3. 針對您的驗證路徑，使用確切的模型 ID（區分大小寫）：
       針對 API-key 設定使用
       `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`，或
       針對 OAuth 設定使用 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選取（或在聊天中使用 `/model list`）。

    請參閱 [MiniMax](/zh-Hant/providers/minimax) 和 [Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 設為預設，並在複雜任務中使用 OpenAI 嗎？">
    可以。將 **MiniMax 設為預設** 模型，並在需要時 **每個會話** 切換模型。
    Fallbacks 是用於 **錯誤** 的，而非「困難任務」，因此請使用 `/model` 或獨立的代理程式。

    **選項 A：每個會話切換**

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

    **選項 B：分離的代理程式**

    - Agent A 預設：MiniMax
    - Agent B 預設：OpenAI
    - 透過代理程式路由或使用 `/agent` 進行切換

    文件：[模型](/zh-Hant/concepts/models)、[多代理程式路由](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 內建了一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 時才套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.5`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了同名稱的別名，您的設定將優先套用。

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

    然後 `/model sonnet`（或受支援時使用 `/<alias>`）將解析為該模型 ID。

  </Accordion>

  <Accordion title="如何來自其他提供商（如 OpenRouter 或 Z.AI）新增模型？">
    OpenRouter (按 token 付費；多種模型)：

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

    Z.AI (GLM 模型)：

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

    如果您參照了某個提供商/模型但缺少所需的提供商金鑰，您會收到執行時期的認證錯誤 (例如 `No API key found for provider "zai"`)。

    **新增新代理程式後找不到提供商的 API 金鑰**

    這通常表示 **新代理程式** 的認證儲存區是空的。認證是依代理程式而定，並儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈期間設定認證。
    - 或者僅將可攜式靜態 `api_key` / `token` 設定檔從主代理程式的認證儲存區複製到新代理程式的認證儲存區。
    - 對於 OAuth 設定檔，當新代理程式需要自己的帳戶時，請從該代理程式登入；否則 OpenClaw 可以在不複製重新整理權杖的情況下，直接讀取預設/主代理程式的設定。

    請 **勿** 在不同代理程式之間重複使用 `agentDir`；這會導致認證/工作階段衝突。

  </Accordion>
</AccordionGroup>

## 模型容錯移轉與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="故障轉移如何運作？">
    故障轉移發生在兩個階段：

    1. 同一供應商內的 **Auth profile 輪替**。
    2. **模型回退** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻時間適用於失敗的設定檔（指數退避），因此即使供應商受到速率限制或暫時故障，OpenClaw 仍能繼續回應。

    速率限制桶包含的不僅僅是純粹的 `429` 回應。OpenClaw
    也將諸如 `Too many concurrent requests`、
    `ThrottlingException`、 `concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、 `resource exhausted` 以及週期性
    使用量視窗限制（`weekly/monthly limit reached`）等訊息視為值得進行故障轉移的
    速率限制。

    某些看起來像計費的回應並不是 `402`，而某些 HTTP `402`
    回應也保留在該暫態桶中。如果供應商在 `401` 或 `403` 上返回明確的計費文字，OpenClaw 仍然可以將其保留在
    計費通道中，但供應商特定的文字匹配器僅限於擁有它們的供應商
    （例如 OpenRouter `Key limit exceeded`）。如果 `402`
    訊息看起來像是可重試的使用量視窗或
    組織/工作空間支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 會將其視為
    `rate_limit`，而不是長期的計費停用。

    語境溢出錯誤則有所不同：諸如
    `request_too_large`、 `input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 等簽名會保留在壓縮/重試路徑上，而不是推進模型
    回退。

    通用伺服器錯誤文字的範圍刻意比「任何包含
    unknown/error 的內容」更狹窄。OpenClaw 確實會將供應商範圍的暫態形狀（例如 Anthropic 裸露的 `An unknown error occurred`、OpenRouter 裸露的
    `Provider returned error`、像 `Unhandled stop reason:
    error`, JSON `api_error` 這樣帶有暫態伺服器文字的停止原因錯誤
    （`internal server error`、 `unknown error, 520`、 `upstream error`、 `backend
    error`), and provider-busy errors such as `ModelNotReadyException`）視為
    值得故障轉移的超時/過載訊號，前提是供應商語境相符。
    像是 `LLM request failed with an unknown
    error.` 這樣的通用內部回退文字保持保守，本身不會觸發模型回退。

  </Accordion>

  <Accordion title='「找不到設定檔 anthropic:default 的憑證」是什麼意思？'>
    這表示系統嘗試使用驗證設定檔 ID `anthropic:default`，但無法在預期的驗證儲存庫中找到其憑證。

    **修復檢查清單：**

    - **確認驗證設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其放在 `~/.openclaw/.env` 中或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的 agent**
      - 多 agent 設定意味著可能存在多個 `auth-profiles.json` 檔案。
    - **檢查模型/驗證狀態**
      - 使用 `openclaw models status` 查看已設定的模型以及提供者是否已通過驗證。

    **「找不到設定檔 anthropic 的憑證」修復檢查清單**

    這表示該次執行已固定至 Anthropic 驗證設定檔，但 Gateway 無法在其驗證儲存庫中找到它。

    - **使用 Claude CLI**
      - 在 gateway 主機上執行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您想改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 放入 **gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的固定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您正在 gateway 主機上執行指令**
      - 在遠端模式下，驗證設定檔位於 gateway 機器上，而非您的筆記型電腦。

  </Accordion>

  <Accordion title="為什麼它還嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試它。如果您尚未配置 Google 憑證，您將看到 `No API key found for provider "google"`。

    解決方法：提供 Google 授權，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：工作階段歷史記錄包含 **沒有簽章的思考區塊**（通常來自
    已中止/部分串流）。Google Antigravity 要求思考區塊必須有簽章。

    解決方法：OpenClaw 現在會為 Google Antigravity Claude 移除未簽章的思考區塊。如果仍然出現，請啟動**新工作階段**或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles：它們是什麼以及如何管理它們

相關：[/concepts/oauth](/zh-Hant/concepts/oauth) (OAuth 流程、Token 儲存、多帳戶模式)

<AccordionGroup>
  <Accordion title="什麼是授權設定檔？">
    授權設定檔是與提供者綁定的命名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    若要檢查已儲存的設定檔而不傾印機密，請執行 `openclaw models auth list`（可選擇性地搭配 `--provider <id>` 或 `--json`）。詳見 [Models CLI](/zh-Hant/cli/models#auth-profiles)。

  </Accordion>

  <Accordion title="典型的設定檔 ID 是什麼？">
    OpenClaw 使用提供者前綴的 ID，例如：

    - `anthropic:default`（當不存在電子郵件身分時常見）
    - `anthropic:<email>` 用於 OAuth 身分
    - 您選擇的自訂 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個認證設定檔嗎？">
    可以。設定支援設定檔的可選元數據以及每個供應商的排序 (`auth.order.<provider>`)。這**不會**儲存機密；它將 ID 對應到供應商/模式並設定輪詢順序。

    如果某個設定檔處於短暫的 **冷卻** (cool down) 狀態 (速率限制/逾時/認證失敗) 或較長的 **停用** (disabled) 狀態 (計費/額度不足)，OpenClaw 可能會暫時跳過該設定檔。若要檢查此狀態，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整方式：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷卻可以是特定模型的範圍。某個模型正在冷卻的設定檔，對於同一供應商上的同級模型仍然可用，而計費/停用期間則會阻擋整個設定檔。

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

    若要指定特定的代理程式：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    若要驗證實際會嘗試的內容，請使用：

    ```bash
    openclaw models status --probe
    ```

    如果儲存的設定檔未包含在明確的順序中，探測會針對該設定檔回報 `excluded_by_auth_order`，而不是默默嘗試。

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
- [FAQ — 快速開始與初次執行設定](/zh-Hant/help/faq-first-run)
- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型容錯移轉](/zh-Hant/concepts/model-failover)
