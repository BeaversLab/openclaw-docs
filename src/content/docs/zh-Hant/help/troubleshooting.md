---
summary: "針對 OpenClaw 的症狀優先故障排除中心"
read_when:
  - OpenClaw is not working and you need the fastest path to a fix
  - You want a triage flow before diving into deep runbooks
title: "一般故障排除"
---

# 故障排除

如果您只有 2 分鐘，請將此頁面作為檢傷分類的前門。

## 前 60 秒

按順序執行以下確切的步驟：

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

在一行中的良好輸出：

- `openclaw status` → 顯示已配置的通道，且無明顯的驗證錯誤。
- `openclaw status --all` → 完整報告已存在且可分享。
- `openclaw gateway probe` → 預期的閘道目標是可連線的 (`Reachable: yes`)。 `Capability: ...` 會告訴您探測能證明的認證等級，而 `Read probe: limited - missing scope: operator.read` 是降級診斷，並非連線失敗。
- `openclaw gateway status` → `Runtime: running`、`Connectivity probe: ok`，以及合理的 `Capability: ...` 行。如果您也需要讀取範圍 RPC 證明，請使用 `--require-rpc`。
- `openclaw doctor` → 沒有阻斷性的配置/服務錯誤。
- `openclaw channels status --probe` → 可連線的閘道會傳回即時的帳戶傳輸狀態以及探測/稽核結果，例如 `works` 或 `audit ok`；如果無法連線到閘道，該指令會退回僅包含配置的摘要。
- `openclaw logs --follow` → 穩定的活動，沒有重複的致命錯誤。

## Anthropic 長上下文 429

如果您看到：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`，
請前往 [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

## 本機 OpenAI 相容後端直接運作但在 OpenClaw 中失敗

如果您的本機或自託管 `/v1` 後端能回應小型直接
`/v1/chat/completions` 探測，但在 `openclaw infer model run` 或一般
代理回合時失敗：

1. 如果錯誤提到 `messages[].content` 預期為字串，請設定
   `models.providers.<provider>.models[].compat.requiresStringContent: true`。
2. 如果後端仍僅在 OpenClaw 代理回合時失敗，請設定
   `models.providers.<provider>.models[].compat.supportsTools: false` 並重試。
3. 如果小型直接呼叫仍然有效，但較大的 OpenClaw 提示導致
   後端崩潰，請將其餘問題視為上游模型/伺服器限制，並
   繼續參閱深入指南：
   [/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail](/zh-Hant/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)

## 外掛程式安裝因缺少 openclaw 擴充功能而失敗

如果安裝失敗並出現 `package.json missing openclaw.extensions`，表示此外掛套件
使用的是 OpenClaw 不再接受的舊格式。

請在外掛程式套件中修正：

1. 將 `openclaw.extensions` 加入 `package.json`。
2. 將項目指向建置好的執行時期檔案 (通常是 `./dist/index.js`)。
3. 重新發佈外掛並再次執行 `openclaw plugins install <package>`。

範例：

```json
{
  "name": "@openclaw/my-plugin",
  "version": "1.2.3",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

參考：[Plugin architecture](/zh-Hant/plugins/architecture)

## 決策樹

```mermaid
flowchart TD
  A[OpenClaw is not working] --> B{What breaks first}
  B --> C[No replies]
  B --> D[Dashboard or Control UI will not connect]
  B --> E[Gateway will not start or service not running]
  B --> F[Channel connects but messages do not flow]
  B --> G[Cron or heartbeat did not fire or did not deliver]
  B --> H[Node is paired but camera canvas screen exec fails]
  B --> I[Browser tool fails]

  C --> C1[/No replies section/]
  D --> D1[/Control UI section/]
  E --> E1[/Gateway section/]
  F --> F1[/Channel flow section/]
  G --> G1[/Automation section/]
  H --> H1[/Node tools section/]
  I --> I1[/Browser section/]
```

<AccordionGroup>
  <Accordion title="No replies">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw channels status --probe
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    ```

    良好的輸出看起來像這樣：

    - `Runtime: running`
    - `Connectivity probe: ok`
    - `Capability: read-only`、`write-capable` 或 `admin-capable`
    - 您的頻道顯示傳輸已連接，並且在支援的情況下，`channels status --probe` 中顯示 `works` 或 `audit ok`
    - 發送者顯示為已核准（或 DM 政策為開放/白名單）

    常見的日誌特徵：

    - `drop guild message (mention required` → mention gating 在 Discord 中阻擋了訊息。
    - `pairing request` → 發送者未核准，正在等待 DM 配對核准。
    - `blocked` / `allowlist` 在頻道日誌中 → 發送者、房間或群組已被過濾。

    深入頁面：

    - [/gateway/troubleshooting#no-replies](/zh-Hant/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
    - [/channels/pairing](/zh-Hant/channels/pairing)

  </Accordion>

  <Accordion title="Dashboard or Control UI will not connect">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    正常的輸出看起來像這樣：

    - `Dashboard: http://...` 顯示在 `openclaw gateway status` 中
    - `Connectivity probe: ok`
    - `Capability: read-only`、`write-capable` 或 `admin-capable`
    - 記錄中沒有驗證迴圈

    常見的記錄特徵：

    - `device identity required` → HTTP/非安全上下文無法完成設備驗證。
    - `origin not allowed` → 不允許瀏覽器 `Origin` 用於控制 UI
      閘道目標。
    - `AUTH_TOKEN_MISMATCH` 並帶有重試提示 (`canRetryWithDeviceToken=true`) → 可能會自動進行一次信任的設備令牌重試。
    - 該快取令牌重試會重複使用與配對設備令牌一起存儲的快取範圍集。顯式 `deviceToken` / 顯式 `scopes` 呼叫者則會保留其請求的範圍集。
    - 在非同步 Tailscale Serve Control UI 路徑上，對同一 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前被序列化，因此第二次並發的錯誤重試可能已經顯示 `retry later`。
    - 來自本地主機
      瀏覽器來源的 `too many failed authentication attempts (retry later)` → 來自同一 `Origin` 的重複失敗將被暫時鎖定；另一個本地主機來源使用單獨的存儲桶。
    - 該重試後重複出現 `unauthorized` → 令牌/密碼錯誤、驗證模式不匹配或過期的配對設備令牌。
    - `gateway connect failed:` → UI 目標是錯誤的 URL/埠或無法連接的閘道。

    深入頁面：

    - [/gateway/troubleshooting#dashboard-control-ui-connectivity](/zh-Hant/gateway/troubleshooting#dashboard-control-ui-connectivity)
    - [/web/control-ui](/zh-Hant/web/control-ui)
    - [/gateway/authentication](/zh-Hant/gateway/authentication)

  </Accordion>

  <Accordion title="Gateway will not start or service installed but not running">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    Good output looks like:

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `Connectivity probe: ok`
    - `Capability: read-only`, `write-capable`, or `admin-capable`

    Common log signatures:

    - `Gateway start blocked: set gateway.mode=local` or `existing config is missing gateway.mode` → gateway mode is remote, or the config file is missing the local-mode stamp and should be repaired.
    - `refusing to bind gateway ... without auth` → non-loopback bind without a valid gateway auth path (token/password, or trusted-proxy where configured).
    - `another gateway instance is already listening` or `EADDRINUSE` → port already taken.

    Deep pages:

    - [/gateway/troubleshooting#gateway-service-not-running](/zh-Hant/gateway/troubleshooting#gateway-service-not-running)
    - [/gateway/background-process](/zh-Hant/gateway/background-process)
    - [/gateway/configuration](/zh-Hant/gateway/configuration)

  </Accordion>

  <Accordion title="Channel connects but messages do not flow">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    Good output looks like:

    - Channel transport is connected.
    - Pairing/allowlist checks pass.
    - Mentions are detected where required.

    Common log signatures:

    - `mention required` → group mention gating blocked processing.
    - `pairing` / `pending` → DM sender is not approved yet.
    - `not_in_channel`, `missing_scope`, `Forbidden`, `401/403` → channel permission token issue.

    Deep pages:

    - [/gateway/troubleshooting#channel-connected-messages-not-flowing](/zh-Hant/gateway/troubleshooting#channel-connected-messages-not-flowing)
    - [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)

  </Accordion>

  <Accordion title="Cron 或心跳未觸發或未傳送">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw cron status
    openclaw cron list
    openclaw cron runs --id <jobId> --limit 20
    openclaw logs --follow
    ```

    良好的輸出如下所示：

    - `cron.status` 顯示已啟用且有下一次喚醒時間。
    - `cron runs` 顯示最近的 `ok` 記錄。
    - 心跳已啟用且未在活動時間之外。

    常見的日誌特徵：

    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
    - `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出設定的活動時間。
    - `heartbeat skipped` 搭配 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但僅包含空白/僅標頭的結構。
    - `heartbeat skipped` 搭配 `reason=no-tasks-due` → `HEARTBEAT.md` 工作模式已啟用，但尚未到任何工作間隔時間。
    - `heartbeat skipped` 搭配 `reason=alerts-disabled` → 所有心跳可見性已停用（`showOk`、`showAlerts` 和 `useIndicator` 皆為關閉狀態）。
    - `requests-in-flight` → 主通道忙碌；心跳喚醒已延遲。
    - `unknown accountId` → 心跳傳送目標帳戶不存在。

    深入頁面：

    - [/gateway/troubleshooting#cron-and-heartbeat-delivery](/zh-Hant/gateway/troubleshooting#cron-and-heartbeat-delivery)
    - [/automation/cron-jobs#troubleshooting](/zh-Hant/automation/cron-jobs#troubleshooting)
    - [/gateway/heartbeat](/zh-Hant/gateway/heartbeat)

    </Accordion>

    <Accordion title="Node is paired but tool fails camera canvas screen exec">
      ```bash
      openclaw status
      openclaw gateway status
      openclaw nodes status
      openclaw nodes describe --node <idOrNameOrIp>
      openclaw logs --follow
      ```

      正常的輸出看起來像：

      - Node 被列為已連線並已針對角色 `node` 進行配對。
      - 您正在叫用的指令存在 Capability。
      - 工具的 Permission state 是 granted。

      常見的日誌特徵：

      - `NODE_BACKGROUND_UNAVAILABLE` → 將 node 應用程式帶到前景。
      - `*_PERMISSION_REQUIRED` → OS 權限被拒絕/遺失。
      - `SYSTEM_RUN_DENIED: approval required` → exec 核准正在擱置中。
      - `SYSTEM_RUN_DENIED: allowlist miss` → 指令不在 exec 允許清單上。

      深入頁面：

      - [/gateway/troubleshooting#node-paired-tool-fails](/zh-Hant/gateway/troubleshooting#node-paired-tool-fails)
      - [/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)
      - [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)

    </Accordion>

    <Accordion title="Exec 突然請求批准">
      ```bash
      openclaw config get tools.exec.host
      openclaw config get tools.exec.security
      openclaw config get tools.exec.ask
      openclaw gateway restart
      ```

      變更內容：

      - 如果 `tools.exec.host` 未設定，預設值為 `auto`。
      - 當沙箱執行環境處於啟用狀態時，`host=auto` 會解析為 `sandbox`，否則解析為 `gateway`。
      - `host=auto` 僅涉及路由；無提示「YOLO」行為來自於閘道/節點上的 `security=full` 加上 `ask=off`。
      - 在 `gateway` 和 `node` 上，未設定的 `tools.exec.security` 預設值為 `full`。
      - 未設定的 `tools.exec.ask` 預設值為 `off`。
      - 結果：如果您看到批准請求，表示某些主機本機或每階段的政策將 exec 限制得比目前的預設值更嚴格。

      恢復目前的預設無需批准行為：

      ```bash
      openclaw config set tools.exec.host gateway
      openclaw config set tools.exec.security full
      openclaw config set tools.exec.ask off
      openclaw gateway restart
      ```

      更安全的替代方案：

      - 如果您只想要穩定的主機路由，僅設定 `tools.exec.host=gateway`。
      - 如果您想要主機 exec 但仍希望在允許清單遺漏時進行審查，請將 `security=allowlist` 與 `ask=on-miss` 搭配使用。
      - 如果您希望 `host=auto` 解析回 `sandbox`，請啟用沙箱模式。

      常見日誌特徵：

      - `Approval required.` → 指令正在等待 `/approve ...`。
      - `SYSTEM_RUN_DENIED: approval required` → 節點主機 exec 批准待定。
      - `exec host=sandbox requires a sandbox runtime for this session` → 隱含/明確的沙箱選擇，但沙箱模式已關閉。

      深入頁面：

      - [/tools/exec](/zh-Hant/tools/exec)
      - [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)
      - [/gateway/security#what-the-audit-checks-high-level](/zh-Hant/gateway/security#what-the-audit-checks-high-level)

    </Accordion>

    <Accordion title="瀏覽器工具失敗">
      ```bash
      openclaw status
      openclaw gateway status
      openclaw browser status
      openclaw logs --follow
      openclaw doctor
      ```

      正常的輸出如下所示：

      - 瀏覽器狀態顯示 `running: true` 以及一個已選擇的瀏覽器/設定檔。
      - `openclaw` 已啟動，或者 `user` 可以看見本機 Chrome 分頁。

      常見的日誌特徵：

      - `unknown command "browser"` 或 `unknown command 'browser'` → `plugins.allow` 已設定，但未包含 `browser`。
      - `Failed to start Chrome CDP on port` → 本機瀏覽器啟動失敗。
      - `browser.executablePath not found` → 設定的二進位檔路徑錯誤。
      - `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的協定。
      - `browser.cdpUrl has invalid port` → 設定的 CDP URL 的連接埠錯誤或超出範圍。
      - `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟任何本機 Chrome 分頁。
      - `Remote CDP for profile "<name>" is not reachable` → 無法從此主機連線至設定的遠端 CDP 端點。
      - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加設定檔沒有作用中的 CDP 目標。
      - 僅附加或遠端 CDP 設定檔上的檢視區 / 深色模式 / 地區設定 / 離線覆寫過時 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉作用中的控制工作階段並釋放模擬狀態，無需重新啟動閘道。

      深入頁面：

      - [/gateway/troubleshooting#browser-tool-fails](/zh-Hant/gateway/troubleshooting#browser-tool-fails)
      - [/tools/browser#missing-browser-command-or-tool](/zh-Hant/tools/browser#missing-browser-command-or-tool)
      - [/tools/browser-linux-troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)
      - [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

    </Accordion>

  </AccordionGroup>

## 相關

- [常見問題](/zh-Hant/help/faq) — 經常被問到的問題
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting) — 閘道相關的問題
- [Doctor](/zh-Hant/gateway/doctor) — 自動化健康檢查與修復
- [通道疑難排解](/zh-Hant/channels/troubleshooting) — 通道連線問題
- [自動化疑難排解](/zh-Hant/automation/cron-jobs#troubleshooting) — cron 與心跳問題
