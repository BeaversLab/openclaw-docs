---
summary: "Exec tool 使用說明、stdin 模式與 TTY 支援"
read_when:
  - 使用或修改 exec 工具
  - 偵錯 stdin 或 TTY 行為
title: "Exec Tool"
---

# Exec tool

在工作區執行 shell 指令。支援透過 `process` 進行前景 + 背景執行。
如果 `process` 被禁止，`exec` 會同步執行並忽略 `yieldMs`/`background`。
背景會話是以 agent 為範圍；`process` 只會看到來自同一個 agent 的會話。

## 參數

- `command` (必填)
- `workdir` (預設為 cwd)
- `env` (鍵/值 覆寫)
- `yieldMs` (預設 10000)：延遲後自動背景執行
- `background` (布林值)：立即在背景執行
- `timeout` (秒，預設 1800)：到期時終止
- `pty` (布林值)：在可用時於虛擬終端機中執行 (僅限 TTY 的 CLI、coding agents、終端機 UI)
- `host` (`sandbox | gateway | node`)：執行位置
- `security` (`deny | allowlist | full`)：`gateway`/`node` 的強制執行模式
- `ask` (`off | on-miss | always`)：`gateway`/`node` 的核准提示
- `node` (字串)：用於 `host=node` 的節點 id/名稱
- `elevated` (布林值)：請求提權模式 (gateway host)；當提權解析為 `full` 時，才會強制執行 `security=full`

備註：

- `host` 預設為 `sandbox`。
- 當沙箱關閉時會忽略 `elevated` (exec 已在主機上執行)。
- `gateway`/`node` 核准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配對的節點 (companion app 或 headless node host)。
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 來選擇其中一個。
- 在非 Windows 主機上，如果已設定 `SHELL`，exec 會使用它；如果 `SHELL` 為 `fish`，它會偏好 `PATH` 中的 `bash` (或 `sh`) 以避免不相容於 fish 的腳本，如果兩者都不存在，則回退到 `SHELL`。
- 在 Windows 主機上，exec 偏好 PowerShell 7 (`pwsh`) 探索 (Program Files, ProgramW6432, 然後是 PATH)，然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以防止二元劫持或注入的程式碼。
- OpenClaw 在產生的指令環境中設定 `OPENCLAW_SHELL=exec` (包括 PTY 和沙箱執行)，以便 shell/profile 規則可以偵測 exec-tool 語境。
- 重要：沙箱功能**預設為關閉**。如果沙箱功能關閉且明確配置/請求了 `host=sandbox`，exec 現在會以失敗封閉 (fail closed) 處理，而不是在閘道主機上靜默執行。請啟用沙箱功能，或在使用 `host=gateway` 時取得批准。
- 腳本預檢查 (針對常見的 Python/Node shell 語法錯誤) 只會檢查有效 `workdir` 邊界內的檔案。如果腳本路徑解析到 `workdir` 之外，則會跳過該檔案的預檢。

## 設定

- `tools.exec.notifyOnExit` (預設值：true)：當為 true 時，背景化的 exec 會話會將系統事件加入佇列，並在結束時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設值：10000)：當需要批准的 exec 執行時間超過此值時，發出單一「執行中」通知 (設為 0 則停用)。
- `tools.exec.host` (預設值：`sandbox`)
- `tools.exec.security` (預設值：沙箱為 `deny`，未設定時的 gateway + node 為 `allowlist`)
- `tools.exec.ask` (預設值：`on-miss`)
- `tools.exec.node` (預設：未設定)
- `tools.exec.pathPrepend`：要前置到 exec 執行 (僅限 gateway + sandbox) 之 `PATH` 的目錄列表。
- `tools.exec.safeBins`：無需明確 allowlist 條目即可執行的 stdin-only 安全二進位檔案。如需行為詳細資訊，請參閱 [Safe bins](/zh-Hant/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用於 `safeBins` 路徑檢查的其他受信任明確目錄。`PATH` 條目絕不會自動受信任。內建預設值為 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每個安全二進位檔案的可選自訂 argv 原則 (`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`)。

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

- `host=gateway`：將您的 login-shell `PATH` 合併到 exec 環境中。`env.PATH` 覆寫值在主機執行時會被拒絕。守護程式本身仍會以最少的 `PATH` 執行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器內執行 `sh -lc` (login shell)，因此 `/etc/profile` 可能會重設 `PATH`。
  OpenClaw 會透過內部環境變數 (無 shell 插值) 在 profile 載入後前置 `env.PATH`；
  `tools.exec.pathPrepend` 也適用於此處。
- `host=node`：只有您傳遞的非封鎖環境變數覆寫會傳送到節點。`env.PATH` 覆寫值在主機執行時會被拒絕，並會被節點主機忽略。如果您在節點上需要額外的 PATH 項目，
  請設定節點主機服務環境 (systemd/launchd) 或在標準位置安裝工具。

每個代理程式的節點綁定 (使用設定中的代理程式清單索引)：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：Nodes 分頁包含一個小型的「Exec node binding」面板，用於相同的設定。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的 **per-session** 預設值。
傳送不帶引數的 `/exec` 以顯示目前的數值。

範例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對 **authorized senders** (通道 allowlists/pairing 加上 `commands.useAccessGroups`) 有效。
它僅更新 **session state** 且不會寫入設定。若要徹底停用 exec，請透過工具
政策 (`tools.deny: ["exec"]` 或 per-agent) 拒絕它。除非您明確設定
`security=full` 和 `ask=off`，否則主機核准仍然適用。

## Exec approvals (companion app / node host)

沙盒化的代理程式可以在 `exec` 斷閘道器或節點主機上執行前，要求每次請求的核准。
請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals) 以了解政策、allowlist 和 UI 流程。

當需要核准時，exec 工具會立即傳回
`status: "approval-pending"` 和一個核准 ID。一旦核准（或拒絕 / 逾時），
閘道器會發出系統事件 (`Exec finished` / `Exec denied`)。如果指令在
`tools.exec.approvalRunningNoticeMs` 後仍在執行，則會發出單一 `Exec running` 通知。

## Allowlist + safe bins

手動 allowlist 執行僅比對 **已解析的二進位路徑** (不比對 basename)。當
`security=allowlist` 時，Shell 指令只有在每個管線區段都已
列入 allowlist 或是 safe bin 時才會自動允許。在 allowlist 模式下，除非每個頂層區段都符合 allowlist (包括 safe bins)，否則會拒絕鏈結 (`;`、`&&`、`||`) 和重新導向。
重新導向仍然不受支援。

`autoAllowSkills` 是 exec 核准中的一個額外的便利路徑。它與
手動路徑允許清單條目不同。若要嚴格地明確信任，請將 `autoAllowSkills` 保持停用狀態。

將這兩個控制項用於不同的用途：

- `tools.exec.safeBins`：小型、僅 stdin 的串流篩選器。
- `tools.exec.safeBinTrustedDirs`：針對 safe-bin 可執行檔路徑的明確額外信任目錄。
- `tools.exec.safeBinProfiles`：自訂 safe bin 的明確 argv 原則。
- allowlist：針對可執行檔路徑的明確信任。

請勿將 `safeBins` 視為通用允許清單，且勿新增解譯器/執行時期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要使用這些檔案，請使用明確的允許清單條目並保持核准提示為啟用狀態。
當解譯器/執行時期的 `safeBins` 條目缺少明確的設定檔時，`openclaw security audit` 會發出警告，而 `openclaw doctor --fix` 可以建構遺失的自訂 `safeBinProfiles` 條目。

如需完整的原則詳細資訊與範例，請參閱 [Exec 核准](/zh-Hant/tools/exec-approvals#safe-bins-stdin-only) 與 [Safe bins 與 allowlist 的比較](/zh-Hant/tools/exec-approvals#safe-bins-versus-allowlist)。

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

貼上（預設為括號模式）：

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
- 工具原則仍然適用；`allow: ["exec"]` 隱含允許 `apply_patch`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true`（限制於工作區內）。僅當您刻意希望 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

import en from "/components/footer/en.mdx";

<en />
