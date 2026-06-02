---
summary: "CLI 參考指南：`openclaw migrate`（從其他代理系統匯入狀態）"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "遷移"
---

# `openclaw migrate`

透過外掛擁有的遷移提供者，從其他代理系統匯入狀態。內建的提供者涵蓋 Codex CLI 狀態、[Claude](/zh-Hant/install/migrating-claude) 和 [Hermes](/zh-Hant/install/migrating-hermes)；第三方外掛可以註冊額外的提供者。

<Tip>如需面向使用者的逐步指南，請參閱[從 Claude 遷移](/zh-Hant/install/migrating-claude)和[從 Hermes 遷移](/zh-Hant/install/migrating-hermes)。[遷移中心](/zh-Hant/install/migrating)列出了所有路徑。</Tip>

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
  註冊的遷移提供者名稱，例如 `hermes`。執行 `openclaw migrate list` 以查看已安裝的提供者。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  建置計畫並退出，不變更狀態。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆寫來源狀態目錄。Hermes 預設為 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  在不提示的情況下匯入支援的憑證。互動式套用在匯入偵測到的認證憑證前會詢問，預設選取是；非互動式 `--yes` 需要 `--include-secrets` 才能匯入它們。
</ParamField>
<ParamField path="--no-auth-credentials" type="boolean">
  略過認證憑證匯入，包括互動式提示。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  當計畫回報衝突時，允許套用來取代現有目標。
</ParamField>
<ParamField path="--yes" type="boolean">
  略過確認提示。在非互動式模式中為必填。
</ParamField>
<ParamField path="--skill <name>" type="string">
  透過技能名稱或項目 ID 選取一個技能複製項目。重複旗標以遷移多個技能。省略時，互動式 Codex 遷移會顯示核取方塊選取器，而非互動式遷移則會保留所有計畫的技能。
</ParamField>
<ParamField path="--plugin <name>" type="string">
  透過外掛名稱或項目 ID 選取一個 Codex 外掛安裝項目。重複旗標以遷移多個 Codex 外掛。省略時，互動式 Codex 遷移會顯示原生 Codex 外掛核取方塊選取器，而非互動式遷移則會保留所有計畫的外掛。這僅適用於由 Codex app-server 清單所發現的來源安裝 `openai-curated` Codex 外掛。
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  僅限 Codex。在規劃原生外掛啟動之前，強制重新瀏覽來源 Codex app-server `app/list`。預設為關閉，以保持遷移規劃快速。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  略過套用前備份。當本機 OpenClaw 狀態存在時需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  當套用原本會拒絕略過備份時，需要與 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  將計畫或套用結果列印為 JSON。使用 `--json` 且沒有 `--yes` 時，套用會列印計畫且不會變更狀態。
</ParamField>

## 安全模型

`openclaw migrate` 優先採用預覽模式。

<AccordionGroup>
  <Accordion title="套用前預覽">
    在任何變更發生之前，提供者會傳回一個逐項計劃，包括衝突、跳過的項目和敏感項目。JSON 計劃、套用輸出和遷移報告會編輯嵌套的類似金鑰的秘密內容，例如 API 金鑰、權杖、授權標頭、Cookie 和密碼。

    除非設定了 `--yes`，否則 `openclaw migrate apply <provider>` 會在變更狀態前預覽計劃並提示。在非互動模式下，套用需要 `--yes`。

  </Accordion>
  <Accordion title="備份">
    套用會在套用遷移之前建立並驗證 OpenClaw 備份。如果尚未存在本機 OpenClaw 狀態，則會跳過備份步驟並繼續遷移。若要在狀態存在時跳過備份，請同時傳遞 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="衝突">
    當計劃存在衝突時，套用會拒絕繼續。請檢閱計劃，然後如果是有意替換現有目標，請使用 `--overwrite` 重新執行。提供者仍可能會在遷移報告目錄中為被覆寫的檔案寫入項目級別的備份。
  </Accordion>
  <Accordion title="機密">
    互動式套用會詢問是否要匯入偵測到的驗證憑證，預設選擇「是」。使用 `--no-auth-credentials` 跳過它們，或使用 `--include-secrets` 搭配 `--yes` 進行無人值守的憑證匯入。
  </Accordion>
</AccordionGroup>

## Claude 提供者

內建的 Claude 提供者預設會在 `~/.claude` 偵測 Claude Code 狀態。使用 `--from <path>` 來匯入特定的 Claude Code 家目錄或專案根目錄。

<Tip>如需使用者導覽，請參閱[從 Claude 遷移](/zh-Hant/install/migrating-claude)。</Tip>

### Claude 匯入的內容

- 將專案 `CLAUDE.md` 和 `.claude/CLAUDE.md` 匯入到 OpenClaw 代理工作區。
- 將使用者 `~/.claude/CLAUDE.md` 附加到工作區 `USER.md`。
- 來自專案 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 伺服器定義。
- 包含 `SKILL.md` 的 Claude 技能目錄。
- 轉換為僅支援手動呼叫之 OpenClaw 技能的 Claude 指令 Markdown 檔案。

### 封存與手動審查狀態

Claude hooks、權限、環境預設值、本地記憶體、路徑範圍規則、子代理、快取、計畫和專案歷史記錄會保留在遷移報告中，或作為手動審查項目回報。OpenClaw 不會執行 hooks、複製寬鬆的允許清單，或自動匯入 OAuth/桌面憑證狀態。

## Codex 提供者

內建的 Codex 提供者預設會偵測位於 `~/.codex` 的 Codex CLI 狀態，或者當設定該環境變數時，則偵測 `CODEX_HOME`。使用 `--from <path>` 來清點特定的 Codex 家目錄。

當您遷移至 OpenClaw Codex harness 並且想要刻意提升有用的個人 Codex CLI 資產時，請使用此提供者。本機 Codex app-server 啟動使用每個代理程式專屬的 `CODEX_HOME`，因此它們預設不會讀取您的個人 `~/.codex`。正常的程序 `HOME` 仍然會被繼承，因此 Codex 可以看到共享的 `$HOME/.agents/*` 技能/外掛 marketplace 項目，且子程序可以找到使用者家目錄的設定和權杖。

在互動式終端機中執行 `openclaw migrate codex` 會預覽完整計畫，然後在最終套用確認前開啟核取方塊選擇器。首先會提示技能複製項目。使用 `Toggle all on` 或 `Toggle all off` 進行大量選取。按 Space 鍵切換列，或按 Enter 鍵啟用反白列並繼續。計畫中的技能預設為已勾選，衝突的技能預設為未勾選，而 `Skip for now` 會在此次執行中跳過技能複製，同時繼續進行外掛選取。當來源安裝的策展 Codex 外掛可遷移且未提供 `--plugin` 時，遷移接著會依外掛名稱提示啟用原生 Codex 外掛。除非目標 OpenClaw Codex 外掛設定已經有該外掛，否則外掛項目預設為已勾選。現有的目標外掛預設為未勾選，並顯示衝突提示，例如 `conflict: plugin exists`；請選擇 `Toggle all off` 以在該次執行中不遷移任何原生 Codex 外掛，或選擇 `Skip for now` 在套用前停止。對於腳本或精確執行，每個技能傳遞 `--skill <name>` 一次，例如：

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

- `$CODEX_HOME/skills` 下的 Codex CLI 技能目錄，不包括 Codex 的
  `.system` 快取。
- `$HOME/.agents/skills` 下的個人 AgentSkills，當您需要個別代理程式擁有權時，會複製到目前的
  OpenClaw 代理程式工作區。
- 透過 Codex
  應用伺服器 `plugin/list` 發現的來源安裝 `openai-curated` Codex 外掛程式。規劃會讀取每個已啟用
  已安裝外掛程式的 `plugin/read`。應用程式支援的外掛程式要求來源 Codex 應用伺服器
  帳戶回應必須是 ChatGPT 訂閱帳戶；非 ChatGPT 或遺失
  帳戶回應會被跳過並顯示 `codex_subscription_required`。預設情況下，
  遷移不會呼叫來源 `app/list`，因此通過
  帳戶閘道的應用程式支援外掛程式會在不驗證來源應用程式可存取性的情況下進行規劃，
  而帳戶查閱傳輸失敗會以 `codex_account_unavailable` 跳過。當您希望遷移強制重新取得來源
  `app/list` 快照，並要求每個擁有的應用程式在規劃原生啟用之前都必須存在、已啟用且
  可存取時，請傳遞
  `--verify-plugin-apps`。在該模式下，
  帳戶查閱傳輸失敗會交由來源應用程式庫存驗證處理。
  來源應用程式庫存快照會保留在目前程序的記憶體中；
  不會寫入遷移輸出或目標設定。已停用的外掛程式、
  無法讀取的外掛程式詳細資料、訂閱閘道的來源帳戶，以及當
  要求驗證時，遺失的應用程式、已停用的應用程式、無法存取的應用程式，或
  來源應用程式庫存失敗，會變成具有類型原因的手動跳過項目，
  而不是目標設定項目。
  套用會為每個選取的符合條件外掛程式呼叫應用伺服器 `plugin/install`，
  即使目標應用伺服器已經報告該外掛程式已安裝並
  已啟用。遷移的 Codex 外掛程式只能在選取
  原生 Codex harness 的階段作業中使用；它們不會暴露給 OpenClaw 提供者執行、
  ACP 對話綁定或其他 harness。

### 手動審查 Codex 狀態

Codex `config.toml`、原生 `hooks/hooks.json`、非經策展的市集、非來源安裝之經策展外掛程式的快取外掛程式套件組合，以及未通過來源訂閱閘道的來源安裝外掛程式，都不會自動啟用。
當設定 `--verify-plugin-apps` 時，未通過來源應用程式庫存閘道的外掛程式也會被跳過。它們會被複製或在遷移報告中回報，以供手動審查。

對於遷移的來源安裝策展外掛程式，apply 會寫入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- 每個選取的外掛程式都有一個包含 `marketplaceName: "openai-curated"` 和
  `pluginName` 的明確外掛程式項目

遷移永遠不會寫入 `plugins["*"]`，也永遠不會儲存本地市集快取
路徑。來源端訂閱失敗會在手動項目上回報，並附上類型化的
原因，例如 `codex_subscription_required`、`codex_account_unavailable`、
`plugin_disabled` 或 `plugin_read_unavailable`。使用 `--verify-plugin-apps` 時，
來源應用程式庫存失敗也可能顯示為 `app_inaccessible`、
`app_disabled`、`app_missing` 或 `app_inventory_unavailable`。被跳過的
外掛程式不會寫入目標設定。
目標端需要授權的安裝會在受影響的外掛程式項目上回報，並附上
`status: "skipped"`、`reason: "auth_required"` 和經過清理的應用程式識別碼。
其明確設定項目會以停用狀態寫入，直到您重新授權並
啟用它們。其他安裝失敗則為項目範圍的 `error` 結果。

如果在規劃期間無法取得 Codex 應用程式伺服器外掛程式清單，遷移
會改為使用快取的組合建議項目，而不是讓整個
遷移失敗。

## Hermes 提供者

隨附的 Hermes 提供者預設會偵測 `~/.hermes` 的狀態。當 Hermes 位於其他位置時，請使用 `--from <path>`。

### Hermes 匯入的內容

- 來自 `config.yaml` 的預設模型設定。
- 來自 `providers` 和 `custom_providers` 的已設定模型提供者和自訂 OpenAI 相容端點。
- 來自 `mcp_servers` 或 `mcp.servers` 的 MCP 伺服器定義。
- `SOUL.md` 和 `AGENTS.md` 到 OpenClaw 代理程式工作區。
- `memories/MEMORY.md` 和 `memories/USER.md` 被附加到工作區記憶檔案。
- OpenClaw 檔案記憶體的記憶體配置預設值，以及外部記憶體提供者（例如 Honcho）的封存或手動審查項目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 檔案的 Skills。
- 來自 `skills.config` 的個別 Skill 設定值。
- 當接受互動式憑證遷移時，或設定 `--include-secrets` 時，來自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 憑證。Hermes `auth.json` OAuth 條目是針對手動 OpenAI 重新驗證或 doctor 修復回報的舊版狀態。
- 來自 Hermes `.env` 和 OpenCode `auth.json` 的支援 API 金鑰和令牌，當接受互動式憑證移轉時，或是當設定 `--include-secrets` 時。

### 支援的 `.env` 金鑰

- `AI_GATEWAY_API_KEY`
- `ALIBABA_API_KEY`
- `ANTHROPIC_API_KEY`
- `ARCEEAI_API_KEY`
- `CEREBRAS_API_KEY`
- `CHUTES_API_KEY`
- `CLOUDFLARE_AI_GATEWAY_API_KEY`
- `COPILOT_GITHUB_TOKEN`
- `DASHSCOPE_API_KEY`
- `DEEPINFRA_API_KEY`
- `DEEPSEEK_API_KEY`
- `FIREWORKS_API_KEY`
- `GEMINI_API_KEY`
- `GH_TOKEN`
- `GITHUB_TOKEN`
- `GLM_API_KEY`
- `GOOGLE_API_KEY`
- `GROQ_API_KEY`
- `HF_TOKEN`
- `HUGGINGFACE_HUB_TOKEN`
- `KILOCODE_API_KEY`
- `KIMICODE_API_KEY`
- `KIMI_API_KEY`
- `MINIMAX_API_KEY`
- `MINIMAX_CODING_API_KEY`
- `MISTRAL_API_KEY`
- `MODELSTUDIO_API_KEY`
- `MOONSHOT_API_KEY`
- `NVIDIA_API_KEY`
- `OPENAI_API_KEY`
- `OPENCODE_API_KEY`
- `OPENCODE_GO_API_KEY`
- `OPENCODE_ZEN_API_KEY`
- `OPENROUTER_API_KEY`
- `QIANFAN_API_KEY`
- `QWEN_API_KEY`
- `TOGETHER_API_KEY`
- `VENICE_API_KEY`
- `XAI_API_KEY`
- `XIAOMI_API_KEY`
- `ZAI_API_KEY`
- `Z_AI_API_KEY`

### 僅供存檔的狀態

OpenClaw 無法安全解讀的 Hermes 狀態會被複製到遷移報告中供人工審查，但不會載入到即時的 OpenClaw 設定或認證中。這保留了不透明或不安全的狀態，而不假裝 OpenClaw 可以自動執行或信任它：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
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

在執行時，外掛程式會呼叫 `api.registerMigrationProvider(...)`。提供者會實作 `detect`、`plan` 和 `apply`。核心擁有 CLI 協調、備份策略、提示、輸出和衝突預檢。核心將審查後的計畫傳遞給 `apply(ctx, plan)`，且提供者僅當為了相容性而缺少該引數時才能重建計畫。

提供者外掛程式可以使用 `openclaw/plugin-sdk/migration` 來建構項目和摘要計數，以及使用 `openclaw/plugin-sdk/migration-runtime` 來進行具衝突感知的檔案複製、僅供存檔的報告複製、快取的設定執行時期包裝函式，以及遷移報告。

## 上架整合

當提供者偵測到已知來源時，上架流程可以提供遷移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的外掛程式遷移提供者，並且在套用之前仍會顯示預覽。

<Note>上架匯入需要全新的 OpenClaw 設定。如果您已經有本機狀態，請先重設設定、認證、會話和工作區。備份加覆寫或合併匯入功能僅針對現有設定開放。</Note>

## 相關

- [從 Hermes 遷移](/zh-Hant/install/migrating-hermes)：面向使用者的逐步指南。
- [從 Claude 遷移](/zh-Hant/install/migrating-claude)：面向使用者的逐步指南。
- [遷移](/zh-Hant/install/migrating)：將 OpenClaw 移動到新機器。
- [Doctor](/zh-Hant/gateway/doctor)：套用遷移後的健康檢查。
- [插件](/zh-Hant/tools/plugin)：外掛程式安裝和註冊。
