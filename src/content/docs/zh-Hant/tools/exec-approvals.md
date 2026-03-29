---
summary: "執行核准、允許清單和沙箱逃離提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "執行核准"
---

# 執行核准

執行核准是讓沙箱化代理程式在真實主機（`gateway` 或 `node`）上執行指令的**伴隨應用程式 / 節點主機防護機制**。您可以將其視為安全聯鎖：
只有當原則 + 允許清單 + （可選）使用者核准都一致同意時，才允許執行指令。
執行核准是工具原則和提升權限閘門的**附加機制**（除非提升權限設定為 `full`，這會跳過核准）。
有效的原則是 `tools.exec.*` 和核准預設值中**更嚴格**的一個；如果省略了某個核准欄位，則使用 `tools.exec` 值。

如果**無法使用**伴隨應用程式 UI，任何需要提示的請求都會由**詢問回退機制**（預設：拒絕）來解析。

## 適用範圍

執行核准是在執行主機上本機強制執行的：

- **閘道主機** → 閘道機器上的 `openclaw` 程序
- **節點主機** → 節點執行器（macOS 伴隨應用程式或無介面節點主機）

信任模型注意事項：

- 經過閘道驗證的呼叫者是該閘道的信任操作員。
- 配對的節點將該信任操作員能力擴展到節點主機上。
- 執行核准可降低意外執行的風險，但並非每個使用者的驗證邊界。
- 已核准的節點主機執行會綁定標準執行內容：標準 cwd、精確 argv、環境綁定（如果存在），以及釘選的可執行檔路徑（如果適用）。
- 對於 Shell 腳本和直接的直譯器/執行時期檔案叫用，OpenClaw 也會嘗試綁定
  一個具體的本機檔案操作數。如果綁定的檔案在核准後但在執行前發生變更，
  則會拒絕執行，而不是執行已變更的內容。
- 此檔案綁定是故意採取盡力而為的方式，並非每個
  直譯器/執行時期載入器路徑的完整語意模型。如果核准模式無法識別要綁定的確切一個具體本機
  檔案，它會拒絕建立由核准支援的執行，而不是假設完全覆蓋。

macOS 分割：

- **節點主機服務** 透過本機 IPC 將 `system.run` 轉發到 **macOS 應用程式**。
- **macOS app** 強制執行核准並在 UI 語境中執行命令。

## 設定與儲存

核准設定存在執行主機上的本機 JSON 檔案中：

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

## 政策控制

### 安全性 (`exec.security`)

- **deny**：封鎖所有主機執行請求。
- **allowlist**：僅允許白名單中的命令。
- **full**：允許所有內容（等同於提升權限）。

### 詢問 (`exec.ask`)

- **off**：永不提示。
- **on-miss**：僅在白名單不符時提示。
- **always**：每個命令都提示。

### 詢問後備 (`askFallback`)

如果需要提示但無法連接 UI，則由後備決定：

- **deny**：封鎖。
- **allowlist**：僅在白名單相符時允許。
- **full**：允許。

### Inline 解譯器 eval 加固 (`tools.exec.strictInlineEval`)

當 `tools.exec.strictInlineEval=true` 時，即使解譯器二進位檔本身在白名單中，OpenClaw 也會將 inline code-eval 形式視為僅需核准。

範例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

這是對於無法清楚對應到單一穩定檔案操作數的解譯器載入器的深度防禦。在嚴格模式下：

- 這些命令仍然需要明確核准；
- `allow-always` 不會自動為這些命令持久化新的白名單項目。

## 白名單 (每個代理程式)

白名單是 **每個代理程式** 的。如果有多個代理程式，請在 macOS app 中切換您正在編輯的代理程式。模式是 **不區分大小寫的 glob 符合**。
模式應解析為 **二進位路徑** (僅含基本名稱的項目會被忽略)。
舊版 `agents.default` 項目會在載入時遷移至 `agents.main`。

範例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每個白名單項目會追蹤：

- **id** 用於 UI 身分的穩定 UUID (選用)
- **last used** 時間戳記
- **last used command**
- **last resolved path**

## 自動允許技能 CLI

當啟用 **Auto-allow skill CLIs** 時，已知技能參考的可執行檔會在節點（macOS 節點或無頭節點主機）上被視為已加入允許清單。這會透過 Gateway RPC 使用 `skills.bins` 來取得技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

重要的信任事項：

- 這是一個 **隱含的便利性允許清單**，與手動路徑允許清單項目分開。
- 此功能適用於 Gateway 和節點位於相同信任邊界內的受信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單項目。

## 安全的 bin（僅限 stdin）

`tools.exec.safeBins` 定義了一小串 **僅限 stdin** 的二進位檔案（例如 `cut`），
這些檔案可以在允許清單模式（allowlist mode）下執行，而**無需**明確的允許清單項目。安全的二進位檔案會拒絕
位置檔案引數和類路徑的標記（tokens），因此它們只能對傳入的串流進行操作。
請將此視為串流篩選器的狹窄快速路徑，而非一般的信任清單。
**切勿**將解譯器或執行時期二進位檔案（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。
如果某個指令設計上可以評估程式碼、執行子指令或讀取檔案，請優先使用明確的允許清單項目，並保持審核提示為啟用狀態。
自訂的安全二進位檔案必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。
驗證僅根據 argv 形狚決定（不檢查主機檔案系統是否存在），這可以
防止因允許/拒絕差異而產生的檔案存在預言行為。
對於預設的安全二進位檔案，會拒絕檔案導向的選項（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全的二進位檔案也會針對破壞僅限 stdin 行為的選項，強制執行明確的個別二進位檔案旗標政策（例如 `sort -o/--output/--compress-program` 和 grep 遞迴旗標）。
在安全二進位檔案模式下，長選項會以失敗即關閉（fail-closed）的方式進行驗證：未知的旗標和歧義的縮寫會被拒絕。
被安全二進位檔案設定檔拒絕的旗標：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`： `--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全二進制檔還會強制 argv 權杖在執行時被視為**字面文字**（針對僅限 stdin 的區段，不進行 globbing 和無 `$VARS` 擴充），因此像 `*` 或 `$HOME/...` 這樣的模式無法被用來讀取檔案。
安全二進制檔也必須從受信任的二進制目錄解析（系統預設值加上可選的 `tools.exec.safeBinTrustedDirs`）。`PATH` 項目永遠不會自動受信任。
預設受信任的安全二進制目錄經過刻意精簡：`/bin`、`/usr/bin`。
如果您安全二進制可執行檔位於套件管理器/使用者路徑中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），請將其明確新增至 `tools.exec.safeBinTrustedDirs`。
在允許清單模式下，Shell 鏈結和重新導向不會自動獲得允許。

當每個頂層區段都符合允許清單時（包括安全 bins 或技能自動允許），允許 Shell 鏈結（`&&`、`||`、`;`）。在允許清單模式下，重新導向仍然不受支援。
在允許清單解析期間，會拒絕指令替換（`$()` / 反引號），包括在雙引號內；如果您需要字面 `$()` 文字，請使用單引號。
在 macOS 伴隨應用程式批准中，包含 Shell 控制或擴展語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 Shell 文字會被視為不符合允許清單，除非 Shell 二進位檔本身已在允許清單中。
對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會減少為一個小型明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
對於允許清單模式下的「一律允許」決策，已知的分派包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會儲存內部可執行檔路徑，而非包裝器路徑。Shell 多工器（`busybox`、`toybox`）也會針對 Shell 小程式（`sh`、`ash` 等）進行解包，因此會儲存內部可執行檔而非多工器二進位檔。如果無法安全地解包包裝器或多工器，將不會自動儲存允許清單項目。
如果您將解譯器（例如 `python3` 或 `node`）加入允許清單，建議優先使用 `tools.exec.strictInlineEval=true`，以便內聯評估仍需要明確批准。

預設安全 bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在預設清單中。如果您選擇啟用它們，請為其非 stdin 工作流程保留明確的允許清單條目。
對於安全 bin 模式下的 `grep`，請使用 `-e`/`--regexp` 提供模式；位置參數模式形式會被拒絕，以防止檔案操作數被夾帶為不明確的位置參數。

### 安全 bins 與允許清單

| 主題     | `tools.exec.safeBins`               | 允許清單 (`exec-approvals.json`)                 |
| -------- | ----------------------------------- | ------------------------------------------------ |
| 目標     | 自動允許狹窄的 stdin 過濾器         | 明確信任特定的可執行檔                           |
| 比對類型 | 可執行檔名稱 + 安全 bin argv 政策   | 已解析的可執行檔路徑 glob 模式                   |
| 引數範圍 | 受安全 bin 設定檔和文字標記規則限制 | 僅路徑比對；引數方面則由您自行負責               |
| 典型範例 | `head`, `tail`, `tr`, `wc`          | `jq`, `python3`, `node`, `ffmpeg`, 自訂 CLIs     |
| 最佳用途 | 管線中的低風險文字轉換              | 任何具有更廣泛行為或副作用（side effects）的工具 |

設定位置：

- `safeBins` 來自設定 (`tools.exec.safeBins` 或每個代理程式的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自設定 (`tools.exec.safeBinTrustedDirs` 或每個代理程式的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自設定 (`tools.exec.safeBinProfiles` 或每個代理程式的 `agents.list[].tools.exec.safeBinProfiles`)。每個代理程式的設定檔金鑰會覆寫全域金鑰。
- 允許清單條目位於 `agents.<id>.allowlist` 下的主機本機 `~/.openclaw/exec-approvals.json` 中（或透過 Control UI / `openclaw approvals allowlist ...`）。
- 當直譯器/執行時期二進位檔出現在 `safeBins` 中卻沒有明確的設定檔時，`openclaw security audit` 會以 `tools.exec.safe_bins_interpreter_unprofiled` 發出警告。
- `openclaw doctor --fix` 可以將遺失的自訂 `safeBinProfiles.<bin>` 項目建構為 `{}`（隨後請檢閱並收緊）。直譯器/執行時期二進位檔不會自動建構。

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

如果您明確選擇將 `jq` 加入 `safeBins`，OpenClaw 在安全二進位模式下仍會拒絕 `env` 兛建置函式，因此 `jq -n env` 若無明確的允許清單路徑或核准提示，便無法傾印主機程序環境。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、各代理的覆寫設定與允許清單。選擇一個範圍（預設值或某個代理）、調整政策、新增/移除允許清單模式，然後按一下 **Save**。UI 會顯示每個模式的 **last used** 中繼資料，方便您整理清單。

目標選擇器可選擇 **Gateway**（本機核准）或 **Node**。節點必須公告 `system.execApprovals.get/set`（macOS 應用程式或無頭節點主機）。如果節點尚未公告執行核准，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點的編輯（請參閱 [Approvals CLI](/en/cli/approvals)）。

## 核准流程

當需要提示時，閘道會向操作員用戶端廣播 `exec.approval.requested`。Control UI 和 macOS 應用程式會透過 `exec.approval.resolve` 解析它，然後閘道會將已核准的請求轉發至節點主機。

針對 `host=node`，核准請求包含標準的 `systemRunPlan` Payload。當轉發已核准的 `system.run` 請求時，閘道會使用該計畫作為權威的 command/cwd/session 內容。

## 直譯器/執行時期指令

由核准支援的直譯器/執行時期執行作業刻意採用保守策略：

- 精確的 argv/cwd/env 內容始終會被綁定。
- 直接 shell 腳本與直接執行時期檔案形式會以盡力而為的方式綁定至一個具體的本機檔案快照。
- 仍然解析為單一直接本地檔案的常見套件管理器包裝形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定之前被解包。
- 如果 OpenClaw 無法為直譯器/執行階段命令識別出一個確切的本機檔案（例如套件腳本、eval 形式、執行階段特定的載入器鏈，或不明確的多檔案形式），則會拒絕經過審核的執行，而不是聲稱其不具備的語意涵蓋範圍。
- 對於那些工作流程，建議使用沙箱、獨立的主機邊界，或是明確的可信允許清單/完整工作流程，讓操作員接受更廣泛的執行階段語意。

當需要審核時，exec 工具會立即傳回一個審核 ID。使用該 ID 來關聯後續的系統事件（`Exec finished` / `Exec denied`）。如果在逾時前未收到決定，該請求將被視為審核逾時，並作為拒絕原因顯示出來。

確認對話方塊包括：

- command + args
- cwd
- agent id
- resolved executable path
- host + policy metadata

動作：

- **Allow once** → 立即執行
- **Always allow** → 加入允許清單並執行
- **Deny** → 封鎖

## 審核轉發至聊天頻道

您可以將 exec 審核提示轉發至任何聊天頻道（包括外掛程式頻道），並使用 `/approve` 進行審核。這使用的是常規的傳出傳遞管道。

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

### 內建聊天審核客戶端

Discord 和 Telegram 也可以透過特定頻道的設定，充當明確的 exec 審核客戶端。

- Discord：`channels.discord.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

這些客戶端是選用的。如果某個頻道未啟用 exec 審核，OpenClaw 不會僅因為對話發生在該頻道，就將其視為審核介面。

共用行為：

- 只有已設定的審核者可以批准或拒絕
- 請求者不必是審核者
- 當啟用頻道傳遞時，審核提示會包含命令文字
- 如果沒有任何操作員 UI 或已設定的審核客戶端可以接受請求，提示將會回退至 `askFallback`

Telegram 預設為審核者私訊 (`target: "dm"`)。當您希望審核提示也顯示在原始 Telegram 聊天/主題中時，您可以切換至 `channel` 或 `both`。對於 Telegram 論壇主題，OpenClaw 會為審核提示及審核後的後續追蹤保留主題。

請參閱：

- [Discord](/en/channels/discord#exec-approvals-in-discord)
- [Telegram](/en/channels/telegram#exec-approvals-in-telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全性備註：

- Unix socket 模式 `0600`，token 儲存在 `exec-approvals.json` 中。
- 相同 UID 對等檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短 TTL。

## 系統事件

Exec 生命週期會以系統訊息呈現：

- `Exec running` (僅當指令超過執行通知閾值時)
- `Exec finished`
- `Exec denied`

這些會在節點回報事件後發布至代理程式的會話。閘道主機 exec 審核會在指令完成時 (以及在選擇性情況下，當執行時間超過閾值時) 發出相同的生命週期事件。具備審核閘道的 exec 會在這些訊息中重複使用審核 ID 作為 `runId`，以便於關聯。

## 影響

- **full** 功能強大；盡可能優先使用允許清單。
- **ask** 讓您保持掌握，同時仍允許快速審核。
- 每個代理程式的允許清單可防止一個代理程式的審核洩漏至其他代理程式。
- 審核僅適用於來自**授權發送者**的主機 exec 請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是授權操作員的會話級便利功能，設計上會跳過審核。
  若要完全阻擋主機 exec，請將審核安全性設為 `deny` 或透過工具原則拒絕 `exec` 工具。

相關項目：

- [Exec 工具](/en/tools/exec)
- [提升權限模式](/en/tools/elevated)
- [技能](/en/tools/skills)
