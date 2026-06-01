---
summary: "為 Codex 模式 OpenClaw 代理程式設定已遷移的原生 Codex 外掛程式"
title: "原生 Codex 外掛程式"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

原生 Codex 外掛程式支援功能讓 Codex 模式的 OpenClaw 代理程式，能夠在處理 OpenClaw 轉換的同一個 Codex 執行緒內，使用 Codex 應用程式伺服器本身的應用程式與外掛程式功能。

OpenClaw 不會將 Codex 外掛程式轉換為合成 `codex_plugin_*`
OpenClaw 動態工具。外掛程式呼叫會保留在原生 Codex 轉錄中，且
Codex app-server 擁有應用程式支援的 MCP 執行。

在基本 [Codex 套件](/zh-Hant/plugins/codex-harness) 正常運作後，請使用此頁面。

## 需求

- 選取的 OpenClaw 代理程式執行環境必須是原生 Codex harness。
- `plugins.entries.codex.enabled` 必須為 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必須為 true。
- V1 僅支援遷移在來源 Codex 主目錄中觀察到
  已來源安裝的 `openai-curated` 外掛程式。
- 目標 Codex 應用程式伺服器必須能夠看到預期的 marketplace、外掛程式和應用程式清單。

`codexPlugins` 對 OpenClaw 執行、一般 OpenAI 提供者執行、ACP 對話繫結或其他線程沒有影響，因為這些路徑不會建立具有原生 `apps` 設定的 Codex 應用伺服器執行緒。

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

遷移會為符合條件的外掛程式寫入明確的 `codexPlugins` 項目，並
針對選定的外掛程式呼叫 Codex app-server `plugin/install`。典型的遷移
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

變更 `codexPlugins` 後，新的 Codex 交談會自動
擷取更新的應用程式集合。使用 `/new` 或 `/reset` 來重新整理目前交談。
啟用或停用外掛程式的變更不需要重新啟動閘道。

## 從聊天室管理外掛程式

當您想要從操作 Codex 套件的相同聊天室中
檢查或變更已設定的原生 Codex 外掛程式時，請使用 `/codex plugins`：

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` 是 `/codex plugins list` 的別名。清單輸出會顯示
來自 `plugins.entries.codex.config.codexPlugins.plugins` 的已設定外掛程式金鑰、開/關狀態、Codex 外掛程式名稱和市集。

`enable` 和 `disable` 僅寫入至
`~/.openclaw/openclaw.json` 處的 OpenClaw 設定；它們不會編輯 `~/.codex/config.toml` 或安裝
新的 Codex 外掛程式。只有擁有者或具有
`operator.admin` 範圍的閘道用戶端可以變更外掛程式狀態。

啟用已配置的外掛程式也會開啟全域
`codexPlugins.enabled` 開關。如果外掛程式因為遷移回傳 `auth_required` 而被寫入為停用狀態，請在 OpenClaw 中啟用它之前，先在 Codex 中重新授權該應用程式。

## 原生外掛程式設定運作方式

此整合有三個獨立的狀態：

- 已安裝：Codex 在目標應用程式伺服器執行時間中擁有本機外掛程式套件。
- 已啟用：OpenClaw 設定願意提供外掛程式給 Codex
  套件回合使用。
- 可存取：Codex 應用程式伺服器確認外掛程式的應用程式項目可供
  使用中的帳戶使用，並且可以對應到已遷移的外掛程式身分。

遷移是持久的安裝/資格步驟。在規劃期間，OpenClaw
會讀取來源 Codex `plugin/read` 詳細資料，並檢查來源 Codex
應用程式伺服器帳戶回應是否為 ChatGPT 訂閱帳戶。非 ChatGPT 或
遺失的帳戶回應會使用
`codex_subscription_required` 跳過應用程式支援的外掛程式。預設情況下，遷移不會呼叫來源
`app/list`；通過帳戶閘道的應用程式支援來源外掛程式會在不進行來源應用程式可存取性驗證的情況下進行規劃，且帳戶查詢傳輸
失敗會以 `codex_account_unavailable` 跳過。使用 `--verify-plugin-apps` 時，
遷移會取得全新的來源 `app/list` 快照，並要求每個擁有的應用程式
在規劃原生啟動之前必須存在、已啟用且可存取。在
該模式下，帳戶查詢傳輸失敗會落入來源
應用程式清單閘道。執行時間應用程式清單是遷移後的目標工作階段可存取性
檢查。Codex 套件工作階段設定接著會針對已啟用且可存取的外掛程式應用程式計算限制性
執行緒應用程式設定。

執行緒應用程式設定是在 OpenClaw 建立 Codex 套件工作階段
或取代過時的 Codex 執行緒繫結時計算的。它不會在每個回合重新計算，因此
`/codex plugins enable` 和 `/codex plugins disable` 會影響新的 Codex
對話。當目前對話應該採用
更新的應用程式集合時，請使用 `/new` 或 `/reset`。

## V1 支援範圍

V1 是刻意狹隘的：

- 僅有已在來源 Codex 應用程式伺服器清單中安裝的 `openai-curated` 外掛程式符合遷移資格。
- 應用程式支援的來源外掛程式必須通過遷移時的訂閱閘道。`--verify-plugin-apps` 增加了來源應用程式清單閘道。受訂閱閘道的帳戶，以及在驗證模式下無法存取、已停用、遺失的來源應用程式或來源應用程式清單重新整理失敗，會被回報為略過的手動項目，而非已啟用的設定項目。無法讀取的外掛程式詳細資訊會在來源應用程式清單閘道之前被略過。
- 遷移會使用 `marketplaceName` 和 `pluginName` 寫入明確的外掛程式身分識別；它不會寫入本機 `marketplacePath` 快取路徑。
- `codexPlugins.enabled` 是全域啟用開關。
- 沒有 `plugins["*"]` 萬用字元，也沒有授予任意安裝權限的設定金鑰。
- 不支援的市集、快取的外掛程式套件、掛鉤 和 Codex 設定檔會保留在遷移報告中以供手動審查。

## 應用程式清單與擁有權

OpenClaw 透過應用程式伺服器 `app/list` 讀取 Codex 應用程式清單，將其快取一小時，並以非同步方式重新整理過期或遺失的項目。快取僅存在於記憶體中；重新啟動 CLI 或閘道會將其捨棄，而 OpenClaw 會在下一次讀取 `app/list` 時重建它。

遷移和執行階段使用個別的快取金鑰：

- 來源遷移驗證使用來源 Codex 家目錄和來源應用程式伺服器啟動選項。這僅在設定 `--verify-plugin-apps` 時執行，並且會強制對該規劃執行進行全新的來源 `app/list` 巡覽。
- 目標執行階段設定會在建置 Codex 執行緒應用程式設定時使用目標代理程式的 Codex 應用程式伺服器身分識別。外掛程式啟動會使該目標快取金鑰失效，然後在 `plugin/install` 之後強制重新整理它。

只有當 OpenClaw 能透過穩定的擁有權將外掛程式應用程式對應回已遷移的外掛程式時，才會公開該應用程式：

- 來自外掛程式詳細資訊的確切應用程式 ID
- 已知的 MCP 伺服器名稱
- 唯一的穩定中繼資料

僅有顯示名稱或模糊的擁有權會被排除，直到下一次清單重新整理證明擁有權為止。

## 執行緒應用程式設定

OpenClaw 會為 Codex 執行緒注入一個限制性的 `config.apps` 修補程式：
`_default` 已停用，並且僅啟用由已啟用遷移外掛程式所擁有的應用程式。

OpenClaw 根據有效的全域或個別外掛程式 `allow_destructive_actions` 政策設定應用程式層級的 `destructive_enabled`，並讓 Codex 從其原生應用程式工具註解中執行破壞性工具中繼資料。`_default` 應用程式設定會透過 `open_world_enabled: false` 停用。已啟用的外掛程式應用程式會使用 `open_world_enabled: true` 發出；OpenClaw 不會公開個別的外掛程式開放世界政策旋鈕，也不會維護個別外掛程式的破壞性工具名稱拒絕清單。

對於外掛程式應用程式，工具核准模式預設為自動，因此非破壞性的讀取工具可以在無需同執行緒核准 UI 的情況下執行。破壞性工具仍受每個應用程式的 `destructive_enabled` 政策控制。

## 破壞性動作政策

對於已遷移的 Codex 外掛程式，預設允許破壞性外掛程式引導，但不安全的架構和模糊的擁有權仍會失敗並封閉：

- 全域 `allow_destructive_actions` 預設為 `true`。
- 個別外掛程式的 `allow_destructive_actions` 會覆寫該外掛程式的全域政策。
- 當政策為 `false` 時，OpenClaw 會傳回確定性拒絕。
- 當政策為 `true` 時，OpenClaw 只會自動接受其能對應至核准回應的安全架構，例如布林值核准欄位。
- 缺少外掛程式身分識別、模糊的擁有權、缺少回合 ID、錯誤的回合 ID 或不安全的引導架構會拒絕，而不會提示。

## 疑難排解

**`auth_required`：** 遷移已安裝此外掛程式，但其某個應用程式仍需要驗證。明確的外掛程式項目會被寫入為停用狀態，直到您重新授權並啟用它。

**`app_inaccessible`、`app_disabled` 或 `app_missing`：**
移作業未安裝此外掛，因為來源 Codex 應用程式清單在設定
`--verify-plugin-apps` 時，並未顯示所有擁有的應用程式為存在、已啟用且可存取。
請在 Codex 中重新授權或啟用應用程式，然後使用 `--verify-plugin-apps` 重新執行移作業。

**`app_inventory_unavailable`：** 移作業未安裝此外掛，因為
要求嚴格的來源應用程式驗證，且來源 Codex 應用程式清單
重新整理失敗。請修復來源 Codex 應用程式伺服器的存取權，或者如果您接受較快的帳戶閘道計劃，請在不使用
`--verify-plugin-apps` 的情況下重試。

**`codex_subscription_required`：** 移作業未安裝應用程式支援的
外掛，因為來源 Codex 應用程式伺服器帳戶並未使用
ChatGPT 訂閱帳戶登入。請使用訂閱驗證登入 Codex 應用程式，
然後重新執行移作業。

**`codex_account_unavailable`：** 移作業未安裝應用程式支援的外掛，
因為無法讀取來源 Codex 應用程式伺服器帳戶。請修復來源 Codex
應用程式伺服器的驗證，或如果您希望當帳戶查詢失敗時由來源應用程式
清單來決定資格，請使用 `--verify-plugin-apps` 重新執行。

**`marketplace_missing` 或 `plugin_missing`：** 目標 Codex 應用程式伺服器
無法看到預期的 `openai-curated` 市集或外掛。請對目標執行階段重新執行
移作業，或檢查 Codex 應用程式伺服器的外掛狀態。

**`app_inventory_missing` 或 `app_inventory_stale`：** 應用程式就緒狀態來自
空白的或過期的快取。OpenClaw 排定了非同步重新整理，並會排除外掛
應用程式，直到知道擁有權和就緒狀態為止。

**`app_ownership_ambiguous`：** 應用程式清單僅依顯示名稱相符，因此
該應用程式未公開給 Codex 執行緒。

**設定已變更但代理程式無法看到此外掛：** 請使用 `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`。現有的
Codex 執行緒繫結會保留其開始時的應用程式設定，直到 OpenClaw
建立新的繫線階段作業或替換過期的繫結為止。

**破壞性動作被拒絕：** 請檢查全域和各個外掛程式的 `allow_destructive_actions` 值。即使原則為 true，不安全的引發結構描述和不明確的外掛程式身分識別仍會失敗並關閉。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Configuration reference](/zh-Hant/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrate CLI](/zh-Hant/cli/migrate)
