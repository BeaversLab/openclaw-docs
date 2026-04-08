---
summary: "OpenClaw 如何輪替設定檔並在各模型之間進行故障轉移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型故障轉移"
---

# 模型故障轉移

OpenClaw 分兩個階段處理故障：

1. 在目前供應商內進行 **設定檔輪替**。
2. **模型故障轉移** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

本文件說明執行階段規則以及支援這些規則的資料。

## 執行流程

對於正常的文字運行，OpenClaw 會按以下順序評估候選模型：

1. 目前選取的會話模型。
2. 已配置的 `agents.defaults.model.fallbacks`，按順序排列。
3. 當運行從覆寫開始時，最後配置的主要模型。

在每個候選模型內部，OpenClaw 會在嘗試下一個模型候選之前，先嘗試 auth-profile 容錯移轉。

高層級順序：

1. 解析現用會話模型和 auth-profile 偏好設定。
2. 建構模型候選鏈。
3. 使用 auth-profile 輪替/冷卻規則嘗試目前的供應商。
4. 如果該供應商因可容錯移轉的錯誤而耗盡，則移至下一個
   模型候選。
5. 在重試開始前持續保存選取的容錯移轉覆寫，以便其他
   會話讀取器能看到執行器即將使用的相同供應商/模型。
6. 如果容錯移轉候選失敗，則僅當它們仍與該失敗候選相符時，
   才回滾容錯移轉所擁有的會話覆寫欄位。
7. 如果每個候選都失敗，則拋出 `FallbackSummaryError`，其中包含每次嘗試的
   詳細資訊，以及在已知情況下最快的冷卻到期時間。

這是有意設計得比「儲存並還原整個會話」更狹窄。回覆執行器僅持續保存其用於容錯移轉的模型選擇欄位：

- `providerOverride`
- `modelOverride`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

這可以防止失敗的容錯移轉重試覆寫較新的不相關會話
變更，例如在嘗試執行期間發生的手動 `/model` 變更或會話輪替更新。

## Auth storage (keys + OAuth)

OpenClaw 對 API 金鑰和 OAuth 權杖都使用 **auth profiles**。

- 機密資訊儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (舊版: `~/.openclaw/agent/auth-profiles.json`)。
- 配置 `auth.profiles` / `auth.order` 僅為 **metadata + routing only** (無機密資訊)。
- 舊版僅匯入的 OAuth 檔案： `~/.openclaw/credentials/oauth.json` (首次使用時匯入至 `auth-profiles.json`)。

更多詳情： [/concepts/oauth](/en/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` （對於某些提供者為 + `projectId`/`enterpriseUrl`）

## 設定檔 ID

OAuth 登入會建立獨立的設定檔，以便多個帳戶可以共存。

- 預設值：當沒有可用電子郵件時為 `provider:default`。
- OAuth 含電子郵件：`provider:<email>` （例如 `google-antigravity:user@gmail.com`）。

設定檔儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## 輪替順序

當提供者有多個設定檔時，OpenClaw 會按以下方式選擇順序：

1. **明確設定**：`auth.order[provider]` （如果已設定）。
2. **已設定的設定檔**：依提供者篩選的 `auth.profiles`。
3. **已儲存的設定檔**：該提供者在 `auth-profiles.json` 中的項目。

如果沒有設定明確順序，OpenClaw 會使用輪詢 順序：

- **主鍵**：設定檔類型 （**OAuth 優於 API 金鑰**）。
- **次鍵**：`usageStats.lastUsed` （每種類型中最舊的優先）。
- **冷卻/停用的設定檔** 會移至末尾，並依最早過期的時間排序。

### 會話黏性

OpenClaw **為每個會話鎖定所選的驗證設定檔** 以保持提供者的快取溫熱。
它**不會**在每個請求時輪替。鎖定的設定檔會重複使用，直到：

- 會話被重置 （`/new` / `/reset`）
- 完成壓縮 （壓縮計數增加）
- 該設定檔處於冷卻/停用狀態

透過 `/model …@<profileId>` 進行手動選擇會為該會話設定 **使用者覆寫**
並且直到新會話開始前不會自動輪替。

自動鎖定的設定檔 （由會話路由器選擇） 被視為一種 **偏好設定**：
它們會被優先嘗試，但在速率限制/逾時時 OpenClaw 可能會輪替到其他設定檔。
使用者鎖定的設定檔會保持鎖定；如果該設定檔失敗且已設定模型備援，
OpenClaw 會切換到下一個模型而不是切換設定檔。

### 為什麼 OAuth 可能「看起來不見了」

如果您對同一個提供者同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非鎖定設定檔，否則輪詢可能會在訊息之間切換使用。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 鎖定，或者
- 當您的 UI/聊天介面支援時，請使用 `/model …` 進行每個工作階段的覆寫，並搭配設定檔覆寫。

## 冷卻期

當設定檔因為驗證/速率限制錯誤（或看似速率限制的超時）而失敗時，OpenClaw 會將其標記為冷卻狀態並移至下一個設定檔。
該速率限制範圍比純粹的 `429` 更廣：它還包含供應商訊息，例如 `Too many concurrent requests`、`ThrottlingException`、
`concurrency limit reached`、`workers_ai ... quota limit exceeded`、
`throttled`、`resource exhausted`，以及週期性使用視窗限制，例如 `weekly/monthly limit reached`。
格式/無效請求錯誤（例如 Cloud Code Assist 工具呼叫 ID 驗證失敗）被視為值得進行失效切換的錯誤，並使用相同的冷卻期。
與 OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error` 被分類為超時/失效切換訊號。
當來源符合已知的暫態模式時，供應商範圍的通用伺服器文字也可能落入該超時區塊。例如，當 Anthropic 的純 `An unknown error occurred` 和 JSON `api_error` 載荷中包含暫態伺服器文字（例如 `internal server error`、`unknown error, 520`、`upstream error`
或 `backend error`）時，會被視為值得進行失效切換的超時。OpenRouter 特定的通用上游文字（例如純 `Provider returned error`）僅在供應商內容實際為 OpenRouter 時才被視為超時。通用的內部後備文字（例如 `LLM request failed with an unknown error.`）則保持保守，單獨出現時不會觸發失效切換。

速率限制冷卻期也可以限定於特定模型：

- 當失敗的模型 ID 已知時，OpenClaw 會針對速率限制失敗記錄 `cooldownModel`。
- 當冷卻範圍限定於不同模型時，仍然可以嘗試同一供應商下的兄弟模型。
- 計費/停用視窗仍然會在所有模型間阻擋整個設定檔。

冷卻期使用指數退避：

- 1 分鐘
- 5 分鐘
- 25 分鐘
- 1 小時 (上限)

狀態儲存在 `auth-profiles.json` 中的 `usageStats` 下：

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

帳單/額度失敗（例如「額度不足」/「餘額過低」）被視為值得進行容錯移轉，但它們通常不是暫時性的。與短暫冷卻不同，OpenClaw 會將該設定檔標記為**已停用**（具有較長的退避時間），並輪替到下一個設定檔/提供商。

並非每個帳單形式的回應都是 `402`，也並非每個 HTTP `402` 都會歸類至此。即使提供商改回傳 `401` 或 `403`，OpenClaw 仍會將明確的帳單文字保留在帳單通道中，但特定於提供商的匹配器仍會僅限於擁有它們的提供商（例如，當訊息看起來可重試時（例如 `weekly usage limit exhausted`，`daily
limit reached, resets tomorrow`, or `organization spending limit exceeded`），OpenRouter 的 `403 Key limit
exceeded`). Meanwhile temporary `402` 使用視窗以及
組織/工作區支出限制錯誤會被分類為 `rate_limit`）。
這些會保留在短暫冷卻/容錯移轉路徑上，而不是長期的帳單停用路徑。

狀態儲存在 `auth-profiles.json` 中：

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

- 帳單退避從 **5 小時** 開始，每次帳單失敗加倍，並上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內未失敗（可配置），退避計數器會重置。
- 超載重試在模型回退之前允許 **1 次相同提供商的設定檔輪替**。
- 超載重試預設使用 **0 毫秒退避**。

## 模型回退

如果提供商的所有設定檔都失敗，OpenClaw 會移至 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪替的身分驗證失敗、速率限制和
逾時（其他錯誤不會推進回退）。

過載和速率限制錯誤比計費冷卻處理得更積極。預設情況下，OpenClaw 允許一次同供應商的驗證設定檔重試，然後不等待就切換到下一個設定的模型備援。供應商忙碌訊號，例如 `ModelNotReadyException`，會落入該過載分類中。使用 `auth.cooldowns.overloadedProfileRotations`、
`auth.cooldowns.overloadedBackoffMs` 和
`auth.cooldowns.rateLimitedProfileRotations` 進行調整。

當執行以模型覆寫（hooks 或 CLI）開始時，在嘗試任何設定的備援後，備援仍會結束於
`agents.defaults.model.primary`。

### 候選鏈規則

OpenClaw 根據目前請求的 `provider/model`
加上設定的備援來建構候選清單。

規則：

- 請求的模型始終排在第一位。
- 明確設定的備援會進行重複資料刪除，但不會根據模型允許清單進行過濾。它們被視為明確的操作員意圖。
- 如果目前執行已經在相同供應商家族中的設定備援上，OpenClaw 會繼續使用完整的設定鏈。
- 如果目前執行是在與設定不同的供應商上，且該目前模型尚未屬於設定備援鏈的一部分，OpenClaw 不會附加來自其他供應商的不相關設定備援。
- 當執行是從覆蓋啟動時，設定的主要模型會附加在末尾，以便在較早的候選者耗盡後，鏈可以恢復到正常的預設值。

### 哪些錯誤會推進備援

模型備援在以下情況繼續：

- 驗證失敗
- 速率限制和冷卻耗盡
- 過載/供應商忙碌錯誤
- 超時類型的備援錯誤
- 計費停用
- `LiveSessionModelSwitchError`，這會被正規化為備援路徑，以便過時的持久化模型不會造成外部重試迴圈
- 當仍有剩餘候選者時的其他無法辨識錯誤

模型回退不會繼續進行：

- 非逾時/容錯形狀的明確中止
- 應保留在壓縮/重試邏輯內的上下文溢出錯誤
  （例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`）
- 當沒有剩餘候選項時的最終未知錯誤

### 冷卻跳過與探測行為

當提供商的每個身份驗證配置檔案都處於冷卻狀態時，OpenClaw 不會
永久自動跳過該提供商。它會針對每個候選項做出決定：

- 持續的身份驗證失敗會立即跳過整個提供商。
- 計費停用通常會跳過，但在限流的情況下仍可探測主要候選項，
  因此無需重新啟動即可恢復。
- 可以在接近冷卻到期時，透過針對每個提供商的限流來探測主要候選項。
- 當失敗看起來是暫時性（`rate_limit`、`overloaded` 或未知）時，儘管處於冷卻狀態，仍可嘗試同一提供商的故障轉移同級項。這在速率限制特定於模型且同級模型可能仍能立即恢復的情況下尤為重要。
- 暫時性冷卻探測在每次故障轉移運行中限制為每個提供商一次，
  以免單一提供商阻塞跨提供商的故障轉移。

## 會話覆寫與即時模型切換

會話模型變更是共享狀態。活躍的執行器、`/model` 指令、
壓縮/會話更新以及即時會話協調都會讀取或寫入
同一會話項目的部分內容。

這意味著故障轉移重試必須與即時模型切換協調：

- 僅當由使用者主動發起的模型變更才會標記待處理的即時切換。
  這包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系統驅動的模型變更（例如故障轉移輪替、心跳覆寫
  或壓縮）絕不會自行標記待處理的即時切換。
- 在故障轉移重試開始之前，回覆執行器會將選定的
  故障轉移覆寫欄位持久化至會話項目。
- 即時會話協調優先使用已持久化的會話覆寫，而非過時的
  執行時模型欄位。
- 如果嘗試失敗，Runner 會僅回滾它所寫入的覆蓋欄位，
  且僅在這些欄位仍然符合該失敗候選時才進行。

這避免了典型的競態條件（race condition）：

1. 主要選項失敗。
2. 在記憶體中選擇了後備候選。
3. Session 儲存仍顯示舊的主要選項。
4. 即時 Session 協調讀取了過時的 Session 狀態。
5. 重試會在後備嘗試開始之前被
   重置回舊的模型。

持久化的後備覆蓋填補了這個缺口，而精確的回滾
則保留了較新的人工或執行時期 Session 變更。

## 可觀測性與失敗摘要

`runWithModelFallback(...)` 記錄每次嘗試的細節，這些細節會匯入日誌並
提供給使用者的冷卻訊息：

- 嘗試的供應商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found`，以及
  類似的故障轉移原因）
- 選用狀態/代碼
- 人類可讀的錯誤摘要

當所有候選都失敗時，OpenClaw 會拋出 `FallbackSummaryError`。外層
的回覆 Runner 可以利用它來建構更具體的訊息，例如「所有模型
目前皆受速率限制」，並在知道時包含最近的冷卻到期時間。

該冷卻摘要是感知模型的（model-aware）：

- 針對嘗試過的
  供應商/模型鏈，不相關的模型範圍速率限制會被忽略
- 如果剩餘的封鎖是相符的模型範圍速率限制，OpenClaw
  會回報仍封鎖該模型的最後一個相符到期時間

## 相關設定

請參閱 [Gateway configuration](/en/gateway/configuration) 瞭解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/en/concepts/models) 以了解更廣泛的模型選擇與故障轉移概覽。
