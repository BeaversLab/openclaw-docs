---
summary: "Agent workspace：位置、佈局與備份策略"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Agent workspace"
sidebarTitle: "Agent workspace"
---

工作區是 Agent 的家。它是檔案工具和工作區內容使用的唯一工作目錄。請保持私密並將其視為記憶。

這與 `~/.openclaw/` 分開，後者儲存設定、認證資訊和工作階段。

<Warning>
工作區是 **預設的 cwd**，而不是嚴格的沙盒。工具會根據工作區解析相對路徑，但除非啟用沙盒機制，否則絕對路徑仍可存取主機上的其他位置。如果您需要隔離，請使用 [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) (和/或每個 Agent 的沙盒設定)。

當啟用沙盒且 `workspaceAccess` 不為 `"rw"` 時，工具會在 `~/.openclaw/sandboxes` 下的沙盒工作區內運作，而不是您的主機工作區。

</Warning>

## 預設位置

- 預設值：`~/.openclaw/workspace`
- 如果設定了 `OPENCLAW_PROFILE` 且不為 `"default"`，預設值會變為 `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆寫：

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 將會建立工作區並在缺少時植入啟動檔案。

<Note>沙盒植入副本僅接受工作區內的常規檔案；解析至來源工作區外部的符號連結/硬連結別名將被忽略。</Note>

如果您已經自行管理工作區檔案，您可以停用啟動檔案的建立：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 額外的工作區資料夾

較舊的安裝可能會建立 `~/openclaw`。保留多個工作區目錄可能會導致認證或狀態漂移混亂，因為一次只有一個工作區是啟用的。

<Note>
**建議：** 保持單一啟用的工作區。如果您不再使用額外的資料夾，請將其封存或移至垃圾桶 (例如 `trash ~/openclaw`)。如果您有意保留多個工作區，請確保 `agents.defaults.workspace` 指向啟用的那一個。

`openclaw doctor` 在偵測到額外的工作區目錄時會發出警告。

</Note>

## 工作區檔案對應

以下是 OpenClaw 預期在工作區內的標準檔案：

<AccordionGroup>
  <Accordion title="AGENTS.md — operating instructions">Agent 的操作說明及其應如何使用記憶。在每次會話開始時載入。這是放置規則、優先事項和「行為方式」細節的好地方。</Accordion>
  <Accordion title="SOUL.md — persona and tone">Persona、語氣和邊界。每個會話都會載入。指南：[SOUL.md personality guide](/zh-Hant/concepts/soul)。</Accordion>
  <Accordion title="USER.md — who the user is">使用者是誰以及如何稱呼他們。每個會話都會載入。</Accordion>
  <Accordion title="IDENTITY.md — name, vibe, emoji">Agent 的名稱、氛圍和表情符號。在啟動儀式期間建立/更新。</Accordion>
  <Accordion title="TOOLS.md — local tool conventions">關於您的本機工具和慣例的註記。不會控制工具的可用性；它僅作為指導。</Accordion>
  <Accordion title="HEARTBEAT.md — heartbeat checklist">心跳執行的可選小型檢查清單。保持簡短以避免耗用 token。</Accordion>
  <Accordion title="BOOT.md — startup checklist">在閘道重新啟動時自動執行的可選啟動檢查清單（當啟用 [internal hooks](/zh-Hant/automation/hooks) 時）。保持簡短；對外傳送請使用訊息工具。</Accordion>
  <Accordion title="BOOTSTRAP.md — first-run ritual">一次性首次執行儀式。僅為全新的工作區建立。儀式完成後將其刪除。</Accordion>
  <Accordion title="memory/YYYY-MM-DD.md — daily memory log">每日記憶日誌（每天一個檔案）。建議在會話開始時讀取今天 + 昨天的內容。</Accordion>
  <Accordion title="MEMORY.md — curated long-term memory (optional)">經策展的長期記憶。僅在主要的私人會話中載入（非共享/群組情境）。請參閱 [Memory](/zh-Hant/concepts/memory) 以了解工作流程和自動記憶清除。</Accordion>
  <Accordion title="skills/ — workspace skills (optional)">工作區特定的技能。該工作區優先順序最高的技能位置。當名稱衝突時，會覆蓋專案代理技能、個人代理技能、受管理技能、捆綁技能和 `skills.load.extraDirs`。</Accordion>
  <Accordion title="canvas/ — Canvas UI files (optional)">用於節點顯示的 Canvas UI 檔案（例如 `canvas/index.html`）。</Accordion>
</AccordionGroup>

<Note>如果任何引導檔案缺失，OpenClaw 會將「缺失檔案」標記插入會話並繼續。大型引導檔案在插入時會被截斷；請使用 `agents.defaults.bootstrapMaxChars`（預設值：12000）和 `agents.defaults.bootstrapTotalMaxChars`（預設值：60000）調整限制。`openclaw setup` 可以重新建立缺失的預設值，而不會覆寫現有檔案。</Note>

## 什麼不在工作區內

這些位於 `~/.openclaw/` 之下，不應提交到工作區 repo：

- `~/.openclaw/openclaw.json`（組態）
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（模型驗證設定檔：OAuth + API 金鑰）
- `~/.openclaw/credentials/`（通道/提供者狀態以及舊版 OAuth 匯入資料）
- `~/.openclaw/agents/<agentId>/sessions/`（會話逐字稿 + 中繼資料）
- `~/.openclaw/skills/`（受管理技能）

如果您需要遷移會話或組態，請單獨複製它們，並將其排除在版本控制之外。

## Git 備份（建議，私人）

將工作區視為私人記憶。將其放在 **私人** git repo 中，以便進行備份和復原。

在執行 Gateway 的機器上執行這些步驟（這也是工作區所在的位置）。

<Steps>
  <Step title="初始化儲存庫">
    如果已安裝 git，全新的工作區會自動初始化。如果此工作區尚未建立儲存庫，請執行：

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step title="新增私人遠端">
    <Tabs>
      <Tab title="GitHub 網頁介面">
        1. 在 GitHub 上建立一個新的**私人**儲存庫。
        2. 不要使用 README 初始化（避免合併衝突）。
        3. 複製 HTTPS 遠端 URL。
        4. 新增遠端並推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
      <Tab title="GitHub CLI (gh)">
        ```bash
        gh auth login
        gh repo create openclaw-workspace --private --source . --remote origin --push
        ```
      </Tab>
      <Tab title="GitLab 網頁介面">
        1. 在 GitLab 上建立一個新的**私人**儲存庫。
        2. 不要使用 README 初始化（避免合併衝突）。
        3. 複製 HTTPS 遠端 URL。
        4. 新增遠端並推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="持續更新">
    ```bash
    git status
    git add .
    git commit -m "Update memory"
    git push
    ```
  </Step>
</Steps>

## 切勿提交秘密金鑰

<Warning>
即使在私人儲存庫中，也請避免在工作區中儲存秘密金鑰：

- API 金鑰、OAuth 權杖、密碼或私密憑證。
- `~/.openclaw/` 下的任何內容。
- 聊天的原始傾印或敏感附件。

如果您必須儲存敏感的參考資料，請使用預留位置，並將真正的秘密金鑰儲存在其他地方（密碼管理器、環境變數或 `~/.openclaw/`）。

</Warning>

建議的 `.gitignore` 入門檔案：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 將工作區移至新機器

<Steps>
  <Step title="複製儲存庫">
    將儲存庫複製到所需路徑（預設為 `~/.openclaw/workspace`）。
  </Step>
  <Step title="更新設定">
    在 `~/.openclaw/openclaw.json` 中將 `agents.defaults.workspace` 設定為該路徑。
  </Step>
  <Step title="補充缺少的檔案">
    執行 `openclaw setup --workspace <path>` 以補充任何缺少的檔案。
  </Step>
  <Step title="複製工作階段（選用）">
    如果您需要工作階段，請從舊機器單獨複製 `~/.openclaw/agents/<agentId>/sessions/`。
  </Step>
</Steps>

## 進階說明

- 多代理程式路由可以為每個代理程式使用不同的工作區。請參閱 [通道路由](/zh-Hant/channels/channel-routing) 以了解路由設定。
- 如果啟用了 `agents.defaults.sandbox`，非主要工作階段可以在 `agents.defaults.sandbox.workspaceRoot` 下使用各別工作階段的沙箱工作區。

## 相關

- [Heartbeat](/zh-Hant/gateway/heartbeat) — HEARTBEAT.md 工作區檔案
- [沙箱隔離](/zh-Hant/gateway/sandboxing) — 沙箱環境中的工作區存取
- [工作階段](/zh-Hant/concepts/session) — 工作階段儲存路徑
- [長效指令](/zh-Hant/automation/standing-orders) — 工作區檔案中的持續性指令
