---
summary: "OpenClaw 如何輪替設定檔並在各模型之間進行故障轉移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障切換"
sidebarTitle: "模型故障切換"
---

OpenClaw 分兩個階段處理故障：

1. 在目前供應商內進行 **設定檔輪替**。
2. **模型故障轉移**至 `agents.defaults.model.fallbacks` 中的下一個模型。

本文件說明執行階段規則以及支援這些規則的資料。

## 執行流程

對於正常的文字運行，OpenClaw 會按以下順序評估候選模型：

<Steps>
  <Step title="解析會話狀態">解析目前作用中的會話模型和身分驗證設定檔偏好。</Step>
  <Step title="建構候選鏈">從目前選取的會話模型開始，依序接上 `agents.defaults.model.fallbacks` 來建構模型候選鏈；若執行是從覆寫開始，則以設定的主要模型作結。</Step>
  <Step title="嘗試目前的供應商">使用身分驗證設定檔輪替/冷卻規則嘗試目前的供應商。</Step>
  <Step title="遇可故障轉移錯誤時推進">若該供應商因可故障轉移錯誤而耗盡，則移至下一個模型候選。</Step>
  <Step title="保存故障轉移覆寫">在重試開始前先保存選定的故障轉移覆寫，以便其他會話讀取者能與執行器將要使用的供應商/模型保持一致。已保存的模型覆寫會被標記為 `modelOverrideSource: "auto"`。</Step>
  <Step title="失敗時精準還原">若故障轉移候選失敗，則僅在這些欄位仍與該失敗候選相符時，還原屬於故障轉移的會話覆寫欄位。</Step>
  <Step title="若耗盡則拋出 FallbackSummaryError">若所有候選皆失敗，則拋出 `FallbackSummaryError`，其中包含每次嘗試的細節，以及已知情況下最近的冷卻到期時間。</Step>
</Steps>

這是有意設計得比「儲存並還原整個會話」更狹隘。回覆執行器僅會保存其為故障轉移所擁有的模型選取欄位：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

這可以防止失敗的後援重試覆寫較新的不相關會話變更，例如在嘗試執行期間發生的手動 `/model` 變更或會話輪替更新。

## 驗證儲存 (金鑰 + OAuth)

OpenClaw 同時針對 API 金鑰和 OAuth 權杖使用 **驗證設定檔**。

- 機密資料存在於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中 (舊版：`~/.openclaw/agent/auth-profiles.json`)。
- 執行時期驗證路由狀態存在於 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 設定 `auth.profiles` / `auth.order` 僅包含 **中繼資料 + 路由** (無機密資料)。
- 舊版僅供匯入的 OAuth 檔案：`~/.openclaw/credentials/oauth.json` (於首次使用時匯入至 `auth-profiles.json`)。

更多細節：[OAuth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (部分提供者還包含 `projectId`/`enterpriseUrl`)

## 設定檔 ID

OAuth 登入會建立不同的設定檔，以便多個帳戶共存。

- 預設值：當無法取得電子郵件時為 `provider:default`。
- 含電子郵件的 OAuth：`provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔存在於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 之下。

## 輪替順序

當提供者擁有多個設定檔時，OpenClaw 會依照以下方式選擇順序：

<Steps>
  <Step title="明確設定">`auth.order[provider]` (若已設定)。</Step>
  <Step title="已設定的設定檔">依提供者篩選的 `auth.profiles`。</Step>
  <Step title="已儲存的設定檔">該提供者在 `auth-profiles.json` 中的項目。</Step>
</Steps>

若未設定明確順序，OpenClaw 會使用循環順序：

- **主要鍵：** 設定檔類型 (**OAuth 優於 API 金鑰**)。
- **次要鍵：** `usageStats.lastUsed` (在各類型中，最舊的優先)。
- **冷卻/停用的設定檔** 會移至最後，依到期時間排序 (最早到期的排前面)。

### 會話黏性 (有利快取)

OpenClaw **為每個會話固定選定的身份驗證設定檔**，以保持提供者快取處於熱狀態。它**不**會在每個請求時輪替。被固定的設定檔會一直重複使用，直到：

- 會話被重置 (`/new` / `/reset`)
- 完成一次壓縮 (壓縮計數增加)
- 該設定檔處於冷卻/停用狀態

透過 `/model …@<profileId>` 進行手動選擇會為該會話設定**使用者覆寫**，並且在開始新會話之前不會自動輪替。

<Note>自動固定的設定檔 (由會話路由器選擇) 被視為一種**偏好設定**：它們會被首先嘗試，但在速率限制/逾時時 OpenClaw 可能會輪替到另一個設定檔。使用者固定的設定檔會鎖定在該設定檔；如果它失敗並且配置了模型備援，OpenClaw 會移動到下一個模型，而不是切換設定檔。</Note>

### 為什麼 OAuth 可能會「看起來遺失」

如果您對同一個提供者同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非被固定，否則輪詢 可能會在訊息之間切換。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 進行固定，或
- 透過 `/model …` 使用每個會話的覆寫，並搭配設定檔覆寫 (當您的 UI/聊天介面支援時)。

## 冷卻

當設定檔由於身份驗證/速率限制錯誤 (或類似速率限制的逾時) 而失敗時，OpenClaw 會將其標記為冷卻並移至下一個設定檔。

<AccordionGroup>
  <Accordion title="歸入速率限制 / 逾時類別的內容">
    該速率限制類別的範圍比單純的 `429` 更廣：它還包含供應商訊息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及週期性使用量視窗限制，例如 `weekly/monthly limit reached`。

    格式/無效請求錯誤（例如 Cloud Code Assist 工具呼叫 ID 驗證失敗）被視為值得進行故障轉移並使用相同的冷卻時間。相容 OpenAI 的停止原因錯誤，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，被分類為逾時/故障轉移訊號。

    當來源符合已知的暫態模式時，通用伺服器文字也可能歸入該逾時類別。例如，單純的 pi-ai 串流包裝訊息 `An unknown error occurred` 對於每個供應商都被視為值得進行故障轉移，因為當供應商串流以 `stopReason: "aborted"` 或 `stopReason: "error"` 結束而沒有具體細節時，pi-ai 會發出此訊息。帶有暫態伺服器文字（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 載荷也被視為值得進行故障轉移的逾時。

    OpenRouter 特定的通用上游文字（例如單純的 `Provider returned error`）僅在供應商上下文實際上是 OpenRouter 時才被視為逾時。通用內部故障轉移文字（例如 `LLM request failed with an unknown error.`）保持保守，且不會自行觸發故障轉移。

  </Accordion>
  <Accordion title="SDK 重試之後上限">
    某些供應商 SDK 可能會在將控制權交還給 OpenClaw 之前休眠很長的 `Retry-After` 視窗。對於基於 Stainless 的 SDK（例如 Anthropic 和 OpenAI），OpenClaw 預設將 SDK 內部的 `retry-after-ms` / `retry-after` 等待上限設為 60 秒，並立即回傳較長的可重試回應，以便執行此故障轉移路徑。您可以使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 調整或停用此上限；請參閱[重試行為](/zh-Hant/concepts/retry)。
  </Accordion>
  <Accordion title="模型範圍冷卻">
    速率限制冷卻也可以限制在模型範圍內：

    - 當已知失敗的模型 ID 時，OpenClaw 會為速率限制失敗記錄 `cooldownModel`。
    - 當冷卻限制在不同模型時，同一供應商上的兄弟模型仍然可以嘗試。
    - 計費/停用視窗仍然會跨模型封鎖整個設定檔。

  </Accordion>
</AccordionGroup>

冷卻使用指數退避：

- 1 分鐘
- 5 分鐘
- 25 分鐘
- 1 小時 (上限)

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

## 計費停用

計費/額度失敗（例如「額度不足」/「信用餘額過低」）被視為值得故障轉移，但它們通常不是暫時性的。OpenClaw 不會使用短暫的冷卻時間，而是將設定檔標記為**已停用**（並具有較長的退避時間），並輪替到下一個設定檔/供應商。

<Note>
並非所有帳單相關的回應都是 `402`，也並非所有 HTTP `402` 都會在此處落地。即使提供者改為返回 `401` 或 `403`，OpenClaw 仍會將明確的帳單文字保留在帳單通道中，但特定於提供者的匹配器仍僅限於擁有它們的提供者（例如 OpenRouter `403 Key limit exceeded`）。

同時，暫時性的 `402` 使用量視窗和組織/工作區支出上限錯誤，在訊息看起來可重試時（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`），會被歸類為 `rate_limit`。這些錯誤會保持在短冷卻/故障轉移路徑上，而不是長期的帳單停用路徑。

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

- 帳單退避起始時間為 **5 小時**，每次帳單失敗加倍，上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內未失敗（可配置），退避計數器會重置。
- 過載重試允許在模型故障轉移之前進行 **1 次相同提供者的設定檔輪換**。
- 過載重試預設使用 **0 毫秒退避**。

## 模型故障轉移

如果提供者的所有設定檔都失敗，OpenClaw 會移至 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於認證失敗、速率限制和已耗盡設定檔輪換的超時（其他錯誤不會推進故障轉移）。未暴露足夠細節的提供者錯誤在故障轉移狀態下仍會被精確標記：`empty_response` 表示提供者未返回可用的訊息或狀態，`no_error_details` 表示提供者明確返回了 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始預覽但尚未有分類器匹配它。

過載和速率限制錯誤的處理比計費冷卻更積極。預設情況下，OpenClaw 允許一次同供應商的認證配置文件重試，然後無需等待即切換到下一個配置的模型回退。供應商繁忙信號（如 `ModelNotReadyException`）會歸入該過載分類。您可以透過 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 來調整此設定。

當執行以模型覆寫（hooks 或 CLI）開始時，在嘗試任何配置的回退後，回退仍會在 `agents.defaults.model.primary` 結束。

### 候選鏈規則

OpenClaw 根據當前請求的 `provider/model` 加上配置的回退來建構候選清單。

<AccordionGroup>
  <Accordion title="Rules">
    - 請求的模型始終排在第一位。 - 顯式配置的回退會經過去重處理，但不受模型允許清單過濾。它們被視為操作者的顯式意圖。 - 如果當前執行已位於同一供應商系列中的某個配置回退上，OpenClaw 將繼續使用完整的配置鏈。 - 如果當前執行使用的供應商與配置不同，且當前模型尚未屬於配置的回退鏈的一部分，OpenClaw 將不會附加來自其他供應商的不相關配置回退。 -
    當執行始於覆寫時，配置的主模型會被附加到末尾，以便在早期的候選選項耗盡後，鏈條可以恢復到正常的預設設定。
  </Accordion>
</AccordionGroup>

### 哪些錯誤會推進回退

<Tabs>
  <Tab title="Continues on">- 認證失敗 - 速率限制和冷卻耗盡 - 過載/供應商繁忙錯誤 - 逾時狀的故障轉移錯誤 - 計費停用 - `LiveSessionModelSwitchError`，它會被正規化為故障轉移路徑，以避免過時的持久化模型造成外部重試迴圈 - 當仍有剩餘候選時發生的其他無法辨識的錯誤</Tab>
  <Tab title="不繼續執行於">- 非逾時/故障轉移形狀的明確中止 - 應保留在壓縮/重試邏輯內的上下文溢位錯誤（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`） - 當沒有候選項剩餘時的最終未知錯誤</Tab>
</Tabs>

### 冷卻跳過與探測行為

當提供者的所有驗證設定檔都已處於冷卻狀態時，OpenClaw 不會永遠自動跳過該提供者。它會針對每個候選項做出決定：

<AccordionGroup>
  <Accordion title="每個候選項的決定">
    - 持續性的驗證失敗會立即跳過整個提供者。 - 帳單停用通常會跳過，但主要候選項仍可在節流時進行探測，以便在不重新啟動的情況下恢復。 - 主要候選項可能會在接近冷卻期滿時透過每個提供者的節流進行探測。 - 當故障看似暫時性時（`rate_limit`、`overloaded` 或未知），儘管處於冷卻狀態，仍可嘗試同提供者的故障轉移同層候選項。當速率限制僅限於特定模型且同層模型可能立即恢復時，這一點尤為重要。 -
    暫時性冷卻探測在每次故障轉移執行中限制為每個提供者一次，以免單一提供者阻礙跨提供者的故障轉移。
  </Accordion>
</AccordionGroup>

## 工作階段覆寫與即時模型切換

工作階段模型變更是共享狀態。活躍執行器、`/model` 指令、壓縮/工作階段更新，以及即時工作階段協調都會讀取或寫入同一工作階段項目的部分內容。

這意味著故障轉移重試必須與即時模型切換協調：

- 僅有明確的使用者驅動模型變更會標記待處理的即時切換。這包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系統驅動的模型變更（例如故障轉移輪替、心跳覆寫或壓縮）絕不會自行標記待處理的即時切換。
- 在故障轉移重試開始之前，回覆執行器會將選定的故障轉移覆寫欄位保存到工作階段項目中。
- 自動故障轉移覆寫會在後續輪次中保持選取狀態，以便 OpenClaw 不會在每則訊息中探測已知有問題的主要模型。`/new`、`/reset` 和 `sessions.reset` 會清除自動來源的覆寫，並將階段作業返回至設定的預設值。
- `/status` 會顯示選取的模型，並且當故障轉移狀態不同時，顯示作用中的故障轉移模型及原因。
- 即時階段作業協調偏好持續化的階段作業覆寫，而非過期的執行階段模型欄位。
- 如果即時切換錯誤指向作用中故障轉移鏈中的後續候選項，OpenClaw 會直接跳躍至該選取的模型，而不是先走訪不相關的候選項。
- 如果故障轉移嘗試失敗，執行器僅會還原其寫入的覆寫欄位，且僅在這些欄位仍符合該失敗候選項時進行。

這可防止典型的競爭條件：

<Steps>
  <Step title="主要模型失敗">選取的主要模型失敗。</Step>
  <Step title="在記憶體中選擇備援">在記憶體中選擇備援候選項。</Step>
  <Step title="階段作業儲存仍顯示舊的主要模型">階段作業儲存仍反映舊的主要模型。</Step>
  <Step title="即時協調讀取過期狀態">即時階段作業協調讀取過期的階段作業狀態。</Step>
  <Step title="重試被彈回">重試會在故障轉移嘗試開始之前被彈回至舊模型。</Step>
</Steps>

持續化的故障轉移覆寫封閉了該視窗，而精準的還原則能保持較新的手動或執行階段階段作業變更完好無損。

## 可觀測性與失敗摘要

`runWithModelFallback(...)` 會記錄每次嘗試的詳細資料，以饋送至記錄檔和使用者面向的冷卻訊息：

- 嘗試的提供者/模型
- 原因 (`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 及類似的故障轉移原因)
- 選用狀態/代碼
- 人類可讀的錯誤摘要

結構化 `model_fallback_decision` 日誌還包含扁平化的 `fallbackStep*` 欄位，當候選者失敗、被跳過，或後續的備援成功時。這些欄位明確標示了嘗試的轉換 (`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`)，以便日誌和診斷匯出器即使在最終備援也失敗的情況下，仍能重建主要失敗的原因。

當每個候選者都失敗時，OpenClaw 會拋出 `FallbackSummaryError`。外部回覆執行器可以使用它來建立更具體的訊息，例如「所有模型目前都受到速率限制」，並在已知時包含最近的冷卻到期時間。

該冷卻摘要具有模型感知能力：

- 對於嘗試的提供者/模型鏈，無關的模型範圍速率限制會被忽略
- 如果剩餘的阻擋是相符的模型範圍速率限制，OpenClaw 會回報最後一個仍阻擋該模型的相符到期時間

## 相關設定

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/zh-Hant/concepts/models) 以了解更廣泛的模型選擇和備援概覽。
