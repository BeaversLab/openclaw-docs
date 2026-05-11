---
summary: "Why a tool is blocked: sandbox runtime, tool allow/deny policy, and elevated exec gates"
title: Sandbox vs tool policy vs elevated
read_when: "您遇到「沙箱監獄」或看到工具/提升權限被拒絕，並且想要更改確切的配置鍵。"
status: active
---

OpenClaw 具有三項相關（但不同）的控制機制：

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 決定 **工具在何處執行**（sandbox 後端與主機）。
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 決定 **哪些工具可用/被允許**。
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一個 **僅限執行的緊急逃生機制**，可在您處於 sandbox 環境時於 sandbox 外執行（預設為 `gateway`，或在 exec target 設定為 `node` 時為 `node`）。

## 快速除錯

使用檢查器來查看 OpenClaw _實際上_ 在做什麼：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它會顯示：

- 有效的 sandbox 模式/範圍/工作區存取權限
- 目前會話是否在 sandbox 環境中執行 (main vs non-main)
- 有效的 sandbox 工具允許/拒絕規則（以及來源為 agent/global/default）
- elevated 閘門與修復金鑰路徑

## Sandbox：工具執行位置

Sandbox 由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有內容都在主機上執行。
- `"non-main"`：只有 non-main 會話會被 sandbox（對群組/頻道來說是常見的「驚喜」）。
- `"all"`：所有內容都會被 sandbox。

請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解完整的矩陣（範圍、工作區 掛載、映像檔）。

### Bind mounts（安全性快速檢查）

- `docker.binds` _穿透_ sandbox 檔案系統：您掛載的任何內容都會以您設定的模式（`:ro` 或 `:rw`）在容器內可見。
- 如果省略模式，預設為讀寫；對於來源/機密，建議使用 `:ro`。
- `scope: "shared"` 會忽略每個 agent 的 繫結（僅全域 繫結適用）。
- OpenClaw 會驗證綁定來源兩次：首先在標準化的來源路徑上，然後在解析最深層現有祖先後再次驗證。符號連結父級逃逸無法繞過被封鎖路徑或允許根目錄的檢查。
- 不存在的葉路徑仍然會受到安全檢查。如果 `/workspace/alias-out/new-file` 透過符號連結父級解析到被封鎖的路徑或設定允許的根目錄之外，該綁定將被拒絕。
- 綁定 `/var/run/docker.sock` 實際上是將主機控制權交給沙盒；請僅在有意的情況下這樣做。
- 工作區存取權限 (`workspaceAccess: "ro"`/`"rw"`) 與綁定模式無關。

## 工具原則：哪些工具存在/可呼叫

兩個層級很重要：

- **工具設定檔**：`tools.profile` 和 `agents.list[].tools.profile` (基本允許清單)
- **提供者工具設定檔**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全域/個別代理工具原則**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供者工具原則**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙盒工具原則** (僅在沙盒化時適用)：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

經驗法則：

- `deny` 永遠優先。
- 如果 `allow` 非空，其他所有內容都將視為被封鎖。
- 工具原則是硬性停止：`/exec` 無法覆蓋被拒絕的 `exec` 工具。
- `/exec` 僅會變更已授權發送者的工作階段預設值；它不會授予工具存取權。
  提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.4`)。

### 工具群組 (簡寫)

工具原則 (全域、代理、沙盒) 支援可擴充為多個工具的 `group:*` 項目：

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"],
      },
    },
  },
}
```

可用的群組：

- `group:runtime`：`exec`、`process`、`code_execution`（`bash` 被接受為 `exec` 的別名）
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`x_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:agents`：`agents_list`
- `group:media`：`image`、`image_generate`、`video_generate`、`tts`
- `group:openclaw`：所有內建的 OpenClaw 工具（不包括提供者外掛程式）

## 提升權限 (Elevated)：僅限執行的「在主機上執行」

提升權限**不會**授予額外工具；它只會影響 `exec`。

- 如果您處於沙盒中，`/elevated on`（或帶有 `elevated: true` 的 `exec`）會在沙盒外執行（可能仍需核准）。
- 使用 `/elevated full` 以略過連線階段的執行核准。
- 如果您已經直接執行，提升權限實際上是一個無操作指令（仍受閘道管制）。
- 提升權限**不**限定於技能範圍，且**不**會覆蓋工具允許/拒絕設定。
- 提權並不授權從 `host=auto` 進行任意的跨主機覆蓋；它遵循正常的執行目標規則，並且僅當配置的/會話目標已經是 `node` 時，才保留 `node`。
- `/exec` 與提權是分開的。它僅針對已授權的發送者調整每個會話的執行預設值。

閘門：

- 啟用：`tools.elevated.enabled`（以及可選的 `agents.list[].tools.elevated.enabled`）
- 發送者白名單：`tools.elevated.allowFrom.<provider>`（以及可選的 `agents.list[].tools.elevated.allowFrom.<provider>`）

參閱 [提權模式](/zh-Hant/tools/elevated)。

## 常見的「沙箱監獄」修復方法

### 「工具 X 被沙箱工具政策封鎖」

修復金鑰（選擇一個）：

- 停用沙箱：`agents.defaults.sandbox.mode=off`（或每個代理程式的 `agents.list[].sandbox.mode=off`）
- 在沙箱內允許該工具：
  - 將其從 `tools.sandbox.tools.deny` 中移除（或每個代理程式的 `agents.list[].tools.sandbox.tools.deny`）
  - 或將其添加到 `tools.sandbox.tools.allow`（或每個代理程式的允許列表）

### 「我以為這是 main，為什麼它在沙箱裡？」

在 `"non-main"` 模式下，群組/頻道金鑰 _不是_ main。使用主會話金鑰（由 `sandbox explain` 顯示）或將模式切換到 `"off"`。

## 相關

- [沙箱隔離](/zh-Hant/gateway/sandboxing) -- 完整的沙箱參考（模式、範圍、後端、映像）
- [多代理程式沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆蓋和優先順序
- [提權模式](/zh-Hant/tools/elevated)
