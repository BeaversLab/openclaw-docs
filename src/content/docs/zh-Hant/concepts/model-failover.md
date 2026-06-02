---
summary: "OpenClaw 如何輪替驗證設定檔並在模型之間進行容錯移轉"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "模型容錯移轉"
sidebarTitle: "模型容錯移轉"
---

OpenClaw 分兩個階段處理故障：

1. 在目前供應商內進行 **設定檔輪替**。
2. **模型容錯移轉** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

本文件說明執行階段規則以及支援這些規則的資料。

## 執行流程

對於正常的文字運行，OpenClaw 會按以下順序評估候選模型：

<Steps>
  <Step title="解析階段狀態">解析現用階段模型和驗證設定檔偏好。</Step>
  <Step title="建置候選鏈">根據目前的模型選擇和該選擇來源的容錯移轉政策，建置模型候選鏈。已設定的預設值、Cron 作業主要模型和自動選取的容錯移轉模型可以使用已設定的容錯移轉；明確的使用者階段選取則為嚴格模式。</Step>
  <Step title="嘗試目前的提供者">使用驗證設定檔輪替/冷卻規則嘗試目前的提供者。</Step>
  <Step title="在符合容錯移轉的錯誤時推進">如果該提供者因符合容錯移轉的錯誤而耗盡，則移至下一個模型候選。</Step>
  <Step title="保存容錯移轉覆寫">在重試開始之前保存所選的容錯移轉覆寫，以便其他階段讀取器能看到執行器即將使用的相同提供者/模型。保存的模型覆寫會標記為 `modelOverrideSource: "auto"`。</Step>
  <Step title="失敗時精準回復">如果容錯移轉候選失敗，當其欄位仍符合該失敗候選時，僅回復容錯移轉擁有的階段覆寫欄位。</Step>
  <Step title="若耗盡則擲回 FallbackSummaryError">如果每個候選都失敗，則擲回 `FallbackSummaryError`，其中包含每次嘗試的詳細資料，以及在已知時最早的冷卻到期時間。</Step>
</Steps>

這是有意設計得比「儲存並還原整個會話」更狹隘。回覆執行器僅會保存其為故障轉移所擁有的模型選取欄位：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

這可以防止失敗的後備重試覆寫較新的無關會話變更，例如在嘗試運行期間發生的手動 `/model` 變更或會話輪替更新。

## 選擇來源策略

OpenClaw 將選擇的提供者/模型與選擇原因分開。該來源控制是否允許故障轉移鏈：

- **已配置的預設值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主要**：`agents.list[].model` 是嚴格的，除非該 agent model 物件包含其自己的 `fallbacks`。使用 `fallbacks: []` 使嚴格行為變得明確，或提供非空列表以讓該 agent 參與模型後備。
- **自動後備覆寫**：執行時後備會在重試前寫入 `providerOverride`、`modelOverride`、`modelOverrideSource: "auto"` 以及選定的來源模型。該自動覆寫可以沿著已配置的後備鏈繼續嘗試，而無需在每條訊息時探測主要模型，但 OpenClaw 會定期重新探測已配置的來源，並在它恢復時清除自動覆寫。`/new`、`/reset` 和 `sessions.reset` 也會清除來源自動的覆寫。心跳運行時若沒有明確的 `heartbeat.model` 清除指令，當其來源不再符合目前的已配置預設值時，會清除直接自動覆寫。
- **使用者會話覆寫**：`/model`、模型選擇器、`session_status(model=...)` 和 `sessions.patch` 會寫入 `modelOverrideSource: "user"`。這是一個精確的會話選擇。如果選定的提供者/模型在產生回覆前失敗，OpenClaw 會報告失敗，而不是使用無關的已配置後備來回答。
- **舊版會話覆寫**：較舊的會話項目可能有 `modelOverride` 而沒有 `modelOverrideSource`。OpenClaw 將這些視為使用者覆寫，因此明確的舊選擇不會被靜默轉換為後備行為。
- **Cron 載荷模型**：cron 工作 `payload.model` / `--model` 是工作主要，而不是使用者會話覆寫。它使用已配置的後備，除非該工作提供 `payload.fallbacks`；`payload.fallbacks: []` 會使 cron 執行變得嚴格。

自動切換主要模型的探測間隔為五分鐘，且不可設定。OpenClaw 會記住每個會話和主要模型最近的探測結果，因此不會在每次輪次中重試失敗的主要模型。當會話切換至備用模型時，OpenClaw 會發送可見的通知；當它返回至選定的主要模型時，會發送另一則通知；但在每次持續的備用輪次中不會重複該通知。

## 用戶可見的備用通知

當會話切換至自動選擇的備用模型時，OpenClaw 會在同一個回覆介面中發送狀態通知：

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

當後續的探測成功且會話返回至選定的主要模型時，OpenClaw 會發送：

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

這些通知屬於操作訊息，而非助理內容。它們在每次狀態變更時傳送一次，包括可行時的僅副作用輪次，但持續的備用輪次不會重複發送。傳送過程會繞過正常的來源回覆抑制，該通知不會佔用執行緒通道的第一個助理回覆位置，並且會從文字轉語音和承諾提取中排除。

## 認證儲存 (金鑰 + OAuth)

OpenClaw 對於 API 金鑰和 OAuth 權杖都使用 **認證設定檔 (auth profiles)**。

- 機密資料儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (舊版：`~/.openclaw/agent/auth-profiles.json`) 中。
- 執行時期的認證路由狀態儲存在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 設定 `auth.profiles` / `auth.order` 僅包含 **中繼資料 + 路由** (不含機密資料)。
- 舊版僅供匯入的 OAuth 檔案：`~/.openclaw/credentials/oauth.json` (首次使用時匯入至 `auth-profiles.json`)。

更多詳情：[OAuth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ 部分供應商需 `projectId`/`enterpriseUrl`)

## 設定檔 ID

OAuth 登入會建立獨立的設定檔，以便多個帳戶共存。

- 預設：當沒有電子郵件可用時為 `provider:default`。
- 帶有電子郵件的 OAuth：`provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## 輪替順序

當供應商有多個設定檔時，OpenClaw 會依此選擇順序：

<Steps>
  <Step title="Explicit config">`auth.order[provider]` (如果已設定)。</Step>
  <Step title="Configured profiles">依提供者過濾的 `auth.profiles`。</Step>
  <Step title="Stored profiles">該提供者在 `auth-profiles.json` 中的項目。</Step>
</Steps>

如果未設定明確順序，OpenClaw 會使用輪詢順序：

- **主要鍵：** 概要檔案類型 (**OAuth 優先於 API 金鑰**)。
- **次要鍵：** `usageStats.lastUsed` (每種類型中最舊的優先)。
- **冷卻/停用的概要檔案** 會移至最後，依最早過期的時間排序。

### 會話粘性 (快取友善)

OpenClaw **釘選每個會話選擇的驗證概要檔案** 以保持提供者快取溫熱。它**不**會在每次請求時輪替。被釘選的概要檔案會重複使用，直到：

- 會話被重置 (`/new` / `/reset`)
- 壓縮完成 (壓縮計數增加)
- 該概要檔案處於冷卻/停用狀態

透過 `/model …@<profileId>` 手動選擇會為該會話設定 **使用者覆寫**，並且不會自動輪替，直到新會話開始。

<Note>自動釘選的概要檔案 (由會話路由器選擇) 被視為一種 **偏好設定**：它們會先被嘗試，但 OpenClaw 可能會因為速率限制/逾時而輪替到另一個概要檔案。當原始概要檔案再次可用時，新的執行可以在不變更選定的模型或執行階段的情況下再次優先選擇它。使用者釘選的概要檔案會保持鎖定在該概要檔案；如果它失敗並且設定了模型備援，OpenClaw 會移至下一個模型而不是切換概要檔案。</Note>

### OpenAI Codex 訂閱加 API 金鑰備援

對於 OpenAI 代理程式模型，驗證和執行階段是分開的。`openai/gpt-*` 留在
Codex harness 上，而驗證可以在 Codex 訂閱概要檔案和
OpenAI API 金鑰備援之間輪替。

請使用 `auth.order.openai` 作為面向使用者的順序：

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

對於 ChatGPT/Codex OAuth 設定檔和 OpenAI API 金鑰設定檔，請使用 `openai:*`。當訂閱方案達到 Codex 使用限制時，OpenClaw 會記錄 Codex 提供的確切重置時間，嘗試下一個有序的認證設定檔，並將執行保持在 Codess 框架內。一旦通過重置時間，訂閱設定檔將再次具備資格，下一次自動選擇可以返回該設定檔。

僅當您希望為該
工作階段強制使用單一帳戶/金鑰時，才使用使用者固定的設定檔。使用者固定的設定檔經過嚴格設計，不會無聲跳轉
到另一個設定檔。

## 冷卻時間

當設定檔因認證/速率限制錯誤（或看似速率限制的超時）而失敗時，OpenClaw 會將其標記為冷卻並移至下一個設定檔。

<AccordionGroup>
  <Accordion title="歸入速率限制 / 逾時桶的內容">
    該速率限制桶的範圍比純 `429` 更廣：它還包含提供者訊息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及週期性使用視窗限制，例如 `weekly/monthly limit reached`。

    格式/無效請求錯誤通常是終局性的，因為重試相同的負載會以同樣的方式失敗，因此 OpenClaw 會顯示這些錯誤，而不是輪替驗證設定檔。已知可重試修復的路徑可以明確選擇加入：例如，Cloud Code Assist 工具呼叫 ID 驗證失敗會被清理，並透過 `allowFormatRetry` 原則重試一次。OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error`，會被分類為逾時/故障轉移訊號。

    當來源符合已知的暫態模式時，一般伺服器文字也可能歸入該逾時桶中。例如，裸露的模型執行階段串流包裝器訊息 `An unknown error occurred` 被視為對所有提供者而言都值得故障轉移，因為當提供者串流以 `stopReason: "aborted"` 或 `stopReason: "error"` 結束而沒有具體細節時，共用的模型執行階段會發出此訊息。包含暫態伺服器文字（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）的 JSON `api_error` 負載也會被視為值得故障轉移的逾時。

    OpenRouter 特有的一般上游文字（例如裸露的 `Provider returned error`）僅在提供者上下文實際上是 OpenRouter 時才被視為逾時。一般內部後備文字（例如 `LLM request failed with an unknown error.`）保持保守，不會單獨觸發故障轉移。

  </Accordion>
  <Accordion title="SDK retry-after caps">
    某些供應商 SDK 可能會在將控制權返回給 OpenClaw 之前休眠很長的 `Retry-After` 視窗。對於基於 Stainless 的 SDK（例如 Anthropic 和 OpenAI），OpenClaw 預設將 SDK 內部的 `retry-after-ms` / `retry-after` 等待時間上限設為 60 秒，並立即上報更長的可重試回應，以便此故障轉移路徑可以執行。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 調整或停用上限；請參閱 [重試行為](/zh-Hant/concepts/retry)。
  </Accordion>
  <Accordion title="Model-scoped cooldowns">
    速率限制冷卻也可以限定於模型範圍內：

    - 當已知失敗的模型 ID 時，OpenClaw 會針對速率限制失敗記錄 `cooldownModel`。
    - 當冷卻限定於不同模型時，仍可嘗試同一供應商上的同級模型。
    - 計費/停用視窗仍會在所有模型間阻擋整個設定檔。

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

## 帳單停用

帳單/點數失敗（例如「點數不足」/「點數餘額過低」）被視為值得進行故障轉移，但它們通常不是暫時性的。OpenClaw 不會使用短暫的冷卻，而是將設定檔標記為**已停用**（並使用較長的退避時間），然後輪替到下一個設定檔/提供者。

<Note>
並非每個計費形狀的回應都是 `402`，且並非每個 HTTP `402` 都會落在此處。即使供應商改為傳回 `401` 或 `403`，OpenClaw 仍會將明確的計費文字保留在計費通道中，但供應商特定的匹配器仍限定於擁有它們的供應商（例如 OpenRouter `403 Key limit exceeded`）。

同時，暫時的 `402` 使用量視窗和組織/工作區支出限制錯誤在訊息看起來可重試時會被分類為 `rate_limit`（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`）。這些會留在短暫冷卻/故障轉移路徑上，而不是長期的計費停用路徑。

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
- 如果設定檔 **24 小時**（可配置）內未失敗，退避計數器會重置。
- 過載重試在模型故障轉移之前允許 **1 次相同供應商的設定檔輪替**。
- 過載重試預設使用 **0 毫秒退避**。

## 模型故障轉移

如果供應商的所有設定檔都失敗，OpenClaw 會移至 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪替的驗證失敗、速率限制和逾時（其他錯誤不會推進備援）。未揭露足夠細節的供應商錯誤仍會在備援狀態中精確標記：`empty_response` 表示供應商未傳回可用的訊息或狀態，`no_error_details` 表示供應商明確傳回 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始預覽，但尚未有分類器與之相符。

過載和速率限制錯誤的處理比計費冷卻更積極。根據預設，OpenClaw 允許一次相同供應商的驗證設定檔重試，然後在不等待的情況下切換至下一個設定的模型備援。供應商忙碌訊號（例如 `ModelNotReadyException`）會落入該過載分類。您可以透過 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 進行調整。

當執行從設定的預設主要項目、Cron 工作主要項目、具有明確備援的代理程式主要項目，或自動選取的備援覆寫開始時，OpenClaw 可以遍歷相符的設定備援鏈結。沒有明確備援的代理程式主要項目和明確的使用者選取（例如 `/model ollama/qwen3.5:27b`、模型選擇器 `sessions.patch` 或一次性 CLI 供應商/模型覆寫）是嚴格的：如果該供應商/模型無法連線或在產生回覆前失敗，OpenClaw 會回報失敗，而不是從不相關的備援進行回答。

### 候選鏈規則

OpenClaw 會從目前請求的 `provider/model` 加上設定的備援來建構候選清單。

<AccordionGroup>
  <Accordion title="規則">
    - 請求的模型始終排在第一位。
    - 明確配置的後備會被去重，但不會透過模型允許清單進行篩選。它們被視為操作者的明確意圖。
    - 如果當前執行已經位於同一個供應商系列中的某個配置後備上，OpenClaw 將繼續使用完整的配置鏈。
    - 當未提供明確的後備覆蓋時，即使請求的模型使用不同的供應商，也會在配置的主要模型之前嘗試配置的後備。
    - 當未向後備執行器提供明確的後備覆蓋時，配置的主要模型會被附加到末尾，以便一旦較早的候選者耗盡，鏈可以回落到正常的預設值。
    - 當呼叫者提供 `fallbacksOverride` 時，執行器將準確使用請求的模型加上該覆蓋清單。空清單會停用模型後備，並防止將配置的主要模型附加為隱藏的重試目標。

  </Accordion>
</AccordionGroup>

### 哪些錯誤會觸發備援

<Tabs>
  <Tab title="繼續於">
    - 認證失敗
    - 速率限制和冷卻耗盡
    - 過載/供應商忙碌錯誤
    - 逾時狀態的故障轉移錯誤
    - 帳單停用
    - `LiveSessionModelSwitchError`，它會被標準化為故障轉移路徑，以免過時的持久化模型建立外部重試迴圈
    - 當仍有剩餘候選者時的其他無法辨識錯誤

  </Tab>
  <Tab title="不繼續於">
    - 非逾時/故障轉移狀態的明確中止
    - 應保留在壓縮/重試邏輯內的上下文溢位錯誤（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 當沒有剩餘候選者時的最終未知錯誤

  </Tab>
</Tabs>

### 冷卻跳過與探測行為

當某個提供者的所有驗證設定檔都已在冷卻中時，OpenClaw 不會永遠自動跳過該提供者。它會針對每個候選進行決策：

<AccordionGroup>
  <Accordion title="候選決策">
    - 持續的授權失敗會立即跳過整個提供商。
    - 帳單停用通常會跳過，但在節流機制下仍會探測主要候選者，以便無需重新啟動即可恢復。
    - 在冷卻快到期時，可能會透過針對每個提供商的節流機制來探測主要候選者。
    - 當故障看起來是暫時性（`rate_limit`、`overloaded` 或未知）時，即使處於冷卻期，也可以嘗試同一提供商中的後援候選模型。當速率限制僅限於特定模型範圍，而同級模型可能立即恢復時，這一點尤為重要。
    - 每次後援執行每個提供商僅限一次暫時性冷卻探測，以免單一提供商延遲跨提供商後援。

  </Accordion>
</AccordionGroup>

## 工作階段覆寫與即時模型切換

會話模型變更是共享狀態。活躍執行器、`/model` 指令、壓縮/會話更新以及即時會話協調，都會讀取或寫入同一會話項目的部分內容。

這意味著故障轉移重試必須與即時模型切換相互協調：

- 只有明確的使用者驅動模型變更才會標記待處理的即時切換。這包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系統驅動的模型變更（例如容錯輪替、心跳覆寫或合併）從不會自行標記待處理的即時切換。
- 使用者驅動的模型覆寫在後援策略中被視為精確選擇，因此無法連線的已選提供商會顯示為失敗，而不會被 `agents.defaults.model.fallbacks` 遮蔽。
- 在容錯重試開始之前，回覆執行器會將選定的容錯覆寫欄位保存至會話條目。
- 自動後援覆寫會在後續回合中保持選中狀態，以免 OpenClaw 在每則訊息中都探測已知有問題的主要選項。OpenClaw 會定期重新探測已設定的原始來源，並在恢復時清除自動覆寫；`/new`、`/reset` 和 `sessions.reset` 會立即清除來源自動的覆寫。
- 使用者回覆會在每次狀態變更時公告容錯轉換和容錯清除恢復。粘性容錯輪次不會重複公告。
- `/status` 會顯示選取的模型，並且當後援狀態不同時，顯示目前生效的後援模型及原因。
- 即時會話調解會優先採用已保存的會話覆寫，而非過期的執行時模型欄位。
- 如果即時切換錯誤指向作用中容錯鏈中的後續候選者，OpenClaw 會直接跳躍至該選定的模型，而不是先走查不相關的候選者。
- 如果容錯嘗試失敗，執行器僅會回滾其寫入的覆寫欄位，且僅在這些欄位仍符合該失敗候選者時才執行。

這可以防止典型的競爭情況：

<Steps>
  <Step title="主要模型失敗">已選的主要模型失敗。</Step>
  <Step title="在記憶體中選擇容錯">在記憶體中選擇容錯候選者。</Step>
  <Step title="會話儲存仍顯示舊的主要模型">會話儲存仍反映舊的主要模型。</Step>
  <Step title="即時協調讀取過時狀態">即時會話協調讀取過時的會話狀態。</Step>
  <Step title="重試已回復">在開始故障轉移嘗試之前，重試會被還原至舊的模型。</Step>
</Steps>

持久化的故障轉移覆蓋關閉了該視窗，而狹隘的回滾則保留了較新的手動或執行階段會話變更。

## 可觀測性與失敗摘要

`runWithModelFallback(...)` 記錄了每次嘗試的詳細資訊，這些資訊會用於日誌和面向使用者的冷卻訊息：

- 嘗試的提供者/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及類似的故障轉移原因）
- 選填的狀態/代碼
- 人類可讀的錯誤摘要

當候選者失敗、被跳過，或後續的容錯成功時，結構化的 `model_fallback_decision` 日誌也會包含扁平的 `fallbackStep*` 欄位。這些欄位會明確嘗試的轉換（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），以便日誌和診斷匯出器即使在最終的容錯也失敗時，也能重建主要失敗。

當每個候選者都失敗時，OpenClaw 會拋出 `FallbackSummaryError`。外部回覆執行器可以使用它來建立更具體的訊息，例如「所有模型暫時受到速率限制」，並在已知時包含最近的冷卻過期時間。

該冷卻摘要是感知模型的：

- 對於嘗試的提供者/模型鏈，會忽略不相關的模型範圍速率限制
- 如果剩餘的阻擋是匹配的模型範圍速率限制，OpenClaw 會報告仍然阻擋該模型的最後一個匹配到期時間

## 相關設定

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/zh-Hant/concepts/models) 以了解更廣泛的模型選擇和容錯概覽。
