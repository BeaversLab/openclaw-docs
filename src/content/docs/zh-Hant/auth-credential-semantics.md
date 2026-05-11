---
summary: "Auth 設定檔的標準憑證資格與解析語義"
title: "Auth 憑證語義"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

本文定義了跨以下內容使用的標準憑證資格與解析語義：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目標是保持選擇時與執行時期的行為一致。

## 穩定的探測原因代碼

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## 權杖憑證

權杖設定檔 (`type: "token"`) 支援內聯 `token` 和/或 `tokenRef`。

### 資格規則

1. 當同時缺少 `token` 和 `tokenRef` 時，權杖設定檔不符合資格。
2. `expires` 是可選的。
3. 如果存在 `expires`，它必須是一個大於 `0` 的有限數值。
4. 如果 `expires` 無效（`NaN`、`0`、負數、非有限值或類型錯誤），則該設定檔因 `invalid_expires` 而不符合資格。
5. 如果 `expires` 在過去，則該設定檔因 `expired` 而不符合資格。
6. `tokenRef` 不會繞過 `expires` 驗證。

### 解析規則

1. 解析器的語義與 `expires` 的資格語義相符。
2. 對於符合資格的設定檔，可以從內聯值或 `tokenRef` 解析權杖內容。
3. 無法解析的參照會在 `models status --probe` 輸出中產生 `unresolved_ref`。

## 明確的授權順序過濾

- 當 `auth.order.<provider>` 或 auth-store 順序覆寫設定為供應商時，`models status --probe` 僅會探測該供應商已解析驗證順序中剩餘的設定檔 ID。
- 該供應商從明確順序中省略的已儲存設定檔不會在稍後靜默嘗試。探測輸出會以 `reasonCode: excluded_by_auth_order` 回報它，並附帶詳細資訊 `Excluded by auth.order for this provider.`

## 探測目標解析

- 探測目標可以來自驗證設定檔、環境憑證或 `models.json`。
- 如果供應商有憑證，但 OpenClaw 無法為其解析可探測的模型候選，`models status --probe` 會以 `status: no_model` 回報，並附帶 `reasonCode: no_model`。

## OAuth SecretRef 政策守護

- SecretRef 輸入僅適用於靜態憑證。
- 如果設定檔憑證是 `type: "oauth"`，則不支援該設定檔憑證物件的 SecretRef 物件。
- 如果 `auth.profiles.<id>.mode` 為 `"oauth"`，則會拒絕該設定檔以 SecretRef 為後盾的 `keyRef`/`tokenRef` 輸入。
- 違規在啟動/重新載入驗證解析路徑中屬於嚴重失敗。

## 相容舊版的訊息

為了腳本相容性，探測錯誤的第一行保持不變：

`Auth profile credentials are missing or expired.`

人類可讀的詳細資訊和穩定的原因代碼可能會在後續行中新增。

## 相關

- [機密管理](/zh-Hant/gateway/secrets)
- [驗證儲存](/zh-Hant/concepts/oauth)
