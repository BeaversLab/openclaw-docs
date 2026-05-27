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

請參閱 [沙盒機制](/zh-Hant/gateway/sandboxing) 以取得完整矩陣（範圍、工作區掛載、映像檔）。

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
- 當工具原則步驟移除工具或沙盒工具原則封鎖呼叫時，Gateway 日誌會包含 `agents/tool-policy` 審計項目。請使用 `openclaw logs` 來查看規則標籤、設定金鑰及受影響的工具名稱。

### 工具群組（簡寫）

工具原則（全域、代理程式、沙盒）支援 `group:*` 項目，這些項目可展開為多個工具：

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

- `group:runtime`：`exec`、`process`、`code_execution`（`bash` 被接受為
  `exec` 的別名）
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
  對於唯讀代理程式，請拒絕 `group:runtime` 以及可變更檔案系統的工具，除非沙盒檔案系統原則或個別的主機邊界強制執行唯讀限制。
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`x_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`heartbeat_respond`、`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:agents`：`agents_list`、`update_plan`
- `group:media`: `image`, `image_generate`, `music_generate`, `video_generate`, `tts`
- `group:openclaw`: 所有內建的 OpenClaw 工具（不包括提供者外掛程式）
- `group:plugins`: 所有已載入的外掛程式擁有的工具，包括透過 `bundle-mcp` 公開的已設定 MCP 伺服器

對於受沙箱保護的 MCP 伺服器，沙箱工具原則是第二道允許閘門。如果已設定 `mcp.servers`，但受沙箱保護的回合只顯示內建工具，請將 `bundle-mcp`、`group:plugins` 或伺服器前綴的 MCP 工具名稱/萬用字元（例如 `outlook__send_mail` 或 `outlook__*`）新增至 `tools.sandbox.tools.alsoAllow`，然後重新啟動/重新載入閘道並重新擷取工具清單。伺服器萬用字元使用提供者安全的 MCP 伺服器前綴：非 `[A-Za-z0-9_-]` 字元會變成 `-`，不以字母開頭的名稱會取得 `mcp-` 前綴，而過長或重複的前綴可能會被截斷或加上後綴。

`openclaw doctor` 目前會檢查 `mcp.servers` 中 OpenClaw 管理伺服器的此結構。從隨附外掛程式資訊清單或 Claude `.mcp.json` 載入的 MCP 伺服器使用相同的沙箱閘門，但此診斷尚未列舉這些來源；如果它們的工具在受沙箱保護的回合中消失，請使用相同的允許清單項目。

## 提權：僅執行「在主機上執行」

提權**不會**授額外工具；它只會影響 `exec`。

- 如果您處於沙箱環境中，`/elevated on`（或具有 `elevated: true` 的 `exec`）會在沙箱外部執行（可能仍需要核准）。
- 使用 `/elevated full` 以跳過此階段的執行核准。
- 如果您已經在直接執行，提權實際上是不會產生任何效果的空操作（仍受閘門控制）。
- 提權**不是**以技能為範圍的，並且**不會**覆寫工具允許/拒絕。
- 提權 並不授予從 `host=auto` 進行任意跨主機覆蓋的權限；它遵循正常的 exec 目標規則，並且僅當配置/會話目標已經是 `node` 時，才會保留 `node`。
- `/exec` 與提權是分開的。它僅為已授權的發送者調整每次會話的 exec 預設值。

閘道：

- 啟用方式：`tools.elevated.enabled`（以及可選的 `agents.list[].tools.elevated.enabled`）
- 發送者允許清單：`tools.elevated.allowFrom.<provider>`（以及可選的 `agents.list[].tools.elevated.allowFrom.<provider>`）

參閱 [提權模式](/zh-Hant/tools/elevated)。

## 常見的「沙盒監獄」修復方法

### 「工具 X 被沙盒工具政策封鎖」

修復金鑰（擇一）：

- 停用沙盒：`agents.defaults.sandbox.mode=off`（或針對每個 Agent 的 `agents.list[].sandbox.mode=off`）
- 在沙盒內允許該工具：
  - 將其從 `tools.sandbox.tools.deny` 中移除（或針對每個 Agent 的 `agents.list[].tools.sandbox.tools.deny`）
  - 或將其加入 `tools.sandbox.tools.allow`（或針對每個 Agent 的允許清單）
- 檢查 `openclaw logs` 中的 `agents/tool-policy` 條目。它會記錄沙盒模式以及是允許還是拒絕規則封鎖了該工具。

### 「我以為這是 main，為什麼被沙盒化了？」

在 `"non-main"` 模式下，群組/頻道金鑰 _並非_ main。請使用 main 會話金鑰（由 `sandbox explain` 顯示），或將模式切換為 `"off"`。

## 相關內容

- [沙盒機制](/zh-Hant/gateway/sandboxing) -- 完整的沙盒參考資料（模式、範圍、後端、映像檔）
- [多 Agent 沙盒與工具](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個 Agent 的覆蓋與優先順序
- [提權模式](/zh-Hant/tools/elevated)
