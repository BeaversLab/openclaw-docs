---
summary: "常見問題：模型預設值、選擇、別名、切換、容錯移轉與認證設定檔"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "常見問題：模型與認證"
sidebarTitle: "模型常見問題"
---

模型與認證設定檔問答。如需設定、會話、閘道、通道及疑難排解的相關資訊，請參閱主要 [FAQ](/zh-Hant/help/faq)。

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定的內容：

    ```
    agents.defaults.model.primary
    ```

    模型被引用為 `provider/model`（例如：`openai/gpt-5.5` 或 `anthropic/claude-sonnet-4-6`）。如果您省略提供者，OpenClaw 首先會嘗試別名，然後嘗試該確切模型 ID 的唯一已設定提供者匹配，只有在這之後才會回退到設定的預設提供者作為已棄用的相容性路徑。如果該提供者不再公開設定的預設模型，OpenClaw 會回退到第一個設定的提供者/模型，而不是顯示陳舊的已移除提供者預設值。您仍然應該**明確地**設定 `provider/model`。

  </Accordion>

  <Accordion title="What model do you recommend?">
    **建議預設值：** 使用您供應商堆疊中可用的最強大最新世代模型。
    **對於已啟用工具或輸入不受信任的代理程式：** 優先考慮模型強度而非成本。
    **對於例行/低風險聊天：** 使用較便宜的備援模型，並依代理程式角色進行路由。

    MiniMax 有自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
    [本機模型](/zh-Hant/gateway/local-models)。

    經驗法則：對於高風險工作，請使用您**負擔得起的最佳模型**；對於例行聊天或摘要，則使用較便宜的模型。您可以依代理程式路由模型，並使用子代理程式將長任務並行化（每個子代理程式都會消耗權杖）。請參閱 [模型](/zh-Hant/concepts/models) 和
    [子代理程式](/zh-Hant/tools/subagents)。

    強烈警告：較弱/過度量化的模型更容易受到提示詞注入和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

    更多背景資訊：[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **模型** 欄位。避免完全替換配置。

    安全的選項：

    - 在聊天中使用 `/model` （快速，僅當前會話有效）
    - `openclaw models set ...` （僅更新模型配置）
    - `openclaw configure --section model` （互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個配置，否則請避免使用帶有部分物件的 `config.apply`。
    對於 RPC 編輯，請先使用 `config.schema.lookup` 進行檢查，並優先使用 `config.patch`。查找載荷會為您提供標準化路徑、淺層架構文件/約束以及直接子項摘要。
    以進行部分更新。
    如果您確實覆蓋了配置，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文件：[模型](/zh-Hant/concepts/models)、[配置](/zh-Hant/cli/configure)、[Config](/zh-Hant/cli/config)、[醫生](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管模型（llama.cpp、vLLM、Ollama）嗎？">
    可以。Ollama 是本機模型最簡單的途徑。

    最快設定方法：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 拉取一個本機模型，例如 `ollama pull gemma4`
    3. 如果您也想要雲端模型，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    註記：

    - `Cloud + Local` 提供雲端模型加上您的本機 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 等雲端模型不需要在本機拉取
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全性提示：較小或經過高度量化的模型更容易受到提示詞注入的攻擊。對於任何可以使用工具的機器人，我們強烈建議使用**大型模型**。如果您仍想使用小型模型，請啟用沙盒機制並設定嚴格的工具允許清單。

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

  <Accordion title="如果兩個提供商公開相同的 model id，/model 會使用哪一個？">
    `/model provider/model` 會為該工作階段選擇該確切的提供商路由。

    例如，`qianfan/deepseek-v4-flash` 和 `deepseek/deepseek-v4-flash` 是不同的 model 參考，即使兩者都包含 `deepseek-v4-flash`。OpenClaw 不應僅因為裸露的 model id 相符就無聲地從一個提供商切換到另一個。

    使用者選擇的 `/model` 參考對於故障轉移策略也是嚴格的。如果該選擇的提供商/model 無法使用，回應會明顯失敗，而不是從 `agents.defaults.model.fallbacks` 回答。設定的故障轉移鏈仍然適用於設定的預設值、cron 任務主要版本，以及自動選擇的故障轉移狀態。

    如果允許從非工作階段覆寫開始的執行使用故障轉移，OpenClaw 會先嘗試請求的提供商/model，然後是設定的故障轉移，之後才是設定的主要版本。這可以防止重複的裸露 model id 直接跳回預設提供商。

    請參閱 [Models](/zh-Hant/concepts/models) 和 [Model failover](/zh-Hant/concepts/model-failover)。

  </Accordion>

  <Accordion title="我可以在日常任務中使用 GPT 5.5，在編碼時使用 Codex 5.5 嗎？">
    可以。請將 model 選擇和執行階段選擇分開處理：

    - **原生 Codex 編碼代理：** 將 `agents.defaults.model.primary` 設為 `openai/gpt-5.5`。當您想要 ChatGPT/Codex 訂閱驗證時，請使用 `openclaw models auth login --provider openai` 登入。
    - **代理迴圈之外的直接 OpenAI API 任務：** 為圖片、嵌入、語音、即時通訊和其他非代理 OpenAI API 介面設定 `OPENAI_API_KEY`。
    - **OpenAI 代理 API 金鑰驗證：** 使用具有排序的 `openai` API 金鑰設定檔的 `/model openai/gpt-5.5`。
    - **子代理：** 將編碼任務路由到專注於 Codex 的代理，該代理具有自己的 `openai/gpt-5.5` model。

    請參閱 [Models](/zh-Hant/concepts/models) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何為 GPT 5.5 配置快速模式？">
    使用工作階段切換開關或配置預設值：

    - **每個工作階段：**在工作階段使用 `openai/gpt-5.5` 時，傳送 `/fast on`。
    - **每個模型預設值：**將 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 設定為 `true`。

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

    對於 OpenAI，快速模式在支援的原生 Responses 要求上對應到 `service_tier = "priority"`。工作階段 `/fast` 會覆寫 beat 配置預設值。

    請參閱 [思考與快速模式](/zh-Hant/tools/thinking) 和 [OpenAI 快速模式](/zh-Hant/providers/openai#fast-mode)。

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

  <Accordion title='為什麼我會看到「Unknown model: minimax/MiniMax-M3」？'>
    這表示**未設定提供者**（找不到 MiniMax 提供者配置或設定檔），因此無法解析該模型。

    修正檢查清單：

    1. 升級至目前的 OpenClaw 版本（或從原始碼 `main` 執行），然後重新啟動閘道。
    2. 確認已設定 MiniMax（精靈或 JSON），或者 MiniMax 驗證資料存在於 env/auth 設定檔中，以便可以插入匹配的提供者
       （`minimax` 的 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN`，或 `minimax-portal` 的已儲存 MiniMax
       OAuth）。
    3. 為您的驗證路徑使用確切的模型 ID（區分大小寫）：
       API 金鑰設定的 `minimax/MiniMax-M3`、`minimax/MiniMax-M2.7` 或
       `minimax/MiniMax-M2.7-highspeed`，或
       OAuth 設定的 `minimax-portal/MiniMax-M3`、`minimax-portal/MiniMax-M2.7` 或
       `minimax-portal/MiniMax-M2.7-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選取（或在聊天中 `/model list`）。

    請參閱 [MiniMax](/zh-Hant/providers/minimax) 和 [Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 作為預設，並在複雜任務中使用 OpenAI 嗎？">
    可以。將 **MiniMax 設為預設**，並在需要時**依會話切換**模型。
    Fallbacks 是針對**錯誤**的，而非「困難任務」，因此請使用 `/model` 或獨立的 Agent。

    **選項 A：依會話切換**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "minimax" },
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

    **選項 B：分開的 Agents**

    - Agent A 預設：MiniMax
    - Agent B 預設：OpenAI
    - 透過 Agent 路由或使用 `/agent` 來切換

    文件：[Models](/zh-Hant/concepts/models)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 內建了幾個預設簡稱（僅在模型存在於 `agents.defaults.models` 時套用）：

    - `opus` → `anthropic/claude-opus-4-8`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite`

    如果你設定了同名的別名，則以你的設定為準。

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
          },
        },
      },
    }
    ```

    接著 `/model sonnet`（或在支援時使用 `/<alias>`）將會解析為該模型 ID。

  </Accordion>

  <Accordion title="如何加入來自 OpenRouter 或 Z.AI 等其他供應商的模型？">
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

    如果您參照了某個供應商/模型，但缺少所需的供應商金鑰，您會收到執行時期的授權錯誤（例如 `No API key found for provider "zai"`）。

    **加入新代理程式後找不到供應商的 API 金鑰**

    這通常表示 **新代理程式** 擁有一個空的授權儲存區。授權是針對每個代理程式的，並儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈期間設定授權。
    - 或者僅將可攜帶的靜態 `api_key` / `token` 設定檔從主代理程式的授權儲存區複製到新代理程式的授權儲存區中。
    - 對於 OAuth 設定檔，當新代理程式需要自己的帳戶時，請從新代理程式登入；否則 OpenClaw 可以直接讀取預設/主代理程式，而無需複製重新整理權杖。

    請 **勿** 在不同代理程式之間重複使用 `agentDir`；這會導致授權/工作階段衝突。

  </Accordion>
</AccordionGroup>

## 模型容錯移轉與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="故障轉移是如何運作的？">
    故障轉移分兩個階段進行：

    1. 在同一個供應商內進行 **Auth profile 輪換** (Auth profile rotation)。
    2. **模型後備** (Model fallback) 切換到 `agents.defaults.model.fallbacks` 中的下一個模型。

    失敗的設定檔會套用冷卻時間（指數退避），因此即使當供應商受到速率限制或暫時發生故障，OpenClaw 仍能持續回應。

    速率限制桶包含的內容不僅僅是單純的 `429` 回應。OpenClaw 也會將訊息如 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted`，以及週期性
    使用量視窗限制 (`weekly/monthly limit reached`) 視為值得觸發故障轉移的
    速率限制。

    某些看起來像帳單問題的回應並非 `402`，而某些 HTTP `402`
    回應也會保留在暫態桶中。如果供應商在 `401` 或 `403` 上
    返回明確的帳單文字，OpenClaw 仍可將其保留在帳單通道中，但特定供應商的文字匹配器僅限於
    擁有它們的供應商（例如 OpenRouter `Key limit exceeded`）。如果 `402`
    訊息看起來像可重試的使用量視窗或
    組織/工作區支出限制 (`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`)，OpenClaw 會將其視為
    `rate_limit`，而非長期的帳單停用。

    上下文溢出錯誤則不同：諸如 `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 等特徵會保持在壓縮/重試路徑上，而不會推進模型後備。

    通用伺服器錯誤文字的範圍刻意比「任何含有 unknown/error 的內容」更狹隘。OpenClaw 確實會將供應商範圍內的暫態形式（如 Anthropic 單純的 `An unknown error occurred`、OpenRouter 單純的
    `Provider returned error`、停止原因錯誤如 `Unhandled stop reason:
    error`, JSON `api_error` 且帶有暫態伺服器文字的
    載荷 (`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`), and provider-busy errors such as `ModelNotReadyException`) 在供應商
    上下文符合時視為值得故障轉移的超時/過載訊號。
    通用內部後備文字如 `LLM request failed with an unknown
    error.` 則保持保守，單獨不會觸發模型後備。

  </Accordion>

  <Accordion title='「No credentials found for profile anthropic:default」是什麼意思？'>
    這表示系統嘗試使用設定檔 ID `anthropic:default`，但無法在預期的認證儲存區中找到其憑證。

    **修復檢查清單：**

    - **確認認證設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，則可能無法繼承該變數。請將其置於 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的代理程式**
      - 多代理程式設定代表可能有多個 `auth-profiles.json` 檔案。
    - **檢查模型/認證狀態**
      - 使用 `openclaw models status` 查看已設定的模型以及供應商是否已通過認證。

    **「No credentials found for profile anthropic」的修復檢查清單**

    這表示執行已釘選至 Anthropic 認證設定檔，但 Gateway
    無法在其認證儲存區中找到它。

    - **使用 Claude CLI**
      - 在 gateway 主機上執行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您想改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 置於 **gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的釘選順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您正在 gateway 主機上執行指令**
      - 在遠端模式下，認證設定檔位於 gateway 機器上，而非您的筆記型電腦。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並失敗了？">
    如果您的模型設定包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試使用它。如果您尚未設定 Google 憑證，您會看到 `No API key found for provider "google"`。

    修復方法：提供 Google 驗證，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：會話記錄包含 **沒有簽章的思考區塊**（通常來自
    已中止/不完整的串流）。Google Antigravity 要求思考區塊必須有簽章。

    修復方法：OpenClaw 現在會為 Google Antigravity Claude 移除未簽章的思考區塊。如果仍然出現此問題，請開啟一個 **新會話** 或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles: what they are and how to manage them

相關：[/concepts/oauth](/zh-Hant/concepts/oauth) (OAuth 流程、權杖儲存、多重帳戶模式)

<AccordionGroup>
  <Accordion title="什麼是驗證設定檔？">
    驗證設定檔是與供應商綁定的具名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    若要檢查已儲存的設定檔而不洩漏機密，請執行 `openclaw models auth list`（可選 `--provider <id>` 或 `--json`）。詳情請參閱 [Models CLI](/zh-Hant/cli/models#auth-profiles)。

  </Accordion>

  <Accordion title="典型的設定檔 ID 是什麼？">
    OpenClaw 使用帶有供應商前綴的 ID，例如：

    - `anthropic:default` （當不存在電子郵件身分時很常見）
    - `anthropic:<email>` 用於 OAuth 身分
    - 您選擇的自訂 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="Can I control which auth profile is tried first?">
    是的。配置支持配置檔的可選元數據和每個供應商的順序 (`auth.order.<provider>`)。這**不**會存儲機密；它將 ID 對映到供應商/模式並設置輪換順序。

    如果配置檔處於短暫的 **冷卻** (速率限制/逾時/身份驗證失敗) 或較長的 **已停用** 狀態 (計費/餘額不足)，OpenClaw 可能會暫時跳過該配置檔。要檢查此情況，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整方式：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷卻範圍可以是特定於模型的。針對一個模型正在冷卻的配置檔對於同一供應商上的兄弟模型仍然可用，而計費/已停用窗口仍會阻止整個配置檔。

    您還可以透過 CLI 設置 **每個代理** 的順序覆蓋 (存儲在該代理的 `auth-state.json` 中)：

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

    若要針對特定代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    若要驗證將實際嘗試的內容，請使用：

    ```bash
    openclaw models status --probe
    ```

    如果存儲的配置檔未包含在明確順序中，探測報告將針對該配置檔報告 `excluded_by_auth_order`，而不是靜默地嘗試它。

  </Accordion>

  <Accordion title="OAuth vs API key - what is the difference?">
    OpenClaw 同時支援這兩者：

    - **OAuth / CLI 登入** 通常會利用供應商支援時的訂閱存取權。對於 Anthropic，OpenClaw 的 Claude CLI 後端使用 Claude Code `claude -p`；Anthropic 目前將其視為 Agent SDK/程式化使用，並從 2026 年 6 月 15 日開始提供單獨的每月 Agent SDK 額度。
    - **API 金鑰** 使用按 Token 付費計費。

    精靈 (Wizard) 明確支援 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 金鑰。

  </Accordion>
</AccordionGroup>

## 相關

- [FAQ](/zh-Hant/help/faq) — 主要常見問題解答
- [FAQ — 快速開始和首次執行設定](/zh-Hant/help/faq-first-run)
- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型故障轉移](/zh-Hant/concepts/model-failover)
