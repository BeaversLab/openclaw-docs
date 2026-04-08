---
summary: "Agent workspace：位置、佈局與備份策略"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Agent Workspace"
---

# Agent workspace

Workspace 是 Agent 的家。它是檔案工具和 workspace context 使用的唯一工作目錄。請保持私密並將其視為記憶體。

這與 `~/.openclaw/` 分開，後者儲存設定、憑證和會話。

**重要提示：** 工作區是**預設的目前工作目錄**，而不是嚴格的沙箱。工具會根據工作區解析相對路徑，但在未啟用沙箱的情況下，絕對路徑仍可存取主機上的其他位置。如果您需要隔離，請使用 [`agents.defaults.sandbox`](/en/gateway/sandboxing) (和/或每個 Agent 的沙箱設定)。
當啟用沙箱且 `workspaceAccess` 不是 `"rw"` 時，工具會在 `~/.openclaw/sandboxes` 下的沙箱工作區內運作，而不是您的主機工作區。

## 預設位置

- 預設值：`~/.openclaw/workspace`
- 如果設定了 `OPENCLAW_PROFILE` 且不為 `"default"`，預設值會變成
  `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆寫：

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 會在缺少時建立 workspace 並植入引導檔案。
Sandbox seed 複本僅接受一般 workspace 內的檔案；解析至來源 workspace 外部的 symlink/hardlink 別名會被忽略。

如果您已自行管理 workspace 檔案，您可以停用引導檔案的建立：

```json5
{ agent: { skipBootstrap: true } }
```

## 額外的 workspace 資料夾

較舊的安裝可能建立了 `~/openclaw`。保留多個 workspace 目錄可能會造成混淆的驗證或狀態漂移，因為一次只有一個 workspace 是作用的。

**建議：** 保持單一作用中的 workspace。如果您不再使用額外的資料夾，請將其封存或移至垃圾桶 (例如 `trash ~/openclaw`)。
如果您有意保留多個 workspace，請確保 `agents.defaults.workspace` 指向作用中的那一個。

當 `openclaw doctor` 偵測到額外的 workspace 目錄時會發出警告。

## 工作區檔案對應表（每個檔案的含義）

以下是 OpenClaw 預期在工作區內的標準檔案：

- `AGENTS.md`
  - 給 Agent 的操作指令，以及它應該如何使用記憶。
  - 在每個會話開始時載入。
  - 放置規則、優先事項和「如何表現」細節的好地方。

- `SOUL.md`
  - 角色設定、語氣和界線。
  - 每個會話都會載入。
  - 指南：[SOUL.md 個性指南](/en/concepts/soul)

- `USER.md`
  - 使用者是誰以及如何稱呼他們。
  - 每個工作階段都會載入。

- `IDENTITY.md`
  - Agent 的名稱、氛圍和表情符號。
  - 在啟動儀式期間建立/更新。

- `TOOLS.md`
  - 關於您的本機工具和約定的備註。
  - 不控制工具的可用性；它僅是指導原則。

- `HEARTBEAT.md`
  - 心跳執行的可選小型檢查清單。
  - 保持簡短以避免消耗 Token。

- `BOOT.md`
  - 當啟用內部掛勾時，在閘道重啟時執行的可選啟動檢查清單。
  - 保持簡短；使用訊息工具進行外部傳送。

- `BOOTSTRAP.md`
  - 一次性首次執行儀式。
  - 僅為全新的工作區建立。
  - 儀式完成後將其刪除。

- `memory/YYYY-MM-DD.md`
  - 每日記憶日誌 (每天一個檔案)。
  - 建議在工作階段開始時閱讀今天 + 昨天的內容。

- `MEMORY.md` (可選)
  - 策展的長期記憶。
  - 僅在主要的私人工作階段中載入 (非共享/群組情境)。

請參閱 [記憶](/en/concepts/memory) 以了解工作流程和自動記憶排空。

- `skills/` (可選)
  - 工作區特定的技能。
  - 該工作區的最高優先級技能位置。
  - 當名稱衝突時，會覆寫專案 Agent 技能、個人 Agent 技能、受管理技能、內建技能和 `skills.load.extraDirs`。

- `canvas/` (可選)
  - 用於節點顯示的 Canvas UI 檔案 (例如 `canvas/index.html`)。

如果缺少任何引導文件，OpenClaw 會在會話中注入「缺少文件」標記並繼續。注入大型引導檔案時會被截斷；請使用 `agents.defaults.bootstrapMaxChars` (預設值：20000) 和
`agents.defaults.bootstrapTotalMaxChars` (預設值：150000) 調整限制。
`openclaw setup` 可以重新建立缺少的預設檔案，而不會覆蓋現有檔案。

## 工作區中沒有什麼

這些檔案位於 `~/.openclaw/` 下，且不應提交到工作區存放庫：

- `~/.openclaw/openclaw.json` (設定)
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (模型驗證設定檔：OAuth + API 金鑰)
- `~/.openclaw/credentials/` (通道/提供者狀態以及舊版 OAuth 匯入資料)
- `~/.openclaw/agents/<agentId>/sessions/` (會話記錄 + 元資料)
- `~/.openclaw/skills/` (受管理技能)

如果您需要遷移會話或設定，請單獨複製它們，並將其排除在版本控制之外。

## Git 備份 (推薦，私人)

將工作區視為私人記憶。將其放在 **私人** git 存放庫中，以便進行備份和復原。

在執行 Gateway 的機器上執行這些步驟 (這是工作區所在的位置)。

### 1) 初始化存放庫

如果安裝了 git，全新的工作區會自動初始化。如果此工作區尚未成為存放庫，請執行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 新增私人遠端 (對初學者友好的選項)

選項 A：GitHub 網頁介面

1. 在 GitHub 上建立一個新的 **私人** 存放庫。
2. 不要使用 README 初始化 (避免合併衝突)。
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

1. 在 GitLab 上建立一個新的 **私人** 存放庫。
2. 不要使用 README 初始化 (避免合併衝突)。
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

## 不要提交機密

即使在私人存放庫中，也要避免在工作區中儲存機密：

- API 金鑰、OAuth 權杖、密碼或私人憑證。
- `~/.openclaw/` 下的任何內容。
- 聊天記錄的原始傾印或敏感附件。

如果您必須儲存敏感參考，請使用預留位置，並將真正的機密存放在其他地方 (密碼管理員、環境變數或 `~/.openclaw/`)。

建議的 `.gitignore` 起始檔案：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 將工作區移動到新機器

1. 將存儲庫克隆到所需路徑（預設 `~/.openclaw/workspace`）。
2. 在 `~/.openclaw/openclaw.json` 中將 `agents.defaults.workspace` 設置為該路徑。
3. 執行 `openclaw setup --workspace <path>` 以生成任何缺失的檔案。
4. 如果您需要會話，請單獨從舊機器複製 `~/.openclaw/agents/<agentId>/sessions/`。

## 進階說明

- 多代理路由可以為每個代理使用不同的工作區。請參閱
  [通道路由](/en/channels/channel-routing) 以了解路由配置。
- 如果啟用了 `agents.defaults.sandbox`，非主會話可以在 `agents.defaults.sandbox.workspaceRoot` 下使用每個會話獨立的沙箱
  工作區。

## 相關內容

- [常駐指令](/en/automation/standing-orders) — 工作區檔案中的持久指令
- [心跳](/en/gateway/heartbeat) — HEARTBEAT.md 工作區檔案
- [會話](/en/concepts/session) — 會話存儲路徑
- [沙箱機制](/en/gateway/sandboxing) — 沙箱環境中的工作區存取
