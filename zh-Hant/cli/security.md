---
summary: "CLI 參考資料，用於 `openclaw security`（稽核並修復常見的安全性陷阱）"
read_when:
  - 您想要對組態/狀態執行快速的安全性稽核
  - 您想要套用安全的「修復」建議（chmod、加強預設值）
title: "security"
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

當多個 DM 發送者共用主會話時，稽核會發出警告，並建議針對共用收件匣使用 **安全 DM 模式**：`session.dmScope="per-channel-peer"`（若是多帳號通道則使用 `per-account-channel-peer`）。
這是為了協作/共用收件匣的強化。由互不信任/對立的操作員單一共用一個 Gateway 並非建議的設定；請使用獨立的 gateway（或獨立的 OS 使用者/主機）來隔離信任邊界。
當配置顯示可能存在共用使用者存取（例如開放 DM/群組原則、已配置的群組目標，或萬用字元發送者規則）時，它也會發出 `security.trust_model.multi_user_heuristic`，並提醒您 OpenClaw 預設採用的是個人助理信任模型。
對於有意設定的共用使用者環境，稽核建議是將所有會話沙盒化、將檔案系統存取限制在工作區範圍內，並確保個人/私有身分或憑證不會出現在該執行階段中。
當小型模型（`<=300B`）未使用沙盒且啟用了網路/瀏覽器工具時，它也會發出警告。
針對 webhook 存入，當 `hooks.token` 重複使用 Gateway 權杖、當 `hooks.defaultSessionKey` 未設定、當 `hooks.allowedAgentIds` 不受限制、當請求 `sessionKey` 覆寫已啟用，以及當啟用覆寫但未設定 `hooks.allowedSessionKeyPrefixes` 時，它會發出警告。
當沙盒模式關閉卻配置了沙盒 Docker 設定時、當 `gateway.nodes.denyCommands` 使用無效的類模式/未知項目（僅限精確的節點指令名稱比對，而非 shell 文字篩選）時、當 `gateway.nodes.allowCommands` 明確啟用了危險的節點指令時、當全域 `tools.profile="minimal"` 被代理程式工具設定檔覆寫時、當開放群組在沒有沙盒/工作區防護的情況下暴露執行階段/檔案系統工具時，以及當已安裝的外掛程式工具可能在寬鬆的工具原則下被存取時，它也會發出警告。
它也會標記 `gateway.allowRealIpFallback=true`（若代理設定錯誤，則有標頭偽造風險）和 `discovery.mdns.mode="full"`（透過 mDNS TXT 記錄洩漏中繼資料）。
當沙盒瀏覽器在沒有 `sandbox.browser.cdpSourceRange` 的情況下使用 Docker `bridge` 網路時，它也會發出警告。
它也會標記危險的沙盒 Docker 網路模式（包括 `host` 和 `container:*` 命名空間加入）。
當現有的沙盒瀏覽器 Docker 容器缺少/過期的雜湊標籤（例如遷移前的容器缺少 `openclaw.browserConfigEpoch`）時，它也會發出警告並建議執行 `openclaw sandbox recreate --browser --all`。
當基於 npm 的外掛程式/掛鉤安裝記錄未固定、缺少完整性中繼資料，或與目前安裝的套件版本不一致時，它也會發出警告。
當通道允許清單依賴可變動的名稱/電子郵件/標籤而非穩定的 ID 時（Discord、Slack、Google Chat、MS Teams、Mattermost、IRC 適用範圍），它會發出警告。
當 `gateway.auth.mode="none"` 未設定共用密鑰（`/tools/invoke` 加上任何啟用的 `/v1/*` 端點）而導致 Gateway HTTP API 可被存取時，它會發出警告。
前綴為 `dangerous`/`dangerously` 的設定是明確的緊急操作員覆寫；單獨啟用其中一項並不代表即為安全性弱點報告。
如需完整的危險參數清單，請參閱 [安全性](/zh-Hant/gateway/security) 中的「不安全或危險旗標摘要」章節。

SecretRef 行為：

- `security audit` 會以唯讀模式解析目標路徑中支援的 SecretRefs。
- 如果 SecretRef 在當前指令路徑中不可用，稽核會繼續並回報 `secretDiagnostics`（而不是崩潰）。
- `--token` 和 `--password` 僅會覆寫該次指令叫用的 deep-probe 驗證；它們不會重寫設定或 SecretRef 對應。

## JSON 輸出

使用 `--json` 進行 CI/原則檢查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果結合 `--fix` 和 `--json`，輸出將包含修復動作與最終報告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 會改變什麼

`--fix` 會套用安全、確定性的修復措施：

- 將常見的 `groupPolicy="open"` 切換為 `groupPolicy="allowlist"`（包括支援通道中的帳戶變體）
- 將 `logging.redactSensitive` 從 `"off"` 設定為 `"tools"`
- 收緊狀態/設定與常見敏感檔案的權限（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、session `*.jsonl`）

`--fix` **不會**：

- 輪換 Token/密碼/API 金鑰
- 停用工具（`gateway`、`cron`、`exec` 等）
- 變更閘道綁定/驗證/網路暴露選項
- 移除或重寫外掛/技能

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
