---
summary: "為 Codex 模式 OpenClaw 代理設定已遷移的原生 Codex 外掛"
title: "原生 Codex 外掛"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are configuring first-party Codex plugin marketplaces
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

原生 Codex 外掛程式支援功能讓 Codex 模式的 OpenClaw 代理程式，能夠在處理 OpenClaw 轉換的同一個 Codex 執行緒內，使用 Codex 應用程式伺服器本身的應用程式與外掛程式功能。

OpenClaw 不會將 Codex 外掛轉換為合成的 `codex_plugin_*`
OpenClaw 動態工具。外掛呼叫會保留在原生 Codex 轉錄中，
且 Codex 應用程式伺服器擁有應用程式支援的 MCP 執行。

在基本的 [Codex harness](/zh-Hant/plugins/codex-harness) 運作後使用此頁面。

## 需求

- 選取的 OpenClaw 代理程式執行環境必須是原生 Codex harness。
- `plugins.entries.codex.enabled` 必須為 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必須為 true。
- V1 支援第一方 Codex 外掛市集：`openai-curated`、
  `openai-bundled` 和 `openai-primary-runtime`。
- 遷移僅會自動發現其在來源 Codex home 中觀察到
  為來源安裝的 `openai-curated` 外掛。
- 目標 Codex 應用程式伺服器必須能夠看到預期的市集、
  外掛和應用程式清單。

`codexPlugins` 對 OpenClaw 執行、一般 OpenAI 提供者執行、ACP
對話綁定或其他 harness 沒有影響，因為這些路徑不會建立
具有原生 `apps` 設定的 Codex 應用程式伺服器執行緒。

OpenAI 端的 Codex 存取權、應用程式可用性以及工作區應用程式/外掛控制
項來自已登入的 Codex 帳戶。關於 OpenAI 帳戶和管理員模型，
請參閱 [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

## 快速入門

從來源 Codex home 預覽遷移：

```bash
openclaw migrate codex --dry-run
```

當您希望遷移在規劃原生外掛啟用前檢查來源應用程式
可存取性時，請使用嚴格來源應用程式驗證：

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

當計畫看起來正確時，套用遷移：

```bash
openclaw migrate apply codex --yes
```

遷移會為符合條件的策展外掛寫入明確的 `codexPlugins` 項目
並針對選取的外掛呼叫 Codex 應用程式伺服器 `plugin/install`。明確設定
也可能會參照 Codex 的內建和主要執行階段第一方市集，
當目標應用程式伺服器清單公開那些外掛應用程式時。
典型的已遷移設定如下所示：

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

變更 `codexPlugins` 後，新的 Codex 對話會自動採用更新後的應用程式集。請使用 `/new` 或 `/reset` 來重新整理目前的對話。
啟用或停用外掛程式的變更不需要重新啟動閘道。

## 手動新增第一方市集項目

遷移程式會為合乎條件的來源安裝外掛程式寫入 `openai-curated` 項目。
對於位於 Codex 捆綁或主要執行階段市集中的第一方外掛程式，請在確認目標 Codex 應用程式伺服器清單公開該市集和外掛程式後，新增明確的項目。

對於每個第一方市集，請使用相同的設定結構：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            plugins: {
              chrome: {
                enabled: true,
                marketplaceName: "openai-bundled",
                pluginName: "chrome",
              },
              documents: {
                enabled: true,
                marketplaceName: "openai-primary-runtime",
                pluginName: "documents",
              },
            },
          },
        },
      },
    },
  },
}
```

`plugins` 下的金鑰是 OpenClaw 的本機設定金鑰。`pluginName` 和
`marketplaceName` 必須與 Codex 應用程式伺服器清單完全相符。如果外掛程式未列於 `/codex plugins list` 或 Codex 應用程式診斷中，OpenClaw 會保留設定的項目，但無法將其應用程式公開給 Codex 回合。

## 從聊天管理外掛程式

當您想要在操作 Codex harness 的同一個聊天中檢查或變更已設定的原生 Codex 外掛程式時，請使用 `/codex plugins`：

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` 是 `/codex plugins list` 的別名。清單輸出會顯示設定的外掛程式金鑰、開/關狀態、Codex 外掛程式名稱，以及來自 `plugins.entries.codex.config.codexPlugins.plugins` 的市集。

`enable` 和 `disable` 僅寫入至 `~/.openclaw/openclaw.json` 的 OpenClaw 設定；它們不會編輯 `~/.codex/config.toml` 或安裝新的 Codex 外掛程式。只有擁有者或具有 `operator.admin` 範圍的閘道用戶端可以變更外掛程式狀態。

啟用已設定的外掛程式也會開啟全域 `codexPlugins.enabled` 開關。如果外掛程式因遷移傳回 `auth_required` 而寫入為停用狀態，請在 OpenClaw 中啟用之前，先在 Codex 中重新授權該應用程式。

## 原生外掛程式設定運作方式

整合有三種不同的狀態：

- 已安裝：Codex 在目標應用程式伺服器執行階段中擁有本機外掛程式套件。
- 已啟用：OpenClaw 設定允許將外掛程式提供給 Codex
  harness 回合使用。
- 可存取：Codex 應用伺服器會確認外掛程式的應用程式項目可供
  主動帳戶使用，且可對應至已遷移的外掛程式身分識別。

遷移是持久的安裝/資格步驟。在規劃期間，OpenClaw
會讀取來源 Codex `plugin/read` 詳細資料，並檢查來源 Codex
應用伺服器帳戶回應是否為 ChatGPT 訂閱帳戶。非 ChatGPT 或
缺少的帳戶回應會透過
`codex_subscription_required` 跳過應用程式支援的外掛程式。根據預設，遷移不會呼叫來源
`app/list`；通過帳戶閘道的應用程式支援來源外掛程式會在不驗證來源應用程式可存取性的情況下進行規劃，且帳戶查閱傳輸
失敗會透過 `codex_account_unavailable` 跳過。啟用 `--verify-plugin-apps` 時，
遷移會取得全新的來源 `app/list` 快照，並要求每個擁有的應用程式
在規劃原生啟用之前必須存在、已啟用且可存取。在
該模式下，帳戶查閱傳輸失敗會落入來源
應用程式清單閘道。執行階段應用程式清單是遷移後的目標工作階段可存取性
檢查。Codex 鞍座工作階段設定接著會針對已啟用且可存取的外掛程式應用程式計算嚴格的
執行緒應用程式設定。

執行緒應用程式設定是在 OpenClaw 建立 Codex 鞍座工作階段
或取代過時的 Codex 執行緒繫結時計算的。它不會在每個回合重新計算，因此
`/codex plugins enable` 和 `/codex plugins disable` 會影響新的 Codex
對話。當目前的對話應該採用
更新的應用程式集時，請使用 `/new` 或 `/reset`。

## V1 支援邊界

V1 刻意保持狹窄：

- 執行階段設定接受 `openai-curated`、`openai-bundled` 和
  `openai-primary-runtime` 外掛程式身分識別。
- 只有在來源 Codex
  應用伺服器清單中已安裝的 `openai-curated` 外掛程式，才符合自動遷移的遷移資格。
- 應用程式支援的來源外掛程式必須通過遷移時期的訂閱閘道。
  `--verify-plugin-apps` 增加了來源應用程式清單閘道。受訂閱閘道限制的
  帳戶，以及在驗證模式下無法存取、已停用、遺失的來源
  應用程式或來源應用程式清單重新整理失敗，會被回報為略過的手動
  項目，而不是已啟用的設定項目。無法讀取的外掛程式詳細資訊會在
  來源應用程式清單閘道之前被略過。
- 遷移會使用 `marketplaceName` 和
  `pluginName` 寫入明確的外掛程式身分識別；它不會寫入本機 `marketplacePath` 快取路徑。
- `codexPlugins.enabled` 是全域啟用開關。
- 沒有 `plugins["*"]` 萬用字元，也沒有任何授予任意
  安裝權限的設定金鑰。
- 不支援的市集、快取的外掛套件、掛鉤和 Codex 設定檔會保留在遷移報告中以供手動審查。透過明確的 `codexPlugins` 設定，仍可手動新增打包的主要執行階段第一方外掛。

## 應用程式庫存與擁有權

OpenClaw 透過 app-server `app/list` 讀取 Codex 應用程式庫存，將其快取一小時，並以非同步方式重新整理過期或遺失的項目。此快取僅儲存在記憶體中；重新啟動 CLI 或閘道會將其捨棄，OpenClaw 會在下一次 `app/list` 讀取時重建它。

遷移和執行階段使用不同的快取鍵：

- 來源遷移驗證使用來源 Codex home 和來源 app-server 啟動選項。這僅在設定 `--verify-plugin-apps` 時執行，並且會強制該規劃執行進行全新的來源 `app/list` 遍歷。
- 目標執行時設置在建構 Codex 執行緒應用程式設定時，會使用目標代理程式的 Codex 應用伺服器身分識別。外掛程式啟用會使該目標快取金鑰失效，然後在 `plugin/install` 之後強制重新整理它。

只有當 OpenClaw 能透過穩定的擁有權將外掛程式應用程式對應回已遷移的外掛程式時，才會顯示該應用程式：

- 外掛程式詳細資料中的精確應用程式 ID
- 已知的 MCP 伺服器名稱
- 獨特的穩定元資料

僅顯示名稱或擁有權不明確的項目會被排除，直到下次清單重新整理證明其擁有權為止。

## 執行緒應用程式設定

OpenClaw 會為 Codex 執行緒注入限制性的 `config.apps` 修補程式：`_default` 已停用，且只有屬於已啟用之已遷移外掛程式的應用程式會被啟用。

OpenClaw 會根據有效的全域或單一外掛 `allow_destructive_actions` 政策設定應用程式層級的 `destructive_enabled`，並讓 Codex 從其原生應用程式工具註解中執行破壞性工具中繼資料。`_default` 應用程式設定會透過 `open_world_enabled: false` 停用。已啟用的外掛應用程式會透過 `open_world_enabled: true` 發出；OpenClaw 不會公開個別的外掛 open-world 政策控制項，也不會維護每個外掛的破壞性工具名稱拒絕清單。

外掛應用程式的工具核准模式預設為自動，因此非破壞性讀取工具可以在無需同執行緒核准 UI 的情況下執行。破壞性工具仍由每個應用程式的 `destructive_enabled` 政策控制。

## 破壞性操作政策

對於已遷移的 Codex 外掛程式，預設允許破壞性外掛程式引導，而不安全的綱要與模糊的所有權仍會以封閉式失敗處理：

- 全域 `allow_destructive_actions` 預設為 `true`。
- 各外掛程式的 `allow_destructive_actions` 會覆寫該外掛程式的全域原則。
- 當原則為 `false` 時，OpenClaw 會傳回確定性的拒絕。
- 當原則為 `true` 時，OpenClaw 只會自動接受可對應到核准回應的安全綱要，例如布林核准欄位。
- 若外掛程式識別資訊遺失、所有權模糊、遺失回合 ID、回合 ID 錯誤，或引導綱要不安全，則會拒絕而不會提示。

## 疑難排解

**`auth_required`：**遷移已安裝外掛程式，但其其中一個應用程式仍需驗證。明確的外掛程式條目會被寫入為已停用，直到您重新授權並啟用它。

**`app_inaccessible`、`app_disabled` 或 `app_missing`：**
遷移未安裝外掛程式，因為在設定 `--verify-plugin-apps` 時，來源 Codex 應用程式清單未顯示所有擁有的應用程式已存在、已啟用且可存取。請在 Codex 中重新授權或啟用應用程式，然後使用 `--verify-plugin-apps` 重新執行遷移。

**`app_inventory_unavailable`：**遷移未安裝外掛程式，因為
請求了嚴格的來源應用程式驗證，但來源 Codex 應用程式清單重新整理失敗。請修復來源 Codex 應用程式伺服器的存取權，或者如果您接受較快的帳戶閘道計劃，請在不含 `--verify-plugin-apps` 的情況下重試。

**`codex_subscription_required`：** 移轉並未安裝應用程式支援的
外掛程式，因為來源 Codex app-server 帳戶未以
ChatGPT 訂閱帳戶登入。請使用訂閱驗證登入 Codex 應用程式，
然後重新執行移轉。

**`codex_account_unavailable`：** 移轉並未安裝應用程式支援的外掛程式，
因為無法讀取來源 Codex app-server 帳戶。請修正來源 Codex
app-server 驗證，或如果您希望在帳戶查詢失敗時讓來源應用程式清單決定
資格，請使用 `--verify-plugin-apps` 重新執行。

**`marketplace_missing` 或 `plugin_missing`：** 目標 Codex 應用伺服器
無法看見預期的第一方市集或外掛。請對目標執行環境重新執行移轉、
檢查 Codex 應用伺服器的外掛狀態，或確認明確的 `marketplaceName` 為
`openai-curated`、`openai-bundled` 或
`openai-primary-runtime` 其中之一。

**`app_inventory_missing` 或 `app_inventory_stale`：** 應用就緒狀態來自
空白或過時的快取。OpenClaw 排程了非同步重新整理，並在知道擁有權和就緒
狀態之前排除外掛應用。

**`app_ownership_ambiguous`：** 應用清僅透過顯示名稱匹配，因此
該應用未對 Codex 執行緒公開。

**組態已變更但代理程式無法看見外掛程式：** 使用 `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`。現有的
Codex thread 繫結會保留其啟動時的應用程式組態，直到 OpenClaw
建立新的 harness 工作階段或取代過期的繫結。

**破壞性動作被拒絕：** 請檢查全域與各外掛程式的
`allow_destructive_actions` 值。即使原則為 true，不安全的引導架構
與不明確的外掛程式身分仍會導致失敗（採封閉原則）。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness 執行階段](/zh-Hant/plugins/codex-harness-runtime)
- [組態參考資料](/zh-Hant/gateway/configuration-reference#codex-harness-plugin-config)
- [移轉 CLI](/zh-Hant/cli/migrate)
