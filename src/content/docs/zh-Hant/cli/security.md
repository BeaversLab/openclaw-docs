---
summary: "CLI 參考資料，用於 `openclaw security`（稽核並修正常見的安全性問題）"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe "fix" suggestions (permissions, tighten defaults)
title: "安全性"
---

# `openclaw security`

安全性工具（稽核 + 可選修復）。

相關：

- 安全性指南：[安全性](/zh-Hant/gateway/security)

## 稽核

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

單純的 `security audit` 僅停留在冷設定/檔案系統/唯讀路徑上。預設情況下，它不會探索外掛程式執行時期安全性收集器，因此例行稽核不會載入每個已安裝的外掛程式執行時期。使用 `--deep` 以包含盡力的即時 Gateway 探測以及外掛程式擁有的安全性稽核收集器；當明確的內部呼叫者已經具備適當的執行時期範圍時，也可以選擇加入這些外掛程式擁有的收集器。

當多個 DM 發送者共用主會話時，審核會發出警告並建議使用 **安全 DM 模式**：對於共用收件箱，使用 `session.dmScope="per-channel-peer"`（或對於多帳戶頻道使用 `per-account-channel-peer`）。
這是為了加強協作/共用收件箱的安全性。由互不信任或對立的操作員共用單一 Gateway 不是一種建議的設定；請使用獨立的 gateway（或獨立的 OS 使用者/主機）來分割信任邊界。
當配置暗示可能存在共用使用者入口（例如開放 DM/群組策略、已配置的群組目標或萬用字元發送者規則）時，它還會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設採用個人助理信任模型。
對於有意為之的共用使用者設定，審核建議將所有會話沙盒化，保持檔案系統存取僅限於工作區範圍，並確保個人/私人身份或憑證不出現於該執行時間中。
當在未沙盒化且啟用了網頁/瀏覽器工具的情況下使用小型模型（`<=300B`）時，它也會發出警告。
對於 webhook 入口，它在以下情況發出警告：

- `hooks.token` 重複使用現有的 Gateway 共用金鑰驗證值（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）
- `hooks.token` 過短
- `hooks.path="/"`
- `hooks.defaultSessionKey` 未設定
- `hooks.allowedAgentIds` 不受限制
- 請求 `sessionKey` 覆寫已啟用
- 在沒有 `hooks.allowedSessionKeyPrefixes` 的情況下啟用了覆寫

如果 Gateway 密碼驗證僅在啟動時提供，請將相同的值傳遞給 `openclaw security audit --auth password --password <password>`，以便審核可以將其與 `hooks.token` 進行比對。
密碼模式重用是相容性的審核發現；請輪換其中一個金鑰，而不是期望 Gateway 啟動時拒絕該配置。

當沙盒模式關閉時配置了沙盒 Docker 設定，當 `gateway.nodes.denyCommands` 使用無效的類模式/未知條目（僅精確匹配節點指令名稱，而非 shell 文字過濾），當 `gateway.nodes.allowCommands` 明確啟用危險的節點指令，當全域 `tools.profile="minimal"` 被代理工具設定檔覆蓋，當寫入/編輯工具已停用但 `exec` 仍可在無限制的沙盒檔案系統邊界下使用，當開放群組暴露執行時/檔案系統工具而無沙盒/工作區防護，以及當已安裝的外掛工具可能在寬鬆的工具政策下被存取時，它也會發出警告。
它也會標記 `gateway.allowRealIpFallback=true`（若代理設定錯誤，有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器使用沒有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 網路時，它也會發出警告。
它也會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間加入）。
當現有的沙盒瀏覽器 Docker 容器缺少/過期的雜湊標籤（例如遷移前的容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告並建議 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未固定、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當頻道允許清單依賴可變的名稱/電子郵件/標籤而非穩定的 ID 時（適用於 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 範圍），它會發出警告。
當 `gateway.auth.mode="none"` 使 Gateway HTTP API 在無共用密鑰（`/tools/invoke` 加上任何已啟用的 `/v1/*` 端點）的情況下可存取時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作員覆寫；僅啟用其中一項本身並非安全弱點報告。
若要查看完整的危險參數清單，請參閱 [Security](/zh-Hant/gateway/security) 中的「不安全或危險旗標摘要」一節。

可接受的持續性發現可以透過 `security.audit.suppressions` 來接受。
每個抑制項都會符合精確的 `checkId`，並且可以透過
`titleIncludes` 和/或 `detailIncludes` 不區分大小寫的子字串進行縮小範圍：

```json
{
  "security": {
    "audit": {
      "suppressions": [
        {
          "checkId": "plugins.tools_reachable_permissive_policy",
          "detailIncludes": "Enabled extension plugins: gbrain",
          "reason": "trusted local operator plugin"
        }
      ]
    }
  }
}
```

被抑制的發現會從作用中的 `summary` 和 `findings` 清單中移除。
JSON 輸出會將其保留在 `suppressedFindings` 下以供稽核。
當設定抑制項時，作用中輸出也會保留一個無法抑制的
`security.audit.suppressions.active` 資訊發現，以便讀者知道稽核
已被過濾。危險的設定旗標每個發現會發出一個旗標，因此
接受一個危險旗標並不會隱藏其他共用
相同 `config.insecure_or_dangerous_flags` checkId 的已啟用旗標。
因為抑制項可以隱藏持續性的風險，透過
agent-run shell 指令新增或移除它們需要執行核准，除非 exec 已經
以 `security="full"` 和 `ask="off"` 執行以進行受信任的本機自動化。

SecretRef 行為：

- `security audit` 會針對其目標路徑以唯讀模式解析支援的 SecretRef。
- 如果 SecretRef 在目前指令路徑中無法使用，稽核會繼續並回報 `secretDiagnostics`（而不是當機）。
- `--token` 和 `--password` 僅針對該指令叫用覆寫 deep-proobe 認證；它們不會重寫設定或 SecretRef 對應。

## JSON 輸出

使用 `--json` 進行 CI/原則檢查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果結合 `--fix` 和 `--json`，輸出會同時包含修正動作和最終報告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 會變更什麼

`--fix` 會套用安全、確定性的補救措施：

- 將常見的 `groupPolicy="open"` 翻轉為 `groupPolicy="allowlist"`（包括支援頻道中的帳戶變體）
- 當 WhatsApp 群組原則翻轉為 `allowlist` 時，如果該清單存在且設定尚未
  定義 `allowFrom`，則會從儲存的
  `allowFrom` 檔案播種 `groupAllowFrom`
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 加強狀態/配置和常見敏感性檔案的權限
  (`credentials/*.json`、`auth-profiles.json`、`sessions.json`、工作階段
  `*.jsonl`)
- 也會加強 `openclaw.json` 中參考的配置引入檔案之權限
- 在 POSIX 主機上使用 `chmod` 並在 Windows 上重設 `icacls`

`--fix` **不會**：

- 輪替 Token/密碼/API 金鑰
- 停用工具 (`gateway`、`cron`、`exec` 等)
- 變更閘道綁定/驗證/網路暴露選項
- 移除或重寫外掛/技能

## 相關

- [CLI 參考](/zh-Hant/cli)
- [安全性稽核](/zh-Hant/gateway/security)
