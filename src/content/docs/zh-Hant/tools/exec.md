---
summary: "Exec tool usage, stdin modes, and TTY support"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec tool"
---

在工作區中執行 Shell 指令。支援透過 `process` 進行前景與背景執行。
如果不允許 `process`，`exec` 將同步執行並忽略 `yieldMs`/`background`。
背景工作階段是以代理程式為範圍；`process` 只能看到來自相同代理程式的工作階段。

## 參數

<ParamField path="command" type="string" required>
  要執行的 Shell 指令。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  指令的工作目錄。
</ParamField>

<ParamField path="env" type="object">
  鍵/值環境變數覆寫，合併於繼承的環境之上。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  在此延遲（毫秒）後自動將指令置於背景執行。
</ParamField>

<ParamField path="background" type="boolean" default="false">
  立即將指令置於背景執行，而不是等待 `yieldMs`。
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
  覆寫此呼叫的已設定 exec 逾時時間。僅當指令應該在沒有 exec 程序逾時的情況下執行時，才設定 `timeout: 0`。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  在可用時於虛擬終端機中執行。用於僅限 TTY 的 CLI、編碼代理程式和終端機 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  執行位置。當沙盒執行時期處於作用中時，`auto` 解析為 `sandbox`，否則為 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  針對 `gateway` / `node` 執行的強制模式。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  針對 `gateway` / `node` 執行的核准提示行為。
</ParamField>

<ParamField path="node" type="string">
  當 `host=node` 時的節點 ID/名稱。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  請求提升權限模式 — 脫離沙盒進入已配置的主機路徑。僅當提升權限解析為 `full` 時，才會強制執行 `security=full`。
</ParamField>

備註：

- `host` 預設為 `auto`：若該工作階段啟用了沙盒執行時則為沙盒，否則為 gateway。
- `auto` 是預設的路由策略，而非萬用字元。允許來自 `auto` 的單次呼叫 `host=node`；僅當未啟用沙盒執行時才允許單次呼叫 `host=gateway`。
- 在沒有額外設定的情況下，`host=auto` 仍然「正常運作」：沒有沙盒表示它會解析為 `gateway`；有執行中的沙盒表示它會停留在沙盒內。
- `elevated` 會脫離沙盒進入已配置的主機路徑：預設為 `gateway`，當 `tools.exec.host=node` 時（或工作階段預設為 `host=node`）則為 `node`。僅當目前的工作階段/提供者啟用提升權限存取時才可使用。
- `gateway`/`node` 的核准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配對的節點（伴隨應用程式或無頭節點主機）。
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 以選擇其中一個。
- `exec host=node` 是節點唯一的 shell 執行路徑；舊版的 `nodes.run` 包裝器已被移除。
- `timeout` 適用於前景、背景、`yieldMs`、閘道、沙箱和節點 `system.run` 執行。如果省略，OpenClaw 使用 `tools.exec.timeoutSec`；明確指定 `timeout: 0` 則會停用該呼叫的 exec 程序逾時。
- 在非 Windows 主機上，如果設定了 exec，則會使用 `SHELL`；如果 `SHELL` 是 `fish`，它會優先從 `PATH` 選擇 `bash` (或 `sh`) 以避免與不相容的腳本，如果兩者都不存在，則回退到 `SHELL`。
- 在 Windows 主機上，exec 偏好 PowerShell 7 (`pwsh`) 探索 (Program Files、ProgramW6432，然後是 PATH)，
  然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二元劫持或注入程式碼。
- OpenClaw 在產生的指令環境中設定 `OPENCLAW_SHELL=exec` (包括 PTY 和沙箱執行)，以便 shell/profile 規則可以偵測 exec-tool 上下文。
- 重要：沙箱功能 **預設關閉**。如果沙箱功能關閉，隱含的 `host=auto`
  會解析為 `gateway`。明確的 `host=sandbox` 仍然會以失敗收場，而不是在閘道主機上靜默
  執行。請啟用沙箱功能或使用 `host=gateway` 搭配核准。
- 腳本飛行前檢查 (針對常見的 Python/Node shell 語法錯誤) 僅會檢查有效
  `workdir` 邊界內的檔案。如果腳本路徑解析到 `workdir` 之外，則會跳過該檔案的飛行前檢查。
- 對於現在開始的長時間工作，請啟動一次並在啟用且命令輸出或失敗時依賴自動完成喚醒。使用 `process` 來查看日誌、狀態、輸入或進行干預；請勿使用 sleep 迴圈、timeout 迴圈或重複輪詢來模擬排程。
- 對於稍後應該發生或按排程執行的工作，請使用 cron 代替 `exec` sleep/delay 模式。

## 組態

- `tools.exec.notifyOnExit` (預設值：true)：當為 true 時，後台執行的 exec 會話會將系統事件加入佇列，並在退出時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設值：10000)：當需要批准的 exec 執行時間超過此值時，發出單個「running」通知（設為 0 則停用）。
- `tools.exec.timeoutSec` (預設值：1800)：預設的每個指令執行逾時時間（秒）。每次呼叫的 `timeout` 會覆蓋此設定；每次呼叫的 `timeout: 0` 會停用 exec 程序逾時。
- `tools.exec.host` (預設值：`auto`；當沙盒運行時啟用時解析為 `sandbox`，否則解析為 `gateway`)
- `tools.exec.security` (預設值：沙盒為 `deny`，若未設定則 gateway + node 為 `full`)
- `tools.exec.ask` (預設值：`off`)
- 無需批准的主機執行是 gateway + node 的預設設定。如果您想要批准/許可清單行為，請同時收緊 `tools.exec.*` 和主機 `~/.openclaw/exec-approvals.json`；請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals#no-approval-yolo-mode)。
- YOLO 來自主機策略預設值 (`security=full`, `ask=off`)，而非來自 `host=auto`。如果您想要強制使用 gateway 或 node 路由，請設定 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加上 `ask=off` 模式下，主機執行會直接遵循設定的策略；沒有額外的啟發式指令混淆預先過濾器或腳本預檢拒絕層。
- `tools.exec.node` (預設值：未設定)
- `tools.exec.strictInlineEval` (預設值：false)：當設為 true 時，內聯直譯器求值形式，如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`，始終需要明確批准。`allow-always` 仍可保留良性直譯器/腳本的調用，但內聯求值形式每次仍會提示。
- `tools.exec.pathPrepend`：在 exec 執行（僅限 gateway + sandbox）中要預先加入到 `PATH` 的目錄列表。
- `tools.exec.safeBins`：僅 stdin 的安全二進位檔，無需明確允許列表條目即可運行。有關行為細節，請參閱[安全二進位檔](/zh-Hant/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用於 `safeBins` 路徑檢查的其他受信任明確目錄。`PATH` 條目絕不會自動受信任。內建預設值為 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每個安全 bin 的可選自訂 argv 原則（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

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

- `host=gateway`：將您的 login-shell `PATH` 合併到 exec 環境中。對於主機執行，會拒絕
  `env.PATH` 覆蓋。守護程式本身仍以最少的 `PATH` 運行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器內執行 `sh -lc`（登入 shell），因此 `/etc/profile` 可能會重設 `PATH`。
  OpenClaw 透過內部環境變數（無 shell 插值）在載入 profile 後預置 `env.PATH`；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`：只有您傳遞的非被封鎖的環境變數覆寫會被傳送到節點。`env.PATH` 覆寫會
  在主機執行時被拒絕，並被節點主機忽略。如果您在節點上需要額外的 PATH 條目，
  請設定節點主機服務環境（systemd/launchd）或在標準位置安裝工具。

Per-agent node binding（使用 config 中的 agent list index）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI：Nodes 分頁包含一個用於相同設定的小型「Exec node binding」面板。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **每個階段** 預設值。
傳送不帶任何參數的 `/exec` 以顯示目前的數值。

範例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對 **已授權的發送者**（channel allowlists/pairing 加上 `commands.useAccessGroups`）有效。
它只會更新 **session state**，不會寫入 config。若要完全停用 exec，請透過 tool
policy（`tools.deny: ["exec"]` 或 per-agent）拒絕它。除非您明確設定
`security=full` 和 `ask=off`，否則主機核准仍然適用。

## Exec approvals (companion app / node host)

沙盒化 agent 可能需要在 `exec` 於 gateway 或 node host 上執行前要求每次請求的核准。
請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals) 以了解 policy、allowlist 和 UI 流程。

當需要審核時，exec 工具會立即傳回
`status: "approval-pending"` 和一個審核 ID。一旦審核通過（或被拒絕/逾時），
Gateway 會發出系統事件（`Exec finished` / `Exec denied`）。如果指令在
`tools.exec.approvalRunningNoticeMs` 後仍在執行，則會發出單一 `Exec running` 通知。
在具有原生審核卡片/按鈕的頻道上，Agent 應優先依賴該
原生 UI，並且僅在工具結果明確指出聊天審核不可用，或手動審核是
唯一途徑時，才包含手動 `/approve` 指令。

## 允許清單 + 安全 bins

手動執行允許清單強制措施會比對解析後的二進位路徑 glob 模式和純指令名稱
glob 模式。純名稱僅比對透過 PATH 呼叫的指令，因此當指令是 `rg` 時，`rg` 可以比對
`/opt/homebrew/bin/rg`，但無法比對 `./rg` 或 `/tmp/rg`。
當 `security=allowlist` 時，Shell 指令只有在每個管線
區段都在允許清單中或是安全 bin 時才會自動允許。鏈結（`;`、`&&`、`||`）和重導向
在允許清單模式下會被拒絕，除非每個頂層區段都符合
允許清單（包括安全 bins）。重導向仍然不受支援。
持久的 `allow-always` 信任無法繞過該規則：鏈結指令仍然要求每個
頂層區段都符合。

`autoAllowSkills` 是 exec 審核中一個單獨的便利路徑。它與
手動路徑允許清單項目不同。若要嚴格明確地建立信任，請將 `autoAllowSkills` 停用。

使用這兩個控制項來處理不同的工作：

- `tools.exec.safeBins`：小型、僅 stdin 的串流過濾器。
- `tools.exec.safeBinTrustedDirs`：安全 bin 可執行檔路徑的明確額外信任目錄。
- `tools.exec.safeBinProfiles`：自訂安全 bin 的明確 argv 政策。
- allowlist：可執行檔路徑的明確信任。

不要將 `safeBins` 視為通用允許清單，也不要加入解譯器/執行期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要這些功能，請使用明確的允許清單項目，並保持核准提示啟用。
當解譯器/執行期 `safeBins` 項目缺少明確的設定檔時，`openclaw security audit` 會發出警告，而 `openclaw doctor --fix` 可以建立缺少的自訂 `safeBinProfiles` 項目。
當您明確將行為廣泛的二進位檔（例如 `jq`）重新加入 `safeBins` 時，`openclaw security audit` 和 `openclaw doctor` 也會發出警告。
如果您明確允許解譯器，請啟用 `tools.exec.strictInlineEval`，這樣內嵌程式碼評估表單仍然需要新的核准。

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

輪詢是用於按需狀態，而非等待迴圈。如果啟用了自動完成喚醒，當指令輸出內容或失敗時，可以喚醒工作階段。

傳送按鍵 (tmux 風格)：

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

`apply_patch` 是 `exec` 的一個子工具，用於結構化的多檔案編輯。
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

注意：

- 僅適用於 OpenAI/OpenAI Codex 模型。
- 工具策略仍然適用；`allow: ["write"]` 隱含地允許 `apply_patch`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.enabled` 預設為 `true`；將其設定為 `false` 即可對 OpenAI 模型停用此工具。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true`（限於工作區）。僅當您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

## 相關

- [Exec Approvals](/zh-Hant/tools/exec-approvals) — Shell 指令的審批閘門
- [Sandboxing](/zh-Hant/gateway/sandboxing) — 在沙盒環境中執行指令
- [Background Process](/zh-Hant/gateway/background-process) — 長時間執行的 exec 和 process 工具
- [Security](/zh-Hant/gateway/security) — 工具策略與提升存取權限
