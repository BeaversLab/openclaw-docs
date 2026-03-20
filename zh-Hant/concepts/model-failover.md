---
summary: "OpenClaw 如何輪換身分驗證設定檔並在模型之間進行故障轉移"
read_when:
  - 診斷身分驗證設定檔輪換、冷卻時間或模型故障轉移行為
  - 更新身分驗證設定檔或模型的故障轉移規則
title: "Model Failover"
---

# Model failover

OpenClaw 分兩個階段處理故障：

1. **Auth profile rotation** (身分驗證設定檔輪換) 於目前的提供者內部。
2. **Model fallback** (模型故障轉移) 至 `agents.defaults.model.fallbacks` 中的下一個模型。

本文說明運行時期規則及其背後的資料。

## Auth storage (keys + OAuth) (身分驗證儲存 (金鑰 + OAuth))

OpenClaw 對 API 金鑰和 OAuth 權杖皆使用 **auth profiles** (身分驗證設定檔)。

- Secrets (密碼) 存活於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (舊版： `~/.openclaw/agent/auth-profiles.json`)。
- 設定 `auth.profiles` / `auth.order` 僅為 **metadata + routing only** (僅包含中繼資料與路由，不包含密碼)。
- 舊版僅匯入 OAuth 檔案： `~/.openclaw/credentials/oauth.json` (首次使用時匯入至 `auth-profiles.json`)。

更多細節： [/concepts/oauth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ 對於某些提供者，需 `projectId`/`enterpriseUrl`)

## Profile IDs (設定檔 ID)

OAuth 登入會建立不同的設定檔，以便多個帳戶可以共存。

- 預設值：當沒有電子郵件可用時為 `provider:default`。
- 含電子郵件的 OAuth： `provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔存活於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 下。

## Rotation order (輪換順序)

當提供者有多個設定檔時，OpenClaw 會選擇如下順序：

1. **Explicit config** (明確設定)： `auth.order[provider]` (若已設定)。
2. **Configured profiles** (已設定的設定檔)：經提供者篩選的 `auth.profiles`。
3. **Stored profiles** (已儲存的設定檔)：該提供者在 `auth-profiles.json` 中的項目。

若未設定明確順序，OpenClaw 使用輪詢 (round‑robin) 順序：

- **Primary key:** (主鍵)：設定檔類型 (**OAuth 優先於 API 金鑰**)。
- **Secondary key:** (次鍵)： `usageStats.lastUsed` (每種類型內，由舊到新)。
- **Cooldown/disabled profiles** (冷卻/停用的設定檔) 會移至末尾，並依最快到期時間排序。

### Session stickiness (cache-friendly) (會話粘性 (快取友善))

OpenClaw **會固定每個工作階段所選的驗證設定檔**，以保持提供者快取處於熱狀態。
它**不會**在每次請求時輪替。固定的設定檔會被重複使用，直到：

- 工作階段被重設 (`/new` / `/reset`)
- 完成一次壓縮（壓縮計數增加）
- 該設定檔處於冷卻/停用狀態

透過 `/model …@<profileId>` 進行手動選擇會為該工作階段設定 **使用者覆寫**，
並且在開始新的工作階段之前不會自動輪替。

自動固定的設定檔（由工作階段路由器選擇）會被視為一種 **偏好設定**：
它們會被優先嘗試，但 OpenClaw 可能會因速率限制/逾時而輪替到另一個設定檔。
使用者固定的設定檔會鎖定在該設定檔；如果它失敗且設定了模型備援，
OpenClaw 會移動到下一個模型，而不是切換設定檔。

### 為何 OAuth 可能「看起來不見了」

如果您對同一個提供者同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非已固定，否則輪詢 可能會在訊息之間切換使用這兩者。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 固定，或者
- 透過 `/model …` 使用每個工作階段的覆寫，並搭配設定檔覆寫（當您的 UI/聊天介面支援時）。

## 冷卻

當設定檔因為驗證/速率限制錯誤（或看起來像是速率限制的逾時）而失敗時，OpenClaw 會將其標記為冷卻狀態並移至下一個設定檔。
格式/無效請求錯誤（例如 Cloud Code Assist 工具呼叫 ID 驗證失敗）被視為可進行備援的錯誤，並使用相同的冷卻時間。
與 OpenAI 相容的停止原因錯誤，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error`，被歸類為逾時/備援訊號。

冷卻使用指數退避：

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

計費/點數失敗（例如「點數不足」/「點數餘額過低」）被視為可進行備援的錯誤，但它們通常不是暫時性的。OpenClaw 不使用短暫的冷卻時間，而是將該設定檔標記為 **已停用**（並使用較長的退避時間）並輪替到下一個設定檔/提供者。

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

- 帳務退避起始時間為 **5 小時**，每次帳務失敗加倍，上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內未發生失敗，則退避計數器會重置（可配置）。

## 模型備援

如果提供者的所有設定檔都失敗，OpenClaw 會移動到 `agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪替的驗證失敗、速率限制和逾時（其他錯誤不會推進備援）。

當執行以模型覆寫（hooks 或 CLI）啟動時，在嘗試任何已配置的備援後，備援仍會結束於 `agents.defaults.model.primary`。

## 相關配置

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/zh-Hant/concepts/models) 以了解更廣泛的模型選擇和備援概覽。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
