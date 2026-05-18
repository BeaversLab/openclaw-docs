---
summary: "CLI 參考手冊，用於 `openclaw migrate`（從另一個代理系統匯入狀態）"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "遷移"
---

# `openclaw migrate`

透過外掛程式擁有的移轉提供者，從另一個代理程式系統匯入狀態。隨附的提供者涵蓋 Codex CLI 狀態、[Claude](/zh-Hant/install/migrating-claude) 和 [Hermes](/zh-Hant/install/migrating-hermes)；第三方外掛程式可以註冊額外的提供者。

<Tip>若要查看使用者導向的逐步指南，請參閱[從 Claude 移轉](/zh-Hant/install/migrating-claude) 和 [從 Hermes 移轉](/zh-Hant/install/migrating-hermes)。[移轉中心](/zh-Hant/install/migrating) 列出了所有路徑。</Tip>

## 指令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
openclaw migrate codex --plugin google-calendar --verify-plugin-apps --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --plugin google-calendar
openclaw migrate apply codex --yes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  已註冊的遷移提供者名稱，例如 `hermes`。執行 `openclaw migrate list` 以查看已安裝的提供者。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  建置計畫並結束，而不變更狀態。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆寫來源狀態目錄。Hermes 預設為 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  匯入支援的認證。預設為關閉。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  當計畫回報衝突時，允許套用取代現有目標。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳過確認提示。在非互動模式下為必要項。
</ParamField>
<ParamField path="--skill <name>" type="string">
  依技能名稱或項目 ID 選取一個技能複製項目。重複此旗標以遷移多個技能。省略時，互動式 Codex 遷移會顯示核取方塊選擇器，而非互動式遷移則會保留所有計畫的技能。
</ParamField>
<ParamField path="--plugin <name>" type="string">
  依外掛程式名稱或項目 ID 選取一個 Codex 外掛程式安裝項目。重複此旗標以遷移多個 Codex 外掛程式。省略時，互動式 Codex 遷移會顯示原生 Codex 外掛程式核取方塊選擇器，而非互動式遷移則會保留所有計畫的外掛程式。這僅適用於由 Codex app-server 清單探索到的來源安裝 `openai-curated` Codex 外掛程式。
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  僅限 Codex。在規劃原生外掛程式啟動之前，強制重新來源 Codex app-server `app/list` 遍歷。預設為關閉，以保持遷移規劃快速。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳過預先套用備份。當存在本機 OpenClaw 狀態時，需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  當套用原本會拒絕跳過備份時，需要搭配 `--no-backup` 使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式列印計畫或套用結果。搭配 `--json` 且沒有 `--yes` 時，apply 會列印計畫且不會變更狀態。
</ParamField>

## 安全模型

`openclaw migrate` 是預覽優先的。

<AccordionGroup>
  <Accordion title="套用前預覽">
    在進行任何變更之前，提供者會傳回一份逐項計劃，包括衝突、略過項目和敏感項目。JSON 計劃、套用輸出和移轉報告會編輯巢狀的機密外觀金鑰，例如 API 金鑰、權杖、授權標頭、Cookie 和密碼。

    `openclaw migrate apply <provider>` 會在變更狀態前預覽計劃並提示，除非設定了 `--yes`。在非互動模式下，套用需要 `--yes`。

  </Accordion>
  <Accordion title="備份">
    套用會在套用移轉之前建立並驗證 OpenClaw 備份。如果尚未存在本機 OpenClaw 狀態，則會略過備份步驟且移轉可以繼續。若要在狀態存在時略過備份，請同時傳遞 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="衝突">
    當計劃有衝突時，套用會拒絕繼續。請檢閱計劃，如果替換現有目標是有意的，則使用 `--overwrite` 重新執行。提供者仍可能會在移轉報告目錄中為被覆寫的檔案寫入項目層級的備份。
  </Accordion>
  <Accordion title="機密">
    預設絕不會匯入機密。使用 `--include-secrets` 來匯入支援的憑證。
  </Accordion>
</AccordionGroup>

## Claude 提供者

內建的 Claude 提供者預設會在 `~/.claude` 偵測 Claude Code 狀態。使用 `--from <path>` 來匯入特定的 Claude Code 家目錄或專案根目錄。

<Tip>若要查看使用者導向的逐步指南，請參閱[從 Claude 移轉](/zh-Hant/install/migrating-claude)。</Tip>

### Claude 匯入的內容

- 專案 `CLAUDE.md` 和 `.claude/CLAUDE.md` 到 OpenClaw 代理程式工作區。
- 使用者 `~/.claude/CLAUDE.md` 附加到工作區 `USER.md`。
- 來自專案 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 伺服器定義。
- 包含 `SKILL.md` 的 Claude 技能目錄。
- 轉換為僅支援手動呼叫之 OpenClaw 技能的 Claude 指令 Markdown 檔案。

### 封存與手動審查狀態

Claude hooks、權限、環境預設值、本地記憶體、路徑範圍規則、子代理、快取、計畫和專案歷史記錄會保留在遷移報告中，或作為手動審查項目回報。OpenClaw 不會執行 hooks、複製寬鬆的允許清單，或自動匯入 OAuth/桌面憑證狀態。

## Codex 提供者

內建的 Codex 提供者預設會在 `~/.codex` 偵測 Codex CLI 狀態，或在設定了該環境變數時於 `CODEX_HOME` 偵測。請使用 `--from <path>` 來清點特定的 Codex 家目錄。

當您轉移至 OpenClaw Codex 操控器並希望刻意提升有用的個人 Codex CLI 資產時，請使用此提供者。本機 Codex 應用程式伺服器啟動會使用每個代理程式專屬的 `CODEX_HOME`，因此依預設它們不會讀取您的個人 `~/.codex`。正常的程序 `HOME` 仍會被繼承，因此 Codex 可以看到共用的 `$HOME/.agents/*` 技能/外掛程式市集條目，且子程序可以找到使用者主目錄設定和權杖。

在互動式終端機中執行 `openclaw migrate codex` 會預覽完整計畫，然後在最終套用確認之前開啟核取方塊選擇器。首先會提示技能複製項目。使用 `Toggle all on` 或 `Toggle all off` 進行批次選取。按空白鍵切換列，或按 Enter 鍵啟動反白列並繼續。計畫的技能預設已勾選，衝突的技能預設未勾選，而 `Skip for now` 會略過此執行的技能複製，但仍繼續外掛程式選取。當來源安裝的策展 Codex 外掛程式可遷移且未提供 `--plugin` 時，遷移接著會提示依外掛程式名稱啟用原生 Codex 外掛程式。除非目標 OpenClaw Codex 外掛程式設定已有該外掛程式，否則外掛程式項目預設已勾選。現有的目標外掛程式預設未勾選，並顯示衝突提示，例如 `conflict: plugin exists`；選擇 `Toggle all off` 可在該執行中不遷移任何原生 Codex 外掛程式，或選擇 `Skip for now` 可在套用前停止。對於指令碼或精確執行，請針對每個技能傳遞一次 `--skill <name>`，例如：

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

使用 `--plugin <name>` 以非互動方式將原生 Codex 外掛程式遷移限制為一或多個來源安裝的策展外掛程式：

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Codex 匯入的內容

- `$CODEX_HOME/skills` 下的 Codex CLI 技能目錄，不包括 Codex 的 `.system` 快取。
- `$HOME/.agents/skills` 下的個人 AgentSkills，當您需要每個代理程式擁有權時，會複製到目前的 OpenClaw 代理程式工作區。
- 透過 Codex 應用程式伺服器 `plugin/list` 探索原始碼安裝的 `openai-curated` Codex 外掛。規劃會讀取每個已啟用安裝外掛的 `plugin/read`。應用程式支援的外掛需要來源 Codex 應用程式伺服器帳戶回應為 ChatGPT 訂閱帳戶；非 ChatGPT 或遺失的帳戶回應會以 `codex_subscription_required` 跳過。預設情況下，遷移不會呼叫來源 `app/list`，因此通過帳戶閘道的應用程式支援外掛會在未驗證來源應用程式可存取性的情況下進行規劃，且帳戶查詢傳輸失敗會以 `codex_account_unavailable` 跳過。當您希望遷移強制重新擷取來源 `app/list` 快照，並要求每個擁有的應用程式在規劃原生啟用之前必須存在、已啟用且可存取時，請傳遞 `--verify-plugin-apps`。在該模式下，帳戶查詢傳輸失敗會導致來源應用程式庫存驗證。來源應用程式庫存快照會保留在目前進程的記憶體中；它不會寫入遷移輸出或目標設定。停用的外掛、無法讀取的外掛詳細資訊、訂閱限制的來源帳戶，以及當要求驗證時，遺失的應用程式、停用的應用程式、無法存取的應用程式或來源應用程式庫存失敗，將會成為具有輸入原因的手動跳過項目，而非目標設定項目。Apply 會針對每個選取的合格外掛呼叫應用程式伺服器 `plugin/install`，即使目標應用程式伺服器已經報告該外掛已安裝並啟用。遷移的 Codex 外掛僅可在選擇原生 Codex 駝具的會話中使用；它們不會暴露給 Pi、一般 OpenAI 提供者執行、ACP 對話綁定或其他駝具。

### 手動審查 Codex 狀態

Codex `config.toml`、原生 `hooks/hooks.json`、非策展市集、非來源安裝策展外掛的快取外掛綑綁包，以及未通過來源訂閱閘道的來源安裝外掛，不會自動啟用。當設定 `--verify-plugin-apps` 時，未通過來源應用程式庫存閘道的外掛也會被跳過。它們會被複製或在遷移報告中回報以供手動審查。

對於遷移的來源安裝策展外掛程式，apply 會寫入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- 每個選取的外掛程式有一個明確的外掛程式項目，包含 `marketplaceName: "openai-curated"` 和
  `pluginName`

移轉絕不會寫入 `plugins["*"]`，也絕不會儲存本地市集快取
路徑。來源端的訂閱失敗會在項目上回報，並附上類型化原因，例如 `codex_subscription_required`、`codex_account_unavailable`、
`plugin_disabled` 或 `plugin_read_unavailable`。使用 `--verify-plugin-apps` 時，
來源端應用程式庫存失敗也可能顯示為 `app_inaccessible`、
`app_disabled`、`app_missing` 或 `app_inventory_unavailable`。被跳過的外掛程式
不會寫入目標設定。
目標端需要驗證的安裝作業會在受影響的外掛程式項目上回報，包含
`status: "skipped"`、`reason: "auth_required"` 和經過清理的應用程式識別碼。
其明確的設定項目會以停用狀態寫入，直到您重新授權並
啟用它們。其他安裝失敗則是項目範圍的 `error` 結果。

如果在規劃期間無法取得 Codex 應用程式伺服器外掛程式清單，遷移
會改為使用快取的組合建議項目，而不是讓整個
遷移失敗。

## Hermes 提供者

內建的 Hermes 提供者預設會偵測 `~/.hermes` 的狀態。當 Hermes 位於其他位置時，請使用 `--from <path>`。

### Hermes 匯入的內容

- 來自 `config.yaml` 的預設模型設定。
- 來自 `providers` 和 `custom_providers` 的已設定模型提供者和自訂 OpenAI 相容端點。
- 來自 `mcp_servers` 或 `mcp.servers` 的 MCP 伺服器定義。
- 將 `SOUL.md` 和 `AGENTS.md` 匯入至 OpenClaw 代理程式工作區。
- 附加至工作區記憶體檔案的 `memories/MEMORY.md` 和 `memories/USER.md`。
- OpenClaw 檔案記憶體的記憶體配置預設值，以及外部記憶體提供者（例如 Honcho）的封存或手動審查項目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 檔案的技能。
- 來自 `skills.config` 的個別技能設定值。
- 來自 `.env` 的支援 API 金鑰，僅限使用 `--include-secrets`。

### 支援的 `.env` 金鑰

`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。

### 僅封存狀態

OpenClaw 無法安全解讀的 Hermes 狀態會被複製到遷移報告中以供手動審查，但不會載入到即時的 OpenClaw 配置或認證中。這可以在不假裝 OpenClaw 可以自動執行或信任的情況下保留不透明或不安全的狀態：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

### 套用後

```bash
openclaw doctor
```

## 外掛程式合約

遷移來源是外掛程式。外掛程式在 `openclaw.plugin.json` 中宣告其提供者 ID：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

在執行時期，外掛程式會呼叫 `api.registerMigrationProvider(...)`。提供者會實作 `detect`、`plan` 和 `apply`。核心擁有 CLI 協調、備份策略、提示、JSON 輸出和衝突預檢的控制權。核心會將審查過的計劃傳遞給 `apply(ctx, plan)`，而為了相容性，提供者僅能在該參數不存在時重建計劃。

提供者外掛程式可以使用 `openclaw/plugin-sdk/migration` 來建構項目和計算摘要計數，並使用 `openclaw/plugin-sdk/migration-runtime` 進行具備衝突感知的檔案複製、僅封存的報告複製、快取的配置執行時期包裝器，以及遷移報告。

## 入門整合

當提供者偵測到已知來源時，入職流程可以提供遷移選項。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的外掛程式遷移提供者，並且在套用前仍會顯示預覽。

<Note>入門匯入需要全新的 OpenClaw 設定。如果您已有本機狀態，請先重設設定、憑證、工作階段和工作區。針對現有設定，「備份後覆寫」或「合併匯入」功能已開啟功能開關。</Note>

## 相關

- [從 Hermes 遷移](/zh-Hant/install/migrating-hermes)：面向使用者的逐步指南。
- [從 Claude 遷移](/zh-Hant/install/migrating-claude)：面向使用者的逐步指南。
- [遷移](/zh-Hant/install/migrating)：將 OpenClaw 移動到新機器。
- [Doctor](/zh-Hant/gateway/doctor)：套用遷移後的健康檢查。
- [外掛程式](/zh-Hant/tools/plugin)：外掛程式安裝與註冊。
