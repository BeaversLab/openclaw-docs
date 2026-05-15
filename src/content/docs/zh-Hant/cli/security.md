---
summary: "CLI 參考資料，用於 `openclaw security`（稽核並修復常見的安全性陷阱）"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe "fix" suggestions (permissions, tighten defaults)
title: "安全性"
---

# `openclaw security`

安全性工具（稽核 + 可選修復）。

相關：

- 安全指南：[安全性](/zh-Hant/gateway/security)

## 稽核

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

普通的 `security audit` 停留在冷配置/檔案系統/唯讀路徑上。預設情況下，它不會發現外掛程式執行時期安全性收集器，因此例行稽核不會載入每個已安裝的外掛程式執行時期。使用 `--deep` 以包含盡力而為的即時 Gateway 探查和外掛程式擁有的安全性稽核收集器；當明確的內部呼叫者已經具有適當的執行時期範圍時，也可以選擇加入這些外掛程式擁有的收集器。

當多個 DM 發送者共享主會話時，稽核會發出警告並建議使用 **安全 DM 模式**：對於共享收件箱，請使用 `session.dmScope="per-channel-peer"`（若是多帳號通道則使用 `per-account-channel-peer`）。
這是針對協作/共享收件箱的加固措施。由互不信任/對立的操作者共享單一 Gateway 並非建議的設定；請使用不同的 Gateway（或不同的 OS 使用者/主機）來區分信任邊界。
當配置暗示可能存在共享使用者入口（例如開放 DM/群組策略、已設定的群組目標，或萬用字元發送者規則）時，它也會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設是個人助理信任模型。
對於有意義的共享使用者設定，稽核建議將所有會話沙盒化、將檔案系統存取限制在工作區範圍內，並確保個人/私密身分識別或憑證不會出現於該執行環境中。
當小型模型（`<=300B`）在未啟用沙盒且啟用了網路/瀏覽器工具的情況下使用時，它也會發出警告。
對於 webhook 入口，當 `hooks.token` 重複使用 Gateway 權杖、`hooks.token` 過短、`hooks.path="/"`、`hooks.defaultSessionKey` 未設定、`hooks.allowedAgentIds` 不受限制、啟用請求 `sessionKey` 覆寫，以及啟用覆寫但未設定 `hooks.allowedSessionKeyPrefixes` 時，它會發出警告。
當沙盒模式關閉時卻配置了沙盒 Docker 設定、`gateway.nodes.denyCommands` 使用無效的類樣式/未知項目（僅限精確節點指令名稱匹配，而非 shell 文字過濾）、`gateway.nodes.allowCommands` 明確啟用了危險的節點指令、全域 `tools.profile="minimal"` 被代理程式工具設定檔覆寫、寫入/編輯工具已停用但 `exec` 仍可在無限制沙盒檔案系統邊界的情況下使用、開放群組在無沙盒/工作區防護的情況下暴露執行環境/檔案系統工具，以及已安裝的外掛工具可能在寬鬆的工具政策下被存取時，它也會發出警告。
它也會標記 `gateway.allowRealIpFallback=true`（若代理設定錯誤，有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器使用 Docker `bridge` 網路卻沒有 `sandbox.browser.cdpSourceRange` 時，它也會發出警告。
它也會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間連線）。
當現有的沙盒瀏覽器 Docker 容器缺少或過時的雜湊標籤（例如遷移前的容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告並建議執行 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未固定版本、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當通道允許清單依賴可變動的名稱/電子郵件/標籤而非穩定的 ID 時，它會發出警告（適用於 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 範圍）。
當 `gateway.auth.mode="none"` 導致 Gateway HTTP API 可在無共用秘密（`/tools/invoke` 加上任何已啟用的 `/v1/*` 端點）的情況下被存取時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作員覆寫；單獨啟用其中一項並不構成安全性漏洞報告。
如需完整的危險參數清單，請參閱 [安全性](/zh-Hant/gateway/security) 中的「不安全或危險旗標摘要」章節。

SecretRef 行為：

- `security audit` 會以唯讀模式解析其目標路徑中支援的 SecretRef。
- 如果在目前的指令路徑中無法使用 SecretRef，稽核會繼續並回報 `secretDiagnostics`（而不是當機）。
- `--token` 和 `--password` 僅會覆寫該次指令叫用的深度探測驗證；它們不會重寫設定或 SecretRef 對應。

## JSON 輸出

使用 `--json` 進行 CI/原則檢查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果同時使用 `--fix` 和 `--json`，輸出會包含修復動作和最終報告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 會變更什麼

`--fix` 會套用安全、確定性的補救措施：

- 將常見的 `groupPolicy="open"` 翻轉為 `groupPolicy="allowlist"`（包括支援頻道中的帳戶變體）
- 當 WhatsApp 群組原則翻轉為 `allowlist` 時，如果該清單存在且設定尚未定義 `allowFrom`，則會從儲存的 `allowFrom` 檔案中植入 `groupAllowFrom`
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 加強狀態/設定和常見敏感檔案的權限
  (`credentials/*.json`、`auth-profiles.json`、`sessions.json`、工作階段
  `*.jsonl`)
- 同時也加強 `openclaw.json` 中參照的設定包含檔案權限
- 在 POSIX 主機上使用 `chmod`，並在 Windows 上使用 `icacls` 重設

`--fix` **不會**：

- 輪替權杖/密碼/API 金鑰
- 停用工具 (`gateway`、`cron`、`exec` 等)
- 變更閘道綁定/驗證/網路暴露選項
- 移除或重寫外掛程式/技能

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [安全性稽核](/zh-Hant/gateway/security)
