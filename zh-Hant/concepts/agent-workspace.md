---
summary: "Agent workspace: location, layout, and backup strategy"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Agent Workspace"
---

# Agent workspace

工作區是 Agent 的家。這是用於
檔案工具和工作區內容的唯一工作目錄。請將其保密並將其視為記憶體。

這與 `~/.openclaw/` 分開，後者儲存設定、憑證和
工作階段。

**重要：** 工作區是 **預設的 cwd**，而非嚴格的沙盒。工具
會根據工作區解析相對路徑，但在未啟用沙盒的情況下，絕對路徑仍可存取
主機上的其他位置。如果您需要隔離，請使用
[`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) (和/或每個 Agent 的沙盒設定)。
當啟用沙盒且 `workspaceAccess` 不是 `"rw"` 時，工具會在
`~/.openclaw/sandboxes` 下的沙盒工作區內運作，而非您的主機工作區。

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

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 將會建立
工作區，並在缺少檔案時植入啟動檔案。
沙盒植入副本僅接受工作區內的一般檔案；解析至來源工作區之外的
symlink/hardlink 別名會被忽略。

如果您已自行管理工作區檔案，可以停用啟動
檔案的建立：

```json5
{ agent: { skipBootstrap: true } }
```

## 額外的工作區資料夾

較舊的安裝可能會建立 `~/openclaw`。保留多個工作區
目錄可能會造成混淆的授權或狀態漂移，因為一次只有
一個工作區是作用中的。

**建議：** 維持單一作用中的工作區。如果您不再使用
額外的資料夾，請將其封存或移至垃圾桶 (例如 `trash ~/openclaw`)。
如果您有意保留多個工作區，請確保
`agents.defaults.workspace` 指向作用中的那一個。

當 `openclaw doctor` 偵測到額外的工作區目錄時會發出警告。

## 工作區檔案對照（每個檔案的含義）

以下是 OpenClaw 預期在工作區內的標準檔案：

- `AGENTS.md`
  - 代理的操作指示以及其應如何使用記憶。
  - 在每次工作階段開始時載入。
  - 適合放置規則、優先順序以及「如何表現」的細節。

- `SOUL.md`
  - 人格、語氣與界限。
  - 於每個工作階段載入。

- `USER.md`
  - 使用者是誰以及如何稱呼他們。
  - 於每個工作階段載入。

- `IDENTITY.md`
  - 代理的名稱、氛圍與表情符號。
  - 在引導儀式期間建立/更新。

- `TOOLS.md`
  - 關於您的本機工具與慣例的筆記。
  - 不控制工具的可用性；僅供參考。

- `HEARTBEAT.md`
  - 心跳執行的可選微型檢查清單。
  - 保持簡短以避免 token 消耗。

- `BOOT.md`
  - 當啟用內部掛鉤時，在閘道重新啟動時執行的可選啟動檢查清單。
  - 保持簡短；使用訊息工具進行發送。

- `BOOTSTRAP.md`
  - 一次性首次執行儀式。
  - 僅為全新的工作區建立。
  - 儀式完成後將其刪除。

- `memory/YYYY-MM-DD.md`
  - 每日記憶日誌（每天一個檔案）。
  - 建議在工作階段開始時讀取今天與昨天的內容。

- `MEMORY.md`（可選）
  - 策展的長期記憶。
  - 僅在主要、私密的工作階段中載入（而非共享/群組情境）。

請參閱[記憶](/zh-Hant/concepts/memory)以了解工作流程和自動記憶清除。

- `skills/`（可選）
  - 工作區特定技能。
  - 當名稱衝突時，會覆寫受管理/套件技能。

- `canvas/`（可選）
  - 節點顯示的 Canvas UI 檔案（例如 `canvas/index.html`）。

如果缺少任何引導檔案，OpenClaw 會將「缺少檔案」標記插入工作階段並繼續執行。大型引導檔案在插入時會被截斷；請使用 `agents.defaults.bootstrapMaxChars`（預設值：20000）和
`agents.defaults.bootstrapTotalMaxChars`（預設值：150000）調整限制。
`openclaw setup` 可以重新建立缺少的預設值，而不會覆寫現有檔案。

## 工作區中沒有什麼

這些位於 `~/.openclaw/` 之下，且不應提交到 workspace repo：

- `~/.openclaw/openclaw.json` (config)
- `~/.openclaw/credentials/` (OAuth tokens, API keys)
- `~/.openclaw/agents/<agentId>/sessions/` (session transcripts + metadata)
- `~/.openclaw/skills/` (managed skills)

如果您需要遷移 session 或 config，請單獨複製它們，並將其保留在版本控制之外。

## Git 備份（推薦，私有）

請將 workspace 視為私有記憶。將其放入 **私有** git repo 中，以便進行備份和還原。

在執行 Gateway 的機器上執行這些步驟（這是 workspace 所在的位置）。

### 1) 初始化 repo

如果已安裝 git，全新的 workspace 將自動初始化。如果此 workspace 尚未是 repo，請執行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 新增私有 remote（適合初學者的選項）

選項 A：GitHub web UI

1. 在 GitHub 上建立一個新的 **私有** repository。
2. 請勿使用 README 初始化（以避免合併衝突）。
3. 複製 HTTPS remote URL。
4. 新增 remote 並推送：

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

選項 C：GitLab web UI

1. 在 GitLab 上建立一個新的 **私有** repository。
2. 請勿使用 README 初始化（以避免合併衝突）。
3. 複製 HTTPS remote URL。
4. 新增 remote 並推送：

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

## 不要提交 secrets

即使在私有 repo 中，也應避免在 workspace 中儲存 secrets：

- API 金鑰、OAuth 權杖、密碼或私有憑證。
- `~/.openclaw/` 下的任何內容。
- 對話的原始傾印或敏感附件。

如果您必須儲存敏感參考，請使用預留位置，並將真正的 secret 保留在其他地方（密碼管理員、環境變數或 `~/.openclaw/`）。

建議的 `.gitignore` 入門範例：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 將 workspace 移動到新機器

1. 將 repo 複製到所需路徑（預設為 `~/.openclaw/workspace`）。
2. 在 `~/.openclaw/openclaw.json` 中將 `agents.defaults.workspace` 設定為該路徑。
3. 執行 `openclaw setup --workspace <path>` 以植入任何遺失的檔案。
4. 如果您需要 sessions，請從舊機器單獨複製
   `~/.openclaw/agents/<agentId>/sessions/`。

## 進階說明

- Multi-agent routing 可以針對每個 agent 使用不同的 workspace。請參閱
  [Channel routing](/zh-Hant/channels/channel-routing) 以了解路由設定。
- 如果啟用了 `agents.defaults.sandbox`，非主要會話可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每個會話沙箱工作區。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
