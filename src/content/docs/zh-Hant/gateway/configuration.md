---
summary: "配置概覽：常見任務、快速設定，以及完整參考連結"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuration"
---

# Configuration

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取選用的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 設定檔。

如果檔案不存在，OpenClaw 將使用安全的預設值。新增設定檔的常見原因：

- 連接頻道並控制誰可以傳送訊息給機器人
- 設定模型、工具、沙盒或自動化 (cron, hooks)
- 調整 Sessions、媒體、網路或 UI

請參閱 [完整參考](/en/gateway/configuration-reference) 以了解所有可用欄位。

<Tip>**剛接觸設定？** 請從 `openclaw onboard` 開始進行互動式設定，或查看 [設定範例](/en/gateway/configuration-examples) 指南以取得完整的複製貼上設定檔。</Tip>

## 最精簡設定

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 編輯設定

<Tabs>
  <Tab title="Interactive wizard">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。Control UI 會根據設定架構呈現表單，並提供 **Raw JSON** 編輯器作為備用方案。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看此檔案並自動套用變更 (請參閱 [熱重載](#config-hot-reload))。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合架構的設定。未知的鍵、格式錯誤的類型或無效的數值會導致 Gateway **拒絕啟動**。唯一的一級例外是 `$schema` (字串)，讓編輯器可以附加 JSON Schema 元資料。</Warning>

當驗證失敗時：

- Gateway 不會啟動
- 只有診斷指令能運作 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 執行 `openclaw doctor` 以查看確切的問題
- 執行 `openclaw doctor --fix` (或 `--yes`) 以套用修復

## 常見任務

<AccordionGroup>
  <Accordion title="設定通道 (WhatsApp, Telegram, Discord 等)">
    每個通道都在 `channels.<provider>` 下有自己的配置部分。請參閱專用的通道頁面以了解設定步驟：

    - [WhatsApp](/en/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/en/channels/telegram) — `channels.telegram`
    - [Discord](/en/channels/discord) — `channels.discord`
    - [Slack](/en/channels/slack) — `channels.slack`
    - [Signal](/en/channels/signal) — `channels.signal`
    - [iMessage](/en/channels/imessage) — `channels.imessage`
    - [Google Chat](/en/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/en/channels/mattermost) — `channels.mattermost`
    - [Microsoft Teams](/en/channels/msteams) — `channels.msteams`

    所有通道共用相同的 DM 政策模式：

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
    設定主要模型和可選的備援模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定義模型目錄並作為 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式 (例如 `anthropic/claude-opus-4-6`)。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具圖片的縮小比例 (預設為 `1200`)；較低的值通常會減少大量截圖執行中的視覺 token 使用量。
    - 請參閱 [Models CLI](/en/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/en/concepts/model-failover) 以了解認證輪替和備援行為。
    - 針對自訂/自託管的提供者，請參閱參考資料中的 [Custom providers](/en/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳訊息給機器人">
    DM 存取權透過 `dmPolicy` 依通道控制：

    - `"pairing"` (預設)：未知發送者會收到一次性配對碼以供核准
    - `"allowlist"`：僅限 `allowFrom` 中的發送者 (或已配對的允許儲存)
    - `"open"`：允許所有傳入 DM (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有 DM

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定通道的允許清單。

    請參閱 [完整參考資料](/en/gateway/configuration-reference#dm-and-group-access) 以了解每個通道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天提及閘道">
    群組訊息預設為 **需要提及**。請針對每個代理程式設定模式：

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

    - **中繼資料提及**：原生 @-提及 (WhatsApp 點選提及、Telegram @bot 等)
    - **文字模式**：`mentionPatterns` 中的安全正規表示式模式
    - 請參閱 [完整參考資料](/en/gateway/configuration-reference#group-chat-mention-gating) 以了解每個通道的覆寫和自聊模式。

  </Accordion>

  <Accordion title="調整閘道通道健康監控">
    控制閘道重新啟動看起來過時通道的積極程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 以停用單一通道或帳戶的自動重新啟動，而不需停用全域監控器。
    - 請參閱 [健康檢查](/en/gateway/health) 以了解操作除錯，以及 [完整參考資料](/en/gateway/configuration-reference#gateway) 以了解所有欄位。

  </Accordion>

  <Accordion title="Configure sessions and resets">
    會話控制對話連續性和隔離性：

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

    - `dmScope`: `main` (共用) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: 執行緒綁定會話路由的全域預設值（Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 參閱 [Session Management](/en/concepts/session) 以了解範圍、身分連結和傳送策略。
    - 參閱 [full reference](/en/gateway/configuration-reference#session) 以了解所有欄位。

  </Accordion>

  <Accordion title="Enable sandboxing">
    在獨立的 Docker 容器中執行代理程式會話：

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

    先建構映像檔：`scripts/sandbox-setup.sh`

    參閱 [Sandboxing](/en/gateway/sandboxing) 以了解完整指南，並參閱 [full reference](/en/gateway/configuration-reference#agentsdefaultssandbox) 以了解所有選項。

  </Accordion>

  <Accordion title="針對官方 iOS 版本啟用中繼推送">
    中繼推送是在 `openclaw.json` 中設定。

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

    對等的 CLI 指令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此設定的作用：

    - 讓 gateway 透過外部中繼傳送 `push.test`、喚醒推播 (wake nudges) 以及重新連線喚醒 (reconnect wakes)。
    - 使用配對的 iOS 應用程式轉發的註冊範圍傳送權限 (send grant)。Gateway 不需要部署範圍的中繼權杖 (relay token)。
    - 將每個中繼備援的註冊綁定到 iOS 應用程式配對的 gateway 身份，因此另一個 gateway 無法重複使用已儲存的註冊。
    - 讓本機/手動 iOS 版本保持在直接 APNs 連線。中繼備援傳送僅適用於透過中繼註冊的官方發布版本。
    - 必須符合內建於官方/TestFlight iOS 版本的中繼基底 URL，以便註冊和傳送流量到達相同的中繼部署。

    端對端流程：

    1. 安裝使用相同中繼基底 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 gateway 配對，並讓節點 (node) 和操作員 (operator) 工作階段都進行連線。
    4. iOS 應用程式會擷取 gateway 身份，使用 App Attest 加上應用程式收據向中繼註冊，然後將中繼備援的 `push.apns.register` 資料發佈至配對的 gateway。
    5. Gateway 會儲存中繼控制代碼 (handle) 和傳送權限，然後將其用於 `push.test`、喚醒推播以及重新連線喚醒。

    操作注意事項：

    - 如果您將 iOS 應用程式切換到不同的 gateway，請重新連線應用程式，以便它可以發佈綁定到該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，應用程式會重新整理其快取的中繼註冊，而不是重複使用舊的中繼來源。

    相容性注意事項：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍然可以作為臨時的環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是僅限迴路的開發逃生艙；請勿在設定中保留 HTTP 中繼 URL。

    請參閱 [iOS App](/en/platforms/ios#relay-backed-push-for-official-builds) 以了解端對端流程，並參閱 [Authentication and trust flow](/en/platforms/ios#authentication-and-trust-flow) 以了解中繼安全模型。

  </Accordion>

  <Accordion title="設定心跳（定期檢查）">
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

    - `every`: 持續時間字串 (`30m`, `2h`)。設定 `0m` 以停用。
    - `target`: `last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`: `allow` (預設) 或 `block` 用於 DM 風格的心跳目標
    - 參閱 [Heartbeat](/en/gateway/heartbeat) 以取得完整指南。

  </Accordion>

  <Accordion title="設定 cron 工作">
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

    - `sessionRetention`: 從 `sessions.json` 中清除已完成的隔離執行階段 (預設 `24h`；設定 `false` 以停用)。
    - `runLog`: 根據大小和保留行數清除 `cron/runs/<jobId>.jsonl`。
    - 參閱 [Cron jobs](/en/automation/cron-jobs) 以取得功能概覽和 CLI 範例。

  </Accordion>

  <Accordion title="設定 Webhook (hooks)">
    在 Gateway 上啟用 HTTP webhook 端點：

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

    安全性備註：
    - 將所有 hook/webhook 載荷內容視為不受信任的輸入。
    - 保持不安全內容繞過旗標為停用狀態 (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`)，除非進行嚴格範圍的除錯。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具政策 (例如僅限訊息傳遞加上可能的沙箱機制)。

    參閱 [完整參考資料](/en/gateway/configuration-reference#hooks) 以取得所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="配置多代理路由">
    使用獨立的工作區和會話運行多個隔離的代理：

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

    參閱 [Multi-Agent](/en/concepts/multi-agent) 和 [完整參考](/en/gateway/configuration-reference#multi-agent-routing) 以了解綁定規則和每個代理的存取設定檔。

  </Accordion>

  <Accordion title="將配置拆分為多個檔案 ($include)">
    使用 `$include` 來組織大型配置：

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
    - **檔案陣列**：按順序深度合併（後者優先）
    - **同層級鍵**：在包含之後合併（覆蓋包含的值）
    - **巢狀包含**：支援最多 10 層深
    - **相對路徑**：相對於包含檔案解析
    - **錯誤處理**：對於缺失檔案、解析錯誤和循環包含提供清晰的錯誤訊息

  </Accordion>
</AccordionGroup>

## 配置熱重載

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 — 對於大多數設定，不需要手動重新啟動。

### 重載模式

| 模式                | 行為                                                          |
| ------------------- | ------------------------------------------------------------- |
| **`hybrid`** (預設) | 即時熱套用安全變更。對於關鍵變更則自動重新啟動。              |
| **`hot`**           | 僅熱套用安全變更。當需要重新啟動時會記錄警告 — 由您自行處理。 |
| **`restart`**       | 在任何配置變更（無論是否安全）時重新啟動 Gateway。            |
| **`off`**           | 停用檔案監視。變更將在下一次手動重新啟動時生效。              |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 熱套用項目與需重啟項目

大多數欄位可以無停機時間地熱套用。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                   | 需要重新啟動？ |
| -------------- | ------------------------------------------------------ | -------------- |
| 頻道           | `channels.*`, `web` (WhatsApp) — 所有內建和擴充頻道    | 否             |
| 代理與模型     | `agent`, `agents`, `models`, `routing`                 | 否             |
| 自動化         | `hooks`, `cron`, `agent.heartbeat`                     | 否             |
| 會話與訊息     | `session`, `messages`                                  | 否             |
| 工具與媒體     | `tools`, `browser`, `skills`, `audio`, `talk`          | 否             |
| 介面與其他     | `ui`, `logging`, `identity`, `bindings`                | 否             |
| Gateway 伺服器 | `gateway.*` (連接埠、綁定、驗證、Tailscale、TLS、HTTP) | **是**         |
| 基礎設施       | `discovery`, `canvasHost`, `plugins`                   | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 —— 更改它們並**不**會觸發重啟。</Note>

## Config RPC (程式化更新)

<Note>控制平面寫入 RPC (`config.apply`, `config.patch`, `update.run`) 對每個 `deviceId+clientIp` 限制為 **60 秒內 3 個請求**。當受到限制時，RPC 會傳回 `UNAVAILABLE` 並附帶 `retryAfterMs`。</Note>

<AccordionGroup>
  <Accordion title="config.apply (完全替換)">
    驗證 + 寫入完整設定並在一步驟中重新啟動 Gateway。

    <Warning>
    `config.apply` 會替換 **完整設定**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 更新單一金鑰。
    </Warning>

    參數：

    - `raw` (字串) — 整個設定的 JSON5 載荷
    - `baseHash` (選用) — 來自 `config.get` 的設定雜湊值 (當設定存在時為必填)
    - `sessionKey` (選用) — 用於重啟後喚醒 ping 的會話金鑰
    - `note` (選用) — 重啟哨兵的備註
    - `restartDelayMs` (選用) — 重啟前的延遲時間 (預設為 2000)

    當一個重啟請求已經在等待或進行中時，後續的請求會被合併，並且在重啟週期之間有 30 秒的冷卻時間。

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

    - `raw` (string) — 僅包含要更改的鍵的 JSON5
    - `baseHash` (required) — 來自 `config.get` 的配置雜湊
    - `sessionKey`, `note`, `restartDelayMs` — 同 `config.apply`

    重啟行為與 `config.apply` 相符：合併待處理的重啟，並在重啟週期之間有 30 秒的冷卻時間。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

OpenClaw 從父進程以及以下來源讀取環境變數：

- 來自當前工作目錄的 `.env`（如果存在）
- `~/.openclaw/.env`（全域回退）

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
  如果啟用此選項且未設定預期的鍵，OpenClaw 將執行您的登入 shell 並僅匯入缺失的鍵：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效的環境變數： `OPENCLAW_LOAD_SHELL_ENV=1`

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

- 僅匹配大寫名稱： `[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時拋出錯誤
- 使用 `$${VAR}` 進行轉義以獲得字面輸出
- 在 `$include` 檔案中有效
- 內聯替換： `"${BASE}/v1"` → `"https://api.example.com/v1"`

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
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
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

SecretRef 的詳細資訊（包括適用於 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/en/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/en/reference/secretref-credential-surface)。

</Accordion>

請參閱 [Environment](/en/help/environment) 以了解完整的優先順序和來源。

## 完整參考

如需完整的逐欄位參考，請參閱 **[Configuration Reference](/en/gateway/configuration-reference)**。

---

_相關連結：[Configuration Examples](/en/gateway/configuration-examples) · [Configuration Reference](/en/gateway/configuration-reference) · [Doctor](/en/gateway/doctor)_
