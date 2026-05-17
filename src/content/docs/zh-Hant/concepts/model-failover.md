---
summary: "OpenClaw 如何輪替驗證設定檔並在不同模型之間進行故障轉移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障轉移"
sidebarTitle: "模型故障轉移"
---

OpenClaw 分兩個階段處理故障：

1. 在目前供應商內進行 **設定檔輪替**。
2. **模型故障轉移** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

本文件說明執行階段規則以及支援這些規則的資料。

## 執行流程

對於正常的文字運行，OpenClaw 會按以下順序評估候選模型：

<Steps>
  <Step title="解析會話狀態">解析活躍的會話模型和驗證設定檔偏好。</Step>
  <Step title="建構候選鏈">根據當前模型選擇和該選擇來源的故障轉移策略，建構模型候選鏈。設定的預設值、Cron 作業主要模型和自動選擇的後備模型可以使用設定的後備機制；明確的使用者會話選擇則是嚴格的。</Step>
  <Step title="嘗試當前的提供者">使用驗證設定檔輪替/冷卻規則嘗試當前的提供者。</Step>
  <Step title="遇到可故障轉移的錯誤時前進">如果該提供者因可故障轉移的錯誤而耗盡，則移至下一個模型候選。</Step>
  <Step title="持久化故障轉移覆寫">在重試開始前持久化選定的故障轉移覆寫，以便其他會話讀取器能看到執行者即將使用的相同提供者/模型。持久化的模型覆寫會標記為 `modelOverrideSource: "auto"`。</Step>
  <Step title="失敗時精準回滾">如果故障轉移候選失敗，則僅在會話覆寫欄位仍符合該失敗候選時，回滾由故障轉移擁有的會話覆寫欄位。</Step>
  <Step title="若耗盡則拋出 FallbackSummaryError">如果所有候選都失敗，則拋出 `FallbackSummaryError`，其中包含每次嘗試的細節，若已知則包含最近的冷卻過期時間。</Step>
</Steps>

這是有意設計得比「儲存並還原整個會話」更狹隘。回覆執行器僅會保存其為故障轉移所擁有的模型選取欄位：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

這可以防止失敗的後援重試覆寫較新的不相關會話變更，例如在嘗試執行期間發生的手動 `/model` 變更或會話輪替更新。

## 選擇來源策略

OpenClaw 將選擇的提供者/模型與選擇原因分開。該來源控制是否允許故障轉移鏈：

- **設定的預設值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent primary**: `agents.list[].model` 是嚴格的，除非該 agent 模型物件包含其自己的 `fallbacks`。使用 `fallbacks: []` 使嚴格行為顯式化，或提供非空列表以使該 agent 加入模型故障轉移。
- **Auto fallback override**: 運行時故障轉移在重試之前會寫入 `providerOverride`、`modelOverride`、`modelOverrideSource: "auto"` 以及所選的原始模型。該自動覆蓋可以繼續沿著配置的故障轉移鏈條進行，並且會由 `/new`、`/reset` 和 `sessions.reset` 清除。當其來源不再匹配當前配置的預設值時，沒有明確 `heartbeat.model` 的心跳運行也會清除直接的自動覆蓋。
- **User session override**: `/model`、模型選擇器、`session_status(model=...)` 和 `sessions.patch` 會寫入 `modelOverrideSource: "user"`。這是一個精確的會話選擇。如果所選的提供者/模型在產生回覆之前失敗，OpenClaw 將報告失敗，而不是從無關的配置故障轉移中回答。
- **Legacy session override**: 較舊的會話條目可能具有 `modelOverride` 而沒有 `modelOverrideSource`。OpenClaw 將這些視為使用者覆蓋，因此明確的舊選擇不會被靜默轉換為故障轉移行為。
- **Cron payload model**: cron 任務 `payload.model` / `--model` 是任務主要項，而不是使用者會話覆蓋。它使用配置的故障轉移，除非任務提供 `payload.fallbacks`；`payload.fallbacks: []` 使 cron 運行變為嚴格模式。

## Auth storage (keys + OAuth)

OpenClaw 對於 API 金鑰和 OAuth 權杖都使用 **auth profiles**。

- Secrets 存儲在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（舊版：`~/.openclaw/agent/auth-profiles.json`）。
- 運行時 auth-routing 狀態存儲在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` 僅是 **元數據 + 路由**（不含 secrets）。
- 舊版僅導入的 OAuth 檔案：`~/.openclaw/credentials/oauth.json`（首次使用時導入到 `auth-profiles.json`）。

更多詳情：[OAuth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` 對於部分供應商)

## Profile IDs

OAuth 登入會建立不同的設定檔，以便多個帳戶可以共存。

- 預設：當沒有可用的電子郵件時為 `provider:default`。
- 帶有電子郵件的 OAuth：`provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔存在於 `profiles` 下的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

## Rotation order

當提供商有多個設定檔時，OpenClaw 會像這樣選擇順序：

<Steps>
  <Step title="明確設定">`auth.order[provider]` (如果設定的話)。</Step>
  <Step title="已設定的設定檔">依供應商篩選的 `auth.profiles`。</Step>
  <Step title="已儲存的設定檔">該供應商在 `auth-profiles.json` 中的項目。</Step>
</Steps>

如果未設定明確順序，OpenClaw 會使用輪詢順序：

- **主鍵：** 設定檔類型 (**OAuth 優先於 API 金鑰**)。
- **次要金鑰：** `usageStats.lastUsed` (每種類型中最舊的優先)。
- **冷卻/已停用的設定檔** 會移至最後，並依最快到期時間排序。

### Session stickiness (cache-friendly)

OpenClaw **會為每個會話鎖定選定的驗證設定檔** 以保持供應商快取溫熱。它**不會**在每個請求時輪替。鎖定的設定檔會重複使用，直到：

- 階段作業會重置 (`/new` / `/reset`)
- 完成壓縮 (壓縮計數遞增)
- 該設定檔處於冷卻/已停用狀態

透過 `/model …@<profileId>` 進行的手動選擇會為該階段作業設定**使用者覆寫**，並且在開始新的階段作業之前不會自動輪替。

<Note>自動釘選的設定檔 (由階段作業路由器選取) 被視為一種**偏好設定**：它們會被優先嘗試，但在速率限制/逾時時 OpenClaw 可能會輪替到另一個設定檔。當原始設定檔再次變為可用時，新的執行可以再次優先選用它，而無需變更選取的模型或執行時期。使用者釘選的設定檔會保持鎖定於該設定檔；如果它失敗且設定了模型故障轉移，OpenClaw 將會移至下一個模型，而不是切換設定檔。</Note>

### OpenAI Codex 訂閱加上 API 金鑰備份

對於 OpenAI 代理程式模型，驗證和執行時期是分開的。`openai/gpt-*` 保持在
Codex 線路上，而驗證可以在 Codex 訂閱設定檔和
OpenAI API 金鑰備份之間輪替。

使用 `auth.order.openai` 作為面向使用者的順序：

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

現有的 Codex 訂閱設定檔可能仍會使用舊版的 `openai-codex:*` 設定檔 ID。有序的 API 金鑰備份可以是一般的 `openai:*` API 金鑰設定檔。當訂閱達到 Codex 使用量限制時，OpenClaw 會在 Codex 提供時記錄確切的重設時間，嘗試下一個有序的驗證設定檔，並保持執行在 Codex 結構內。一旦重設時間過去，訂閱設定檔將再次符合資格，且下一次自動選取可以回到該設定檔。

僅當您想要強制該工作階段使用特定帳戶/金鑰時，才使用使用者固定的設定檔。使用者固定的設定檔被設計為嚴格模式，且不會無聲地跳躍至另一個設定檔。

## 冷卻期間

當設定檔因驗證/速率限制錯誤（或看似速率限制的超時）而失敗時，OpenClaw 會將其標記為冷卻中並移至下一個設定檔。

<AccordionGroup>
  <Accordion title="什麼情況會被歸類為速率限制 / 超時錯誤">
    該速率限制分類的範圍比單純的 `429` 更廣：它還包含供應商訊息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及週期性的使用視窗限制，例如 `weekly/monthly limit reached`。

    格式/無效請求錯誤通常是終止性的，因為重試相同的 payload 會以相同的方式失敗，因此 OpenClaw 會顯示這些錯誤，而不是輪換認證設定檔。已知的重試修復路徑可以明確選擇加入：例如，Cloud Code Assist 工具呼叫 ID 驗證失敗會被清理，並透過 `allowFormatRetry` 政策重試一次。OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，會被歸類為超時/故障轉移訊號。

    當來源符合已知的暫態模式時，通用的伺服器文字也可能落入該超時分類。例如，單純的 pi-ai 串流包裝訊息 `An unknown error occurred` 對於每個供應商都被視為值得進行故障轉移，因為當供應商串流以 `stopReason: "aborted"` 或 `stopReason: "error"` 結束而沒有具體細節時，pi-ai 會發出此訊息。包含暫態伺服器文字的 JSON `api_error` payload，例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`，也會被視為值得進行故障轉移的超時。

    OpenRouter 特定的通用上游文字，例如單純的 `Provider returned error`，僅當供應商上下文實際上是 OpenRouter 時才會被視為超時。通用的內部故障轉移文字，例如 `LLM request failed with an unknown error.`，則保持保守態度，不會自行觸發故障轉移。

  </Accordion>
  <Accordion title="SDK retry-after 上限">
    某些供應商 SDK 可能會在將控制權交還給 OpenClaw 之前睡眠一段很長的 `Retry-After` 視窗。對於基於 Stainless 的 SDK（例如 Anthropic 和 OpenAI），OpenClaw 預設將 SDK 內部的 `retry-after-ms` / `retry-after` 等待上限設為 60 秒，並立即顯示較長的可重試回應，以便執行此容錯移轉路徑。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 調整或停用該上限；請參閱 [重試行為](/zh-Hant/concepts/retry)。
  </Accordion>
  <Accordion title="模型範圍冷卻">
    速率限制冷卻也可以是模型範圍的：

    - 當失敗的模型 ID 已知時，OpenClaw 會針對速率限制失敗記錄 `cooldownModel`。
    - 當冷卻範圍限於不同的模型時，仍可嘗試同一供應商上的同級模型。
    - 計費/停用視窗仍會在模型之間封鎖整個設定檔。

  </Accordion>
</AccordionGroup>

冷卻使用指數退避：

- 1 分鐘
- 5 分鐘
- 25 分鐘
- 1 小時（上限）

狀態儲存在 `auth-state.json` 中的 `usageStats` 下：

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

## 計費停用

計費/信用額度失敗（例如「餘額不足」/「信用餘額過低」）被視為可容錯移轉的條件，但它們通常不是暫時性的。與其使用短暫的冷卻時間，OpenClaw 會將設定檔標記為**已停用**（並具有較長的退避時間），並輪替至下一個設定檔/供應商。

<Note>
並非所有帳單相關的回應都是 `402`，也並非所有 HTTP `402` 都會落在這裡。即使供應商改為傳回 `401` 或 `403`，OpenClaw 仍會將明確的帳單文字保留在帳單通道中，但特定供應商的匹配器仍僅限於該供應商（例如 OpenRouter `403 Key limit exceeded`）。

同時，當暫時性的 `402` 使用量視窗和組織/工作空間花費上限錯誤看起來可重試時（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`），它們會被歸類為 `rate_limit`。這些錯誤會保持在短暫冷卻/故障切換路徑，而不是長期的帳單停用路徑。

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
- 如果設定檔在 **24 小時** 內未失敗，退避計數器會重置（可設定）。
- 過載重試允許在模型故障切換之前進行 **1 次相同供應商的設定檔輪換**。
- 過載重試預設使用 **0 毫秒退避**。

## 模型故障切換

如果某個供應商的所有設定檔都失敗，OpenClaw 會移至 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪換的身分驗證失敗、速率限制和逾時（其他錯誤不會推進故障切換）。未揭露足夠細節的供應商錯誤在故障切換狀態下仍會被精確標記：`empty_response` 表示供應商未傳回可用的訊息或狀態，`no_error_details` 表示供應商明確傳回 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始預覽，但尚未有分類器與其匹配。

超載和速率限制錯誤的處理比帳單冷卻更積極。預設情況下，OpenClaw 允許一次相同供應商的身分驗證配置重試，然後無需等待即切換到下一個配置的模型備援。供應商忙碌訊號（例如 `ModelNotReadyException`）歸類於該超載桶中。您可以使用 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 進行調整。

當執行從配置的預設主要模型、Cron 作業主要模型、具有明確備援的代理主要模型，或自動選擇的備援覆寫啟動時，OpenClaw 可以遍歷符合配置的備援鏈。沒有明確備援的代理主要模型和明確的使用者選擇（例如 `/model ollama/qwen3.5:27b`、模型選擇器 `sessions.patch`，或一次性 CLI 供應商/模型覆寫）是嚴格的：如果該供應商/模型無法連線或在產生回覆之前失敗，OpenClaw 將報告失敗，而不是使用不相關的備援來回答。

### 候選鏈規則

OpenClaw 根據目前請求的 `provider/model` 加上配置的備援來建立候選清單。

<AccordionGroup>
  <Accordion title="Rules">
    - 請求的模型始終排在第一位。
    - 明確配置的備援會進行去重，但不會根據模型允許清單進行篩選。它們被視為操作員的明確意圖。
    - 如果目前的執行已經位於同一供應商系列中配置的備援上，OpenClaw 將繼續使用完整的配置鏈。
    - 當未提供明確的備援覆寫時，即使請求的模型使用不同的供應商，也會在配置的主要模型之前嘗試配置的備援。
    - 當未向備援執行器提供明確的備援覆寫時，配置的主要模型會附加在末尾，以便一旦早期候選耗盡，鏈可以沉降回正常的預設值。
    - 當呼叫者提供 `fallbacksOverride` 時，執行器將精確使用請求的模型加上該覆寫清單。空清單會停用模型備援，並防止配置的主要模型被附加為隱藏的重試目標。

  </Accordion>
</AccordionGroup>

### 哪些錯誤會推進備援

<Tabs>
  <Tab title="續接至">
    - 身份驗證失敗
    - 速率限制與冷卻耗盡
    - 過載/供應商忙碌錯誤
    - 逾時型態的故障轉移錯誤
    - 帳單停用
    - `LiveSessionModelSwitchError`，此錯誤會被正規化為故障轉移路徑，以免過時的持久化模型產生外層重試迴圈
    - 當仍有剩餘候選項時的其他未識別錯誤

  </Tab>
  <Tab title="不續接至">
    - 非逾時/故障轉移型態的明確中止
    - 應保留在壓縮/重試邏輯內的內容溢位錯誤（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 當無候選項時的最終未知錯誤

  </Tab>
</Tabs>

### 略過冷卻與探測行為

當某供應商的所有身分驗證設定檔皆已處於冷卻狀態時，OpenClaw 不會永久自動略過該供應商。它會針對每個候選項進行決策：

<AccordionGroup>
  <Accordion title="針對候選項的決策">
    - 持續性身分驗證失敗會立即略過整個供應商。
    - 帳單停用通常會被略過，但主要候選項仍可在節流時進行探測，以便在不重新啟動的情況下恢復。
    - 主要候選項可在接近冷卻到期時進行探測，並搭配供應商層級的節流。
    - 當失敗看似暫時性時（`rate_limit`、`overloaded` 或未知），儘管處於冷卻狀態，仍可嘗試同供應商的故障轉移同層項目。當速率限制僅限於特定模型且同層模型可立即恢復時，這點尤為重要。
    - 暫時性冷卻探測限制為每次故障轉移執行時每個供應商僅限一次，以免單一供應商延宕跨供應商的故障轉移。

  </Accordion>
</AccordionGroup>

## 會話覆寫與即時模型切換

會話模型變更是共享狀態。執行中的 runner、`/model` 指令、壓縮/會話更新以及即時會話協調，都會讀取或寫入同一個會話項目的部分內容。

這意味著故障轉移重試必須與即時模型切換協調：

- 只有明確的使用者驅動模型變更才會標示待處理的即時切換。這包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系統驅動的模型變更（例如故障轉移輪替、心跳覆寫或壓縮）絕不會自行標示待處理的即時切換。
- 使用者驅動的模型覆寫會被視為故障轉移策略的精確選擇，因此無法連線的已選提供者會顯示為錯誤，而不是被 `agents.defaults.model.fallbacks` 遮蔽。
- 在故障轉移重試開始之前，回覆執行器會將選定的故障轉移覆寫欄位保存至會話條目。
- 自動故障轉移覆寫會在後續輪次中保持選取狀態，以免 OpenClaw 在每則訊息中探測已知錯誤的主要提供者。`/new`、`/reset` 和 `sessions.reset` 會清除自動來源的覆寫，並將會話還原為設定的預設值。
- `/status` 會顯示選定的模型，並在故障轉移狀態不同時，顯示作用中的故障轉移模型及原因。
- 即時會話協調會優先採用保存的會話覆寫，而非過時的執行時期模型欄位。
- 如果即時切換錯誤指向作用中故障轉移鏈中的後續候選者，OpenClaw 會直接跳躍至該選定的模型，而不是先瀏覽不相關的候選者。
- 如果故障轉移嘗試失敗，執行器只會回復它寫入的覆寫欄位，且僅在這些欄位仍符合該失敗候選者時才回復。

這可防止典型的競態情形：

<Steps>
  <Step title="主要提供者失敗">選定的主要模型失敗。</Step>
  <Step title="在記憶體中選擇故障轉移">在記憶體中選擇故障轉移候選者。</Step>
  <Step title="會話儲存仍顯示舊的主要提供者">會話儲存仍反映舊的主要提供者。</Step>
  <Step title="即時協調讀取過時狀態">即時會話協調會讀取過時的會話狀態。</Step>
  <Step title="重試已回彈">在開始故障轉移嘗試之前，重試會回彈至舊模型。</Step>
</Steps>

持久化的故障轉移覆蓋封閉了該窗口，而狹義的回滾則保持了較新的手動或運行時會話更改完整無缺。

## 可觀測性與故障摘要

`runWithModelFallback(...)` 記錄了每次嘗試的細節，這些細節用於提供日誌和使用者面臨的冷卻訊息：

- 嘗試的供應商/模型
- 原因 (`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及類似的故障轉移原因)
- 可選的狀態/代碼
- 人類可讀的錯誤摘要

結構化 `model_fallback_decision` 日誌還包含扁平的 `fallbackStep*` 欄位，當候選者失敗、被跳過或後續故障轉移成功時。這些欄位使嘗試的轉換顯式化 (`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`)，以便日誌和診斷匯出器即使在終端故障轉移也失敗時也能重建主要故障。

當每個候選者都失敗時，OpenClaw 會拋出 `FallbackSummaryError`。外部回覆執行器可以使用它來構建更具體的訊息，例如「所有模型暫時受到速率限制」，並在已知情況下包含最近的冷卻到期時間。

該冷卻摘要具有模型感知能力：

- 對於嘗試的供應商/模型鏈，會忽略不相關的模型範圍速率限制
- 如果剩餘的阻塞性質是匹配的模型範圍速率限制，OpenClaw 會報告仍然阻擋該模型的最後一個匹配到期時間

## 相關配置

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [模型](/zh-Hant/concepts/models) 以了解更廣泛的模型選擇和故障轉移概覽。
