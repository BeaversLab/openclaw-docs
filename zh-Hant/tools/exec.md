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
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 來選擇一個。
- 在非 Windows 主機上，exec 在設定時會使用 `SHELL`；如果 `SHELL` 是 `fish`，它會優先使用 `PATH` 中的 `bash` (或 `sh`) 以避免與 fish 不相容的腳本，如果兩者都不存在則回退到 `SHELL`。
- 在 Windows 主機上，exec 偏好 PowerShell 7 (`pwsh`) 探索 (Program Files, ProgramW6432，然後是 PATH)，
  然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二進位劫持或注入程式碼。
- OpenClaw 在產生的指令環境中設定 `OPENCLAW_SHELL=exec` (包括 PTY 和沙箱執行)，以便 shell/profile 規則可以偵測 exec-tool 上下文。
- 重要：沙箱機制**預設關閉**。如果沙箱關閉且明確
  配置/請求了 `host=sandbox`，exec 現在將會失敗關閉，而不是在閘道主機上無聲執行。
  請啟用沙箱或使用帶有核准的 `host=gateway`。
- 腳本預檢查 (針對常見的 Python/Node shell-syntax 錯誤) 僅會檢查有效
  `workdir` 邊界內的檔案。如果腳本路徑解析到 `workdir` 之外，將跳過該檔案的預檢。

## 設定

- `tools.exec.notifyOnExit` (預設：true)：當為 true 時，後台執行的階段會將系統事件加入佇列並在退出時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設：10000)：當受核准限制的 exec 執行時間超過此值時，發出單一「執行中」通知 (0 則停用)。
- `tools.exec.host` (預設：`sandbox`)
- `tools.exec.security` (預設：沙箱為 `deny`，未設定時閘道 + 節點為 `allowlist`)
- `tools.exec.ask` (預設：`on-miss`)
- `tools.exec.node` (預設值: 未設定)
- `tools.exec.pathPrepend`: 要前置至 `PATH` 的目錄列表，用於執行 exec 執行個體 (僅限 gateway + sandbox)。
- `tools.exec.safeBins`: 僅限 stdin 的安全二進位檔，無需明確的允許清單條目即可執行。如需行為詳情，請參閱 [Safe bins](/zh-Hant/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`: 用於 `safeBins` 路徑檢查的其他明確受信任目錄。`PATH` 條目絕不會自動受信任。內建預設值為 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`: 每個安全 bin 的選用自訂 argv 政策 (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`)。

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

- `host=gateway`: 將您的登入 shell `PATH` 合併至 exec 環境中。`env.PATH` 覆寫設定會
  在主機執行時被拒絕。守護程式本身仍以最少的 `PATH` 執行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: 在容器內執行 `sh -lc` (登入 shell)，因此 `/etc/profile` 可能會重設 `PATH`。
  OpenClaw 會在載入 profile 後透過內部環境變數前置 `env.PATH` (不經 shell 插值)；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`: 只有您傳遞的非封鎖環境變數覆寫會傳送至節點。`env.PATH` 覆寫設定會
  在主機執行時被拒絕，並被節點主機忽略。如果您在節點上需要額外的 PATH 項目，
  請設定節點主機服務環境 (systemd/launchd) 或將工具安裝在標準位置。

每個 Agent 的節點繫結 (使用設定中的 agent 清單索引)：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：Nodes 標籤頁包含一個用於相同設置的小型「Exec node binding」面板。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **每個 session** 預設值。
傳送不帶參數的 `/exec` 以顯示當前值。

範例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對 **已授權的發送者**（通道允許清單/配對加上 `commands.useAccessGroups`）有效。
它僅更新 **session 狀態** 而不寫入配置。若要完全停用 exec，請透過工具
政策（`tools.deny: ["exec"]` 或每個 agent）拒絕它。除非您明確設定
`security=full` 和 `ask=off`，否則主機核准仍然適用。

## Exec approvals (companion app / node host)

沙箱化的 agent 可以要求在 `exec` 斷閘道器或 node host 上運行之前進行每個請求的核准。
請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals) 以了解政策、允許清單和 UI 流程。

當需要核准時，exec 工具會立即傳回
`status: "approval-pending"` 和一個核准 ID。一旦獲得核准（或被拒絕/超時），
閘道器會發出系統事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 之後仍在運行，則會發出單個 `Exec running` 通知。

## Allowlist + safe bins

手動允許清單執行僅匹配 **已解析的二進位路徑**（不匹配基本名稱）。當
`security=allowlist` 時，只有當每個管線區段都
在允許清單中或是 safe bin 時，Shell 命令才會被自動允許。鏈結（`;`、`&&`、`||`）和重定向在
允許清單模式下會被拒絕，除非每個頂層區段都滿足允許清單（包括 safe bins）。
重定向仍然不受支援。

`autoAllowSkills` 是 exec 批准中的一個獨立的便利路徑。它與
手動路徑允許清單條目不同。為了嚴格的明確信任，請保持 `autoAllowSkills` 為停用狀態。

使用這兩個控制項來處理不同的工作：

- `tools.exec.safeBins`：小型、僅 stdin 的串流篩選器。
- `tools.exec.safeBinTrustedDirs`：針對 safe-bin 可執行檔路徑的明確額外受信任目錄。
- `tools.exec.safeBinProfiles`：針對自訂 safe bin 的明確 argv 原則。
- allowlist：針對可執行檔路徑的明確信任。

請勿將 `safeBins` 視為通用允許清單，且不要新增解譯器/執行階段二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要這些，請使用明確的允許清單條目並保持批准提示為啟用狀態。
`openclaw security audit` 會在解譯器/執行階段 `safeBins` 條目缺少明確的設定檔時發出警告，而 `openclaw doctor --fix` 可以為缺少的自訂 `safeBinProfiles` 條目建立基礎架構。

如需完整的原則詳細資料和範例，請參閱 [Exec 批准](/zh-Hant/tools/exec-approvals#safe-bins-stdin-only) 和 [Safe bin 與允許清單的比較](/zh-Hant/tools/exec-approvals#safe-bins-versus-allowlist)。

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

## apply_patch (實驗性)

`apply_patch` 是 `exec` 的一個子工具，用於結構化的多檔案編輯。
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
- 工具原則仍然適用；`allow: ["exec"]` 隱含地允許 `apply_patch`。
- 設定檔位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true` (限制在工作區內)。僅在您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
