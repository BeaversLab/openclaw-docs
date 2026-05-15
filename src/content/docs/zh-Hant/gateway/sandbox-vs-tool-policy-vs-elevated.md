---
summary: "Why a tool is blocked: sandbox runtime, tool allow/deny policy, and elevated exec gates"
title: Sandbox vs tool policy vs elevated
read_when: "您遇到「沙箱監獄」或看到工具/提升權限被拒絕，並且想要更改確切的配置鍵。"
status: active
---

OpenClaw 具有三項相關（但不同）的控制機制：

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 決定 **工具在何處執行**（sandbox 後端與主機）。
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 決定 **哪些工具可用/被允許**。
3. **提權**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是一個**僅限執行的緊急逃逸方法**，用於在您處於沙盒環境時在沙盒外執行操作（預設為 `gateway`，或當執行目標設定為 `node` 時為 `node`）。

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
- `"non-main"`：僅非主會話位於沙盒中（群組/通道常見的「意外」情況）。
- `"all"`：所有內容都會被 sandbox。

請參閱[沙盒化](/zh-Hant/gateway/sandboxing)以了解完整矩陣（範圍、工作區掛載、映像檔）。

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
- 工具原則會依名稱過濾可用工具；它不會檢查 `exec` 內部的副作用。如果允許 `exec`，拒絕 `write`、`edit` 或 `apply_patch` 並不會讓 shell 指令變成唯讀。
- `/exec` 僅變更經授權發送者的會話預設值；它不會授予工具存取權。
  提供者工具金鑰接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

### 工具群組（簡寫）

工具原則（全域、代理程式、沙盒）支援可展開為多個工具的 `group:*` 項目：

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

可用群組：

- `group:runtime`：`exec`、`process`、`code_execution`（`bash` 被接受作為
  `exec` 的別名）
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
  對於唯讀代理程式，請拒絕 `group:runtime` 以及可變更檔案系統的工具，除非沙盒檔案系統原則或獨立的主機邊界強制執行唯讀限制。
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `heartbeat_respond`, `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`, `update_plan`
- `group:media`: `image`, `image_generate`, `music_generate`, `video_generate`, `tts`
- `group:openclaw`: 所有內建 OpenClaw 工具（不包含提供者插件）

## 提升權限：僅執行的「在主機上執行」

Elevated 模式**不會**授予額外工具；它只影響 `exec`。

- 如果您在沙盒中，`/elevated on`（或帶有 `elevated: true` 的 `exec`）會在沙盒外執行（仍可能需要審批）。
- 使用 `/elevated full` 略過該連線階段的 exec 審批。
- 如果您已經在直接執行，elevated 實際上是無操作（但仍受閘道控管）。
- 提升權限**並非**以技能為範圍，也**不會**覆寫工具允許/拒絕設定。
- Elevated 不會授予來自 `host=auto` 的任意跨主機覆寫；它遵循正常的 exec 目標規則，且僅在配置/連線階段目標已是 `node` 時才保留 `node`。
- `/exec` 與 elevated 分開。它僅調整已授權發送者的連線階段 exec 預設值。

閘道管制：

- 啟用方式：`tools.elevated.enabled`（以及選用的 `agents.list[].tools.elevated.enabled`）
- 發送者允許清單：`tools.elevated.allowFrom.<provider>`（以及選用的 `agents.list[].tools.elevated.allowFrom.<provider>`）

參閱 [Elevated Mode](/zh-Hant/tools/elevated)。

## 常見的「沙箱監獄」修復方法

### 「工具 X 被沙箱工具政策封鎖」

修復金鑰（擇一）：

- 停用沙盒：`agents.defaults.sandbox.mode=off`（或每個代理程式的 `agents.list[].sandbox.mode=off`）
- 在沙箱內允許該工具：
  - 從 `tools.sandbox.tools.deny` 中移除它（或是針對每個代理程式的 `agents.list[].tools.sandbox.tools.deny`）
  - 或是將它加入 `tools.sandbox.tools.allow`（或是針對每個代理程式的允許設定）

### 「我以為這是 main，為什麼它被沙箱化了？」

在 `"non-main"` 模式下，群組/頻道金鑰*並非*主要金鑰。請使用主要工作階段金鑰（由 `sandbox explain` 顯示）或將模式切換至 `"off"`。

## 相關內容

- [沙箱機制](/zh-Hant/gateway/sandboxing) -- 完整的沙箱參考資料（模式、範圍、後端、映像檔）
- [多代理程式沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆寫與優先順序
- [提權模式](/zh-Hant/tools/elevated)
