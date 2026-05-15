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
  <Step title="建構候選鏈">根據當前的模型選擇以及該選擇來源的故障轉移策略，建構模型候選鏈。設定的預設值、Cron 任務主要模型以及自動選擇的故障轉移模型可以使用設定的故障轉移選項；明確的使用者工作階段選擇則是嚴格的。</Step>
  <Step title="嘗試目前的供應商">使用身分驗證設定檔輪替/冷卻規則嘗試目前的供應商。</Step>
  <Step title="遇可故障轉移錯誤時推進">若該供應商因可故障轉移錯誤而耗盡，則移至下一個模型候選。</Step>
  <Step title="保存故障轉移覆寫">在重試開始之前，先保存所選的故障轉移覆寫，以便其他工作階段讀取者能看到與執行器即將使用的相同提供者/模型。保存的模型覆寫會被標記為 `modelOverrideSource: "auto"`。</Step>
  <Step title="失敗時精準還原">若故障轉移候選失敗，則僅在這些欄位仍與該失敗候選相符時，還原屬於故障轉移的會話覆寫欄位。</Step>
  <Step title="如果耗盡則擲回 FallbackSummaryError">如果每個候選都失敗，則擲回 `FallbackSummaryError`，其中包含每次嘗試的詳細資料，以及已知情況下最近的冷卻到期時間。</Step>
</Steps>

這是有意設計得比「儲存並還原整個會話」更狹隘。回覆執行器僅會保存其為故障轉移所擁有的模型選取欄位：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

這可以防止失敗的故障轉移重試覆寫較新的不相關工作階段變更，例如在嘗試執行期間發生的手動 `/model` 變更或工作階段輪替更新。

## 選擇來源策略

OpenClaw 將選擇的提供者/模型與選擇原因分開。該來源控制是否允許故障轉移鏈：

- **設定的預設值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主要模型**：`agents.list[].model` 是嚴格的，除非該 agent 模型物件包含其自己的 `fallbacks`。使用 `fallbacks: []` 使嚴格行為變得明確，或提供非空清單以讓該 agent 加入模型故障轉移。
- **自動故障轉移覆寫**：執行時期的故障轉移會在重試前寫入 `providerOverride`、`modelOverride` 和 `modelOverrideSource: "auto"`。該自動覆寫可以繼續沿著設定的故障轉移鏈前進，並且會由 `/new`、`/reset` 和 `sessions.reset` 清除。
- **使用者會話覆寫**：`/model`、模型選擇器 `session_status(model=...)` 和 `sessions.patch` 會寫入 `modelOverrideSource: "user"`。這是一個精確的會話選擇。如果選取的提供商/模型在產生回覆之前失敗，OpenClaw 會回報失敗，而不是使用無關的已設定備援來回答。
- **舊版會話覆寫**：較舊的會話條目可能包含 `modelOverride` 但沒有 `modelOverrideSource`。OpenClaw 將這些視為使用者覆寫，因此明確的舊選擇不會被無聲轉換為備援行為。
- **Cron 負載模型**：Cron 任務 `payload.model` / `--model` 是任務主要設定，而非使用者會話覆寫。它使用已設定的備援，除非任務提供 `payload.fallbacks`；`payload.fallbacks: []` 會使 cron 執行變為嚴格模式。

## Auth storage (keys + OAuth)

OpenClaw 對於 API 金鑰和 OAuth 權杖都使用 **auth profiles**。

- 機密資料儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (舊版：`~/.openclaw/agent/auth-profiles.json`) 中。
- 執行時期的 auth-routing 狀態儲存在 `~/.openclaw/agents/<agentId>/agent/auth-state.json`。
- 設定 `auth.profiles` / `auth.order` 僅為 **中繼資料 + 路由** (不含機密)。
- 舊版僅供匯入的 OAuth 檔案：`~/.openclaw/credentials/oauth.json` (首次使用時會匯入到 `auth-profiles.json`)。

更多細節：[OAuth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (對於部分提供商則是 + `projectId`/`enterpriseUrl`)

## Profile IDs

OAuth 登入會建立不同的設定檔，以便多個帳戶可以共存。

- 預設：當沒有可用的電子郵件時為 `provider:default`。
- 帶有電子郵件的 OAuth：`provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## Rotation order

當提供商有多個設定檔時，OpenClaw 會像這樣選擇順序：

<Steps>
  <Step title="Explicit config">`auth.order[provider]` (如果已設定)。</Step>
  <Step title="Configured profiles">`auth.profiles`，依供應商篩選。</Step>
  <Step title="Stored profiles">該供應商在 `auth-profiles.json` 中的項目。</Step>
</Steps>

如果未設定明確順序，OpenClaw 會使用輪詢順序：

- **主鍵：** 設定檔類型 (**OAuth 優先於 API 金鑰**)。
- **次鍵：** `usageStats.lastUsed` (在同類型中，最舊的優先)。
- **冷卻/已停用的設定檔** 會移至最後，並依最快到期時間排序。

### Session stickiness (cache-friendly)

OpenClaw **會為每個會話鎖定選定的驗證設定檔** 以保持供應商快取溫熱。它**不會**在每個請求時輪替。鎖定的設定檔會重複使用，直到：

- 會話重置 (`/new` / `/reset`)
- 完成壓縮 (壓縮計數遞增)
- 該設定檔處於冷卻/已停用狀態

透過 `/model …@<profileId>` 手動選擇會為該會話設定 **使用者覆寫**，並且直到新會話開始前都不會自動輪替。

<Note>自動鎖定的設定檔 (由會話路由器選擇) 被視為一種 **偏好設定**：它們會被優先嘗試，但在速率限制/逾時時 OpenClaw 可能會輪替到其他設定檔。使用者鎖定的設定檔則保持鎖定；如果它失敗且已設定模型備援，OpenClaw 會移至下一個模型而不是切換設定檔。</Note>

### Why OAuth can "look lost"

如果您對同一供應商同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非鎖定，否則輪詢機制可能會在訊息之間切換。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 鎖定，或
- 透過 `/model …` 使用每個會話的覆寫，並搭配設定檔覆寫 (當您的 UI/聊天介面支援時)。

## Cooldowns

當設定檔因驗證/速率限制錯誤 (或看似速率限制的逾時) 而失敗時，OpenClaw 會將其標記為冷卻並移至下一個設定檔。

<AccordionGroup>
  <Accordion title="歸入速率限制 / 逾時歸類的情況">
    該速率限制歸類比單純的 `429` 更廣泛：它還包括供應商訊息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及週期性使用視窗限制，例如 `weekly/monthly limit reached`。

    格式/無效請求錯誤通常是終止性的，因為重試相同的負載會以相同的方式失敗，因此 OpenClaw 會顯示這些錯誤，而不是輪換驗證設定檔。已知的重試修復路徑可以明確選擇加入：例如，Cloud Code Assist 工具呼叫 ID 驗證失敗會透過 `allowFormatRetry` 策略進行清理並重試一次。OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，被分類為逾時/故障轉移信號。

    當來源符合已知的暫態模式時，通用的伺服器文字也可以歸入該逾時歸類中。例如，純 pi-ai 串流包裝訊息 `An unknown error occurred` 對於每個供應商都被視為值得故障轉移，因為當供應商串流以 `stopReason: "aborted"` 或 `stopReason: "error"` 結束而沒有具體細節時，pi-ai 會發出該訊息。包含暫態伺服器文字（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 負載也被視為值得故障轉移的逾時。

    OpenRouter 專用的通用上游文字（例如純 `Provider returned error`）僅在供應商內容實際上是 OpenRouter 時才被視為逾時。通用的內部故障轉移文字（例如 `LLM request failed with an unknown error.`）保持保守，不會自行觸發故障轉移。

  </Accordion>
  <Accordion title="SDK 重試後上限">
    某些供應商 SDK 可能會在將控制權交還給 OpenClaw 之前休眠很長的 `Retry-After` 視窗。對於基於 Stainless 的 SDK（例如 Anthropic 和 OpenAI），OpenClaw 預設會將 SDK 內部的 `retry-after-ms` / `retry-after` 等待時間上限設為 60 秒，並立即顯示更長的可重試回應，以便執行此故障轉移路徑。您可以使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 調整或停用此上限；請參閱[重試行為](/zh-Hant/concepts/retry)。
  </Accordion>
  <Accordion title="模型範圍冷卻">
    速率限制冷卻也可以是模型範圍的：

    - 當已知失敗的模型 ID 時，OpenClaw 會記錄速率限制失敗的 `cooldownModel`。
    - 當冷卻範圍限定於不同模型時，仍可嘗試同一供應商上的同層級模型。
    - 計費/停用視窗仍然會跨模型封鎖整個設定檔。

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

計費/額度失敗（例如「額度不足」/「額度餘額過低」）被視為值得進行故障轉移，但它們通常不是暫時性的。OpenClaw 不會進行短暫冷卻，而是將設定檔標記為**已停用**（並採用更長的退避時間），然後輪替到下一個設定檔/供應商。

<Note>
並非所有帳單相關的回應都是 `402`，也並非所有 HTTP `402` 都會落在這裡。即使供應商改為返回 `401` 或 `403`，OpenClaw 仍會將明確的帳單文字保留在帳單通道中，但特定供應商的匹配器僅限於擁有它們的供應商（例如 OpenRouter `403 Key limit exceeded`）。

同時，臨時的 `402` 使用量視窗和組織/工作區支出限制錯誤，在訊息看起來可重試時（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`）會被歸類為 `rate_limit`。這些情況會保持在短冷卻/故障轉移路徑上，而不是長期的帳單停用路徑。

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
- 如果設定檔在 **24 小時** 內未失敗（可配置），退避計數器會重置。
- 過載重試在模型故障轉移之前允許 **1 次相同供應商的設定檔輪替**。
- 過載重試預設使用 **0 毫秒退避**。

## 模型故障轉移

如果供應商的所有設定檔都失敗，OpenClaw 會移至 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪替的身份驗證失敗、速率限制和逾時（其他錯誤不會推進故障轉移）。未揭露足夠細節的供應商錯誤在故障轉移狀態下仍會被精確標記：`empty_response` 表示供應商未返回可用的訊息或狀態，`no_error_details` 表示供應商明確返回了 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始預覽但尚未有分類器匹配到它。

過載和速率限制錯誤的處理比計費冷卻更為積極。預設情況下，OpenClaw 允許一次相同提供者的身分驗證設定檔重試，然後切換到下一個設定的模型後備，而不會等待。例如 `ModelNotReadyException` 等提供者忙碌訊號會歸入該過載分類。您可以透過 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 來調整此設定。

當執行從設定的預設主要選項、排程任務主要選項、具有明確後備的代理程式主要選項，或自動選取的後備覆寫開始時，OpenClaw 可以遍歷符合設定的後備鏈。沒有明確後備的代理程式主要選項和使用者的明確選取（例如 `/model ollama/qwen3.5:27b`、模型選擇器 `sessions.patch`，或一次性 CLI 提供者/模型覆寫）是嚴格的：如果該提供者/模型無法連線或在產生回覆前失敗，OpenClaw 會回報失敗，而不是使用不相關的後備來回答。

### 候選鏈規則

OpenClaw 會根據目前請求的 `provider/model` 以及設定的後備來建立候選清單。

<AccordionGroup>
  <Accordion title="Rules">
    - 請求的模型永遠排在第一位。
    - 明確設定的後備會進行去重，但不會根據模型允許清單進行篩選。它們被視為操作者的明確意圖。
    - 如果目前的執行已經位於相同提供者家族中的某個設定後備上，OpenClaw 會繼續使用完整的設定鏈。
    - 如果目前的執行使用的提供者與設定不同，且目前的模型尚未成為設定後備鏈的一部分，OpenClaw 不會附加來自其他提供者的不相關設定後備。
    - 當沒有提供明確的後備覆寫給後備執行器時，設定的主要選項會附加在末尾，以便在早期的候選者耗盡後，鏈可以恢復到正常的預設值。
    - 當呼叫者提供 `fallbacksOverride` 時，執行器會僅使用請求的模型加上該覆寫清單。空清單會停用模型後備，並防止設定的主要選項被附加為隱藏的重試目標。

  </Accordion>
</AccordionGroup>

### 哪些錯誤會觸發後備

<Tabs>
  <Tab title="繼續執行">
    - 身份驗證失敗
    - 速率限制與冷卻耗盡
    - 過載/供應商忙碌錯誤
    - 逾時形狀的故障轉移錯誤
    - 計費停用
    - `LiveSessionModelSwitchError`，該錯誤會被正規化為故障轉移路徑，以免過時的持久化模型造成外層重試迴圈
    - 當仍有剩餘候選者時的其他無法辨識錯誤

  </Tab>
  <Tab title="不繼續執行">
    - 非逾時/故障轉移形狀的明確中止
    - 應保持在壓縮/重試邏輯內的語境溢位錯誤（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 當沒有剩餘候選者時的最終未知錯誤

  </Tab>
</Tabs>

### 略過冷卻與探測行為的比較

當供應商的每個身分驗證配置檔都已在冷卻中時，OpenClaw 不會永久自動略過該供應商。它會針對每個候選者做出決定：

<AccordionGroup>
  <Accordion title="每個候選者的決定">
    - 持續性身分驗證失敗會立即略過整個供應商。
    - 計費停用通常會略過，但主要候選者仍可在節流時進行探測，以便在不重新啟動的情況下復原。
    - 主要候選者可能在冷卻快到期時透過每個供應商的節流機制進行探測。
    - 當失敗看起來是暫時性時（`rate_limit`、`overloaded` 或未知），儘管處於冷卻中，仍可嘗試同供應商的故障轉移同層候選者。當速率限制範圍僅限於模型時，這點特別重要，因為同層模型可能仍能立即復原。
    - 暫時性冷卻探測在每次故障轉移執行中每個供應商僅限一次，以免單一供應商延遲跨供應商的故障轉移。

  </Accordion>
</AccordionGroup>

## 會話覆寫與即時模型切換

會話模型變更是共享狀態。作用中的執行器、`/model` 指令、壓縮/會話更新以及即時會話協調都會讀取或寫入同一個會話項目的部分內容。

這意味著故障轉移重試必須與即時模型切換進行協調：

- 只有明確的使用者驅動模型變更才會標記待處理的即時切換。這包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系統驅動的模型變更（例如故障轉移輪替、心跳覆寫或合併）絕不會自行標記待處理的即時切換。
- 使用者驅動的模型覆寫被視為故障轉移策略的精確選擇，因此無法連線的已選提供者會顯示為失敗，而不是被 `agents.defaults.model.fallbacks` 遮蔽。
- 在故障轉移重試開始之前，回覆執行器會將選定的故障轉移覆寫欄位保存到工作階段項目中。
- 自動故障轉移覆寫會在後續輪次中保持選中狀態，因此 OpenClaw 不會在每則訊息時探查已知不良的主要項。`/new`、`/reset` 和 `sessions.reset` 會清除自動來源的覆寫，並將工作階段恢復為設定的預設值。
- `/status` 會顯示選定的模型，並在故障轉移狀態不同時顯示作用中的故障轉移模型及原因。
- 即時工作階段協調偏好已保存的工作階段覆寫，而非過期的執行時期模型欄位。
- 如果即時切換錯誤指向作用中故障轉移鏈中的後續候選項，OpenClaw 會直接跳轉到該選定的模型，而不是先走訪不相關的候選項。
- 如果故障轉移嘗試失敗，執行器只會回復它寫入的覆寫欄位，而且僅在這些欄位仍然符合該失敗候選項時才回復。

這可防止典型的競爭狀況：

<Steps>
  <Step title="主要項失敗">選定的主要模型失敗。</Step>
  <Step title="在記憶體中選擇故障轉移">在記憶體中選擇故障轉移候選項。</Step>
  <Step title="工作階段儲存仍顯示舊的主要項">工作階段儲存仍反映舊的主要項。</Step>
  <Step title="即時協調讀取過期狀態">即時工作階段協調讀取過期的工作階段狀態。</Step>
  <Step title="重試回退">在開始備用嘗試之前，重試會彈回到舊模型。</Step>
</Steps>

持久化的備用覆寫關閉了這個視窗，而狹義的回滾保留了較新的手動或執行階段會話變更。

## 可觀測性與失敗摘要

`runWithModelFallback(...)` 記錄了每次嘗試的細節，這些細節會輸入到日誌和面向使用者的冷卻訊息中：

- 嘗試的提供者/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 和類似的備用原因）
- 可選的狀態/代碼
- 人類可讀的錯誤摘要

結構化的 `model_fallback_decision` 日誌還包含扁平的 `fallbackStep*` 欄位，當候選者失敗、被跳過，或後續的備用成功時。這些欄位使嘗試的過渡變得明確（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），以便日誌和診斷匯出器即使在最終備用也失敗時也能重建主要失敗。

當每個候選者都失敗時，OpenClaw 會拋出 `FallbackSummaryError`。外部回覆執行器可以使用它來構建更具體的訊息，例如「所有模型暫時受到速率限制」，並在已知時包含最近的冷卻到期時間。

該冷卻摘要是感知模型的：

- 對於嘗試的提供者/模型鏈，會忽略無關的模型範圍速率限制
- 如果剩餘的區塊是匹配的模型範圍速率限制，OpenClaw 會報告最後一個仍然阻擋該模型的匹配到期時間

## 相關配置

請參閱 [Gateway 配置](/zh-Hant/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/zh-Hant/concepts/models) 以了解更廣泛的模型選取和故障轉移概覽。
