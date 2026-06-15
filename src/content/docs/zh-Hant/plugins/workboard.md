---
summary: "用於代理擁有的卡片和工作階段移交的選用儀表板看板"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Workboard 外掛程式"
---

Workboard 外掛程式會將選用的看板樣式面板新增至 [Control UI](/zh-Hant/web/control-ui)。您可以使用它來收集適合代理的工作卡片、將其指派給代理，並從單一卡片追蹤連結的背景工作、執行和儀表板工作階段。

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

Workboard 分頁會出現在儀表板導覽中。如果分頁可見，但外掛程式已停用或被 `plugins.allow` / `plugins.deny` 封鎖，則檢視畫面會顯示外掛程式無法使用的狀態，而不是本機卡片資料。

## 卡片包含的內容

每張卡片儲存：

- 標題和備註
- status: `triage`、`backlog`、`todo`、`scheduled`、`ready`、`running`、
  `review`、`blocked` 或 `done`
- priority: `low`、`normal`、`high` 或 `urgent`
- 標籤
- 選用的代理 ID
- 選用的連結工作、執行、工作階段或來源 URL
- 從卡片啟動的 Codex 或 Claude 執行的選用執行中繼資料
- 關於嘗試、評論、連結、證明、成品、自動化、
  附件、Worker 日誌、Worker 通訊協定狀態、認領、診斷、
  通知、範本、封存狀態以及過期工作階段偵測的精簡元資料
- 最近的卡片事件，例如已建立、已移動、已連結、已認領、心跳、
  嘗試、證明、成品、診斷、通知、分派、封存、過期、
  或由代理程式更新的變更

卡片儲存在外掛程式的 Gateway 狀態中。它們位於 Gateway 狀態目錄的本機位置，並會隨著該 Gateway 的其餘 OpenClaw 狀態一起移動。

Workboard 會為每張卡片保存精簡的元資料，讓操作員無需開啟關聯的工作階段即可查看卡片在看板上的移動歷程。事件、嘗試摘要、證明片段、相關連結、註解、歸檔標記和過期工作階段標記皆屬於刻意設計的本地元資料；它們並不取代工作階段紀錄或 GitHub 議題歷史。

## 卡片執行與工作

未連結的卡片可以從卡片開始工作。自主啟動會使用 Gateway 的工作追蹤代理執行路徑，然後 Workboard 會將產生的工作、執行 ID 和工作階段金鑰連結回卡片。啟動會使用 Gateway 設定的預設代理和模型。Codex 和 Claude 動作是選用的明確模型選擇：

- Run Codex 或 Run Claude 會啟動工作支援的代理執行，傳送卡片提示，並將卡片標記為 `running`。
- 「開啟 Codex」或「開啟 Claude」會建立一個連結的儀表板工作階段，而不會發送卡片提示或移動卡片，因此您可以在卡片保持連結至看板時手動進行工作。

執行中繼資料會在卡片上儲存選擇的引擎、模式、模型參照、工作階段金鑰、執行 ID、工作 ID (如果有的話) 以及生命週期狀態。Codex 執行使用 `openai/gpt-5.5`；Claude 執行使用
`anthropic/claude-sonnet-4-6`。

每個連結的執行也會在同一張卡片紀錄中記錄嘗試摘要。嘗試摘要會保留引擎、模式、模型、執行 ID、時間戳記、狀態和滾動失敗計數，使重複失敗在看板上保持可見。

儀表板會從 Gateway 任務分類帳重新整理任務狀態，並透過任務 ID、執行 ID 或連結的工作階段金鑰將任務對應回卡片。如果任務已排入佇列或正在執行，卡片生命週期會顯示作用中任務狀態。如果任務完成、失敗、逾時或被取消，卡片生命週期會使用與連結工作階段相同的生命週期同步，移向審閱或封鎖狀態。

## Agent 協調

Workboard 也公開了可選的 Agent 工具，用於感知看板的工作流程：

- `workboard_list` 列出包含認領與診斷狀態的精簡卡片，並包含一個可選的看板篩選器。
- `workboard_read` 傳回一張卡片以及從備註、嘗試、留言、連結、證明、產出項目、父項結果、近期指派者工作和主動診斷所建立的受限制工作者背景。
- `workboard_create` 建立一張卡片，並可選擇包含父項、租戶、技能、看板、工作區中繼資料、冪等金鑰、執行時間限制和重試預算。
- `workboard_link` 將父卡片連結到子卡片。子卡片會保持在 `todo`，直到每個父項都達到 `done`；然後分派升級會將它們移至 `ready`。
- `workboard_claim` 為呼叫中的 Agent 認領一張卡片，並將待辦清單、待辦事項或就緒卡片移至 `running`。
- `workboard_heartbeat` 在較長時間的執行期間重新整理認領心跳。
- `workboard_release` 在完成、暫停或移交後釋放認領，並可將卡片移至下一個狀態。
- `workboard_complete` 和 `workboard_block` 是用於最終摘要、證明、產出項目、已建立卡片清單和封鎖原因的結構化生命週期工具。已建立卡片清單必須參考連結回已完成卡片的卡片，這可讓摘要中不會出現幻影子項。
- `workboard_attachment_add`、`workboard_attachment_read` 和
  `workboard_attachment_delete` 將小型卡片附件儲存在外掛程式 SQLite 狀態中，在卡片上為其編製索引，並在工作者背景中公開它們。
- `workboard_worker_log` 和 `workboard_protocol_violation` 會記錄工作程式記錄行，並在自動化工作程式未呼叫
  `workboard_complete` 或 `workboard_block` 而停止時封鎖卡片。
- `workboard_board_create`、`workboard_board_archive` 和
  `workboard_board_delete` 會管理持續性看板元資料，例如顯示名稱、
  描述、封存狀態和預設工作區。
- `workboard_runs` 會傳回儲存在卡片上的持續性執行嘗試記錄。
- `workboard_specify` 會將初步的分診或待辦事項卡片轉換為已闡明的
  `todo` 卡片，並在卡片上記錄規格摘要。
- `workboard_decompose` 會將父編排卡片擴散為連結的子卡片、
  繼承看板和租戶元資料，並可透過建立的資訊清單完成父卡片。
- `workboard_notify_subscribe`、`workboard_notify_list`、
  `workboard_notify_events`、`workboard_notify_advance` 和
  `workboard_notify_unsubscribe` 會管理外掛程式狀態中的通知訂閱。
  事件讀取是重播安全的；前進工具會移動永久性游標，
  以便呼叫端能夠繼續而不會遺失或重讀已完成、失敗或過時的卡片事件。
- `workboard_boards`、`workboard_stats`、`workboard_promote`、
  `workboard_reassign`、`workboard_reclaim`、`workboard_comment`、
  `workboard_proof`、`workboard_unblock` 和 `workboard_dispatch` 讓代理程式能夠
  檢查看板命名空間、查看佇列統計資料、復原卡住的工作、新增移交備註、
  附加證明或成品參照、將被封鎖的工作移回 `todo`，
  以及推動相依性升級或過時認領清理。

已認領的卡片會拒絕來自其他代理程式的代理程式工具變更，除非呼叫端
擁有 `workboard_claim` 傳回的認領權杖。儀表板操作員仍使用
一般的 Gateway RPC 介面，且可以復原或重新指派卡片。

Workboard 將持久化面板數據儲存在 OpenClaw 狀態目錄下由插件擁有的關聯式 SQLite 資料庫中。面板、卡片、標籤、生命週期事件、運行嘗試、評論、依賴連結、證明、工件參照、附件元數據和二進位對象、診斷資訊、通知、Worker 記錄、協定狀態和訂閱都會持久化在 Workboard 表中，而不是插件的鍵值條目中。匯出卡片仍然會保留面板的敘述，而不會將附件二進位內容內聯。

在 `.28` 版本中使用過 Workboard 的安裝可以執行 `openclaw doctor --fix`，將隨附的舊版插件狀態命名空間（`workboard.cards`、`workboard.boards` 和 `workboard.notify`）遷移到關聯式資料庫中。如果存在舊版的 `workboard.attachments` 命名空間，doctor 也會遷移這些附件二進位對象。

Workboard 診斷資訊是根據本地卡片元數據計算出來的。內置檢查會標記等待時間過長的已分配卡片、最近沒有心跳訊號的運行中卡片、需要關注的被阻擋卡片、重複失敗、沒有證明的已完成卡片，以及只有鬆散會話連結的運行中卡片。

Dispatch 是故意設計為 Gateway 本地的。它不會產生任意的作業系統程序；正常的 OpenClaw 子代理程式會話仍然擁有執行權。Dispatch 操作會提升依賴就緒的卡片，在就緒卡片上記錄 dispatch 元數據，阻擋過期的認領或超時的運行，將面板配置的分診卡片標記為協調候選項，然後認領一小批就緒卡片並通過 Gateway 子代理程式執行時啟動 Worker 運行。已分配的卡片使用 `agent:<id>:subagent:workboard-*` Worker 會話金鑰；未分配的卡片使用無範圍的 `subagent:workboard-*` 金鑰，以便 Gateway 仍然能解析配置的預設代理程式。Worker 會獲得受限的卡片上下文，以及它們通過 Workboard 工具進行心跳、完成或阻擋卡片所需的認領權杖。

### Dispatch Worker 選擇

每次分配流程預設最多啟動三個 Worker。就緒卡片會按優先級、位置和建立時間排序，然後進行篩選以避免重複的有效擁有權。在同一輪流程中，對於特定的擁有者或 Agent，分配只會啟動一張卡片，並且會跳過看板上已有執行中或審查工作的擁有者。

已封存的卡片、具有有效宣告的卡片以及狀態不是 `ready` 的卡片不會被選中來啟動 Worker。但當處理過期的宣告、依賴提升或逾時清理時，它們仍可能受到分配資料端的影響。

### Worker 提示與生命週期

Worker 提示包含卡片標題、有限制的註解與情境、指定的看板以及 Workboard worker 協定。它還包含宣告擁有者和宣告權杖，以便 Worker 可以呼叫 `workboard_heartbeat`、`workboard_complete` 或 `workboard_block`，而無需其他角色接管該卡片。

當 Worker 成功啟動時，Workboard 會在卡片上儲存工作階段金鑰、執行 ID、引擎、模式、模型標籤、狀態和 Worker 記錄。工作階段金鑰對看板和卡片是確定性的，這使得重複分配會路由回同一個 worker 通道，而不是建立不相關的工作階段。

如果卡片被宣告後無法啟動 Worker，Workboard 會鎖定該卡片、清除宣告、記錄執行啟動失敗，並附加一條 Worker 記錄。該失敗資訊會顯示在儀表板、CLI JSON、Agent 工具和卡片診斷中。

### 分配進入點

就緒卡片的 Worker 啟動可以來自：

- 儀表板分配動作
- `openclaw workboard dispatch`
- 支援指令的通道上的 `/workboard dispatch`

當 Gateway 可用時，這三個進入點都會使用 Gateway 子 Agent 執行時。CLI 有一個額外的操作員後援方案：如果 Gateway 離線、未公開 Workboard 分配方法，且未提供明確的 `--url` 或 `--token` 目標，它會針對本機 SQLite 狀態執行僅資料分配。該後援方案可以提升依賴、清理過期宣告並鎖定逾時的執行，但無法啟動 Worker。

看板元資料可以包含編排設定，例如 `autoDecompose`、
`autoDecomposePerDispatch`、`defaultAssignee` 和 `orchestratorProfile`。
OpenClaw 會記錄編排意圖並將其公開於 Worker 上下文中；實際的規格和分解仍然透過標準的
Workboard 工具進行。

## CLI 與斜線指令

此外掛程式註冊了一個根層級 CLI 指令：

```bash
openclaw workboard list
openclaw workboard create "Fix stale card lifecycle" --priority high --labels bug,workboard
openclaw workboard show <card-id>
openclaw workboard dispatch
```

`openclaw workboard dispatch` 會呼叫正在執行的 Gateway，以便 Worker 啟動時使用與儀表板相同的子 Agent 執行時。如果 Gateway 無法使用，它會
回退為僅資料分派，因此依賴提升、過時聲明清理和
逾時封鎖仍然可以執行。驗證、權限和驗證失敗仍然
會以指令錯誤的形式顯示，對於明確的 `--url` 或 `--token`
目標的失敗也是如此。

`/workboard` 斜線指令支援相同的精簡操作員路徑：
`/workboard list`、`/workboard show <card-id>`、`/workboard create <title>` 和
`/workboard dispatch`。列出和顯示是針對已授權指令傳送者的讀取操作。建立和分派需要在聊天介面上擁有擁有者狀態，或是擁有
`operator.write` 或 `operator.admin` 的 Gateway 用戶端。

請參閱 [Workboard CLI](/zh-Hant/cli/workboard) 以了解指令旗標、JSON 輸出、Gateway
回退行為、明確的 ID 前綴處理、分派選擇規則以及
疑難排解。

## Session 生命週期同步

卡片可以連結到現有的儀表板 Session，或是當您從卡片開始工作時建立的
Session。連結的卡片會內嵌顯示 Session 生命週期：
執行中、過時、連結閒置、完成、失敗或遺失。

如果連結的 Session 遺失，卡片會保持連結以保留上下文，並且
仍然提供啟動控制，以便您可以將工作重新啟動到一個新的儀表板 Session 中。
如果有效的連結 Session 停止回報近期活動，Workboard 會將該
卡片標記為過時，並將標記儲存為卡片元資料，直到生命週期將其清除。

您也可以從 Sessions 分頁中選擇 Add to Workboard，來擷取現有的 Dashboard session。卡片會連結至該 session，使用 session 標籤或最近的用戶提示作為標題，並在可用聊天記錄時，從最近的用戶提示加上最新的助手回應來填入備註。

只要卡片仍處於活躍的工作狀態，Workboard 就會跟隨連結的 session：

- active linked session -> `running`
- completed linked session -> `review`
- failed, killed, timed out, or aborted linked session -> `blocked`

Manual review states win。如果您將卡片移至 `review`、`blocked` 或 `done`，Workboard 將停止自動移動該卡片，直到您將其移回 `todo` 或 `running`。

## Dashboard workflow

1. 在 Control UI 中開啟 Workboard 分頁。
2. 建立一張包含標題、備註、優先順序、標籤、選用代理程式以及選用連結 session 的卡片。
3. 或開啟 Sessions 並為現有的 session 選擇 Add to Workboard。
4. 在欄位之間拖曳卡片，或使用欄位控制項。
5. 從卡片開始工作以建立或重複使用 Dashboard session。
6. 當代理程式運作時，從卡片開啟連結的 session。
7. 讓生命週期同步將正在進行的工作移至 review 或 blocked，然後在接受時手動將卡片移至 done。

啟動卡片會使用一般的 Gateway session。Workboard 外掛程式僅儲存卡片元資料和連結；對話記錄、模型選擇和執行生命週期仍由一般 session 系統所擁有。

在即時連結的卡片上使用 Stop 以中止作用中的 session 執行。Workboard 會將該卡片標記為 `blocked`，使其保持可見以便後續追蹤。

新卡片可以從 Workboard 範本開始，適用於 bugfixes、docs、releases、PR reviews 或 plugin work。範本會預先填入標題、備註、標籤和優先順序，並將選取的範本 id 儲存為卡片元資料。

## Permissions

此外掛程式在 `workboard.*` 命名空間下註冊 Gateway RPC 方法：

- `workboard.cards.list` 需要 `operator.read`
- `workboard.cards.export` 需要 `operator.read`
- `workboard.cards.diagnostics` 需要 `operator.read`
- `workboard.cards.diagnostics.refresh` 需要 `operator.write`
- 附件清單/獲取和通知事件讀取需要 `operator.read`
- 通知游標前進需要 `operator.write`
- 建立、更新、移動、刪除、評論、連結、相依性連結、證明、產出物、
  附件新增/刪除、工作日誌、協議違規、認領、心跳、
  釋放、完成、封鎖、解封、派工、批次及歸檔方法需要
  `operator.write`

以唯讀操作員存取權連線的瀏覽器可以檢視看板，但
無法變更卡片。

## 設定

Workboard 目前沒有外掛專屬設定。請使用標準外掛項目來啟用或停用它：

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

使用以下方式再次停用它：

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## 疑難排解

### 分頁顯示 Workboard 無法使用

請檢查外掛原則：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果已設定 `plugins.allow`，請將 `workboard` 新增至該允許清單。如果
`plugins.deny` 包含 `workboard`，請在啟用外掛前將其移除。

### 卡片無法儲存

請確認瀏覽器連線具有 `operator.write` 存取權限。唯讀操作員
工作階段可以列出卡片，但無法建立、編輯、移動或刪除它們。

### 啟動卡片不會開啟預期的工作階段

Workboard 會建立連至一般儀表板工作階段的連結。請檢查卡片的代理程式 ID
和連結的工作階段，然後開啟 Sessions 或 Chat 檢視以檢查實際
的執行狀態。

### 派工未啟動工作程序

請確認至少有一張 `ready` 卡片沒有使用中的認領：

```bash
openclaw workboard list --status ready
```

如果 CLI 回報僅限資料的派工，請啟動或重新啟動 Gateway 並重試。
僅限資料的派工會更新本機看板狀態，但無法啟動子代理程式工作程序
執行。

如果相同擁有者或代理程式的另一張卡片
正在執行或正在等待審查，則也可能會跳過卡片。在為相同擁有者
派工更多工作之前，請先完成、封鎖或釋放該使用中的
工作。

## 相關

- [Control UI](/zh-Hant/web/control-ui)
- [Workboard CLI](/zh-Hant/cli/workboard)
- [Plugins](/zh-Hant/tools/plugin)
- [Manage plugins](/zh-Hant/plugins/manage-plugins)
- [工作階段](/zh-Hant/concepts/session)
