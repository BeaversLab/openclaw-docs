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

當多個 DM 發送者共享主會話時，審核會發出警告並建議使用 **安全 DM 模式**：`session.dmScope="per-channel-peer"`（或多帳號通道使用 `per-account-channel-peer`）用於共享收件箱。
這是為了協作/共享收件箱的強化。由互不信任/對抗的操作者共享單一 Gateway 並非推薦設定；請使用獨立的 gateway（或獨立的 OS 使用者/主機）來區分信任邊界。
當配置暗示可能存在共享使用者進入流量（例如開放 DM/群組策略、已配置的群組目標，或萬用字元發送者規則）時，它還會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設是個人助理信任模型。
對於有意為之的共享使用者設定，審核建議是將所有會話沙盒化、將檔案系統存取限制在工作區範圍內，並確保個人的/私密身分或憑證不會出現於該執行時段中。
當使用小型模型（`<=300B`）且未啟用沙盒並啟用了網頁/瀏覽器工具時，它也會發出警告。
針對 webhook 進入流量，當 `hooks.token` 重複使用 Gateway 權杖、`hooks.token` 過短、`hooks.path="/"`、`hooks.defaultSessionKey` 未設定、`hooks.allowedAgentIds` 不受限制、請求 `sessionKey` 覆寫已啟用，以及啟用覆寫但未設定 `hooks.allowedSessionKeyPrefixes` 時，它會發出警告。
當沙盒模式關閉時卻配置了沙盒 Docker 設定、當 `gateway.nodes.denyCommands` 使用無效的類似模式/未知項目（僅限精確的節點指令名稱匹配，而非 shell 文字篩選）、當 `gateway.nodes.allowCommands` 明確啟用危險的節點指令、當全域 `tools.profile="minimal"` 被代理程式工具設定檔覆寫、當寫入/編輯工具已停用但 `exec` 仍可在無限制沙盒檔案系統邊界的情況下使用、當開放群組在無沙盒/工作區防護的情況下暴露執行時/檔案系統工具，以及當安裝的外掛工具可能在不嚴格的工具政策下被存取時，它也會發出警告。
它也會標記 `gateway.allowRealIpFallback=true`（若代理設定錯誤則有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器使用 Docker `bridge` 網路卻未設定 `sandbox.browser.cdpSourceRange` 時，它也會發出警告。
它也會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間連線）。
當現有的沙盒瀏覽器 Docker 容器缺少或過時的雜湊標籤（例如遷移前的容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告並建議 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未固定版本、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當通道允許清單依賴可變的名稱/電子郵件/標籤而非穩定的 ID 時（Discord、Slack、Google Chat、Microsoft Teams、Mattermost、適用範圍的 IRC 範圍），它會發出警告。
當 `gateway.auth.mode="none"` 讓 Gateway HTTP API 可在無共用的密鑰（`/tools/invoke` 加上任何已啟用的 `/v1/*` 端點）的情況下被存取時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作員覆寫；單獨啟用其中一項並不構成安全漏洞報告。
如需完整的危險參數清單，請參閱 [Security](/zh-Hant/gateway/security) 中的「Insecure or dangerous flags summary」章節。

故意的持續性發現可以使用 `security.audit.suppressions` 來接受。
每個抑制項目都會精確匹配一個 `checkId`，並且可以使用
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

被抑制的發現項目會從啟用中的 `summary` 和 `findings` 列表中移除。
JSON 輸出會將其保留在 `suppressedFindings` 下以供稽核。
當設定了抑制項目時，啟用中的輸出也會保留一個無法抑制的
`security.audit.suppressions.active` 資訊發現，以便讀者了解稽核
已被過濾。危險的設定旗標會每個發現輸出一個旗標，因此
接受一個危險旗標並不會隱藏其他啟用且共用相同
`config.insecure_or_dangerous_flags` checkId 的旗標。
因為抑制項目可以隱藏持續存在的風險，透過 agent-run shell 指令
新增或移除它們需要 exec 批准，除非 exec 已經以
`security="full"` 和 `ask="off"` 執行以用於受信任的本機自動化。

SecretRef 行為：

- `security audit` 會針對其目標路徑以唯讀模式解析支援的 SecretRefs。
- 如果 SecretRef 在目前的指令路徑中無法使用，稽核會繼續並回報 `secretDiagnostics`（而不是當機）。
- `--token` 和 `--password` 僅會為該指令叫用覆寫 deep-probe 認證；它們不會重寫設定或 SecretRef 對應。

## JSON 輸出

使用 `--json` 進行 CI/原則檢查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果結合 `--fix` 和 `--json`，輸出將包含修復動作和最終報告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 會變更什麼

`--fix` 會套用安全、確定性的補救措施：

- 將常見的 `groupPolicy="open"` 切換為 `groupPolicy="allowlist"`（包括支援管道中的帳戶變體）
- 當 WhatsApp 群組原則切換為 `allowlist` 時，會從儲存的
  `allowFrom` 檔案植入 `groupAllowFrom`，前提是該列表存在且設定尚未
  定義 `allowFrom`
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 加強 state/config 和常見敏感檔案的權限
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session
  `*.jsonl`)
- 同時也會加強從 `openclaw.json` 引用的 config include 檔案的權限
- 在 POSIX 主機上使用 `chmod`，在 Windows 上使用 `icacls` 重設

`--fix` **不會**：

- 輪換 token/密碼/API 金鑰
- 停用工具 (`gateway`, `cron`, `exec`, 等)
- 變更 gateway bind/auth/network exposure 選項
- 移除或重寫 plugins/skills

## 相關

- [CLI 參考](/zh-Hant/cli)
- [安全性稽核](/zh-Hant/gateway/security)
