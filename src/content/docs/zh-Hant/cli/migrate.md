---
summary: "CLI 參考資料，適用於 `openclaw migrate`（從另一個代理系統匯入狀態）"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "遷移"
---

# `openclaw migrate`

透過外掛程式擁有的遷移提供者，從另一個代理系統匯入狀態。內建的提供者涵蓋 Codex CLI 狀態、[Claude](/zh-Hant/install/migrating-claude) 和 [Hermes](/zh-Hant/install/migrating-hermes)；第三方外掛程式可以註冊其他的提供者。

<Tip>如需使用者導覽，請參閱[從 Claude 遷移](/zh-Hant/install/migrating-claude)和[從 Hermes 遷移](/zh-Hant/install/migrating-hermes)。[遷移中心](/zh-Hant/install/migrating)列出了所有路徑。</Tip>

## 指令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
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
  建構計畫並退出，但不變更狀態。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆蓋來源狀態目錄。Hermes 預設為 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  匯入支援的認證資訊。預設為關閉。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  當計畫回報衝突時，允許套用作業置換現有目標。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳過確認提示。在非互動模式下為必填。
</ParamField>
<ParamField path="--skill <name>" type="string">
  依技能名稱或項目 ID 選取一個技能複製項目。重複此旗標以遷移多個技能。若省略，互動式 Codex 遷移會顯示核取方塊選擇器，而非互動式遷移則會保留所有計畫中的技能。
</ParamField>
<ParamField path="--plugin <name>" type="string">
  依外掛名稱或項目 ID 選取一個 Codex 外掛安裝項目。重複此旗標以遷移多個 Codex 外掛。若省略，互動式 Codex 遷移會顯示原生 Codex 外掛核取方塊選擇器，而非互動式遷移則會保留所有計畫中的外掛。這僅適用於由 Codex app-server inventory 發現的來源安裝 `openai-curated` Codex 外掛。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳過套用前的備份。當存在本機 OpenClaw 狀態時，需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  當套用作業否則會拒絕跳過備份時，需與 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式列印計畫或套用結果。若使用 `--json` 且無 `--yes`，則 apply 會列印計畫且不會變更狀態。
</ParamField>

## 安全模型

`openclaw migrate` 優先採用預覽模式。

<AccordionGroup>
  <Accordion title="套用前預覽">
    在進行任何變更之前，提供者會傳回一份詳細計畫，包括衝突、跳過的項目和敏感項目。JSON 計畫、套用輸出和遷移報告會編輯掉巢狀的機密外觀金鑰，例如 API 金鑰、權杖、授權標頭、Cookie 和密碼。

    `openclaw migrate apply <provider>` 會在變更狀態前預覽計畫並提示，除非設定了 `--yes`。在非互動模式下，套用需要 `--yes`。

  </Accordion>
  <Accordion title="備份">
    套用會在套用遷移之前建立並驗證 OpenClaw 備份。如果尚未存在本機 OpenClaw 狀態，則會跳過備份步驟並繼續遷移。若要在狀態存在時跳過備份，請同時傳遞 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="衝突">
    當計畫有衝突時，套用會拒絕繼續。請檢閱計畫，然後如果是刻意取代現有目標，請使用 `--overwrite` 重新執行。提供者仍可能會在遷移報告目錄中為被覆寫的檔案寫入項目層級的備份。
  </Accordion>
  <Accordion title="機密">
    預設情況下絕不會匯入機密。請使用 `--include-secrets` 來匯入支援的憑證。
  </Accordion>
</AccordionGroup>

## Claude 提供者

內建的 Claude 提供者預設會在 `~/.claude` 偵測 Claude Code 狀態。使用 `--from <path>` 來匯入特定的 Claude Code 家目錄或專案根目錄。

<Tip>如需面向使用者的逐步指南，請參閱[從 Claude 遷移](/zh-Hant/install/migrating-claude)。</Tip>

### Claude 匯入的內容

- 專案 `CLAUDE.md` 和 `.claude/CLAUDE.md` 會被匯入到 OpenClaw 代理程式工作區。
- 使用者 `~/.claude/CLAUDE.md` 會附加到工作區 `USER.md`。
- 來自專案 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 伺服器定義。
- 包含 `SKILL.md` 的 Claude 技能目錄。
- 轉換為僅支援手動呼叫之 OpenClaw 技能的 Claude 指令 Markdown 檔案。

### 封存與手動審查狀態

Claude hooks、權限、環境預設值、本地記憶體、路徑範圍規則、子代理、快取、計畫和專案歷史記錄會保留在遷移報告中，或作為手動審查項目回報。OpenClaw 不會執行 hooks、複製寬鬆的允許清單，或自動匯入 OAuth/桌面憑證狀態。

## Codex 提供者

內建的 Codex 提供者預設會在 `~/.codex` 偵測 Codex CLI 狀態，或者在設定了該環境變數時在 `CODEX_HOME` 偵測。使用 `--from <path>` 來列舉特定的 Codex 主目錄。

當您要移轉至 OpenClaw Codex harness 並且想要刻意提升有用的個人 Codex CLI 資產時，請使用此提供者。本機 Codex app-server 啟動會使用每個代理程式的 `CODEX_HOME` 和 `HOME` 目錄，因此它們預設不會讀取您的個人 Codex CLI 狀態。

在互動式終端機中執行 `openclaw migrate codex` 會預覽完整計畫，然後在最終套用確認之前開啟核取方塊選擇器。首先會提示技能複製項目。使用 `Toggle all on` 或 `Toggle all off` 進行大量選取；計畫的技能預設為已勾選，衝突的技能預設為未勾選，而 `Skip for now` 會跳過此執行的技能複製，同時繼續進行外掛程式選取。當來源安裝的策展 Codex 外掛程式可移轉且未提供 `--plugin` 時，移轉接著會依外掛程式名稱提示啟用原生 Codex 外掛程式。除非目標 OpenClaw Codex 外掛程式設定已有該外掛程式，否則外掛程式項目預設為已勾選。現有的目標外掛程式預設為未勾選，並顯示諸如 `conflict: plugin exists` 的衝突提示；選擇 `Toggle all off` 可在該執行中不移轉任何原生 Codex 外掛程式，或選擇 `Skip for now` 在套用前停止。對於腳本或精確執行，每個技能傳遞 `--skill <name>` 一次，例如：

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

使用 `--plugin <name>` 以非互動方式將原生 Codex 外掛程式移轉限制為一或多個來源安裝的策展外掛程式：

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Codex 匯入的內容

- `$CODEX_HOME/skills` 下的 Codex CLI 技能目錄，排除 Codex 的
  `.system` 快取。
- `$HOME/.agents/skills` 下的個人 AgentSkills，當您想要每個代理程式的擁有權時，會複製到目前的
  OpenClaw 代理程式工作區。
- 透過 Codex 應用程式伺服器 `plugin/list` 發現的來源安裝 `openai-curated` Codex 外掛程式。Apply 會針對每個選定的外掛程式呼叫應用程式伺服器 `plugin/install`，即使目標應用程式伺服器已經回報該外掛程式已安裝並啟用。遷移的 Codex 外掛程式只能在選擇原生 Codex harness 的工作階段中使用；它們不會暴露給 Pi、一般的 OpenAI provider 執行、ACP 對話綁定或其他 harness。

### 手動審查 Codex 狀態

Codex `config.toml`、原生 `hooks/hooks.json`、非策展市集，以及非來源安裝之策展外掛程式的快取外掛程式組合不會自動啟用。它們會被複製或在遷移報告中回報以供手動審查。

對於遷移的來源安裝策展外掛程式，apply 會寫入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: false`
- 每個選定的外掛程式都有一個明確的外掛程式項目，包含 `marketplaceName: "openai-curated"` 和
  `pluginName`

遷移絕不會寫入 `plugins["*"]`，也絕不會儲存本機市集快取
路徑。需要授權的安裝會在受影響的外掛程式項目上回報
`status: "skipped"`、`reason: "auth_required"` 和已清理的應用程式識別碼。
它們的明確組態項目會被寫入為停用狀態，直到您重新授權並
啟用它們。其他安裝失敗則是項目範圍的 `error` 結果。

如果在規劃期間無法取得 Codex 應用程式伺服器外掛程式清單，遷移
會改為使用快取的組合建議項目，而不是讓整個
遷移失敗。

## Hermes 提供者

隨附的 Hermes 提供者預設會偵測 `~/.hermes` 的狀態。當 Hermes 位於其他位置時，請使用 `--from <path>`。

### Hermes 匯入的內容

- 來自 `config.yaml` 的預設模型組態。
- 來自 `providers` 和 `custom_providers` 的已設定模型提供者和自訂 OpenAI 相容端點。
- 來自 `mcp_servers` 或 `mcp.servers` 的 MCP 伺服器定義。
- `SOUL.md` 和 `AGENTS.md` 匯入到 OpenClaw 代理工作區。
- `memories/MEMORY.md` 和 `memories/USER.md` 附加到工作區記憶體檔案。
- OpenClaw 檔案記憶體的記憶體配置預設值，以及外部記憶體提供者（例如 Honcho）的封存或手動審查項目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 檔案的技能。
- 來自 `skills.config` 的各別技能配置值。
- 來自 `.env` 的支援 API 金鑰，僅限搭配 `--include-secrets` 使用。

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

在執行時，外掛程式會呼叫 `api.registerMigrationProvider(...)`。提供者會實作 `detect`、`plan` 和 `apply`。核心擁有 CLI 協調、備份策略、提示、JSON 輸出和衝突預檢。核心會將審查後的計劃傳遞給 `apply(ctx, plan)`，且提供者僅在為了相容性而缺少該引數時才會重建計劃。

提供者外掛程式可以使用 `openclaw/plugin-sdk/migration` 進行項目建構和摘要計數，以及使用 `openclaw/plugin-sdk/migration-runtime` 進行具備衝突感知的檔案複製、僅限歸檔的報告複製、快取的設定執行時期包裝器，以及遷移報告。

## 入門整合

當提供者偵測到已知的來源時，入門流程可以提供遷移選項。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的外掛程式遷移提供者，並在套用前仍會顯示預覽。

<Note>入門匯入需要全新的 OpenClaw 設定。如果您已有本機狀態，請先重設設定、憑證、工作階段和工作區。針對現有設定，「備份後覆寫」或「合併匯入」功能已開啟功能開關。</Note>

## 相關

- [從 Hermes 遷移](/zh-Hant/install/migrating-hermes)：使用者導覽。
- [從 Claude 遷移](/zh-Hant/install/migrating-claude)：使用者導覽。
- [遷移](/zh-Hant/install/migrating)：將 OpenClaw 移動到新機器。
- [Doctor](/zh-Hant/gateway/doctor)：套用遷移後的健康檢查。
- [外掛程式](/zh-Hant/tools/plugin)：外掛程式安裝和註冊。
