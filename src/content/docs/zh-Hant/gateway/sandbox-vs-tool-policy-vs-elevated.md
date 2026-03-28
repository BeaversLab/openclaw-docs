---
title: Sandbox vs Tool Policy vs Elevated
summary: "Why a tool is blocked: sandbox runtime, tool allow/deny policy, and elevated exec gates"
read_when: "You hit 'sandbox jail' or see a tool/elevated refusal and want the exact config key to change."
status: active
---

# Sandbox vs Tool Policy vs Elevated

OpenClaw has three related (but different) controls:

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) decides **where tools run** (Docker vs host).
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) decides **which tools are available/allowed**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) is an **exec-only escape hatch** to run on the host when you’re sandboxed.

## Quick debug

使用檢查器來查看 OpenClaw 實際上在做什麼：

```exec
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它會列印：

- 有效的沙箱模式/範圍/工作區存取權
- 目前階段作業是否已啟用沙箱（main vs non-main）
- 有效的沙箱工具允許/拒絕（以及它是來自代理程式/全域/預設）
- 提升的閘門和修復金鑰路徑

## 沙箱：工具執行位置

沙箱機制由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有東西都在主機上執行。
- `"non-main"`：只有非主要階段作業會被放入沙箱（群組/頻道的常見「意外」）。
- `"all"`：所有東西都會被放入沙箱。

請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解完整的矩陣（範圍、工作區掛載、映像檔）。

### Bind mounts（安全快速檢查）

- `docker.binds` _穿透_ 沙盒檔案系統：無論您掛載什麼，都會以您設定的模式（`:ro` 或 `:rw`）在容器內可見。
- 如果省略模式，預設為讀寫；對於來源/機密，建議使用 `:ro`。
- `scope: "shared"` 會忽略每個代理程式的掛載（僅套用全域掛載）。
- 掛載 `/var/run/docker.sock` 實際上是將主機控制權交給沙盒；請僅在有意為之的情況下這樣做。
- 工作區存取權（`workspaceAccess: "ro"`/`"rw"`）獨立於掛載模式。

## 工具政策：哪些工具存在/可呼叫

有兩個層級至關重要：

- **工具設定檔**：`tools.profile` 和 `agents.list[].tools.profile`（基礎允許清單）
- **Provider tool profile**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **Global/per-agent tool policy**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Provider tool policy**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **Sandbox tool policy**（僅在沙箱環境下適用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

經驗法則：

- `deny` 永遠優先。
- 如果 `allow` 非空，則其他所有內容都會被視為被封鎖。
- Tool policy 是硬性終止機制：`/exec` 無法覆蓋被拒絕的 `exec` 工具。
- `/exec` 僅會變更已授權發送者的工作階段預設值；並不會授予工具存取權。
  提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

### 工具群組 (簡寫)

工具原則 (全域、代理程式、沙箱) 支援 `group:*` 項目，這些項目會展開為多個工具：

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

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有內建的 OpenClaw 工具（不包括供應商外掛）

## Elevated：僅執行的「在主機上運行」

Elevated **並不**授予額外工具；它僅影響 `exec`。

- 如果您處於沙箱模式中，`/elevated on`（或帶有 `elevated: true` 的 `exec`）會在主機上執行（可能仍需批准）。
- 使用 `/elevated full` 以跳過該工作階段的執行批准。
- 如果您已經在直接執行，提升權限實際上是一個無操作指令（仍然受限）。
- 提升權限**不**受限於技能範圍，且**不**會覆蓋工具允許/拒絕設定。
- `/exec` 與提升權限是分開的。它僅針對授權發送者調整每個工作階段的執行預設值。

閘道條件：

- 啟用方式：`tools.elevated.enabled`（以及可選的 `agents.list[].tools.elevated.enabled`）
- 發送者允許清單：`tools.elevated.allowFrom.<provider>`（以及可選的 `agents.list[].tools.elevated.allowFrom.<provider>`）

請參閱 [提升權限模式](/zh-Hant/tools/elevated)。

## 常見的「沙箱監獄」修復方法

### 「工具 X 被沙箱工具政策阻擋」

修復金鑰（擇一）：

- 停用沙箱：`agents.defaults.sandbox.mode=off` (或個別代理 `agents.list[].sandbox.mode=off`)
- 在沙箱內允許該工具：
  - 從 `tools.sandbox.tools.deny` 中移除 (或個別代理 `agents.list[].tools.sandbox.tools.deny`)
  - 或將其加入 `tools.sandbox.tools.allow` (或個別代理允許)

### "我以為這是 main，為什麼被沙箱化了？"

在 `"non-main"` 模式下，群組/頻道金鑶*並非* main。請使用主要 session 金鑶 (由 `sandbox explain` 顯示) 或將模式切換至 `"off"`。

## 另請參閱

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 完整沙箱參考 (模式、範圍、後端、映像檔)
- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 個別代理覆寫與優先順序
- [Elevated Mode](/zh-Hant/tools/elevated)
