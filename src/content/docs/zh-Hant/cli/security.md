---
summary: "CLI 參考資料，用於 `openclaw security`（稽核並修復常見的安全性陷阱）"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "security"
---

# `openclaw security`

安全性工具（稽核 + 可選修復）。

相關：

- 安全性指南：[Security](/en/gateway/security)

## 稽核

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

當多個 DM 發送者共用主會話時，稽核會發出警告並建議使用 **安全 DM 模式**：針對共用收件箱使用 `session.dmScope="per-channel-peer"`（若是多重帳戶頻道則使用 `per-account-channel-peer`）。
這適用於協作/共用收件箱的強化防護。由彼此互不信任或具有對立關係的操作員共用單一 Gateway 並非建議的設定；應使用不同的 Gateway（或不同的 OS 使用者/主機）來區分信任邊界。
若配置顯示可能為共用使用者的連入流量（例如開放 DM/群組政策、已設定的群組目標或萬用字元發送者規則），它也會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設採用個人助理信任模型。
對於有意識的共用使用者設定，稽核建議是將所有會話放在沙盒中、將檔案系統存取限制在工作區範圍內，並將個人/私人身分或憑證遠離該執行階段。
當小型模型（`<=300B`）在未使用沙盒的情況下使用，並啟用了網路/瀏覽器工具時，它也會發出警告。
針對 webhook 連入流量，當 `hooks.token` 重複使用 Gateway 權杖、`hooks.defaultSessionKey` 未設定、`hooks.allowedAgentIds` 不受限制、啟用了請求 `sessionKey` 覆寫，以及在沒有 `hooks.allowedSessionKeyPrefixes` 的情況下啟用覆寫時，它會發出警告。
當在沙盒模式關閉時設定沙盒 Docker 設定、當 `gateway.nodes.denyCommands` 使用無效的類模式/未知條目（僅限精確節點指令名稱比對，而非 shell 文字篩選）、當 `gateway.nodes.allowCommands` 明確啟用危險的節點指令、當全域 `tools.profile="minimal"` 被代理程式工具設定檔覆寫、當開放群組在沒有沙盒/工作區防護的情況下暴露執行階段/檔案系統工具，以及當安裝的擴充功能外掛工具可能在不嚴格的工具政策下被存取時，它也會發出警告。
它也會標記 `gateway.allowRealIpFallback=true`（如果代理設定錯誤，有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器使用沒有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 網路時，它也會發出警告。
它也會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間連線）。
當現有的沙盒瀏覽器 Docker 容器缺少或過時的雜�標籤（例如遷移前的容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告並建議 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛/掛鉤安裝記錄未被鎖定、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當頻道允許清單依賴可變動的名稱/電子郵件/標籤而非穩定的 ID 時，它會發出警告（Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 等適用範圍）。
當 `gateway.auth.mode="none"` 導致 Gateway HTTP API 在沒有共用金鑰的情況下可被存取時（`/tools/invoke` 加上任何啟用的 `/v1/*` 端點），它會發出警告。
以 `dangerous`/`dangerously` 為前綴的設定是明確的緊急操作員覆寫；單獨啟用其中一項並不構成安全性弱點報告。
若要查看完整的危險參數清單，請參閱 [Security](/en/gateway/security) 中的「Insecure or dangerous flags summary」章節。

SecretRef 行為：

- `security audit` 會以唯讀模式解析其目標路徑支援的 SecretRefs。
- 如果 SecretRef 在當前指令路徑中無法使用，稽核會繼續並回報 `secretDiagnostics`（而不是崩潰）。
- `--token` 和 `--password` 僅覆寫該次指令呼叫的 deep-probe 認證；它們不會重寫設定或 SecretRef 對應。

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

- 將常見的 `groupPolicy="open"` 切換為 `groupPolicy="allowlist"`（包括支援通道中的帳戶變體）
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 收緊狀態/設定和常見敏感性檔案的權限（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、工作階段 `*.jsonl`）

`--fix` **不會**：

- 輪替權杖/密碼/API 金鑰
- 停用工具（`gateway`、`cron`、`exec` 等）
- 變更閘道綁定/認證/網路暴露選項
- 移除或重寫外掛/技能
