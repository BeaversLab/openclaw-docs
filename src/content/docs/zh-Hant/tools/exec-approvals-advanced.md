---
summary: "進階執行審核：安全二進位檔、直譯器綁定、審核轉發、原生傳遞"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "執行審核 — 進階"
---

進階執行審核主題：`safeBins` 快速路徑、直譯器/執行階段
綁定，以及將審核轉發至聊天頻道（包括原生傳遞）。
若要了解核心策略與審核流程，請參閱 [執行審核](/zh-Hant/tools/exec-approvals)。

## 安全二進位檔（僅限 stdin）

`tools.exec.safeBins` 定義了一小份 **僅限 stdin** 的二進位檔清單（例如
`cut`），這些檔案可以在允許清單模式下運作，**無需** 明確的允許清單項目。
安全二進位檔會拒絕位置檔案引數和類似路徑的標記，因此它們只能對傳入串流進行操作。
請將此視為串流過濾器的狹窄快速路徑，而非一般的信任清單。

<Warning>
請**勿**將直譯器或執行階段二進位檔（例如 `python3`、`node`、
`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。
如果指令可以評估程式碼、執行子指令或依設計讀取檔案，請優先使用明確的允許清單項目
並保持啟用審核提示。自訂安全二進位檔必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。
</Warning>

預設安全二進位檔：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`、`uniq`、`head`、`tail`、`tr`、`wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在預設清單中。如果您選擇啟用它們，請為其非 stdin 的工作流程保留明確的
允許清單項目。對於處於安全二進位檔模式的 `grep`，請使用
`-e`/`--regexp` 提供模式；系統會拒絕位置引數形式，
以防止檔案運算元被偽裝成模糊的位置引數。

### Argv 驗證與拒絕的旗標

驗證僅根據 argv 的形式進行（不檢查主機檔案系統是否存在），這可以防止因允許/拒絕差異而導致的檔案存在預測行為。針對預設的安全二進位檔會拒絕檔案導向的選項；長選項的驗證採取失效安全原則（未知標誌和模糊的縮寫都會被拒絕）。

各安全二進位檔設定檔的被拒絕標誌：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`：`--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`：`--compress-program`、`--files0-from`、`--output`、`--random-source`、`--temporary-directory`、`-T`、`-o`
- `wc`：`--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

對於僅限 stdin 的區段，安全二進位檔還會強制在執行時將 argv 欄位視為**字面文字**（無 globbing 且無 `$VARS` 擴展），因此像 `*` 或 `$HOME/...` 這類模式無法用於偷讀檔案。

### 受信任的二進位檔目錄

安全二進位檔必須從受信任的二進位檔目錄解析（系統預設值加上可選的 `tools.exec.safeBinTrustedDirs`）。`PATH` 項目永不會自動受信任。預設的受信任目錄刻意極少：`/bin`、`/usr/bin`。如果您的安全二進位檔可執行檔位於套件管理程式/使用者路徑（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），請將其明確加入 `tools.exec.safeBinTrustedDirs`。

### Shell 鏈結、包裝程式與多工器

當每個頂層區段都符合允許清單（包括安全 bins 或技能自動允許）時，允許 Shell 鏈結（`&&`、`||`、`;`）。在允許清單模式下，重新導向仍然不受支援。指令替換（`$()` / 反引號）會在允許清單解析期間被拒絕，包括在雙引號內；如果您需要字面上的 `$()` 文字，請使用單引號。

在 macOS 伴隨應用程式核准中，包含 Shell 控制或擴充語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 Shell 文字會被視為允許清單遺漏，除非 Shell 二進位檔本身已在允許清單中。

對於 Shell 包裝程式（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會減少為一個小型明確允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。

對於允許清單模式下的 `allow-always` 決策，已知的分派包裝程式（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑，而非包裝程式路徑。Shell 多工器（`busybox`、`toybox`）會以同樣方式為 Shell 小程式（`sh`、`ash` 等）解開包裝。如果無法安全地解開包裝程式或多工器的包裝，將不會自動保存任何允許清單項目。

如果您將諸如 `python3` 或 `node` 的直譯器列入允許清單，建議優先選擇
`tools.exec.strictInlineEval=true`，這樣內聯評估仍然需要明確的
批准。在嚴格模式下，`allow-always` 仍然可以持續保存良性
的直譯器/腳本調用，但內聯評估載體不會
自動持續保存。

### 安全二進制檔案與允許清單

| 主題     | `tools.exec.safeBins`                      | 允許清單 (`exec-approvals.json`)                                   |
| -------- | ------------------------------------------ | ------------------------------------------------------------------ |
| 目標     | 自動允許狹窄的 stdin 過濾器                | 明確信任特定可執行檔                                               |
| 匹配類型 | 可執行檔名稱 + 安全二進制檔案 argv 策略    | 已解析的可執行檔路徑 glob，或透過 PATH 呼叫之命令的純命令名稱 glob |
| 參數範圍 | 受安全二進制檔案設定檔和字面值令牌規則限制 | 僅路徑匹配；參數由您自行負責                                       |
| 典型範例 | `head`、`tail`、`tr`、`wc`                 | `jq`、`python3`、`node`、`ffmpeg`、自訂 CLI                        |
| 最佳用途 | 管道中的低風險文字轉換                     | 任何具有更廣泛行為或副作用 的工具                                  |

設定位置：

- `safeBins` 來自設定 (`tools.exec.safeBins` 或每個 Agent 的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自設定 (`tools.exec.safeBinTrustedDirs` 或每個 Agent 的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自設定 (`tools.exec.safeBinProfiles` 或每個 Agent 的 `agents.list[].tools.exec.safeBinProfiles`)。每個 Agent 的設定檔金鑰會覆蓫全域金鑰。
- 允許清單條目位於 `agents.<id>.allowlist` 下的主機本地 `~/.openclaw/exec-approvals.json` 中 (或透過 Control UI / `openclaw approvals allowlist ...`)。
- 當直譯器/執行時二進制檔案在沒有明確設定檔的情況下出現在 `safeBins` 中時，`openclaw security audit` 會發出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以將遺失的自訂 `safeBinProfiles.<bin>` 項目 scaffold 成 `{}`（事後請審閱並收緊）。直譯器/執行時期 bins 不會自動 scaffold。

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

如果您明確將 `jq` 設為 `safeBins`，OpenClaw 仍會在 safe-bin 模式下拒絕 `env` 內建指令，因此 `jq -n env` 若無明確的允許清單路徑或批准提示，便無法傾印主機程序環境。

## 直譯器/執行時期指令

經批准的直譯器/執行時期執行作業刻意採取保守策略：

- 精確的 argv/cwd/env 環境始終會受到綁定。
- 直接 shell 腳本和直接執行時期檔案格式會盡力綁定至一個具體的本機檔案快照。
- 仍可解析為一個直接本機檔案的常見套件管理程式包裝格式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定前被展開。
- 如果 OpenClaw 無法為直譯器/執行時期指令識別出確切的一個具體本機檔案（例如套件腳本、eval 格式、特定執行時期的載入器鏈結，或歧義的多檔案格式），將會拒絕經批准的執行，而非聲稱其不具備的語意涵蓋範圍。
- 對於這些工作流程，建議優先採用沙盒、獨立的主機邊界，或是操作員接受更廣泛執行時期語意的明確信任允許清單/完整工作流程。

當需要批准時，exec 工具會立即傳回一個批准 ID。請使用該 ID 來關聯後續的系統事件（`Exec finished` / `Exec denied`）。如果在逾時前未收到決策，該請求將被視為批准逾時，並作為拒絕原因呈現。

### 後續傳遞行為

在經批准的非同步 exec 完成後，OpenClaw 會向同一個工作階段發送後續的 `agent` 回合。

- 如果存在有效的外部傳遞目標（可傳遞的頻道加上目標 `to`），後續傳遞會使用該頻道。
- 在僅限網路聊天或沒有外部目標的內部工作階段流程中，後續傳遞僅限於工作階段內（`deliver: false`）。
- 如果呼叫者明確要求嚴格的外部傳遞但沒有可解析的外部頻道，請求將會失敗並傳回 `INVALID_REQUEST`。
- 如果啟用了 `bestEffortDeliver` 且無法解析外部頻道，傳遞將降級為僅限工作階段，而不是失敗。

## 將審核轉發至聊天頻道

您可以將執行審核提示轉發到任何聊天頻道（包括外掛頻道）並使用 `/approve` 進行審核。這使用正常的出站傳遞管道。

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

`/approve` 指令同時處理執行審核和外掛審核。如果 ID 不符合待處理的執行審核，它會自動改為檢查外掛審核。

### 外掛審核轉發

外掛審核轉發使用與執行審核相同的傳遞管道，但在 `approvals.plugin` 下有其獨立的設定。啟用或停用其中一個不會影響另一個。

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

設定結構與 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、`sessionFilter` 和 `targets` 的工作方式相同。

支援共用互動回覆的頻道會為執行審核和外掛審核呈現相同的審核按鈕。沒有共用互動 UI 的頻道會退回到純文字並附帶 `/approve` 指令。

### 在任何頻道上進行同聊天審核

當執行或外掛審核請求來自可傳遞的聊天介面時，預設情況下，同一個聊天現在可以使用 `/approve` 對其進行審核。這適用於 Slack、Matrix 和 Microsoft Teams 等頻道，以及現有的 Web UI 和終端機 UI 流程。

這個共用的文字指令路徑使用該對話的正常頻道驗證模型。如果來源聊天已經可以發送指令並接收回覆，審核請求不再需要單獨的原生傳遞配接器來保持待處理狀態。

Discord 和 Telegram 也支援同聊天室 `/approve`，但這些頻道即使停用了原生的審核傳送功能，仍然會使用其解析後的審核者清單進行授權。

對於 Telegram 和其他直接呼叫 Gateway 的原生審核客戶端，此後備機制有意限制在「找不到審核」失敗的情況下。真正的執行審核拒絕/錯誤不會以外掛程式審核的方式靜默重試。

### 原生審核傳送

某些頻道也可以充當原生審核客戶端。原生客戶端在共享的同聊天室 `/approve` 流程之上，增加了審核者 DM、原始聊天室分流以及特定頻道的互動式審核 UX。

當可使用原生審核卡片/按鈕時，該原生 UI 是面向 Agent 的主要途徑。除非工具結果指出聊天室審核不可用或手動審核是唯一剩餘的途徑，否則 Agent 不應重複回顯單純的聊天室 `/approve` 指令。

通用模型：

- host exec policy 仍然決定是否需要執行審核
- `approvals.exec` 控制將審核提示轉發到其他聊天室目的地
- `channels.<channel>.execApprovals` 控制該頻道是否充當原生審核客戶端

當以下所有條件均成立時，原生審核客戶端會自動啟用 DM 優先傳送：

- 該頻道支援原生審核傳送
- 可以從明確的 `execApprovals.approvers` 或該頻道文件中記載的後備來源解析審核者
- `channels.<channel>.execApprovals.enabled` 未設定或為 `"auto"`

設定 `enabled: false` 以明確停用原生審核客戶端。設定 `enabled: true` 以在解析出審核者時強制啟用它。公開的原始聊天室傳送保持透過 `channels.<channel>.execApprovals.target` 明確設定。

常見問題：[為什麼聊天室審核有兩個執行審核設定？](/zh-Hant/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

這些原生審核客戶端在共享的同聊天室 `/approve` 流程和共享審核按鈕之上，增加了 DM 路由和可選的頻道分流。

共享行為：

- Slack、Matrix、Microsoft Teams 和類似的可傳送聊天平台使用正常的頻道授權模型
  來處理同頻道的 `/approve`
- 當原生審批客戶端自動啟用時，預設的原生傳送目標是審批者的 DM
- 對於 Discord 和 Telegram，只有已解析的審批者可以批准或拒絕
- Discord 審批者可以是明確指定的 (`execApprovals.approvers`) 或是從 `commands.ownerAllowFrom` 推斷出的
- Telegram 審批者可以是明確指定的 (`execApprovals.approvers`) 或是從現有的擁有者配置推斷出的 (`allowFrom`，加上直接訊息 `defaultTo`，若支援的話)
- Slack 審批者可以是明確指定的 (`execApprovals.approvers`) 或是從 `commands.ownerAllowFrom` 推斷出的
- Slack 原生按鈕會保留審批 ID 種類，因此 `plugin:` ID 可以解析外掛程式審批
  而不需要第二層 Slack 本地回退層
- Matrix 原生 DM/頻道路由和反應捷徑同時處理執行和外掛程式審批；
  外掛程式授權仍來自 `channels.matrix.dm.allowFrom`
- 請求者不需要是審批者
- 當該聊天已支援指令和回覆時，原始聊天可以直接使用 `/approve` 進行批准
- 原生 Discord 審批按鈕按審批 ID 種類路由：`plugin:` ID 直接
  前往外掛程式審批，其他所有內容則前往執行審批
- 原生 Telegram 審批按鈕遵循與 `/approve` 相同的有界執行至外掛程式回退機制
- 當原生 `target` 啟用原始聊天傳送時，審批提示會包含指令文字
- 待處理的執行審批預設在 30 分鐘後過期
- 如果沒有操作員 UI 或設定的審批客戶端可以接受請求，提示會回退至 `askFallback`

Telegram 預設為審批者 DM (`target: "dm"`)。當您希望審批提示也出現在原始 Telegram 聊天/主題中時，您可以切換至 `channel` 或 `both`。對於 Telegram 論壇
主題，OpenClaw 會為審批提示和審批後的追蹤保留該主題。

請參閱：

- [Discord](/zh-Hant/channels/discord)
- [Telegram](/zh-Hant/channels/telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全性備註：

- Unix socket 模式 `0600`，token 儲存在 `exec-approvals.json`。
- 相同 UID 對等檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短效 TTL。

## 相關

- [Exec approvals](/zh-Hant/tools/exec-approvals) — 核心原則與審核流程
- [Exec tool](/zh-Hant/tools/exec)
- [Elevated mode](/zh-Hant/tools/elevated)
- [Skills](/zh-Hant/tools/skills) — 技能支援的自動允許行為
