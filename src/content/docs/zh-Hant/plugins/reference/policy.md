---
summary: "為工作區一致性新增由政策支援的 doctor 檢查。"
read_when:
  - You are installing, configuring, or auditing the policy plugin
title: "政策外掛程式"
---

# 政策外掛程式

為工作區一致性新增由政策支援的 doctor 檢查。

## 發布

- 套件：`@openclaw/policy`
- 安裝途徑：包含於 OpenClaw

## Surface

plugin

{/* openclaw-plugin-reference:manual-start */}

## 行為

Policy 外掛程式為受 Policy 管理的 OpenClaw 設定和受控管的工作區宣告提供 Doctor 健康檢查。Policy 目前涵蓋通道合規性、受控工具中繼資料、MCP 伺服器狀態、模型提供者狀態、私人網路存取狀態、Gateway 暴露狀態、Agent 工作區/工具狀態、設定的全域/Per-Agent 工具狀態、設定的沙盒執行時期狀態、入口/通道存取狀態，以及 OpenClaw 設定祕密提供者/驗證設定檔狀態。

Policy 將撰寫的需求儲存在 `policy.jsonc` 中，觀察現有的 OpenClaw 設定和工作區宣告作為證據，並透過 `openclaw policy check` 和 `openclaw doctor --lint` 回報偏移。乾淨的 Policy 檢查會輸出 Policy、證據、發現結果和認證雜湊，供操作員記錄以供稽核。

`openclaw policy compare --baseline <file>` 會比較一個 Policy 檔案與另一個 Policy 檔案。這僅限於設定層級的合規性：它使用 Policy 規則中繼資料來驗證受檢查的 Policy 並未遺失或弱於撰寫的基準，且它不會檢查執行時期狀態、憑證或祕密值。

工具狀態規則可以要求核准的設定檔、僅限工作區的檔案系統工具、受限的 exec security/ask/host 設定、停用的提權模式、精確的 `alsoAllow` 項目，以及必要的工具拒絕項目。證據會記錄新增的 `alsoAllow` 項目，因為它們可能會擴大有效的工具狀態。這些檢查僅觀察設定合規性；它們不會讀取執行時期核准狀態或新增執行時期強制執行。

沙盒狀態規則可以要求核准的沙盒模式/後端、拒絕主機容器網路、拒絕容器命名空間聯結、要求唯讀容器掛載、拒絕容器執行時期通訊端掛載和無限制的容器設定檔，以及要求沙盒瀏覽器 CDP 來源範圍。這些檢查僅觀察設定合規性；它們不會讀取執行時期核准狀態、檢查即時容器，或新增執行時期強制執行。

`scopes.<scopeName>` 下的命名原則範圍可以為其列出的選擇器新增更嚴格的標準原則部分。`agentIds` 支援 `tools`、`agents.workspace` 和 `sandbox`；`channelIds` 支援 `ingress.channels`。未在 `agents.list[]` 中明確列出的執行時代理 ID 將針對繼承的全域/預設姿態進行檢查，而不是在不提供證據的情況下靜默通過。`policy.jsonc` 中存在的每個範圍都必須對其選擇器有效且可執行。疊加規則是額外的聲明，因此它們不會削弱頂層原則，並且當相同的觀察配置違反兩個範圍時，可以產生自己的發現。

{/* openclaw-plugin-reference:manual-end */}

## 相關文件

- [policy](/zh-Hant/cli/policy)
