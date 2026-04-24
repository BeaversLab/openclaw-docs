---
summary: "CLI 參考資料，用於 `openclaw security`（稽核並修復常見的安全性陷阱）"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (permissions, tighten defaults)
title: "security"
---

# `openclaw security`

安全性工具（稽核 + 可選修復）。

相關：

- 安全指南：[安全](/zh-Hant/gateway/security)

## 稽核

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

當多個 DM 傳送者共用主工作階段時，稽核會發出警告並建議使用 **安全 DM 模式**：針對共用收件匣使用 `session.dmScope="per-channel-peer"` （若是多帳號通道則使用 `per-account-channel-peer`）。
這適用於協作/共用收件匣的強化。由相互不信任/對立的操作者共用單一 Gateway 並非建議的設定；請使用個別的 Gateway （或個別的 OS 使用者/主機）來分隔信任邊界。
當設定顯示可能有共用使用者入口（例如開放 DM/群組原則、已設定的群組目標，或萬用字元傳送者規則）時，它也會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設採用個人助理信任模型。
對於刻意設定的共用使用者環境，稽核指引是將所有工作階段沙盒化、將檔案系統存取限制在工作區範圍內，並將個人/私人身分識別或憑證與該執行環境分離。
當小型模型（`<=300B`）在未啟用沙盒且啟用了網頁/瀏覽器工具的情況下使用時，它也會發出警告。
針對 Webhook 入口，當 `hooks.token` 重複使用 Gateway Token、`hooks.token` 過短、`hooks.path="/"`、`hooks.defaultSessionKey` 未設定、`hooks.allowedAgentIds` 未受限制、啟用了請求 `sessionKey` 覆寫，以及啟用了覆寫但未設定 `hooks.allowedSessionKeyPrefixes` 時，它會發出警告。
當沙盒模式關閉時設定沙盒 Docker 設定、`gateway.nodes.denyCommands` 使用無效的類模式/未知項目（僅限精確節點指令名稱比對，而非 shell 文字篩選）、`gateway.nodes.allowCommands` 明確啟用危險的節點指令、全域 `tools.profile="minimal"` 被代理程式工具設定檔覆寫、開放群組在無沙盒/工作區防護的情況下暴露執行/檔案系統工具，以及已安裝的外掛工具可能可在寬鬆的工具原則下存取時，它也會發出警告。
它也會標示 `gateway.allowRealIpFallback=true` （若 Proxy 設定錯誤則有標頭偽造風險）和 `discovery.mdns.mode="full"` （透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器使用 Docker `bridge` 網路卻未使用 `sandbox.browser.cdpSourceRange` 時，它也會發出警告。
它也會標示危險的沙盒 Docker 網路模式（包括加入 `host` 和 `container:*` 命名空間）。
當現有的沙盒瀏覽器 Docker 容器缺少/過時的雜湊標籤（例如遷移前的容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告並建議 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未鎖定、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當通道允許清單依賴可變更的名稱/電子郵件/標籤而非穩定的 ID 時（適用於 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 範圍），它會發出警告。
當 `gateway.auth.mode="none"` 讓 Gateway HTTP API 在沒有共用金鑰的情況下可被存取（`/tools/invoke` 加上任何已啟用的 `/v1/*` 端點）時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作員覆寫；單獨啟用其中一個並不構成安全性弱點報告。
如需完整的危險參數清單，請參閱 [Security](/zh-Hant/gateway/security) 中的「Insecure or dangerous flags summary」章節。

SecretRef 行為：

- `security audit` 會以唯讀模式解析其目標路徑中支援的 SecretRefs。
- 如果 SecretRef 在目前的指令路徑中無法使用，稽核會繼續並回報 `secretDiagnostics`（而不是崩潰）。
- `--token` 和 `--password` 僅針對該指令呼叫覆寫 deep-probe 驗證；它們不會重寫配置或 SecretRef 對應。

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

## `--fix` 變更了什麼

`--fix` 會套用安全、確定性的修復措施：

- 將常見的 `groupPolicy="open"` 切換為 `groupPolicy="allowlist"`（包括支援通道中的帳戶變體）
- 當 WhatsApp 群組原則切換為 `allowlist` 時，若該清單存在且配置尚未定義
  `allowFrom`，則會從儲存的 `allowFrom` 檔案植入 `groupAllowFrom`
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 加嚴 state/config 和常見敏感檔案的權限
  （`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session
  `*.jsonl`）
- 也會加嚴 `openclaw.json` 中參照的配置 include 檔案
- 在 POSIX 主機上使用 `chmod`，並在 Windows 上使用 `icacls` 重設

`--fix` **不會**：

- 輪換 token/密碼/API 金鑰
- 停用工具（`gateway`, `cron`, `exec` 等）
- 變更閘道綁定/驗證/網路曝露選項
- 移除或重寫外掛/技能
