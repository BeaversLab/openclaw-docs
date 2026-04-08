---
summary: "執行核准、允許清單與沙箱逸出提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "執行核准"
---

# 執行核准

執行核准是讓沙箱化代理程式在真實主機（`gateway` 或 `node`）上執行指令的 **伴隨應用程式 / 節點主機防護措施**。您可以將其視為安全互鎖：
只有在政策 + 允許清單 + (可選) 使用者核准都一致時，才允許執行指令。
執行核准是工具政策和提昇權限控管的 **額外** 機制（除非將提昇權限設定為 `full`，這會跳過核准）。
有效的政策是 `tools.exec.*` 與核准預設值之間 **較嚴格** 的那一個；如果省略了核准欄位，則會使用 `tools.exec` 值。
主機執行也會使用該機器上的本機核准狀態。即使會話或設定預設值請求 `ask: "on-miss"`，
`~/.openclaw/exec-approvals.json` 中的主機本機 `ask: "always"` 仍會持續提示。
使用 `openclaw approvals get`、`openclaw approvals get --gateway` 或
`openclaw approvals get --node <id|name|ip>` 來檢查請求的政策、
主機政策來源和有效結果。

如果**無法使用**伴隨應用程式 UI，任何需要提示的請求都會由**詢問回退機制**（預設：拒絕）來解析。

原生聊天核准客戶端也可以在待決核准訊息上公開特定管道的輔助功能。例如，Matrix 可以在
核准提示上植入反應捷徑（`✅` 允許一次，`❌` 拒絕，以及 `♾️` 在可用時允許始終）
同時仍在訊息中保留 `/approve ...` 指令作為備案。

## 適用範圍

執行核准是在執行主機上本機執行的：

- **閘道主機** → 閘道機器上的 `openclaw` 程序
- **節點主機** → 節點執行器（macOS 伴隨應用程式或無頭節點主機）

信任模型備註：

- 經過閘道驗證的呼叫者是該閘道的受信任操作員。
- 配對的節點會將該受信任操作員的功能擴展到節點主機上。
- 執行核准可降低意外執行的風險，但並非每個使用者的驗證邊界。
- 已核准的 node-host 執行會綁定規範執行上下文：規範 cwd、精確 argv、env
  綁定（如果存在），以及固定可執行檔路徑（如適用）。
- 對於 Shell 腳本和直譯器/執行時期檔案的直接呼叫，OpenClaw 也會嘗試綁定
  一個具體的本機檔案運算元。如果綁定的檔案在核准後、執行前發生變更，
  則會拒絕執行，而不是執行已變更的內容。
- 此檔案綁定是刻意盡力而為的，並非對每個
  直譯器/執行時期載入器路徑的完整語意模型。如果核准模式無法識別恰好一個具體的本機
  檔案進行綁定，它會拒絕建立支援核准的執行，而不是假設完全覆蓋。

macOS 區分：

- **node host service** 透過本機 IPC 將 `system.run` 轉發至 **macOS app**。
- **macOS app** 在 UI 上下文中執行核准 + 執行指令。

## 設定與儲存

核准存在於執行主機上的本機 JSON 檔案中：

`~/.openclaw/exec-approvals.json`

架構範例：

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
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 免核准 "YOLO" 模式

如果您希望主機 exec 在無需核准提示的情況下執行，您必須開啟**兩者**原則層級：

- OpenClaw 設定中的請求 exec 原則 (`tools.exec.*`)
- `~/.openclaw/exec-approvals.json` 中的主機本機核准原則

這現在是預設的主機行為，除非您明確收緊它：

- `tools.exec.security`: `full` 於 `gateway`/`node`
- `tools.exec.ask`: `off`
- 主機 `askFallback`: `full`

重要區別：

- `tools.exec.host=auto` 決定 exec 在哪裡執行：有沙盒時用沙盒，否則用閘道。
- YOLO 決定如何核准主機 exec：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw 不會在設定的主機 exec 原則之上額外增加獨立的啟發式指令混淆核准閘門。
- `auto` 並不會讓閘道路由成為從沙盒工作階段進行免費覆寫的方式。允許從 `auto` 發出單次呼叫的 `host=node` 請求，且僅當沒有沙盒執行環境處於活動狀態時，才允許從 `auto` 執行 `host=gateway`。如果您想要一個穩定的非自動預設值，請設定 `tools.exec.host` 或明確使用 `/exec host=...`。

如果您想要更保守的設定，請將任一層級調回 `allowlist` / `on-miss`
或 `deny`。

持續性閘道主機「永不提示」設定：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
openclaw gateway restart
```

然後設定主機核准檔案以符合：

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

若是節點主機，請改在該節點上套用相同的核准檔案：

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

僅限工作階段的捷徑：

- `/exec security=full ask=off` 僅變更目前的工作階段。
- `/elevated full` 是一個緊急捷徑，也會跳過該工作階段的執行核准。

如果主機核准檔案保持比設定更嚴格，則更嚴格的主機政策仍然優先適用。

## 原則旋鈕

### 安全性 (`exec.security`)

- **deny**：封鎖所有主機執行請求。
- **allowlist**：僅允許已加入允許清單的指令。
- **full**：允許所有操作（等同於提升權限）。

### 詢問 (`exec.ask`)

- **off**：永不提示。
- **on-miss**：僅當允許清單不符時才提示。
- **always**：每個指令都提示。
- 當有效的詢問模式為 `always` 時，`allow-always` 持久信任並不會抑制提示

### 詢問後備 (`askFallback`)

如果需要提示但無法連線到 UI，則由後備決定：

- **deny**：封鎖。
- **allowlist**：僅在允許清單符合時允許。
- **full**：允許。

### 內嵌直譯器評估強化 (`tools.exec.strictInlineEval`)

當 `tools.exec.strictInlineEval=true` 時，即使直譯器二進位檔本身已在允許清單中，OpenClaw 也會將內嵌程式碼評估表單視為僅限核准。

範例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

這是針對無法整齊對應到單一穩定檔案操作數的直譯器載入器之深度防禦。在嚴格模式下：

- 這些指令仍需要明確批准；
- `allow-always` 不會自動為它們持久化新的允許清單條目。

## 允許清單（每個代理程式）

允許清單是**針對每個代理程式**的。如果存在多個代理程式，請在 macOS 應用程式中切換您正在編輯的代理程式。模式採用**不區分大小寫的 glob 匹配**。模式應解析為**二進制路徑**（僅包含基本名稱的條目將被忽略）。舊版 `agents.default` 條目在載入時會遷移至 `agents.main`。諸如 `echo ok && pwd` 之類的 Shell 鏈仍需每個頂層區段都符合允許清單規則。

範例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每個允許清單條目會追蹤：

- **id** 用於 UI 身份識別的穩定 UUID（可選）
- **last used** 時間戳記
- **last used command**
- **last resolved path**

## 自動允許技能 CLI

當啟用**自動允許技能 CLI** 時，已知技能參照的可執行檔在節點（macOS 節點或無頭節點主機）上會被視為已在允許清單中。此功能透過 Gateway RPC 使用 `skills.bins` 來擷取技能二進制檔案清單。如果您需要嚴格的手動允許清單，請停用此功能。

重要的信任事項：

- 這是一個**隱含的便利允許清單**，與手動路徑允許清單條目分開。
- 它旨在用於 Gateway 和節點位於相同信任邊界內的可信操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單條目。

## 安全的二進制檔案（僅 stdin）

`tools.exec.safeBins` 定義了一小組**僅 stdin**的二進位檔案（例如 `cut`），
它們可以在允許清單模式**下**運行，而**無需**明確的允許清單條目。安全的二進位檔案會拒絕
位置檔案參數和類似路徑的標記，因此它們只能對傳入的資料流進行操作。
將其視為資料流過濾器的狹窄快速路徑，而非一般性的信任清單。
請**勿**將直譯器或執行時期二進位檔案（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。
如果指令可以評估程式碼、執行子指令，或在設計上讀取檔案，請優先使用明確的允許清單條目並保持批准提示已啟用。
自訂安全二進位檔案必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。
驗證僅根據 argv 形狀決定（不檢查主機檔案系統是否存在），這可以
防止因允許/拒絕差異而導致的檔案存在預言行為。
針對預設的安全二進位檔案，會拒絕檔案導向的選項（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全二進位檔案也會對破壞僅 stdin 行為的選項執行明確的逐二進位檔案標記政策（例如 `sort -o/--output/--compress-program` 和 grep 遞迴標記）。
在安全二進位檔案模式下，長選項會以失敗關閉（fail-closed）的方式進行驗證：未知的標記和模糊的縮寫會被拒絕。
根據安全二進位檔案設定檔拒絕的標記：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`： `--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`： `--argfile`，`--from-file`，`--library-path`，`--rawfile`，`--slurpfile`，`-L`，`-f`
- `sort`： `--compress-program`，`--files0-from`，`--output`，`--random-source`，`--temporary-directory`，`-T`，`-o`
- `wc`： `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全二進位檔還強制在執行時將 argv 權杖視為**純文字**（針對僅限 stdin 的區段不進行 glob 展開和 `$VARS` 展開），因此像 `*` 或 `$HOME/...` 這類的模式無法被用來偷偷讀取檔案。
安全二進位檔也必須從受信任的二進位目錄解析（系統預設值加上可選的 `tools.exec.safeBinTrustedDirs`）。`PATH` 項目永遠不會被自動信任。
預設受信任的安全二進位目錄是故意設為極簡的：`/bin`、`/usr/bin`。
如果您的安全二進位可執行檔位於套件管理程式/使用者路徑中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），請將其明確新增至 `tools.exec.safeBinTrustedDirs`。
在允許清單模式下，不會自動允許 Shell 鏈結和重新導向。

當每個頂層段落都符合允許清單（包括安全 bins 或 技能自動允許）時，允許 Shell 鏈接（`&&`、`||`、`;`）。在允許清單模式下，不支援重新導向。命令替換（`$()` / 反引號）在允許清單解析期間會被拒絕，包括在雙引號內；如果您需要字面 `$()` 文字，請使用單引號。
在 macOS 伴隨應用程式的批准中，包含 Shell 控制或擴展語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 Shell 文字會被視為未通過允許清單，除非 Shell 二進位檔本身已被加入允許清單。
對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會減少為一個小型明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
對於允許清單模式下的「一律允許」決策，已知的分派包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑，而不是包裝器路徑。Shell 多工器（`busybox`、`toybox`）也會針對 Shell 小程式（`sh`、`ash` 等）進行解包，因此會保存內部可執行檔而不是多工器二進位檔。如果包裝器或多工器無法安全解包，則不會自動保存任何允許清單項目。
如果您將直譯器（例如 `python3` 或 `node`）加入允許清單，建議優先選擇 `tools.exec.strictInlineEval=true`，這樣內嵌評估仍然需要明確批准。在嚴格模式下，`allow-always` 仍可保存良性直譯器/腳本的叫用，但內嵌評估載體不會自動保存。

預設安全 bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在預設清單中。如果您選擇啟用，請為
其非 stdin 工作流程保留明確的允許清單項目。
對於安全 bin 模式下的 `grep`，請提供包含 `-e`/`--regexp` 的模式；位置參數模式形式會被
拒絕，以防止檔案操作數被作為不明確的位置參數偷運進去。

### 安全 bin 與允許清單的比較

| 主題     | `tools.exec.safeBins`                  | 允許清單 (`exec-approvals.json`)            |
| -------- | -------------------------------------- | ------------------------------------------- |
| 目標     | 自動允許狹窄的 stdin 過濾器            | 明確信任特定可執行檔                        |
| 比對類型 | 可執行檔名稱 + 安全 bin argv 原則      | 已解析的可執行檔路徑 glob 模式              |
| 引數範圍 | 受安全 bin 設定檔和字面 token 規則限制 | 僅路徑比對；引數否則由您自行負責            |
| 典型範例 | `head`, `tail`, `tr`, `wc`             | `jq`, `python3`, `node`, `ffmpeg`, 自訂 CLI |
| 最佳用途 | 管線中的低風險文字轉換                 | 任何具有更廣泛行為或副作用的工具            |

設定位置：

- `safeBins` 來自設定 (`tools.exec.safeBins` 或各代理程式的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自設定 (`tools.exec.safeBinTrustedDirs` 或各代理程式的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自設定 (`tools.exec.safeBinProfiles` 或各代理程式的 `agents.list[].tools.exec.safeBinProfiles`)。各代理程式的設定檔金鑰會覆寫全域金鑰。
- 允許清單項目位於主機本地的 `~/.openclaw/exec-approvals.json` 中的 `agents.<id>.allowlist` 之下 (或透過 Control UI / `openclaw approvals allowlist ...`)。
- 當解譯器/執行時期二進位檔出現在 `safeBins` 中卻沒有明確的設定檔時，`openclaw security audit` 會以 `tools.exec.safe_bins_interpreter_unprofiled` 發出警告。
- `openclaw doctor --fix` 可以將遺失的自訂 `safeBinProfiles.<bin>` 項目建構為 `{}`（事後請檢閱並收緊）。解譯器/執行時期二進位檔不會自動建構。

自訂設定檔範例：

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

如果您明確選擇將 `jq` 加入 `safeBins`，OpenClaw 仍會在安全二進位檔模式下拒絕 `env` 內建函式，因此 `jq -n env` 無法在沒有明確的允許清單路徑或批准提示的情況下傾印主機處理程序環境。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、每個代理程式的覆寫值以及允許清單。選擇一個範圍（預設值或某個代理程式）、調整原則、新增/移除允許清單模式，然後按一下 **Save**。UI 會顯示每個模式的 **上次使用** 中繼資料，讓您能保持清單整潔。

目標選擇器會選擇 **Gateway**（本機批准）或 **Node**。節點必須通告 `system.execApprovals.get/set`（macOS 應用程式或無頭節點主機）。如果節點尚未通告執行批准，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點編輯（請參閱 [Approvals CLI](/en/cli/approvals)）。

## 批准流程

當需要提示時，閘道會將 `exec.approval.requested` 廣播給操作員用戶端。Control UI 和 macOS 應用程式會透過 `exec.approval.resolve` 解析它，然後閘道會將獲批准的請求轉發給節點主機。

對於 `host=node`，批准請求包含一個標準的 `systemRunPlan` 載荷。閘道會在轉發獲批准的 `system.run` 請求時，使用該計畫作為授權的命令/cwd/工作階段內容。

這對於非同步批准延遲很重要：

- 節點執行路徑會預先準備一個標準計畫
- 批准記錄會儲存該計畫及其繫結中繼資料
- 一旦獲得批准，最終轉發的 `system.run` 呼叫會重複使用儲存的計畫，
  而不是信任後續呼叫者的編輯
- 如果呼叫者在建立核准請求後變更了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，閘道會將轉發的執行視為核准不符並加以拒絕

## 直譯器/執行環境指令

經核准支援的直譯器/執行環境執行採取刻意保守的作法：

- 精確的 argv/cwd/env 環境永遠會受到綁定。
- 直接 shell 腳本與直接執行環境檔案形式會盡力綁定至一個具體的本機檔案快照。
- 仍可解析至單一直接本機檔案的常見套件管理員包裝器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定前先行解包。
- 如果 OpenClaw 無法識別直譯器/執行環境指令確切對應的一個具體本機檔案（例如套件腳本、eval 形式、特定執行環境的載入器鏈結，或模糊的多檔案形式），經核准支援的執行將會被拒絕，而非宣稱其不具備的語意涵蓋範圍。
- 對於這些工作流程，建議優先使用沙盒化、獨立的主機邊界，或是明確的信任允許清單/完整工作流程，讓操作員接受更廣泛的執行環境語意。

當需要核准時，exec 工具會立即傳回一個核准 ID。請使用該 ID 來關聯後續的系統事件（`Exec finished` / `Exec denied`）。如果在逾時前仍未收到決定，該請求將被視為核准逾時，並顯示為拒絕原因。

### 後續傳遞行為

在核准的異步 exec 完成後，OpenClaw 會傳送後續的 `agent` 回合至同一個工作階段。

- 如果存在有效的外部傳遞目標（可傳遞頻道加上目標 `to`），後續傳遞將會使用該頻道。
- 在沒有外部目標的僅 Web 聊天或內部工作階段流程中，後續傳遞將僅限於工作階段內（`deliver: false`）。
- 如果呼叫者明確要求嚴格的外部傳遞，但沒有可解析的外部頻道，請求將會失敗並回傳 `INVALID_REQUEST`。
- 如果啟用了 `bestEffortDeliver` 且無法解析任何外部通道，傳遞將降級為僅限會話而不是失敗。

確認對話框包括：

- 指令 + 參數
- 工作目錄 (cwd)
- 代理程式 ID
- 解析的可執行檔路徑
- 主機 + 策略元資料

動作：

- **允許一次** → 立即執行
- **一律允許** → 新增至允許清單並執行
- **拒絕** → 封鎖

## 核准轉傳至聊天頻道

您可以將執行核准提示轉傳至任何聊天頻道（包括外掛程式頻道）並使用 `/approve` 進行核准。這使用正常的輸出傳遞管道。

設定：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

在聊天中回覆：

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

`/approve` 指令同時處理執行核准和外掛程式核准。如果 ID 不符合待處理的執行核准，它會自動改為檢查外掛程式核准。

### 外掛程式核准轉傳

外掛程式核准轉傳使用與執行核准相同的傳遞管道，但在 `approvals.plugin` 下有自己的獨立設定。啟用或停用其中一個不會影響另一個。

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

設定結構與 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的工作方式相同。

支援共享互動回覆的頻道會為執行和外掛程式核准呈現相同的核准按鈕。沒有共享互動 UI 的頻道會退回到純文字並附上 `/approve`
說明。

### 任何頻道上的同頻道核准

當執行或外掛程式核准請求源自可傳遞的聊天介面時，預設情況下現在可以使用 `/approve` 在同一聊天中進行核准。這適用於 Slack、Matrix 和 Microsoft Teams 等頻道，以及現有的 Web UI 和終端機 UI 流程。

此共享文字指令路徑使用該對話的正常頻道驗證模型。如果來源聊天已經可以發送指令和接收回覆，則核准請求不再需要單獨的原生傳遞配接器來保持待處理狀態。

Discord 和 Telegram 也支援同一聊天 `/approve`，但即使停用了原生審批傳遞，這些通道仍會使用其解析出的審批者清單進行授權。

對於 Telegram 和其他直接呼叫 Gateway 的原生審批客戶端，此後援機制有意限制為「找不到審批」的失敗情況。真正的 exec 審批拒絕或錯誤不會靜默重試為插件審批。

### 原生審批傳遞

某些通道也可以作為原生審批客戶端。原生客戶端在共享的同聊天 `/approve` 流程之上，增加了審批者 DM、原始聊天廣播以及特定通道的互動式審批 UX。

當可使用原生審批卡片/按鈕時，該原生 UI 是面向代理的主要途徑。除非工具結果顯示聊天審批不可用或手動審批是僅剩的途徑，否則代理不應同時回顯重複的純聊天 `/approve` 指令。

通用模型：

- host exec policy 仍決定是否需要 exec 審批
- `approvals.exec` 控制是否將審批提示轉發到其他聊天目的地
- `channels.<channel>.execApprovals` 控制該通道是否作為原生審批客戶端

當以下所有條件均成立時，原生審批客戶端會自動啟用 DM 優先傳遞：

- 該通道支援原生審批傳遞
- 可以從明確的 `execApprovals.approvers` 或該通道文件中記載的後援來源解析審批者
- `channels.<channel>.execApprovals.enabled` 未設定或 `"auto"`

設定 `enabled: false` 以明確停用原生審批客戶端。設定 `enabled: true` 以在解析出審批者時強制啟用它。公開原始聊天傳遞仍透過 `channels.<channel>.execApprovals.target` 明確控制。

常見問題：[為什麼聊天審批有兩個 exec 審批設定？](/en/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

這些原生審批客戶端在共享的同聊天 `/approve` 流程和共享審批按鈕之上，增加了 DM 路由和可選的通道廣播。

共用行為：

- Slack、Matrix、Microsoft Teams 和類似的可傳送聊天使用正常的頻道驗證模型
  針對同一聊天 `/approve`
- 當原生審批用戶端自動啟用時，預設的原生傳遞目標是審批者的 DM
- 對於 Discord 和 Telegram，只有已解析的審批者可以批准或拒絕
- Discord 審批者可以是明確的 (`execApprovals.approvers`) 或從 `commands.ownerAllowFrom` 推斷
- Telegram 審批者可以是明確的 (`execApprovals.approvers`) 或從現有的擁有者設定推斷 (`allowFrom`，加上直​​接訊息 `defaultTo` (在支援的情況下))
- Slack 審批者可以是明確的 (`execApprovals.approvers`) 或從 `commands.ownerAllowFrom` 推斷
- Slack 原生按鈕保留審批 ID 種類，因此 `plugin:` ID 可以解析插件審批
  而無需第二層 Slack 本機後援層
- Matrix 原生 DM/頻道路由僅適用於 exec；Matrix 插件審批保留在共享的
  同一聊天 `/approve` 和可選的 `approvals.plugin` 轉發路徑上
- 請求者不必是審批者
- 當該聊天已支援指令和回覆時，原始聊天可以直接使用 `/approve` 進行批准
- 原生 Discord 審批按鈕按審批 ID 種類路由：`plugin:` ID 直接
  前往插件審批，其他所有內容前往 exec 審批
- 原生 Telegram 審批按鈕遵循與 `/approve` 相同的有界 exec 到插件後援機制
- 當原生 `target` 啟用原始聊天傳遞時，審批提示包含指令文字
- 待處理的 exec 審批預設在 30 分鐘後過期
- 如果沒有操作員 UI 或設定的審批用戶端可以接受請求，提示會後援到 `askFallback`

Telegram 預設為審批者 DM (`target: "dm"`)。當您
希望審批提示也出現在原始 Telegram 聊天/主題中時，您可以切換到 `channel` 或 `both`。對於 Telegram 論壇
主題，OpenClaw 會為審批提示和批准後的後續跟進保留該主題。

請參閱：

- [Discord](/en/channels/discord)
- [Telegram](/en/channels/telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全說明：

- Unix socket 模式 `0600`，token 儲存於 `exec-approvals.json`。
- Same-UID 對等端檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短 TTL。

## 系統事件

Exec 生命週期會以系統訊息呈現：

- `Exec running` (僅當指令超過執行通知閾值時)
- `Exec finished`
- `Exec denied`

這些內容會在節點回報事件後發布至 Agent 的會話。
Gateway-host exec 批准會在指令完成時（以及可選的執行時間超過閾值時）發出相同的生命週期事件。
有批准閘門的 exec 會在這些訊息中重複使用批准 ID 作為 `runId` 以便於關聯。

## 拒絕批准的行為

當非同步 exec 批准被拒絕時，OpenClaw 會防止 Agent 重複使用
會話中相同指令先前執行的任何輸出。拒絕原因
會帶有明確的指導，說明沒有可用的指令輸出，這會阻止
Agent 聲稱有新輸出，或利用先前成功執行的過期結果
重複執行被拒絕的指令。

## 影響

- **full** 功能強大；盡可能優先使用允許清單。
- **ask** 讓您保持知情，同時仍允許快速批准。
- 每個 Agent 的允許清單可防止一個 Agent 的批准洩漏到其他 Agent。
- 批准僅適用於來自**授權傳送者**的主機 exec 請求。未授權的傳送者無法發出 `/exec`。
- `/exec security=full` 是授權操作員的會話層級便利功能，且設計上會跳過批准。
  若要徹底封鎖主機 exec，請將批准安全性設為 `deny` 或透過工具政策拒絕 `exec` 工具。

相關：

- [Exec tool](/en/tools/exec)
- [Elevated mode](/en/tools/elevated)
- [Skills](/en/tools/skills)

## 相關

- [Exec](/en/tools/exec) — shell 指令執行工具
- [Sandboxing](/en/gateway/sandboxing) — 沙箱模式和工作區存取
- [安全性](/en/gateway/security) — 安全模型與加固
- [沙盒 vs 工具策略 vs 提升權限](/en/gateway/sandbox-vs-tool-policy-vs-elevated) — 何時使用各項
