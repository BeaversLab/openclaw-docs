---
summary: "CLI 參考資料：`openclaw security`（審核並修復常見的安全性陷阱）"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "security"
---

# `openclaw security`

安全性工具（審核 + 可選修復）。

相關：

- 安全性指南：[Security](/zh-Hant/gateway/security)

## 審核

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

當多個 DM 發送者共享主會話時，稽核會發出警告並建議使用 **安全 DM 模式**：針對共享收件匣使用 `session.dmScope="per-channel-peer"`（或針對多帳戶頻道使用 `per-account-channel-peer`）。
這是用於協作/共享收件匣的加固措施。由互不信任或對立的操作者共享單一 Gateway 並非建議的設定；請使用不同的 Gateway（或不同的 OS 使用者/主機）來隔離信任邊界。
當配置顯示可能存在共享使用者入口（例如開放 DM/群組原則、已配置的群組目標或萬用字元發送者規則）時，它還會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設採用的是個人助理信任模型。
對於有意義的共享使用者設定，稽核指引是將所有會程沙盒化、保持檔案系統存取僅限於工作區範圍，並確保個人/私人身分識別或憑證不會置於該執行階段上。
當小型模型（`<=300B`）在未沙盒化的情況下使用，並且啟用了網頁/瀏覽器工具時，它也會發出警告。
對於 webhook 入口，當未設定 `hooks.defaultSessionKey`、啟用了請求 `sessionKey` 覆寫，以及啟用了覆寫但未設定 `hooks.allowedSessionKeyPrefixes` 時，它會發出警告。
當沙盒模式關閉時配置了沙盒 Docker 設定、當 `gateway.nodes.denyCommands` 使用無效的類模式/未知項目（僅精確節點指令名稱匹配，而非 shell 文字篩選）、當 `gateway.nodes.allowCommands` 明確啟用了危險的節點指令、當全域 `tools.profile="minimal"` 被代理工具設定檔覆寫、當開放群組在沒有沙盒/工作區防護的情況下暴露執行階段/檔案系統工具，以及當已安裝的擴充外掛工具可能在寬鬆的工具政策下被存取時，它也會發出警告。
它還會標記 `gateway.allowRealIpFallback=true`（如果代理設定錯誤，則有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器在沒有 `sandbox.browser.cdpSourceRange` 的情況下使用 Docker `bridge` 網路時，它也會發出警告。
它還會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間連線）。
當現有的沙盒瀏覽器 Docker 容器缺少或過時的雜湊標籤（例如遷移前容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告，並建議 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未固定鎖定、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當頻道允許清單依賴可變的名稱/電子郵件/標籤而非穩定的 ID 時（Discord、Slack、Google Chat、MS Teams、Mattermost、適用的 IRC 範圍），它會發出警告。
當 `gateway.auth.mode="none"` 導致 Gateway HTTP API 在沒有共用金鑰的情況下可被存取（`/tools/invoke` 加上任何已啟用的 `/v1/*` 端點）時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作者覆寫；單獨啟用其中一項並不代表即為安全性弱點報告。
如需完整的危險參數清單，請參閱 [安全性](/zh-Hant/gateway/security) 中的「不安全或危險旗標摘要」一節。

SecretRef 行為：

- `security audit` 會以唯讀模式解析其目標路徑中支援的 SecretRefs。
- 若 SecretRef 在目前指令路徑中無法使用，稽核會繼續並回報 `secretDiagnostics`（而不是當機）。
- `--token` 和 `--password` 僅會覆寫該次指令呼叫的 deep-probe 驗證設定；它們不會重寫組態或 SecretRef 對應。

## JSON 輸出

使用 `--json` 進行 CI/原則檢查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

若結合 `--fix` 與 `--json`，輸出將包含修復動作與最終報告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 的變更內容

`--fix` 會套用安全、確定性修復措施：

- 將常見的 `groupPolicy="open"` 切換為 `groupPolicy="allowlist"`（包括支援管道中的帳號變體）
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 對 state/config 及常見敏感檔案（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、session `*.jsonl`）加強權限設定

`--fix` **不會**：

- 輪替 token/密碼/API 金鑰
- 停用工具（`gateway`、`cron`、`exec` 等）
- 變更 gateway 繫結/驗證/網路暴露選項
- 移除或重寫外掛程式/技能

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
