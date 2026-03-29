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
- `host` (`sandbox | gateway | node`): where to execute
- `security` (`deny | allowlist | full`): enforcement mode for `gateway`/`node`
- `ask` (`off | on-miss | always`): approval prompts for `gateway`/`node`
- `node` (string): node id/name for `host=node`
- `elevated` (bool): request elevated mode (gateway host); `security=full` is only forced when elevated resolves to `full`

Notes:

- `host` defaults to `sandbox`.
- `elevated` is ignored when sandboxing is off (exec already runs on the host).
- `gateway`/`node` approvals are controlled by `~/.openclaw/exec-approvals.json`.
- `node` requires a paired node (companion app or headless node host).
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 來選擇其中一個。
- 在非 Windows 主機上，若設定 `SHELL` 則 exec 會使用它；如果 `SHELL` 是 `fish`，它會偏好使用 `PATH` 中的 `bash` (或 `sh`) 以避免與不相容的 shell 腳本衝突，如果兩者都不存在則回退到 `SHELL`。
- 在 Windows 主機上，exec 偏好探索 PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, 然後是 PATH)，
  然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二進位檔劫持或程式碼注入。
- OpenClaw 在產生的命令環境中 (包括 PTY 和沙箱執行) 設定 `OPENCLAW_SHELL=exec`，以便 shell/設定檔規則可以偵測 exec-tool 的上下文。
- 重要提示：沙箱預設為**關閉**。如果沙箱已關閉且明確
  配置/請求了 `host=sandbox`，exec 現在將會封閉式失敗，而不是在閘道主機上無聲執行。
  請啟用沙箱或使用帶有核准的 `host=gateway`。
- 腳本預檢查 (針對常見的 Python/Node shell 語法錯誤) 僅會檢查
  有效 `workdir` 邊界內的檔案。如果腳本路徑解析到 `workdir` 之外，則會跳過該檔案的預檢。

## 設定

- `tools.exec.notifyOnExit` (預設: true)：當為 true 時，後台 exec 會話會將系統事件加入佇列，並在退出時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設: 10000)：當受核准的 exec 執行時間超過此值時，發出單個「running」通知 (0 表示停用)。
- `tools.exec.host` (預設: `sandbox`)
- `tools.exec.security` (預設: 沙箱為 `deny`，未設定時閘道 + 節點為 `allowlist`)
- `tools.exec.ask` (預設: `on-miss`)
- `tools.exec.node` (預設值：未設定)
- `tools.exec.strictInlineEval` (預設值：false)：當為 true 時，內嵌直譯器 eval 表單（例如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`）始終需要明確批准，且永不會由 `allow-always` 持久化。
- `tools.exec.pathPrepend`：要為執行預先加到 `PATH` 的目錄清單（僅限 gateway + sandbox）。
- `tools.exec.safeBins`：可在無需明確允許清單項目的情況下執行的僅 stdin 安全二進位檔。行為詳情請參閱 [安全 bins](/en/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：針對 `safeBins` 路徑檢查所信任的額外明確目錄。`PATH` 項目永遠不會自動被信任。內建預設值為 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每個安全 bin 的選用自訂 argv 原則 (`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`)。

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

- `host=gateway`：將您的登入 shell `PATH` 合併到執行環境中。主機執行會拒絕
  `env.PATH` 覆寫。守護程式本身仍以最少的 `PATH` 執行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器內執行 `sh -lc` (登入 shell)，因此 `/etc/profile` 可能會重設 `PATH`。
  OpenClaw 透過內部環境變數在載入設定檔後預先加 `env.PATH` (無 shell 插值)；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`：只有您傳遞的非被阻擋的環境覆寫會被發送到節點。`env.PATH` 覆寫會因主機執行而被拒絕，並被節點主機忽略。如果您在節點上需要額外的 PATH 條目，請配置節點主機服務環境 (systemd/launchd) 或將工具安裝在標準位置。

個別代理程式節點綁定 (使用設定中的代理程式清單索引)：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：「Nodes」分頁包含一個小型的「Exec node binding」面板，用於相同設定。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **per-session** 預設值。
傳送不帶參數的 `/exec` 以顯示目前的數值。

範例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對 **已授權的傳送者** (頻道允許清單/配對加上 `commands.useAccessGroups`) 有效。
它只會更新 **session state**，不會寫入設定。若要完全停用 exec，請透過工具政策 (`tools.deny: ["exec"]` 或每個代理程式) 拒絕它。除非您明確設定
`security=full` 和 `ask=off`，否則主機核准仍然適用。

## Exec 核准 (companion app / node host)

沙盒化的代理程式可能需要在 `exec` 斂道或節點主機上執行前要求每次請求的核准。
請參閱 [Exec核准](/en/tools/exec-approvals) 以了解政策、允許清單和 UI 流程。

當需要核准時，exec 工具會立即傳回
`status: "approval-pending"` 和一個核准 ID。一旦核准 (或被拒絕/逾時)，
敛道會發出系統事件 (`Exec finished` / `Exec denied`)。如果在 `tools.exec.approvalRunningNoticeMs` 之後指令仍在執行，則會發出單一 `Exec running` 通知。

## Allowlist + safe bins

手動執行清單強制執行僅比對**解析後的二進位路徑**（不進行基礎名稱比對）。當
`security=allowlist` 時，只有當每個管線區段都位於
執行清單或是安全 bin 時，shell 指令才會被自動允許。鏈結（`;`、`&&`、`||`）和重新導向在
執行清單模式中會被拒絕，除非每個頂層區段都符合執行清單（包括安全 bin）。
重新導向仍不受支援。

`autoAllowSkills` 是 exec 核准中的一個獨立捷徑設定。它與
手動路徑執行清單項目並不相同。若要嚴格明確指定信任項目，請保持 `autoAllowSkills` 為停用。

使用這兩項控制設定來處理不同的工作：

- `tools.exec.safeBins`：小型、僅 stdin 的串流過濾器。
- `tools.exec.safeBinTrustedDirs`：針對安全 bin 可執行檔路徑的額外明確信任目錄。
- `tools.exec.safeBinProfiles`：針對自訂安全 bin 的明確 argv 原則。
- allowlist：針對可執行路徑的明確信任。

請勿將 `safeBins` 視為通用執行清單，且勿新增解釋器/執行期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要使用這些，請使用明確的執行清單項目並保持核准提示為啟用狀態。
當解釋器/執行期的 `safeBins` 項目缺少明確的設定檔時，`openclaw security audit` 會發出警告，而 `openclaw doctor --fix` 可以自動建立缺少的自訂 `safeBinProfiles` 項目。
當您明確將行為廣泛的 bin（例如 `jq`）新增回 `safeBins` 時，`openclaw security audit` 和 `openclaw doctor` 也會發出警告。
如果您明確將解釋器加入執行清單，請啟用 `tools.exec.strictInlineEval`，如此一來，內嵌程式碼評估表單仍需要新的核准。

如需完整的原則詳細資訊和範例，請參閱 [Exec approvals](/en/tools/exec-approvals#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/en/tools/exec-approvals#safe-bins-versus-allowlist)。

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

## apply_patch (實驗性)

`apply_patch` 是 `exec` 的子工具，用於結構化的多檔案編輯。
請明確啟用它：

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

備註：

- 僅適用於 OpenAI/OpenAI Codex 模型。
- 工具政策仍然適用；`allow: ["exec"]` 隱含允許 `apply_patch`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true`（限制在工作區內）。僅在您故意希望 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。
