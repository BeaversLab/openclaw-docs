---
summary: "用於代理擁有的卡片和會話移交的選用儀表板工作板"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Workboard 外掛程式"
---

Workboard 外掛程式為 [控制 UI](/zh-Hant/web/control-ui) 新增了一個選用的看板樣式看板。您可以使用它來收集代理層級的工作卡片，將其指派給代理，並從卡片跳轉到連結的儀表板會話。

Workboard 設計上保持精簡。它追蹤 OpenClaw Gateway 的本機運作工作；它並不是用來取代 GitHub Issues、Linear、Jira 或其他團隊專案管理系統的。

## 預設狀態

Workboard 是一個內附外掛程式，除非您在外掛程式設定中啟用它，否則預設為停用。

使用以下方式啟用：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

然後開啟儀表板：

```bash
openclaw dashboard
```

Workboard 分頁會出現在儀表板導覽中。如果分頁可見但外掛程式已停用或被 `plugins.allow` / `plugins.deny` 封鎖，檢視畫面會顯示外掛程式無法使用的狀態，而不是本機卡片資料。

## 卡片包含的內容

每張卡片儲存：

- 標題和備註
- 狀態：`backlog`、`todo`、`running`、`review`、`blocked` 或 `done`
- 優先順序：`low`、`normal`、`high` 或 `urgent`
- 標籤
- 選用的代理 ID
- 選用的連結會話、執行、任務或來源 URL
- 選用的執行元資料，用於從卡片啟動的 Codex 或 Claude 會話
- 嘗試次數、評論、連結、證明、範本、封存狀態和過期會話偵測的簡要元資料
- 最近的卡片事件，例如已建立、已移動、已連結、嘗試、證明、封存、過期或代理更新變更

卡片儲存在外掛程式的 Gateway 狀態中。它們位於 Gateway 狀態目錄的本機位置，並會隨著該 Gateway 的其餘 OpenClaw 狀態一起移動。

Workboard 會為每張卡片保存精簡的元資料，讓操作員無需開啟關聯的工作階段即可查看卡片在看板上的移動歷程。事件、嘗試摘要、證明片段、相關連結、註解、歸檔標記和過期工作階段標記皆屬於刻意設計的本地元資料；它們並不取代工作階段紀錄或 GitHub 議題歷史。

## 卡片執行

未連結的卡片可以從卡片直接開始工作。「開始」會使用 Gateway 設定的預設代理程式與模型。Codex 和 Claude 動作是選用的明確模型選擇：

- 「執行 Codex」或「執行 Claude」會建立一個儀表板工作階段、發送卡片提示，並將卡片標記為 `running`。
- 「開啟 Codex」或「開啟 Claude」會建立一個連結的儀表板工作階段，而不會發送卡片提示或移動卡片，因此您可以在卡片保持連結至看板時手動進行工作。

執行元資料會在卡片上儲存選取的引擎、模式、模型參照、工作階段金鑰、執行 ID 與生命週期狀態。Codex 執行使用 `openai/gpt-5.5`；Claude 執行則使用 `anthropic/claude-sonnet-4-6`。

每個連結的執行也會在同一張卡片紀錄中記錄嘗試摘要。嘗試摘要會保留引擎、模式、模型、執行 ID、時間戳記、狀態和滾動失敗計數，使重複失敗在看板上保持可見。

## 工作階段生命週期同步

卡片可以連結到現有的儀表板工作階段，或是連結到從卡片開始工作時所建立的工作階段。已連結的卡片會以行內方式顯示工作階段生命週期：執行中、過期、連結閒置、完成、失敗或遺失。

如果連結的工作階段遺失，卡片會保持連結以保留語境，並仍提供啟動控制項，讓您重新啟動工作至一個全新的儀表板工作階段。若一個活躍的連結工作階段停止回報近期活動，Workboard 會將卡片標記為過期，並將該標記儲存為卡片元資料，直到生命週期將其清除。

您也可以從「Sessions」分頁使用「加入 Workboard」來擷取現有的儀表板工作階段。卡片會連結至該工作階段，使用工作階段標籤或近期使用者提示作為標題，並在聊天記錄可用時，從近期使用者提示加上最新的助理回應來植入註解。

當卡片仍處於活躍工作狀態時，Workboard 會追蹤連結的工作階段：

- 活躍的連結工作階段 -> `running`
- completed linked session -> `review`
- failed, killed, timed out, or aborted linked session -> `blocked`

Manual review states win. If you move a card to `review`, `blocked`, or `done`,
Workboard stops auto-moving that card until you move it back to `todo` or
`running`.

## Dashboard workflow

1. Open the Workboard tab in the Control UI.
2. Create a card with a title, notes, priority, labels, optional agent, and
   optional linked session.
3. Or open Sessions and choose Add to Workboard for an existing session.
4. Drag the card between columns or use the column controls.
5. Start work from the card to create or reuse a dashboard session.
6. Open the linked session from the card while the agent works.
7. Let lifecycle sync move running work into review or blocked, then manually
   move the card to done when accepted.

Starting a card uses normal Gateway sessions. The Workboard plugin only stores
card metadata and links; the conversation transcript, model selection, and run
lifecycle stay owned by the regular session system.

Use Stop on a live linked card to abort the active session run. Workboard marks
that card `blocked` so it remains visible for follow-up.

New cards can start from Workboard templates for bugfixes, docs, releases, PR
reviews, or plugin work. Templates prefill title, notes, labels, and priority,
and the selected template id is stored as card metadata.

## Permissions

The plugin registers Gateway RPC methods under the `workboard.*` namespace:

- `workboard.cards.list` requires `operator.read`
- `workboard.cards.export` requires `operator.read`
- create, update, move, delete, comment, link, proof, and archive methods require `operator.write`

Browsers connected with read-only operator access can inspect the board but
cannot mutate cards.

## Configuration

Workboard has no plugin-specific config today. Enable or disable it with the
standard plugin entry:

```json5
{
  plugins: {
    entries: {
      workboard: {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Disable it again with:

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## Troubleshooting

### The tab says Workboard is unavailable

Check plugin policy:

```bash
openclaw plugins inspect workboard --runtime --json
```

如果已配置 `plugins.allow`，請將 `workboard` 加入該允許清單。如果 `plugins.deny` 包含 `workboard`，請在啟用此外掛前將其移除。

### 卡片無法儲存

請確認瀏覽器連線具有 `operator.write` 存取權限。唯讀的操作員工作階段可以列出卡片，但無法建立、編輯、移動或刪除它們。

### 啟動卡片不會開啟預期的工作階段

工作板會建立連至一般儀表板工作階段的連結。請檢查卡片的代理程式 ID 和連結的工作階段，然後開啟「工作階段」或「聊天」檢視以檢查實際的執行狀態。

## 相關

- [Control UI](/zh-Hant/web/control-ui)
- [Plugins](/zh-Hant/tools/plugin)
- [Manage plugins](/zh-Hant/plugins/manage-plugins)
- [Sessions](/zh-Hant/concepts/session)
