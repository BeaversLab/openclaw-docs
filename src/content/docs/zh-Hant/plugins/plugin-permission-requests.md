---
summary: "請使用者核准外掛程式工具呼叫及外掛程式擁有的權限提示"
title: "外掛程式權限請求"
sidebarTitle: "權限請求"
read_when:
  - You need a plugin hook or tool to ask before a side effect runs
  - You need to configure where plugin approval prompts are delivered
  - You are deciding between optional tools, exec approvals, and plugin approvals
---

外掛程式權限請求允許外掛程式碼暫停工具呼叫或外掛程式擁有的操作，直到使用者核准或拒絕為止。它們使用閘道 `plugin.approval.*` 流程，以及處理聊天核准按鈕和 `/approve` 指令的相同核准 UI 介面。

請將外掛程式權限請求用於外掛程式/應用程式的權限。它們不會取代主機 exec 核准、選用工具允許清單，或 Codex 的原生權限審查。

## 選擇正確的閘道

挑選符合您所需決策點的閘道：

| 閘道               | 使用時機                                                           | 控制對象                                                                                     |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 選用工具           | 在使用者選擇加入之前，工具不應對模型可見。                         | 透過 `tools.allow` 的工具暴露。                                                              |
| 外掛程式權限請求   | 外掛程式掛鉤或外掛程式擁有的操作必須在執行某個動作之前進行詢問。   | 透過 `plugin.approval.*` 的執行時核准。                                                      |
| Exec 核准          | 主機指令或類似 shell 的工具需要操作員核准。                        | 主機 exec 原則及持久 exec 允許清單。                                                         |
| Codex 原生權限請求 | Codex 在原生 shell、檔案、MCP 或應用程式伺服器動作之前會進行詢問。 | Codex 應用程式伺服器或原生掛鉤核准處理，當 OpenClaw 擁有該提示時會透過外掛程式核准進行路由。 |
| MCP 核准請求       | Codex MCP 伺服器請求工具呼叫的核准。                               | 透過 OpenClaw 外掛程式核准橋接的 MCP 核准回應。                                              |

選用工具是探索時間的閘道。外掛程式權限請求是單次呼叫的閘道。當敏感工具在模型可見之前需要明確選擇加入，並且在動作執行前需要核准時，請同時使用這兩者。

## 在工具呼叫之前請求核准

大部分由外掛程式撰寫的提示應該從 `before_tool_call` 掛鉤開始。此掛鉤會在模型選擇工具之後、OpenClaw 執行它之前執行：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "deploy-policy",
  name: "Deploy Policy",
  register(api) {
    api.on("before_tool_call", async (event) => {
      if (event.toolName !== "deploy_service") {
        return;
      }

      const environment = typeof event.params.environment === "string" ? event.params.environment : "unknown";

      return {
        requireApproval: {
          title: "Deploy service",
          description: `Deploy service to ${environment}.`,
          severity: environment === "production" ? "critical" : "warning",
          allowedDecisions: environment === "production" ? ["allow-once", "deny"] : ["allow-once", "allow-always", "deny"],
          timeoutMs: 120_000,
          timeoutBehavior: "deny",
          onResolution(decision) {
            console.log(`deploy approval resolved: ${decision}`);
          },
        },
      };
    });
  },
});
```

為將要核准該動作的人員撰寫提示文字：

- 保持 `title` 簡短並聚焦於動作。閘道最多接受 80 個字元。
- 讓 `description` 具體且有界。Gateway 接受最多 256 個字元。
- 包含動作、目標和風險。不要包含不應出現在聊天核准介面上的機密、權杖或私人載荷。
- 僅對錯誤決策可能導致生產環境損壞或資料遺失的動作使用 `severity: "critical"`。
- 當對該動作的持久信任不安全時，使用 `allowedDecisions: ["allow-once", "deny"]`。

## 決策行為

OpenClaw 建立一個具有 `plugin:` ID 的待定核准，將其傳送至可用的核准介面，並等待決策。

| 決策           | 結果                                                      |
| -------------- | --------------------------------------------------------- |
| `allow-once`   | 當前呼叫繼續。                                            |
| `allow-always` | 當前呼叫繼續，且決策會傳遞給外掛程式。                    |
| `deny`         | 該呼叫被封鎖，並返回已拒絕的工具結果。                    |
| 逾時           | 除非 `timeoutBehavior` 為 `"allow"`，否則該呼叫會被封鎖。 |
| 取消           | 當執行中止時，該呼叫會被封鎖。                            |
| 無核准路由     | 該呼叫被封鎖，因為沒有連線的核准介面可以解析它。          |

`allow-always` 僅在請求的外掛程式或執行時實作了該持久性時才持久。對於普通的 `before_tool_call.requireApproval` hooks，OpenClaw 將 `allow-once` 和 `allow-always` 視為當前呼叫的核准決策，並將解析的值傳遞給 `onResolution`。如果您的外掛程式提供 `allow-always`，請記錄並精確實作它信任哪些未來的呼叫。

如果 hook 也返回 `params`，OpenClaw 僅在核准成功後應用那些參數變更。在優先級較高的 hook 請求核准後，優先級較低的 hook 仍可封鎖。

`allowedDecisions` 限制了向用戶顯示的按鈕和命令。Gateway 會拒絕對請求未提供的任何決策進行解析嘗試。

## 路由核准提示

核准提示可以在本地 UI 介面或支援核准處理的聊天頻道中解析。要將外掛程式核准提示轉發到明確的聊天目標，請配置 `approvals.plugin`：

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

`approvals.plugin` 獨立於 `approvals.exec`。啟用執行核准轉發不會路由外掛程式核准提示，啟用外掛程式核准轉發也不會變更主機執行原則。

當提示包含手動核准文字時，請使用提供的決議之一進行解析：

```text
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

請參閱 [進階執行核准](/zh-Hant/tools/exec-approvals-advanced#plugin-approval-forwarding) 以了解完整的轉發模型、同一聊天核准行為、原生通道傳送以及特定通道核准者規則。

## Codex 原生權限

Codex 原生權限提示也可以透過外掛程式核准傳送，但它們與外掛程式撰寫的掛鉤具有不同的擁有權。

- Codex 應用程式伺服器核准要求會在 Codex 審查後透過 OpenClaw 路由。
- 當啟用原生掛鉤 `permission_request` 中繼時，該中繼可以透過 `plugin.approval.request` 提出請求。
- 當 Codex 將 `_meta.codex_approval_kind` 標記為 `"mcp_tool_call"` 時，MCP 工具核准請求會透過外掛程式核准路由。

請參閱 [Codex harness 執行時期](/zh-Hant/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations) 以了解 Codex 特定的行為和後援規則。

## 疑難排解

**工具顯示外掛程式核准不可用。** 沒有核准 UI 或設定的核准路由接受了此請求。請連線具有核准功能的用戶端、使用支援同一聊天 `/approve` 的通道，或設定 `approvals.plugin`。

**`allow-always` 出現，但下一次呼叫又會再次提示。** 一般的外掛程式核准流程不會自動保存任意掛鉤的信任。請在 `onResolution("allow-always")` 之後，在您的外掛程式中保存外掛程式擁有的信任，或僅提供 `allow-once` 和 `deny`。

**`/approve` 拒絕決議。** 該請求限制了 `allowedDecisions`。請使用提示中列出的決議之一。

**Slack、Discord、Telegram 或 Matrix 提示與執行核准的路由不同。** 外掛程式核准和執行核准使用分開的設定，且可能使用不同的授權檢查。請驗證 `approvals.plugin` 和通道的外掛程式核准支援，而不僅僅是檢查 `approvals.exec`。

## 相關

- [Plugin hooks](/zh-Hant/plugins/hooks#tool-call-policy)
- [Building plugins](/zh-Hant/plugins/building-plugins#registering-agent-tools)
- [Advanced exec approvals](/zh-Hant/tools/exec-approvals-advanced#plugin-approval-forwarding)
- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)
