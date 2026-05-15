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
  `gateway` / `node` 執行的強制模式。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  `gateway` / `node` 執行的核准提示行為。
</ParamField>

<ParamField path="node" type="string">
  當 `host=node` 時的節點 ID/名稱。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  請求提權模式 — 脫離沙箱進入配置的主機路徑。僅當 elevated 解析為 `full` 時，才會強制執行 `security=full`。
</ParamField>

Notes:

- `host` 預設為 `auto`：若該階段啟用沙箱運行環境則為沙箱，否則為閘道。
- `host` 僅接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主機名稱選擇器；類似主機名稱的值會在命令執行前被拒絕。
- `auto` 是預設的路由策略，並非萬用字元。允許從 `auto` 進行單次呼叫的 `host=node`；僅當未啟用沙箱運行環境時，才允許單次呼叫的 `host=gateway`。
- 在沒有額外配置的情況下，`host=auto` 仍然「正常運作」：沒有沙箱意味著它解析為 `gateway`；活躍的沙箱意味著它停留在沙箱中。
- `elevated` 會跳出沙盒進入已配置的主機路徑：預設為 `gateway`，當 `tools.exec.host=node` 時（或會話預設值為 `host=node`）則為 `node`。僅在為當前會話/提供者啟用提升存取權限時可用。
- `gateway`/`node` 的審批由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要一個配對的節點（伴隨程式或無頭節點主機）。
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 來選擇其中一個。
- `exec host=node` 是節點唯一的 shell 執行路徑；舊版的 `nodes.run` 包裝器已被移除。
- `timeout` 適用於前景、背景、`yieldMs`、閘道、沙盒和節點 `system.run` 執行。如果省略，OpenClaw 使用 `tools.exec.timeoutSec`；明確的 `timeout: 0` 會停用該呼叫的 exec 程序逾時。
- 在非 Windows 主機上，如果設定了 `SHELL`，exec 會使用它；如果 `SHELL` 是 `fish`，它會偏好 `PATH` 中的 `bash`（或 `sh`）以避免不相容 fish 的腳本，如果這兩者都不存在，則回退到 `SHELL`。
- 在 Windows 主機上，exec 偏好 PowerShell 7 (`pwsh`) 探索（Program Files、ProgramW6432，然後是 PATH），
  然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二進位劫持或注入程式碼。
- OpenClaw 在產生的指令環境中（包括 PTY 和沙盒執行）設定 `OPENCLAW_SHELL=exec`，以便 shell/profile 規則可以偵測 exec-tool 上下文。
- `openclaw channels login` 在 `exec` 中被阻止，因為它是一個互動式通道驗證流程；請在閘道主機上的終端機中執行它，或在聊天中使用通道原生的登入工具（如果有的話）。
- 重要：沙箱機制**預設關閉**。如果沙箱機制關閉，隱含的 `host=auto`
  會解析為 `gateway`。顯式的 `host=sandbox` 仍然會失敗關閉，而不是在閘道主機上無聲執行。
  請啟用沙箱機制或使用帶有審批的 `host=gateway`。
- 腳本預檢檢查（針對常見的 Python/Node shell 語法錯誤）僅會檢查有效 `workdir` 邊界內的檔案。
  如果腳本路徑解析到 `workdir` 之外，則會跳過該檔案的預檢。
- 對於現在開始的長時間執行工作，請啟動一次並在啟用且指令發出輸出或失敗時依賴自動完成喚醒。
  使用 `process` 來查看記錄、狀態、輸入或進行干預；請勿使用 sleep 迴圈、timeout 迴圈或重複輪詢來模擬排程。
- 對於應該稍後發生或按排程執行的工作，請使用 cron 而非 `exec` 的 sleep/delay 模式。

## 設定

- `tools.exec.notifyOnExit` (預設：true)：當為 true 時，背景執行的 exec 會話會將系統事件加入佇列，並在退出時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設：10000)：當需要審批的 exec 執行時間超過此值時，發出單一「執行中」通知 (0 表示停用)。
- `tools.exec.timeoutSec` (預設：1800)：每個指令的預設 exec 逾時時間（秒）。單次呼叫的 `timeout` 會覆蓋此設定；單次呼叫的 `timeout: 0` 則會停用 exec 程序逾時。
- `tools.exec.host` (預設：`auto`；當沙箱執行環境啟用時解析為 `sandbox`，否則解析為 `gateway`)
- `tools.exec.security` (預設：沙箱為 `deny`，若未設定則 gateway + node 為 `full`)
- `tools.exec.ask` (預設：`off`)
- 對於 gateway + node，無需批准的主機執行是預設行為。如果您想要批准/允許清單行為，請同時加強 `tools.exec.*` 和主機 `~/.openclaw/exec-approvals.json`；請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals#yolo-mode-no-approval)。
- YOLO 來自主機策略預設值 (`security=full`, `ask=off`)，而非來自 `host=auto`。如果您想要強制 gateway 或 node 路由，請設定 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加上 `ask=off` 模式下，主機執行直接遵循設定的策略；沒有額外的啟發式命令混淆預過濾器或腳本預飛行拒絕層。
- `tools.exec.node` (預設：未設定)
- `tools.exec.strictInlineEval` (預設：false)：當設為 true 時，諸如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e` 等內嵌直譯器 eval 形式始終需要明確批准。`allow-always` 仍然可以持續保留良性的直譯器/腳本調用，但內嵌 eval 形式每次仍會提示。
- `tools.exec.pathPrepend`：要預先加入到 `PATH` 以用於執行運作的目錄列表 (僅限 gateway + sandbox)。
- `tools.exec.safeBins`：僅 stdin 的安全二進位檔，無需明確的允許清單條目即可執行。有關行為的詳細資訊，請參閱 [Safe bins](/zh-Hant/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用於 `safeBins` 路徑檢查的額外明確受信任目錄。`PATH` 條目絕不會自動受信任。內建預設值為 `/bin` 和 `/usr/bin`。
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

- `host=gateway`: 將您的 login-shell `PATH` 合併到 exec 環境中。針對主機執行，會拒絕 `env.PATH` 覆寫。守護程式本身仍以最少的 `PATH` 執行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: 在容器內執行 `sh -lc` (login shell)，因此 `/etc/profile` 可能會重設 `PATH`。
  OpenClaw 會在讀取設定檔 (profile sourcing) 後，透過內部環境變數（無 shell 插值）預先加上 `env.PATH`；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`: 只有您傳遞的未被封鎖的環境變數覆寫會被傳送到節點。針對主機執行會拒絕 `env.PATH` 覆寫，且節點主機會忽略它們。如果您在節點上需要額外的 PATH 項目，
  請設定節點主機服務環境 (systemd/launchd) 或將工具安裝在標準位置。

Per-agent node binding (使用 config 中的 agent list index)：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI：Nodes 標籤包含一個小型的「Exec node binding」面板，用於相同的設定。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **per-session** 預設值。
傳送不帶參數的 `/exec` 以顯示當前值。

範例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對 **authorized senders** (channel allowlists/pairing 加上 `commands.useAccessGroups`) 有效。
它僅更新 **session state** 且不寫入設定檔。若要徹底停用 exec，請透過 tool policy (`tools.deny: ["exec"]` 或 per-agent) 拒絕。除非您明確設定
`security=full` 和 `ask=off`，否則主機核准仍然適用。

## Exec 審核（夥伴應用程式 / 節點主機）

沙箱化代理程式可以在 `exec` 斷閘道或節點主機上執行之前要求每次請求都經過審核。
請參閱 [Exec 審核](/zh-Hant/tools/exec-approvals) 以了解政策、允許清單和 UI 流程。

當需要審核時，exec 工具會立即傳回
`status: "approval-pending"` 和一個審核 ID。一旦審核通過（或被拒絕 / 逾時），
閘道會發出系統事件（`Exec finished` / `Exec denied`）。如果指令在 `tools.exec.approvalRunningNoticeMs` 後仍在執行，
則會發出單一 `Exec running` 通知。
在具有原生審核卡/按鈕的頻道上，代理程式應優先依賴該
原生 UI，並且僅在工具結果明確指出聊天審核不可用或手動審核是
唯一途徑時，才包含手動 `/approve` 指令。

## 允許清單 + 安全 bins

手動允許清單強制執行會比對已解析的二進位路徑萬用字元和純指令名稱
萬用字元。純名稱僅比對透過 PATH 呼叫的指令，因此當指令是 `rg` 時，`rg` 可以比對
`/opt/homebrew/bin/rg`，但無法比對 `./rg` 或 `/tmp/rg`。
當 `security=allowlist` 時，只有在每個管線
區段都在允許清單中或是安全 bin 時，Shell 指令才會自動允許。在允許清單模式下，鏈結（`;`、`&&`、`||`）和重新導向
會被拒絕，除非每個頂層區段都符合
允許清單（包括安全 bins）。重新導持續不受支援。
持續的 `allow-always` 信任無法繞過該規則：鏈結指令仍然要求每個
頂層區段都符合。

`autoAllowSkills` 是 exec 審核中的一個單獨便利路徑。它與
手動路徑允許清單項目不同。若要嚴格明確信任，請將 `autoAllowSkills` 設為停用。

使用這兩個控制項來處理不同的工作：

- `tools.exec.safeBins`：小型、僅限 stdin 的串流過濾器。
- `tools.exec.safeBinTrustedDirs`：針對安全 bin 可執行檔路徑的明確額外信任目錄。
- `tools.exec.safeBinProfiles`：自訂安全 bin 的明確 argv 策略。
- allowlist：對可執行路徑的明確信任。

請勿將 `safeBins` 視為通用允許清單，且不要新增直譯器/執行期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要這些，請使用明確的允許清單項目並保持批准提示已啟用。
`openclaw security audit` 會在直譯器/執行期 `safeBins` 項目缺少明確設定檔時發出警告，而 `openclaw doctor --fix` 可以產生遺失的自訂 `safeBinProfiles` 項目。
`openclaw security audit` 和 `openclaw doctor` 也會在您明確將行為廣泛的 bin（例如 `jq`）新增回 `safeBins` 時發出警告。
如果您明確允許直譯器，請啟用 `tools.exec.strictInlineEval`，這樣內聯程式碼評估表單仍然需要新的批准。

如需完整的策略詳細資訊和範例，請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/zh-Hant/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

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

輪詢是為了按需狀態，而非等待迴圈。如果啟用了自動完成喚醒，指令可以在發出輸出或失敗時喚醒工作階段。

傳送按鍵（tmux 風格）：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交（僅傳送 CR）：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

貼上（預設使用括號）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的子工具，用於結構化多檔案編輯。
它預設對 OpenAI 和 OpenAI Codex 模型啟用。僅在您想要停用它或將其限制為特定模型時才使用設定：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

注意：

- 僅適用於 OpenAI/OpenAI Codex 模型。
- 工具策略仍然適用；`allow: ["write"]` 隱含地允許 `apply_patch`。
- `deny: ["write"]` 不會拒絕 `apply_patch`；當也應該封鎖補丁寫入時，請明確拒絕 `apply_patch` 或使用 `deny: ["group:fs"]`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.enabled` 預設為 `true`；將其設定為 `false` 即可為 OpenAI 模型停用此工具。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true` (僅限工作區內)。僅當您有意讓 `apply_patch` 在工作區目錄之外進行寫入/刪除時，才將其設定為 `false`。

## 相關

- [Exec Approvals](/zh-Hant/tools/exec-approvals) — Shell 指令的審核閘門
- [Sandboxing](/zh-Hant/gateway/sandboxing) — 在沙箱環境中執行指令
- [Background Process](/zh-Hant/gateway/background-process) — 長時間執行的 exec 和 process 工具
- [Security](/zh-Hant/gateway/security) — 工具原則與提升存取權限
