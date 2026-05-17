---
summary: "安裝、配置和管理 OpenClaw 外掛程式"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "外掛程式"
sidebarTitle: "安裝與配置"
---

插件透過新功能擴展 OpenClaw：通道、模型提供者、agent 鞍具、工具、技能、語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網路擷取、網路搜尋等等。某些插件是 **核心**（隨 OpenClaw 一起發布），其他的則是 **外部**。大多數外部插件是透過 [ClawHub](/zh-Hant/clawhub) 發布和發現的。在該遷移完成之前，Npm 仍然支援直接安裝以及暫時的一組 OpenClaw 擁有的插件套件。

## 快速開始

有關複製貼上安裝、列出、解除安裝、更新和發布範例，請參閱[管理插件](/zh-Hant/plugins/manage-plugins)。

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

插件相依性安裝僅在明確的安裝/更新或 doctor 修復流程期間發生。Gateway 啟動、組態重新載入和執行時期檢查不會執行套件管理員或修復相依性樹。本機插件必須已經安裝其相依性，而 npm、git 和 ClawHub 插件則安裝在 OpenClaw 的受管理插件根目錄下。npm 相依性可能在 OpenClaw 的受管理 npm 根目錄中被提升；install/update 會在信任和解除安裝透過 npm 移除 npm 管理的套件之前掃描該受管理的根目錄。外部插件和自訂載入路徑仍必須透過 `openclaw plugins install` 安裝。使用 `openclaw plugins list --json` 查看每個可見插件的靜態 `dependencyStatus`，而不需匯入執行時期程式碼或修復相依性。請參閱[插件相依性解析](/zh-Hant/plugins/dependency-resolution)以了解安裝時期的生命週期。

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

兩者都會顯示在 `openclaw plugins list` 下。有關套件組合的詳細資訊，請參閱[插件套件組合](/zh-Hant/plugins/bundles)。

如果您正在編寫原生插件，請從[建置插件](/zh-Hant/plugins/building-plugins)和[Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)開始。

## 套件進入點

原生外掛 npm 套件必須在 `package.json` 中宣告 `openclaw.extensions`。
每個條目必須保持在套件目錄內，並解析為可讀取的執行時期檔案，或解析為 TypeScript 原始碼檔案，並帶有推斷的建置 JavaScript 同等檔案，例如 `src/index.ts` 到 `dist/index.js`。
打包安裝必須包含該 JavaScript 執行時期輸出。TypeScript 原始碼後備機制僅適用於原始碼簽出和本機開發路徑，不適用於安裝到 OpenClaw 受管理外掛根目錄的 npm 套件。

放入全域擴充功能根目錄的未追蹤目錄會被視為本機原始碼籤出（checkouts），並且可能直接載入 TypeScript 項目。仍由安裝記錄命名的目錄，包括 `installPath` 或 `sourcePath`，會保持受管理狀態，並保留編譯輸出的要求，即使全域掃描看到了它們。如果您有意將受管理的安裝轉換為未追蹤的本機籤出，請先使用解除安裝或 doctor 清理移除過時的安裝記錄。

如果受管理套件警告顯示它「需要 TypeScript 項目的編譯時期輸出...」，這表示該套件發佈時缺少 OpenClaw 在執行時期所需的 JavaScript 檔案。這是一個外掛程式封裝問題，而不是本機設定問題。請在發布者重新發佈編譯後的 JavaScript 後，更新或重新安裝該外掛程式，或者在修正的套件可用之前停用或解除安裝該外掛程式。

當已發佈的執行時期檔案不在與來源項目相同的路徑時，請使用 `openclaw.runtimeExtensions`。當存在時，`runtimeExtensions` 必須包含每個 `extensions` 項目確切的一個項目。清單不符會導致安裝和外掛程式探索失敗，而不是無聲地回退到來源路徑。如果您也發佈 `openclaw.setupEntry`，請使用 `openclaw.runtimeSetupEntry` 作為其建置的 JavaScript 對應檔案；當宣告時，該檔案是必須的。

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## 官方外掛程式

### 遷移期間 OpenClaw 擁有的 npm 套件

ClawHub 是大多數外掛程式的主要發布途徑。目前的 OpenClaw 發行版本已經內建了許多官方外掛程式，因此在一般設定中不需要單獨安裝 npm。在每個 OpenClaw 擁有的外掛程式遷移到 ClawHub 之前，OpenClaw 仍會在 npm 上發布一些 `@openclaw/*` 外掛程式套件，以供舊版/自訂安裝和直接 npm 工作流程使用。

如果 npm 報告某個 `@openclaw/*` 外掛程式套件已被棄用，則該套件版本來自較舊的外部套件系列。請使用目前 OpenClaw 中內建的外掛程式或本機籤出，直到發佈較新的 npm 套件為止。

| 外掛程式        | 套件                       | 文件                                          |
| --------------- | -------------------------- | --------------------------------------------- |
| Discord         | `@openclaw/discord`        | [Discord](/zh-Hant/channels/discord)               |
| Feishu          | `@openclaw/feishu`         | [Feishu](/zh-Hant/channels/feishu)                 |
| Matrix          | `@openclaw/matrix`         | [Matrix](/zh-Hant/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/zh-Hant/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/zh-Hant/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/zh-Hant/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/zh-Hant/channels/nostr)                   |
| Synology Chat   | `@openclaw/synology-chat`  | [Synology Chat](/zh-Hant/channels/synology-chat)   |
| Tlon            | `@openclaw/tlon`           | [Tlon](/zh-Hant/channels/tlon)                     |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](/zh-Hant/channels/whatsapp)             |
| Zalo            | `@openclaw/zalo`           | [Zalo](/zh-Hant/channels/zalo)                     |
| Zalo Personal   | `@openclaw/zalouser`       | [Zalo Personal](/zh-Hant/plugins/zalouser)         |

### 核心（隨 OpenClaw 附帶）

<AccordionGroup>
  <Accordion title="模型供應商（預設啟用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="記憶體外掛程式">
    - `memory-core` - 內建的記憶體搜尋（透過 `plugins.slots.memory` 預設）
    - `memory-lancedb` - 支援 LanceDB 的長期記憶體，具備自動召回/擷取功能（設定 `plugins.slots.memory = "memory-lancedb"`）

    參閱 [Memory LanceDB](/zh-Hant/plugins/memory-lancedb) 以了解 OpenAI 相容的
    嵌入設定、Ollama 範例、召回限制以及疑難排解。

  </Accordion>

<Accordion title="語音提供者（預設啟用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` - 用於瀏覽器工具的內建瀏覽器外掛程式、`openclaw browser` CLI、`browser.request` 閘道方法、瀏覽器執行時間，以及預設瀏覽器控制服務（預設啟用；在替換前請先停用）
    - `copilot-proxy` - VS Code Copilot Proxy 橋接器（預設停用）

  </Accordion>
</AccordionGroup>

正在尋找第三方外掛程式？請參閱 [ClawHub](/zh-Hant/clawhub)。

## 組態

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
| `enabled`          | 主開關（預設：`true`）                           |
| `allow`            | 外掛程式允許清單（選用）                         |
| `bundledDiscovery` | 內建外掛程式探索模式（預設為 `allowlist`）       |
| `deny`             | 外掛程式封鎖清單（選用；拒絕優先）               |
| `load.paths`       | 額外的外掛程式檔案/目錄                          |
| `slots`            | 專屬插槽選擇器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>`   | 各別外掛程式開關 + 組態                          |

`plugins.allow` 是獨佔的。當它非空時，只有列出的外掛程式可以載入
或公開工具，即使 `tools.allow` 包含 `"*"` 或特定的外掛程式擁有
的工具名稱。如果工具允許清單參考了外掛程式工具，請將擁有的外掛程式 ID
新增到 `plugins.allow` 或移除 `plugins.allow`；`openclaw doctor` 會針對此
情況發出警告。

對於新配置，`plugins.bundledDiscovery` 預設為 `"allowlist"`，因此
嚴格的 `plugins.allow` 清單也會封鎖被省略的捆綁提供者
外掛程式，包括執行時期的網路搜尋提供者探索。Doctor 在遷移期間會
使用 `"compat"` 標記較舊的嚴格允許清單配置，以便升級過程中保持
舊版捆綁提供者行為，直到操作員選擇加入嚴格模式。
空的 `plugins.allow` 仍被視為未設定/開放狀態。

透過 `/plugins enable` 或 `/plugins disable` 進行的配置變更會觸發
程式內的 Gateway 外掛程式重新載入。新的 agent 回合會從
重新整理的外掛程式登錄檔重建其工具清單。變更來源的操作（例如安裝、
更新和解除安裝）仍會重新啟動 Gateway 程序，因為已匯入的
外掛程式模組無法安全地就地置換。

`openclaw plugins list` 是本地外掛程式登錄檔/配置快照。其中
的 `enabled` 外掛程式表示已保存的登錄檔和當前配置允許
該外掛程式參與。這並不能證明已執行的遠端 Gateway
已重新載入或重新啟動至相同的外掛程式程式碼。在具有包裝程序
的 VPS/容器設定上，請將重新啟動或觸發重新載入的寫入傳送至實際的
`openclaw gateway run` 程序，或者當重新載入報告失敗時，對
執行中的 Gateway 使用 `openclaw gateway restart`。

<Accordion title="Plugin states: disabled vs missing vs invalid">
  - **Disabled**: 外掛程式存在，但啟用規則將其關閉。組態設定會被保留。
  - **Missing**: 組態設定參照了一個探索未找到的外掛程式 ID。
  - **Invalid**: 外掛程式存在，但其組態設定不符合宣告的架構。Gateway 啟動時僅會跳過該外掛程式；`openclaw doctor --fix` 可以透過停用它並移除其組態負載來隔離無效的項目。

</Accordion>

## 探索與優先順序

OpenClaw 會依照以下順序掃描外掛程式（以第一個符合者為準）：

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` - 明確的檔案或目錄路徑。指向 OpenClaw 自身打包的捆綁外掛程式目錄的路徑將被忽略；
    執行 `openclaw doctor --fix` 以移除那些過時的別名。
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    隨 OpenClaw 附帶。許多外掛程式預設為啟用（模型供應商、語音功能）。
    其他則需要明確啟用。
  </Step>
</Steps>

套件安裝和 Docker 映像檔通常會從編譯後的 `dist/extensions` 樹狀結構中解析捆綁的外掛程式。如果捆綁的外掛程式來源目錄被 bind-mount（綁定掛載）到對應的打包來源路徑上，例如 `/app/extensions/synology-chat`，OpenClaw 會將該掛載的來源目錄視為捆綁來源覆蓋層，並在打包的 `/app/dist/extensions/synology-chat` 捆綁包之前發現它。這能讓維護者的容器迴圈正常運作，而無需將每個捆綁外掛程式切換回 TypeScript 來源。
設定 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 以強制使用打包的 dist 捆綁包，
即使存在來源覆蓋層掛載也是如此。

### 啟用規則

- `plugins.enabled: false` 會停用所有外掛程式，並跳過外掛程式探索/載入工作
- `plugins.deny` 的優先順序永遠高於允許
- `plugins.entries.\<id\>.enabled: false` 會停用該外掛
- 工作區來源的外掛**預設為停用**（必須明確啟用）
- 捆綁外掛遵循內建的預設啟用集，除非被覆寫
- 專屬插槽可以強制啟用該插槽選定的外掛
- 當配置指定了外掛擁有的介面（例如供應商模型參照、通道配置或工具運行時）時，某些捆綁的選用外掛會自動啟用
- 當 `plugins.enabled: false` 處於啟用狀態時，過時的外掛配置會被保留；如果您希望移除過時的 ID，請在執行 doctor 清理前重新啟用外掛
- OpenAI 系列 Codex 路由保持獨立的外掛邊界：`openai-codex/*` 屬於 OpenAI 外掛，而捆綁的 Codex app-server 外掛則是由正準的 `openai/*` agent 參照、明確的 provider/model `agentRuntime.id: "codex"` 或舊版 `codex/*` 模型參照所選定

## 疑難排解執行時鉤子

如果外掛出現在 `plugins list` 中，但 `register(api)` 副作用或鉤子未在即時聊天流量中運行，請先檢查以下項目：

- 執行 `openclaw gateway status --deep --require-rpc` 並確認作用中的 Gateway URL、設定檔、配置路徑和程序是您正在編輯的項目。
- 在外掛安裝/配置/程式碼變更後，重新啟動即時 Gateway。在包裝容器中，PID 1 可能只是監督程式；請重新啟動或向子程序 `openclaw gateway run` 發送信號。
- 使用 `openclaw plugins inspect <id> --runtime --json` 確認鉤子註冊和診斷資訊。非捆綁的對話鉤子（如 `before_model_resolve`、`before_agent_reply`、`before_agent_run`、`llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 對於模型切換，建議優先使用 `before_model_resolve`。它會在 agent 輪次的模型解析之前執行；而 `llm_output` 僅在模型嘗試產生助手輸出後執行。
- 若要驗證有效的會話模型，請使用 `openclaw sessions` 或 Gateway 會話/狀態介面，並在除錯提供者 payload 時，使用 `--raw-stream --raw-stream-path <path>` 啟動 Gateway。

### 外掛工具設定緩慢

如果在準備工具時 Agent 的回合似乎停頓，請啟用追蹤日誌並檢查外掛工具 factory 時序行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

尋找：

```text
[trace:plugin-tools] factory timings ...
```

摘要會列出總 factory 時間和最慢的外掛工具 factories，包括外掛 ID、宣告的工具名稱、結果形狀以及工具是否為選用。當單一 factory 耗時至少 1 秒，或總外掛工具 factory 準備耗時至少 5 秒時，緩慢的行會被提升為警告。

OpenClaw 會快取成功的外掛工具 factory 結果，以便在相同的有效請求內容下進行重複解析。快取鍵包含有效的執行時期設定、工作區、Agent/會話 ID、沙箱原則、瀏覽器設定、傳送內容、請求者身分和擁有權狀態，因此依賴這些受信任欄位的 factories 會在內容變更時重新執行。

如果某個外掛佔據了大部分時間，請檢查其執行時期註冊：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然後更新、重新安裝或停用該外掛。外掛作者應將昂貴的相依性載入移至工具執行路徑之後，而不是在工具 factory 內執行。

### 重複的通道或工具擁有權

症狀：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

這表示有多個啟用的外掛試圖擁有相同的通道、設定流程或工具名稱。最常見的原因是安裝了一個外部通道外掛，而現在同一個套件外掛現在也提供了相同的通道 ID。

除錯步驟：

- 執行 `openclaw plugins list --enabled --verbose` 以查看每個啟用的外掛
  和來源。
- 對每個可疑的外掛執行 `openclaw plugins inspect <id> --runtime --json` 並
  比較 `channels`、`channelConfigs`、`tools` 和診斷資訊。
- 在安裝或移除外掛套件後執行 `openclaw plugins registry --refresh`，以便持久化的元資料反映目前的安裝狀態。
- 在安裝、註冊表或設定變更後重新啟動 Gateway。

修復選項：

- 如果某個外掛程式刻意取代另一個擁有相同通道 ID 的外掛程式，則首選的外掛程式應使用 `channelConfigs.<channel-id>.preferOver` 來宣告優先順序較低的外掛程式 ID。請參閱 [/plugins/manifest#replacing-another-channel-plugin](/zh-Hant/plugins/manifest#replacing-another-channel-plugin)。
- 如果重複是意外發生的，請使用 `plugins.entries.<plugin-id>.enabled: false` 停用其中一方，或是移除過時的外掛程式安裝。
- 如果您明確啟用了這兩個外掛程式，OpenClaw 將會保留該請求並回報衝突。請為該通道選擇一個擁有者，或重新命名外掛程式擁有的工具，讓執行時介面不會模稜兩可。

## 外掛程式插槽（互斥類別）

某些類別是互斥的（一次只能啟用一個）：

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

| 插槽            | 控制對象               | 預設值           |
| --------------- | ---------------------- | ---------------- |
| `memory`        | 作用中的記憶體外掛程式 | `memory-core`    |
| `contextEngine` | 作用中的內容引擎       | `legacy`（內建） |

## CLI 參考資料

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

隨附的外掛程式隨 OpenClaw 一起發行。許多預設為已啟用（例如隨附的模型提供者、隨附的語音提供者，以及隨附的瀏覽器外掛程式）。其他隨附的外掛程式仍需要 `openclaw plugins enable <id>`。

`--force` 會就地覆寫現有的已安裝外掛程式或 Hook 套件。請使用 `openclaw plugins update <id-or-npm-spec>` 來進行受追蹤 npm 外掛程式的例行升級。`--link` 不支援此功能，因為它會重複使用來源路徑，而不是複製到受管理的安裝目標。

當已設定 `plugins.allow` 時，`openclaw plugins install` 會在啟用之前將已安裝的外掛程式 ID 加入該允許清單。如果 `plugins.deny` 中存在相同的外掛程式 ID，安裝作業會移除該過時的拒絕項目，使明確安裝的外掛程式能在重新啟動後立即載入。

OpenClaw 會保留一個持久的本機插件註冊表，作為插件清單、貢獻所有權和啟動規劃的冷讀取模型。安裝、更新、解除安裝、啟用和停用流程會在變更插件狀態後重新整理該註冊表。同一個 `plugins/installs.json` 檔案會將持久的安裝元資料保留在頂層 `installRecords` 中，並將可重建的清單元資料保留在 `plugins` 中。如果註冊表遺失、過期或無效，`openclaw plugins registry --refresh` 會從安裝記錄、設定原則和清單/套件元資料重建其清單視圖，而不會載入插件執行階段模組。

在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 中，插件生命週期修改器會被停用。請改透過安裝的 Nix 來源來管理插件套件選擇和設定；對於 nix-openclaw，請從代理程式優先的[快速入門](https://github.com/openclaw/nix-openclaw#quick-start)開始。`openclaw plugins update <id-or-npm-spec>` 適用於追蹤的安裝。傳遞帶有發行標籤或確切版本的 npm 套件規格，會將套件名稱解析回追蹤的插件記錄，並記錄新規格以供未來更新。傳遞不帶版本的套件名稱，會將確切的釘選安裝移回註冊表的預設發佈行。如果已安裝的 npm 插件已符合解析的版本和記錄的工件識別碼，OpenClaw 會跳過更新，而不會下載、重新安裝或重寫設定。當 `openclaw update` 在 Beta 頻道上執行時，預設行 npm 和 ClawHub 插件記錄會先嘗試 `@beta`，若無插件 Beta 版本則回退至 default/latest。確切版本和明確標籤會保持釘選狀態。

`--pin` 僅適用於 npm。它不支援與 `--marketplace` 搭配使用，因為市集安裝會保存市集來源元資料，而不是 npm 規格。

`--dangerously-force-unsafe-install` 是針對內建危險代碼掃描器誤報的緊急覆寫選項。它允許插件安裝和更新繼續進行，儘管內建 `critical` 發現了問題，但它仍然不會繞過插件 `before_install` 策略阻擋或掃描失敗阻擋。安裝掃描會忽略常見的測試檔案和目錄，例如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻擋打包的測試模擬物件；宣告的插件運行時進入點即使使用這些名稱，仍然會被掃描。

此 CLI 標誌僅適用於插件安裝/更新流程。由 Gateway 支援的技能依賴安裝改用對應的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為獨立的 ClawHub 技能下載/安裝流程。

如果您在 ClawHub 上發布的插件因掃描而被隱藏或阻擋，請開啟 ClawHub 儀表板或執行 `clawhub package rescan <name>` 以要求 ClawHub 重新檢查。`--dangerously-force-unsafe-install` 僅影響您自己機器上的安裝；它不會要求 ClawHub 重新掃描插件，也不會將被阻擋的版本設為公開。

相容的套件參與相同的插件列表/檢查/啟用/停用流程。目前的運行時支援包括套件技能、Claude 指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` 和 Manifest 宣告的 `lspServers` 預設值、Cursor 指令技能，以及相容的 Codex hook 目錄。

`openclaw plugins inspect <id>` 也會回報偵測到的套件功能，以及套件支援插件的支援或不支援的 MCP 和 LSP 伺服器項目。

Marketplace 來源可以是來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名稱、本機 marketplace 根目錄或 `marketplace.json` 路徑、GitHub 簡寫如 `owner/repo`、GitHub 儲存庫 URL 或 git URL。對於遠端 marketplace，插件項目必須保留在複製的 marketplace 儲存庫內，並且僅使用相對路徑來源。

請參閱 [`openclaw plugins` CLI 參考資料](/zh-Hant/cli/plugins) 以了解完整詳情。

## 外掛程式 API 概覽

原生外掛程式會匯出一個公開 `register(api)` 的進入點物件。較舊的外掛程式可能仍會使用 `activate(api)` 作為傳統別名，但新的外掛程式應使用 `register`。

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

OpenClaw 會載入該進入點物件，並在外掛程式啟動期間呼叫 `register(api)`。載入器仍會針對較舊的外掛程式回退到 `activate(api)`，但套件化的外掛程式和新的外部外掛程式應將 `register` 視為公開合約。

`api.registrationMode` 告訴外掛程式為何載入其進入點：

| 模式            | 含義                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `full`          | 執行時期啟動。註冊工具、鉤子、服務、指令、路由和其他即時副作用。                                 |
| `discovery`     | 唯讀功能探索。註冊提供者和中繼資料；受信任的外掛程式進入點程式碼可能會載入，但會跳過即時副作用。 |
| `setup-only`    | 透過輕量級設定進入點載入頻道設定中繼資料。                                                       |
| `setup-runtime` | 也需要執行時期進入點的頻道設定載入。                                                             |
| `cli-metadata`  | 僅收集 CLI 指令中繼資料。                                                                        |

會開啟 sockets、資料庫、背景工作者或長存用戶端的外掛程式進入點，應使用 `api.registrationMode === "full"` 來防護這些副作用。探索載入與啟動載入是分別快取的，不會取代執行中的 Gateway 註冊表。探索是非啟動的，而非無匯入的：OpenClaw 可能會評估受信任的外掛程式進入點或頻道外掛程式模組來建置快照。請保持模組頂層輕量且無副作用，並將網路用戶端、子處理程序、監聽器、憑證讀取和服務啟動移至完整執行時期路徑之後。

常見註冊方法：

| 方法                                    | 註冊內容              |
| --------------------------------------- | --------------------- |
| `registerProvider`                      | 模型提供者 (LLM)      |
| `registerChannel`                       | 聊天頻道              |
| `registerTool`                          | 代理程式工具          |
| `registerHook` / `on(...)`              | 生命週期鉤子          |
| `registerSpeechProvider`                | 文字轉語音 / STT      |
| `registerRealtimeTranscriptionProvider` | 串流 STT              |
| `registerRealtimeVoiceProvider`         | 雙向即時語音          |
| `registerMediaUnderstandingProvider`    | 圖片/音訊分析         |
| `registerImageGenerationProvider`       | 圖片生成              |
| `registerMusicGenerationProvider`       | 音樂生成              |
| `registerVideoGenerationProvider`       | 影片生成              |
| `registerWebFetchProvider`              | Web 擷取 / 爬取提供者 |
| `registerWebSearchProvider`             | 網路搜尋              |
| `registerHttpRoute`                     | HTTP 端點             |
| `registerCommand` / `registerCli`       | CLI 指令              |
| `registerContextEngine`                 | 語境引擎              |
| `registerService`                       | 背景服務              |

類型化生命週期掛鉤的掛鉤守衛行為：

- `before_tool_call`：`{ block: true }` 為終止；較低優先級的處理程序會被跳過。
- `before_tool_call`：`{ block: false }` 為無操作，且不會清除先前的阻擋。
- `before_install`：`{ block: true }` 為終止；較低優先級的處理程序會被跳過。
- `before_install`：`{ block: false }` 為無操作，且不會清除先前的阻擋。
- `message_sending`：`{ cancel: true }` 為終止；較低優先級的處理程序會被跳過。
- `message_sending`：`{ cancel: false }` 為無操作，且不會清除先前的取消。

原生 Codex app-server 會將橋接的 Codex 原生工具事件回傳至此掛鉤介面。外掛程式可以透過 `before_tool_call` 阻擋原生 Codex 工具，透過 `after_tool_call` 觀察結果，並參與 Codex `PermissionRequest` 的核准。橋接器尚不會重寫 Codex 原生工具引數。精確的 Codex 執行時期支援邊界定義於 [Codex harness v1 support contract](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

若需完整的類型化掛鉤行為，請參閱 [SDK 概觀](/zh-Hant/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [建置外掛程式](/zh-Hant/plugins/building-plugins) - 建立您自己的外掛程式
- [外掛程式套件](/zh-Hant/plugins/bundles) - Codex/Claude/Cursor 套件相容性
- [Plugin manifest](/zh-Hant/plugins/manifest) - manifest 結構描述
- [Registering tools](/zh-Hant/plugins/building-plugins#registering-agent-tools) - 在外掛程式中新增 agent 工具
- [Plugin internals](/zh-Hant/plugins/architecture) - 功能模型與載入流程
- [ClawHub](/zh-Hant/clawhub) - 第三方外掛程式探索
