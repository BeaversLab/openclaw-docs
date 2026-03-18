---
summary: "組態概覽：常見任務、快速設定，以及完整參考文件的連結"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "組態"
---

# 組態

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取選用的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 組態。

如果檔案遺失，OpenClaw 會使用安全的預設值。新增組態的常見原因：

- 連接頻道並控制誰可以傳訊息給機器人
- 設定模型、工具、沙盒或自動化 (cron、hooks)
- 調整工作階段、媒體、網路或 UI

請參閱 [完整參考文件](/zh-Hant/gateway/configuration-reference) 以了解每個可用欄位。

<Tip>
  **初次接觸組態？** 請從 `openclaw onboard` 開始進行互動式設定，或是查看
  [組態範例](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上組態。
</Tip>

## 最小化組態

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 編輯組態

<Tabs>
  <Tab title="Interactive wizard">
    ```bash
    openclaw onboard       # full onboarding flow
    openclaw configure     # config wizard
    ```
  </Tab>
  <Tab title="CLI (one-liners)">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset tools.web.search.apiKey
    ```
  </Tab>
  <Tab title="控制 UI">
    開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **組態** 分頁。 控制 UI
    會根據組態綱要呈現表單，並提供 **Raw JSON** 編輯器作為備案。
  </Tab>
  <Tab title="直接編輯">
    直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更 (請參閱
    [熱重載](#config-hot-reload))。
  </Tab>
</Tabs>

## 嚴格驗證

<Warning>
  OpenClaw 僅接受完全符合綱要的組態。未知的金鑰、格式錯誤的類型或無效的值會導致 Gateway
  **拒絕啟動**。唯一頂層的例外是 `$schema` (字串)，以便編輯器能附加 JSON Schema 元資料。
</Warning>

當驗證失敗時：

- Gateway 無法啟動
- 僅診斷指令有效 (`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`)
- 執行 `openclaw doctor` 以查看確切問題
- 執行 `openclaw doctor --fix` (或 `--yes`) 以套用修復

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道（WhatsApp、Telegram、Discord 等）">
    每個頻道在 `channels.<provider>` 下都有自己的設定區段。請參閱專屬的頻道頁面瞭解設定步驟：

    - [WhatsApp](/zh-Hant/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh-Hant/channels/telegram) — `channels.telegram`
    - [Discord](/zh-Hant/channels/discord) — `channels.discord`
    - [Slack](/zh-Hant/channels/slack) — `channels.slack`
    - [Signal](/zh-Hant/channels/signal) — `channels.signal`
    - [iMessage](/zh-Hant/channels/imessage) — `channels.imessage`
    - [Google Chat](/zh-Hant/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/zh-Hant/channels/mattermost) — `channels.mattermost`
    - [MS Teams](/zh-Hant/channels/msteams) — `channels.msteams`

    所有頻道共用相同的 DM 政策模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // only for allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="選擇並設定模型">
    設定主要模型和可選的備選模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-5",
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定義模型目錄並作為 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具圖片的縮小比例（預設為 `1200`）；較低的值通常會減少在截圖密集執行時的視覺權位使用量。
    - 請參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/zh-Hant/concepts/model-failover) 以瞭解認證輪替和備援行為。
    - 對於自訂/自我託管的提供者，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳送訊息給機器人">
    私訊存取權透過 `dmPolicy` 依頻道控制：

    - `"pairing"` (預設)：未知發送者會收到一次性配對碼以進行核准
    - `"allowlist"`：僅限 `allowFrom` 中的發送者 (或已配對的允許儲存)
    - `"open"`：允許所有傳入私訊 (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有私訊

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定頻道的允許清單。

    請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#dm-and-group-access) 以了解各頻道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天提及閘道">
    群組訊息預設為 **需要提及**。為每個代理設定模式：

    ```json5
    {
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **中繼資料提及**：原生 @-提及 (WhatsApp 點擊提及、Telegram @bot 等)
    - **文字模式**：`mentionPatterns` 中的安全 regex 模式
    - 請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#group-chat-mention-gating) 以了解各頻道的覆寫和自我聊天模式。

  </Accordion>

  <Accordion title="調整閘道頻道健康監控">
    控制閘道如何積極地重新啟動看似過時的頻道：

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - 設定 `gateway.channelHealthCheckMinutes: 0` 以全域停用健康監控重新啟動。
    - `channelStaleEventThresholdMinutes` 應大於或等於檢查間隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 停用單一頻道或帳戶的自動重新啟動，而不停用全域監控器。
    - 請參閱 [健康檢查](/zh-Hant/gateway/health) 以進行營運除錯，並參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#gateway) 以了解所有欄位。

  </Accordion>

  <Accordion title="配置會話和重置">
    會話控制對話的連續性和隔離性：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // recommended for multi-user
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope`: `main` (共享) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: 綁定執行緒的會話路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 參閱[會話管理](/zh-Hant/concepts/session)以了解範圍設定、身分連結和傳送策略。
    - 參閱[完整參考](/zh-Hant/gateway/configuration-reference#session)以了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙盒">
    在隔離的 Docker 容器中執行代理程式會話：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    首先建構映像檔： `scripts/sandbox-setup.sh`

    參閱[沙盒化](/zh-Hant/gateway/sandboxing)以取得完整指南，並參閱[完整參考](/zh-Hant/gateway/configuration-reference#sandbox)以了解所有選項。

  </Accordion>

  <Accordion title="為官方 iOS 版本啟用基於轉送的推送">
    基於轉送的推送是在 `openclaw.json` 中配置的。

    在 gateway config 中設定此項：

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // Optional. Default: 10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    CLI 對等寫法：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    其作用：

    - 允許 gateway 通過外部轉送服務發送 `push.test`、喚醒推撥（wake nudges）和重連喚醒（reconnect wakes）。
    - 使用由配對的 iOS 應用程式轉發的註冊範圍發送授權（send grant）。gateway 不需要部署範圍的轉送權杖（relay token）。
    - 將每個基於轉送的註冊綁定到 iOS 應用程式配對的 gateway 身份，因此另一個 gateway 無法重複使用已儲存的註冊。
    - 讓本地/手動構建的 iOS 版本保持使用直接 APNs 連線。基於轉送的發送僅適用於透過轉送服務註冊的官方發行版本。
    - 必須與內建於官方/TestFlight iOS 版本中的轉送基礎 URL（relay base URL）相符，以便註冊和發送流量到達同一個轉送部署。

    端到端流程：

    1. 安裝使用相同轉送基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 gateway 配對，並讓 node 和 operator 會話都連線。
    4. iOS 應用程式獲取 gateway 身份，使用 App Attest 加上應用程式收據（app receipt）向轉送服務註冊，然後將基於轉送的 `push.apns.register` payload 發布到配對的 gateway。
    5. gateway 儲存轉送控制代碼（relay handle）和發送授權，然後將其用於 `push.test`、喚醒推撥和重連喚醒。

    操作注意事項：

    - 如果您將 iOS 應用程式切換到不同的 gateway，請重新連線應用程式，以便其發布綁定到該 gateway 的新轉送註冊。
    - 如果您發布指向不同轉送部署的新 iOS 版本，應用程式會重新整理其快取的轉送註冊，而不是重用舊的轉送來源（relay origin）。

    相容性說明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為臨時的環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是僅限本機開發的緊急逃生出口（escape hatch）；請勿在配置中保存 HTTP 轉送 URL。

    請參閱 [iOS App](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 了解端到端流程，以及 [Authentication and trust flow](/zh-Hant/platforms/ios#authentication-and-trust-flow) 了解轉送安全模型。

  </Accordion>

  <Accordion title="Set up heartbeat (periodic check-ins)">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every`: duration string (`30m`, `2h`). Set `0m` to disable.
    - `target`: `last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`: `allow` (預設) or `block` for DM-style heartbeat targets
    - See [Heartbeat](/zh-Hant/gateway/heartbeat) for the full guide.

  </Accordion>

  <Accordion title="Configure cron jobs">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2,
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`: prune completed isolated run sessions from `sessions.json` (預設 `24h`; set `false` to disable).
    - `runLog`: prune `cron/runs/<jobId>.jsonl` by size and retained lines.
    - See [Cron jobs](/zh-Hant/automation/cron-jobs) for feature overview and CLI examples.

  </Accordion>

  <Accordion title="Set up webhooks (hooks)">
    Enable HTTP webhook endpoints on the Gateway:

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    Security note:
    - Treat all hook/webhook payload content as untrusted input.
    - Keep unsafe-content bypass flags disabled (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) unless doing tightly scoped debugging.
    - For hook-driven agents, prefer strong modern model tiers and strict tool policy (for example messaging-only plus sandboxing where possible).

    See [full reference](/zh-Hant/gateway/configuration-reference#hooks) for all mapping options and Gmail integration.

  </Accordion>

  <Accordion title="設定多代理路由">
    執行多個獨立的代理，每個代理擁有獨立的工作空間和工作階段：

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    請參閱 [多代理](/zh-Hant/concepts/multi-agent) 和 [完整參考](/zh-Hant/gateway/configuration-reference#multi-agent-routing) 以了解綁定規則和每個代理的存取設定檔。

  </Accordion>

  <Accordion title="將設定分割為多個檔案 ($include)">
    使用 `$include` 來組織大型設定：

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **單一檔案**：取代包含的物件
    - **檔案陣列**：按順序進行深度合併（後面的優先）
    - **同層級金鑰**：在引入之後合併（覆蓋引入的值）
    - **巢狀引入**：最多支援 10 層深度
    - **相對路徑**：相對於引入檔案解析
    - **錯誤處理**：針對遺失檔案、解析錯誤和循環引入提供清楚的錯誤訊息

  </Accordion>
</AccordionGroup>

## 設定熱重新載入

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 — 對於大多數設定，無需手動重新啟動。

### 重新載入模式

| 模式                | 行為                                                            |
| ------------------- | --------------------------------------------------------------- |
| **`hybrid`** (預設) | 立即熱套用安全的變更。對於關鍵變更，會自動重新啟動。            |
| **`hot`**           | 僅熱套用安全的變更。當需要重新啟動時會記錄警告 — 由您自行處理。 |
| **`restart`**       | 在任何設定變更時（無論是否安全）都重新啟動 Gateway。            |
| **`off`**           | 停用檔案監視。變更將在下次手動重新啟動時生效。                  |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 何時熱套用 vs 何時需要重新啟動

大多數欄位可無停機時間地熱套用。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別                | 欄位                                                 | 需要重新啟動？ |
| ------------------- | ---------------------------------------------------- | -------------- |
| 頻道                | `channels.*`, `web` (WhatsApp) — 所有內建和擴充頻道  | 否             |
| 代理與模型          | `agent`, `agents`, `models`, `routing`               | 否             |
| 自動化              | `hooks`, `cron`, `agent.heartbeat`                   | 否             |
| Sessions & messages | `session`, `messages`                                | 否             |
| Tools & media       | `tools`, `browser`, `skills`, `audio`, `talk`        | 否             |
| UI & misc           | `ui`, `logging`, `identity`, `bindings`              | 否             |
| Gateway server      | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP) | **是**         |
| Infrastructure      | `discovery`, `canvasHost`, `plugins`                 | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 —— 更改它們**不會**觸發重啟。</Note>

## Config RPC (programmatic updates)

<Note>
  Control-plane write RPCs (`config.apply`, `config.patch`, `update.run`) 每個 `deviceId+clientIp`
  限制為 **每 60 秒 3 個請求**。當受限時，RPC 返回 `UNAVAILABLE` 並帶有 `retryAfterMs`。
</Note>

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    驗證 + 寫入完整配置並一步重啟 Gateway。

    <Warning>
    `config.apply` 會替換**整個配置**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 進行單一鍵更新。
    </Warning>

    參數：

    - `raw` (字串) — 整個配置的 JSON5 載荷
    - `baseHash` (可選) — 來自 `config.get` 的配置雜湊 (當配置存在時為必填)
    - `sessionKey` (可選) — 用於重啟後喚醒 ping 的 session key
    - `note` (可選) — 重啟哨兵 的備註
    - `restartDelayMs` (可選) — 重啟前的延遲 (預設 2000)

    當一個重啟請求已經掛起或正在進行時，重啟請求會被合併，並且在重啟週期之間會有 30 秒的冷卻時間。

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (partial update)">
    將部分更新合併到現有配置中（JSON 合併補丁語義）：

    - 物件遞迴合併
    - `null` 刪除一個鍵
    - 陣列替換

    參數：

    - `raw` (字串) — 僅包含要更改的鍵的 JSON5
    - `baseHash` (必需) — 來自 `config.get` 的配置雜湊
    - `sessionKey`, `note`, `restartDelayMs` — 與 `config.apply` 相同

    重啟行為與 `config.apply` 匹配：合併待處理的重啟以及重啟週期之間的 30 秒冷卻時間。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

OpenClaw 從父程序讀取環境變數，外加：

- 當前工作目錄中的 `.env`（如果存在）
- `~/.openclaw/.env`（全域後備）

這兩個檔案都不會覆蓋現有的環境變數。您也可以在配置中設定內聯環境變數：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell env import (optional)">
  如果啟用且未設定預期的鍵，OpenClaw 會執行您的登入 shell 並僅匯入缺失的鍵：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效的環境變數：`OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Env var substitution in config values">
  使用 `${VAR_NAME}` 在任何配置字串值中引用環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時拋出錯誤
- 使用 `$${VAR}` 進行轉義以獲得字面輸出
- 在 `$include` 檔案內有效
- 內聯替換：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
  對於支援 SecretRef 物件的欄位，您可以使用：

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "nano-banana-pro": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/nano-banana-pro/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

SecretRef 的詳細資訊（包括用於 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

## 完整參考

如需完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
