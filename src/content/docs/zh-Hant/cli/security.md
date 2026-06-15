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

- 安全性指南：[Security](/zh-Hant/gateway/security)

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

當多個 DM 發送者共享主會話時，審計會發出警告並建議使用 **安全 DM 模式**：針對共享收件匣使用 `session.dmScope="per-channel-peer"`（或針對多帳號頻道使用 `per-account-channel-peer`）。
這旨在強化協作/共享收件匣的安全性。由互不信任或對抗的操作者共享單一 Gateway 並非建議的設定；應使用獨立的 Gateway（或獨立的 OS 使用者/主機）來分隔信任邊界。
當配置顯示可能存在共享使用者入口（例如開放 DM/群組原則、已配置的群組目標或萬用字元發送者規則）時，它還會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設屬於個人助理信任模型。
對於刻意的共享使用者設定，審計建議將所有會話沙盒化、保持檔案系統存取僅限於工作區範圍，並確保個人/私密身分或憑證不會出現於該執行時環境中。
當小型模型（`<=300B`）在未沙盒化的情況下使用，並啟用了 Web/瀏覽器工具時，它也會發出警告。
對於 Webhook 入口，啟動時會記錄一個非致命的安全性警告，且審計會標記 `hooks.token` 重複使用作用中 Gateway 共用金鑰驗證值的情況，包括 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 和 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。它還會在以下情況發出警告：

- `hooks.token` 過短
- `hooks.path="/"`
- `hooks.defaultSessionKey` 未設定
- `hooks.allowedAgentIds` 無限制
- 請求 `sessionKey` 覆寫已啟用
- 在未設定 `hooks.allowedSessionKeyPrefixes` 的情況下啟用了覆寫

如果 Gateway 密碼驗證僅在啟動時提供，請將相同的值傳遞給 `openclaw security audit --auth password --password <password>`，以便審計能將其與 `hooks.token` 進行比對。
執行 `openclaw doctor --fix` 以輪換已持久化並重複使用的 `hooks.token`，然後更新外部掛鉤發送者以使用新的掛鉤權杖。

當沙盒模式關閉時配置了沙盒 Docker 設定、`gateway.nodes.denyCommands` 使用無效的類似模式/未知項目（僅精確節點指令名稱匹配，而非 shell 文字篩選）、`gateway.nodes.allowCommands` 明確啟用危險的節點指令、全域 `tools.profile="minimal"` 被代理工具設定檔覆寫、寫入/編輯工具已停用但 `exec` 在無限制的沙盒檔案系統邊界下仍然可用、開放群組在無沙盒/工作區防護下暴露執行時/檔案系統工具，以及已安裝的外掛工具在寬鬆的工具政策下可能被存取時，它也會發出警告。
它也會標記 `gateway.allowRealIpFallback=true`（若代理設定錯誤則有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器使用未設定 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 網路時，它也會發出警告。
它也會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間加入）。
當現有的沙盒瀏覽器 Docker 容器缺少或過期的雜湊標籤時（例如遷移前容器缺少 `openclaw.browserConfigEpoch`），它也會發出警告並建議執行 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未固定、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當頻道允許清單依賴可變更的名稱/電子郵件/標籤而非穩定的 ID 時（適用於 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 範圍），它會發出警告。
當 `gateway.auth.mode="none"` 未設定共用密鑰（`/tools/invoke` 加上任何已啟用的 `/v1/*` 端點）而導致 Gateway HTTP API 可被存取時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作員覆寫；單獨啟用其中一項並非安全弱點報告。
如需完整的危險參數清單，請參閱 [Security](/zh-Hant/gateway/security) 中的「不安全或危險旗標摘要」區段。

可以接受有意留存的發現，方法是使用 `security.audit.suppressions`。
每個抑制項都匹配一個精確的 `checkId`，並且可以使用
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

被抑制的發現會從作用中的 `summary` 和 `findings` 列表中移除。
JSON 輸出會將其保留在 `suppressedFindings` 下以供稽核。
當配置了抑制項時，作用中的輸出也會保留一個無法抑制的
`security.audit.suppressions.active` 資訊發現，以便讀者可以判斷稽核
是否已經過濾。危險的配置旗標會每個發現輸出一個旗標，因此
接受一個危險旗標不會隱藏其他共用同一個
`config.insecure_or_dangerous_flags` checkId 的已啟用旗標。
因為抑制項可能會隱藏持續存在的風險，所以透過 agent-run shell 命令
新增或移除它們需要 exec 批准，除非 exec 已經在
`security="full"` 和 `ask="off"` 下運行以進行受信任的本機自動化。

SecretRef 行為：

- `security audit` 會以唯讀模式解析其目標路徑中支援的 SecretRefs。
- 如果 SecretRef 在目前的命令路徑中無法使用，稽核會繼續並回報 `secretDiagnostics`（而不是當機）。
- `--token` 和 `--password` 僅針對該命令叫用覆寫 deep-probe 驗證；它們不會重寫配置或 SecretRef 對應。

## JSON 輸出

使用 `--json` 進行 CI/原則檢查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果結合 `--fix` 和 `--json`，輸出會包含修復動作和最終報告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 變更了什麼

`--fix` 會套用安全、確定性的補救措施：

- 將常見的 `groupPolicy="open"` 翻轉為 `groupPolicy="allowlist"`（包括支援管道中的帳戶變體）
- 當 WhatsApp 群組原則翻轉為 `allowlist` 時，會從
  儲存的 `allowFrom` 檔案植入 `groupAllowFrom`，前提是該列表存在且配置尚未
  定義 `allowFrom`
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 加嚴 state/config 和常見敏感檔案的權限
  (`credentials/*.json`、`auth-profiles.json`、`sessions.json`、session
  `*.jsonl`)
- 同時也加嚴 `openclaw.json` 中引用的設定 include 檔案
- 在 POSIX 主機上使用 `chmod`，在 Windows 上重設 `icacls`

`--fix` **不會**：

- 輪換 token/密碼/API 金鑰
- 停用工具 (`gateway`、`cron`、`exec` 等)
- 變更 gateway bind/auth/網路暴露選項
- 移除或重寫插件/技能

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [安全性稽核](/zh-Hant/gateway/security)
