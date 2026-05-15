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

## Agent 副本可移植性

Agent 身份驗證繼承是直通式的（read-through）。當 Agent 沒有本機設定檔時，它可以在執行時從預設/主要 Agent 存儲中解析設定檔，而無需將密鑰資料複製到自己的 `auth-profiles.json` 中。

明確的複製流程，例如 `openclaw agents add`，會使用此可移植性原則：

- `api_key` 設定檔是可移植的，除非 `copyToAgents: false`。
- `token` 設定檔是可移植的，除非 `copyToAgents: false`。
- `oauth` 設定檔預設不可移植，因為重新整理權杖（refresh tokens）可能是一次性或對輪換敏感的。
- 提供者擁有的 OAuth 流程僅當已知跨 Agent 複製重新整理資料是安全的情況下，才能選擇加入 `copyToAgents: true`。

不可移植的設定檔仍可通過直通式繼承使用，除非目標 Agent 分別登入並建立其自己的本機設定檔。

## 僅設定的身份驗證路由

具有 `mode: "aws-sdk"` 的 `auth.profiles` 項目是路由元資料，而非儲存的憑證。當目標提供者使用 `models.providers.<id>.auth: "aws-sdk"` 或內建 Amazon Bedrock 預設 AWS SDK 路由時，這些項目是有效的。即使 `auth-profiles.json` 中不存在相符的項目，這些設定檔 ID 也可能出現在 `auth.order` 和會話覆寫中。

請勿將 `type: "aws-sdk"` 寫入 `auth-profiles.json`。如果舊版安裝具有此類標記，`openclaw doctor --fix` 會將其移至 `auth.profiles` 並從憑證存儲中移除該標記。

## 明確的身份驗證順序過濾

- 當為提供者設定了 `auth.order.<provider>` 或 auth-store 順序覆寫時，`models status --probe` 僅會探查保留在該提供者已解析身份驗證順序中的設定檔 ID。
- 該提供者的儲存設定檔若從明確順序中省略，稍後不會被靜默嘗試。探查輸出會以 `reasonCode: excluded_by_auth_order` 回報它，並帶有詳細資訊 `Excluded by auth.order for this provider.`

## 探查目標解析

- 探查目標可以來自身份驗證設定檔、環境憑證或 `models.json`。
- 如果供應商具有憑證，但 OpenClaw 無法為其解析可探測的模型候選項，`models status --probe` 會回報 `status: no_model` 並帶有 `reasonCode: no_model`。

## 外部 CLI 憑證探索

- 由外部 CLI 擁有的僅限執行時期憑證，僅在供應商、執行時期或認證設定檔位於目前操作的範圍內時，或是當該外部來源已存在已儲存的本地設定檔時，才會被探索到。
- Auth-store 呼叫端應選擇明確的外部 CLI 探索模式：`none` 僅用於持久化/外掛程式認證，`existing` 用於重新整理已儲存的外部 CLI 設定檔，或 `scoped` 用於特定的供應商/設定檔組合。
- 唯讀/狀態路徑會傳遞 `allowKeychainPrompt: false`；它們僅使用檔案支援的外部 CLI 憑證，並且不讀取或重複使用 macOS 鑰匙圈結果。

## OAuth SecretRef 原則防護

- SecretRef 輸入僅適用於靜態憑證。
- 如果設定檔憑證是 `type: "oauth"`，則不支援針對該設定檔憑證資料使用 SecretRef 物件。
- 如果 `auth.profiles.<id>.mode` 是 `"oauth"`，則會拒絕該設定檔的 SecretRef 支援的 `keyRef`/`tokenRef` 輸入。
- 違規在啟動/重新載入認證解析路徑中會被視為嚴重失敗。

## 舊版相容訊息

為了腳本相容性，探測錯誤會保持第一行不變：

`Auth profile credentials are missing or expired.`

人類友善的詳細資訊和穩定的原因代碼可以新增在後續行中。

## 相關

- [機密管理](/zh-Hant/gateway/secrets)
- [認證儲存](/zh-Hant/concepts/oauth)
