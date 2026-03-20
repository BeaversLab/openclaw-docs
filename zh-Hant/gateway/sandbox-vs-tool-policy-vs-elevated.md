---
title: 沙盒 vs 工具策略 vs 提權
summary: "為什麼工具被封鎖：沙盒運行時、工具允許/拒絕策略以及提權執行閘門"
read_when: "您遇到「沙盒監獄」或看到工具/提權被拒絕，並想要更改確切的配置鍵時。"
status: active
---

# 沙盒 vs 工具策略 vs 提權

OpenClaw 具有三個相關（但不同）的控制項：

1. **沙盒** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 決定 **工具運行的位置**（Docker vs 主機）。
2. **工具策略** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 決定 **哪些工具可用/被允許**。
3. **提權** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一個 **僅執行的緊急出口**，用於在您處於沙盒中時在主機上運行。

## 快速除錯

使用檢查器查看 OpenClaw _實際上_ 在做什麼：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它會列印：

- 有效的沙盒模式/範圍/工作區存取權
- 階段目前是否處於沙盒中（main vs non-main）
- 有效的沙盒工具允許/拒絕（以及它是否來自 agent/global/default）
- 提權閘門和修復金鑰路徑

## 沙盒：工具運行的位置

沙盒機制由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有內容都在主機上運行。
- `"non-main"`：只有非 main 階段會被沙盒化（群組/頻道常見的「驚喜」）。
- `"all"`：所有內容都會被沙盒化。

請參閱 [沙盒機制](/zh-Hant/gateway/sandboxing) 以了解完整的矩陣（範圍、工作區掛載、映像檔）。

### Bind mounts（安全快速檢查）

- `docker.binds` _穿透_ 沙盒檔案系統：您掛載的任何內容都會以您設定的模式（`:ro` 或 `:rw`）在容器內可見。
- 如果您省略模式，預設值為讀寫；對於來源/密碼，建議優先使用 `:ro`。
- `scope: "shared"` 會忽略每個 agent 的繫結（僅套用全域繫結）。
- 繫結 `/var/run/docker.sock` 實際上是將主機控制權交給沙盒；僅在有意為之的情況下執行此操作。
- 工作區存取權 (`workspaceAccess: "ro"`/`"rw"`) 獨立於繫結模式。

## 工具原則：哪些工具存在/可呼叫

有兩個層級很重要：

- **工具設定檔**：`tools.profile` 和 `agents.list[].tools.profile`（基礎允許清單）
- **提供者工具設定檔**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全域/每個代理程式的工具原則**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供者工具原則**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具原則**（僅在沙箱化時適用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

經驗法則：

- `deny` 永遠優先。
- 如果 `allow` 不為空，其他所有內容都會被視為已封鎖。
- 工具原則是硬性停止：`/exec` 無法覆寫被拒絕的 `exec` 工具。
- `/exec` 僅變更已授權傳送者的預設工作階段；它不會授予工具存取權。
  提供者工具金鑰接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

### 工具群組（簡寫）

工具原則（全域、代理程式、沙箱）支援 `group:*` 項目，這些項目會擴充為多個工具：

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

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有內建的 OpenClaw 工具（不包括供應商插件）

## 提升權限：僅限執行「在主機上執行」

提升權限**不會**授予額外的工具；它只影響 `exec`。

- 如果您處於沙盒中，`/elevated on`（或帶有 `elevated: true` 的 `exec`）會在主機上執行（可能仍需核准）。
- 使用 `/elevated full` 略過該工作階段的執行核准。
- 如果您已經在直接執行，提升權限實際上是一個無操作（仍受閘道限制）。
- 提升權限**不**受限於技能範圍，且**不會**覆寫工具允許/拒絕設定。
- `/exec` 與提升權限是分開的。它僅針對授權的發送者調整每個工作階段的執行預設值。

閘道：

- 啟用：`tools.elevated.enabled`（以及選用的 `agents.list[].tools.elevated.enabled`）
- 發送者允許清單：`tools.elevated.allowFrom.<provider>`（以及選用的 `agents.list[].tools.elevated.allowFrom.<provider>`）

請參閱 [提升權限模式](/zh-Hant/tools/elevated)。

## 常見的「沙盒監獄」修復方法

### 「工具 X 被沙盒工具政策封鎖」

修復金鑰（選擇一項）：

- 停用沙盒：`agents.defaults.sandbox.mode=off`（或每個代理的 `agents.list[].sandbox.mode=off`）
- 在沙盒內允許該工具：
  - 將其從 `tools.sandbox.tools.deny` 中移除（或每個代理的 `agents.list[].tools.sandbox.tools.deny`）
  - 或將其加入 `tools.sandbox.tools.allow`（或每個代理的允許設定）

### 「我以為這是 main，為什麼被沙盒化了？」

在 `"non-main"` 模式下，群組/頻道金鑰並非 main。請使用主工作階段金鑰（由 `sandbox explain` 顯示），或將模式切換至 `"off"`。

import en from "/components/footer/en.mdx";

<en />
