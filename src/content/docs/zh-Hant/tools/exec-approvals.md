---
summary: "執行核准、允許清單和沙箱逸出提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "執行核准"
---

# 執行核准

執行核准是 **伴隨應用程式 / 節點主機防護機制**，用於讓沙箱化代理程式在真實主機 (`gateway` 或 `node`) 上執行指令。您可以將其視為安全互鎖：
只有當策略 + 允許清單 + (可選) 使用者核准都一致同意時，才允許執行指令。
執行核准是工具策略和提升權限閘門的 **額外** 機制 (除非將提升權限設為 `full`，這會略過核准)。
有效策略是 `tools.exec.*` 與核准預設值中 **較嚴格** 的那一個；如果省略了某個核准欄位，則會使用 `tools.exec` 值。

如果**無法使用**伴隨應用程式 UI，任何需要提示的請求都會由**詢問回退機制**（預設：拒絕）來解析。

## 適用範圍

執行核准是在執行主機上本機強制執行的：

- **gateway host** → `openclaw` process on the gateway machine
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

- **node host service** 透過本機 IPC 將 `system.run` 轉發至 **macOS app**。
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

### 詢問備援 (`askFallback`)

如果需要提示但無法連接 UI，則由後備決定：

- **deny**：封鎖。
- **allowlist**：僅在白名單相符時允許。
- **full**：允許。

### Inline interpreter eval hardening (`tools.exec.strictInlineEval`)

當 `tools.exec.strictInlineEval=true` 時，OpenClaw 會將內聯程式碼求值 (code-eval) 形式視為僅需批准，即使解譯器二進位檔本身已加入允許清單。

範例：

- `python -c`
- `node -e`， `node --eval`， `node -p`
- `ruby -e`
- `perl -e`， `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

這是對於無法清楚對應到單一穩定檔案操作數的解譯器載入器的深度防禦。在嚴格模式下：

- 這些命令仍然需要明確核准；
- `allow-always` 不會自動為它們持久化新的允許清單條目。

## 白名單 (每個代理程式)

允許清單是**每個代理獨立**的。如果有多個代理，請在 macOS 應用程式中切換您正在編輯的代理。模式採用**不區分大小寫的 glob 比對**。
模式應解析為**二進位路徑**（僅包含基本名稱的條目會被忽略）。
舊版 `agents.default` 條目會在載入時遷移至 `agents.main`。

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

當啟用**自動允許技能 CLI** 時，已知技能參照的可執行檔會被視為已在節點（macOS 節點或無頭節點主機）上列入允許清單。這會透過 Gateway RPC 使用 `skills.bins` 來取得技能二進位檔清單。如果您想要嚴格的手動允許清單，請停用此功能。

重要的信任事項：

- 這是一個 **隱含的便利性允許清單**，與手動路徑允許清單項目分開。
- 此功能適用於 Gateway 和節點位於相同信任邊界內的受信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false`，並且僅使用手動路徑允許清單項目。

## 安全的 bin（僅限 stdin）

`tools.exec.safeBins` 定義了一份小型 **僅限 stdin** 的二進制文件列表（例如 `cut`），這些文件可以在不包含明確允許清單條目的情況下，以允許清單模式執行。安全二進制文件會拒絕位置文件參數和類似路徑的標記，因此它們只能對傳入流進行操作。將其視為針對流過濾器的窄速徑，而非一般的信任列表。請 **勿** 將解釋器或執行時二進制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。如果某個指令設計上可以評估程式碼、執行子指令或讀取檔案，請優先使用明確的允許清單條目並保持批准提示啟用。自訂安全二進制文件必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。驗證僅根據 argv 形狚確定性進行（不進行主機檔案系統存在性檢查），這可以防止因允許/拒絕差異而產生的檔案存在預測行為。針對預設的安全二進制文件，會拒絕面向檔案的選項（例如 `sort -o`、`sort --output`、`sort --files0-from`、`sort --compress-program`、`sort --random-source`、`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、`grep -f/--file`）。對於破壞僅限 stdin 行為的選項，安全二進制文件還會強制執行明確的每個二進制文件的標誌策略（例如 `sort -o/--output/--compress-program` 和 grep 遞歸標誌）。在安全二進制模式下，長選項的驗證採取失敗關閉：未知的標誌和歧義的縮寫會被拒絕。按安全二進制設定檔拒絕的標誌：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全可執行檔（safe bins）還會強制僅限 stdin 的區段在執行時將 argv 標記視為 **純文字**（literal text）（無 glob 展開且無 `$VARS` 展開），因此像 `*` 或 `$HOME/...` 這類模式無法被用來讀取檔案。
安全可執行檔也必須解析自受信任的二進位目錄（系統預設值加上可選的 `tools.exec.safeBinTrustedDirs`）。`PATH` 項目絕不會自動被信任。
預設的受信任安全可執行檔目錄被刻意設為極簡：`/bin`、`/usr/bin`。
如果您的安全可執行檔位於套件管理器/使用者路徑中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），請將其明確新增至 `tools.exec.safeBinTrustedDirs`。
Shell 鏈結與重導向在允許清單模式下不會自動獲准。

當每個頂層區段都符合允許清單（包括安全的二進位檔或技能自動允許）時，允許使用 Shell 鏈結（`&&`、`||`、`;`）。在允許清單模式下，不支援重新導向。在允許清單解析期間，會拒絕指令替換（`$()` / 反引號），包括在雙引號內；如果您需要字面意義的 `$()` 文字，請使用單引號。在 macOS 伴隨應用程式批准中，包含 Shell 控制或擴展語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 Shell 文字會被視為未通過允許清單，除非 Shell 二進位檔本身在允許清單中。對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會被縮減為一個小型明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。對於允許清單模式下的「一律允許」決策，已知的分發包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保留內部可執行檔路徑，而不是包裝器路徑。Shell 多工器（`busybox`、`toybox`）也會針對 Shell 小程式（`sh`、`ash` 等）進行解包，因此會保留內部可執行檔而不是多工器二進位檔。如果無法安全地解包包裝器或多工器，則不會自動保留任何允許清單項目。如果您將直譯器（例如 `python3` 或 `node`）加入允許清單，建議優先使用 `tools.exec.strictInlineEval=true`，這樣內聯評估仍需要明確批准。在嚴格模式下，`allow-always` 仍然可以保留良性的直譯器/指令碼呼叫，但內聯評估載體不會自動保留。

預設安全 bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在預設清單中。如果您選擇加入，請為其非 stdin 工作流程保留明確的允許清單條目。
若要在安全 bin 模式下使用 `grep`，請使用 `-e`/`--regexp` 提供模式；會拒絕位置參數模式，因此檔案操作數無法被偽裝為不明確的位置參數。

### 安全 bins 與允許清單

| 主題     | `tools.exec.safeBins`               | 允許清單 (`exec-approvals.json`)                 |
| -------- | ----------------------------------- | ------------------------------------------------ |
| 目標     | 自動允許狹窄的 stdin 過濾器         | 明確信任特定的可執行檔                           |
| 比對類型 | 可執行檔名稱 + 安全 bin argv 政策   | 已解析的可執行檔路徑 glob 模式                   |
| 引數範圍 | 受安全 bin 設定檔和文字標記規則限制 | 僅路徑比對；引數方面則由您自行負責               |
| 典型範例 | `head`, `tail`, `tr`, `wc`          | `jq`, `python3`, `node`, `ffmpeg`, 自訂 CLI      |
| 最佳用途 | 管線中的低風險文字轉換              | 任何具有更廣泛行為或副作用（side effects）的工具 |

設定位置：

- `safeBins` 來自配置 (`tools.exec.safeBins` 或每個代理程式的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自配置 (`tools.exec.safeBinTrustedDirs` 或每個代理程式的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自配置 (`tools.exec.safeBinProfiles` 或每個代理程式的 `agents.list[].tools.exec.safeBinProfiles`)。每個代理程式的設定檔金鑰會覆寫全域金鑰。
- 允許清單條目位於主機本地的 `~/.openclaw/exec-approvals.json` 下的 `agents.<id>.allowlist` (或透過 Control UI / `openclaw approvals allowlist ...`)。
- 當解譯器/執行時 bins 出現在 `safeBins` 中而沒有明確的設定檔時，`openclaw security audit` 會以 `tools.exec.safe_bins_interpreter_unprofiled` 發出警告。
- `openclaw doctor --fix` 可以將缺少的自訂 `safeBinProfiles.<bin>` 條目搭建為 `{}` (之後請檢視並調整)。解譯器/執行時 bins 不會自動搭建。

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

如果您明確選擇加入 `jq` 為 `safeBins`，OpenClaw 仍會在安全二進制模式下拒絕 `env` 內建指令，因此 `jq -n env` 無法在沒有明確允許列表路徑或核准提示的情況下傾印主機進程環境。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、各代理的覆寫設定與允許清單。選擇一個範圍（預設值或某個代理）、調整政策、新增/移除允許清單模式，然後按一下 **Save**。UI 會顯示每個模式的 **last used** 中繼資料，方便您整理清單。

目標選擇器會選擇 **Gateway**（本機核准）或 **Node**。節點必須廣播 `system.execApprovals.get/set`（macOS 應用程式或無頭節點主機）。如果節點尚未廣播執行核准，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點編輯（請參閱 [Approvals CLI](/en/cli/approvals)）。

## 核准流程

當需要提示時，閘道會向操作員用戶端廣播 `exec.approval.requested`。Control UI 和 macOS 應用程式透過 `exec.approval.resolve` 解析它，然後閘道將已核准的請求轉發到節點主機。

對於 `host=node`，核准請求包含標準 `systemRunPlan` 負載。閘道在轉發已核准的 `system.run` 請求時，會將該計畫用作授權的指令/cwd/會話上下文。

## 直譯器/執行時期指令

由核准支援的直譯器/執行時期執行作業刻意採用保守策略：

- 精確的 argv/cwd/env 內容始終會被綁定。
- 直接 shell 腳本與直接執行時期檔案形式會以盡力而為的方式綁定至一個具體的本機檔案快照。
- 仍然解析為一個直接本機檔案的常見套件管理程式包裝程式表單（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定之前被解包。
- 如果 OpenClaw 無法為直譯器/執行階段命令識別出一個確切的本機檔案（例如套件腳本、eval 形式、執行階段特定的載入器鏈，或不明確的多檔案形式），則會拒絕經過審核的執行，而不是聲稱其不具備的語意涵蓋範圍。
- 對於那些工作流程，建議使用沙箱、獨立的主機邊界，或是明確的可信允許清單/完整工作流程，讓操作員接受更廣泛的執行階段語意。

當需要核准時，exec 工具會立即返回並附上核准 ID。使用該 ID 來關聯後續的系統事件（`Exec finished` / `Exec denied`）。如果在逾時前未收到決定，該請求將被視為核准逾時，並作為拒絕原因顯示出來。

### 後續傳遞行為

在已核准的異步執行完成後，OpenClaw 會向同一個會話發送後續 `agent` 回合。

- 如果存在有效的外部傳遞目標（可傳遞通道加上目標 `to`），後續傳遞會使用該通道。
- 在僅網頁聊天或沒有外部目標的內部會話流程中，後續傳遞保持僅限會話（`deliver: false`）。
- 如果呼叫者明確要求嚴格的外部傳遞，但沒有可解析的外部通道，請求將失敗並傳回 `INVALID_REQUEST`。
- 如果啟用了 `bestEffortDeliver` 且無法解析外部通道，傳遞將降級為僅限會話，而不是失敗。

確認對話方塊包括：

- 指令 + 參數
- 工作目錄
- 代理程式 ID
- 已解析的可執行檔路徑
- 主機 + 原則中繼資料

動作：

- **允許一次** → 現在執行
- **一律允許** → 加入允許清單 + 執行
- **拒絕** → 封鎖

## 將審核轉發至聊天頻道

您可以將執行審核提示轉發到任何聊天頻道（包括外掛程式頻道），並使用 `/approve` 進行核准。這會使用正常的傳出傳遞管線。

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

`/approve` 指令同時處理執行審核和外掛程式審核。如果 ID 與待處理的執行審核不相符，它會自動檢查外掛程式審核。

### 外掛程式審核轉發

外掛程式審核轉發使用與執行審核相同的傳遞管線，但在 `approvals.plugin` 下有其獨立的設定。啟用或停用其中一個不會影響另一個。

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

設定形狀與 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的運作方式相同。

支援共享互動回覆的頻道會為執行和外掛程式審核呈現相同的核准按鈕。不支援共享互動 UI 的頻道會退回到純文字並附上 `/approve`
指示。

### 在任何頻道上進行同頻道審核

當執行或外掛程式審核請求來自可傳遞的聊天介面時，預設情況下，同一個聊天現在可以使用 `/approve` 進行核准。這適用於 Slack、Matrix 和 Microsoft Teams 等頻道，以及現有的 Web UI 和終端機 UI 流程。

此共享文字指令路徑會針對該對話使用正常的頻道驗證模型。如果來源聊天已經可以傳送指令並接收回覆，審核請求就不再需要單獨的原生傳遞配接器來保持待處理狀態。

Discord 和 Telegram 也支援同聊天室 `/approve`，但即使停用了原生審批傳遞，這些頻道仍會使用其解析出的審批者清單進行授權。

### 原生審批傳遞

Discord、Slack 和 Telegram 也可以透過特定頻道的配置，充當原生審批傳遞轉接器。

- Discord：`channels.discord.execApprovals.*`
- Slack：使用與 `channel: "slack"` 共用的 `approvals.exec.targets`，並在啟用互動功能時渲染 Block Kit 審批按鈕
- Telegram：`channels.telegram.execApprovals.*`

這些原生傳遞轉接器是選用的。它們在共用的同聊天室 `/approve` 流程和共用審批按鈕之上，新增了 DM 路由和頻道分發功能。

共用行為：

- Slack、Matrix、Microsoft Teams 和類似的可傳遞聊天室對於同聊天室 `/approve` 使用正常的頻道授權模型
- 對於 Discord 和 Telegram，只有解析出的審批者可以批准或拒絕
- Discord 和 Telegram 的審批者可以是明確指定的 (`execApprovals.approvers`) 或從現有的擁有者配置推斷 (`allowFrom`，加上直接訊息 `defaultTo` (如支援))
- 請求者不必是審批者
- 當來源聊天室已支援指令和回覆時，可以直接使用 `/approve` 進行批准
- 啟用頻道傳遞時，審批提示會包含指令文字
- 待處理的執行審批預設在 30 分鐘後過期
- 如果沒有操作員 UI 或配置的審批用戶端可以接受請求，提示會回退至 `askFallback`

Telegram 預設使用審批者 DM (`target: "dm"`)。當您希望審批提示也出現在來源 Telegram 聊天室/主題中時，可以切換至 `channel` 或 `both`。對於 Telegram 論壇主題，OpenClaw 會保留審批提示和批准後後續處理的主題。

參閱：

- [Discord](/en/channels/discord)
- [Telegram](/en/channels/telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全注意事項：

- Unix socket 模式 `0600`，token 儲存於 `exec-approvals.json`。
- 相同 UID 對等檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短 TTL。

## 系統事件

Exec 生命週期以系統訊息呈現：

- `Exec running` (僅當指令超過執行通知閾值時)
- `Exec finished`
- `Exec denied`

這些內容會在節點報告事件後發佈到代理程式的工作階段。
Gateway 託管的 exec 核准會在指令完成時發出相同的生命週期事件 (以及在選填情況下，當執行時間超過閾值時)。
具有核准閘門的 exec 會重複使用核准 ID 作為這些訊息中的 `runId`，以便於關聯。

## 拒絕核准的行為

當非同步 exec 核准被拒絕時，OpenClaw 會防止代理程式重複使用
工作階段中任何先前執行相同指令的輸出。拒絕原因
會附帶明確的指示，表明沒有可用的指令輸出，這能阻止
代理程式聲稱有新的輸出，或使用先前成功執行的過時結果
重複執行被拒絕的指令。

## 影響

- **full** (完整) 功能強大；盡可能優先使用允許清單。
- **ask** (詢問) 讓您掌握情況，同時仍允許快速核准。
- 每個代理程式的允許清單可防止一個代理程式的核准洩漏到其他代理程式。
- 核准僅適用於來自**授權發送者**的主機 exec 請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是授權操作員在工作階段層級的便利功能，設計上會略過核准。
  若要徹底封鎖主機 exec，請將核准安全性設為 `deny` 或透過工具原則拒絕 `exec` 工具。

相關連結：

- [Exec 工具](/en/tools/exec)
- [提權模式](/en/tools/elevated)
- [技能](/en/tools/skills)

## 相關

- [Exec](/en/tools/exec) — shell 指令執行工具
- [沙盒化](/en/gateway/sandboxing) — 沙盒模式與工作區存取
- [安全性](/en/gateway/security) — 安全性模型與強化防護
- [沙盒 vs 工具原則 vs 提權](/en/gateway/sandbox-vs-tool-policy-vs-elevated) — 何時使用各項功能
