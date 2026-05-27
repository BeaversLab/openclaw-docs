---
summary: "主機執行審核：原則控制參數、允許清單及 YOLO/嚴格工作流程"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "執行審核"
sidebarTitle: "執行審核"
---

Exec approvals 是讓沙盒化代理程式在真實主機 (`gateway` 或 `node`) 上執行命令的 **companion app / node host guardrail**。這是一個安全聯鎖裝置：只有當原則 + 允許清單 + (可選) 使用者批准都一致時，才允許執行命令。Exec approvals 堆疊在工具原則和提升門控**之上** (除非 elevated 設定為 `full`，這會跳過批准流程)。

<Note>有效原則是 `tools.exec.*` 和批准預設值中**更嚴格**的一個；如果省略了批准欄位，則會使用 `tools.exec` 值。主機執行也會使用該機器上的本機批准狀態 - 即使會話或配置預設值請求 `ask: "on-miss"`，`~/.openclaw/exec-approvals.json` 中的主機本機 `ask: "always"` 仍會持續提示。</Note>

## 檢查有效政策

| 指令                                                             | 顯示內容                                           |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 請求的政策、主機政策來源以及有效結果。             |
| `openclaw exec-policy show`                                      | 本機機器的合併檢視。                               |
| `openclaw exec-policy set` / `preset`                            | 將本機請求的政策與本機主機核准檔案同步，一步完成。 |

當本機範圍請求 `host=node` 時，`exec-policy show` 會在執行時將該範圍回報為由節點管理，而不是假裝本機批准檔案是真相來源。

如果 companion app UI **不可用**，任何通常會提示的請求都將由 **ask fallback** 解決 (預設值：`deny`)。

<Tip>原生聊天批准用戶端可以在待批准訊息上植入特定管道的功能。例如，Matrix 植入了反應快捷方式 (`✅` 允許一次，`❌` 拒絕，`♾️` 總是允許)，同時仍在訊息中保留 `/approve ...` 指令作為備案。</Tip>

## 適用範圍

Exec approvals（執行審批）是在執行主機上本地強制執行的：

- **Gateway host** → Gateway 機器上的 `openclaw` 行程。
- **Node host（節點主機）** → node runner（macOS 伴隨應用程式或無頭節點主機）。

### 信任模型

- 經過 Gateway 驗證的呼叫者是該 Gateway 的受信任操作員。
- 配對的節點將該受信任操作員能力擴展到節點主機上。
- 執行核准可降低意外執行的風險，但**並非**使用者層級的驗證邊界或檔案系統唯讀原則。
- 一旦獲得核准，指令即可根據所選的主機或沙箱檔案系統權限來修改檔案。
- 獲得核准的 node-host 執行作業會綁定標準執行環境：標準 cwd、精確 argv、存在時的 env 綁定，以及適用時的固定可執行檔路徑。
- 對於 Shell 腳本和直譯器/執行時期檔案的直接調用，OpenClaw 也會嘗試綁定一個具體的本機檔案運算元。如果綁定的檔案在核准後、執行前發生變更，該執行作業將會被拒絕，而不會執行已變動的內容。
- 檔案綁定是刻意採取「盡力而為」的策略，**並非**針對每個直譯器/執行時期載入器路徑的完整語意模型。如果核准模式無法識別要綁定的確切一個具體本機檔案，它會拒絕建立支援核准的執行作業，而不會假裝擁有完整覆蓋。

### macOS 分離

- **node host service** 透過本機 IPC 將 `system.run` 轉發給 **macOS app**。
- **macOS app** 會執行核准並在 UI 語境中執行指令。

## 設定與儲存

核准項目儲存在執行主機上的一個本機 JSON 檔案中：

```text
~/.openclaw/exec-approvals.json
```

範例架構：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "source": "allow-always",
          "commandText": "rg -n TODO",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 原則控制

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 封鎖所有主機執行請求。
  - `allowlist` - 僅允許在允許清單中的命令。
  - `full` - 允許所有內容（等同於 elevated）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - 永不提示。
  - `on-miss` - 僅在允許清單不匹配時提示。
  - `always` - 每次執行命令都提示。`allow-always` 持久信任並**不**會在有效的詢問模式為 `always` 時抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  當需要提示但無法存取 UI 時的處理方式。

- `deny` - 封鎖。
- `allowlist` - 僅在允許清單匹配時允許。
- `full` - 允許。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  當設為 `true` 時，OpenClaw 會將內聯程式碼求值形式視為僅需批准， 即使直譯器二進位檔本身已在允許清單中。這是針對無法 乾淨對應到單一穩定檔案操作數的直譯器載入器所採取的縱深防禦措施。
</ParamField>

嚴格模式可攔截的範例：

- `python -c`
- `node -e`、`node --eval`、`node -p`
- `ruby -e`
- `perl -e`、`perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在嚴格模式下，這些命令仍需要明確批准，
並且 `allow-always` 不會為它們自動持久化新的允許清單條目。

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  僅控制執行批准提示中的呈現方式。啟用後， OpenClaw 可能會附加由解析器衍生的命令範圍，以便 Web 批准 提示能夠醒目顯示命令標記。將其設為 `true` 以啟用 命令文字醒目顯示。
</ParamField>

此設定並**不**會變更 `security`、`ask`、允許清單匹配、
嚴格內聯求值行為、批准轉發或命令執行。
它可以在 `tools.exec.commandHighlighting` 下全域設定，或在 `agents.list[].tools.exec.commandHighlighting` 下針對個別代理程式設定。

## YOLO 模式（無需批准）

如果您希望主機 exec 在無需批准提示的情況下執行，您必須開啟**這兩**層策略 - OpenClaw 設定中的請求 exec 策略 (`tools.exec.*`) **以及** `~/.openclaw/exec-approvals.json` 中的主機本地批准策略。

除非您明確縮緊限制，否則 YOLO 是預設的主機行為：

| 層級                  | YOLO 設定                  |
| --------------------- | -------------------------- |
| `tools.exec.security` | `full` 於 `gateway`/`node` |
| `tools.exec.ask`      | `off`                      |
| 主機 `askFallback`    | `full`                     |

<Warning>
**重要區別：**

- `tools.exec.host=auto` 選擇 **在哪裡** 執行：有沙盒時用沙盒，否則用 gateway。
- YOLO 選擇 **如何** 批准主機執行：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不會** 在已設定主機執行原則之上，加入額外的啟發式命令混淆審批閘門或腳本預檢拒絕層。
- `auto` 並不會讓 gateway 路由成為從沙盒會話中免費覆蓋的方式。從 `auto` 允許單次呼叫的 `host=node` 請求；僅當沒有沙盒運行時活躍時，才允許從 `auto` 進行 `host=gateway`。若要設定穩定的非 auto 預設值，請設定 `tools.exec.host` 或明確使用 `/exec host=...`。

</Warning>

支援 CLI 且提供自身非互動權限模式的供應商可以遵循此政策。當 OpenClaw 要求的執行政策為 YOLO 時，Claude CLI 會新增 `--permission-mode bypassPermissions`。您可以在 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下使用明確的 Claude 參數來覆蓋該後端行為——例如 `--permission-mode default`、`acceptEdits` 或 `bypassPermissions`。

如果您想要更保守的設定，請將任一層級調整回 `allowlist` / `on-miss` 或 `deny`。

### 持續性閘道主機「永不提示」設定

<Steps>
  <Step title="設定請求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="比對主機核准檔案">
    ```bash
    openclaw approvals set --stdin <<'EOF'
    {
      version: 1,
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full"
      }
    }
    EOF
    ```
  </Step>
</Steps>

### 本機捷徑

```bash
openclaw exec-policy preset yolo
```

該本機捷徑會同時更新：

- 本機 `tools.exec.host/security/ask`。
- 本機 `~/.openclaw/exec-approvals.json` 預設值。

它被刻意限制為僅限本機使用。若要遠端變更 gateway-host 或 node-host 的核准，請使用 `openclaw approvals set --gateway` 或
`openclaw approvals set --node <id|name|ip>`。

### 節點主機

對於節點主機，請改為在該節點上套用相同的核准檔案：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

<Note>
**僅限本地的限制：**

- `openclaw exec-policy` 不會同步節點核准。
- `openclaw exec-policy set --host node` 會被拒絕。
- 節點執行核准是在執行時從節點獲取的，因此以節點為目標的更新必須使用 `openclaw approvals --node ...`。

</Note>

### 僅限工作階段的捷徑

- `/exec security=full ask=off` 僅變更目前的工作階段。
- `/elevated full` 是一個緊急應變捷徑，也會跳過該工作階段的執行核准。

如果主機核准檔案保持比配置更嚴格，較嚴格的主機政策仍然優先。

## 允許清單（每個代理程式）

允許清單是**每個代理程式**的。如果存在多個代理程式，請在 macOS 應用程式中切換您正在編輯的代理程式。模式是 Glob 匹配。

模式可以是已解析的二進制路徑萬用字元或裸命令名稱萬用字元。
裸名稱僅匹配透過 `PATH` 呼叫的命令，因此當命令為 `rg` 時，`rg` 可以匹配
`/opt/homebrew/bin/rg`，但**不**匹配 `./rg` 或
`/tmp/rg`。當您想要信任某個特定的二進制位置時，請使用路徑萬用字元。

舊版 `agents.default` 項目會在載入時遷移至 `agents.main`。
諸如 `echo ok && pwd` 之類的 Shell 鏈仍需每個頂層區段
符合允許清單規則。

範例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制引數

當允許清單項目應符合特定二進位檔及特定引數形狀時，請新增 `argPattern`。OpenClaw 會針對解析後的指令引數評估正則表達式，排除可執行檔權杖（`argv[0]`）。對於手動撰寫的項目，引數會以單一空格連接，因此若需要完全符合，請將樣式錨定。

```json
{
  "version": 1,
  "agents": {
    "main": {
      "allowlist": [
        {
          "pattern": "python3",
          "argPattern": "^safe\\.py$"
        }
      ]
    }
  }
}
```

該項目允許 `python3 safe.py`；`python3 other.py` 則是允許清單未命中。如果存在針對相同二進位檔的僅路徑項目，未符合的引數仍可退回該僅路徑項目。當目標是將二進位檔限制為宣告的引數時，請省略僅路徑項目。

由批准流程儲存的條目可以使用內部分隔符格式進行精確的 argv 匹配。建議優先使用 UI 或批准流程來重新生成這些條目，而不是手動編輯編碼後的值。如果 OpenClaw 無法為命令片段解析 argv，則帶有 `argPattern` 的條目將不會匹配。

每個允許清單條目支援：

| 欄位               | 含義                                         |
| ------------------ | -------------------------------------------- |
| `pattern`          | 解析後的二元檔路徑 glob 或純命令名稱 glob    |
| `argPattern`       | 可選的 argv 正規表示式；省略的條目僅包含路徑 |
| `id`               | 用於 UI 身份識別的穩定 UUID                  |
| `source`           | 條目來源，例如 `allow-always`                |
| `commandText`      | 建立條目時由批准流程擷取的命令文字           |
| `lastUsedAt`       | 最後使用時間戳記                             |
| `lastUsedCommand`  | 最後一個匹配的命令                           |
| `lastResolvedPath` | 最後解析的二進位路徑                         |

## 自動允許技能 CLI

當啟用 **Auto-allow skill CLIs** 時，已知技能參照的可執行檔會被視為已在節點（macOS 節點或無頭節點主機）上加入允許清單。這會透過 Gateway RPC 使用 `skills.bins` 來擷取技能二進位清單。如果您需要嚴格的手動允許清單，請停用此功能。

<Warning>
- 這是一個**隱式便利允許清單**，與手動路徑允許清單項目分開。
- 它適用於 Gateway 和節點位於相同信任邊界中的受信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單項目。

</Warning>

## 安全 bins 與審核轉發

關於安全 bins（僅 stdin 的快速路徑）、直譯器綁定細節，以及如何將審核提示轉發到 Slack/Discord/Telegram（或將其作為原生審核用戶端運行），請參閱
[Exec approvals - advanced](/zh-Hant/tools/exec-approvals-advanced)。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、
個別代理覆寫和允許清單。選擇一個範圍（預設值或某個代理），
調整政策，新增/移除允許清單模式，然後按一下 **儲存**。UI
會顯示每個模式的最近使用中繼資料，以便您整理清單。

目標選擇器會選擇 **Gateway**（本地審核）或某個 **節點**。
節點必須通告 `system.execApprovals.get/set`（macOS app 或
無頭節點主機）。如果節點尚未通告 exec 審核，
請直接編輯其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援 gateway 或節點編輯 - 請參閱
[Approvals CLI](/zh-Hant/cli/approvals)。

## 審核流程

當需要提示時，gateway 會向操作員用戶端廣播
`exec.approval.requested`。Control UI 和 macOS
app 透過 `exec.approval.resolve` 解析它，然後 gateway 將
已核准的請求轉發至節點主機。

對於 `host=node`，審核請求包含標準 `systemRunPlan`
負載。當轉發已核准的 `system.run`
請求時，gateway 會將該計畫用作權威
command/cwd/session 上下文。

這對於非同步審核延遲很重要：

- 節點 exec 路徑會預先準備一個標準計畫。
- 審核記錄會儲存該計畫及其綁定中繼資料。
- 一旦獲得核准，最終轉發的 `system.run` 呼叫會重複使用儲存的計畫，而不是信任後續呼叫者的編輯。
- 如果呼叫者在建立核准請求後變更了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，閘道會因為核准不符而拒絕轉送此執行。

## 系統事件

Exec 生命週期會以系統訊息呈現：

- `Exec running`（僅在指令超過執行通知閾值時）。
- `Exec finished`。

這些內容會在節點回報事件後發佈至 Agent 的會話。被拒絕的 Exec 執行核准是終結性的：OpenClaw 可以向操作員或直接聊天路由回報拒絕情況，但不會將 `Exec denied` 回傳至 Agent 會話或喚醒 Agent 工作。Gateway-host 的 Exec 執行核准會在指令完成時（以及可選的當執行時間超過閾值時）發出相同的生命週期事件。受核准閘道的 Exec 會在這些訊息中重複使用核准 ID 作為 `runId`，以便於關聯。

## 拒絕核准的行為

當非同步 Exec 執行核准被拒絕時，OpenClaw 會將該請求視為終結性。它可以向操作員或直接聊天路由顯示簡明的拒絕訊息，但不會透過 Agent 會話回傳拒絕指引。這能防止被拒絕的指令變成另一個模型輪次，並避免 Agent 重複使用同一指令先前執行的輸出。

## 影響與意涵

- **`full`** 功能強大；請盡可能優先使用允許清單。
- **`ask`** 讓您保持掌握，同時仍允許快速核准。
- 個別 Agent 的允許清單可防止某個 Agent 的核准洩漏至其他 Agent。
- 核准僅適用於來自**授權發送者**的主機 Exec 請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是供授權操作員使用的會話層級便利功能，且依設計會略過核准。若要硬封鎖主機 Exec，請將核准安全性設定為 `deny`，或透過工具政策拒絕 `exec` 工具。

## 相關內容

<CardGroup cols={2}>
  <Card title="Exec 執行核准 - 進階" href="/zh-Hant/tools/exec-approvals-advanced" icon="gear">
    安全 binaries、直譯器綁定，以及核准轉發至聊天。
  </Card>
  <Card title="Exec 工具" href="/zh-Hant/tools/exec" icon="terminal">
    Shell 指令執行工具。
  </Card>
  <Card title="提昇模式" href="/zh-Hant/tools/elevated" icon="shield-exclamation">
    同時跳過審核的緊急應變路徑。
  </Card>
  <Card title="沙箱" href="/zh-Hant/gateway/sandboxing" icon="box">
    沙箱模式與工作區存取。
  </Card>
  <Card title="安全性" href="/zh-Hant/gateway/security" icon="lock">
    安全模型與強化防護。
  </Card>
  <Card title="沙箱 vs 工具政策 vs 提昇" href="/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何時使用各項控制措施。
  </Card>
  <Card title="技能" href="/zh-Hant/tools/skills" icon="sparkles">
    由技能支援的自動允許行為。
  </Card>
</CardGroup>
