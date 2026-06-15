---
summary: "OpenClaw 如何輪換驗證設定檔並在模型之間進行故障轉移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障轉移"
sidebarTitle: "模型故障轉移"
---

OpenClaw 分兩個階段處理故障：

1. 在目前供應商內進行 **設定檔輪替**。
2. **模型故障轉移**至 `agents.defaults.model.fallbacks` 中的下一個模型。

本文件說明執行階段規則以及支援這些規則的資料。

## 執行流程

對於正常的文字運行，OpenClaw 會按以下順序評估候選模型：

<Steps>
  <Step title="解析會話狀態">解析活動會話模型和驗證設定檔偏好。</Step>
  <Step title="建置候選鏈">根據目前的模型選擇和該選擇來源的故障轉移策略，建置模型候選鏈。已設定的預設值、Cron 作業主要模型和自動選取的故障轉移模型可以使用已設定的故障轉移；明確的使用者會話選擇則是嚴格的。</Step>
  <Step title="嘗試目前的提供者">使用驗證設定檔輪換/冷卻規則嘗試目前的提供者。</Step>
  <Step title="在可故障轉移的錯誤時推進">如果該提供者因可故障轉移的錯誤而耗盡，則移至下一個模型候選。</Step>
  <Step title="保存故障轉移覆寫">在重試開始前保存選取的故障轉移覆寫，以便其他會話讀取者能看到執行即將使用的相同提供者/模型。保存的模型覆寫會被標記為 `modelOverrideSource: "auto"`。</Step>
  <Step title="失敗時精確回滾">如果故障轉移候選失敗，則僅在欄位仍符合該失敗候選時，回滾屬於故障轉移的會話覆寫欄位。</Step>
  <Step title="若耗盡則拋出 FallbackSummaryError">如果每個候選都失敗，則拋出 `FallbackSummaryError`，其中包含每次嘗試的詳細資訊，以及已知時最快的冷卻到期時間。</Step>
</Steps>

這是有意設計得比「儲存並還原整個會話」更狹隘。回覆執行器僅會保存其為故障轉移所擁有的模型選取欄位：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

這可以防止失敗的後備重試覆寫較新的無關會話變更，例如嘗試執行期間發生的手動 `/model` 變更或會話輪替更新。

## 選擇來源策略

OpenClaw 將選擇的提供者/模型與選擇原因分開。該來源控制是否允許故障轉移鏈：

- **已配置的預設值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **代理主要選項**：除非該代理模型物件包含其自己的 `fallbacks`，否則 `agents.list[].model` 是嚴格模式。使用 `fallbacks: []` 可明確啟用嚴格行為，或提供非空列表以讓該代理加入模型後備。
- **自動後備覆寫**：執行階段後備會在重試之前寫入 `providerOverride`、`modelOverride`、`modelOverrideSource: "auto"` 以及選定的來源模型。該自動覆寫可以繼續沿著配置的後備鏈前進，而無需在每個訊息上探查主要模型，但 OpenClaw 會定期重新探查配置的來源，並在恢復時清除自動覆寫。`/new`、`/reset` 和 `sessions.reset` 也會清除自動來源的覆寫。當 Heartbeat 執行沒有明確的 `heartbeat.model` 清除時，如果其來源不再符合當前配置的預設值，則會清除直接自動覆寫。
- **使用者會話覆寫**：`/model`、模型選擇器、`session_status(model=...)` 和 `sessions.patch` 會寫入 `modelOverrideSource: "user"`。這是一個精確的會話選擇。如果選定的提供者/模型在產生回覆之前失敗，OpenClaw 將報告失敗，而不是從無關的配置後備進行回答。
- **舊版會話覆寫**：較舊的會話條目可能具有 `modelOverride` 而沒有 `modelOverrideSource`。OpenClaw 將其視為使用者覆寫，因此明確的舊選擇不會被無聲地轉換為後備行為。
- **Cron 負載模型**：Cron 工作 `payload.model` / `--model` 是工作主要選項，而不是使用者會話覆寫。它使用配置的後備，除非工作提供 `payload.fallbacks`；`payload.fallbacks: []` 使 cron 執行處於嚴格模式。

自動切換主要模型的探測間隔為五分鐘，且不可設定。OpenClaw 會記住每個會話和主要模型最近的探測結果，因此不會在每次輪次中重試失敗的主要模型。當會話切換至備用模型時，OpenClaw 會發送可見的通知；當它返回至選定的主要模型時，會發送另一則通知；但在每次持續的備用輪次中不會重複該通知。

## 略過 Auth 失敗快取

根據預設，每個新的輪次都會保持現有的後援重試行為：OpenClaw
會再次嘗試每個已設定的後援候選項，包括最近因 `auth` 或 `auth_permanent` 而失敗的非主要候選項。

偏好隱藏這些重複驗證失敗的操作員可以選擇啟用：

```bash
OPENCLAW_FALLBACK_SKIP_TTL_MS=60000
```

啟用後，OpenClaw 在發生驗證類別的失敗後，會針對非主要後援候選項記錄一個記憶體內、會話範圍的略過標記。該標記以會話 ID、提供者和模型作為鍵值。主要候選項從不會被略過，因此明確的使用者模型選擇仍會顯示真實的驗證錯誤。此快取是程序本地的，並會在 Gateway 重新啟動時清除。

該值是以毫秒為單位的 TTL。`0` 或未設定的值會停用快取。
正值會被限制在 1 秒到 10 分鐘之間。

## 使用者可見的後援通知

當會話轉移到自動選取的後援時，OpenClaw 會在同一個回覆表面發送狀態通知：

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

當後續的偵測成功且會話返回選取的主要項目時，OpenClaw 會發送：

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

這些通知是操作訊息，而非助手內容。它們在每次狀態變更時傳送一次，包括在可行的情況下包含僅有副作用的輪次，但黏性後援輪次不會重複傳送。傳送會繞過正常的來源回覆抑制，該通知不會佔用執行緒通道的第一個助手回覆位置，並且會從文字轉語音和承諾提取中排除。

## 驗證儲存 (金鑰 + OAuth)

OpenClaw 對於 API 金鑰和 OAuth 權杖都使用 **驗證設定檔**。

- 祕密存在於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (舊版: `~/.openclaw/agent/auth-profiles.json`) 中。
- 執行時期的驗證路由狀態存在於 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 設定 `auth.profiles` / `auth.order` 僅包含 **中繼資料 + 路由** (不包含祕密)。
- 舊版僅供匯入的 OAuth 檔案：`~/.openclaw/credentials/oauth.json` (首次使用時會匯入至 `auth-profiles.json`)。

更多詳情：[OAuth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（對於某些供應商為 + `projectId`/`enterpriseUrl`）

## 設定檔 ID

OAuth 登入會建立不同的設定檔，以便多個帳戶可以共存。

- 預設值：當沒有電子郵件可用時為 `provider:default`。
- 使用電子郵件的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

設定檔位於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 之下。

## 輪替順序

當供應商有多個設定檔時，OpenClaw 會依照如下順序選擇：

<Steps>
  <Step title="明確設定">`auth.order[provider]`（如果已設定）。</Step>
  <Step title="已設定的設定檔">依供應商篩選的 `auth.profiles`。</Step>
  <Step title="已儲存的設定檔">該供應商在 `auth-profiles.json` 中的條目。</Step>
</Steps>

如果沒有設定明確的順序，OpenClaw 會使用循環順序：

- **主要鍵：**設定檔類型（**OAuth 優先於 API 金鑰**）。
- **次要鍵：**`usageStats.lastUsed`（每個類型中由最舊的開始）。
- **冷卻/已停用的設定檔**會移至末尾，並依照到期時間排序。

### 會話黏性（快取友好）

OpenClaw **會針對每個會話固定選定的驗證設定檔**以保持供應商快取溫熱。它**不會**在每次請求時輪替。固定的設定檔會重複使用直到：

- 會話被重置（`/new` / `/reset`）
- 完成一次壓縮（壓縮計數增加）
- 該設定檔處於冷卻/已停用狀態

透過 `/model …@<profileId>` 進行手動選擇會為該會話設定**使用者覆寫**，並且在開始新會話之前不會自動輪替。

<Note>自動釘選的設定檔（由會話路由器選擇）被視為一種「偏好」：它們會被首先嘗試，但在遇到速率限制或逾時時，OpenClaw 可能會切換到另一個設定檔。當原始設定檔再次可用時，新的執行可以再次優先選擇它，而無需變更選取的模型或執行時。使用者釘選的設定檔會保持鎖定於該設定檔；如果它失敗並且配置了模型備援，OpenClaw 將會移至下一個模型，而不是切換設定檔。</Note>

### OpenAI Codex 訂閱加上 API 金鑰備援

對於 OpenAI agent 模型，認證與執行時是分開的。`openai/gpt-*` 保留在 Codex 機制上，而認證則可以在 Codex 訂閱設定檔與 OpenAI API 金鑰備援之間輪替。

請使用 `auth.order.openai` 來設定面向使用者的順序：

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

請針對 ChatGPT/Codex OAuth 設定檔與 OpenAI API 金鑰設定檔使用 `openai:*`。當訂閱達到 Codex 使用限制時，OpenClaw 會在 Codex 提供時記錄確切的重設時間，嘗試下一個有序的認證設定檔，並讓執行保留在 Codex 機制內。一旦重設時間過去，訂閱設定檔便再次符合資格，下一次的自動選擇可以返回到它。

僅當您想為該會話強制使用單一帳戶/金鑰時，才使用使用者釘選的設定檔。使用者釘選的設定檔是有意設計得嚴格的，並不會無聲地跳到另一個設定檔。

## 冷卻期間

當設定檔因認證/速率限制錯誤（或看似速率限制的逾時）而失敗時，OpenClaw 會將其標記為冷卻並移至下一個設定檔。

<AccordionGroup>
  <Accordion title="歸入速率限制 / 逾時桶的內容">
    該速率限制桶的範圍比單純的 `429` 更廣：它還包括提供者訊息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及週期性使用視窗限制，例如 `weekly/monthly limit reached`。

    格式/無效請求錯誤通常是終結性的，因為重試相同的載荷會以相同的方式失敗，因此 OpenClaw 會顯示這些錯誤，而不是輪換身份驗證配置檔案。已知的重試修復路徑可以明確選擇加入：例如，Cloud Code Assist 工具呼叫 ID 驗證失敗會被清理，並透過 `allowFormatRetry` 政策重試一次。OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，被分類為逾時/故障轉移訊號。

    當來源符合已知的暫時性模式時，通用伺服器文字也可能落入該逾時桶中。例如，原始模型執行階段串流包裝器訊息 `An unknown error occurred` 對於每個提供者都被視為值得故障轉移，因為當提供者串流以 `stopReason: "aborted"` 或 `stopReason: "error"` 結束而沒有具體細節時，共用的模型執行階段會發出此訊息。帶有暫時性伺服器文字的 JSON `api_error` 載荷，例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`，也被視為值得故障轉移的逾時。

    OpenRouter 特定的通用上游文字（例如單純的 `Provider returned error`）僅在提供者上下文實際上是 OpenRouter 時才被視為逾時。通用內部故障轉移文字（例如 `LLM request failed with an unknown error.`）保持保守，並且本身不會觸發故障轉移。

  </Accordion>
  <Accordion title="SDK retry-after caps">
    某些供應商 SDK 可能在將控制權返回給 OpenClaw 之前休眠很長的 `Retry-After` 視窗。對於基於 Stainless 的 SDK（例如 Anthropic 和 OpenAI），OpenClaw 預設將 SDK 內部的 `retry-after-ms` / `retry-after` 等待時間上限設為 60 秒，並立即顯示較長的可重試回應，以便此故障轉移路徑能夠運作。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 調整或停用此上限；請參閱 [重試行為](/zh-Hant/concepts/retry)。
  </Accordion>
  <Accordion title="Model-scoped cooldowns">
    速率限制冷卻也可以是模型範圍的：

    - 當已知失敗的模型 ID 時，OpenClaw 會為速率限制失敗記錄 `cooldownModel`。
    - 當冷卻範圍針對不同的模型時，仍可嘗試同一供應商上的同級模型。
    - 帳單/停用視窗仍會在所有模型間封鎖整個設定檔。

  </Accordion>
</AccordionGroup>

冷卻使用指數退避：

- 1 分鐘
- 5 分鐘
- 25 分鐘
- 1 小時（上限）

狀態儲存在 `auth-state.json` 下的 `usageStats` 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## 帳單停用

計費/餘額失敗（例如「額度不足」/「餘額過低」）被視為值得故障轉移，但它們通常不是暫時性的。OpenClaw 不會進行短暫的冷卻，而是將該設定檔標記為 **已停用**（並進行較長的退避時間），然後輪替到下一個設定檔/提供商。

<Note>
並非每個帳單相關的回應都是 `402`，也並非每個 HTTP `402` 都會在此處處理。即使供應商返回 `401` 或 `403`，OpenClaw 仍會將明確的帳單文字保留在帳單通道中，但特定供應商的匹配器仍會限縮於擁有它們的供應商（例如 OpenRouter `403 Key limit exceeded`）。

同時，當訊息看起來可重試時（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`），暫時性的 `402` 使用量視窗和組織/工作區支出上限錯誤會被分類為 `rate_limit`。這些錯誤會保持在短暫冷卻/故障轉移路徑上，而不是長期的帳單停用路徑。

</Note>

狀態儲存在 `auth-state.json` 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

預設值：

- 帳單退避從 **5 小時** 開始，每次帳單失敗加倍，上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內沒有失敗（可設定），退避計數器會重置。
- 過載重試在模型回退之前允許 **1 次同供應商設定檔輪替**。
- 過載重試預設使用 **0 毫秒退避**。

## 模型回退

如果某個供應商的所有設定檔都失敗了，OpenClaw 會移動到 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪替的身分驗證失敗、速率限制和逾時（其他錯誤不會觸發故障轉移）。未提供足夠細節的供應商錯誤在故障轉移狀態下仍會被精確標記：`empty_response` 表示供應商未傳回可用的訊息或狀態，`no_error_details` 表示供應商明確傳回了 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始預覽，但尚未有分類器符合它。

過載和速率限制錯誤的處理比計費冷卻更積極。預設情況下，OpenClaw 允許一次同提供者的身分驗證設定檔重試，然後不等待直接切換到下一個設定的模型備援。提供者忙碌信號（例如 `ModelNotReadyException`）會歸入該過載分類。您可以使用 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 來調整此設定。

當執行從設定的預設主要、cron 任務主要、具有明確備援的代理主要，或自動選擇的備援覆寫開始時，OpenClaw 可以遍歷符合設定的備援鏈。沒有明確備援的代理主要和明確的使用者選擇（例如 `/model ollama/qwen3.5:27b`、模型選擇器 `sessions.patch` 或一次性 CLI 提供者/模型覆寫）是嚴格的：如果該提供者/模型無法連線或在產生回覆前失敗，OpenClaw 將回報失敗，而不是從不相關的備援進行回答。

### 候選鏈規則

OpenClaw 會從目前請求的 `provider/model` 以及設定的備援來建立候選清單。

<AccordionGroup>
  <Accordion title="規則">
    - 請求的模型永遠是第一個。
    - 顯式配置的後備模型會進行去重，但不會通過模型允許列表進行過濾。它們被視為操作員的顯式意圖。
    - 如果當前運行已經位於同一個供應商系列中的某個已配置後備模型上，OpenClaw 將繼續使用完整的配置鏈。
    - 當未提供顯式後備覆蓋時，即使請求的模型使用不同的供應商，也會在配置的主模型之前嘗試配置的後備模型。
    - 當未向後備運行器提供顯式後備覆蓋時，配置的主模型會被附加到末尾，以便在之前的候選者耗盡後，鏈條可以回到正常的默認模型。
    - 當調用者提供 `fallbacksOverride` 時，運行器將精確使用請求的模型加上該覆蓋列表。空列表會禁用模型後備，並防止將配置的主模型附加為隱藏的重試目標。

  </Accordion>
</AccordionGroup>

### 哪些錯誤會觸發後備

<Tabs>
  <Tab title="繼續處理">
    - 驗證失敗
    - 速率限制與冷卻耗盡
    - 過載/供應商忙碌錯誤
    - 形如逾時的故障轉移錯誤
    - 計費停用
    - `LiveSessionModelSwitchError`，此錯誤會被正規化為故障轉移路徑，以免過期的持久化模型導致外層重試迴圈
    - 當仍有剩餘候選時的其他未識別錯誤

  </Tab>
  <Tab title="不繼續處理">
    - 不屬於逾時/故障轉移形狀的明確中止
    - 應保留在壓縮/重試邏輯內的上下文溢位錯誤（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 當沒有剩餘候選時的最終未知錯誤

  </Tab>
</Tabs>

### 冷卻略過與探測行為

當供應商的所有驗證設定檔都已處於冷卻狀態時，OpenClaw 不會永久自動略過該供應商。它會針對每個候選做出決定：

<AccordionGroup>
  <Accordion title="依候選決定">
    - 持久性驗證失敗會立即略過整個供應商。
    - 計費停用通常會略過，但主要候選仍可在節流時進行探測，以便無需重新啟動即可復原。
    - 主要候選可能在接近冷卻到期時透過每供應商節流進行探測。
    - 當失敗看起來是暫時性時（`rate_limit`、`overloaded` 或未知），即使處於冷卻狀態，仍可嘗試同供應商的故障轉移同層模型。當速率限制以模型為範圍，且同層模型可能立即復原時，這點特別重要。
    - 暫時性冷卻探測在每次故障轉移執行中限制為每供應商一次，以免單一供應商阻礙跨供應商故障轉移。

  </Accordion>
</AccordionGroup>

## Session 覆寫與即時模型切換

Session 模型變更是共享狀態。啟用的 runner、`/model` 指令、壓縮/session 更新，以及即時 session 協調都會讀寫同一個 session 項目的部分內容。

這表示故障轉移重試必須與即時模型切換相互協調：

- 只有明確的使用者驅動模型變更才會標記待處理即時切換。這包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系統驅動的模型變更（例如故障切換輪替、心跳覆寫或合併）絕不會自行標記待處理即時切換。
- 使用者驅動的模型覆寫會被視為故障切換策略的精確選擇，因此無法連線的已選提供者會顯示為失敗，而不是被 `agents.defaults.model.fallbacks` 遮蔽。
- 在故障切換重試開始之前，回覆執行器會將選定的故障切換覆寫欄位保存到工作階段條目中。
- 自動故障切換覆寫在後續輪次中保持選中狀態，以免 OpenClaw 在每則訊息上都探測已知損壞的主要項。OpenClaw 會定期重新探測已設定的原始來源，並在它恢復時清除自動覆寫；`/new`、`/reset` 和 `sessions.reset` 會立即清除自動來源的覆寫。
- 使用者回覆會在每次狀態變更時宣告一次故障切換轉換和故障切換清除恢復。黏性故障切換輪次不會重複該通知。
- `/status` 會顯示選定的模型，並在故障切換狀態不同時顯示作用中的故障切換模型和原因。
- 即時工作階段協調偏好保存的工作階段覆寫，而非過期的執行時模型欄位。
- 如果即時切換錯誤指向作用中故障切換鏈中的較後候選項，OpenClaw 會直接跳躍至該選定模型，而不是先走訪不相關的候選項。
- 如果故障切換嘗試失敗，執行器僅會回滾它寫入的覆寫欄位，而且只有在這些欄位仍然符合該失敗候選項時才會回滾。

這可防止典型的競態條件：

<Steps>
  <Step title="主要項失敗">選定的主要模型失敗。</Step>
  <Step title="記憶體中選擇故障切換">在記憶體中選擇故障切換候選項。</Step>
  <Step title="工作階段儲存體仍顯示舊主要項">工作階段儲存體仍然反映舊的主要項。</Step>
  <Step title="即時協調讀取過期狀態">即時會話協調讀取過期的會話狀態。</Step>
  <Step title="重試回退">在故障轉移嘗試開始之前，重試會被回退到舊模型。</Step>
</Steps>

持久化的故障轉移覆蓋關閉了這個視窗，而狹窄的回滾則保持了較新的手動或運行時會話變更的完整性。

## 可觀測性與故障摘要

`runWithModelFallback(...)` 記錄了每次嘗試的詳細資訊，這些資訊用於提供日誌和面向使用者的冷卻訊息：

- 嘗試的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及類似的故障轉移原因）
- 可選狀態/代碼
- 人類可讀的錯誤摘要

結構化 `model_fallback_decision` 日誌還包含扁平 `fallbackStep*` 字段，當候選失敗、被跳過或後續故障轉移成功時。這些字段使嘗試的轉變顯式化（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），以便日誌和診斷匯出器即使在最終故障轉移也失敗時也能重建主要故障。

當每個候選都失敗時，OpenClaw 會拋出 `FallbackSummaryError`。外部回覆執行器可以使用它來構建更具體的訊息，例如「所有模型暫時受速率限制」，並在已知時包含最近的冷卻過期時間。

該冷卻摘要感知模型：

- 對於嘗試的提供商/模型鏈，將忽略無關的模型範圍速率限制
- 如果剩餘的區塊是匹配的模型範圍速率限制，OpenClaw 會報告仍阻塞該模型的最後一個匹配過期時間

## 相關配置

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

如需了解更廣泛的模型選擇與故障切換概覽，請參閱 [Models](/zh-Hant/concepts/models)。
