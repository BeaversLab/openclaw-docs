---
title: Sandbox vs Tool Policy vs Elevated
summary: "Why a tool is blocked: sandbox runtime, tool allow/deny policy, and elevated exec gates"
read_when: "You hit 'sandbox jail' or see a tool/elevated refusal and want the exact config key to change."
status: active
---

# Sandbox vs Tool Policy vs Elevated

OpenClaw 有三個相關（但不同）的控制項：

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 決定 **工具的執行位置**（Docker 或 host）。
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 決定 **哪些工具可用/被允許**。
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一個 **僅限執行的逃逸方法**，讓您在沙盒環境中於主機上執行操作。

## 快速除錯

使用檢查器來查看 OpenClaw _實際上_ 在做什麼：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它會列印：

- 有效的沙盒模式/範圍/工作區存取權
- 目前工作階段是否處於沙盒環境中（main vs non-main）
- 有效的沙盒工具允許/拒絕設定（以及它是否來自 agent/global/default）
- 提升權限閘門與修復金鑰路徑

## Sandbox：工具的執行位置

沙盒機制由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有操作都在主機上執行。
- `"non-main"`：只有非主要工作階段會被沙盒化（群組/頻道的常見「驚喜」）。
- `"all"`：所有操作都會被沙盒化。

請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解完整的矩陣（範圍、工作區掛載、映像檔）。

### Bind mounts（安全性快速檢查）

- `docker.binds` _穿透_ 沙盒檔案系統：無論您掛載什麼，都會以您設定的模式（`:ro` 或 `:rw`）顯示在容器內部。
- 如果省略模式，預設為讀寫；對於來源/機密，建議優先使用 `:ro`。
- `scope: "shared"` 會忽略每個 agent 的掛載（僅套用全域掛載）。
- 掛載 `/var/run/docker.sock` 實際上是將主機控制權交給沙盒；請務必有意識地進行此操作。
- 工作區存取 (`workspaceAccess: "ro"`/`"rw"`) 與綁定模式無關。

## 工具政策：哪些工具存在/可呼叫

有兩層重要：

- **工具設定檔 (Tool profile)**：`tools.profile` 和 `agents.list[].tools.profile` (基礎允許清單)
- **供應商工具設定檔**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全域/每代理程式工具政策**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **供應商工具政策**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具政策** (僅在沙箱化時適用)：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

經驗法則：

- `deny` 永遠優先。
- 如果 `allow` 不為空，其他所有項目都會被視為已封鎖。
- 工具政策是強制終止點：`/exec` 無法覆寫被拒絕的 `exec` 工具。
- `/exec` 僅變更授權傳送者的預設工作階段；它不會授予工具存取權。
  供應商工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

### 工具群組 (簡稱)

工具政策 (全域、代理程式、沙箱) 支援 `group:*` 項目，這些項目會擴展為多個工具：

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

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有內建的 OpenClaw 工具（排除提供者外掛程式）

## 提升權限：僅執行「在主機上執行」

提升權限並**不**會授予額外的工具；它只會影響 `exec`。

- 如果您在沙箱中，`/elevated on`（或帶有 `elevated: true` 的 `exec`）將在主機上執行（可能仍需核准）。
- 使用 `/elevated full` 以跳過該階段的執行核准。
- 如果您已直接執行，提升權限實際上為無操作（但仍受閘門限制）。
- 提升權限並非以技能為範圍，且**不**會覆蓋工具允許/拒絕設定。
- `/exec` 與提升權限分開。它僅針對已授權的發送者調整各階段的執行預設值。

閘門：

- 啟用：`tools.elevated.enabled`（以及可選的 `agents.list[].tools.elevated.enabled`）
- 發送者允許清單：`tools.elevated.allowFrom.<provider>`（以及可選的 `agents.list[].tools.elevated.allowFrom.<provider>`）

請參閱 [提升權限模式](/zh-Hant/tools/elevated)。

## 常見的「沙箱監獄」修復方法

### 「工具 X 被沙箱工具政策封鎖」

修復金鑰（選擇一項）：

- 停用沙箱：`agents.defaults.sandbox.mode=off`（或每個代理程式的 `agents.list[].sandbox.mode=off`）
- 在沙箱內允許該工具：
  - 將其從 `tools.sandbox.tools.deny` 移除（或每個代理程式的 `agents.list[].tools.sandbox.tools.deny`）
  - 或將其新增至 `tools.sandbox.tools.allow`（或每個代理程式的允許設定）

### 「我以為這是 main，為什麼在沙箱中？」

在 `"non-main"` 模式下，群組/頻道金鑰並非 main。使用 main 階段金鑰（由 `sandbox explain` 顯示）或將模式切換至 `"off"`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
