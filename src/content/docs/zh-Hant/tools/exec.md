---
summary: "Exec tool usage, stdin modes, and TTY support"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec Tool"
---

# Exec tool

Run shell commands in the workspace. Supports foreground + background execution via `process`.
If `process` is disallowed, `exec` runs synchronously and ignores `yieldMs`/`background`.
Background sessions are scoped per agent; `process` only sees sessions from the same agent.

## Parameters

- `command` (required)
- `workdir` (defaults to cwd)
- `env` (key/value overrides)
- `yieldMs` (default 10000): auto-background after delay
- `background` (bool): background immediately
- `timeout` (seconds, default 1800): kill on expiry
- `pty` (bool): run in a pseudo-terminal when available (TTY-only CLIs, coding agents, terminal UIs)
- `host` (`auto | sandbox | gateway | node`): 在何處執行
- `security` (`deny | allowlist | full`): enforcement mode for `gateway`/`node`
- `ask` (`off | on-miss | always`): approval prompts for `gateway`/`node`
- `node` (string): node id/name for `host=node`
- `elevated` (bool)：請求提升權限模式（逃離沙箱至設定的主機路徑）；僅當提升權限解析為 `full` 時，才會強制執行 `security=full`

Notes:

- `host` 預設為 `auto`：若工作階段啟用沙箱執行環境則使用沙箱，否則使用閘道。
- `auto` 是預設的路由策略，而非萬用字元。允許從 `auto` 進行每次呼叫的 `host=node`；僅當沒有啟用沙箱執行環境時，才允許每次呼叫的 `host=gateway`。
- 在沒有額外設定的情況下，`host=auto` 仍然「正常運作」：沒有沙箱意味著它解析為 `gateway`；有運作中的沙箱則意味著它停留在沙箱中。
- `elevated` 會逃離沙箱至設定的主機路徑：預設為 `gateway`，當 `tools.exec.host=node`（或會話預設值為 `host=node`）時則為 `node`。僅當目前會話/提供者啟用了提升權限存取時才可使用。
- `gateway`/`node` 的核准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配對的節點（伴隨應用程式或無頭節點主機）。
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 以選擇其中一個。
- `exec host=node` 是節點唯一的 shell 執行路徑；舊版的 `nodes.run` 包裝器已被移除。
- 在非 Windows 主機上，exec 會在設定了 `SHELL` 時使用它；如果 `SHELL` 是 `fish`，它會偏好 `bash`（或 `sh`）
  來自 `PATH` 以避免不相容 fish 的腳本，如果都不存在則退回至 `SHELL`。
- 在 Windows 主機上，exec 偏好 PowerShell 7 (`pwsh`) 探索（Program Files、ProgramW6432，然後是 PATH），
  然後退回至 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二進位劫持或注入程式碼。
- OpenClaw 在生成的指令環境（包括 PTY 和沙箱執行）中設定 `OPENCLAW_SHELL=exec`，以便 shell/設定檔規則可以偵測 exec-tool 上下文。
- 重要：沙箱預設為**關閉**。如果關閉沙箱，隱含的 `host=auto`
  會解析為 `gateway`。明確的 `host=sandbox` 仍會失敗關閉，而不是
  在閘道主機上靜默執行。請啟用沙箱或使用帶有批准的 `host=gateway`。
- 指令碼預檢檢查（針對常見的 Python/Node shell 語法錯誤）僅會檢查有效 `workdir` 邊界內的檔案。
  如果指令碼路徑解析到 `workdir` 之外，則會跳過該檔案的預檢。
- 對於從現在開始的長時間執行工作，請啟動一次，並在啟用且指令發出輸出或失敗時依賴自動
  完成喚醒。使用 `process` 查看日誌、狀態、輸入或進行干預；請勿使用 sleep 迴圈、
  timeout 迴圈或重複輪詢來模擬排程。
- 對於應該稍後發生或按排程進行的工作，請使用 cron 而非
  `exec` sleep/delay 模式。

## 組態

- `tools.exec.notifyOnExit` (預設值：true)：當為 true 時，後台執行階段會將系統事件加入佇列，並在退出時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設值：10000)：當需要批准的執行時間超過此值時，發出單一「執行中」通知（設為 0 則停用）。
- `tools.exec.host` (預設值：`auto`；當沙箱執行環境啟用時解析為 `sandbox`，否則為 `gateway`)
- `tools.exec.security` (預設值：若未設定，沙箱為 `deny`，閘道 + 節點為 `full`)
- `tools.exec.ask` (預設值：`off`)
- No-approval host exec 是 gateway + node 的預設值。如果您想要批准/允許清單行為，請同時收緊 `tools.exec.*` 和主機 `~/.openclaw/exec-approvals.json`；請參閱 [Exec approvals](/en/tools/exec-approvals#no-approval-yolo-mode)。
- YOLO 來自主機原則預設值 (`security=full`, `ask=off`)，而非來自 `host=auto`。如果您想要強制 gateway 或 node 路由，請設定 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加上 `ask=off` 模式下，host exec 會直接遵循設定的原則；沒有額外的啟發式命令混淆前過濾器。
- `tools.exec.node` (預設：未設定)
- `tools.exec.strictInlineEval` (預設：false)：當為 true 時，內嵌直譯器 eval 表單，例如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`，總是需要明確批准。`allow-always` 仍可持續執行良性直譯器/腳本調用，但內嵌 eval 表單每次仍會提示。
- `tools.exec.pathPrepend`：要預先加入 `PATH` 以供 exec 執行的目錄清單 (僅限 gateway + sandbox)。
- `tools.exec.safeBins`：僅 stdin 的安全二進位檔，可在沒有明確允許清單項目的情況下執行。有關行為的詳細資訊，請參閱 [Safe bins](/en/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用於 `safeBins` 路徑檢查的其他額外明確受信任目錄。`PATH` 項目絕不會自動受信任。內建預設值為 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每個安全 bin 的可選自訂 argv 原則 (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`)。

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

- `host=gateway`: 將您的登入 shell `PATH` 合併到 exec 環境中。`env.PATH` 覆寫值
  會被主機執行拒絕。守護程式本身仍以最小 `PATH` 執行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: 在容器內執行 `sh -lc` (登入 shell)，因此 `/etc/profile` 可能會重置 `PATH`。
  OpenClaw 在載入 profile 後透過內部環境變數 (無 shell 插值) 前置加入 `env.PATH`；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`: 只有您傳遞的非受阻擋環境覆寫會被傳送到節點。`env.PATH` 覆寫值
  會被主機執行拒絕，並被節點主機忽略。如果您在節點上需要額外的 PATH 項目，
  請設定節點主機服務環境 (systemd/launchd) 或將工具安裝在標準位置。

每個代理的節點綁定 (使用設定中的代理列表索引)：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI: Nodes 分頁包含一個小型的「Exec node binding」面板，用於相同的設定。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **每個 session** 預設值。
傳送不帶任何引數的 `/exec` 以顯示目前的值。

範例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對 **已授權的發送者** (通道允許清單/配對加上 `commands.useAccessGroups`) 有效。
它僅更新 **session 狀態** 且不會寫入設定。若要完全停用 exec，請透過工具
原則 (`tools.deny: ["exec"]` 或每個代理) 拒絕它。除非您明確設定
`security=full` 和 `ask=off`，否則主機批准仍然適用。

## Exec 核准（伴隨應用程式 / 節點主機）

沙箱化代理程式可以要求在 `exec` 斷層或節點主機上執行前，對每個請求進行核准。
請參閱 [Exec 核准](/en/tools/exec-approvals) 以了解政策、允許清單和 UI 流程。

當需要核准時，exec 工具會立即傳回
`status: "approval-pending"` 和一個核准 ID。一旦核准（或拒絕 / 逾時），
斷層會發出系統事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 後仍在執行，則會發出單一 `Exec running` 通知。
在具有原生核准卡/按鈕的頻道上，代理程式應優先依賴
該原生 UI，並且僅在工具
結果明確指出聊天核准不可用或手動核准是
唯一途徑時，才包含手動 `/approve` 命令。

## 允許清單 + 安全 binaries

手動允許清單強制執行僅比對 **解析後的二進位路徑**（不比對基本名稱）。當
`security=allowlist` 時，僅當每個管線區段都
在允許清單中或是安全 bin 時，Shell 命令才會自動被允許。鏈結（`;`、`&&`、`||`）和重新導向在
允許清單模式下會被拒絕，除非每個頂層區段都滿足允許清單（包括安全 bins）。
重新導持續不受支援。
持久的 `allow-always` 信任無法繞過該規則：鏈結命令仍要求每個
頂層區段都符合。

`autoAllowSkills` 是 exec 核准中一條獨立的便利路徑。它與
手動路徑允許清單項目不同。若要嚴格執行明確信任，請將 `autoAllowSkills` 保持停用。

使用這兩個控制項來處理不同的工作：

- `tools.exec.safeBins`：小型、僅 stdin 的串流過濾器。
- `tools.exec.safeBinTrustedDirs`：針對安全 bin 可執行路徑的明確額外信任目錄。
- `tools.exec.safeBinProfiles`：針對自訂安全 bin 的明確 argv 政策。
- allowlist：針對可執行路徑的明確信任。

不要將 `safeBins` 視為通用允許清單，也不要新增解釋器/執行時期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要這些，請使用明確的允許清單項目並保持批准提示已啟用。
當解釋器/執行時期 `safeBins` 項目缺少明確的設定檔時，`openclaw security audit` 會發出警告，而 `openclaw doctor --fix` 可以建構遺失的自訂 `safeBinProfiles` 項目。
當您明確將行為廣泛的二進位檔（例如 `jq`）加回 `safeBins` 時，`openclaw security audit` 和 `openclaw doctor` 也會發出警告。
如果您明確將解釋器列入允許清單，請啟用 `tools.exec.strictInlineEval`，以便內聯程式碼評估表單仍需要新的批准。

如需完整的政策詳細資訊和範例，請參閱 [Exec approvals](/en/tools/exec-approvals#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/en/tools/exec-approvals#safe-bins-versus-allowlist)。

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

輪詢是為了按需狀態，而不是用於等待迴圈。如果啟用了自動完成喚醒，當指令輸出內容或失敗時，它可以喚醒工作階段。

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

貼上（預設加上括號）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的子工具，用於結構化多檔案編輯。
它預設針對 OpenAI 和 OpenAI Codex 模型已啟用。僅在您想要停用它或將其限制為特定模型時才使用設定：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.4"] },
    },
  },
}
```

備註：

- 僅適用於 OpenAI/OpenAI Codex 模型。
- 工具政策仍然適用；`allow: ["write"]` 隱含地允許 `apply_patch`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.enabled` 預設為 `true`；將其設定為 `false` 以停用 OpenAI 模型的此工具。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true`（限於工作區內）。僅當您有意讓 `apply_patch` 在工作區目錄之外進行寫入/刪除操作時，才將其設定為 `false`。

## 相關

- [Exec Approvals](/en/tools/exec-approvals) — 殼層指令的核准閘門
- [Sandboxing](/en/gateway/sandboxing) — 在沙盒環境中執行指令
- [Background Process](/en/gateway/background-process) — 長時間執行的 exec 和 process 工具
- [Security](/en/gateway/security) — 工具政策和提升存取權限
