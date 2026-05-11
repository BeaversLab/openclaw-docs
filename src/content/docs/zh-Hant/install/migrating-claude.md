---
summary: "Move Claude Code and Claude Desktop local state into OpenClaw with a previewed import"
read_when:
  - You are coming from Claude Code or Claude Desktop and want to keep instructions, MCP servers, and skills
  - You need to understand what OpenClaw imports automatically and what stays archive-only
title: "Migrating from Claude"
---

OpenClaw 透過內建的 Claude 遷移提供者匯入本機 Claude 狀態。該提供者在變更狀態前會預覽每個項目，在計畫和報告中編輯機密，並在套用前建立經過驗證的備份。

<Note>Onboarding imports require a fresh OpenClaw setup. If you already have local OpenClaw state, reset config, credentials, sessions, and the workspace first, or use `openclaw migrate` directly with `--overwrite` after reviewing the plan.</Note>

## 兩種匯入方式

<Tabs>
  <Tab title="Onboarding wizard">
    當精靈偵測到本機 Claude 狀態時，會提供 Claude 選項。

    ```bash
    openclaw onboard --flow import
    ```

    或指向特定來源：

    ```bash
    openclaw onboard --import-from claude --import-source ~/.claude
    ```

  </Tab>
  <Tab title="CLI">
    使用 `openclaw migrate` 進行腳本化或可重複執行的操作。請參閱 [`openclaw migrate`](/zh-Hant/cli/migrate) 以取得完整參考資料。

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    新增 `--from <path>` 以匯入特定的 Claude Code 家目錄或專案根目錄。

  </Tab>
</Tabs>

## 匯入內容

<AccordionGroup>
  <Accordion title="Instructions and memory">- 專案 `CLAUDE.md` 和 `.claude/CLAUDE.md` 內容會被複製或附加到 OpenClaw 代理工作區 `AGENTS.md` 中。 - 使用者 `~/.claude/CLAUDE.md` 內容會附加到工作區 `USER.md` 中。</Accordion>
  <Accordion title="MCP servers">MCP 伺服器定義會從專案 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 中匯入（如果存在的話）。</Accordion>
  <Accordion title="技能和指令">- 帶有 `SKILL.md` 檔案的 Claude 技能會複製到 OpenClaw 工作區技能目錄中。 - `.claude/commands/` 或 `~/.claude/commands/` 下的 Claude 指令 Markdown 檔案會轉換為具有 `disable-model-invocation: true` 的 OpenClaw 技能。</Accordion>
</AccordionGroup>

## 什麼內容僅保留於歸檔中

提供者會將這些項目複製到遷移報告中以供手動審查，但會**避免**將其載入到即時的 OpenClaw 配置中：

- Claude hooks
- Claude 權限和廣泛的工具允許清單
- Claude 環境預設值
- `CLAUDE.local.md`
- `.claude/rules/`
- `.claude/agents/` 或 `~/.claude/agents/` 下的 Claude 子代理程式
- Claude Code 快取、計畫和專案歷史記錄目錄
- Claude Desktop 擴充功能和作業系統儲存的憑證

OpenClaw 拒絕執行 hooks、信任權限允許清單，或自動解碼不透明的 OAuth 和 Desktop 憑證狀態。在檢閱歸檔後，請手動移動您所需的項目。

## 來源選擇

如果未指定 `--from`，OpenClaw 會檢查位於 `~/.claude` 的預設 Claude Code 主目錄、取樣的 Claude Code `~/.claude.json` 狀態檔案，以及 macOS 上的 Claude Desktop MCP 配置。

當 `--from` 指向專案根目錄時，OpenClaw 僅匯入該專案的 Claude 檔案，例如 `CLAUDE.md`、`.claude/settings.json`、`.claude/commands/`、`.claude/skills/` 和 `.mcp.json`。在專案根目錄匯入期間，它不會讀取您的全域 Claude 主目錄。

## 建議流程

<Steps>
  <Step title="預覽計畫">
    ```bash
    openclaw migrate claude --dry-run
    ```

    該計畫會列出將會變更的所有內容，包括衝突、跳過的項目，以及從巢狀 MCP `env` 或 `headers` 欄位中編輯的敏感值。

  </Step>
  <Step title="套用並備份">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw 會在套用之前建立並驗證備份。

  </Step>
  <Step title="Run doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/zh-Hant/gateway/doctor) 會檢查匯入後的設定或狀態問題。

  </Step>
  <Step title="Restart and verify">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    確認 Gateway 運作正常，且您匯入的指令、MCP 伺服器和技能已載入。

  </Step>
</Steps>

## 衝突處理

當計畫回報衝突時（目標位置已存在檔案或設定值），Apply 會拒絕繼續執行。

<Warning>僅當有意替換現有目標時，才使用 `--overwrite` 重新執行。Provider 仍可能會在移轉報告目錄中，為被覆寫的檔案寫入專案層級的備份。</Warning>

對於全新的 OpenClaw 安裝，衝突並不常見。它們通常出現在您對已有使用者編輯的設定重新執行匯入時。

## 自動化的 JSON 輸出

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

使用 `--json` 且不使用 `--yes` 時，Apply 會列印計畫而不變更狀態。這是 CI 和共用腳本最安全的模式。

## 疑難排解

<AccordionGroup>
  <Accordion title="Claude state lives outside ~/.claude">傳遞 `--from /actual/path` (CLI) 或 `--import-source /actual/path` (onboarding)。</Accordion>
  <Accordion title="Onboarding refuses to import on an existing setup">Onboarding 匯入需要全新的設定。請重設狀態並重新進行 Onboarding，或是直接使用 `openclaw migrate apply claude`，後者支援 `--overwrite` 和明確的備份控制。</Accordion>
  <Accordion title="MCP servers from Claude Desktop did not import">Claude Desktop 會從平台特定的路徑讀取 `claude_desktop_config.json`。如果 OpenClaw 未自動偵測到，請將 `--from` 指向該檔案的目錄。</Accordion>
  <Accordion title="Claude 指令已轉換為停用模型呼叫的技能">這是設計使然。Claude 指令是由使用者觸發的，因此 OpenClaw 會將它們作為帶有 `disable-model-invocation: true` 的技能匯入。如果您希望代理程式自動呼叫這些技能，請編輯每個技能的 frontmatter。</Accordion>
</AccordionGroup>

## 相關

- [`openclaw migrate`](/zh-Hant/cli/migrate)：完整的 CLI 參考、插件合約和 JSON 結構。
- [遷移指南](/zh-Hant/install/migrating)：所有遷移路徑。
- [從 Hermes 遷移](/zh-Hant/install/migrating-hermes)：另一個跨系統匯入路徑。
- [入門](/zh-Hant/cli/onboard)：嚮導流程和非互動式標誌。
- [檢查工具](/zh-Hant/gateway/doctor)：遷移後的健康檢查。
- [代理程式工作區](/zh-Hant/concepts/agent-workspace)：`AGENTS.md`、`USER.md` 和技能所在的的位置。
