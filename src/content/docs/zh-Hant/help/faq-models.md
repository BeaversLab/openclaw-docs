---
summary: "常見問題：模型預設值、選擇、別名、切換、容錯移轉與認證設定檔"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "常見問題：模型與認證"
sidebarTitle: "模型常見問題"
---

模型與設定檔的問答。如需設定、工作階段、閘道、通道和疑難排解的資訊，請參閱主要的 [FAQ](/zh-Hant/help/faq)。

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定的內容：

    ```
    agents.defaults.model.primary
    ```

    模型被引用為 `provider/model`（例如：`openai/gpt-5.5` 或 `anthropic/claude-sonnet-4-6`）。如果您省略提供者，OpenClaw 首先會嘗試別名，然後嘗試該確切模型 ID 的唯一已設定提供者匹配，只有在這之後才會回退到設定的預設提供者作為已棄用的相容性路徑。如果該提供者不再公開設定的預設模型，OpenClaw 會回退到第一個設定的提供者/模型，而不是顯示陳舊的已移除提供者預設值。您仍然應該**明確地**設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦哪種模型？">
    **推薦預設值：** 使用您的提供者堆疊中可用的最強大最新世代模型。
    **對於啟用工具或不受信任輸入的代理程式：** 優先考慮模型強度而非成本。
    **對於常規/低風險聊天：** 使用較便宜的備用模型並依代理程式角色進行路由。

    MiniMax 有其自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
    [本機模型](/zh-Hant/gateway/local-models)。

    經驗法則：對於高風險工作，使用您**負擔得起的最佳模型**；對於常規聊天或摘要，則使用較便宜的模型。您可以依代理程式路由模型，並使用子代理程式來
    平行化長任務（每個子代理程式都會消耗 token）。請參閱 [模型](/zh-Hant/concepts/models) 和
    [子代理程式](/zh-Hant/tools/subagents)。

    強烈警告：較弱/過度量化的模型更容易受到提示
    注入和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

    更多背景資訊：[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除設定的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **模型** 欄位。避免完整替換設定。

    安全選項：

    - `/model` 在聊天中（快速，僅限該次會話）
    - `openclaw models set ...`（僅更新模型設定）
    - `openclaw configure --section model`（互動式）
    - 編輯 `agents.defaults.model` 中的 `~/.openclaw/openclaw.json`

    除非您打算替換整個設定，否則請避免使用帶有部分物件的 `config.apply`。
    對於 RPC 編輯，請先使用 `config.schema.lookup` 檢查，並優先使用 `config.patch`。查詢回傳值會提供正規化的路徑、淺層架構文件/限制以及直接子項的摘要。
    以進行部分更新。
    如果您不小心覆寫了設定，請從備份還原或重新執行 `openclaw doctor` 來修復。

    文件：[Models](/zh-Hant/concepts/models)、[Configure](/zh-Hant/cli/configure)、[Config](/zh-Hant/cli/config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管模型（llama.cpp, vLLM, Ollama）嗎？">
    可以。對於本地模型，Ollama 是最簡單的途徑。

    最快設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 下載一個本地模型，例如 `ollama pull gemma4`
    3. 如果您也想使用雲端模型，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    備註：

    - `Cloud + Local` 讓您可以同時使用雲端模型和您的本地 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 的雲端模型不需要本地下載
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全注意：較小或高度量化的模型更容易受到提示詞注入的攻擊。對於任何可以使用工具的機器人，我們強烈建議使用**大型模型**。如果您仍想使用小型模型，請啟用沙盒機制和嚴格的工具允許清單。

    文件：[Ollama](/zh-Hant/providers/ollama)、[Local models](/zh-Hant/gateway/local-models)、
    [Model providers](/zh-Hant/concepts/model-providers)、[Security](/zh-Hant/gateway/security)、
    [Sandboxing](/zh-Hant/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">
    - 這些部署可能有所不同，且可能會隨時間變更；沒有固定的提供者建議。
    - 使用 `openclaw models status` 檢查每個閘道目前的執行時設定。
    - 對於安全性敏感/啟用工具的代理程式，請使用可用的最強大最新世代模型。

  </Accordion>

  <Accordion title="如何即時切換模型（無需重新啟動）？">
    將 `/model` 指令作為獨立訊息發送：

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

    `/model`（以及 `/model list`）會顯示一個簡潔的編號選擇器。透過數字進行選擇：

    ```
    /model 3
    ```

    您還可以強制指定供應商的特定身分驗證設定檔（每個工作階段）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 顯示目前啟用的代理程式、正在使用的 `auth-profiles.json` 檔案，以及將在下一次嘗試的身分驗證設定檔。
    它還會顯示設定的供應商端點（`baseUrl`）和 API 模式（`api`）（如果有的話）。

    **如何取消固定我透過 @profile 設定的設定檔？**

    重新執行 `/model`，但**不要**加上 `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想恢復為預設值，請從 `/model` 中選取（或發送 `/model <default provider/model>`）。
    使用 `/model status` 確認目前啟用的身分驗證設定檔。

  </Accordion>

  <Accordion title="如果兩個供應商公開相同的模型 ID，/model 會使用哪一個？">
    `/model provider/model` 會為該會話選取該特定的供應商路由。

    例如，`qianfan/deepseek-v4-flash` 和 `deepseek/deepseek-v4-flash` 是不同的模型參照，即使兩者都包含 `deepseek-v4-flash`。OpenClaw 不應僅因為裸模型 ID 相符，就靜默地從一個供應商切換到另一個。

    使用者選取的 `/model` 參照對於備援策略也是嚴格的。如果該選取的供應商/模型無法使用，回覆會明顯失敗，而不是從 `agents.defaults.model.fallbacks` 回答。已配置的備援鏈仍然適用於已配置的預設值、主要 cron 任務以及自動選取的備援狀態。

    如果從非會話覆寫開始的執行被允許使用備援，OpenClaw 會先嘗試請求的供應商/模型，然後是已配置的備援，最後才是已配置的主要項目。這可以防止重複的裸模型 ID 直接跳回預設供應商。

    請參閱 [模型](/zh-Hant/concepts/models) 和 [模型備援](/zh-Hant/concepts/model-failover)。

  </Accordion>

  <Accordion title="我可以將 GPT 5.5 用於日常任務，將 Codex 5.5 用於編程嗎？">
    可以。將模型選擇和運行時選擇分開處理：

    - **原生 Codex 編程代理：** 將 `agents.defaults.model.primary` 設定為 `openai/gpt-5.5`。當您想要使用 ChatGPT/Codex 訂閱驗證時，請使用 `openclaw models auth login --provider openai-codex` 登入。
    - **代理循環之外的直接 OpenAI API 任務：** 為圖像、嵌入、語音、即時通訊和其他非代理 OpenAI API 介面配置 `OPENAI_API_KEY`。
    - **OpenAI 代理 API 金鑰驗證：** 使用 `/model openai/gpt-5.5` 搭配已排序的 `openai-codex` API 金鑰設定檔。
    - **子代理：** 將編程任務路由到具有自己 `openai/gpt-5.5` 模型的專注於 Codex 的代理。

    請參閱 [模型](/zh-Hant/concepts/models) 和 [斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="How do I configure fast mode for GPT 5.5?">
    Use either a session toggle or a config default:

    - **Per session:** send `/fast on` while the session is using `openai/gpt-5.5`.
    - **Per model default:** set `agents.defaults.models["openai/gpt-5.5"].params.fastMode` to `true`.

    Example:

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

    For OpenAI, fast mode maps to `service_tier = "priority"` on supported native Responses requests. Session `/fast` overrides beat config defaults.

    See [Thinking and fast mode](/zh-Hant/tools/thinking) and [OpenAI fast mode](/zh-Hant/providers/openai#fast-mode).

  </Accordion>

  <Accordion title='Why do I see "Model ... is not allowed" and then no reply?'>
    If `agents.defaults.models` is set, it becomes the **allowlist** for `/model` and any
    session overrides. Choosing a model that isn't in that list returns:

    ```
    Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
    Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
    ```

    That error is returned **instead of** a normal reply. Fix: add the exact model to
    `agents.defaults.models`, add a provider wildcard such as `"provider/*": {}` for dynamic provider catalogs, remove the allowlist, or pick a model from `/model list`.
    If the command also included `--runtime codex`, update the allowlist first and then retry
    the same `/model provider/model --runtime codex` command.

  </Accordion>

  <Accordion title='為什麼我看到「Unknown model: minimax/MiniMax-M2.7」？'>
    這意味著**未設定供應商**（找不到 MiniMax 供應商設定或驗證設定檔），因此無法解析該模型。

    修復檢查清單：

    1. 升級至最新的 OpenClaw 版本（或從原始碼執行 `main`），然後重新啟動閘道。
    2. 確認已設定 MiniMax（透過精靈或 JSON），或環境/驗證設定檔中存在 MiniMax 驗證資訊，以便注入相符的供應商
       （`MINIMAX_API_KEY` 用於 `minimax`、`MINIMAX_OAUTH_TOKEN` 或儲存的 MiniMax
       OAuth 用於 `minimax-portal`）。
    3. 在您的驗證路徑中使用確切的模型 ID（區分大小寫）：
       若是 API-key 設定則使用 `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`，
       若是 OAuth 設定則使用 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選取（或在聊天中使用 `/model list`）。

    請參閱 [MiniMax](/zh-Hant/providers/minimax) 和 [Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 作為預設值，並在複雜任務中使用 OpenAI 嗎？">
    可以。將 **MiniMax 作為預設值**，並在需要時**依會話切換**模型。
    容錯機制是用於**錯誤**，而非「困難任務」，因此請使用 `/model` 或獨立的代理程式。

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

    - 代理程式 A 預設：MiniMax
    - 代理程式 B 預設：OpenAI
    - 透過代理程式路由或使用 `/agent` 進行切換

    文件：[Models](/zh-Hant/concepts/models)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 附帶了一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 時套用）：

    - `opus` → `anthropic/claude-opus-4-7`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了同名的別名，您的設定值優先。

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

    然後 `/model sonnet`（或在支援時使用 `/<alias>`）將解析為該模型 ID。

  </Accordion>

  <Accordion title="如何新增來自 OpenRouter 或 Z.AI 等其他供應商的模型？">
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

    如果您參照了某個供應商/模型，但缺少必要的供應商金鑰，您將會收到執行階段的授權錯誤 (例如 `No API key found for provider "zai"`)。

    **新增代理後找不到供應商的 API 金鑰**

    這通常表示**新代理**具有空的授權儲存區。授權是針對每個代理的，並儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈過程中設定授權。
    - 或者僅將可移植的靜態 `api_key` / `token` 設定檔從主要代理的授權儲存區複製到新代理的授權儲存區。
    - 對於 OAuth 設定檔，當新代理需要自己的帳戶時，請從新代理登入；否則 OpenClaw 可以直接讀取預設/主要代理，而無需複製更新權杖 (refresh tokens)。

    請**勿**在代理之間重複使用 `agentDir`；這會導致授權/工作階段衝突。

  </Accordion>
</AccordionGroup>

## 模型容錯移轉與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="故障轉移是如何運作的？">
    故障轉移分兩個階段進行：

    1. **Auth profile rotation** 在同一供應商內。
    2. **Model fallback** 切換至 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻時間適用於發生故障的設定檔（指數退避），因此即使供應商受到速率限制或暫時發生故障，OpenClaw 仍能持續回應。

    速率限制區塊不僅包含一般的 `429` 回應。OpenClaw
    亦會將諸如 `Too many concurrent requests`、
    `ThrottlingException`、 `concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、 `resource exhausted`，以及定期
    使用視窗限制（`weekly/monthly limit reached`）等訊息視為值得進行故障轉移的
    速率限制。

    某些看起來像帳單相關的回應並非 `402`，而某些 HTTP `402`
    回應也會保留在暫時性區塊中。如果供應商在
    `401` 或 `403` 上傳回明確的帳單文字，OpenClaw 仍可將其保留在
    帳單通道中，但供應商特定的文字匹配器僅限於
    擁有它們的供應商（例如 OpenRouter `Key limit exceeded`）。如果 `402`
    訊息看起來像是可重試的使用視窗或
    組織/工作空間支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 會將其視為
    `rate_limit`，而非長期的帳單停用。

    上下文溢出錯誤則有所不同：諸如
    `request_too_large`、 `input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model`，或 `ollama error: context length
    exceeded` 等簽章會停留在壓縮/重試路徑上，而推進模型
    故障轉移。

    一般伺服器錯誤文字的範圍刻意比「任何包含
    unknown/error 的內容」更狹隘。OpenClaw 確實會處理供應商範圍的暫時性形狀，
    例如 Anthropic 裸露的 `An unknown error occurred`、OpenRouter 裸露的
    `Provider returned error`、停止原因錯誤，如 `Unhandled stop reason:
    error`, JSON `api_error` 搭帶暫時性伺服器文字
    （`internal server error`、 `unknown error, 520`、 `upstream error`、 `backend
    error`), and provider-busy errors such as `ModelNotReadyException`，當供應商
    內容相符時，會將其視為值得進行故障轉移的逾時/過載訊號。
    一般內部後備文字，如 `LLM request failed with an unknown
    error.` 則保持保守，不會單獨觸發模型故障轉移。

  </Accordion>

  <Accordion title='「No credentials found for profile anthropic:default」是什麼意思？'>
    這表示系統嘗試使用驗證設定檔 ID `anthropic:default`，但在預期的驗證儲存區中找不到其憑證。

    **修復檢查清單：**

    - **確認驗證設定檔的位置**（新舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY` 但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其置於 `~/.openclaw/.env` 中或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的代理程式**
      - 多代理程式設定意味著可能會有多個 `auth-profiles.json` 檔案。
    - **健全性檢查模型/驗證狀態**
      - 使用 `openclaw models status` 查看已設定的模型以及提供者是否已通過驗證。

    **「No credentials found for profile anthropic」的修復檢查清單**

    這表示該次執行已固定使用 Anthropic 驗證設定檔，但 Gateway
    無法在其驗證儲存區中找到它。

    - **使用 Claude CLI**
      - 在 gateway 主機上執行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您想改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 置於 **gateway 主機**上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的固定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您在 gateway 主機上執行指令**
      - 在遠端模式下，驗證設定檔位於 gateway 機器上，而不是您的筆記型電腦上。

  </Accordion>

  <Accordion title="為什麼它還嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置將 Google Gemini 包含為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試使用它。如果您尚未配置 Google 憑證，您將會看到 `No API key found for provider "google"`。

    解決方法：提供 Google 身份驗證，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備機制路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：對話記錄包含 **未帶簽名的思考區塊**（通常來自
    已中止/部分的串流）。Google Antigravity 要求思考區塊必須帶有簽名。

    解決方法：OpenClaw 現在會針對 Google Antigravity Claude 移除未簽名的思考區塊。如果問題仍然存在，請啟動 **新的對話** 或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles: what they are and how to manage them

相關：[/concepts/oauth](/zh-Hant/concepts/oauth) （OAuth 流程、Token 儲存、多帳號模式）

<AccordionGroup>
  <Accordion title="什麼是 auth profile？">
    Auth profile 是與提供者綁定的具名憑證記錄（OAuth 或 API 金鑰）。Profile 儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    若要檢視已儲存的 profile 而不傾印敏感資訊，請執行 `openclaw models auth list`（可選擇性地加入 `--provider <id>` 或 `--json`）。詳情請參閱 [Models CLI](/zh-Hant/cli/models#auth-profiles)。

  </Accordion>

  <Accordion title="常見的 profile ID 是什麼？">
    OpenClaw 使用帶有提供者前綴的 ID，例如：

    - `anthropic:default` （在不存在電子郵件身份時常見）
    - `anthropic:<email>` 用於 OAuth 身份
    - 您選擇的自訂 ID （例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個驗證設定檔嗎？">
    可以。Config 支援設定檔的選用中繼資料以及每個供應商的排序 (`auth.order.<provider>`)。這**不會**儲存機密；它會將 ID 對應到供應商/模式並設定輪替順序。

    如果設定檔處於短暫的 **cooldown**（冷卻）（速率限制/逾時/驗證失敗）或較長的 **disabled**（停用）狀態（計費/額度不足），OpenClaw 可能會暫時跳過該設定檔。若要檢查此狀況，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷卻時間可能僅限於特定模型。為某個模型冷卻中的設定檔，對於同一供應商上的同層模型仍然可用，但計費/停用期間仍會封鎖整個設定檔。

    您也可以透過 CLI 設定 **per-agent**（每個代理程式）的排序覆寫（儲存在該代理程式的 `auth-state.json` 中）：

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

    若要驗證實際將會嘗試什麼，請使用：

    ```bash
    openclaw models status --probe
    ```

    如果儲存的設定檔未包含在明確的順序中，probe 將會回報該設定檔的 `excluded_by_auth_order`，而不是靜默地嘗試它。

  </Accordion>

  <Accordion title="OAuth 與 API 金鑰 - 有什麼差別？">
    OpenClaw 支援這兩者：

    - **OAuth** 通常利用訂閱存取權（如適用）。
    - **API 金鑰** 使用依 token 付費的計費方式。

    精靈明確支援 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 金鑰。

  </Accordion>
</AccordionGroup>

## 相關

- [FAQ](/zh-Hant/help/faq) — 主要常見問題
- [FAQ — 快速入門與首次執行設定](/zh-Hant/help/faq-first-run)
- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型失效備援](/zh-Hant/concepts/model-failover)
