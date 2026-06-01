---
summary: "針對各個代理程式的策略外掛層，疊加在全域策略規則之上。"
read_when:
  - You are designing per-agent policy requirements
  - You need to distinguish tool posture policy from workspace policy
  - You are configuring stricter policy for one named agent
title: "代理程式範圍的策略疊加"
---

# 代理程式範圍的策略疊加

OpenClaw 策略支援全域需求，以及針對明確的執行時代理程式 ID 的更嚴格需求。某些部署需要其中一個代理程式使用比其他代理程式更嚴謹的工作區和工具姿態，但部署層級的規則不應強迫所有代理程式都使用相同的姿態。

本頁面描述代理程式範圍的疊加模型。欄位參考保留於
[`openclaw policy`](/zh-Hant/cli/policy)。

## 設計目標

- 將全域策略作為部署基準。
- 允許具名的代理程式新增更嚴格的需求，而不削弱全域規則。
- 在證據可歸因於代理程式的地方，重複使用現有的策略區段形狀。
- 避免將 `agents.workspace` 變成第二套工具權限系統。
- 在證據可對應至代理程式之前，將僅限全域的檢查保持在全域。

## 形狀

使用 `scopes.<scopeName>` 作為具目的命名的代理程式策略範圍。每個
範圍會列出其套用的執行時期 `agentIds`，然後重複使用一般的
頂層策略區段語法，其中區段證據可歸因於
這些代理程式。最初發布的範圍區段為 `tools` 和
`agents.workspace`；沙箱和 ingress 則不在此 PR 中，未來可在這些
策略 PR 併入且其證據攜帶代理程式身分後，加入同一個容器。範圍欄位清單由策略規則元資料支援，該資料會
記錄每個欄位的嚴格性語意，以供日後的策略檔案遵循使用。

```jsonc
{
  "tools": {
    "denyTools": ["process"],
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
    },
  },
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
      "tools": {
        "profiles": { "allow": ["minimal", "messaging"] },
        "fs": { "requireWorkspaceOnly": true },
        "exec": {
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
          "allowHosts": ["sandbox"],
        },
        "elevated": { "allow": false },
        "alsoAllow": { "expected": ["message", "read"] },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

`agents.workspace` 仍是現有的全 Agent 工作區基準。
`scopes.<scopeName>` 是一個範圍疊加層，而非全域策略的
替代品。範圍名稱僅供描述；匹配使用 `agentIds`，而非
顯示名稱。它刻意包含正常的區段名稱，而非專為
各 Agent 訂製的迷你語法。
存在於 `policy.jsonc` 中的每個範圍都必須有效且可強制執行。在本
PR 中，唯一支援的選擇器是 `agentIds`，且它僅支援 `tools.*`
和 `agents.workspace.*`。

## 分層語意

策略評估是累加的：

1. 頂層策略適用於所有相符的證據。
2. 現有的 `agents.workspace` 適用於預設值和每個列出的 Agent。
3. `scopes.<scopeName>` 適用於 `agentIds` 中每個標準化執行
   階段 ID 的證據。
4. 多個範圍區塊可能以同一個 Agent 為目標，當它們管理
   不同的欄位時，或當根據策略元資料，同一欄位的較後值具有同等或
   更嚴格的限制時。
5. 具名 Agent 的疊加層可以收緊策略，但它不能使全域
   違規變得可接受。

如果全域和 Agent 範圍的規則都失敗，發現結果應指向被違反的
規則：

```text
oc://policy.jsonc/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/agents/workspace/allowedAccess
```

這樣即使廣泛的工具姿勢、具名 Agent 的工具姿勢和工作區姿勢觀察到
相同的設定欄位，也能將其作為獨立要求進行稽核。

諸如 `tools.alsoAllow.expected` 的精確清單宣告會將設定的清單
與預期的清單進行比較，並回報缺少的預期項目和非預期的
額外項目。這適用於累加式姿勢，例如 `alsoAllow`，其中
一個額外項目可能會使 Agent 超出其審查後的角色。

## 策略和設定分層

疊加層模型將策略的編寫位置與觀察 OpenClaw 設定
的位置分開：

| 策略範圍                                | 觀察到的設定                           | 適用於                     | 範例結果                                                                       |
| --------------------------------------- | -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| 頂層 `tools.*`                          | 全域 `tools.*` 和繼承的 Agent 工具姿勢 | 所有使用相符姿勢的 Agent   | 除非全域策略允許，否則拒絕每個 Agent 的 `gateway` exec host。                  |
| 頂層 `tools.*`                          | `agents.list[].tools.*` 覆寫           | 任何具有覆寫的代理程式     | 標記一個將 `tools.exec.host` 覆寫為未核准值的代理程式。                        |
| `scopes.<scopeName>.tools.*`            | 比對 `agents.list[]` 項目與繼承的姿態  | 僅該具名代理程式           | 讓大多數代理程式使用 `node` 執行主機，而其中一個代理程式必須僅使用 `sandbox`。 |
| `agents.workspace`                      | 預設值與每個列出的代理程式工作區姿態   | 預設值與所有列出的代理程式 | 要求每個代理程式的工作區存取權都必須是 `none` 或 `ro`。                        |
| `scopes.<scopeName>.agents.workspace.*` | 比對 `agents.list[]` 工作區姿態        | 僅該具名代理程式           | 要求其中一個代理程式為唯讀，而不要求 `main` 亦然。                             |

個別代理程式的覆寫是累加的。具名代理程式規則可以比頂層規則更嚴格，但它無法使全域違規變為可接受。對於允許清單規則，當全域規則與具名代理程式覆寫同時存在時，實際允許的集合是這兩者的交集。

例如，如果頂層 `tools.exec.allowHosts` 允許 `["sandbox", "node"]`，而 `scopes.release-agent-lockdown.tools.exec.allowHosts` 僅允許 `["sandbox"]`，則當其有效執行主機為 `node` 時，`release-agent` 會失敗；但另一個代理程式仍可透過 `node` 通過。

## 工具姿態與工作區姿態

工具姿態隸屬於 `tools` 之下，因為它描述的是設定可能暴露的工具行為。現有的 `tools.*` 原則會同時觀察全域 `tools.*` 設定與個別代理程式的 `agents.list[].tools.*` 覆寫。

工作區姿態隸屬於 `workspace` 之下，因為它描述的是沙箱模式與工作區存取權。工作區部分不應擴展為一般工具原則命名空間。如果某個代理程式需要更嚴格的工具限制才能使其工作區姿態具有意義，請將這些限制置於同一個代理程式覆寫中的 `scopes.<scopeName>.tools` 之下。

對於受限發行代理程式，預期的區分方式為：

```jsonc
{
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": { "allowedAccess": ["none", "ro"] },
      },
      "tools": {
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

## 區段資格

只有在策略證據攜帶代理程式 ID，或可以在無需猜測的情況下歸因於某個代理程式時，才應新增代理程式範圍的區段。

| 區段        | 初始代理程式範圍狀態 | 原因                                                     |
| ----------- | -------------------- | -------------------------------------------------------- |
| `workspace` | 包含                 | 代理程式沙箱/工作區證據已具備代理程式身分識別。          |
| `tools`     | 包含                 | 工具姿態證據包含全域和每個代理程式的工具設定。           |
| `sandbox`   | 管線後續處理         | 在沙箱姿態 PR 落地且證據可設定範圍之前，請先排除。       |
| `ingress`   | 管線後續處理         | 在入口/通道姿態隨代理程式歸因落地之前，請先排除。        |
| `models`    | 對應時包含           | 選取的模型參照可特定於代理程式。                         |
| `mcp`       | 對應時包含           | 僅當 MCP 伺服器證據可歸因於代理程式時使用。              |
| `auth`      | 延後                 | 除非代理程式綁定明確，否則驗證設定檔中繼資料為設定目錄。 |
| `channels`  | 延後                 | 在路由設定範圍之前，通道提供者姿態為部署層級。           |
| `gateway`   | 保持全域             | 閘道暴露/驗證/http 姿態為程序層級。                      |
| `network`   | 保持全域             | 私人網路 SSRF 姿態為執行時層級。                         |
| `secrets`   | 先保持全域           | 除非參照已歸因於代理程式，否則秘密提供者姿態為共用。     |

## 相容性

此實作為增量式：

- 保持所有現有的頂層策略欄位有效；
- 保持 `agents.workspace` 語意不變；
- 在評估範圍規則之前驗證 `scopes`；
- 在其證據和策略合約實作之前，明確拒絕不支援的範圍區段；
- 不要將頂層 `tools.requireMetadata` 重新解讀為代理程式範圍，因為
  工具中繼資料描述的是已宣告的工作區工具目錄；
- 當存在任何範圍規則時，將代理程式範圍的證據包含在證明雜湊中。

這可讓廣泛的工具姿態維持為頂層策略合約，同時讓具名的
代理程式新增更嚴格的可觀察宣告，而不會削弱全域基準。
