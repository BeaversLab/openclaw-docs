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
- 執行階段授權路由狀態儲存於 `~/.openclaw/agents/<agentId>/agent/auth-state.json`。
- 設定 `auth.profiles` / `auth.order` 僅為 **中繼資料 + 路由用途**（不含機密）。
- 舊版僅供匯入的 OAuth 檔案：`~/.openclaw/credentials/oauth.json`（首次使用時會匯入至 `auth-profiles.json`）。

更多細節：[/concepts/oauth](/en/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（部分供應商需提供 `projectId`/`enterpriseUrl`）

## 設定檔 ID

OAuth 登入會建立獨立的設定檔，以便多個帳戶可以共存。

- 預設：當無電子郵件可用時為 `provider:default`。
- 含電子郵件的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

設定檔儲存於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## 輪替順序

當供應商有多個設定檔時，OpenClaw 會依此方式選擇順序：

1. **明確設定**：`auth.order[provider]`（若已設定）。
2. **已設定的設定檔**：經供應商篩選後的 `auth.profiles`。
3. **已儲存的設定檔**：`auth-profiles.json` 中該供應商的項目。

若未設定明確順序，OpenClaw 會使用輪替順序：

- **主要鍵：** 設定檔類型（**OAuth 優於 API 金鑰**）。
- **次要鍵：** `usageStats.lastUsed`（各類型內由舊至新）。
- **冷卻/停用的設定檔** 會移至末尾，並依最快過期的時間排序。

### 會話粘滯性（快取友善）

OpenClaw 會 **針對每個會話鎖定所選的授權設定檔**，以讓供應商快取保持熱度。
它 **不會** 在每次請求時輪替。鎖定的設定檔會被重複使用，直到：

- 會話重置（`/new` / `/reset`）
- 完成壓縮（壓縮計數遞增）
- 該設定檔處於冷卻/停用狀態

透過 `/model …@<profileId>` 手動選擇會為該會話設定 **使用者覆寫**，
且直到新會話開始前不會自動輪替。

自動固定的設定檔（由會話路由器選擇）被視為一種**偏好設定**：
它們會被優先嘗試，但在遇到速率限制/逾時時，OpenClaw 可能會輪換到另一個設定檔。
使用者固定的設定檔會鎖定在該設定檔；如果失敗並且已設定模型備援，
OpenClaw 將會移至下一個模型，而不是切換設定檔。

### 為什麼 OAuth 可能會「看起來遺失」

如果您對同一個供應商同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非被固定，否則輪詢機制會在訊息之間進行切換。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 進行固定，或
- 透過 `/model …` 使用每個會話的覆寫並搭配設定檔覆寫（當您的 UI/聊天介面支援時）。

## 冷卻期間

當設定檔因為驗證/速率限制錯誤（或看似速率限制的逾時）而失敗時，OpenClaw 會將其標記為冷卻並移至下一個設定檔。
該速率限制範圍比純 `429` 更廣：它還包含供應商訊息，例如 `Too many concurrent requests`、`ThrottlingException`、
`concurrency limit reached`、`workers_ai ... quota limit exceeded`、
`throttled`、`resource exhausted`，以及週期性使用量視窗限制，例如
`weekly/monthly limit reached`。
格式/無效請求錯誤（例如 Cloud Code Assist 工具呼叫 ID 驗證失敗）會被視為值得故障轉移並使用相同的冷卻期。
OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error`，會被歸類為逾時/故障轉移訊號。
當來源符合已知的暫時性模式時，供應商範圍的一般伺服器文字也可能落入該逾時範圍。例如，Anthropic 的純
`An unknown error occurred` 和 JSON `api_error` Payload，如果包含暫時性伺服器
文字，例如 `internal server error`、`unknown error, 520`、`upstream error`
或 `backend error`，會被視為值得故障轉移的逾時。僅當供應商內容確實是 OpenRouter 時，
OpenRouter 特定的一般上游文字（如純 `Provider returned error`）才會被視為逾時。一般內部
備援文字，例如 `LLM request failed with an unknown error.`，會保持
保守態度，不會自行觸發故障轉移。

速率限制冷卻也可以是模型範圍的：

- 當失敗的模型 ID 已知時，OpenClaw 會針對速率限制失敗記錄 `cooldownModel`。
- 當冷卻範圍限定於不同的模型時，同一供應商上的同級模型仍然可以嘗試。
- 計費/停用視窗仍然會在所有模型中阻擋整個設定檔。

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

帳單/額度失敗（例如「額度不足」/「餘額過低」）被視為值得進行故障切換，但它們通常不是暫時性的。OpenClaw 不會使用短暫的冷卻時間，而是將該設定檔標記為 **已停用**（並使用較長的退避時間），然後切換到下一個設定檔/供應商。

並非每個帳單類型的回應都是 `402`，也並非每個 HTTP `402` 都會落於此處。即使供應商改為傳回 `401` 或 `403`，OpenClaw 仍會將明確的帳單文字保留在帳單處理流程中，但特定供應商的匹配器仍僅限於擁有它們的供應商（例如，當錯誤訊息看起來可重試時（例如 `weekly usage limit exhausted`，`daily
limit reached, resets tomorrow`, or `organization spending limit exceeded`），OpenRouter `403 Key limit
exceeded`). Meanwhile temporary `402` 使用量視窗及
組織/工作區支出限制錯誤會被歸類為 `rate_limit`。
這些情況會保持在短暫冷卻/故障切換路徑上，而不是長期的帳單停用路徑。

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

- 帳單退避從 **5 小時** 開始，每次帳單失敗加倍，並上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內未發生失敗（可配置），退避計數器會重置。
- 過載重試在模型故障切換之前允許 **1 次同供應商設定檔輪替**。
- 過載重試預設使用 **0 毫秒退避**。

## 模型故障切換

如果供應商的所有設定檔都失敗，OpenClaw 會移至 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪替的驗證失敗、速率限制和逾時（其他錯誤不會推進故障切換）。

過載和速率限制錯誤的處理比帳單冷卻更積極。預設情況下，OpenClaw 允許一次同供應商驗證設定檔重試，然後無需等待即可切換到下一個已配置的模型故障切換。諸如 `ModelNotReadyException` 的供應商忙碌訊號會落入該過載分類中。您可以使用 `auth.cooldowns.overloadedProfileRotations`、
`auth.cooldowns.overloadedBackoffMs` 和
`auth.cooldowns.rateLimitedProfileRotations` 來調整此設定。

當運行以模型覆寫（hooks 或 CLI）開始時，在嘗試任何設定的後備選項後，後備流程仍結束於
`agents.defaults.model.primary`。

### 候選鏈規則

OpenClaw 會根據當前請求的 `provider/model`
加上設定的後備選項來建立候選清單。

規則：

- 請求的模型始終排在第一位。
- 明確設定的後備選項會進行去重，但不會根據模型
  白名單進行過濾。它們被視為操作員的明確意圖。
- 如果當前運行已經在同一個供應商
  群組中的設定後備選項上，OpenClaw 將繼續使用完整的設定鏈。
- 如果當前運行使用的供應商與設定不同，且該當前
  模型尚未成為設定後備鏈的一部分，OpenClaw 將不會
  附加來自其他供應商的不相關設定後備選項。
- 當運行始於覆寫時，設定的主要選項會附加在
  末尾，以便在較早的候選選項耗盡後，鏈可以回復到正常的預設值。

### 哪些錯誤會觸發後備切換

模型後備切換會在以下情況繼續：

- 身份驗證失敗
- 速率限制和冷卻耗盡
- 過載/供應商忙碌錯誤
- 具逾時特徵的故障轉移錯誤
- 計費停用
- `LiveSessionModelSwitchError`，它被正規化為故障轉移路徑，因此
  過時的持久化模型不會造成外部重試循環
- 當仍有剩餘候選選項時發生的其他未識別錯誤

模型後備切換不會在以下情況繼續：

- 非逾時/故障轉移特徵的明確中止
- 應保留在壓縮/重試邏輯內的上下文溢出錯誤
  （例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`）
- 當沒有剩餘候選選項時的最終未知錯誤

### 跳過冷卻與探測行為

當供應商的每個身份驗證設定檔都已處於冷卻狀態時，OpenClaw 不會
永久自動跳過該供應商。它會針對每個候補選項做出決定：

- 持續的身份驗證失敗會立即跳過整個供應商。
- 計費停用通常會跳過，但主要候選者仍可能會在限流時被探測，
  因此無需重新啟動即可恢復。
- 主要候選者可能會在冷卻即將到期時被探測，並帶有針對每個提供商的
  限流。
- 當失敗看起來是暫時性的（`rate_limit`、`overloaded` 或未知）時，儘管處於冷卻期，仍可嘗試同一提供商的故障轉移同級模型。這在速率限制特定於模型且同級模型可能立即恢復時尤為相關。
- 暫時性冷卻探測在每次故障轉移運行中限制為每個提供商一次，以
  免單一提供商阻礙跨提供商故障轉移。

## 會話覆蓋與即時模型切換

會話模型變更是共享狀態。活躍的 runner、`/model` 指令、
壓縮/會話更新，以及即時會調協都會讀取或寫入
同一會態項目的部分內容。

這意味著故障轉移重試必須與即時模型切換協調：

- 只有明確的使用者驅動模型變更才會標記待處理的即時切換。這
  包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系統驅動的模型變更，例如故障轉移輪替、心跳覆蓋
  或壓縮，絕不會自行標記待處理的即時切換。
- 在故障轉移重試開始之前，回覆 runner 會將選定的
  故障轉移覆蓋欄位保存到會態項目中。
- 即時會調協優先考慮已保存的會態覆蓋，而非過時的
  執行時期模型欄位。
- 如果故障轉移嘗試失敗，runner 僅會還原其寫入的覆蓋欄位，
  且僅限於這些欄位仍符合該失敗候選者的情況。

這避免了典型的競爭條件：

1. 主要模型失敗。
2. 在記憶體中選擇故障轉移候選者。
3. 會態儲存仍顯示舊的主要模型。
4. 即時會調協讀取過時的會態狀態。
5. 重試會在故障轉移嘗試
   開始前被 snap 回舊模型。

已保存的故障轉移覆蓋關閉了該視窗，而狹窄的還原
則保持了較新的手動或執行時期會態變更的完整性。

## 可觀測性與失敗摘要

`runWithModelFallback(...)` 記錄每次嘗試的詳細資訊，這些資訊將饋入日誌和
使用者面對的冷卻訊息：

- 嘗試的提供商/模型
- reason (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, 和
  類似的故障轉移原因)
- optional status/code
- 人類可讀的錯誤摘要

當每個候選者都失敗時，OpenClaw 會拋出 `FallbackSummaryError`。外部
回覆運行器可以使用它來構建更具體的訊息，例如「所有模型
暫時受到速率限制」，並在已知時包含最近的冷卻過期時間。

該冷卻摘要具有模型感知能力：

- 對於嘗試的
  提供者/模型鏈，不相關的模型範圍速率限制會被忽略
- 如果剩餘的封鎖是匹配的模型範圍速率限制，OpenClaw
  會報告最後一個仍然封鎖該模型的匹配過期時間

## 相關配置

請參閱 [Gateway configuration](/en/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/en/concepts/models) 以了解更廣泛的模型選擇和故障轉移概覽。
