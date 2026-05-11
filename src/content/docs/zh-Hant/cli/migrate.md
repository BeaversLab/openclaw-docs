---
summary: "用於 `openclaw migrate` 的 CLI 參考（從另一個代理系統匯入狀態）"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "遷移"
---

# `openclaw migrate`

透過外掛程式擁有的遷移提供者，從另一個代理系統匯入狀態。內建的提供者涵蓋 [Claude](/zh-Hant/install/migrating-claude) 和 [Hermes](/zh-Hant/install/migrating-hermes)；第三方外掛程式可以註冊額外的提供者。

<Tip>如需使用者導覽，請參閱[從 Claude 遷移](/zh-Hant/install/migrating-claude)和[從 Hermes 遷移](/zh-Hant/install/migrating-hermes)。[遷移中心](/zh-Hant/install/migrating)列出所有路徑。</Tip>

## 指令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  註冊的遷移提供者名稱，例如 `hermes`。執行 `openclaw migrate list` 以查看已安裝的提供者。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  建置計劃並退出，不變更狀態。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆寫來源狀態目錄。Hermes 預設為 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  匯入支援的憑證。預設為關閉。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  當計劃回報衝突時，允許 apply 取代現有的目標。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳過確認提示。在非互動模式下為必填。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳過套用前的備份。當本地 OpenClaw 狀態存在時，需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  當 apply 否則會拒絕跳過備份時，需要搭配 `--no-backup` 使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式列印計劃或套用結果。搭配 `--json` 且沒有 `--yes` 時，apply 會列印計劃並且不變更狀態。
</ParamField>

## 安全模型

`openclaw migrate` 優先採用預覽模式。

<AccordionGroup>
  <Accordion title="套用前預覽">
    在任何變更之前，提供者會傳回詳細計畫，包括衝突、跳過的項目和敏感項目。JSON 計畫、套用輸出和遷移報告會編輯巢狀的機密外觀金鑰，例如 API 金鑰、權杖、授權標頭、Cookie 和密碼。

    `openclaw migrate apply <provider>` 會預覽計畫並在變更狀態前提示，除非設定了 `--yes`。在非互動模式中，套用需要 `--yes`。

  </Accordion>
  <Accordion title="備份">
    Apply 在套用遷移之前會建立並驗證 OpenClaw 備份。如果尚未存在本機 OpenClaw 狀態，則會跳過備份步驟，且遷移可以繼續。若要在狀態存在時跳過備份，請同時傳遞 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="衝突">
    當計畫有衝突時，Apply 會拒絕繼續。檢閱計畫，然後如果是有意替換現有目標，請使用 `--overwrite` 重新執行。提供者仍可能會在遷移報告目錄中為被覆寫的檔案寫入項目層級的備份。
  </Accordion>
  <Accordion title="機密">
    預設情況下永遠不會匯入機密。使用 `--include-secrets` 來匯入支援的憑證。
  </Accordion>
</AccordionGroup>

## Claude 提供者

內建的 Claude 提供者預設會在 `~/.claude` 偵測 Claude Code 狀態。使用 `--from <path>` 來匯入特定的 Claude Code 家目錄或專案根目錄。

<Tip>如需使用者導覽，請參閱[從 Claude 遷移](/zh-Hant/install/migrating-claude)。</Tip>

### Claude 匯入的內容

- 專案 `CLAUDE.md` 和 `.claude/CLAUDE.md` 到 OpenClaw 代理程式工作區。
- 使用者 `~/.claude/CLAUDE.md` 附加至工作區 `USER.md`。
- 來自專案 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 伺服器定義。
- 包含 `SKILL.md` 的 Claude 技能目錄。
- 轉換為僅支援手動呼叫之 OpenClaw 技能的 Claude 指令 Markdown 檔案。

### 封存與手動審查狀態

Claude hooks、權限、環境預設值、本地記憶體、路徑範圍規則、子代理、快取、計畫和專案歷史記錄會保留在遷移報告中，或作為手動審查項目回報。OpenClaw 不會執行 hooks、複製寬鬆的允許清單，或自動匯入 OAuth/桌面憑證狀態。

## Hermes 提供者

內建的 Hermes 提供者預設會偵測 `~/.hermes` 處的狀態。當 Hermes 位於其他位置時，請使用 `--from <path>`。

### Hermes 匯入項目

- 來自 `config.yaml` 的預設模型設定。
- 來自 `providers` 和 `custom_providers` 的已設定模型提供者和自訂 OpenAI 相容端點。
- 來自 `mcp_servers` 或 `mcp.servers` 的 MCP 伺服器定義。
- `SOUL.md` 和 `AGENTS.md` 到 OpenClaw 代理工作區。
- `memories/MEMORY.md` 和 `memories/USER.md` 附加至工作區記憶體檔案。
- OpenClaw 檔案記憶體的記憶體設定預設值，以及外部記憶體提供者（如 Honcho）的封存或手動審查項目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 檔案的技能。
- 來自 `skills.config` 的各別技能設定值。
- 來自 `.env` 的支援 API 金鑰，僅限搭配 `--include-secrets` 時。

### 支援的 `.env` 金鑰

`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。

### 僅封存的狀態

OpenClaw 無法安全解讀的 Hermes 狀態會被複製到遷移報告中供手動審查，但不會載入到即時的 OpenClaw 設定或憑證中。這保留了不透明或Unsafe的狀態，而不假裝 OpenClaw 可以自動執行或信任它：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

### 套用之後

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

在執行時，外掛程式會呼叫 `api.registerMigrationProvider(...)`。提供者會實作 `detect`、`plan` 和 `apply`。核心負責 CLI 編排、備份原則、提示、JSON 輸出和衝突預檢。核心會將審查後的計畫傳遞至 `apply(ctx, plan)`，且僅在缺少該參數時提供者才能重建該計畫，以保持相容性。

提供者外掛程式可以使用 `openclaw/plugin-sdk/migration` 來建構項目和計算摘要計數，並使用 `openclaw/plugin-sdk/migration-runtime` 進行具衝突感知的檔案複製、僅歸檔的報告複製以及遷移報告。

## 入門整合

當提供者偵測到已知的來源時，入門流程可以提供遷移選項。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的外掛程式遷移提供者，並且在套用前仍會顯示預覽。

<Note>入門匯入需要全新的 OpenClaw 設定。如果您已有本機狀態，請先重設設定、憑證、會話和工作區。針對現有設定，「備份加覆寫」或「合併」匯入功能已設為功能閘控。</Note>

## 相關

- [從 Hermes 遷移](/zh-Hant/install/migrating-hermes)：使用者導覽。
- [從 Claude 遷移](/zh-Hant/install/migrating-claude)：使用者導覽。
- [遷移](/zh-Hant/install/migrating)：將 OpenClaw 移動到新機器。
- [Doctor](/zh-Hant/gateway/doctor)：套用遷移後的健康檢查。
- [外掛程式](/zh-Hant/tools/plugin)：外掛程式安裝和註冊。
