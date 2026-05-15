---
summary: "安裝、配置和管理 OpenClaw 外掛程式"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "外掛程式"
sidebarTitle: "安裝與配置"
---

外掛程式透過新功能擴充 OpenClaw：頻道、模型提供者、agent 鞍具、工具、技能、語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網頁擷取、網頁搜尋等等。部分外掛程式屬於 **核心**（隨 OpenClaw 附帶），其他則為 **外部** 外掛。大多數外部外掛是透過 [ClawHub](/zh-Hant/clawhub) 發布並發現。Npm 仍支援直接安裝，並在遷移完成前支援臨時的 OpenClaw 擁有之外掛程式套件。

## 快速開始

關於複製貼上安裝、列出、解除安裝、更新和發佈範例，請參閱
[管理外掛程式](/zh-Hant/plugins/manage-plugins)。

<Steps>
  <Step title="查看載入內容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安裝外掛程式">
    ```bash
    # Search ClawHub plugins
    openclaw plugins search "calendar"

    # From ClawHub
    openclaw plugins install clawhub:openclaw-codex-app-server

    # From npm
    openclaw plugins install npm:@acme/openclaw-plugin
    openclaw plugins install npm-pack:./openclaw-plugin-1.2.3.tgz

    # From git
    openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重新啟動閘道">
    ```bash
    openclaw gateway restart
    ```

    然後在您的設定檔中的 `plugins.entries.\<id\>.config` 下進行配置。

  </Step>

  <Step title="原生聊天管理">
    在執行中的閘道中，僅限擁有者使用的 `/plugins enable` 和 `/plugins disable`
    會觸發閘道設定重新載入器。閘道會在程序中重新載入外掛程式執行時介面，而新的 agent 輪次會從重新整理的註冊表重建其工具清單。`/plugins install` 會變更外掛程式原始碼，因此
    閘道會要求重新啟動，而不是假設當前程序可以
    安全地重新載入已匯入的模組。

  </Step>

  <Step title="驗證外掛程式">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json

    # If the plugin registered a CLI root, run one command from that root.
    openclaw <plugin-command> --help
    ```

    當您需要驗證已註冊的工具、服務、閘道方法、掛鉤或外掛程式擁有的 CLI 指令時，請使用 `--runtime`。純 `inspect` 是一個冷清單/登錄檔檢查，故意避免匯入外掛程式執行時期。

  </Step>
</Steps>

如果您偏好聊天原生控制，請啟用 `commands.plugins: true` 並使用：

```text
/plugin install clawhub:<package>
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

安裝路徑使用與 CLI 相同的解析程式：本機路徑/封存、明確的 `clawhub:<pkg>`、明確的 `npm:<pkg>`、明確的 `npm-pack:<path.tgz>`、明確的 `git:<repo>`，或透過 npm 的裸套件規格。

如果設定無效，安裝通常會以封閉式失敗並指向 `openclaw doctor --fix`。唯一的恢復例外是針對選擇加入 `openclaw.install.allowInvalidConfigRecovery` 的外掛程式，有一個狹隘的捆綁外掛程式重新安裝路徑。
在 Gateway 啟動期間，無效的外掛程式設定會像其他無效設定一樣以封閉式失敗。執行 `openclaw doctor --fix` 以透過停用該外掛程式項目並移除其無效設定負載來隔離錯誤的外掛程式設定；正常的設定備份會保留先前的值。
當通道設定參考到一個不再可被發現的外掛程式，但相同的過時外掛程式 ID 仍保留在外掛程式設定或安裝記錄中時，Gateway 啟動會記錄警告並跳過該通道，而不是阻擋其他所有通道。
執行 `openclaw doctor --fix` 以移除過時的通道/外掛程式項目；沒有過時外掛程式證據的未知通道金鑰仍會驗證失敗，以便拼寫錯誤保持可見。
如果設定了 `plugins.enabled: false`，過時的外掛程式參考會被視為非活動狀態：Gateway 啟動會跳過外掛程式發現/載入工作，且 `openclaw doctor` 會保留已停用的外掛程式設定，而不是自動移除它。如果您希望移除過時的外掛程式 ID，請在執行 doctor 清理之前重新啟用外掛程式。

外掛程式相依性安裝僅在明確的安裝/更新或修復流程中進行。閘道啟動、設定重新載入和執行時期檢查不會執行套件管理員或修復相依性樹。本機外掛程式必須已安裝其相依性，而 npm、git 和 ClawHub 外掛程式則安裝在 OpenClaw 的受管理外掛程式根目錄下。npm 相依性可能會在 OpenClaw 的受管理 npm 根目錄中提升；安裝/更新會掃描該受管理的根目錄，然後信任和解除安裝會透過 npm 移除 npm 管理的套件。外部外掛程式和自訂載入路徑仍必須透過 `openclaw plugins install` 安裝。使用 `openclaw plugins list --json` 查看每個可見外掛程式的靜態 `dependencyStatus`，而無需匯入執行時期程式碼或修復相依性。請參閱 [Plugin dependency resolution](/zh-Hant/plugins/dependency-resolution) 以了解安裝時期的生命週期。

### 外掛程式路徑擁有權被封鎖

如果外掛程式診斷顯示
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
且組態驗證隨後顯示 `plugin present but blocked`，表示 OpenClaw 發現外掛程式檔案是由不同於載入它們的程序之 Unix 使用者所擁有。請保留外掛程式組態不變；請修復檔案系統擁有權，或以擁有狀態目錄的相同使用者身分執行 OpenClaw。

對於 Docker 安裝，官方映像檔以 `node` (uid `1000`) 身分執行，因此主機上 bind-mounted 的 OpenClaw 組態和工作區目錄通常應由 uid `1000` 擁有：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您故意以 root 身分執行 OpenClaw，請將受管理的外掛程式根目錄修復為 root 擁有權：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修復擁有權後，請重新執行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持續化的外掛程式註冊表與修復後的檔案相符。

對於 npm 安裝，諸如 `latest` 或 dist-tag 等可變選擇器會在安裝前解析，然後鎖定為 OpenClaw 受管 npm 根目錄中的確切已驗證版本。npm 完成後，OpenClaw 會驗證已安裝的 `package-lock.json` 條目是否仍符合解析後的版本與完整性。如果 npm 寫入了不同的套件元數據，安裝將會失敗，並會回滾受管套件，而不是接受不同的插件構件。受管 npm 根目錄也會繼承 OpenClaw 的套件級別 npm `overrides`，因此保護打包主機的安全鎖定也同樣適用於被提升的外部插件相依套件。

原始碼結帳是 pnpm 工作區。如果您複製 OpenClaw 以修改捆綁插件，請執行 `pnpm install`；OpenClaw 接著會從 `extensions/<id>` 載入捆綁插件，以便直接使用編輯內容與套件本地相依套件。純 npm 根目錄安裝適用於打包好的 OpenClaw，而非原始碼結帳開發。

## 插件類型

OpenClaw 辨識兩種插件格式：

| 格式     | 運作方式                                            | 範例                                                   |
| -------- | --------------------------------------------------- | ------------------------------------------------------ |
| **原生** | `openclaw.plugin.json` + 執行時期模組；在行程內執行 | 官方插件、社群 npm 套件                                |
| **套件** | Codex/Claude/Cursor 相容佈局；對應至 OpenClaw 功能  | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

兩者都會顯示在 `openclaw plugins list` 下。請參閱 [插件套件](/zh-Hant/plugins/bundles) 以了解套件詳情。

如果您正在撰寫原生插件，請從 [建構插件](/zh-Hant/plugins/building-plugins) 和 [插件 SDK 概觀](/zh-Hant/plugins/sdk-overview) 開始。

## 套件進入點

原生外掛 npm 套件必須在 `package.json` 中宣告 `openclaw.extensions`。
每個條目必須保持在套件目錄內，並解析為可讀取的執行時期檔案，或解析為 TypeScript 原始碼檔案，並帶有推斷的建置 JavaScript 同等檔案，例如 `src/index.ts` 到 `dist/index.js`。
打包安裝必須包含該 JavaScript 執行時期輸出。TypeScript 原始碼後備機制僅適用於原始碼簽出和本機開發路徑，不適用於安裝到 OpenClaw 受管理外掛根目錄的 npm 套件。

如果受管理套件警告顯示它 `requires compiled runtime output for
TypeScript entry ...`，表示該套件發佈時未包含 OpenClaw 在執行時期所需的 JavaScript 檔案。這是外掛打包問題，而非本機設定問題。請在發佈者重新發佈已編譯的 JavaScript 後更新或重新安裝外掛，或者停用/解除安裝該外掛，直到有修正後的套件可用。

當已發佈的執行時期檔案與來源條目的路徑不同時，請使用 `openclaw.runtimeExtensions`。當存在時，`runtimeExtensions` 必須針對每個 `extensions` 條目包含確切的一個條目。清單不符將導致安裝和外掛探索失敗，而不是無聲地回退到來源路徑。如果您也發佈 `openclaw.setupEntry`，請針對其建置的 JavaScript 同等檔案使用 `openclaw.runtimeSetupEntry`；當宣告時，該檔案是必需的。

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## 官方外掛

### 遷移期間由 OpenClaw 擁有的 npm 套件

ClawHub 是大多數外掛的主要發布途徑。目前的 OpenClaw 打包版本已經捆綁了許多官方外掛，因此在一般設定中不需要單獨安裝 npm。在所有 OpenClaw 擁有的外掛遷移到 ClawHub 之前，OpenClaw 仍會在 npm 上發布一些 `@openclaw/*` 外掛套件，以供較舊或自訂的安裝以及直接的 npm 工作流程使用。

如果 npm 將 `@openclaw/*` 外掛套件回報為已棄用，則該套件版本來自較舊的外部套件系列。在發布較新的 npm 套件之前，請使用目前 OpenClaw 中的捆綁外掛或本機簽出。

| 外掛            | 套件                       | 文件                                          |
| --------------- | -------------------------- | --------------------------------------------- |
| Discord         | `@openclaw/discord`        | [Discord](/zh-Hant/channels/discord)               |
| 飛書            | `@openclaw/feishu`         | [飛書](/zh-Hant/channels/feishu)                   |
| Matrix          | `@openclaw/matrix`         | [Matrix](/zh-Hant/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/zh-Hant/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/zh-Hant/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/zh-Hant/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/zh-Hant/channels/nostr)                   |
| Synology Chat   | `@openclaw/synology-chat`  | [Synology Chat](/zh-Hant/channels/synology-chat)   |
| Tlon            | `@openclaw/tlon`           | [Tlon](/zh-Hant/channels/tlon)                     |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](/zh-Hant/channels/whatsapp)             |
| Zalo            | `@openclaw/zalo`           | [Zalo](/zh-Hant/channels/zalo)                     |
| Zalo 個人版     | `@openclaw/zalouser`       | [Zalo 個人版](/zh-Hant/plugins/zalouser)           |

### 核心（隨 OpenClaw 附帶）

<AccordionGroup>
  <Accordion title="模型提供者（預設啟用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="記憶外掛程式">
    - `memory-core` - 捆綁的記憶搜尋（透過 `plugins.slots.memory` 預設）
    - `memory-lancedb` - 支援 LanceDB 的長期記憶，具備自動召回/擷取功能（設定 `plugins.slots.memory = "memory-lancedb"`）

    參閱 [Memory LanceDB](/zh-Hant/plugins/memory-lancedb) 以了解 OpenAI 相容的
    嵌入設定、Ollama 範例、召回限制與疑難排解。

  </Accordion>

<Accordion title="語音供應商（預設啟用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` - 瀏覽器工具的捆綁瀏覽器外掛程式、`openclaw browser` CLI、`browser.request` 閘道方法、瀏覽器執行時間，以及預設的瀏覽器控制服務（預設啟用；替換前請先停用）
    - `copilot-proxy` - VS Code Copilot Proxy 橋接器（預設停用）

  </Accordion>
</AccordionGroup>

正在尋找協力廠商外掛程式？請參閱 [ClawHub](/zh-Hant/clawhub)。

## 設定

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 欄位               | 說明                                             |
| ------------------ | ------------------------------------------------ |
| `enabled`          | 主開關（預設值：`true`）                         |
| `allow`            | 外掛程式允許清單（選用）                         |
| `bundledDiscovery` | 捆綁外掛程式探索模式（預設為 `allowlist`）       |
| `deny`             | 外掛程式封鎖清單（選用；封鎖優先）               |
| `load.paths`       | 額外的外掛程式檔案/目錄                          |
| `slots`            | 專屬插槽選擇器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>`   | 各外掛程式開關 + 設定                            |

`plugins.allow` 是獨佔的。當它非空時，只有列出的插件可以加載
或公開工具，即使 `tools.allow` 包含 `"*"` 或特定的插件擁有的
工具名稱。如果工具允許清單引用了插件工具，請將擁有者的插件 ID
添加到 `plugins.allow` 或移除 `plugins.allow`；`openclaw doctor` 會關於此
形狀發出警告。

`plugins.bundledDiscovery` 對於新配置預設為 `"allowlist"`，因此
限制性的 `plugins.allow` 清單也會阻擋省略的打包提供者
插件，包括運行時網路搜尋提供者的發現。Doctor 在遷移期間會用 `"compat"` 標記較舊的
限制性允許清單配置，以便升級能保留
舊版的打包提供者行為，直到操作員選擇加入更嚴格的模式。
空的 `plugins.allow` 仍被視為未設定/開放。

透過 `/plugins enable` 或 `/plugins disable` 進行的配置變更會觸發
行程內的 Gateway 插件重新載入。新的代理轉數會從刷新的插件
登錄檔重建其工具清單。諸如安裝、更新和解除安裝等來源變更作業
仍會重新啟動 Gateway 行程，因為已匯入的
插件模組無法就地安全地替換。

`openclaw plugins list` 是本機插件登錄檔/配置快照。那裡的
`enabled` 插件表示持久化的登錄檔和當前配置允許
該插件參與。這並不證明正在運行的遠端 Gateway
已重新載入或重啟至相同的插件程式碼。在具有包裝行程的
VPS/容器設定上，請將重新啟動或觸發重新載入的寫入傳送至實際的
`openclaw gateway run` 行程，或者在重新載入回報失敗時，對
運行中的 Gateway 使用 `openclaw gateway restart`。

<Accordion title="Plugin states: disabled vs missing vs invalid">
  - **已停用**：外掛程式存在，但啟用規則將其關閉。設定會被保留。
  - **遺失**：設定參照了一個探索未找到的外掛程式 ID。
  - **無效**：外掛程式存在，但其設定與宣告的架構不符。閘道啟動時僅會跳過該外掛程式；`openclaw doctor --fix` 可以透過停用並移除其設定負載來隔離無效項目。

</Accordion>

## 探索與優先順序

OpenClaw 會依照以下順序掃描外掛程式（以第一個符合項為準）：

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` - 明確的檔案或目錄路徑。指向 OpenClaw
    自己打包的捆綁外掛程式目錄的路徑會被忽略；
    請執行 `openclaw doctor --fix` 以移除那些過時的別名。
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    隨 OpenClaw 附帶。許多外掛程式預設為啟用（模型提供者、語音）。
    其他則需要明確啟用。
  </Step>
</Steps>

套件安裝和 Docker 映像檔通常會從已編譯的
`dist/extensions` 樹狀結構解析捆綁外掛程式。如果捆綁外掛程式來源目錄
被綁定掛載到對應的打包來源路徑上，例如
`/app/extensions/synology-chat`，OpenClaw 會將該掛載的來源目錄
視為捆綁來源疊加層，並在打包的
`/app/dist/extensions/synology-chat` 捆綁包之前發現它。這讓維護者的容器
迴圈能正常運作，而無需將每個捆綁外掛程式切換回 TypeScript 來源。
設定 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 可強制使用打包的 dist 捆綁包，
即使存在來源疊加層掛載亦然。

### 啟用規則

- `plugins.enabled: false` 會停用所有外掛程式並跳過外掛程式探索/載入工作
- `plugins.deny` 的優先順序永遠高於允許
- `plugins.entries.\<id\>.enabled: false` 會停用該外掛
- 工作區來源的外掛預設為**已停用**（必須明確啟用）
- 打包的外掛遵循內建的預設開啟集合，除非被覆寫
- 專屬插槽可以強制啟用該插槽的所選外掛
- 當設定指定一個外掛擁有的介面時，例如提供者模型參照、通道設定或駕駛程式執行時，某些打包的選用外掛會自動啟用
- 當 `plugins.enabled: false` 處於啟用狀態時，過時的外掛設定會被保留；如果您希望移除過時的 ID，請在執行 doctor 清理前重新啟用外掛
- OpenAI 系列的 Codex 路由保持分離的外掛邊界：`openai-codex/*` 屬於 OpenAI 外掛，而打包的 Codex app-server 外掛則由標準的 `openai/*` 代理程式參照、明確的 provider/model `agentRuntime.id: "codex"` 或舊版的 `codex/*` 模型參照所選取

## 疑難排解執行時攔截器

如果外掛出現在 `plugins list` 中，但 `register(api)` 副作用或攔截器未在即時聊天流量中運作，請先檢查以下事項：

- 執行 `openclaw gateway status --deep --require-rpc` 並確認作用中的 Gateway URL、設定檔、設定路徑和程序是您正在編輯的那些。
- 在外掛安裝/設定/程式碼變更後，重新啟動即時 Gateway。在包裝容器中，PID 1 可能只是一個監督程式；請重新啟動或向子 `openclaw gateway run` 程序發送信號。
- 使用 `openclaw plugins inspect <id> --runtime --json` 來確認攔截器註冊和診斷資訊。非打包的對話攔截器，例如 `before_model_resolve`、`before_agent_reply`、`before_agent_run`、`llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end` 需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 對於模型切換，建議優先使用 `before_model_resolve`。它會在代理程式回合的模型解析之前運作；`llm_output` 僅在模型嘗試產生助理輸出後才會運作。
- 若要驗證有效的 session model，請使用 `openclaw sessions` 或 Gateway session/status 介面，並且在除錯 provider payload 時，使用 `--raw-stream --raw-stream-path <path>` 啟動 Gateway。

### 外掛程式工具設定緩慢

如果 agent 在準備工具時似乎停滯不前，請啟用追蹤記錄並檢查外掛程式工具工廠的時序記錄：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

尋找：

```text
[trace:plugin-tools] factory timings ...
```

摘要會列出總工廠時間以及最慢的外掛程式工具工廠，包括外掛程式 ID、宣告的工具名稱、結果形狀，以及該工具是否為選用。當單一工廠耗時至少 1 秒或外掛程式工具工廠總準備時間至少 5 秒時，緩慢的記錄會被提升為警告。

OpenClaw 會快取成功的外掛程式工具工廠結果，以便在相同的有效請求內容下重複解析。快取鍵包含有效的 runtime 設定、工作區、agent/session ID、沙箱原則、瀏覽器設定、傳遞內容、請求者身分和擁有權狀態，因此依賴這些受信任欄位的工廠會在內容變更時重新執行。

如果某個外掛程式佔據了大部分時間，請檢查其 runtime 註冊：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然後更新、重新安裝或停用該外掛程式。外掛程式作者應將昂貴的相依性載入移至工具執行路徑之後，而不是在工具工廠內執行。

### 重複的通道或工具擁有權

症狀：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

這表示有一個以上的已啟用外掛程式試圖擁有相同的通道、設定流程或工具名稱。最常見的原因是安裝了外部通道外掛程式，而其旁邊的隨附外掛程式現在提供了相同的通道 ID。

除錯步驟：

- 執行 `openclaw plugins list --enabled --verbose` 以查看每個已啟用的外掛程式
  和來源。
- 對每個可疑的外掛程式執行 `openclaw plugins inspect <id> --runtime --json` 並
  比較 `channels`、`channelConfigs`、`tools` 和診斷資訊。
- 在安裝或移除外掛程式套件後執行 `openclaw plugins registry --refresh`，
  使持續性的中繼資料反映目前的安裝狀態。
- 在安裝、註冊或設定變更後重新啟動 Gateway。

修復選項：

- 如果某個外掛程式故意替換同一通道 ID 的另一個外掛程式，則
  偏好的外掛程式應使用較低優先順序的外掛程式 ID 宣告 `channelConfigs.<channel-id>.preferOver`。請參閱 [/plugins/manifest#replacing-another-channel-plugin](/zh-Hant/plugins/manifest#replacing-another-channel-plugin)。
- 如果重複是意外造成的，請使用
  `plugins.entries.<plugin-id>.enabled: false` 停用其中一方，或
  移除過時的外掛程式安裝。
- 如果您明確啟用了這兩個外掛程式，OpenClaw 會保留該請求並
  回報衝突。請為該通道選擇一個所有者，或重新命名外掛程式擁有的
  工具，以便執行時期介面明確無誤。

## 外掛程式插槽 (獨佔類別)

有些類別是獨佔的 (一次只能啟用一個)：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| 插槽            | 控制項目               | 預設值          |
| --------------- | ---------------------- | --------------- |
| `memory`        | 作用中的記憶體外掛程式 | `memory-core`   |
| `contextEngine` | 作用中的語境引擎       | `legacy` (內建) |

## CLI 參考

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins search <query>            # search ClawHub plugin catalog
openclaw plugins inspect <id>              # static detail
openclaw plugins inspect <id> --runtime    # registered hooks/tools/CLI/gateway methods
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install from npm by default
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
openclaw plugins install git:<repo>        # install from git
openclaw plugins install git:<repo>@<ref>  # install from git ref
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config and plugin index records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

# Verify runtime registrations after install.
openclaw plugins inspect <id> --runtime --json

# Run plugin-owned CLI commands directly from the OpenClaw root CLI.
openclaw <plugin-command> --help

openclaw plugins enable <id>
openclaw plugins disable <id>
```

隨附的外掛程式隨 OpenClaw 一起發行。許多外掛程式預設為啟用 (例如
隨附的模型提供者、隨附的語音提供者，以及隨附的瀏覽器
外掛程式)。其他隨附的外掛程式仍需 `openclaw plugins enable <id>`。

`--force` 會就地覆寫現有已安裝的外掛程式或 Hook 套件。請使用
`openclaw plugins update <id-or-npm-spec>` 進行已追蹤 npm
外掛程式的例行升級。不支援與 `--link` 搭配使用，因為它會重複使用來源路徑，而不是
複製到受管理的安裝目標。

當已設定 `plugins.allow` 時，`openclaw plugins install` 會在啟用之前將
已安裝的外掛程式 ID 新增至該允許清單。如果 `plugins.deny` 中存在相同的外掛程式
ID，安裝會移除該過時的拒絕項目，以便在重新啟動後立即載入明確安裝的外掛程式。

OpenClaw 會維護一個持續化的本地插件註冊表，作為插件清單、貢獻所有權和啟動規劃的冷讀取模型。安裝、更新、解除安裝、啟用和停用流程會在更改插件狀態後重新整理該註冊表。同一個 `plugins/installs.json` 檔案會在頂層 `installRecords` 中保存持久的安裝元數據，並在 `plugins` 中保存可重建的清單元數據。如果註冊表缺失、過時或無效，`openclaw plugins registry --refresh` 會根據安裝記錄、配置策略和清單/套件元數據重建其清單視圖，而不載入插件執行時期模組。

在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，插件生命週期修改器會被停用。請改透過安裝的 Nix 來源來管理插件套件選擇和配置；對於 nix-openclaw，請從代理程式優先的[快速入門](https://github.com/openclaw/nix-openclaw#quick-start)開始。`openclaw plugins update <id-or-npm-spec>` 適用於已追蹤的安裝。傳遞帶有發行標籤 (dist-tag) 或確切版本的 npm 套件規格，會將套件名稱解析回已追蹤的插件記錄，並記錄新規格以供未來更新使用。傳遞不帶版本的套件名稱，會將確切固定的安裝移回註冊表的預設發布線。如果已安裝的 npm 插件已符合解析的版本和記錄的構件身分，OpenClaw 會跳過更新，而不下載、重新安裝或重寫配置。當 `openclaw update` 在 beta 頻道上執行時，預設線的 npm 和 ClawHub 插件記錄會先嘗試 `@beta`，當不存在插件 beta 版本時則回退至 default/latest。確切版本和明確標籤會保持固定。

`--pin` 僅適用於 npm。它不支援 `--marketplace`，因為市集安裝會保存市集來源元數據，而不是 npm 規格。

`--dangerously-force-unsafe-install` 是一個應對內建危險代碼掃描器誤報的緊急覆蓋開關。它允許插件安裝和更新繼續進行，忽略內建 `critical` 的發現，但它仍然不會繞過插件 `before_install` 策略封鎖或掃描失敗封鎖。安裝掃描會忽略常見的測試檔案和目錄，例如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免封鎖打包的測試模擬物件；已宣告的插件運行時入口點即使使用這些名稱，仍會被掃描。

此 CLI 標誌僅適用於插件安裝/更新流程。由 Gateway 支援的技能依賴安裝則改用匹配的 `dangerouslyForceUnsafeInstall` 請求覆蓋，而 `openclaw skills install` 則保持為單獨的 ClawHub 技能下載/安裝流程。

如果您在 ClawHub 上發布的插件因掃描而被隱藏或封鎖，請開啟 ClawHub 儀表板或執行 `clawhub package rescan <name>` 要求 ClawHub 重新檢查。`--dangerously-force-unsafe-install` 僅影響您自己機器上的安裝；它不會要求 ClawHub 重新掃描插件或使被封鎖的版本公開。

相容的套件參與相同的插件列表/檢查/啟用/停用流程。目前的運行時支援包括套件技能、Claude 指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` 和清單宣告的 `lspServers` 預設值、Cursor 指令技能，以及相容的 Codex 掛鉤目錄。

`openclaw plugins inspect <id>` 也會回報偵測到的套件功能，以及由套件支援之插件支援或不支援的 MCP 和 LSP 伺服器條目。

Marketplace 來源可以是來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名稱、本機 marketplace 根目錄或 `marketplace.json` 路徑、GitHub 簡寫（如 `owner/repo`）、GitHub 儲存庫 URL 或 git URL。對於遠端 marketplace，插件條目必須保留在複製的 marketplace 儲存庫內，並且僅使用相對路徑來源。

請參閱 [`openclaw plugins` CLI 參考資料](/zh-Hant/cli/plugins) 以了解完整細節。

## 外掛程式 API 概觀

原生外掛程式會匯出一個公開 `register(api)` 的進入點物件。較舊的
外掛程式可能仍會使用 `activate(api)` 作為舊版別名，但新外掛程式應
使用 `register`。

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw 會載入進入點物件，並在外掛程式
啟用期間呼叫 `register(api)`。載入器仍會回退到 `activate(api)` 以支援較舊的外掛程式，
但套件組合外掛程式和新的外部外掛程式應將 `register` 視為
公用合約。

`api.registrationMode` 會告知外掛程式為何要載入其進入點：

| 模式            | 含義                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `full`          | 執行時啟用。註冊工具、掛鉤、服務、指令、路由和其他即時副作用。                                   |
| `discovery`     | 唯讀功能探索。註冊提供者和中繼資料；受信任的外掛程式進入點程式碼可能會載入，但會跳過即時副作用。 |
| `setup-only`    | 透過輕量級設定進入點載入頻道設定中繼資料。                                                       |
| `setup-runtime` | 也需要執行時進入點的頻道設定載入。                                                               |
| `cli-metadata`  | 僅限 CLI 指令中繼資料收集。                                                                      |

開啟 sockets、資料庫、背景工作程序或長期
用戶端的外掛程式進入點，應使用 `api.registrationMode === "full"` 來保護這些副作用。
探索載入會與啟用載入分開快取，且不會取代
執行中的 Gateway 登錄。探索是非啟用的，而非無匯入的：
OpenClaw 可能會評估受信任的外掛程式進入點或頻道外掛程式模組以建置
快照。請保持模組頂層輕量且無副作用，並將
網路用戶端、子程序、監聽器、憑證讀取和服務啟動
移至完整執行時路徑之後。

常見註冊方法：

| 方法                                    | 註冊內容              |
| --------------------------------------- | --------------------- |
| `registerProvider`                      | 模型提供者 (LLM)      |
| `registerChannel`                       | 聊天頻道              |
| `registerTool`                          | 代理程式工具          |
| `registerHook` / `on(...)`              | 生命週期掛鉤          |
| `registerSpeechProvider`                | 文字轉語音 / STT      |
| `registerRealtimeTranscriptionProvider` | 串流 STT              |
| `registerRealtimeVoiceProvider`         | 雙向即時語音          |
| `registerMediaUnderstandingProvider`    | 圖片/音訊分析         |
| `registerImageGenerationProvider`       | 圖片生成              |
| `registerMusicGenerationProvider`       | 音樂生成              |
| `registerVideoGenerationProvider`       | 影片生成              |
| `registerWebFetchProvider`              | Web 擷取 / 爬取提供者 |
| `registerWebSearchProvider`             | Web 搜尋              |
| `registerHttpRoute`                     | HTTP 端點             |
| `registerCommand` / `registerCli`       | CLI 指令              |
| `registerContextEngine`                 | 內容引擎              |
| `registerService`                       | 背景服務              |

類型化生命週期掛鉤的掛鉤防護行為：

- `before_tool_call`：`{ block: true }` 是終止的；較低優先級的處理程式會被跳過。
- `before_tool_call`：`{ block: false }` 是無操作，且不會清除先前的阻斷。
- `before_install`：`{ block: true }` 是終止的；較低優先級的處理程式會被跳過。
- `before_install`：`{ block: false }` 是無操作，且不會清除先前的阻斷。
- `message_sending`：`{ cancel: true }` 是終止的；較低優先級的處理程式會被跳過。
- `message_sending`：`{ cancel: false }` 是無操作，且不會清除先前的取消。

原生 Codex 應用程式伺服器會將 Codex 原生工具事件橋接回傳至此掛鉤表面。外掛可以透過 `before_tool_call` 封鎖原生 Codex 工具，透過 `after_tool_call` 觀察結果，並參與 Codex `PermissionRequest` 的核准。橋接器尚不會重寫 Codex 原生工具引數。確切的 Codex 執行時期支援邊界位於 [Codex harness v1 支援合約](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

如需完整的類型化掛鉤行為，請參閱 [SDK 概觀](/zh-Hant/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [建置外掛](/zh-Hant/plugins/building-plugins) - 建立您自己的外掛
- [外掛套件](/zh-Hant/plugins/bundles) - Codex/Claude/Cursor 套件相容性
- [外掛程式清單](/zh-Hant/plugins/manifest) - 清單架構
- [註冊工具](/zh-Hant/plugins/building-plugins#registering-agent-tools) - 在外掛程式中新增代理程式工具
- [外掛程式內部運作](/zh-Hant/plugins/architecture) - 功能模型與載入流程
- [ClawHub](/zh-Hant/clawhub) - 第三方外掛程式探索
