---
summary: "Agent workspace：位置、佈局與備份策略"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Agent Workspace"
---

# Agent workspace

Workspace 是 agent 的家。這是檔案工具和 workspace context 使用的唯一工作目錄。請將其保持私密，並將其視為記憶體。

這與 `~/.openclaw/` 是分開的，後者儲存設定、憑證和
sessions。

**重要提示：**工作區是**預設的當前工作目錄 (cwd)**，而非嚴格的沙箱。工具會根據工作區解析相對路徑，但除非啟用沙箱功能，否則絕對路徑仍可存取主機上的其他位置。如果您需要隔離，請使用 [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) (和/或每個 Agent 的沙箱設定)。
當啟用沙箱且 `workspaceAccess` 不是 `"rw"` 時，工具會在 `~/.openclaw/sandboxes` 下的沙箱工作區內運作，而非您的主機工作區。

## 預設位置

- 預設：`~/.openclaw/workspace`
- 如果設定了 `OPENCLAW_PROFILE` 且非 `"default"`，預設值將變為
  `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆寫：

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 將會建立工作區，並在缺少啟動檔案時植入這些檔案。
Sandbox seed 複本僅接受工作區內的一般檔案；解析至來源工作區外部的 symlink/hardlink 別名將被忽略。

如果您已自行管理工作區檔案，可以停用啟動檔案的建立：

```json5
{ agent: { skipBootstrap: true } }
```

## 額外的工作區資料夾

較舊的安裝可能已建立了 `~/openclaw`。保留多個工作區目錄可能會導致令人困惑的身份驗證或狀態漂移，因為一次只有一個工作區是處於啟用狀態。

**建議：** 維護單一的使用中工作區。如果您不再使用額外資料夾，請將其封存或移至垃圾桶（例如 `trash ~/openclaw`）。
如果您有意保持多個工作區，請確保 `agents.defaults.workspace` 指向使用中的那一個。

當偵測到額外的工作區目錄時，`openclaw doctor` 會發出警告。

## 工作區檔案對照（各檔案的含義）

這些是 OpenClaw 在工作區內期望的標準檔案：

- `AGENTS.md`
  - 代理的操作指令，以及它應如何使用記憶。
  - 在每個工作階段開始時載入。
  - 放置規則、優先順序和「如何表現」細節的好地方。

- `SOUL.md`
  - 人格、語氣和界限。
  - 每個工作階段都會載入。

- `USER.md`
  - 使用者是誰以及如何稱呼他們。
  - 每個工作階段都會載入。

- `IDENTITY.md`
  - 代理的名稱、氛圍和表情符號。
  - 在引導儀式期間建立/更新。

- `TOOLS.md`
  - 關於您的本機工具和慣例的筆記。
  - 不控制工具的可用性；它僅供參考。

- `HEARTBEAT.md`
  - 可選的心跳執行微型檢查清單。
  - 保持簡短以避免消耗 token。

- `BOOT.md`
  - 當啟用內部掛鉤時，在閘道重新啟動時執行的可選啟動檢查清單。
  - 保持簡短；使用訊息工具進行外部發送。

- `BOOTSTRAP.md`
  - 一次性首次執行儀式。
  - 僅為全新的工作區建立。
  - 儀式完成後將其刪除。

- `memory/YYYY-MM-DD.md`
  - 每日記憶日誌（每天一個檔案）。
  - 建議在會話開始時閱讀今天 + 昨天的內容。

- `MEMORY.md` （可選）
  - 策展的長期記憶。
  - 僅在主要的私人會話中載入（非共享/群組上下文）。

請參閱 [Memory](/zh-Hant/concepts/memory) 以了解工作流程和自動記憶體清除。

- `skills/`（可選）
  - 工作區特定技能。
  - 當名稱衝突時，會覆寫受管理/捆綁的技能。

- `canvas/`（可選）
  - 用於節點顯示的 Canvas UI 檔案（例如 `canvas/index.html`）。

如果缺少任何啟動檔案，OpenClaw 會將「缺少檔案」標記注入
到會話中並繼續。大型啟動檔案在注入時會被截斷；
請使用 `agents.defaults.bootstrapMaxChars`（預設值：20000）和
`agents.defaults.bootstrapTotalMaxChars`（預設值：150000）調整限制。
`openclaw setup` 可以重建缺少的預設值，而不會覆寫現有
檔案。

## 工作區中沒有什麼

這些位於 `~/.openclaw/` 之下，且不應提交到 workspace 儲存庫：

- `~/.openclaw/openclaw.json` (設定)
- `~/.openclaw/credentials/` (OAuth 權杖、API 金鑰)
- `~/.openclaw/agents/<agentId>/sessions/` (會話記錄 + 元資料)
- `~/.openclaw/skills/` (受管理的技能)

如果您需要遷移會話或設定，請單獨複製它們，並將其排除在版本控制之外。

## Git 備份（建議，私人）

將 workspace 視為私人記憶體。將其放入 **私人** git 儲存庫中，以便進行備份和復原。

在執行 Gateway 的機器上執行這些步驟（這是 workspace 所在的位置）。

### 1) 初始化儲存庫

如果安裝了 git，全新的 workspace 會自動初始化。如果此 workspace 尚不是儲存庫，請執行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 新增私人遠端（新手友善選項）

選項 A：GitHub 網頁介面

1. 在 GitHub 上建立一個新的 **私人** 儲存庫。
2. 請不要使用 README 進行初始化（以避免合併衝突）。
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

1. 在 GitLab 上建立一個新的**私人**存儲庫 (repository)。
2. 請不要使用 README 進行初始化（以避免合併衝突）。
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

## 不要提交秘密

即使在私人存儲庫中，也請避免在工作區中儲存秘密：

- API 金鑰、OAuth 權杖、密碼或私人憑證。
- 位於 `~/.openclaw/` 下的任何內容。
- 對話的原始傾印或敏感附件。

如果您必須儲存敏感參考，請使用佔位符並將真正的
秘密存放在其他地方（密碼管理器、環境變數或 `~/.openclaw/`）。

建議的 `.gitignore` 入門範本：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 將工作區移至新機器

1. 將儲存庫複製到所需路徑（預設為 `~/.openclaw/workspace`）。
2. 在 `~/.openclaw/openclaw.json` 中將 `agents.defaults.workspace` 設定為該路徑。
3. 執行 `openclaw setup --workspace <path>` 以填入任何缺少的檔案。
4. 如果您需要會話 (sessions)，請單獨從舊機器複製 `~/.openclaw/agents/<agentId>/sessions/`。

## 進階說明

- 多代理程式路由可以為每個代理程式使用不同的工作區。請參閱
  [通道路由](/zh-Hant/channels/channel-routing) 以了解路由設定。
- 如果已啟用 `agents.defaults.sandbox`，非主要會話可以使用 `agents.defaults.sandbox.workspaceRoot` 下的個別會話沙箱
  工作區。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
