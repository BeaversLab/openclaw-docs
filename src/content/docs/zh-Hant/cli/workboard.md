---
summary: "`openclaw workboard` 卡片、分派和工作執行的 CLI 參考"
read_when:
  - You want to inspect or create Workboard cards from the terminal
  - You want to dispatch Workboard worker runs from the CLI
  - You are debugging Workboard CLI or slash command behavior
title: "Workboard CLI"
---

`openclaw workboard` 是隨附的
[Workboard plugin](/zh-Hant/plugins/workboard) 的終端機介面。它讓操作員可以列出卡片、建立
卡片、檢查單張卡片，並要求正在執行的 Gateway 將準備好的工作分派至
subagent worker runs。

在使用該指令前請先啟用外掛程式：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

## 使用方法

```bash
openclaw workboard list [--board <id>] [--status <status>] [--json]
openclaw workboard create <title...> [--notes <text>] [--status <status>] [--priority <priority>] [--agent <id>] [--board <id>] [--labels <items>] [--json]
openclaw workboard show <id> [--json]
openclaw workboard dispatch [--url <url>] [--token <token>] [--timeout <ms>] [--json]
```

該指令讀取和寫入與儀表板和 Workboard agent 工具所使用的相同外掛程式擁有的 SQLite 資料庫。當指令接受卡片 ID 時，卡片 ID 可以透過完整 ID 或明確的前綴來傳遞。

## `list`

```bash
openclaw workboard list
openclaw workboard list --board default --status ready
openclaw workboard list --json
```

文字輸出為精簡格式：

```text
7f4a2c10  ready     high    default agent-a  Fix stale worker heartbeat
```

欄位為 ID 前綴、狀態、優先順序、看板 ID、選用的 agent ID 和標題。

旗標：

| 旗標                | 用途                               |
| ------------------- | ---------------------------------- |
| `--board <id>`      | 將結果限制為一個看板命名空間       |
| `--status <status>` | 將結果限制為一個 Workboard 狀態    |
| `--json`            | 以機器可讀 JSON 列印完整的卡片列表 |

## `create`

```bash
openclaw workboard create "Fix stale worker heartbeat" --priority high --labels bug,workboard
openclaw workboard create "Write Workboard docs" --status ready --agent docs-agent --board docs --notes "Cover CLI, slash command, dispatch, and SQLite state."
```

旗標：

| 旗標                    | 用途                           |
| ----------------------- | ------------------------------ |
| `--notes <text>`        | 初始卡片備註                   |
| `--status <status>`     | 初始狀態，預設為 `todo`        |
| `--priority <priority>` | 優先順序，預設為 `normal`      |
| `--agent <id>`          | 將卡片指派給 agent 或擁有者 ID |
| `--board <id>`          | 將卡片儲存在看板命名空間上     |
| `--labels <items>`      | 以逗號分隔的標籤               |
| `--json`                | 以機器可讀 JSON 列印建立的卡片 |

`create` 會直接寫入 Workboard SQLite 狀態。該卡片會立即
顯示在 Control UI Workboard 分頁以及 Workboard 工具中。

## `show`

```bash
openclaw workboard show 7f4a2c10
openclaw workboard show 7f4a2c10 --json
```

文字輸出會列印精簡的卡片行和備註。JSON 輸出會傳回完整的
卡片記錄，包括執行中繼資料、嘗試、留言、連結、證明、
成果、worker 記錄、通訊協定狀態、診斷和自動化中繼資料。

## `dispatch`

```bash
openclaw workboard dispatch
openclaw workboard dispatch --json
openclaw workboard dispatch --url http://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

`dispatch` 首先呼叫執行中的 Gateway RPC 方法
`workboard.cards.dispatch`。該路徑使用與儀表板分派動作相同的子代理程式執行階段，因此準備就緒的卡片會變成具有連結工作階段金鑰的工作追蹤工作者執行。具有指派代理程式的卡片使用代理程式範圍的子代理程式工作階段金鑰；未指派的卡片則保留非範圍子代理程式金鑰，以便保留 Gateway 設定的預設代理程式。

分派迴圈：

1. 將相依性就緒的子項提升至 `ready`。
2. 封鎖過期的宣告或逾時的工作者執行。
3. 在準備就緒的卡片上記錄分派元數據。
4. 選取一小批未宣稱的準備就緒卡片。
5. 為分派器或指派的代理程式宣告每張選定的卡片。
6. 使用受限的卡片內容和卡片宣告權杖啟動子代理程式工作者執行。
7. 當 Gateway 任務帳本回報時，在卡片上儲存工作者執行 ID、工作階段金鑰、任務連結、執行狀態和工作者記錄。

選擇過程故意採取保守策略。一次分派預設最多啟動三個工作者，會跳過已封存或已宣告的卡片，並在單次傳遞中每個擁有者或代理程式僅啟動一張卡片。已由執行中或審查工作擁有的卡片會留待稍後分派。

如果在卡片被宣告後工作者啟動失敗，Workboard 會封鎖該卡片、清除宣告，並將失敗記錄在卡片執行和工作者記錄元數據中。這使得失敗的啟動可見，而不是將卡片靜默地返回佇列。

如果未提供明確的 Gateway 目標，且本機 Gateway 無法使用或尚未公開 Workboard 分派方法，CLI 會回退至針對本機 Workboard 狀態的僅數據分派。僅數據分派仍然可以提升相依性、清除過期的宣告並封鎖逾時的執行，但它不會啟動工作者。驗證、權限、驗證失敗，以及針對明確 `--url` 或 `--token` 目標的失敗會直接回報。

文字輸出會回報工作者啟動：

```text
dispatch complete: started=2 failures=0
```

回退輸出是明確的：

```text
gateway unavailable; data dispatch only: promoted=1 blocked=0
```

JSON 輸出包含分派結果。Gateway 支援的分派可以包含
`started` 和 `startFailures`；僅數據回退包含
`gatewayUnavailable: true`。宣告權杖會從卡片 JSON 輸出中編修。

在儀表板中，相同的派發結果會顯示為簡短摘要，讓操作員無需開啟卡片詳細資訊，即可查看有多少張卡片已啟動、升級、封鎖、重新認領或失敗。

## 斜線指令對等性

支援指令的頻道可以使用相符的斜線指令：

```text
/workboard list
/workboard show 7f4a2c10
/workboard create Fix stale worker heartbeat
/workboard dispatch
```

斜線指令派發也使用 Gateway 子代理程式執行時，因此它遵循與儀表板和 CLI Gateway 路徑相同的認領、工作程式啟動和失敗行為。

`/workboard list` 和 `/workboard show` 是供獲授權的指令傳送者使用的讀取指令。`/workboard create` 和 `/workboard dispatch` 會變更看板狀態，並要求在聊天介面上擁有擁有者身分，或是使用具有 `operator.write` 或 `operator.admin` 的 Gateway 用戶端。

## 權限

CLI 派發路徑會使用 `operator.read` 和 `operator.write` 範圍來呼叫 Gateway RPC。唯讀的 Gateway 權杖可以透過讀取方法檢查 Workboard 資料，但無法建立卡片或派發工作程式。

本機 `list`、`create` 和 `show` 指令會對目前設定檔所使用的本機 OpenClaw 狀態目錄進行操作。當您需要不同的狀態根目錄時，請在最上層 `openclaw` 指令上使用 `--dev` 或 `--profile <name>`。

## 疑難排解

### 未顯示卡片

請確認外掛程式已針對相同的設定檔和狀態根目錄啟用：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果儀表板顯示卡片但 CLI 沒有，請檢查這兩個指令是否使用相同的 `--dev` 或 `--profile` 設定。

### 派發顯示僅限資料

啟動或重新啟動 Gateway：

```bash
openclaw gateway restart
openclaw gateway status --deep
```

然後重試 `openclaw workboard dispatch`。僅限資料的後援機制對於本機狀態清理很有用，但工作程式執行需要運作中的 Gateway。

### 派發未啟動任何項目

請檢查是否至少有一張沒有作用中認領的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

當相同擁有者已有執行中或審閱中的工作時，卡片也可能會被略過。請將已完成的工作移至 `done`、透過 Workboard 工具釋放過時的認領，或在作用中的工作程式完成後再次執行派發。

## 相關

- [Workboard 外掛程式](/zh-Hant/plugins/workboard)
- [CLI 參考資料](/zh-Hant/cli)
- [斜線指令](/zh-Hant/tools/slash-commands)
- [控制介面](/zh-Hant/web/control-ui)
