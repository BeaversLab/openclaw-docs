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
工作區是 **預設 cwd**，並非硬體沙箱。工具會根據工作區解析相對路徑，但除非啟用沙箱，否則絕對路徑仍可存取主機上的其他位置。如果您需要隔離，請使用 [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) (和/或每個 Agent 的沙箱設定)。

當啟用沙箱且 `workspaceAccess` 不是 `"rw"` 時，工具會在 `~/.openclaw/sandboxes` 下的沙箱工作區內運作，而非您的主機工作區。

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
  <Accordion title="AGENTS.md - 操作說明">Agent 的操作說明以及它應如何使用記憶體。在每次會話開始時載入。這是放置規則、優先事項和「行為方式」細節的好地方。</Accordion>
  <Accordion title="SOUL.md - 人格與語氣">人格、語氣和邊界。每次會話都會載入。指南：[SOUL.md 個性指南](/zh-Hant/concepts/soul)。</Accordion>
  <Accordion title="USER.md - 使用者身分">使用者是誰以及如何稱呼他們。每次會話都會載入。</Accordion>
  <Accordion title="IDENTITY.md - 名稱、氛圍、表情符號">Agent 的名稱、氛圍和表情符號。在啟動儀式期間建立/更新。</Accordion>
  <Accordion title="TOOLS.md - 本地工具慣例">關於您的本地工具和慣例的筆記。不會控制工具的可用性；它僅供參考。</Accordion>
  <Accordion title="HEARTBEAT.md - 心跳檢查清單">用於心跳運行的可選小型檢查清單。保持簡短以避免消耗 Token。</Accordion>
  <Accordion title="BOOT.md - 啟動檢查清單">可選的啟動檢查清單，會在閘道重新啟動時自動執行 (當 [內部掛勾](/zh-Hant/automation/hooks) 啟用時)。保持簡短；使用訊息工具進行外部發送。</Accordion>
  <Accordion title="BOOTSTRAP.md - 首次運行儀式">一次性首次運行儀式。僅為全新的工作區建立。儀式完成後請將其刪除。</Accordion>
  <Accordion title="memory/YYYY-MM-DD.md - 每日記憶日誌">每日記憶日誌（每天一個檔案）。建議在會話開始時閱讀今天和昨天的日誌。</Accordion>
  <Accordion title="MEMORY.md - 精選長期記憶（可選）">精選長期記憶：持久的事實、偏好、決定和簡短摘要。將詳細日誌保存在 `memory/YYYY-MM-DD.md` 中，以便記憶工具可以按需檢索它們，而無需將其注入到每個提示詞中。僅在主要的私有會話中載入 `MEMORY.md`（而非共享/群組上下文）。有關工作流程和自動記憶清除，請參閱 [記憶](/zh-Hant/concepts/memory)。</Accordion>
  <Accordion title="skills/ - 工作區技能（可選）">特定於工作區的技能。該工作區優先順序最高的技能位置。當名稱衝突時，會覆蓋專案代理技能、個人代理技能、受管理技能、捆綁技能和 `skills.load.extraDirs`。</Accordion>
  <Accordion title="canvas/ - Canvas UI 檔案（可選）">用於節點顯示的 Canvas UI 檔案（例如 `canvas/index.html`）。</Accordion>
</AccordionGroup>

<Note>如果缺少任何啟動檔案，OpenClaw 會在會話中注入「缺少檔案」標記並繼續。大型啟動檔案在注入時會被截斷；可使用 `agents.defaults.bootstrapMaxChars`（預設值：12000）和 `agents.defaults.bootstrapTotalMaxChars`（預設值：60000）調整限制。`openclaw setup` 可以重新建立缺少的預設檔案，而不會覆蓋現有檔案。</Note>

## 什麼不在工作區內

這些位於 `~/.openclaw/` 下，不應提交到工作區儲存庫：

- `~/.openclaw/openclaw.json`（設定）
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（模型驗證設定檔：OAuth + API 金鑰）
- `~/.openclaw/agents/<agentId>/agent/codex-home/` (每個 Agent Codex 執行時期帳戶、設定、技能、外掛和原生執行緒狀態)
- `~/.openclaw/credentials/` (通道/提供者狀態加上舊版 OAuth 匯入資料)
- `~/.openclaw/agents/<agentId>/sessions/` (會話記錄 + 元資料)
- `~/.openclaw/skills/` (受管理技能)

如果您需要遷移會話或設定，請單獨複製它們，並不要將其放入版本控制中。

## Git 備份 (建議，私密)

將工作區視為私密記憶體。將其放入 **私有** git 儲存庫中，以便進行備份和還原。

在執行 Gateway 的機器上執行這些步驟 (這也是工作區所在的位置)。

<Steps>
  <Step title="初始化儲存庫">
    如果已安裝 git，全新的工作區會自動初始化。如果此工作區尚未成為儲存庫，請執行：

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step title="新增私有遠端">
    <Tabs>
      <Tab title="GitHub 網頁介面">
        1. 在 GitHub 上建立一個新的 **私有** 儲存庫。
        2. 不要使用 README 初始化 (以避免合併衝突)。
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
        1. 在 GitLab 上建立一個新的 **私有** 儲存庫。
        2. 不要使用 README 初始化 (以避免合併衝突)。
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

## 請勿提交機密

<Warning>
即使在私有儲存庫中，也要避免在工作區中儲存機密：

- API 金鑰、OAuth 權杖、密碼或私密憑證。
- `~/.openclaw/` 下的任何內容。
- 聊天的原始傾印或敏感附件。

如果您必須儲存敏感參考資料，請使用預留位置，並將真正的機密存放在其他地方 (密碼管理員、環境變數或 `~/.openclaw/`)。

</Warning>

建議的 `.gitignore` 入門指令：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 將工作區移動到新機器

<Steps>
  <Step title="複製儲存庫">
    將儲存庫複製到所需路徑（預設為 `~/.openclaw/workspace`）。
  </Step>
  <Step title="更新設定">
    在 `~/.openclaw/openclaw.json` 中將 `agents.defaults.workspace` 設定為該路徑。
  </Step>
  <Step title="建立缺失檔案">
    執行 `openclaw setup --workspace <path>` 以建立任何缺失的檔案。
  </Step>
  <Step title="複製工作階段（可選）">
    如果您需要工作階段，請從舊機器單獨複製 `~/.openclaw/agents/<agentId>/sessions/`。
  </Step>
</Steps>

## 進階說明

- 多代理路由可以為每個代理使用不同的工作區。請參閱 [通道路由](/zh-Hant/channels/channel-routing) 以了解路由設定。
- 如果啟用了 `agents.defaults.sandbox`，非主要工作階段可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每工作階段沙箱工作區。

## 相關主題

- [Heartbeat](/zh-Hant/gateway/heartbeat) - HEARTBEAT.md 工作區檔案
- [沙箱機制](/zh-Hant/gateway/sandboxing) - 沙箱環境中的工作區存取
- [工作階段](/zh-Hant/concepts/session) - 工作階段儲存路徑
- [常駐指令](/zh-Hant/automation/standing-orders) - 工作區檔案中的持續性指令
