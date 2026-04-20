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

當多個 DM 發送者共用主會話時，審計會發出警告並建議使用 **安全 DM 模式**：對於共用收件箱，使用 `session.dmScope="per-channel-peer"`（對於多帳號通道則使用 `per-account-channel-peer`）。
這是針對協作/共用收件箱的強化措施。由互不信任/對立的操作員共用單一 Gateway 並非建議的設定；請使用不同的 Gateway（或不同的 OS 使用者/主機）來分割信任邊界。
當配置暗示可能存在共用使用者入口（例如開放 DM/群組原則、已配置的群組目標或萬用字元發送者規則）時，它也會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設是個人助理信任模型。
對於有意識的共用使用者設定，審計建議是將所有會話沙盒化，保持檔案系統存取限於工作區範圍，並且不要將個人/私人身分或憑證放入該執行環境。
當小型模型（`<=300B`）在未啟用沙盒且啟用了網頁/瀏覽器工具的情況下使用時，它也會發出警告。
對於 Webhook 入口，當 `hooks.token` 重複使用 Gateway 權杖、當 `hooks.token` 過短、當 `hooks.path="/"`、當 `hooks.defaultSessionKey` 未設定、當 `hooks.allowedAgentIds` 不受限制、當請求 `sessionKey` 覆寫已啟用，以及當覆寫已啟用但未使用 `hooks.allowedSessionKeyPrefixes` 時，它會發出警告。
當沙盒模式關閉時配置了沙盒 Docker 設定、當 `gateway.nodes.denyCommands` 使用無效的類模式/未知項目（僅限精確節點指令名稱匹配，而非 shell 文字過濾）、當 `gateway.nodes.allowCommands` 明確啟用了危險的節點指令、當全域 `tools.profile="minimal"` 被代理程式工具設定檔覆寫、當開放群組在沒有沙盒/工作區防護的情況下暴露執行時/檔案系統工具，以及當已安裝的擴充外掛工具可能在寬鬆的工具原則下被存取時，它也會發出警告。
它也會標記 `gateway.allowRealIpFallback=true`（如果代理伺服器設定錯誤，則有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏元資料）。
當沙盒瀏覽器使用沒有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 網路時，它也會發出警告。
它也會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間連線）。
當現有的沙盒瀏覽器 Docker 容器缺少/過期的雜湊標籤（例如遷移前的容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告並建議 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未固定、缺少完整性元資料，或與當前安裝的套件版本不一致時，它也會發出警告。
當通道允許清單依賴可變更的名稱/電子郵件/標籤而非穩定的 ID（Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 適用範圍）時，它會發出警告。
當 `gateway.auth.mode="none"` 讓 Gateway HTTP API 在沒有共用密鑰（`/tools/invoke` 加上任何已啟用的 `/v1/*` 端點）的情況下可被存取時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作員覆寫；單獨啟用其中一項並不代表安全漏洞報告。
如需完整的危險參數清單，請參閱 [安全性](/zh-Hant/gateway/security) 中的「不安全或危險旗標摘要」一節。

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
