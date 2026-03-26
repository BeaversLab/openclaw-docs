---
summary: "Exec approvals, allowlists, and sandbox escape prompts"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec Approvals"
---

# Exec approvals

Exec approvals are the **companion app / node host guardrail** for letting a sandboxed agent run
commands on a real host (`gateway` or `node`). Think of it like a safety interlock:
commands are allowed only when policy + allowlist + (optional) user approval all agree.
Exec approvals are **in addition** to tool policy and elevated gating (unless elevated is set to `full`, which skips approvals).
Effective policy is the **stricter** of `tools.exec.*` and approvals defaults; if an approvals field is omitted, the `tools.exec` value is used.

If the companion app UI is **not available**, any request that requires a prompt is
resolved by the **ask fallback** (default: deny).

## Where it applies

Exec approvals are enforced locally on the execution host:

- **gateway host** → `openclaw` process on the gateway machine
- **node host** → node runner (macOS companion app or headless node host)

Trust model note:

- Gateway-authenticated callers are trusted operators for that Gateway.
- Paired nodes extend that trusted operator capability onto the node host.
- Exec approvals reduce accidental execution risk, but are not a per-user auth boundary.
- Approved node-host runs bind canonical execution context: canonical cwd, exact argv, env
  binding when present, and pinned executable path when applicable.
- For shell scripts and direct interpreter/runtime file invocations, OpenClaw also tries to bind
  one concrete local file operand. If that bound file changes after approval but before execution,
  the run is denied instead of executing drifted content.
- This file binding is intentionally best-effort, not a complete semantic model of every
  interpreter/runtime loader path. If approval mode cannot identify exactly one concrete local
  file to bind, it refuses to mint an approval-backed run instead of pretending full coverage.

macOS split:

- **node host service** forwards `system.run` to the **macOS app** over local IPC.
- **macOS 應用程式** 會執行核准，並在 UI 語境中執行命令。

## 設定與儲存

核准存放在執行主機上的本機 JSON 檔案中：

`~/.openclaw/exec-approvals.json`

Schema 範例：

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

## 原則調整旋鈕

### 安全性 (`exec.security`)

- **deny**：封鎖所有主機執行請求。
- **allowlist**：僅允許允許清單中的命令。
- **full**：允許所有內容（等同於提升權限）。

### 詢問 (`exec.ask`)

- **off**：永不提示。
- **on-miss**：僅在允許清單不符時提示。
- **always**：對每個命令都提示。

### 詢問後備 (`askFallback`)

如果需要提示但無法連接 UI，則由後備決定：

- **deny**：封鎖。
- **allowlist**：僅在符合允許清單時允許。
- **full**：允許。

## 允許清單 (每個代理程式)

允許清單是 **每個代理程式** 獨立的。如果有多個代理程式，請在 macOS 應用程式中切換您正在編輯的代理程式。模式為 **不區分大小寫的 glob 符合**。
模式應解析為 **二進位路徑**（僅含基本名稱的項目會被忽略）。
舊版 `agents.default` 項目會在載入時遷移至 `agents.main`。

範例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每個允許清單項目會追蹤：

- **id** 用於 UI 身分的穩定 UUID（選用）
- **last used** 時間戳記
- **last used command**
- **last resolved path**

## 自動允許技能 CLI

當啟用 **Auto-allow skill CLIs** 時，已知技能參考的可執行檔會被視為在節點上已列入允許清單（macOS 節點或無頭節點主機）。這會透過 Gateway RPC 使用 `skills.bins` 來擷取技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

重要信任事項：

- 這是一個 **隱含的便利性允許清單**，與手動路徑允許清單項目分開。
- 它適用於 Gateway 和節點位於相同信任邊界的受信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單項目。

## 安全 bins (僅 stdin)

`tools.exec.safeBins` 定義了一小組 **僅限 stdin** 的二進位檔（例如 `jq`），它們可以在允許清單模式下運行，而**無需**明確的允許清單條目。安全二進位檔會拒絕位置檔案引數和類似路徑的標記，因此它們只能對輸入流進行操作。
請將此視為串流篩選器的狹窄快速路徑，而非一般的信任清單。
請**勿**將解譯器或執行時期二進位檔（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）加入 `safeBins`。
如果指令可以透過設計評估程式碼、執行子指令或讀取檔案，請優先使用明確的允許清單條目並保持批准提示已啟用。
自訂安全二進位檔必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。
驗證僅根據 argv 形狚進行確定性檢查（不檢查主機檔案系統是否存在），這可防止因允許/拒絕差異而產生的檔案存在預言行為。
針對預設的安全二進位檔，會拒絕檔案導向的選項（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全二進位檔也會針對破壞僅限 stdin 行為的選項，執行明確的每個二進位檔標記政策（例如 `sort -o/--output/--compress-program` 和 grep 遞迴標記）。
在安全二進位檔模式下，長選項的驗證採取失效安全原則：未知標記和模糊縮寫都會被拒絕。
依安全二進位檔設定檔拒絕的標記：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`： `--argfile`、 `--from-file`、 `--library-path`、 `--rawfile`、 `--slurpfile`、 `-L`、 `-f`
- `sort`： `--compress-program`、 `--files0-from`、 `--output`、 `--random-source`、 `--temporary-directory`、 `-T`、 `-o`
- `wc`： `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Safe bins 也會強制在執行時將 argv 權杖視為**字面文字** (literal text)（不進行 glob 萬用字元展開，也不進行 `$VARS` 擴充），針對僅限 stdin 的區段，因此像 `*` 或 `$HOME/...` 這類模式無法被用來走私檔案讀取。
Safe bins 也必須解析自受信任的二進位目錄（系統預設值加上可選的 `tools.exec.safeBinTrustedDirs`）。`PATH` 項目永不會自動受信任。
預設受信任的 safe-bin 目錄刻意保持最少： `/bin`、 `/usr/bin`。
如果您的 safe-bin 可執行檔位於套件管理器/使用者路徑中（例如 `/opt/homebrew/bin`、 `/usr/local/bin`、 `/opt/local/bin`、 `/snap/bin`），請將其明確新增至 `tools.exec.safeBinTrustedDirs`。
Shell 鏈結和重新導向不會在允許清單模式中自動允許。

當每個頂層區段都符合允許清單（包括安全 bins 或技能自動允許）時，允許 Shell 鏈結（`&&`、`||`、`;`）。在允許清單模式下，重導仍不受支援。在允許清單剖析期間會拒絕指令替換（`$()` / 反引號），包括在雙引號內；如果您需要字面 `$()` 文字，請使用單引號。在 macOS 伴隨應用程式核准中，包含 Shell 控制或擴充語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 Shell 文字會被視為不符合允許清單，除非 Shell 二進位檔本身在允許清單中。對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的 env 覆寫會縮減為一個小型明確允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。對於允許清單模式下的「一律允許」決策，已知的分派包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑，而不是包裝器路徑。Shell 多工器（`busybox`、`toybox`）也會針對 Shell 小程式（`sh`、`ash` 等）進行解包，因此會保存內部可執行檔，而不是多工器二進位檔。如果無法安全地解包包裝器或多工器，將不會自動保存任何允許清單項目。

預設安全 bins：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不在預設清單中。如果您選擇啟用，請為其非 stdin 工作流程保留明確的允許清單條目。
對於安全 bin 模式下的 `grep`，請提供帶有 `-e`/`--regexp` 的模式；位置參數模式形式會被拒絕，因此無法將檔案操作數作為不明確的位置參數走私。

### 安全 bins 與允許清單

| 主題     | `tools.exec.safeBins`               | 允許清單 (`exec-approvals.json`)      |
| -------- | ----------------------------------- | ------------------------------------- |
| 目標     | 自動允許狹窄的 stdin 過濾器         | 明確信任特定可執行檔                  |
| 比對類型 | 可執行檔名稱 + 安全 bin argv 政策   | 已解析的可執行檔路徑 glob 模式        |
| 引數範圍 | 受安全 bin 設定檔和字面標記規則限制 | 僅路徑比對；引數否則是您的責任        |
| 典型範例 | `jq`、`head`、`tail`、`wc`          | `python3`, `node`, `ffmpeg`, 自訂 CLI |
| 最佳用途 | 管線中的低風險文字轉換              | 任何具有更廣泛行為或副作用的工具      |

組態位置：

- `safeBins` 來自組態 (`tools.exec.safeBins` 或每個代理程式的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自組態 (`tools.exec.safeBinTrustedDirs` 或每個代理程式的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自組態 (`tools.exec.safeBinProfiles` 或每個代理程式的 `agents.list[].tools.exec.safeBinProfiles`)。每個代理程式的設定檔鍵會覆寫全域鍵。
- 允許清單條目位於主機本地的 `~/.openclaw/exec-approvals.json` 下的 `agents.<id>.allowlist` (或透過 Control UI / `openclaw approvals allowlist ...`)。
- 當解譯器/執行環境二進位檔出現在 `safeBins` 中但沒有明確的設定檔時，`openclaw security audit` 會以 `tools.exec.safe_bins_interpreter_unprofiled` 發出警告。
- `openclaw doctor --fix` 可以將遺失的自訂 `safeBinProfiles.<bin>` 項目建構為 `{}`（事後請審查並收緊）。解譯器/執行環境二進位檔不會自動建構。

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

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、每個代理程式的覆寫值以及允許清單。選擇一個範圍（Defaults 或某個代理程式）、調整政策、新增/移除允許清單模式，然後按一下 **Save**。UI 會顯示每個模式的 **last used** 中繼資料，方便您整理清單。

目標選擇器會選擇 **Gateway**（本機核准）或 **Node**。節點必須宣告支援 `system.execApprovals.get/set`（macOS app 或 headless node host）。如果節點尚未宣告執行核准，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點編輯（請參閱 [Approvals CLI](/zh-Hant/cli/approvals)）。

## 核准流程

當需要提示時，閘道會向操作員用戶端廣播 `exec.approval.requested`。Control UI 和 macOS app 會透過 `exec.approval.resolve` 解析它，然後閘道會將核准後的請求轉送至節點主機。

針對 `host=node`，核准請求包含標準的 `systemRunPlan` 資料。閘道在轉送已核准的 `system.run` 請求時，會使用該計畫作為授權的 command/cwd/session 內容。

## 解譯器/執行環境指令

有核准支援的解譯器/執行環境執行作業刻意採取保守原則：

- 精確的 argv/cwd/env 內容一定會綁定。
- 直接 shell 腳本和直接執行環境檔案形式會盡力綁定至一個具體的本地檔案快照。
- 仍解析為一個直接本地檔案的常見套件管理程式包裝函式形式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定前先解開包裝。
- 如果 OpenClaw 無法精確識別解釋器/運行時命令對應的單一具體本地檔案
  （例如 package scripts、eval forms、特定於運行時的載入器鏈，或歧義的多檔案
  forms），則將拒絕依賴批准的執行，而不是聲稱其不具備的語義覆蓋範圍。
- 對於那些工作流程，建議優先使用沙盒、獨立的主機邊界，或顯式的受信任
  允許清單/完整工作流程，其中操作員接受更廣泛的運行時語義。

當需要批准時，exec 工具會立即返回一個批准 ID。使用該 ID 來關聯後續的系統事件（`Exec finished` / `Exec denied`）。如果在超時前沒有收到決定，
則該請求將被視為批准超時，並作為拒絕原因顯示。

確認對話框包括：

- command + args
- cwd
- agent id
- resolved executable path
- host + policy metadata

操作：

- **Allow once** → 立即執行
- **Always allow** → 加入允許清單並執行
- **Deny** → 封鎖

## 將批准轉發至聊天頻道

您可以將 exec 批准提示轉發到任何聊天頻道（包括插件頻道），並使用 `/approve` 進行批准。
這使用正常的出站交付管道。

配置：

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

### 內建聊天批准客戶端

Discord 和 Telegram 也可以充當具有特定頻道配置的顯式 exec 批准客戶端。

- Discord: `channels.discord.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

這些客戶端是選用的。如果某個頻道未啟用 exec 批准功能，OpenClaw 不會僅因為對話發生在該頻道
而將其視為批准介面。

共用行為：

- 只有配置的批准者才能批准或拒絕
- 請求者不需要是批准者
- 啟用頻道交付時，批准提示會包含命令文字
- 如果沒有操作員 UI 或配置的批准客戶端可以接受請求，提示將退回到 `askFallback`

Telegram 預設為審核者私訊 (`target: "dm"`)。當您希望審核提示也顯示在原始 Telegram 聊天/主題中時，您可以切換到 `channel` 或 `both`。對於 Telegram 論壇主題，OpenClaw 會為審核提示和審核後的後續追蹤保留該主題。

參閱：

- [Discord](/zh-Hant/channels/discord#exec-approvals-in-discord)
- [Telegram](/zh-Hant/channels/telegram#exec-approvals-in-telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全性注意事項：

- Unix socket 模式 `0600`，token 儲存在 `exec-approvals.json` 中。
- 相同 UID 對等端檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短暫的 TTL。

## 系統事件

Exec 生命週期會顯示為系統訊息：

- `Exec running` (僅當指令超過執行通知閾值時)
- `Exec finished`
- `Exec denied`

這些內容會在節點回報事件後發佈至 Agent 的階段作業中。託管於 Gateway 的 exec 審核會在指令完成時發出相同的生命週期事件 (以及在執行時間超過閾值時選擇性地發出)。受審核管制的 exec 會重複使用審核 ID 作為這些訊息中的 `runId` 以便於關聯。

## 影響

- **full** 功能強大；盡可能優先使用允許清單。
- **ask** 讓您掌握狀況，同時仍允許快速審核。
- 每個 Agent 的允許清單可防止一個 Agent 的審核洩漏至其他 Agent。
- 審核僅適用於來自 **授權發送者** 的主機 exec 請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是授權操作員的階段作業層級便利功能，且依設計會跳過審核。若要完全封鎖主機 exec，請將審核安全性設定為 `deny` 或透過工具政策拒絕 `exec` 工具。

相關連結：

- [Exec 工具](/zh-Hant/tools/exec)
- [提升模式](/zh-Hant/tools/elevated)
- [技能](/zh-Hant/tools/skills)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
