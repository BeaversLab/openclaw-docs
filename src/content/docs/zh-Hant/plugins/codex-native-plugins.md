---
summary: "Configure migrated native Codex plugins for Codex-mode OpenClaw agents"
title: "原生 Codex 外掛程式"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

原生 Codex 外掛程式支援功能讓 Codex 模式的 OpenClaw 代理程式，能夠在處理 OpenClaw 轉換的同一個 Codex 執行緒內，使用 Codex 應用程式伺服器本身的應用程式與外掛程式功能。

OpenClaw 不會將 Codex 外掛程式轉換為合成的 `codex_plugin_*` OpenClaw 動態工具。外掛程式呼叫會保留在原生 Codex 對話紀錄中，且由 Codex 應用程式伺服器擁有應用程式支援的 MCP 執行。

在基礎 [Codex harness](/zh-Hant/plugins/codex-harness) 運作後，請使用此頁面。

## 需求

- 選取的 OpenClaw 代理程式執行環境必須是原生 Codex harness。
- `plugins.entries.codex.enabled` 必須為 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必須為 true。
- V1 僅支援遷移觀察到在來源 Codex home 中以 source-installed 安裝的 `openai-curated` 外掛程式。
- 目標 Codex 應用程式伺服器必須能夠看到預期的 marketplace、外掛程式和應用程式清單。

`codexPlugins` 對 PI 執行、一般 OpenAI 提供者執行、ACP 對話綁定或其他 harness 沒有作用，因為這些路徑不會建立具有原生 `apps` 設定的 Codex 應用程式伺服器執行緒。

## 快速入門

從來源 Codex home 預覽遷移：

```bash
openclaw migrate codex --dry-run
```

當計畫看起來正確時，套用遷移：

```bash
openclaw migrate apply codex --yes
```

遷移會為符合條件的外掛程式寫入明確的 `codexPlugins` 項目，並為選取的外掛程式呼叫 Codex 應用程式伺服器 `plugin/install`。典型的遷移設定如下所示：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
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

變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便未來的 Codex harness 工作階段以更新的應用程式集啟動。

## 原生外掛程式設定運作方式

此整合有三種獨立狀態：

- 已安裝：Codex 在目標應用程式伺服器執行環境中擁有本地外掛程式套件。
- 已啟用：OpenClaw 設定願意讓外掛程式供 Codex harness 轉換使用。
- 可存取：Codex 應用程式伺服器確認外掛程式的應用程式項目可供作用中的帳戶使用，且可對應至遷移的外掛程式身分。

遷移是持久的安裝/資格步驟。執行時應用程式清單是可存取性檢查。Codex harness 會話設定接著會為已啟用且可存取的外掛應用程式計算限制性執行緒應用程式設定。

執行緒應用程式設定是在 OpenClaw 建立 Codex harness 會話或取代過時的 Codex 執行緒繫結時計算的。它不會在每個回合重新計算。

## V1 支援邊界

V1 故意設計得範圍狹窄：

- 只有在來源 Codex 應用程式伺服器清單中已安裝的 `openai-curated` 外掛才符合遷移資格。
- 遷移會使用 `marketplaceName` 和 `pluginName` 寫入明確的外掛身分識別；它不會寫入本機 `marketplacePath` 快取路徑。
- `codexPlugins.enabled` 是全域啟用開關。
- 沒有 `plugins["*"]` 萬用字元，也沒有授權任意安裝權限的設定金鑰。
- 不支援的市集、快取的外掛套件、掛鉤以及 Codex 設定檔會保留在遷移報告中以供手動審查。

## 應用程式清單與擁有權

OpenClaw 透過應用程式伺服器 `app/list` 讀取 Codex 應用程式清單，將其快取一小時，並以非同步方式重新整理過時或遺失的項目。

只有在 OpenClaw 能透過穩定的擁有權將外掛應用程式對應回已遷移的外掛時，才會將其公開：

- 來自外掛詳細資料的精確應用程式 ID
- 已知的 MCP 伺服器名稱
- 唯一的穩定中繼資料

僅顯示名稱或擁有權不明確的項目會被排除，直到下次清單重新整理證明其擁有權為止。

## 執行緒應用程式設定

OpenClaw 會為 Codex 執行緒注入限制性的 `config.apps` 修補程式：`_default` 已停用，且僅啟用屬於已啟用已遷移外掛的應用程式。

OpenClaw 根�有效的全域或個別外掛程式 `allow_destructive_actions` 原則設定應用程式層級的 `destructive_enabled`，並讓 Codex 從其原生應用程式工具註解中強制執行破壞性工具中繼資料。`_default` 應用程式設定已透過 `open_world_enabled: false` 停用。已啟用的外掛程式應用程式會透過 `open_world_enabled: true` 發出；OpenClaw 不會公開個別的外掛程式開放世界原則旋鈕，也不會維護各個外掛程式的破壞性工具名稱拒絕清單。

對於外掛程式應用程式，預設會提示工具核准模式，因為 OpenClaw 在此同執行緒路徑中沒有互動式應用程式引發 UI。

## 破壞性動作原則

破壞性外掛程式引發預設會以封閉方式失敗：

- 全域 `allow_destructive_actions` 預設為 `false`。
- 個別外掛程式的 `allow_destructive_actions` 會覆寫該外掛程式的全域原則。
- 當原則為 `false` 時，OpenClaw 會傳回確定性拒絕。
- 當原則為 `true` 時，OpenClaw 僅會自動接受其可對應至核准回應的安全綱要，例如布林值 approve 欄位。
- 如果外掛程式身分識別遺失、擁有權不明、輪次 ID 遺失、輪次 ID 錯誤，或引發綱要不安全，則會拒絕而不是提示。

## 疑難排解

**`auth_required`：** 移轉已安裝外掛程式，但其某個應用程式仍需要驗證。明確的外掛程式項目會寫入為已停用，直到您重新授權並啟用為止。

**`marketplace_missing` 或 `plugin_missing`：** 目標 Codex 應用程式伺服器無法看見預期的 `openai-curated` 市集或外掛程式。請對目標執行階段重新執行移轉，或檢查 Codex 應用程式伺服器外掛程式狀態。

**`app_inventory_missing` 或 `app_inventory_stale`：** 應用程式就緒度來自空的或過期的快取。OpenClaw 會排程非同步重新整理，並排除外掛程式應用程式，直到擁有權和就緒度已知為止。

**`app_ownership_ambiguous`：** 應用程式清查僅依顯示名稱比對，因此應用程式未對 Codex 執行緒公開。

**Config changed but the agent cannot see the plugin:** use `/new`, `/reset`, or
restart the gateway. Existing Codex thread bindings keep the app config they
started with until OpenClaw establishes a new harness session or replaces a
stale binding.

**Destructive action is declined:** check the global and per-plugin
`allow_destructive_actions` values. Even when policy is true, unsafe elicitation
schemas and ambiguous plugin identity still fail closed.

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Configuration reference](/zh-Hant/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrate CLI](/zh-Hant/cli/migrate)
