---
summary: "用於代理擁有的卡片和會話移交的選用儀表板工作板"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Workboard 外掛程式"
---

Workboard 外掛程式為 [Control UI](/zh-Hant/web/control-ui) 新增了一個選用的看板樣式面板。您可以用它來收集適合代理程式的工作卡片，將其指派給代理程式，並從卡片跳轉至連結的儀表板工作階段。Workboard 設計上保持精簡。它追蹤 OpenClaw Gateway 的本機運作工作；它並非用來取代 GitHub Issues、Linear、Jira 或其他團隊專案管理系統。

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
- status: `triage`, `backlog`, `todo`, `scheduled`, `ready`, `running`,
  `review`, `blocked`, 或 `done`
- priority: `low`, `normal`, `high`, 或 `urgent`
- 標籤
- 選用的代理 ID
- 選用的連結會話、執行、任務或來源 URL
- 選用的執行元資料，用於從卡片啟動的 Codex 或 Claude 會話
- 關於嘗試、評論、連結、證明、成品、自動化、
  附件、Worker 日誌、Worker 通訊協定狀態、認領、診斷、
  通知、範本、封存狀態以及過期工作階段偵測的精簡元資料
- 最近的卡片事件，例如已建立、已移動、已連結、已認領、心跳、
  嘗試、證明、成品、診斷、通知、分派、封存、過期、
  或由代理程式更新的變更

卡片儲存在外掛程式的 Gateway 狀態中。它們位於 Gateway 狀態目錄的本機位置，並會隨著該 Gateway 的其餘 OpenClaw 狀態一起移動。

Workboard 會為每張卡片保存精簡的元資料，讓操作員無需開啟關聯的工作階段即可查看卡片在看板上的移動歷程。事件、嘗試摘要、證明片段、相關連結、註解、歸檔標記和過期工作階段標記皆屬於刻意設計的本地元資料；它們並不取代工作階段紀錄或 GitHub 議題歷史。

## 卡片執行

未連結的卡片可以從卡片直接開始工作。「開始」會使用 Gateway 設定的預設代理程式與模型。Codex 和 Claude 動作是選用的明確模型選擇：

- 「執行 Codex」或「執行 Claude」會建立儀表板工作階段、傳送卡片提示，
  並將卡片標記為 `running`。
- 「開啟 Codex」或「開啟 Claude」會建立一個連結的儀表板工作階段，而不會發送卡片提示或移動卡片，因此您可以在卡片保持連結至看板時手動進行工作。

執行元資料會將選定的引擎、模式、模型參照、工作階段金鑰、
執行 ID 和生命週期狀態儲存在卡片上。Codex 執行使用
`openai/gpt-5.5`；Claude 執行使用 `anthropic/claude-sonnet-4-6`。

每個連結的執行也會在同一張卡片紀錄中記錄嘗試摘要。嘗試摘要會保留引擎、模式、模型、執行 ID、時間戳記、狀態和滾動失敗計數，使重複失敗在看板上保持可見。

## 代理程式協調

Workboard 也會公開選用的代理程式工具，用於具備面板感知能力的工作流程：

- `workboard_list` 列出包含認領和診斷狀態的精簡卡片，並可使用選用
  的面板篩選器。
- `workboard_read` 會傳回一張卡片，加上由筆記、
  嘗試、評論、連結、證明、成品、父項結果、最近的受指派者
  工作和作用中診斷所建構的有限 Worker 內容。
- `workboard_create` 會建立一張卡片，其中包含選用的父項、租用戶、技能、
  面板、工作區元資料、冪等金鑰、執行時間限制和重試預算。
- `workboard_link` 將父卡片與子卡片連結。子卡片停留在 `todo`
  直到每個父卡片都達到 `done`；然後調度升級會將它們移至
  `ready`。
- `workboard_claim` 為呼叫的代理聲明一張卡片，並將待辦清單、待辦事項
  或就緒的卡片移至 `running`。
- `workboard_heartbeat` 在較長的執行期間重新整理聲明心跳。
- `workboard_release` 在完成、暫停或移交後釋放聲明，
  並可將卡片移至下一個狀態。
- `workboard_complete` 和 `workboard_block` 是結構化的生命週期工具，用於
  最終摘要、證明、工件、已建立卡片清單和阻礙
  原因。已建立卡片清單必須參考連結回已完成卡片的卡片，
  這可防止幻影子項目出現在摘要中。
- `workboard_attachment_add`、`workboard_attachment_read` 和
  `workboard_attachment_delete` 將小型卡片附件儲存在插件的 SQLite
  狀態中，在卡片上對其進行索引，並在工作者上下文中公開它們。
- `workboard_worker_log` 和 `workboard_protocol_violation` 記錄工作者記錄
  行，並當自動化工作者在未呼叫
  `workboard_complete` 或 `workboard_block` 的情況下停止時阻擋卡片。
- `workboard_board_create`、`workboard_board_archive` 和
  `workboard_board_delete` 管理持久化的看板元數據，例如顯示名稱、
  描述、封存狀態和預設工作區。
- `workboard_runs` 返回儲存在卡片上的持久化執行嘗試歷史記錄。
- `workboard_specify` 將粗略的分類或待辦清單卡片轉換為闡明後的
  `todo` 卡片，並在卡片上記錄規格摘要。
- `workboard_decompose` 將父協調卡片分發為連結的子卡片，
  繼承看板和租戶元數據，並可透過已建立卡片清單完成父卡片。
- `workboard_notify_subscribe`、`workboard_notify_list`、
  `workboard_notify_events`、`workboard_notify_advance` 和
  `workboard_notify_unsubscribe` 管理外掛程式狀態中的通知訂閱。事件讀取是重放安全的；進階工具會移動持久游標，
  以便呼叫端可以恢復而不會遺失或重讀已完成、失敗或過時的卡片事件。
- `workboard_boards`、`workboard_stats`、`workboard_promote`、
  `workboard_reassign`、`workboard_reclaim`、`workboard_comment`、
  `workboard_proof`、`workboard_unblock` 和 `workboard_dispatch` 讓代理程式
  能夠檢查看板命名空間、檢視佇列統計資料、復原卡住的工作、新增交接
  附註、附加證明或成品參照、將受阻的工作移回 `todo`，
  以及推動相依性提升或過時宣告的清理。

已宣告的卡片會拒絕來自其他代理程式的代理程式工具變更，除非呼叫端
擁有由 `workboard_claim` 傳回的宣告權杖。儀表板操作員仍使用
正常的 Gateway RPC 介面，並可復原或重新分配卡片。

Workboard 將持久的看板資料儲存在外掛程式擁有的關聯式 SQLite 資料庫中，
該資料庫位於 OpenClaw 狀態目錄下。看板、卡片、標籤、生命週期事件、
執行嘗試、註解、相依性連結、證明、成品參照、
附件中繼資料和 blob、診斷、通知、工作者記錄、
通訊協定狀態和訂閱會持續存在於 Workboard 資料表中，而不是
外掛程式的鍵值項目中。卡片匯出仍會保留看板敘事，
而不會內聯附件 blob 內容。

在 `.28` 版本中使用 Workboard 的安裝可以執行
`openclaw doctor --fix`，將隨附的舊版外掛程式狀態命名空間
（`workboard.cards`、`workboard.boards` 和 `workboard.notify`）遷移到
關聯式資料庫中。如果存在舊版 `workboard.attachments` 命名空間，
doctor 也會遷移這些附件 blob。

工作板診斷是從本機卡片中繼資料計算出來的。內建的檢查會標記等待過久的已分配卡片、沒有心跳訊號的執行中卡片、需要關注的已封鎖卡片、重複的失敗、沒有證據的已完成卡片，以及只有鬆散連結會話的執行中卡片。

Dispatch 是特意設計為閘道本機的。它不會產生任意作業系統程序；正常的 OpenClaw 會話仍然擁有執行權。Dispatch 提示會促進準備就緒的相依卡片、在就緒的卡片上記錄 dispatch 中繼資料、封鎖過期的宣告或逾期的執行、將看板設定的分診卡片標記為協調候選項目，並為呼叫者留下持久的訊訂閱以傳遞通知。

看板中繼資料可以包含協調設定，例如 `autoDecompose`、`autoDecomposePerDispatch`、`defaultAssignee` 和 `orchestratorProfile`。OpenClaw 會記錄協調意圖並在工作者內容中公開它；實際的規格、分解或會話啟動仍然透過正常的工作板工具和儀表板會話流程進行。

## 會話生命週期同步

卡片可以連結到現有的儀表板會話，或是當您從卡片開始工作時建立的會話。連結的卡片會內嵌顯示會話生命週期：執行中、過時、連結閒置、已完成、失敗或遺失。

如果連結的會話遺失，卡片會保持連結以保留內容，並仍提供啟動控制，讓您可以重新開始工作到新的儀表板會話中。如果一個使用中的連結會話停止回報最近的活動，工作板會將卡片標記為過時，並將標記儲存為卡片中繼資料，直到生命週期將其清除。

您也可以從「Sessions」分頁使用「Add to Workboard」來擷取現有的儀表板會話。該卡片會連結到該會話，使用會話標籤或最近的使用者提示作為標題，並在聊天記錄可用時，從最近的使用者提示和最新的助理回應中植入註記。

當卡片仍處於主動工作狀態時，工作板會追蹤連結的會話：

- 使用中的連結會話 -> `running`
- 已完成的連結會話 -> `review`
- 失敗、被終止、逾時或中止的連結會話 -> `blocked`

手動審查狀態優先。如果您將卡片移至 `review`、`blocked` 或 `done`，
Workboard 將停止自動移動該卡片，直到您將其移回 `todo` 或
`running`。

## 儀表板工作流程

1. 在控制 UI 中開啟 Workboard 分頁。
2. 建立一張包含標題、筆記、優先順序、標籤、選用代理程式以及
   選用連結會話的卡片。
3. 或者開啟會話並選擇現有會話的「新增至 Workboard」。
4. 在欄位之間拖曳卡片，或使用欄位控制項。
5. 從卡片開始工作以建立或重複使用儀表板會話。
6. 在代理程式運作時，從卡片開啟連結的會話。
7. 讓生命週期同步將進行中的工作移至審查或封鎖狀態，然後在驗收通過後
   手動將卡片移至已完成。

啟動卡片會使用正常的 Gateway 會話。Workboard 外掛程式僅儲存
卡片元資料和連結；對話記錄、模型選擇和執行
生命週期仍由一般會話系統擁有。

在即時連結的卡片上使用「停止」以中止活動的會話執行。Workboard 會將
該卡片標記為 `blocked`，以便其保持可見以供後續跟進。

新卡片可以從 Workboard 範本開始，適用於錯誤修復、文件、發行版本、PR
審查或外掛程式工作。範本會預先填入標題、筆記、標籤和優先順序，
且選取的範本 ID 會儲存為卡片元資料。

## 權限

該外掛程式在 `workboard.*` 命名空間下註冊 Gateway RPC 方法：

- `workboard.cards.list` 需要 `operator.read`
- `workboard.cards.export` 需要 `operator.read`
- `workboard.cards.diagnostics` 需要 `operator.read`
- `workboard.cards.diagnostics.refresh` 需要 `operator.write`
- 附件列表/取得和通知事件讀取需要 `operator.read`
- 通知遊標前進需要 `operator.write`
- 建立、更新、移動、刪除、評論、連結、相依性連結、證明、產出成果、
  附件新增/刪除、工作記錄、協定違規、認領、心跳、
  釋放、完成、封鎖、解除封鎖、分派、批次和封存方法需要
  `operator.write`

以唯讀操作員權限連接的瀏覽器可以檢視面板，但無法變更卡片。

## 設定

Workboard 目前沒有外掛專屬的設定。請使用標準的外掛項目來啟用或停用它：

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

再次停用它：

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## 疑難排解

### 分頁顯示 Workboard 無法使用

檢查外掛原則：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果設定了 `plugins.allow`，請將 `workboard` 加入該允許清單。如果 `plugins.deny` 包含 `workboard`，請在啟用外掛前將其移除。

### 卡片未儲存

請確認瀏覽器連線具有 `operator.write` 權限。唯讀操作員工作階段可以列出卡片，但無法建立、編輯、移動或刪除它們。

### 啟動卡片未開啟預期的工作階段

Workboard 會建立連結至一般儀表板工作階段的連結。請檢查卡片的代理程式 ID 和連結的工作階段，然後開啟 Sessions 或 Chat 視圖以檢查實際執行狀態。

## 相關

- [Control UI](/zh-Hant/web/control-ui)
- [Plugins](/zh-Hant/tools/plugin)
- [Manage plugins](/zh-Hant/plugins/manage-plugins)
- [Sessions](/zh-Hant/concepts/session)
