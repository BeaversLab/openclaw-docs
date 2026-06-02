---
summary: "Exec tool usage, stdin modes, and TTY support"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec tool"
---

在工作區中執行 Shell 指令。`exec` 是一個可變更的 Shell 介面：只要選定的主機或沙盒檔案系統允許，指令就可以在任何位置建立、編輯或刪除檔案。停用 OpenClaw 檔案系統工具（例如 `write`、`edit` 或 `apply_patch`）並不會讓 `exec` 變成唯讀。

透過 `process` 支援前景 + 背景執行。如果不允許 `process`，`exec` 會同步執行並忽略 `yieldMs`/`background`。
背景會話的範圍是以每個代理程式為單位；`process` 只能看到來自同一個代理程式的會話。

## Parameters

<ParamField path="command" type="string" required>
  要執行的 Shell 指令。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  指令的工作目錄。
</ParamField>

<ParamField path="env" type="object">
  鍵值對環境變數覆寫，會合併至繼承的環境變數之上。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  在此延遲（毫秒）後自動將指令置於背景執行。
</ParamField>

<ParamField path="background" type="boolean" default="false">
  立即將指令置於背景執行，而不是等待 `yieldMs`。
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
  覆寫此呼叫的已設定 exec 逾時。僅當指令應該在沒有 exec 程序逾時的情況下執行時，才將 `timeout: 0` 設為 true。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  在可用時於虛擬終端機中執行。用於僅支援 TTY 的 CLI、編碼代理程式和終端機 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  執行位置。當沙箱運行環境處於活動狀態時，`auto` 解析為 `sandbox`，否則解析為 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  對於一般工具呼叫會忽略。 `gateway` / `node` 安全性由 `tools.exec.security` 和 `~/.openclaw/exec-approvals.json` 控制；提升模式僅在操作員明確授予提升存取權時才能強制執行 `security=full`。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  `gateway` / `node` 執行的核准提示行為。
</ParamField>

<ParamField path="node" type="string">
  當 `host=node` 時的節點 ID/名稱。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  請求提升模式 — 跳出沙盒到設定的主機路徑。僅當提升解析為 `full` 時才會強制執行 `security=full`。
</ParamField>

Notes:

- `host` 預設為 `auto`：若工作階段啟用沙盒執行階段則為沙盒，否則為閘道。
- `host` 僅接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主機名稱選擇器；類似主機名稱的值會在命令執行前被拒絕。
- `auto` 是預設的路由策略，而非萬用字元。允許從 `auto` 進行每次呼叫的 `host=node`；僅當未啟用沙盒執行階段時才允許每次呼叫的 `host=gateway`。
- `tools.exec.mode` 是標準化的策略調節參數。可用的值有 `deny`、`allowlist`、`ask`、`auto` 和 `full`。`auto` 會直接執行確定性允許清單/安全 bin 匹配，並將其餘所有執行審核案例在詢問人類之前透過 OpenClaw 的原生自動審核者進行路由。`ask` / `ask=always` 仍然每次都詢問人類。
- 在沒有額外設定的情況下，`host=auto` 仍然可以「直接運作」：沒有沙盒表示它會解析為 `gateway`；啟動中的沙盒表示它會保持在沙盒中。
- `elevated` 會逸出沙盒至設定的主機路徑：預設為 `gateway`，或在 `tools.exec.host=node` 時（或會話預設為 `host=node`）則為 `node`。這僅在為目前會話/提供者啟用存取權限提升時可用。
- `gateway`/`node` 的核准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配對的節點（伴隨應用程式或無頭節點主機）。
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 來選擇其中一個。
- `exec host=node` 是節點唯一的 shell 執行路徑；舊版的 `nodes.run` 包裝函式已移除。
- `timeout` 適用於前景、背景、`yieldMs`、閘道、沙盒和節點 `system.run` 執行。如果省略，OpenClaw 會使用 `tools.exec.timeoutSec`；明確的 `timeout: 0` 則會停用該呼叫的執行程序逾時。
- 在非 Windows 主機上，如果設定了 `SHELL`，exec 會使用它；如果 `SHELL` 是 `fish`，它會優先使用 `PATH` 中的 `bash`（或 `sh`）以避免不相容於 fish 的腳本，如果兩者都不存在則回退到 `SHELL`。
- 在 Windows 主機上，exec 優先尋找 PowerShell 7 (`pwsh`)（先找 Program Files、ProgramW6432，然後是 PATH），
  然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二進位劫持或注入程式碼。
- OpenClaw 在產生的指令環境中（包括 PTY 和沙箱執行）設定 `OPENCLAW_SHELL=exec`，以便 shell/profile 規則可以偵測 exec-tool 語境。
- 由於 `openclaw channels login` 是互動式的通道驗證流程，因此被從 `exec` 中封鎖；請在閘道主機上的終端機中執行它，或在有提供時從聊天中使用通道原生的登入工具。
- 重要：沙箱功能**預設關閉**。如果沙箱功能關閉，隱含的 `host=auto`
  會解析為 `gateway`。顯式的 `host=sandbox` 仍然會失敗關閉，而不是在
  閘道主機上靜默執行。請啟用沙箱功能，或在取得批准後使用 `host=gateway`。
- 腳本預檢檢查（針對常見的 Python/Node shell 語法錯誤）僅會檢查有效 `workdir` 邊界內的檔案。
  如果腳本路徑解析到 `workdir` 之外，則會跳過該檔案的預檢。
- 對於現在開始的長時間執行工作，請啟動一次並在啟用且指令發出輸出或失敗時依賴自動完成喚醒。
  使用 `process` 來查看日誌、狀態、輸入或進行干預；不要使用 sleep 迴圈、timeout 迴圈或重複輪詢來模擬排程。
- 對於應該稍後發生或按排程進行的工作，請使用 cron，而不是
  `exec` 的 sleep/delay 模式。

## Config

- `tools.exec.notifyOnExit` (預設值：true)：當為 true 時，後台執行的 exec 工作階段會將一個系統事件加入佇列，並在退出時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設值：10000)：當需要審核的 exec 執行時間超過此值時，發出單一「執行中」通知 (0 則停用)。
- `tools.exec.timeoutSec` (預設值：1800)：每個指令的預設 exec 逾時時間（秒）。單次呼叫的 `timeout` 會覆寫此設定；單次呼叫的 `timeout: 0` 則會停用 exec 處理程序逾時。
- `tools.exec.host` (預設值：`auto`；當沙盒執行環境啟用時解析為 `sandbox`，否則為 `gateway`)
- `tools.exec.security` (預設值：沙盒為 `deny`，若未設定則 gateway + node 為 `full`)
- `tools.exec.ask` (預設值：`off`)
- 對於 gateway + node，無需審核的 host exec 是預設行為。如果您需要審核/允許清單行為，請同時收緊 `tools.exec.*` 和 host `~/.openclaw/exec-approvals.json`；請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals#yolo-mode-no-approval)。
- YOLO 來自主機原則預設值 (`security=full`、`ask=off`)，而非來自 `host=auto`。如果您想要強制使用 gateway 或 node 路由，請設定 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加上 `ask=off` 模式下，主機執行會直接遵循設定的原則；沒有額外的啟發式指令混淆前置過濾器或腳本預檢拒絕層。
- `tools.exec.node` (預設值：未設定)
- `tools.exec.strictInlineEval` (預設值: false)：設為 true 時，內聯解釋器 eval 形式（如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`）需要審核者或明確批准。在 `mode=auto` 中，正常的 exec 批准路徑可能會允許原生自動審核者批准明顯低風險的一次性指令；直接 node-host `system.run` 呼叫仍需要明確批准，因為它們無法將指令移交給人工審核路徑。如果審核者提出要求，請求將轉給人員。`allow-always` 仍然可以保存良性解釋器/指令碼調用，但內聯 eval 形式不會變成持久的允許規則。
- `tools.exec.commandHighlighting` (預設值: false)：設為 true 時，批准提示可以突顯指令文字中由解析器衍生的指令範圍。全域設定或針對每個代理 設定為 `true`，即可在不變更 exec 批准策略的情況下啟用指令文字突顯。
- `tools.exec.pathPrepend`：要前置到 exec 執行的 `PATH` 的目錄清單（僅限 gateway + sandbox）。
- `tools.exec.safeBins`：僅 stdin 的安全二進位檔，無需明確的允許清單條目即可執行。有關行為的詳細資訊，請參閱 [Safe bins](/zh-Hant/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用於 `safeBins` 路徑檢查的其他受信任明確目錄。`PATH` 條目永不會自動受信任。內建預設值為 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每個安全 bin 的可選自訂 argv 策略 (`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`)。

範例：

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### PATH 處理

- `host=gateway`: 將您的登入 shell `PATH` 合併到 exec 環境中。針對主機執行，會拒絕 `env.PATH` 覆寫。Daemon 本身仍以最精簡的 `PATH` 執行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
    - 為防止使用者 shell 配置（例如 `~/.zshenv` 或 `/etc/zshenv`）在啟動期間覆寫優先路徑，`tools.exec.pathPrepend` 項目會在執行前安全地預先附加到 shell 指令內的最終 `PATH` 中。
- `host=sandbox`: 在容器內執行 `sh -lc` (登入 shell)，因此 `/etc/profile` 可能會重設 `PATH`。
  OpenClaw 會在載入 profile 後透過內部環境變數（不經 shell 插值）將 `env.PATH` 預先附加；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`: 只有您傳遞的非封鎖環境變數覆寫會被傳送到節點。針對主機執行會拒絕 `env.PATH` 覆寫，且節點主機會予以忽略。如果您在節點上需要額外的 PATH 項目，
  請設定節點主機服務環境 (systemd/launchd) 或將工具安裝在標準位置。

個別代理節點綁定（使用設定中的代理清單索引）：

```bash
openclaw config get agents.list
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
```

控制 UI：「節點」分頁包含一個小型的「Exec node binding」面板，用於相同設定。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **per-session** 預設值。
傳送不帶任何參數的 `/exec` 以顯示目前的數值。

範例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對 **經授權的傳送者**（通道允許清單/配對加上 `commands.useAccessGroups`）有效。
它僅更新 **工作階段狀態** 且不寫入設定。經授權的外部通道傳送者可以
設定這些工作階段預設值。內部 Gateway/Webchat 用戶端需要 `operator.admin` 來將其持久化。
若要徹底停用 exec，請透過工具原則（`tools.deny: ["exec"]` 或個別代理程式）拒絕它。除非您明確設定 `security=full` 和 `ask=off`，否則主機核准
仍然適用。

## Exec 核准（伴隨應用程式 / 節點主機）

沙箱化的代理程式在 `exec` 於 Gateway 或節點主機上執行之前，可能需要每次請求的核准。
請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals) 以了解原則、允許清單和 UI 流程。

當需要核准時，exec 工具會立即回傳
`status: "approval-pending"` 和一個核准 ID。一旦核准（或拒絕/逾時），
Gateway 僅針對已核准的執行發出指令進度和完成系統事件
（`Exec running` / `Exec finished`）。被拒絕或逾時的核准屬於終止狀態，且不會
透過拒絕系統事件喚醒代理程式工作階段。
在具有原生核准卡片/按鈕的通道上，代理程式應優先依賴該
原生 UI，並僅在工具結果明確指出聊天核准不可用或手動核准為
唯一途徑時，才包含手動 `/approve` 指令。

## 允許清單 + 安全 bins

手動允許清單執行比對解析後的二進位路徑萬用字元和純指令名稱萬用字元。純名稱僅比對透過 PATH 呼叫的指令，因此當指令是 `rg` 時，`rg` 可以比對 `/opt/homebrew/bin/rg`，但不能比對 `./rg` 或 `/tmp/rg`。
當 `security=allowlist` 時，Shell 指令只有在每個管線區段都在允許清單中或是安全 bin 時才會自動允許。鏈結 (`;`, `&&`, `||`) 和重導向在允許清單模式下會被拒絕，除非每個頂層區段都滿足允許清單 (包括安全 bin)。重導向仍然不受支援。持久的 `allow-always` 信任並不會繞過該規則：鏈結指令仍然要求每個頂層區段都要符合。

`autoAllowSkills` 是 exec 核准中的一個單獨便利路徑。它與手動路徑允許清單項目不同。若要嚴格執行明確信任，請將 `autoAllowSkills` 保持停用。

使用這兩個控制項來處理不同的工作：

- `tools.exec.safeBins`：小型、僅 stdin 的串流篩選器。
- `tools.exec.safeBinTrustedDirs`：針對安全 bin 可執行檔路徑的明確額外信任目錄。
- `tools.exec.safeBinProfiles`：針對自訂安全 bin 的明確 argv 原則。
- allowlist：針對可執行檔路徑的明確信任。

不要將 `safeBins` 視為通用允許清單，且不要新增直譯器/執行期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要這些，請使用明確的允許清單項目，並保持批准提示為啟用狀態。
當直譯器/執行期 `safeBins` 項目缺少明確的設定檔時，`openclaw security audit` 會發出警告，而 `openclaw doctor --fix` 可以產生缺少的自訂 `safeBinProfiles` 項目。
當您明確將行為廣泛的 bins（例如 `jq`）新增回 `safeBins` 時，`openclaw security audit` 和 `openclaw doctor` 也會發出警告。
如果您明確允許清單直譯器，請啟用 `tools.exec.strictInlineEval`，以便內聯程式碼評估表單仍需要審查者或明確批准。

如需完整的政策詳細資訊和範例，請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/zh-Hant/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

## 範例

前景：

```json
{ "tool": "exec", "command": "ls -la" }
```

背景 + 輪詢：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

輪詢是為了隨選狀態，而非等待迴圈。如果啟用了自動完成喚醒，當指令輸出內容或失敗時，它可以喚醒工作階段。

傳送按鍵 (tmux 樣式)：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交 (僅傳送 CR)：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

貼上 (預設加上括號)：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的子工具，用於結構化的多檔案編輯。
對於 OpenAI 和 OpenAI Codex 模型，它預設為啟用。僅當您想要停用它或將其限制為特定模型時才使用設定：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

備註：

- 僅適用於 OpenAI/OpenAI Codex 模型。
- 工具政策仍然適用；`allow: ["write"]` 隱含允許 `apply_patch`。
- `deny: ["write"]` 不會拒絕 `apply_patch`；當 patch 寫入也應被封鎖時，請明確拒絕 `apply_patch` 或使用 `deny: ["group:fs"]`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.enabled` 預設為 `true`；將其設定為 `false` 以停用 OpenAI 模型的此工具。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true`（工作區包含）。僅當您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

## 相關

- [Exec Approvals](/zh-Hant/tools/exec-approvals) — Shell 指令的審核閘門
- [Sandboxing](/zh-Hant/gateway/sandboxing) — 在沙箱環境中執行指令
- [Background Process](/zh-Hant/gateway/background-process) — 長時間執行的 exec 和 process 工具
- [Security](/zh-Hant/gateway/security) — 工具政策和提權存取
