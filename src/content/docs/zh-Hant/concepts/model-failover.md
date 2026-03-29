---
summary: "OpenClaw 如何輪替設定檔並在各模型之間進行故障轉移"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
title: "模型故障轉移"
---

# 模型故障轉移

OpenClaw 分兩個階段處理故障：

1. 在目前供應商內進行 **設定檔輪替**。
2. **模型故障轉移** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

本文件說明執行階段規則以及支援這些規則的資料。

## 驗證儲存 (金鑰 + OAuth)

OpenClaw 對 API 金鑰和 OAuth 權杖都使用 **驗證設定檔**。

- 機密資料存放在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (舊版： `~/.openclaw/agent/auth-profiles.json`)。
- 設定 `auth.profiles` / `auth.order` 僅包含 **中繼資料 + 路由** (不包含機密資料)。
- 舊版僅供匯入的 OAuth 檔案： `~/.openclaw/credentials/oauth.json` (首次使用時會匯入 `auth-profiles.json`)。

更多細節： [/concepts/oauth](/en/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (對於某些供應商，加上 `projectId`/`enterpriseUrl`)

## 設定檔 ID

OAuth 登入會建立不同的設定檔，以便多個帳戶可以共存。

- 預設值：當無法取得電子郵件時，使用 `provider:default`。
- 包含電子郵件的 OAuth： `provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔存在於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## 輪替順序

當供應商有多個設定檔時，OpenClaw 會依照以下順序選擇：

1. **明確設定**： `auth.order[provider]` (如果已設定)。
2. **已設定的設定檔**：依供應商篩選的 `auth.profiles`。
3. **已儲存的設定檔**：該供應商在 `auth-profiles.json` 中的項目。

如果未設定明確的順序，OpenClaw 會使用輪詢順序：

- **主鍵**：設定檔類型 (**OAuth 優先於 API 金鑰**)。
- **次鍵**： `usageStats.lastUsed` (在每個類型中，最舊的優先)。
- **冷卻/已停用的設定檔** 會移到最後面，依最快過期的時間排序。

### 會話黏性 (快取友好)

OpenClaw **固定每個會話所選擇的驗證設定檔** 以保持提供者快取處於溫熱狀態。
它並**不**會在每次請求時輪替。固定的設定檔會被重複使用，直到：

- 會話被重置 (`/new` / `/reset`)
- 完成一次壓縮 (壓縮計數增加)
- 該設定檔處於冷卻/停用狀態

透過 `/model …@<profileId>` 進行手動選擇會為該會話設定 **使用者覆寫**，
並且在開始新會話之前不會自動輪替。

自動固定的設定檔 (由會話路由器選擇) 被視為 **偏好設定**：
它們會被優先嘗試，但在速率限制/逾時時 OpenClaw 可能會輪替到其他設定檔。
使用者固定的設定檔則鎖定於該設定檔；如果失敗且設定了模型備援，
OpenClaw 會移至下一個模型，而不是切換設定檔。

### 為什麼 OAuth 看起來「不見了」

如果您對同一個提供者同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非被固定，否則輪詢機制會在訊息之間切換這兩者。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 進行固定，或
- 使用 `/model …` 進行每個會話的覆寫，並搭配設定檔覆寫 (當您的 UI/聊天介面支援時)。

## 冷卻時間

當設定檔因為驗證/速率限制錯誤 (或看起來像速率限制的逾時) 而失敗時，OpenClaw 會將其標記為冷卻中並移至下一個設定檔。
格式/無效請求錯誤 (例如 Cloud Code Assist 工具呼叫 ID
驗證失敗) 被視為值得進行備援的情況，並使用相同的冷卻時間。
OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error`，則被分類為逾時/備援
訊號。

冷卻時間使用指數退避：

- 1 分鐘
- 5 分鐘
- 25 分鐘
- 1 小時 (上限)

狀態儲存在 `auth-profiles.json` 中的 `usageStats` 之下：

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

計費/點數失敗 (例如「點數不足」/「點數餘額過低」) 被視為值得進行備援，但它們通常不是暫時性的。OpenClaw 不使用短暫的冷卻時間，而是將該設定檔標記為 **已停用** (使用較長的退避時間) 並輪替到下一個設定檔/提供者。

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

- 帳務退避始於 **5 小時**，每次帳務失敗加倍，上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內未發生失敗（可設定），退避計數器會重置。

## 模型備援

如果提供者的所有設定檔都失敗，OpenClaw 會移至
`agents.defaults.model.fallbacks` 中的下一個模型。這適用於已用盡設定檔輪替的驗證失敗、速率限制和
逾時（其他錯誤不會推進備援）。

當執行以模型覆寫（hooks 或 CLI）啟動時，在嘗試任何設定的備援後，備援最終仍會在
`agents.defaults.model.primary` 結束。

## 相關設定

請參閱 [Gateway configuration](/en/gateway/configuration) 以取得：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/en/concepts/models) 以取得更廣泛的模型選擇和備援概覽。
