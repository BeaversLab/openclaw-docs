---
summary: "OpenClaw 如何輪替驗證設定檔並在模型之間進行備援"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
title: "模型備援"
---

# 模型備援

OpenClaw 分兩個階段處理失敗：

1. 在目前的提供者內進行 **驗證設定檔輪替**。
2. **模型備援** 到 `agents.defaults.model.fallbacks` 中的下一個模型。

本文件說明執行時期的規則及其背後的資料。

## 驗證儲存 (金鑰 + OAuth)

OpenClaw 對於 API 金鑰和 OAuth 權杖都使用 **驗證設定檔**。

- 機密資訊儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (舊版: `~/.openclaw/agent/auth-profiles.json`)。
- 設定檔 `auth.profiles` / `auth.order` 僅包含 **中繼資料 + 路由** (不含機密資訊)。
- 舊版僅供匯入的 OAuth 檔案：`~/.openclaw/credentials/oauth.json` (首次使用時會匯入到 `auth-profiles.json`)。

更多詳細資訊：[/concepts/oauth](/zh-Hant/concepts/oauth)

憑證類型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ 對於某些提供者需加上 `projectId`/`enterpriseUrl`)

## 設定檔 ID

OAuth 登入會建立不同的設定檔，以便多個帳戶可以共存。

- 預設值：當沒有可用的電子郵件時使用 `provider:default`。
- 含電子郵件的 OAuth：`provider:<email>` (例如 `google-antigravity:user@gmail.com`)。

設定檔儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中的 `profiles` 之下。

## 輪替順序

當提供者有多個設定檔時，OpenClaw 會依以下順序選擇：

1. **明確設定**：`auth.order[provider]` (如果已設定)。
2. **已設定的設定檔**：依提供者篩選的 `auth.profiles`。
3. **已儲存的設定檔**：該提供者在 `auth-profiles.json` 中的項目。

如果未設定明確的順序，OpenClaw 會使用循環順序：

- **主要鍵**：設定檔類型 (**OAuth 優於 API 金鑰**)。
- **次要鍵**：`usageStats.lastUsed` (每種類型中最舊的優先)。
- **冷卻/停用的設定檔** 會移至最後，依照最早到期的時間排序。

### 工作階段黏性 (快取友好)

OpenClaw **為每個會話固定選定的驗證設定檔**，以保持提供者快取處於熱狀態。
它並**不**會在每次請求時輪替。固定的設定檔會重複使用，直到：

- 會話已重置 (`/new` / `/reset`)
- 壓縮完成 (壓缩計數增加)
- 該設定檔處於冷卻/停用狀態

透過 `/model …@<profileId>` 進行手動選擇會為該會話設定 **使用者覆寫**，
並且直到新會話開始前都不會自動輪替。

自動固定的設定檔 (由會話路由器選擇) 被視為一種 **偏好設定**：
它們會被優先嘗試，但 OpenClaw 可能會因速率限制/逾時而輪替到另一個設定檔。
使用者固定的設定檔會保持鎖定在該設定檔；如果它失敗並且設定了模型備援，
OpenClaw 會移至下一個模型，而不是切換設定檔。

### 為什麼 OAuth 看起來「遺失了」

如果您針對同一個供應商同時擁有 OAuth 設定檔和 API 金鑰設定檔，除非已固定，否則輪詢機制會在訊息之間切換使用這些設定檔。若要強制使用單一設定檔：

- 使用 `auth.order[provider] = ["provider:profileId"]` 進行固定，或
- 透過 `/model …` 使用每階段的覆寫，並搭配設定檔覆寫（當您的 UI/聊天介面支援時）。

## 冷卻期

當設定檔因為驗證/速率限制錯誤（或是看似速率限制逾時）而失敗時，OpenClaw 會將其標記為冷卻狀態並移至下一個設定檔。
格式/無效請求錯誤（例如 Cloud Code Assist 工具呼叫 ID
驗證失敗）被視為值得進行故障轉移，並使用相同的冷卻期。
相容 OpenAI 的停止原因錯誤，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error`，則被歸類為逾時/故障轉移
訊號。

冷卻期使用指數退避：

- 1 分鐘
- 5 分鐘
- 25 分鐘
- 1 小時（上限）

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

## 帳單停用

帳單/餘額失敗（例如「餘額不足」/「餘額過低」）被視為可故障轉移，但它們通常不是暫時性的。OpenClaw 不會使用短暫冷卻，而是將該設定檔標記為 **已停用**（並使用較長的退避時間），然後輪替至下一個設定檔/提供商。

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

- 帳單退避從 **5 小時** 開始，每次帳單失敗翻倍，上限為 **24 小時**。
- 如果設定檔在 **24 小時** 內未發生失敗（可設定），則退避計數器會重置。

## 模型後備

如果某個提供商的所有設定檔都失敗，OpenClaw 會移至
`agents.defaults.model.fallbacks` 中的下一個模型。這適用於已耗盡設定檔輪替的驗證失敗、速率限制和逾時（其他錯誤不會觸發後備）。

當執行以模型覆寫（hooks 或 CLI）開始時，後備仍會在嘗試任何設定的後備後結束於
`agents.defaults.model.primary`。

## 相關設定

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 以了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

請參閱 [Models](/zh-Hant/concepts/models) 以了解更廣泛的模型選擇和後備概覽。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
