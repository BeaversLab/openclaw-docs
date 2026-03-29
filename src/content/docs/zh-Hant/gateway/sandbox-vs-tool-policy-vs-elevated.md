---
title: 沙箱 vs 工具策略 vs 提升權限
summary: "為什麼工具被封鎖：沙箱運行時、工具允許/拒絕策略以及提升權限執行閘道"
read_when: "您遇到「沙箱監獄」或看到工具/提升權限被拒絕，並且想要更改確切的配置鍵。"
status: active
---

# 沙箱 vs 工具策略 vs 提升權限

OpenClaw 有三個相關（但不同）的控制機制：

1. **沙箱**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）決定了 **工具運行的位置**（Docker vs 主機）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）決定了 **哪些工具可用/被允許**。
3. **提升權限**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是一個 **僅執行的緊急逃生艙**，用於當您處於沙箱環境時在主機上運行。

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

沙箱化由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有操作都在主機上運行。
- `"non-main"`：僅非主要工作階段被沙箱化（群組/頻道常見的「驚喜」）。
- `"all"`：所有操作都被沙箱化。

完整的矩陣（範圍、工作區掛載、映像檔），請參閱 [沙箱化](/en/gateway/sandboxing)。

### Bind 掛載（安全快速檢查）

- `docker.binds` _穿透_ 沙箱檔案系統：您掛載的任何內容都會以您設定的模式（`:ro` 或 `:rw`）在容器內可見。
- 如果您省略模式，預設為讀寫；對於來源/機密，建議使用 `:ro`。
- `scope: "shared"` 會忽略每個代理程式的掛載（僅全域掛載適用）。
- 掛載 `/var/run/docker.sock` 實際上是將主機控制權交給沙箱；僅在有意的情況下執行此操作。
- 工作區存取 (`workspaceAccess: "ro"`/`"rw"`) 獨立於綁定模式。

## 工具原則：哪些工具存在/可調用

有兩個層級很重要：

- **工具設定檔**：`tools.profile` 和 `agents.list[].tools.profile`（基礎允許清單）
- **提供者工具設定檔**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全域/每個代理程式的工具原則**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供者工具原則**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙盒工具原則**（僅在沙盒化時適用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

經驗法則：

- `deny` 始終優先。
- 如果 `allow` 為非空值，則其他所有內容都視為被阻擋。
- 工具原則是強制終點：`/exec` 無法覆寫被拒絕的 `exec` 工具。
- `/exec` 僅變更已授權寄件者的預設工作階段；它不授予工具存取權。
  提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

### 工具群組（簡寫）

工具原則（全域、代理程式、沙盒）支援可擴展為多個工具的 `group:*` 項目：

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

- `group:runtime`： `exec`, `bash`, `process`
- `group:fs`： `read`, `write`, `edit`, `apply_patch`
- `group:sessions`： `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`： `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有內建的 OpenClaw 工具（不包括提供者外掛）

## Elevated：僅限執行「在主機上執行」

Elevated **不**會授予額外的工具；它只會影響 `exec`。

- 如果您處於沙盒模式，`/elevated on`（或帶有 `elevated: true` 的 `exec`）會在主機上執行（可能仍需審批）。
- 使用 `/elevated full` 以在本次會話中跳過執行審批。
- 如果您已經直接執行，Elevated 實際上無效（仍受控管）。
- Elevated **不**受限於技能範圍，且 **不**會覆寫工具的允許/拒絕設定。
- `/exec` 與 Elevated 分開。它僅針對已授權的發送者調整每次會話的執行預設值。

控管：

- 啟用：`tools.elevated.enabled`（以及可選的 `agents.list[].tools.elevated.enabled`）
- 發送者允許清單：`tools.elevated.allowFrom.<provider>`（以及可選的 `agents.list[].tools.elevated.allowFrom.<provider>`）

請參閱 [Elevated Mode](/en/tools/elevated)。

## 常見的「沙盒監獄」修復方法

### 「工具 X 被沙盒工具政策封鎖」

修復選項（擇一）：

- 停用沙盒：`agents.defaults.sandbox.mode=off`（或每個代理程式的 `agents.list[].sandbox.mode=off`）
- 在沙盒內允許該工具：
  - 將其從 `tools.sandbox.tools.deny` 中移除（或每個代理程式的 `agents.list[].tools.sandbox.tools.deny`）
  - 或將其新增到 `tools.sandbox.tools.allow`（或每個代理程式的允許清單）

### 「我以為這是 main，為什麼它在沙盒中？」

在 `"non-main"` 模式下，群組/頻道金鑰並不是 main。請使用主會話金鑰（由 `sandbox explain` 顯示）或將模式切換到 `"off"`。

## 另請參閱

- [Sandboxing](/en/gateway/sandboxing) -- 完整的沙盒參考（模式、範圍、後端、映像檔）
- [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆寫與優先順序
- [提權模式](/en/tools/elevated)
