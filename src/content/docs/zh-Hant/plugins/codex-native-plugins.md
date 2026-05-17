---
summary: "為 Codex 模式 OpenClaw 代理程式設定已遷移的原生 Codex 外掛程式"
title: "原生 Codex 外掛程式"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

原生 Codex 外掛程式支援功能讓 Codex 模式的 OpenClaw 代理程式，能夠在處理 OpenClaw 轉換的同一個 Codex 執行緒內，使用 Codex 應用程式伺服器本身的應用程式與外掛程式功能。

OpenClaw 不會將 Codex 外掛程式轉譯為合成的 `codex_plugin_*`
OpenClaw 動態工具。外掛程式呼叫會保留在原生 Codex 對話紀錄中，且
Codex 應用程式伺服器擁有應用程式支援的 MCP 執行。

在基礎 [Codex harness](/zh-Hant/plugins/codex-harness) 正常運作後，請使用本頁面。

## 需求

- 選取的 OpenClaw 代理程式執行環境必須是原生 Codex harness。
- `plugins.entries.codex.enabled` 必須為 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必須為 true。
- V1 僅支援遷移觀察到在來源 Codex 主目錄中
  以原始碼安裝的 `openai-curated` 外掛程式。
- 目標 Codex 應用程式伺服器必須能夠看到預期的 marketplace、外掛程式和應用程式清單。

`codexPlugins` 對 PI 執行、一般 OpenAI 提供者執行、ACP
對話繫結或其他 harness 沒有作用，因為這些路徑不會建立
具有原生 `apps` 設定的 Codex 應用程式伺服器執行緒。

## 快速入門

從來源 Codex home 預覽遷移：

```bash
openclaw migrate codex --dry-run
```

當您希望遷移在規劃原生外掛程式啟用之前檢查來源應用程式
可存取性時，請使用嚴格來源應用程式驗證：

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

當計畫看起來正確時，套用遷移：

```bash
openclaw migrate apply codex --yes
```

遷移會為符合條件的外掛程式寫入明確的 `codexPlugins` 項目，並針對選取的外掛程式呼叫
Codex 應用程式伺服器 `plugin/install`。典型的已遷移
設定如下所示：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便
未來的 Codex harness 工作階段以更新的應用程式集啟動。

## 原生外掛程式設定運作方式

此整合有三種獨立狀態：

- 已安裝：Codex 在目標應用程式伺服器執行時間內擁有本機外掛程式套件組合。
- 已啟用：OpenClaw 設定願意讓外掛程式可供 Codex
  harness 回合使用。
- 可存取：Codex 應用程式伺服器確認外掛程式的應用程式項目已提供
  作用中的帳戶使用，且可對應至已遷移的外掛程式身分識別。

遷移是持久的安裝/資格步驟。在規劃期間，OpenClaw
會讀取來源 Codex `plugin/read` 詳細資訊，並檢查來源 Codex
app-server 帳戶回應是否為 ChatGPT 訂閱帳戶。非 ChatGPT 或
遺失的帳戶回應會使用 `codex_subscription_required` 跳過應用程式支援的外掛程式。
根據預設，遷移不會呼叫來源 `app/list`；通過帳戶閘道的應用程式支援來源外掛程式
會在未驗證來源應用程式可存取性的情況下進行規劃，且帳戶查詢傳輸
失敗會使用 `codex_account_unavailable` 跳過。使用 `--verify-plugin-apps` 時，
遷移會取得全新的來源 `app/list` 快照，並要求每個擁有的應用程式
在規劃原生啟用之前必須存在、已啟用且可存取。在
該模式下，帳戶查詢傳輸失敗會落入來源
應用程式清單閘道。執行時期應用程式清單是遷移後的
目標工作階段可存取性檢查。Codex harness 工作階段設定接著會計算針對
已啟用且可存取之外掛程式應用程式的嚴格執行緒應用程式設定。

當 OpenClaw 建立 Codex harness 工作階段
或取代過時的 Codex 執行緒繫結時，會計算執行緒應用程式設定。
它不會在每個回合重新計算。

## V1 支援邊界

V1 的範圍有意設計得很狹窄：

- 只有在來源 Codex
  app-server 清單中已安裝的 `openai-curated` 外掛程式才符合遷移資格。
- 應用程式支援的來源外掛程式必須通過遷移時期的訂閱閘道。
  `--verify-plugin-apps` 增加了來源應用程式清單閘道。受訂閱閘道限制的
  帳戶，以及在驗證模式下無法存取、已停用、遺失的來源
  應用程式或來源應用程式清單重新整理失敗，會被回報為跳過的手動
  項目，而不是已啟用的設定項目。無法讀取的外掛程式詳細資訊會在
  來源應用程式清單閘道之前被跳過。
- 遷移會使用 `marketplaceName` 和
  `pluginName` 寫入明確的外掛程式身分識別；它不會寫入本機 `marketplacePath` 快取路徑。
- `codexPlugins.enabled` 是全域啟用開關。
- 沒有 `plugins["*"]` 萬用字元，也沒有授與任意
  安裝權限的設定金鑰。
- 不支援的市集、快取的外掛程式套件、掛鉤和 Codex 設定檔
  會保留在遷移報告中以供手動審查。

## 應用程式清單與擁有權

OpenClaw 透過應用程式伺服器 `app/list` 讀取 Codex 應用程式清單，將其快取一小時，並以非同步方式重新整理過期或遺失的項目。此快取僅儲存在記憶體中；重新啟動 CLI 或閘道會清除它，且 OpenClaw 會從下一次 `app/list` 讀取中重建它。

遷移和執行時期使用不同的快取索引鍵：

- 來源遷移驗證使用來源 Codex home 和來源應用程式伺服器
  啟動選項。這僅在設定了 `--verify-plugin-apps` 時執行，並且它
  會強制對該規劃執行進行全新的來源 `app/list` 遍歷。
- 目標執行時期設定在建立 Codex 執行緒應用程式設定時，使用目標代理程式的 Codex 應用程式伺服器身分識別。外掛程式啟用會使該目標
  快取索引鍵失效，然後在 `plugin/install` 後強制重新整理它。

只有當 OpenClaw 能透過穩定的擁有權將外掛程式應用程式對應回已遷移的
外掛程式時，才會公開該應用程式：

- 來自外掛程式詳細資訊的確切應用程式 ID
- 已知的 MCP 伺服器名稱
- 獨特的穩定中繼資料

僅顯示名稱或模稜兩可的擁有權會被排除，直到下一次清單
重新整理證明擁有權為止。

## 執行緒應用程式設定

OpenClaw 為 Codex 執行緒注入限制性的 `config.apps` 修補程式：
`_default` 已停用，且僅啟用由已啟用遷移外掛程式擁有的應用程式。

OpenClaw 根據有效的全域或個別外掛程式 `allow_destructive_actions` 政策設定應用程式層級的 `destructive_enabled`，並讓 Codex 從其原生應用程式工具註解強制執行破壞性工具中繼資料。`_default`
應用程式設定會以 `open_world_enabled: false` 停用。已啟用的外掛程式應用程式
會以 `open_world_enabled: true` 發出；OpenClaw 不會公開個別的
外掛程式開放世界政策旋鈕，也不會維護每個外掛程式的破壞性
工具名稱拒絕清單。

對於外掛程式應用程式，工具核准模式預設為自動，因此非破壞性的
讀取工具可以在沒有同執行緒核准 UI 的情況下執行。破壞性工具仍然
受每個應用程式的 `destructive_enabled` 政策控制。

## 破壞性動作政策

對於已遷移的 Codex 外掛程式，預設允許破壞性的外掛程式引導請求，而不安全的 schema 和模糊的所有權仍會因失敗而關閉：

- 全域 `allow_destructive_actions` 預設為 `true`。
- 個別外掛程式的 `allow_destructive_actions` 會覆蓋該外掛程式的全域原則。
- 當原則為 `false` 時，OpenClaw 會傳回確定性拒絕。
- 當原則為 `true` 時，OpenClaw 僅會自動接受它可以對應至核准回應的安全 schema，例如布林值的核准欄位。
- 缺少外掛程式身分識別、模糊的所有權、缺少回合 ID、錯誤的回合 ID 或不安全的引導 schema，會導致拒絕而非提示。

## 疑難排解

**`auth_required`：** 遷移已安裝此外掛程式，但其應用程式之一仍需要驗證。明確的外掛程式項目會被寫入為已停用，直到您重新授權並啟用為止。

**`app_inaccessible`、`app_disabled` 或 `app_missing`：**
遷移未安裝此外掛程式，因為當設定 `--verify-plugin-apps` 時，來源 Codex 應用程式清單未顯示所有擁有的應用程式皆存在、已啟用且可存取。請在 Codex 中重新授權或啟用應用程式，然後使用 `--verify-plugin-apps` 重新執行遷移。

**`app_inventory_unavailable`：** 遷移未安裝此外掛程式，因為
要求了嚴格的來源應用程式驗證，但來源 Codex 應用程式清單重新整理失敗。請修復來源 Codex 應用程式伺服器的存取權，或者如果您接受較快的帳戶閘道計劃，則在不含 `--verify-plugin-apps` 的情況下重試。

**`codex_subscription_required`：** 遷移未安裝由應用程式支援的
外掛程式，因為來源 Codex 應用程式伺服器帳戶未使用 ChatGPT 訂閱帳戶登入。請使用訂閱驗證登入 Codex 應用程式，然後重新執行遷移。

**`codex_account_unavailable`：** 遷移未安裝由應用程式支援的外掛程式，
因為無法讀取來源 Codex 應用程式伺服器帳戶。請修復來源 Codex
應用程式伺服器驗證，或者如果您希望在帳戶查詢失敗時由來源應用程式
清單決定資格，則使用 `--verify-plugin-apps` 重新執行。

**`marketplace_missing` 或 `plugin_missing`：** 目標 Codex 應用伺服器
無法看見預期的 `openai-curated` 市集或外掛。請針對目標執行環境重新執行遷移
或檢查 Codex 應用伺服器的外掛狀態。

**`app_inventory_missing` 或 `app_inventory_stale`：** 應用就緒狀態來自於
空的或過時的快取。OpenClaw 會排程非同步重新整理，並排除外掛應用程式
直到擁有權和就緒狀態已知。

**`app_ownership_ambiguous`：** 應用庫存僅透過顯示名稱比對，因此
該應用程式未對 Codex 執行緒公開。

**設定已變更但代理人無法看見外掛：** 請使用 `/new`、`/reset` 或
重新啟動閘道。現有的 Codex 執行緒繫結會保留其啟動時的應用程式設定
直到 OpenClaw 建立新的負載階段作業或取代過時的繫結。

**破壞性動作被拒絕：** 請檢查全域和各外掛的
`allow_destructive_actions` 數值。即使原則為 true，不安全的引發架構
和不明確的外掛身分識別仍然會失敗封閉（以安全為失敗預設）。

## 相關

- [Codex 負載](/zh-Hant/plugins/codex-harness)
- [Codex 負載參考](/zh-Hant/plugins/codex-harness-reference)
- [Codex 負載執行環境](/zh-Hant/plugins/codex-harness-runtime)
- [設定參考](/zh-Hant/gateway/configuration-reference#codex-harness-plugin-config)
- [遷移 CLI](/zh-Hant/cli/migrate)
