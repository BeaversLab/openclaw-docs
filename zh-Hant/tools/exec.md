---
summary: "Exec tool 使用方式、stdin 模式與 TTY 支援"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec Tool"
---

# Exec tool

在工作區中執行 Shell 指令。支援透過 `process` 進行前景與背景執行。
如果 `process` 不被允許，`exec` 將會同步執行並忽略 `yieldMs`/`background`。
背景工作階段是以代理程式為範圍；`process` 只能看到來自同一個代理程式的工作階段。

## 參數

- `command` (必要)
- `workdir` (預設為 cwd)
- `env` (鍵/值 覆寫)
- `yieldMs` (預設 10000)：延遲後自動背景執行
- `background` (bool)：立即背景執行
- `timeout` (秒，預設 1800)：到期時終止
- `pty` (bool)：當可用時在虛擬終端機中執行 (僅限 TTY 的 CLI、coding agents、終端機 UI)
- `host` (`sandbox | gateway | node`)：執行位置
- `security` (`deny | allowlist | full`)：`gateway`/`node` 的強制執行模式
- `ask` (`off | on-miss | always`)：`gateway`/`node` 的批准提示
- `node` (字串)：`host=node` 的節點 ID/名稱
- `elevated` (bool)：請求提權模式 (gateway host)；僅當提權解析為 `full` 時才會強制 `security=full`

備註：

- `host` 預設為 `sandbox`。
- 當沙箱關閉時會忽略 `elevated` (exec 已經在主機上執行)。
- `gateway`/`node` 批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要已配對的節點 (companion app 或 headless node host)。
- 如果有多個節點可用，請設定 `exec.node` 或 `tools.exec.node` 來選擇一個。
- 在非 Windows 主機上，如果設定了 `SHELL`，exec 會使用它；如果 `SHELL` 是 `fish`，它會偏好 `PATH` 中的 `bash`（或 `sh`）以避免不相容 fish 的腳本，如果兩者都不存在，則回退到 `SHELL`。
- 在 Windows 主機上，exec 偏好 PowerShell 7 (`pwsh`) 探測（Program Files、ProgramW6432，然後是 PATH），
  然後回退到 Windows PowerShell 5.1。
- 主機執行 (`gateway`/`node`) 會拒絕 `env.PATH` 和載入器覆寫 (`LD_*`/`DYLD_*`) 以
  防止二進位劫持或注入程式碼。
- OpenClaw 在產生的指令環境中設定 `OPENCLAW_SHELL=exec`（包括 PTY 和沙箱執行），以便 shell/設定檔規則可以偵測 exec-tool 上下文。
- 重要：沙箱功能 **預設為關閉**。如果沙箱功能關閉且明確
  配置/請求了 `host=sandbox`，exec 將會失敗關閉，而不是在閘道主機上靜默執行。
  請啟用沙箱功能或使用經過核准的 `host=gateway`。
- 腳本預檢檢查（針對常見的 Python/Node shell 語法錯誤）僅會檢查有效
  `workdir` 邊界內的檔案。如果腳本路徑解析到 `workdir` 之外，則將跳過該檔案的預檢。

## 配置

- `tools.exec.notifyOnExit` (預設值: true)：當為 true 時，後台 exec 會話會將系統事件加入佇列，並在退出時請求心跳。
- `tools.exec.approvalRunningNoticeMs` (預設值: 10000)：當需要核准的 exec 執行時間超過此值時，發出單個「執行中」通知（0 則停用）。
- `tools.exec.host` (預設值: `sandbox`)
- `tools.exec.security` (預設值: 沙箱為 `deny`，未設定時閘道 + 節點為 `allowlist`)
- `tools.exec.ask` (預設值: `on-miss`)
- `tools.exec.node` (預設值：未設定)
- `tools.exec.pathPrepend`：要前置到 `PATH` 的目錄列表，用於 exec 執行（僅限 gateway + sandbox）。
- `tools.exec.safeBins`：僅限 stdin 的安全二進位檔，可在無需明確允許列表條目的情況下執行。有關行為詳情，請參閱 [Safe bins](/zh-Hant/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用於 `safeBins` 路徑檢查的其他受信任明確目錄。`PATH` 條目絕不會自動受信任。內建預設值為 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每個安全二進位檔的選用自訂 argv 原則 (`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`)。

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

- `host=gateway`：將您的登入 shell `PATH` 合併到 exec 環境中。主機執行會拒絕
  `env.PATH` 覆寫。守護程式本身仍以最小 `PATH` 執行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器內執行 `sh -lc` (login shell)，因此 `/etc/profile` 可能會重設 `PATH`。
  OpenClaw 在來源設定檔後，透過內部環境變數前置 `env.PATH` (無 shell 插值)；
  `tools.exec.pathPrepend` 也適用於此。
- `host=node`：只有您傳遞的未遭阻擋的環境變數覆寫會傳送到節點。主機執行會拒絕
  `env.PATH` 覆寫，且節點主機會予以忽略。如果您在節點上需要額外的 PATH 條目，
  請設定節點主機服務環境 或將工具安裝在標準位置。

每個代理程式的節點綁定 (使用設定中的代理程式列表索引)：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：Nodes 分頁包含一個小的「Exec node binding」面板，用於設定相同的設定值。

## Session overrides (`/exec`)

使用 `/exec` 來設定 `host`、`security`、`ask` 和 `node` 的**各 session** 預設值。
傳送 `/exec` 且不帶引數以顯示目前的數值。

範例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授權模型

`/exec` 僅對**已授權的傳送者**（通道允許清單/配對加上 `commands.useAccessGroups`）有效。
它僅更新 **session 狀態** 且不會寫入設定。若要徹底停用 exec，請透過工具原則
（`tools.deny: ["exec"]` 或各 agent）拒絕它。除非您明確設定
`security=full` 和 `ask=off`，否則主機核准仍然適用。

## Exec approvals (companion app / node host)

沙盒化的 agent 可以要求在 `exec` 於閘道或節點主機上執行前，針對每個請求進行核准。
請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals) 以了解原則、允許清單和 UI 流程。

當需要核准時，exec 工具會立即回傳
`status: "approval-pending"` 和一個核准 ID。一旦核准（或拒絕/逾時），
閘道會發出系統事件（`Exec finished` / `Exec denied`）。如果指令在
`tools.exec.approvalRunningNoticeMs` 後仍在執行，則會發出單一 `Exec running` 通知。

## Allowlist + safe bins

手動允許清單強制執行僅比對**解析後的二進位路徑**（不比對基本名稱）。當
`security=allowlist` 時，Shell 指令只有在每個管線區段
位於允許清單中或是安全 bin 時才會自動獲准。鏈結（`;`、`&&`、`||`）和重新導向在
允許清單模式下會被拒絕，除非每個頂層區段都符合允許清單（包括安全 bin）。
重新導向仍不支援。

`autoAllowSkills` 是 exec 批準中一個獨立的便利路徑。它不同於
手動路徑允許清單條目。為了嚴格的明確信任，請保持 `autoAllowSkills` 停用。

使用這兩個控制項來處理不同的工作：

- `tools.exec.safeBins`：小型、僅限 stdin 的串流過濾器。
- `tools.exec.safeBinTrustedDirs`：針對安全 bin 執行檔路徑的明確額外信任目錄。
- `tools.exec.safeBinProfiles`：針對自訂安全 bin 的明確 argv 政策。
- allowlist：針對執行檔路徑的明確信任。

請勿將 `safeBins` 視為通用允許清單，且請勿新增解譯器/執行時期二進位檔（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要這些，請使用明確的允許清單條目並保持批准提示為啟用狀態。
當解譯器/執行時期 `safeBins` 條目缺少明確的設定檔時，`openclaw security audit` 會發出警告，而 `openclaw doctor --fix` 可以自動建構遺失的自訂 `safeBinProfiles` 條目。

如需完整的政策詳細資訊和範例，請參閱 [Exec 批準](/zh-Hant/tools/exec-approvals#safe-bins-stdin-only) 和 [安全 bin 與允許清單的比較](/zh-Hant/tools/exec-approvals#safe-bins-versus-allowlist)。

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
- 工具政策仍然適用；`allow: ["exec"]` 隱含地允許 `apply_patch`。
- 設定位於 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true`（包含於工作區內）。僅當您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
