---
title: "認證憑證語意"
summary: "用於認證設定檔的規範憑證資格與解析語意"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

# 認證憑證語意

本文件定義了以下範圍中使用的規範憑證資格與解析語意：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目標是保持選擇時間與執行階段的行為一致。

## 穩定的探測原因代碼

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## 權杖憑證

權杖憑證 (`type: "token"`) 支援內聯 `token` 和/或 `tokenRef`。

### 資格規則

1. 當 `token` 和 `tokenRef` 都不存在時，該權杖設定檔不符合資格。
2. `expires` 是可選的。
3. 如果存在 `expires`，它必須是大於 `0` 的有限數字。
4. 如果 `expires` 無效（`NaN`、`0`、負數、非有限數字或類型錯誤），則該設定檔不符合資格，原因為 `invalid_expires`。
5. 如果 `expires` 是過去的時間，則該設定檔不符合資格，原因為 `expired`。
6. `tokenRef` 不會繞過 `expires` 驗證。

### 解析規則

1. 解析器的語義與 `expires` 的資格語義相符。
2. 對於符合資格的設定檔，可以從內聯值或 `tokenRef` 解析權杖資料。
3. 無法解析的引用會在 `models status --probe` 輸出中產生 `unresolved_ref`。

## 明確驗證順序過濾

- 當為提供者設定了 `auth.order.<provider>` 或 auth-store 順序覆寫時，`models status --probe` 僅探測該提供者解析後的驗證順序中剩餘的設定檔 ID。
- 該提供者已儲存但從明確順序中省略的設定檔，不會在稍後靜默嘗試。探測輸出會使用 `reasonCode: excluded_by_auth_order` 和詳細資訊 `Excluded by auth.order for this provider.` 來報告它。

## 探測目標解析

- 探測目標可以來自驗證設定檔、環境憑證或 `models.json`。
- 如果提供者有憑證，但 OpenClaw 無法為其解析可探測的模型候選，`models status --probe` 會使用 `reasonCode: no_model` 報告 `status: no_model`。

## OAuth SecretRef 政策防護

- SecretRef 輸入僅適用於靜態憑證。
- 如果設定檔憑證是 `type: "oauth"`，則不支援該設定檔憑證資料的 SecretRef 物件。
- 如果 `auth.profiles.<id>.mode` 為 `"oauth"`，則會拒絕該設定檔以 SecretRef 支援的 `keyRef`/`tokenRef` 輸入。
- 違規行為在啟動/重新載入的驗證解析路徑中會導致嚴重失敗。

## 相容舊版的傳訊

為了與腳本相容，探錯錯誤會保持第一行不變：

`Auth profile credentials are missing or expired.`

人類可讀的詳細資訊與穩定的原因代碼可能會新增在後續行中。
