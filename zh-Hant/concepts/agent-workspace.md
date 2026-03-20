---
summary: "Agent workspace: location, layout, and backup strategy"
read_when:
  - 您需要說明 agent workspace 或其檔案佈局
  - 您想要備份或遷移 agent workspace
title: "Agent Workspace"
---

# Agent workspace

Workspace 是 agent 的家。它是檔案工具和 workspace context 使用的唯一工作目錄。請將其保密並將其視為記憶體。

這與 `~/.openclaw/` 分開，後者儲存設定、憑證和會話。

**重要提示：** workspace 是**預設 cwd**，而非硬體沙盒。工具會根據 workspace 解析相對路徑，但除非啟用沙盒隔離，否則絕對路徑仍可存取主機上的其他位置。如果您需要隔離，請使用 [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) (和/或各 agent 的沙盒設定)。
當啟用沙盒且 `workspaceAccess` 不是 `"rw"` 時，工具會在 `~/.openclaw/sandboxes` 下的沙盒 workspace 內運作，而非您的主機 workspace。

## 預設位置

- 預設： `~/.openclaw/workspace`
- 如果設定了 `OPENCLAW_PROFILE` 且不是 `"default"`，預設值會變成
  `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆寫：

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 將會建立 workspace 並在缺少時植入啟動檔案。
沙盒植入副本僅接受常規 workspace 內的檔案；解析至來源 workspace 外部的符號連結/硬連結別名會被忽略。

如果您已自行管理 workspace 檔案，您可以停用啟動檔案的建立：

```json5
{ agent: { skipBootstrap: true } }
```

## 額外的 workspace 資料夾

較舊的安裝可能會建立 `~/openclaw`。保留多個 workspace 目錄可能會造成令人困惑的驗證或狀態漂移，因為一次只有一個 workspace 是啟用的。

**建議：** 保持單一啟用的 workspace。如果您不再使用額外的資料夾，請將其封存或移至垃圾桶（例如 `trash ~/openclaw`）。
如果您有意保留多個 workspace，請確保 `agents.defaults.workspace` 指向啟用的那個。

`openclaw doctor` 偵測到額外的工作區目錄時會發出警告。

## 工作區檔案對應（各檔案的含義）

以下是 OpenClaw 預期在工作區內的標準檔案：

- `AGENTS.md`
  - Agent 的操作指令以及它應如何使用記憶。
  - 在每個會話開始時載入。
  - 適合放置規則、優先事項和「如何表現」的細節。

- `SOUL.md`
  - Persona、語氣和界限。
  - 每個會話都會載入。

- `USER.md`
  - 使用者是誰以及如何稱呼他們。
  - 每個會話都會載入。

- `IDENTITY.md`
  - Agent 的名稱、氛圍和表情符號。
  - 在啟動儀式期間建立/更新。

- `TOOLS.md`
  - 關於您的本機工具和慣例的筆記。
  - 不控制工具的可用性；它僅作為指導。

- `HEARTBEAT.md`
  - 心跳執行的可選微型檢查清單。
  - 保持簡短以避免 token 消耗。

- `BOOT.md`
  - 當啟用內部掛鉤時，在閘道重新啟動時執行的可選啟動檢查清單。
  - 保持簡短；使用訊息工具進行外發傳送。

- `BOOTSTRAP.md`
  - 一次性首次執行儀式。
  - 僅為全新的工作區建立。
  - 儀式完成後將其刪除。

- `memory/YYYY-MM-DD.md`
  - 每日記憶日誌（每天一個檔案）。
  - 建議在會話開始時閱讀今天和昨天的內容。

- `MEMORY.md`（可選）
  - 經策劃的長期記憶。
  - 僅在主要的私人會話中載入（非共用/群組環境）。

請參閱 [記憶](/zh-Hant/concepts/memory) 以了解工作流程和自動記憶排空。

- `skills/`（可選）
  - 工作區特定的技能。
  - 當名稱衝突時，覆寫受管理/捆綁的技能。

- `canvas/`（可選）
  - 用於節點顯示的 Canvas UI 檔案（例如 `canvas/index.html`）。

如果缺少任何啟動文件，OpenClaw 會將「檔案遺失」標記注入到會話中並繼續執行。大型啟動文件在注入時會被截斷；請透過 `agents.defaults.bootstrapMaxChars` (預設值：20000) 和 `agents.defaults.bootstrapTotalMaxChars` (預設值：150000) 調整限制。`openclaw setup` 可以重新建立遺失的預設值，而不會覆寫現有檔案。

## 什麼不在工作區中

這些位於 `~/.openclaw/` 下，且不應提交到工作區儲存庫：

- `~/.openclaw/openclaw.json` (配置)
- `~/.openclaw/credentials/` (OAuth 權杖、API 金鑰)
- `~/.openclaw/agents/<agentId>/sessions/` (會話紀錄 + 元資料)
- `~/.openclaw/skills/` (受管理的技能)

如果您需要遷移會話或配置，請單獨複製它們，並將其保留在版本控制之外。

## Git 備份 (建議，私人)

將工作區視為私有記憶體。將其放入 **私人** git 儲存庫中，以便進行備份和復原。

請在執行 Gateway 的機器上執行這些步驟 (也就是工作區所在的位置)。

### 1) 初始化儲存庫

如果已安裝 git，全新的工作區會自動初始化。如果此工作區尚未成為儲存庫，請執行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 新增私人遠端 (適合初學者的選項)

選項 A：GitHub 網頁介面

1. 在 GitHub 上建立一個新的 **私人** 儲存庫。
2. 不要使用 README 初始化 (以避免合併衝突)。
3. 複製 HTTPS 遠端 URL。
4. 新增遠端並推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

選項 B：GitHub CLI (`gh`)

```bash
gh auth login
gh repo create openclaw-workspace --private --source . --remote origin --push
```

選項 C：GitLab 網頁介面

1. 在 GitLab 上建立一個新的 **私人** 儲存庫。
2. 不要使用 README 初始化 (以避免合併衝突)。
3. 複製 HTTPS 遠端 URL。
4. 新增遠端並推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

### 3) 持續更新

```bash
git status
git add .
git commit -m "Update memory"
git push
```

## 不要提交機密資訊

即使在私人儲存庫中，也應避免在工作區中儲存機密資訊：

- API 金鑰、OAuth 權杖、密碼或私人憑證。
- `~/.openclaw/` 下的任何內容。
- 聊天紀錄的原始傾印或敏感附件。

如果您必須儲存敏感參考資訊，請使用預留位置，並將真正的機密資訊儲存在其他地方 (密碼管理器、環境變數或 `~/.openclaw/`)。

建議的 `.gitignore` 入門：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 將工作區移動到新機器

1. 將儲存庫複製到所需路徑 (預設為 `~/.openclaw/workspace`)。
2. 在 `~/.openclaw/openclaw.json` 中將 `agents.defaults.workspace` 設定為該路徑。
3. 執行 `openclaw setup --workspace <path>` 以初始化任何遺失的檔案。
4. 如果您需要工作階段，請從舊機器單獨複製 `~/.openclaw/agents/<agentId>/sessions/`。

## 進階說明

- 多代理程式路由可以針對每個代理程式使用不同的工作區。請參閱 [通道路由](/zh-Hant/channels/channel-routing) 以了解路由組態。
- 如果啟用了 `agents.defaults.sandbox`，非主要工作階段可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每個工作階段沙箱工作區。

import en from "/components/footer/en.mdx";

<en />
