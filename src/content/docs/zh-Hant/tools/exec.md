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
- `elevated` (bool): request elevated mode (gateway host); `security=full` is only forced when elevated resolves to `full`

Notes:

- `host` 預設為 `auto`：若工作階段啟用沙箱執行環境則使用沙箱，否則使用閘道。
- `elevated` 強制使用 `host=gateway`；僅在目前工作階段/提供者啟用提升權限存取時可用。
- `gateway`/`node` 核准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配對的節點（伴隨應用程式或無頭節點主機）。
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 來選擇其中一個。
- `exec host=node` 是節點唯一的 Shell 執行路徑；舊版的 `nodes.run` 包裝器已移除。
- 在非 Windows 主機上，若設定 `SHELL` 則 exec 會使用它；如果 `SHELL` 是 `fish`，為避免不相容 fish 的腳本，它會優先使用 `PATH` 中的 `bash` (或 `sh`)，如果都不存在則回退到 `SHELL`。
- 在 Windows 主機上，exec 優先探索 PowerShell 7 (`pwsh`) (Program Files、ProgramW6432，然後是 PATH)，
  然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二元劫持或注入程式碼。
- OpenClaw 在產生的指令環境中設定 `OPENCLAW_SHELL=exec` (包括 PTY 和沙箱執行)，以便 Shell/設定檔規則可以偵測 exec-tool 語境。
- 重要提示：沙箱**預設關閉**。如果沙箱關閉，隱含的 `host=auto`
  會解析為 `gateway`。顯式的 `host=sandbox` 仍然會封閉式失敗，而不是在閘道主機上靜默
  執行。請啟用沙箱或使用帶有核准的 `host=gateway`。
- Script preflight checks (for common Python/Node shell-syntax mistakes) only inspect files inside the
  effective `workdir` boundary. If a script path resolves outside `workdir`, preflight is skipped for
  that file.

## Config

- `tools.exec.notifyOnExit` (default: true): when true, backgrounded exec sessions enqueue a system event and request a heartbeat on exit.
- `tools.exec.approvalRunningNoticeMs` (default: 10000): emit a single “running” notice when an approval-gated exec runs longer than this (0 disables).
- `tools.exec.host` (default: `auto`; resolves to `sandbox` when sandbox runtime is active, `gateway` otherwise)
- `tools.exec.security` (default: `deny` for sandbox, `allowlist` for gateway + node when unset)
- `tools.exec.ask` (default: `on-miss`)
- `tools.exec.node` (default: unset)
- `tools.exec.strictInlineEval` (default: false): when true, inline interpreter eval forms such as `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e`, and `osascript -e` always require explicit approval. `allow-always` can still persist benign interpreter/script invocations, but inline-eval forms still prompt each time.
- `tools.exec.pathPrepend`: list of directories to prepend to `PATH` for exec runs (gateway + sandbox only).
- `tools.exec.safeBins`: stdin-only safe binaries that can run without explicit allowlist entries. For behavior details, see [Safe bins](/en/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: additional explicit directories trusted for `safeBins` path checks. `PATH` entries are never auto-trusted. Built-in defaults are `/bin` and `/usr/bin`.
- `tools.exec.safeBinProfiles`：每個安全 bin 的可選自訂 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

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

- `host=gateway`：將您的登入 shell `PATH` 合併到 exec 環境中。主機執行會拒絕 `env.PATH` 覆寫。
  守護程式本身仍以最少的 `PATH` 執行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器內執行 `sh -lc`（登入 shell），因此 `/etc/profile` 可能會重置 `PATH`。
  OpenClaw 會在載入 profile 後透過內部環境變數（無 shell 插值）預置 `env.PATH`；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`：只有您傳遞的未被封鎖的環境變數覆寫會傳送到節點。主機執行會拒絕 `env.PATH` 覆寫，
  且節點主機會將其忽略。如果您在節點上需要額外的 PATH 項目，
  請設定節點主機服務環境（systemd/launchd）或將工具安裝在標準位置。

每個 Agent 的節點綁定（使用設定中的 Agent 列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：「Nodes」標籤頁包含一個小型的「Exec node binding」面板，用於相同的設定。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **per-session** 預設值。
傳送不帶任何參數的 `/exec` 以顯示目前的值。

範例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對**已授權的發送者**（通道允許清單/配對加上 `commands.useAccessGroups`）有效。
它僅更新 **session 狀態**，不會寫入組態。若要完全停用 exec，請透過工具
原則（`tools.deny: ["exec"]` 或每個 agent）拒絕。除非您明確設定
`security=full` 和 `ask=off`，否則 Host 核准仍然適用。

## Exec 核准（伴隨應用程式 / 節點主機）

沙箱化的 agent 可以要求在 `exec` 於閘道或節點主機上執行之前進行每次請求的核准。
請參閱 [Exec 核准](/en/tools/exec-approvals) 以了解原則、允許清單和 UI 流程。

當需要核准時，exec 工具會立即回傳
`status: "approval-pending"` 和一個核准 ID。一旦核准（或拒絕 / 逾時），
閘道會發出系統事件（`Exec finished` / `Exec denied`）。如果在 `tools.exec.approvalRunningNoticeMs` 後指令仍在
執行，則會發出單一 `Exec running` 通知。

## 允許清單 + 安全 bins

手動允許清單強制執行僅比對 **已解析的二進位路徑**（無基底名稱比對）。當
`security=allowlist` 時，只有當每個管線區段都
在允許清單中或是安全 bin 時，Shell 指令才會自動允許。在允許清單模式下，除非每個頂層區段都滿足允許清單（包括安全 bins），否則鏈結（`;`、`&&`、`||`）和重新導向會被拒絕。
重新導向仍然不支援。

`autoAllowSkills` 是 exec 核准中一個獨立的便利路徑。它與
手動路徑允許清單項目不同。若要嚴格明確信任，請保持 `autoAllowSkills` 停用。

使用這兩個控制項來處理不同的工作：

- `tools.exec.safeBins`：小型、僅 stdin 的串流過濾器。
- `tools.exec.safeBinTrustedDirs`：用於安全 bin 可執行路徑的明確額外受信任目錄。
- `tools.exec.safeBinProfiles`：自訂安全 bin 的明確 argv 原則。
- allowlist：可執行路徑的明確信任。

請勿將 `safeBins` 視為通用允許列表，也不要加入解譯器/執行時期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要這些工具，請使用明確的允許列表條目並保持核准提示已啟用。
當解譯器/執行時期 `safeBins` 條目缺少明確的設定檔時，`openclaw security audit` 會發出警告，而 `openclaw doctor --fix` 可以自動產生缺少的自訂 `safeBinProfiles` 條目。
當您明確將行為廣泛的二進位檔（例如 `jq`）加回 `safeBins` 時，`openclaw security audit` 和 `openclaw doctor` 也會發出警告。
如果您明確將解譯器加入允許列表，請啟用 `tools.exec.strictInlineEval`，這樣內聯程式碼評估表單仍需要新的核准。

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

`apply_patch` 是 `exec` 的子工具，用於結構化多檔案編輯。
它預設為 OpenAI 和 OpenAI Codex 模型啟用。僅在當您想要停用它或將其限制為特定模型時才使用設定：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

備註：

- 僅適用於 OpenAI/OpenAI Codex 模型。
- 工具政策仍然適用；`allow: ["write"]` 隱含地允許 `apply_patch`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.enabled` 預設為 `true`；將其設定為 `false` 以停用 OpenAI 模型的此工具。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true` (限於工作區內)。僅當您有意要讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

## 相關

- [Exec Approvals](/en/tools/exec-approvals) — shell 指令的核准閘門
- [沙箱化](/en/gateway/sandboxing) — 在沙箱環境中執行指令
- [背景程序](/en/gateway/background-process) — 長時間執行的 exec 與 process 工具
- [安全性](/en/gateway/security) — 工具政策與提升存取權限
