---
summary: "OpenClaw 如何輪替驗證設定檔並跨模型回退"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
title: "模型失效切換"
---

# 模型失效切換

OpenClaw 分兩個階段處理失敗：

1. 在當前供應商內進行 **驗證設定檔輪替 (Auth profile rotation)**。
2. **模型回退 (Model fallback)** 到 `agents.defaults.model.fallbacks` 中的下一個模型。

本文說明執行時期規則與支撐這些規則的資料。

## 驗證儲存 (金鑰 + OAuth)

OpenClaw 對於 API 金鑰和 OAuth 權杖都使用 **驗證設定檔**。

- 機密資料儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中 (舊版：`~/.openclaw/agent/auth-profiles.json`)。
- 設定 `auth.profiles` / `auth.order` 僅包含 **中繼資料 + 路由** (不含機密資料)。
- 舊版僅匯入用的 OAuth 檔案：`~/.openclaw/credentials/oauth.json` (會在首次使用時匯入 `auth-profiles.json`)。

更多細節：[/concepts/oauth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (部分供應商需加上 `projectId`/`enterpriseUrl`)

## 設定檔 ID

OAuth 登入會建立不同的設定檔，以便多個帳戶共存。

- 預設：當無法取得電子郵件時為 `provider:default`。
- 包含電子郵件的 OAuth：`provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## 輪替順序

當供應商有多個設定檔時，OpenClaw 會依照以下順序選擇：

1. **明確設定**：`auth.order[provider]` (若有設定)。
2. **已設定的設定檔**：經供應商篩選後的 `auth.profiles`。
3. **已儲存的設定檔**：該供應商在 `auth-profiles.json` 中的項目。

若未設定明確順序，OpenClaw 會使用輪詢 順序：

- **主要鍵**：設定檔類型 (**OAuth 優先於 API 金鑰**)。
- **次要鍵**：`usageStats.lastUsed` (每種類型中由舊到新)。
- **冷卻/停用的設定檔** 會移至末尾，並依到期時間先後排序。

### 工作階段黏性 (快取友好)

OpenClaw **針對每個會話固定選定的驗證設定檔**，以保持提供者快取處於熱狀態。
它**不會**在每次請求時輪替。固定的設定檔會被重複使用，直到：

- 會話被重設（`/new` / `/reset`）
- 完成一次壓縮（壓縮計數增加）
- 該設定檔處於冷卻/停用狀態

透過 `/model …@<profileId>` 進行手動選擇會設定該會話的 **使用者覆寫**，
且直到新會話開始前都不會自動輪替。

自動固定的設定檔（由會話路由器選取）被視為一種 **偏好設定**：
它們會被優先嘗試，但在速率限制/逾時時 OpenClaw 可能會輪替到其他設定檔。
使用者固定的設定檔會鎖定於該設定檔；如果它失敗且已設定模型備援，
OpenClaw 會移動到下一個模型，而不是切換設定檔。

### 為何 OAuth 可能「看起來遺失」

如果您對同一個提供者同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非已固定，否則輪循機制可能會在訊息之間切換。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 進行固定，或
- 透過 `/model …` 使用每個會話的覆寫，並搭配設定檔覆寫（當您的 UI/聊天介面支援時）。

## 冷卻時間

當設定檔因為驗證/速率限制錯誤（或看似速率限制的逾時）而失敗時，OpenClaw 會將其標記為冷卻並移至下一個設定檔。
格式/無效請求錯誤（例如 Cloud Code Assist 工具呼叫 ID
驗證失敗）被視為可進行備援並使用相同的冷卻時間。
與 OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error`，會被分類為逾時/備援
訊號。

冷卻時間使用指數退避：

- 1 分鐘
- 5 分鐘
- 25 分鐘
- 1 小時（上限）

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

## 計費停用

計費/點數失敗（例如「點數不足」/「點數餘額過低」）被視為可進行備援，但這類情況通常不是暫時性的。與其使用短暫的冷卻時間，OpenClaw 會將該設定檔標記為 **停用**（並使用較長的退避時間）並輪替到下一個設定檔/提供者。

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

- 計費退避從 **5 小時** 開始，每次計費失敗加倍，上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內未失敗（可配置），退避計數器會重置。

## 模型備援

如果供應商的所有設定檔都失敗，OpenClaw 會移至 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於身份驗證失敗、速率限制，以及已耗盡設定檔輪換的逾時（其他錯誤不會推進備援）。

當執行以模型覆寫（hooks 或 CLI）開始時，在嘗試任何配置的備援後，備援仍會結束於 `agents.defaults.model.primary`。

## 相關配置

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/zh-Hant/concepts/models) 以廣泛了解模型選擇和備援概覽。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
