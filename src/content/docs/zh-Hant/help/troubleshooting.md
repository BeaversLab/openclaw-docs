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
- `openclaw gateway probe` → 預期的閘道目標可連線 (`Reachable: yes`)。 `RPC: limited - missing scope: operator.read` 是降級診斷，並非連線失敗。
- `openclaw gateway status` → `Runtime: running` 和 `RPC probe: ok`。
- `openclaw doctor` → 無阻塞性配置/服務錯誤。
- `openclaw channels status --probe` → 通道回報 `connected` 或 `ready`。
- `openclaw logs --follow` → 活動穩定，無重複的嚴重錯誤。

## Anthropic 長上下文 429

如果您看到：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`，
請前往 [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

## 外掛程式安裝因缺少 openclaw 擴充功能而失敗

如果安裝失敗並出現 `package.json missing openclaw.extensions`，則外掛程式套件
正在使用 OpenClaw 不再接受的舊格式。

在外掛程式套件中修復：

1. 將 `openclaw.extensions` 加入到 `package.json`。
2. 將項目指向已建置的執行時期檔案 (通常是 `./dist/index.js`)。
3. 重新發佈外掛程式並再次執行 `openclaw plugins install <package>`。

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

參考資料：[外掛程式架構](/en/plugins/architecture)

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

    良好的輸出看起來像：

    - `Runtime: running`
    - `RPC probe: ok`
    - 您的頻道在 `channels status --probe` 中顯示已連線/就緒
    - 發送者顯示已核准（或 DM 政策為開放/白名單）

    常見日誌特徵：

    - `drop guild message (mention required` → 提及閘門在 Discord 中阻擋了訊息。
    - `pairing request` → 發送者未核准且正在等待 DM 配對核准。
    - 頻道日誌中的 `blocked` / `allowlist` → 發送者、房間或群組已被過濾。

    深入頁面：

    - [/gateway/troubleshooting#no-replies](/en/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/en/channels/troubleshooting)
    - [/channels/pairing](/en/channels/pairing)

  </Accordion>

  <Accordion title="Dashboard or Control UI will not connect">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    良好的輸出看起來像：

    - `Dashboard: http://...` 顯示於 `openclaw gateway status`
    - `RPC probe: ok`
    - 日誌中沒有驗證迴圈

    常見日誌特徵：

    - `device identity required` → HTTP/非安全內容無法完成裝置驗證。
    - `AUTH_TOKEN_MISMATCH` 伴隨重試提示 (`canRetryWithDeviceToken=true`) → 自動發生一次信任的裝置權杖重試。
    - 該次重試後重複的 `unauthorized` → 權杖/密碼錯誤、驗證模式不符，或過期的配對裝置權杖。
    - `gateway connect failed:` → UI 指向了錯誤的 URL/連接埠或無法抵達的閘道。

    深入頁面：

    - [/gateway/troubleshooting#dashboard-control-ui-connectivity](/en/gateway/troubleshooting#dashboard-control-ui-connectivity)
    - [/web/control-ui](/en/web/control-ui)
    - [/gateway/authentication](/en/gateway/authentication)

  </Accordion>

  <Accordion title="Gateway will not start or service installed but not running">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    正常輸出如下所示：

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `RPC probe: ok`

    常見日誌特徵：

    - `Gateway start blocked: set gateway.mode=local` → gateway mode is unset/remote.
    - `refusing to bind gateway ... without auth` → non-loopback bind without token/password.
    - `another gateway instance is already listening` 或 `EADDRINUSE` → port already taken.

    深入頁面：

    - [/gateway/troubleshooting#gateway-service-not-running](/en/gateway/troubleshooting#gateway-service-not-running)
    - [/gateway/background-process](/en/gateway/background-process)
    - [/gateway/configuration](/en/gateway/configuration)

  </Accordion>

  <Accordion title="Channel connects but messages do not flow">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    正常輸出如下所示：

    - 頻道傳輸已連接。
    - 配對/白名單檢查通過。
    - 在需要的地方檢測到提及。

    常見日誌特徵：

    - `mention required` → group mention gating blocked processing.
    - `pairing` / `pending` → DM sender is not approved yet.
    - `not_in_channel`, `missing_scope`, `Forbidden`, `401/403` → channel permission token issue.

    深入頁面：

    - [/gateway/troubleshooting#channel-connected-messages-not-flowing](/en/gateway/troubleshooting#channel-connected-messages-not-flowing)
    - [/channels/troubleshooting](/en/channels/troubleshooting)

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

    正常的輸出如下：

    - `cron.status` 顯示已啟用並有下次喚醒時間。
    - `cron runs` 顯示最近的 `ok` 記錄。
    - 心跳已啟用且不在非活動時間內。

    常見日誌特徵：

    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
    - `heartbeat skipped` 伴隨 `reason=quiet-hours` → 超出設定的活動時間。
    - `requests-in-flight` → 主通道忙碌；心跳喚醒已延遲。
    - `unknown accountId` → 心跳傳送目標帳戶不存在。

    深入頁面：

    - [/gateway/troubleshooting#cron-and-heartbeat-delivery](/en/gateway/troubleshooting#cron-and-heartbeat-delivery)
    - [/automation/troubleshooting](/en/automation/troubleshooting)
    - [/gateway/heartbeat](/en/gateway/heartbeat)

  </Accordion>

  <Accordion title="Node 已配對但工具在 camera/canvas/screen/exec 上失敗">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw nodes status
    openclaw nodes describe --node <idOrNameOrIp>
    openclaw logs --follow
    ```

    正常的輸出如下：

    - Node 已列為已連線並已針對角色 `node` 進行配對。
    - 您正在呼叫的指令具備對應功能。
    - 工具的權限狀態已授權。

    常見日誌特徵：

    - `NODE_BACKGROUND_UNAVAILABLE` → 將 node 應用程式帶到前景。
    - `*_PERMISSION_REQUIRED` → OS 權限被拒絕或遺失。
    - `SYSTEM_RUN_DENIED: approval required` → exec 執行核准待處理。
    - `SYSTEM_RUN_DENIED: allowlist miss` → 指令不在 exec 允許清單上。

    深入頁面：

    - [/gateway/troubleshooting#node-paired-tool-fails](/en/gateway/troubleshooting#node-paired-tool-fails)
    - [/nodes/troubleshooting](/en/nodes/troubleshooting)
    - [/tools/exec-approvals](/en/tools/exec-approvals)

  </Accordion>

  <Accordion title="Exec 突然要求批准">
    ```bash
    openclaw config get tools.exec.host
    openclaw config get tools.exec.security
    openclaw config get tools.exec.ask
    openclaw gateway restart
    ```

    變更內容：

    - 如果未設定 `tools.exec.host`，預設值為 `auto`。
    - 當沙箱執行時期處於啟用狀態時，`host=auto` 會解析為 `sandbox`，否則為 `gateway`。
    - 在 `gateway` 和 `node` 上，未設定的 `tools.exec.security` 預設為 `allowlist`。
    - 未設定的 `tools.exec.ask` 預設為 `on-miss`。
    - 結果：一般的 host 指令現在可以透過 `Approval required` 暫停，而不是立即執行。

    恢復舊的 gateway 無需批准行為：

    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```

    更安全的替代方案：

    - 如果您只需要穩定的 host 路由並且仍然需要批准，請僅設定 `tools.exec.host=gateway`。
    - 如果您想要 host exec 但仍希望在遺漏允許清單項目時進行審查，請將 `security=allowlist` 與 `ask=on-miss` 一起保留。
    - 如果您希望 `host=auto` 解析回 `sandbox`，請啟用沙箱模式。

    常見日誌特徵：

    - `Approval required.` → 指令正在等待 `/approve ...`。
    - `SYSTEM_RUN_DENIED: approval required` → node-host exec 批准待定。
    - `exec host=sandbox requires a sandbox runtime for this session` → 隱含/明確沙箱選擇，但沙箱模式已關閉。

    深度頁面：

    - [/tools/exec](/en/tools/exec)
    - [/tools/exec-approvals](/en/tools/exec-approvals)
    - [/gateway/security#runtime-expectation-drift](/en/gateway/security#runtime-expectation-drift)

  </Accordion>

  <Accordion title="瀏覽器工具失敗">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw browser status
    openclaw logs --follow
    openclaw doctor
    ```

    正常的輸出如下：

    - 瀏覽器狀態顯示 `running: true` 以及所選的瀏覽器/設定檔。
    - `openclaw` 啟動，或 `user` 可以看到本機 Chrome 分頁。

    常見的日誌特徵：

    - `unknown command "browser"` 或 `unknown command 'browser'` → `plugins.allow` 已設定且未包含 `browser`。
    - `Failed to start Chrome CDP on port` → 本機瀏覽器啟動失敗。
    - `browser.executablePath not found` → 設定的二進位路徑錯誤。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟本機 Chrome 分頁。
    - `Browser attachOnly is enabled ... not reachable` → 僅附加設定檔沒有作用中的 CDP 目標。

    深入頁面：

    - [/gateway/troubleshooting#browser-tool-fails](/en/gateway/troubleshooting#browser-tool-fails)
    - [/tools/browser#missing-browser-command-or-tool](/en/tools/browser#missing-browser-command-or-tool)
    - [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
    - [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

  </Accordion>
</AccordionGroup>

## 相關

- [常見問題](/en/help/faq) — 經常詢問的問題
- [閘道疑難排解](/en/gateway/troubleshooting) — 閘道相關問題
- [Doctor](/en/gateway/doctor) — 自動健康檢查與修復
- [頻道疑難排解](/en/channels/troubleshooting) — 頻道連線問題
- [自動化疑難排解](/en/automation/troubleshooting) — cron 和心跳問題
