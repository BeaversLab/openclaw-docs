---
summary: "設定概覽：常見任務、快速設置，以及完整參考的連結"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "設定"
---

# Configuration

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取選用的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 設定檔。
有效的設定路徑必須是常規檔案。OpenClaw 擁有的寫入操作不支援透過符號連結 `openclaw.json` 佈局；原子寫入可能會直接替換路徑而不保留符號連結。如果您將設定保留在預設狀態目錄之外，請直接將 `OPENCLAW_CONFIG_PATH` 指向實際檔案。

如果檔案不存在，OpenClaw 將使用安全的預設值。新增設定檔的常見原因：

- 連接頻道並控制誰可以傳送訊息給機器人
- 設定模型、工具、沙盒或自動化 (cron, hooks)
- 調整 Sessions、媒體、網路或 UI

請參閱 [完整參考](/zh-Hant/gateway/configuration-reference) 以了解每個可用欄位。

<Tip>**初次接觸設定？** 請從 `openclaw onboard` 開始進行互動式設定，或查看 [設定範例](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上設定。</Tip>

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
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會根據即時設定架構呈現表單，其中包含欄位 `title` / `description` 文件元數據，以及外掛程式和通道架構（如果有的話），並提供 **Raw JSON** 編輯器作為備選方案。對於鑽取式 UI 和其他工具，閘道也會公開 `config.schema.lookup` 以 取得單一路徑範圍的架構節點及其直接子項摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（請參閱 [熱重載](#config-hot-reload)）。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合架構的設定。未知的金鑰、格式錯誤的類型或無效的數值會導致 Gateway **拒絕啟動**。唯一根層級的例外是 `$schema` (字串)，讓編輯器可以附加 JSON Schema 元數據。</Warning>

架構工具說明：

- `openclaw config schema` 會列印出與 Control UI
  和設定驗證所使用的相同 JSON Schema 系列。
- 請將該架構輸出視為
  `openclaw.json` 的標準機器可讀取合約；本概述和設定參考僅為其摘要。
- 欄位 `title` 和 `description` 的值會被帶入到 schema 輸出中，以供編輯器和表單工具使用。
- 巢狀物件、萬用字元 (`*`) 和陣列項目 (`[]`) 項目會繼承相同的文件元數據，只要存在匹配的欄位文件即可。
- `anyOf` / `oneOf` / `allOf` 組合分支也會繼承相同的文件元數據，因此聯集/交集變體會保留相同的欄位說明。
- `config.schema.lookup` 會傳回一個標準化的設定路徑，其中包含淺層 schema 節點 (`title`、`description`、`type`、`enum`、`const`、通用邊界和類似的驗證欄位)、匹配的 UI 提示元數據，以及用於下鑽工具的即時子項摘要。
- 當 Gateway 可以載入當前的清單註冊表時，執行時期的 plugin/channel schemas 會被合併進來。
- `pnpm config:docs:check` 會偵測面向文件的設定基準構件與當前 schema 表面之間的偏移。

當驗證失敗時：

- Gateway 無法啟動
- 僅診斷指令有效 (`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`)
- 執行 `openclaw doctor` 以查看確切問題
- 執行 `openclaw doctor --fix` (或 `--yes`) 以套用修復

Gateway 也在成功啟動後保留一份信任的最後已知良好副本。如果 `openclaw.json` 隨後在 OpenClaw 外部被更改且不再通過驗證，啟動和熱加載會將損壞的檔案保留為帶有時間戳記的 `.clobbered.*` 快照，恢復最後已知良好的副本，並記錄一條包含恢復原因的明顯警告。當最後已知良好副本包含這些欄位時，啟動讀取恢復也會將大小急劇下降、缺少配置元資料以及缺少 `gateway.mode` 視為關鍵的覆蓋特徵。如果在其他有效的 JSON 配置之前意外預先附加了一條狀態/日誌行，Gateway 啟動和 `openclaw doctor --fix` 可以去除前綴，將受汙染的檔案保留為 `.clobbered.*`，並使用恢復的 JSON 繼續執行。下一個 main-agent 週期也會收到一個系統事件警告，告知其配置已恢復，不得盲目地重寫。最後已知良好版本的提升會在驗證啟動後和接受的熱加載後更新，包括持久化檔案雜湊仍與接受的寫入相符的 OpenClaw 擁有的配置寫入。當候選配置包含編輯過的秘密佔位符（如 `***`）或縮短的權杖值時，將跳過提升。

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道 (WhatsApp, Telegram, Discord 等)">
    每個頻道在 `channels.<provider>` 下都有自己的配置區段。請參閱專屬頻道頁面以了解設定步驟：

    - [WhatsApp](/zh-Hant/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh-Hant/channels/telegram) — `channels.telegram`
    - [Discord](/zh-Hant/channels/discord) — `channels.discord`
    - [Feishu](/zh-Hant/channels/feishu) — `channels.feishu`
    - [Google Chat](/zh-Hant/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/zh-Hant/channels/msteams) — `channels.msteams`
    - [Slack](/zh-Hant/channels/slack) — `channels.slack`
    - [Signal](/zh-Hant/channels/signal) — `channels.signal`
    - [iMessage](/zh-Hant/channels/imessage) — `channels.imessage`
    - [Mattermost](/zh-Hant/channels/mattermost) — `channels.mattermost`

    所有頻道都共用相同的 DM 政策模式：

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

  <Accordion title="選擇並配置模型">
    設定主要模型和可選的後備模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定義模型目錄並作為 `/model` 的允許清單。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 新增允許清單項目，而不會移除現有模型。會移除項目的單純替換將被拒絕，除非您傳遞 `--replace`。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制轉錄/工具圖片的縮小比例（預設 `1200`）；較低的值通常會減少截圖密集執行中的視覺 token 使用量。
    - 請參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，以及 [Model Failover](/zh-Hant/concepts/model-failover) 以了解認證輪替和後備行為。
    - 對於自訂/自託管的供應商，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳訊息給機器人">
    存取權限透過 `dmPolicy` 依頻道控制：

    - `"pairing"` （預設）：未知發送者會收到一次性配對碼以供核准
    - `"allowlist"`：僅限 `allowFrom` 中的發送者（或已配對的允許儲存區）
    - `"open"`：允許所有傳入的私訊（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私訊

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定頻道的允許清單。

    請參閱 [full reference](/zh-Hant/gateway/configuration-reference#dm-and-group-access) 以了解每個頻道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天提及閘道">
    群組訊息預設為**需要提及**。請針對每個代理程式設定模式：

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

    - **Metadata mentions**: 原生 @-mentions（WhatsApp 點擊提及、Telegram @bot 等）
    - **Text patterns**: `mentionPatterns` 中的安全 regex 模式
    - 請參閱[完整參考資料](/zh-Hant/gateway/configuration-reference#group-chat-mention-gating)以了解每個頻道的覆寫和自聊模式。

  </Accordion>

  <Accordion title="限制每個代理程式的技能">
    使用 `agents.defaults.skills` 作為共用基準，然後使用 `agents.list[].skills` 覆寫特定的
    代理程式：

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // inherits github, weather
          { id: "docs", skills: ["docs-search"] }, // replaces defaults
          { id: "locked-down", skills: [] }, // no skills
        ],
      },
    }
    ```

    - 省略 `agents.defaults.skills` 以預設允許無限制的技能。
    - 省略 `agents.list[].skills` 以繼承預設值。
    - 將 `agents.list[].skills: []` 設定為不使用任何技能。
    - 請參閱[技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config)和
      [設定參考資料](/zh-Hant/gateway/configuration-reference#agents-defaults-skills)。

  </Accordion>

  <Accordion title="調整閘道頻道健康監控">
    控制閘道重新啟動陳舊頻道的積極程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 針對單一頻道或帳戶停用自動重新啟動，而不需停用全域監控器。
    - 請參閱[健康檢查](/zh-Hant/gateway/health)以進行操作除錯，並參閱[完整參考資料](/zh-Hant/gateway/configuration-reference#gateway)以了解所有欄位。

  </Accordion>

  <Accordion title="Configure sessions and resets">
    Sessions control conversation continuity and isolation:

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
    - `threadBindings`: 綁定執行緒之會話路由的全域預設值（Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 請參閱[會話管理](/zh-Hant/concepts/session)以了解範圍、身分連結和傳送原則。
    - 請參閱[完整參考](/zh-Hant/gateway/configuration-reference#session)以了解所有欄位。

  </Accordion>

  <Accordion title="Enable sandboxing">
    在隔離的沙箱執行時間中執行代理程式會話：

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

    請參閱[沙箱機制](/zh-Hant/gateway/sandboxing)以取得完整指南，並參閱[完整參考](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox)以了解所有選項。

  </Accordion>

  <Accordion title="為官方 iOS 版本啟用中繼推送">
    中繼推送是在 `openclaw.json` 中設定。

    在 gateway config 中設定如下：

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

    CLI 同等指令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此設定的作用：

    - 讓 gateway 能夠透過外部中繼發送 `push.test`、喚醒提示以及重新連線喚醒。
    - 使用由配對的 iOS 應用程式轉發的註冊範圍發送授予。Gateway 不需要部署範圍的中繼 token。
    - 將每個中繼註冊綁定到 iOS 應用程式配對的 gateway 身份，因此另一個 gateway 無法重複使用儲存的註冊。
    - 讓本機/手動 iOS 版本保持使用直接 APNs。中繼推送僅適用於透過中繼註冊的正式發佈版本。
    - 必須與內建於官方/TestFlight iOS 版本中的中繼基礎 URL 相符，以便註冊和發送流量到達相同的中繼部署。

    端對端流程：

    1. 安裝使用相同中繼基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 gateway 配對，並讓節點和操作員會話都連線。
    4. iOS 應用程式會取得 gateway 身份，使用 App Attest 和應用程式收據向中繼註冊，然後將中繼 `push.apns.register` payload 發佈到配對的 gateway。
    5. Gateway 儲存中繼控制代碼和發送授予，然後將它們用於 `push.test`、喚醒提示和重新連線喚醒。

    操作說明：

    - 如果您將 iOS 應用程式切換到不同的 gateway，請重新連線應用程式，以便其發佈綁定到該 gateway 的新中繼註冊。
    - 如果您發佈指向不同中繼部署的新 iOS 版本，應用程式會重新整理其快取的中繼註冊，而不是重複使用舊的中繼來源。

    相容性說明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍然可作為暫時的 env 覆寫。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是僅限迴路的開發逃生出口；請勿在 config 中保存 HTTP 中繼 URL。

    請參閱 [iOS 應用程式](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 以了解端對端流程，以及 [驗證和信任流程](/zh-Hant/platforms/ios#authentication-and-trust-flow) 以了解中繼安全模型。

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

    - `every`: 持續時間字串 (`30m`, `2h`)。設為 `0m` 以停用。
    - `target`: `last` | `none` | `<channel-id>` (例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`)
    - `directPolicy`: `allow` (預設) 或 `block` 用於 DM 風格的心跳目標
    - 參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整指南。

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

    - `sessionRetention`: 從 `sessions.json` 清理已完成的獨立執行階段 (預設 `24h`；設為 `false` 以停用)。
    - `runLog`: 根據大小和保留行數清理 `cron/runs/<jobId>.jsonl`。
    - 參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以取得功能概覽和 CLI 範例。

  </Accordion>

  <Accordion title="設定 webhooks (hooks)">
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

    安全注意事項：
    - 將所有 hook/webhook payload 內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；切勿重複使用共用的 Gateway token。
    - Hook 驗證僅限於標頭（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查詢字串 tokens 將被拒絕。
    - `hooks.path` 不能被 `/`；將 webhook 保留在專用的子路徑上，例如 `/hooks`。
    - 除非進行嚴格範圍的除錯，否則請保持不安全內容繞過標誌停用（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）。
    - 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫者選取的 session 金鑰。
    - 對於 hook 驅動的 agents，建議使用強大的現代模型層級和嚴格的工具原則（例如僅限訊息傳遞，並在可行的情況下使用沙箱）。

    查閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#hooks) 以了解所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="設定多代理程式路由">
    執行多個獨立的代理程式，並具有獨立的工作區和會話：

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

    查閱 [多代理程式](/zh-Hant/concepts/multi-agent) 和 [完整參考資料](/zh-Hant/gateway/configuration-reference#multi-agent-routing) 以了解綁定規則和各代理程式的存取設定檔。

  </Accordion>

  <Accordion title="將設定拆分為多個檔案 ($include)">
    使用 `$include` 來整理大型設定：

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
    - **同層級鍵**：在引入後合併（覆寫引入的值）
    - **巢狀引入**：支援最多 10 層深
    - **相對路徑**：相對於引入檔案解析
    - **OpenClaw 擁有的寫入**：當寫入僅改變由單一檔案引入支援的頂層區段（例如 `plugins: { $include: "./plugins.json5" }`），
      OpenClaw 會更新該引入檔案並保持 `openclaw.json` 不變
    - **不支援的透傳寫入**：根層引入、引入陣列，以及具有同層級覆寫的引入，對於 OpenClaw 擁有的寫入將失敗並關閉，而非扁平化設定
    - **錯誤處理**：針對遺失檔案、解析錯誤和循環引入提供清楚的錯誤訊息

  </Accordion>
</AccordionGroup>

## 設定檔熱重新載入

Gateway 會監看 `~/.openclaw/openclaw.json` 並自動套用變更 — 大多數設定無需手動重新啟動。

直接檔案編輯在通過驗證前會被視為不受信任。監看器會等待編輯器的暫時寫入/重新命名混亂平息，讀取最終檔案，並透過還原最後已知正確的設定來拒絕無效的外部編輯。OpenClaw 擁有的設定寫入在寫入前會使用相同的 schema 閘道；諸如捨棄 `gateway.mode` 或將檔案大小縮減超過一半等破壞性覆寫將被拒絕，並儲存為 `.rejected.*` 以供檢查。

如果您在日誌中看到 `Config auto-restored from last-known-good` 或
`config reload restored last-known-good config`，請檢查 `openclaw.json` 旁相符的
`.clobbered.*` 檔案，修復被拒絕的內容，然後執行
`openclaw config validate`。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)
以取得復原檢查清單。

### 重新載入模式

| 模式                | 行為                                                             |
| ------------------- | ---------------------------------------------------------------- |
| **`hybrid`** (預設) | 即時熱套用安全的變更。對於關鍵變更會自動重新啟動。               |
| **`hot`**           | 僅熱套用安全的變更。當需要重新啟動時會記錄警告 —— 由您自行處理。 |
| **`restart`**       | 在任何設定變更（無論是否安全）時重新啟動 Gateway。               |
| **`off`**           | 停用檔案監視。變更將在下次手動重新啟動時生效。                   |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 熱套用項目 vs 需要重新啟動的項目

大多數欄位可在不中斷服務的情況下熱套用。在 `hybrid` 模式下，需要重啟的變更會自動處理。

| 類別           | 欄位                                                 | 需要重新啟動？ |
| -------------- | ---------------------------------------------------- | -------------- |
| 頻道           | `channels.*`, `web` (WhatsApp) — 所有內建和外掛通道  | 否             |
| 代理程式與模型 | `agent`, `agents`, `models`, `routing`               | 否             |
| 自動化         | `hooks`, `cron`, `agent.heartbeat`                   | 否             |
| 工作階段與訊息 | `session`, `messages`                                | 否             |
| 工具與媒體     | `tools`, `browser`, `skills`, `audio`, `talk`        | 否             |
| UI 與其他      | `ui`, `logging`, `identity`, `bindings`              | 否             |
| Gateway 伺服器 | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP) | **是**         |
| 基礎架構       | `discovery`, `canvasHost`, `plugins`                 | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 — 更改它們**不會**觸發重啟。</Note>

### 重新載入計劃

當您編輯透過 `$include` 引用的來源檔案時，OpenClaw 會從
來源撰寫的佈局來規劃重新載入，而非扁平化的記憶體內檢視。
這讓熱重新載入決策（熱套用與重啟）保持可預測，即使當
單一頂層區段位於其單獨的包含檔案中（例如
`plugins: { $include: "./plugins.json5" }`）。

如果無法安全地規劃重新載入 — 例如，因為來源佈局
結合了根層級包含與同層級覆寫 — OpenClaw 會以封閉模式失敗，記錄
原因，並保留當前執行的配置，以便您修正來源
結構，而非靜默地回退到扁平化重新載入。

## 配置 RPC (程式化更新)

<Note>控制平面寫入 RPC (`config.apply`、`config.patch`、`update.run`) 對每個 `deviceId+clientIp` 限制為 **60 秒內 3 次請求**。當受限時，RPC 會傳回帶有 `retryAfterMs` 的 `UNAVAILABLE`。</Note>

安全/預設流程：

- `config.schema.lookup`：使用淺層架構節點、符合的提示元資料以及直接子項摘要來檢查一個路徑範圍的設定子樹
- `config.get`：取得目前的快照 + 雜湊
- `config.patch`：建議的部分更新路徑
- `config.apply`：僅限完整設定替換
- `update.run`：明確的自我更新 + 重新啟動

當您不是替換整個設定時，建議先使用 `config.schema.lookup`
然後使用 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply (完整替換)">
    驗證 + 寫入完整設定並在一個步驟中重新啟動 Gateway。

    <Warning>
    `config.apply` 會替換 **整個設定**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 進行單一金鑰更新。
    </Warning>

    參數：

    - `raw` (字串) — 整個設定的 JSON5 載荷
    - `baseHash` (選用) — 來自 `config.get` 的設定雜湊 (當設定存在時為必填)
    - `sessionKey` (選用) — 用於重新啟動後喚醒 ping 的工作階段金鑰
    - `note` (選用) — 重新啟動哨兵的備註
    - `restartDelayMs` (選用) — 重新啟動前的延遲 (預設為 2000)

    當一個重新啟動請求已經在待處理/進行中時，重新啟動請求會被合併，並且在重新啟動週期之間會有 30 秒的冷卻時間。

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
    將部分更新合併到現有配置中（JSON 合併修補語義）：

    - 物件遞迴合併
    - `null` 刪除一個鍵
    - 陣列替換

    參數：

    - `raw` (string) — 僅包含要更改的鍵的 JSON5
    - `baseHash` (required) — 來自 `config.get` 的配置雜湊
    - `sessionKey`, `note`, `restartDelayMs` — 與 `config.apply` 相同

    重啟行為與 `config.apply` 相符：合併待處理的重啟以及重啟週期之間的 30 秒冷卻時間。

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

- 來自當前工作目錄的 `.env` (如果存在)
- `~/.openclaw/.env` (全域後備)

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
  如果啟用此功能且未設置預期的鍵，OpenClaw 將運行您的登入 shell 並僅導入缺失的鍵：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效環境變數：`OPENCLAW_LOAD_SHELL_ENV=1`

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
- 缺失/空的變數在加載時會拋出錯誤
- 使用 `$${VAR}` 進行轉義以獲取字面輸出
- 適用於 `$include` 檔案內部
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

SecretRef 詳細資訊（包括適用於 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

關於完整的優先順序和來源，請參閱 [Environment](/zh-Hant/help/environment)。

## 完整參考

有關完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_
