---
title: 沙箱 vs 工具策略 vs 提升權限
summary: "為什麼工具被封鎖：沙箱運行時、工具允許/拒絕策略以及提升權限執行閘道"
read_when: "您遇到「沙箱監獄」或看到工具/提升權限被拒絕，並且想要更改確切的配置鍵。"
status: active
---

# 沙箱 vs 工具策略 vs 提升權限

OpenClaw 有三個相關（但不同）的控制機制：

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 決定 **工具在哪裡執行**（sandbox 後端 vs 主機）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）決定了 **哪些工具可用/被允許**。
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一個 **僅限執行的逃逸機制**，用於在您處於沙箱環境時在沙箱外執行 (預設為 `gateway`，或當 exec 目標配置為 `node` 時為 `node`)。

## 快速除錯

使用檢查器來查看 OpenClaw _實際上_ 在做什麼：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它會列印：

- 有效的沙箱模式/範圍/工作區存取權
- 工作階段目前是否處於沙箱中（主要 vs 非主要）
- 有效的沙箱工具允許/拒絕（以及它來自代理程式/全域/預設）
- 提升權限閘道和修復鍵路徑

## 沙箱：工具運行的位置

沙箱機制由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有內容都在主機上執行。
- `"non-main"`：僅非主要會話會被置於沙箱中 (群組/頻道的常見「驚喜」)。
- `"all"`：所有內容都會被置於沙箱中。

請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解完整矩陣 (範圍、工作區掛載、映像檔)。

### Bind 掛載（安全快速檢查）

- `docker.binds` _穿透_ 沙箱檔案系統：您掛載的任何內容都會以您設定的模式 (`:ro` 或 `:rw`) 在容器內可見。
- 如果您省略模式，預設值為讀寫；針對來源/機密建議優先使用 `:ro`。
- `scope: "shared"` 會忽略每個代理程式的綁定 (僅套用全域綁定)。
- OpenClaw 會驗證綁定來源兩次：首先在標準化的來源路徑上，然後在通過最深層的現有祖先解析後再次驗證。符號連結父級逃逸無法繞過封鎖路徑或允許根目錄檢查。
- 不存在的末端路徑仍會受到安全檢查。如果 `/workspace/alias-out/new-file` 通過符號連結的父級解析到封鎖路徑或設定的允許根目錄之外，該綁定將被拒絕。
- 綁定 `/var/run/docker.sock` 實際上是將主機控制權交給沙箱；請僅在有意的情況下進行此操作。
- 工作區存取權 (`workspaceAccess: "ro"`/`"rw"`) 獨立於綁定模式。

## Tool policy：哪些工具存在/可呼叫

兩個層級至關重要：

- **Tool profile**：`tools.profile` 和 `agents.list[].tools.profile` (基本允許清單)
- **Provider tool profile**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **Global/per-agent tool policy**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **供應商工具政策**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具政策**（僅在沙箱化時適用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

經驗法則：

- `deny` 始終優先。
- 如果 `allow` 非空，其他所有內容都將被視為已封鎖。
- 工具政策是硬性限制：`/exec` 無法覆蓋被拒絕的 `exec` 工具。
- `/exec` 僅為授權發送者更改會話預設值；它不授予工具存取權限。
  供應商工具金鑰接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

### 工具群組（簡寫）

工具政策（全域、代理程式、沙箱）支援 `group:*` 條目，可擴展為多個工具：

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
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`x_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`
- `group:media`: `image`, `image_generate`, `video_generate`, `tts`
- `group:openclaw`: 所有內建的 OpenClaw 工具（不包括提供者插件）

## 提升權限：僅執行的「在主機上執行」

提升權限**並不**會授予額外的工具；它僅影響 `exec`。

- 如果您正在使用沙箱，`/elevated on`（或是帶有 `elevated: true` 的 `exec`）會在沙箱之外執行（可能仍需批准）。
- 使用 `/elevated full` 以跳過該階段的執行批准。
- 如果您已經在直接執行，提升權限實際上無效（仍受到閘道管制）。
- 提升權限**並非**以技能為範圍，也**不會**覆寫工具允許/拒絕設定。
- 提升權限並不授予來自 `host=auto` 的任意跨主機覆寫權限；它遵循正常的執行目標規則，並且僅當已設定/階段目標是 `node` 時才保留 `node`。
- `/exec` 與提升權限是分開的。它僅針對已授權的發送者調整每階段的執行預設值。

閘道管制：

- 啟用：`tools.elevated.enabled`（以及選擇性的 `agents.list[].tools.elevated.enabled`）
- 發送者允許清單：`tools.elevated.allowFrom.<provider>`（以及選擇性的 `agents.list[].tools.elevated.allowFrom.<provider>`）

請參閱[提升權限模式](/zh-Hant/tools/elevated)。

## 常見的「沙箱監獄」修復方法

### 「工具 X 被沙箱工具政策封鎖」

修復金鑰（擇一）：

- 停用沙箱：`agents.defaults.sandbox.mode=off`（或每個代理程式的 `agents.list[].sandbox.mode=off`）
- 在沙箱內允許該工具：
  - 將其從 `tools.sandbox.tools.deny` 中移除（或每個代理程式的 `agents.list[].tools.sandbox.tools.deny`）
  - 或是將其加入 `tools.sandbox.tools.allow`（或每個代理程式的允許清單）

### 「我以為這是 main，為什麼它被沙箱化了？」

在 `"non-main"` 模式下，群組/頻道金鑰並非主金鑰。請使用主工作階段金鑰（由 `sandbox explain` 顯示）或將模式切換至 `"off"`。

## 另請參閱

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 完整的沙盒參考（模式、範圍、後端、映像檔）
- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆寫與優先順序
- [Elevated Mode](/zh-Hant/tools/elevated)
