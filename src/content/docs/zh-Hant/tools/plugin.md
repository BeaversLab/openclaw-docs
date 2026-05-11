---
summary: "安裝、設定和管理 OpenClaw 外掛"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "外掛"
sidebarTitle: "安裝與設定"
---

外掛為 OpenClaw 擴展了新功能：通道、模型提供者、
代理框架、工具、技能、語音、即時轉錄、即時
語音、媒體理解、影像生成、視訊生成、網路擷取、網路
搜尋等等。部分外掛是**核心**（隨 OpenClaw 附帶），其他則是
**外部**（由社群發布於 npm）。

## 快速開始

<Steps>
  <Step title="查看已載入的項目">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安裝外掛">
    ```bash
    # From npm
    openclaw plugins install @openclaw/voice-call

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重新啟動 Gateway">
    ```bash
    openclaw gateway restart
    ```

    然後在設定檔中的 `plugins.entries.\<id\>.config` 下進行設定。

  </Step>
</Steps>

如果您偏好聊天原生控制，請啟用 `commands.plugins: true` 並使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安裝路徑使用與 CLI 相同的解析器：本機路徑/封存檔、明確的
`clawhub:<pkg>`、明確的 `npm:<pkg>`，或裸包規格（優先 ClawHub，然後
npm 備援）。

如果設定無效，安裝通常會失敗並關閉，並引導您前往
`openclaw doctor --fix`。唯一的恢復例外是針對選擇加入
`openclaw.install.allowInvalidConfigRecovery`的外掛程式的一個狹隘的打包外掛程式重新安裝路徑。
在 Gateway 啟動期間，一個外掛程式的無效設定會被隔離到該外掛程式：
啟動過程會記錄 `plugins.entries.<id>.config` 問題，在載入期間跳過該外掛程式，
並讓其他外掛程式和通道保持上線。執行 `openclaw doctor --fix`
透過停用該外掛程式條目並移除其無效設定內容來隔離不良的外掛程式設定；
正常的設定備份會保留先前的值。
當通道設定參考了不再可被發現的外掛程式，但相同的過期外掛程式 ID
仍保留在外掛程式設定或安裝記錄中時，Gateway 啟動過程會記錄警告
並跳過該通道，而不是阻擋其他所有通道。執行 `openclaw doctor --fix`
以移除過期的通道/外掛程式條目；沒有過期外掛程式證據的未知通道金鑰
仍然會無法通過驗證，以便拼字錯誤保持可見。

封裝的 OpenClaw 安裝不會急切地安裝每個打包外掛程式的
執行時期相依性樹。當打包的 OpenClaw 擁有的外掛程式從
外掛程式設定、舊版通道設定或預設啟用的資訊清單啟用時，
啟動過程會在匯入它之前僅修復該外掛程式宣告的執行時期相依性。
僅憑持續存在的通道驗證狀態並不會啟用打包通道以進行
Gateway 啟動時期的執行時期相依性修復。
明確停用仍然優先：`plugins.entries.<id>.enabled: false`、
`plugins.deny`、`plugins.enabled: false` 和 `channels.<id>.enabled: false`
會防止該外掛程式/通道的自動打包執行時期相依性修復。
非空的 `plugins.allow` 也會限制預設啟用的打包執行時期相依性
修復；明確的打包通道啟用（`channels.<id>.enabled: true`）仍然
可以修復該通道的外掛程式相依性。
外部外掛程式和自訂載入路徑仍然必須透過
`openclaw plugins install` 安裝。

## 外掛程式類型

OpenClaw 辨識兩種外掛程式格式：

| 格式       | 運作方式                                               | 範例                                                   |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------ |
| **原生**   | `openclaw.plugin.json` + 執行時期模組；在程序內執行    | 官方外掛程式、社群 npm 套件                            |
| **套件包** | Codex/Claude/Cursor 相容的佈局；已對應至 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

兩者都會顯示在 `openclaw plugins list` 下。請參閱 [Plugin Bundles](/zh-Hant/plugins/bundles) 以了解套件詳情。

如果您正在編寫原生插件，請從 [Building Plugins](/zh-Hant/plugins/building-plugins)
以及 [Plugin SDK Overview](/zh-Hant/plugins/sdk-overview) 開始。

## 套件進入點

原生插件 npm 套件必須在 `package.json` 中宣告 `openclaw.extensions`。
每個進入點必須位於套件目錄內，並解析為可讀取的
執行期檔案，或是解析為帶有推斷建置 JavaScript
對應檔案（例如從 `src/index.ts` 到 `dist/index.js`）的 TypeScript 原始檔。

當發佈的執行期檔案路徑與原始進入點不同時，請使用 `openclaw.runtimeExtensions`。當存在時，`runtimeExtensions` 必須為
每個 `extensions` 進入點包含一個項目。列表不匹配將導致安裝和
插件探索失敗，而不是無提示地回退到原始路徑。

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## 官方插件

### 可安裝

| 插件            | 套件                   | 文件                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh-Hant/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh-Hant/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh-Hant/channels/nostr)             |
| Voice Call      | `@openclaw/voice-call` | [Voice Call](/zh-Hant/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh-Hant/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/zh-Hant/plugins/zalouser)   |

### 核心（隨 OpenClaw 附帶）

<AccordionGroup>
  <Accordion title="模型提供者 (預設啟用)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="記憶外掛程式">- `memory-core` — 捆綁的記憶搜尋 (預設透過 `plugins.slots.memory`) - `memory-lancedb` — 隨需安裝的長期記憶，具備自動回憶/擷取功能 (設定 `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="語音提供者 (預設啟用)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` — 瀏覽器工具的捆綁瀏覽器外掛程式、`openclaw browser` CLI、`browser.request` 閘道方法、瀏覽器執行時間，以及預設的瀏覽器控制服務 (預設啟用；更換前請先停用)
    - `copilot-proxy` — VS Code Copilot Proxy 橋接器 (預設停用)
  </Accordion>
</AccordionGroup>

正在尋找第三方外掛程式？請參閱 [社群外掛程式](/zh-Hant/plugins/community)。

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

| 欄位             | 描述                                             |
| ---------------- | ------------------------------------------------ |
| `enabled`        | 主切換 (預設值：`true`)                          |
| `allow`          | 外掛程式允許清單（可選）                         |
| `deny`           | 外掛程式拒絕清單（可選；拒絕優先）               |
| `load.paths`     | 額外的外掛程式檔案/目錄                          |
| `slots`          | 專屬插槽選擇器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>` | 各別外掛程式開關 + 設定                          |

設定變更**需要重新啟動閘道**。如果閘道以設定監看 + 進程內重新啟動（預設 `openclaw gateway` 路徑）運行，則通常會在寫入設定後自動執行重新啟動。對於原生外掛程式執行時代碼或生命週期掛鉤，不支援熱重新載入；在預期更新的 `register(api)` 程式碼、`api.on(...)` 掛鉤、工具、服務或提供者/執行時掛鉤執行之前，請重新啟動服務即時頻道的閘道程序。

`openclaw plugins list` 是本地外掛程式註冊表/設定快照。那裡的 `enabled` 外掛程式表示保存的註冊表和當前設定允許該外掛程式參與。這並不能證明已經運行的遠端閘道子進程已重啟進入相同的外掛程式程式碼。在具有包裝程序 的 VPS/容器設定上，將重啟發送到實際的 `openclaw gateway run` 程序，或對運行中的閘道使用 `openclaw gateway restart`。

<Accordion title="外掛程式狀態：已停用 vs 缺失 vs 無效">- **已停用**：外掛程式存在但啟用規則將其關閉。設定會被保留。 - **缺失**：設定引用了探索未找到的外掛程式 ID。 - **無效**：外掛程式存在但其設定不符合聲明的架構。閘道啟動僅跳過該外掛程式；`openclaw doctor --fix` 可以透過停用它並移除其設定負載來隔離無效的條目。</Accordion>

## 探索與優先順序

OpenClaw 按此順序掃描外掛程式（第一個匹配項優先）：

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` — 明確的檔案或目錄路徑。指向 OpenClaw 自身打包的綑綁外掛目錄的路徑會被忽略；
    請執行 `openclaw doctor --fix` 以移除那些過時的別名。
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    隨 OpenClaw 附帶。許多外掛預設為啟用（模型提供者、語音）。
    其他則需要明確啟用。
  </Step>
</Steps>

打包安裝和 Docker 映像檔通常從編譯後的 `dist/extensions` 樹解析綑綁外掛。如果綑綁外掛的原始碼目錄被
bind-mount 覆蓋在對應的打包來源路徑上，例如 `/app/extensions/synology-chat`，OpenClaw 會將該掛載的來源目錄
視為綑綁來源疊加層，並在打包的 `/app/dist/extensions/synology-chat` 綑綁包之前發現它。這讓維護者的容器
迴圈能正常運作，而無需將每個綑綁外掛切換回 TypeScript 來源。
設定 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 以強制使用打包的 dist 綑綁包，
即使存在來源疊加層掛載。

### 啟用規則

- `plugins.enabled: false` 會停用所有外掛
- `plugins.deny` 永遠優先於 allow
- `plugins.entries.\<id\>.enabled: false` 會停用該外掛
- Workspace 起源的外掛**預設為停用**（必須明確啟用）
- 綑綁外掛遵循內建的預設開啟集合，除非被覆寫
- 獨佔插槽可以強制啟用該插槽的選定外掛
- 當設定指定了外掛擁有的介面（例如提供者模型參照、通道設定或
  套件執行時期）時，某些綑綁的選用外掛會自動啟用
- OpenAI 系列 Codex 路由保持獨立的外掛程式邊界：
  `openai-codex/*` 屬於 OpenAI 外掛程式，而內建的 Codex
  應用程式伺服器外掛程式則由 `agentRuntime.id: "codex"` 或舊版
  `codex/*` 模型參照所選取

## 疑難排解執行時期 Hook

如果外掛程式出現在 `plugins list` 中，但在即時聊天流量中未執行
`register(api)` 副作用或 Hook，請先檢查以下項目：

- 執行 `openclaw gateway status --deep --require-rpc` 並確認作用中的
  Gateway URL、設定檔、設定路徑和程序是您正在編輯的項目。
- 在外掛程式安裝/設定/程式碼變更後，請重新啟動作用中的 Gateway。在容器包裝器中，
  PID 1 可能只是監督程式；請重新啟動或向子程序 `openclaw gateway run` 發送信號。
- 使用 `openclaw plugins inspect <id> --json` 來確認 Hook 註冊和
  診斷資訊。非內建的對話 Hook（例如 `llm_input`、
  `llm_output`、`before_agent_finalize` 和 `agent_end`）需要
  `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 針對模型切換，建議優先使用 `before_model_resolve`。它會在代理程式輪次進行模型解析之前執行；
  `llm_output` 僅在模型嘗試產生助理輸出後才會執行。
- 若要驗證有效的 Session 模型，請使用 `openclaw sessions` 或
  Gateway session/status 介面；當除錯提供者 Payload 時，請使用
  `--raw-stream --raw-stream-path <path>` 啟動 Gateway。

### 重複的頻道或工具擁有權

症狀：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

這表示有一個以上的已啟用外掛程式試圖擁有相同的頻道、
設定流程或工具名稱。最常見的原因是，安裝了一個外部頻道外掛程式，
而它位於現已提供相同頻道 ID 的內建外掛程式旁邊。

除錯步驟：

- 執行 `openclaw plugins list --enabled --verbose` 以檢視每個已啟用外掛程式
  及其來源。
- 針對每個可疑的外掛程式執行 `openclaw plugins inspect <id> --json`，
  並比較 `channels`、`channelConfigs`、`tools` 與診斷資訊。
- 在安裝或移除外掛程式套件後執行 `openclaw plugins registry --refresh`，以便持續性中繼資料反映目前的安裝狀態。
- 在進行安裝、註冊表或設定變更後，請重新啟動 Gateway。

修復選項：

- 如果某個外掛程式有意取代另一個外掛程式的相同頻道 ID，則偏好選用的外掛程式應使用較低優先順序的外掛程式 ID 來宣告 `channelConfigs.<channel-id>.preferOver`。請參閱 [/plugins/manifest#replacing-another-channel-plugin](/zh-Hant/plugins/manifest#replacing-another-channel-plugin)。
- 如果重複是無意的，請使用 `plugins.entries.<plugin-id>.enabled: false` 停用其中一方，或移除過時的外掛程式安裝。
- 如果您明確啟用了這兩個外掛程式，OpenClaw 會保留該請求並回報衝突。請為該頻道選擇一個擁有者，或重新命名外掛程式擁有的工具，以確保執行階段介面明確無誤。

## 外掛程式插槽 (互斥類別)

某些類別是互斥的 (一次只能啟用一個)：

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

| 插槽            | 控制的項目             | 預設值          |
| --------------- | ---------------------- | --------------- |
| `memory`        | 作用中的記憶體外掛程式 | `memory-core`   |
| `contextEngine` | 作用中的內容引擎       | `legacy` (內建) |

## CLI 參考資料

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
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

openclaw plugins enable <id>
openclaw plugins disable <id>
```

隨附的外掛程式隨 OpenClaw 一起發行。許多外掛程式預設為啟用 (例如隨附的模型提供者、隨附的語音提供者，以及隨附的瀏覽器外掛程式)。其他隨附的外掛程式仍需要 `openclaw plugins enable <id>`。

`--force` 會就地覆寫現有已安裝的外掛程式或掛件套件。請使用 `openclaw plugins update <id-or-npm-spec>` 來對已追蹤的 npm 外掛程式進行例行升級。它不支援搭配 `--link` 使用，後者會重複使用來源路徑，而不是複製到受管理的安裝目標。

當 `plugins.allow` 已設定時，`openclaw plugins install` 會在啟用外掛程式之前將已安裝的外掛程式 ID 加入該允許清單。如果相同的外掛程式 ID 存在於 `plugins.deny` 中，安裝會移除該過時的拒絕項目，以便在重新啟動後立即載入明確安裝的外掛程式。

OpenClaw 會維護一個持久化的本機外掛程式登錄檔，作為外掛程式庫、貢獻者和啟動規劃的冷讀取模型。安裝、更新、解除安裝、啟用和停用流程會在變更外掛程式狀態後重新整理該登錄檔。同一個 `plugins/installs.json` 檔案會在頂層 `installRecords` 中保存持久的安裝元資料，並在 `plugins` 中保存可重建的資訊清單元資料。如果登錄檔遺失、過期或無效，`openclaw plugins registry
--refresh` 會根據安裝記錄、設定原則和資訊清單/套件元資料重建其資訊清單視圖，而不載入外掛程式執行時間模組。
`openclaw plugins update <id-or-npm-spec>` 適用於追蹤的安裝項。傳入帶有 dist-tag 或確切版本的 npm 套件規格會將套件名稱解析回追蹤的外掛程式記錄，並記錄新規格以供未來更新。傳入不帶版本的套件名稱會將確切釘選的安裝項移回登錄檔的預設發布行。如果已安裝的 npm 外掛程式已符合解析的版本和記錄的構件身分識別，OpenClaw 將跳過更新，而不下載、重新安裝或重寫設定。

`--pin` 僅限 npm。它不支援 `--marketplace`，因為市集安裝會保存市集來源元資料，而不是 npm 規格。

`--dangerously-force-unsafe-install` 是針對內建危險程式碼掃描器誤報的緊急覆寫。它允許外掛程式安裝和更新繼續進行，忽略內建 `critical` 發現，但它仍然不會繞過外掛程式 `before_install` 原則封鎖或掃描失敗封鎖。
安裝掃描會忽略常見的測試檔案和目錄，例如 `tests/`、
`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免封鎖打包的測試模擬物件；
宣告的外掛程式執行時間進入點即使使用其中一個名稱，仍會受到掃描。

此 CLI 標誌僅適用於外掛程式安裝/更新流程。由 Gateway 支援的技能相依性安裝改用匹配的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為單獨的 ClawHub 技能下載/安裝流程。

相容的套件參與相同的外掛程式列表/檢查/啟用/停用流程。目前的執行階段支援包括套件技能、Claude 指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` 和宣告式 manifest `lspServers` 預設值、Cursor 指令技能，以及相容的 Codex hook 目錄。

`openclaw plugins inspect <id>` 也會回報偵測到的套件功能，以及由套件支援的外掛程式所支援或不支援的 MCP 和 LSP 伺服器項目。

市集來源可以是來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市集名稱、本地市集根目錄或 `marketplace.json` 路徑、像 `owner/repo` 這樣的 GitHub 簡寫、GitHub 儲存庫 URL 或 git URL。對於遠端市集，外掛程式項目必須保持在複製的市集儲存庫內，並且僅使用相對路徑來源。

詳情請參閱 [`openclaw plugins` CLI 參考](/zh-Hant/cli/plugins)。

## 外掛程式 API 概覽

原生外掛程式會匯出一個公開 `register(api)` 的進入點物件。較舊的外掛程式可能仍會將 `activate(api)` 作為舊版別名使用，但新外掛程式應使用 `register`。

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

OpenClaw 會載入進入點物件，並在外掛程式啟動期間呼叫 `register(api)`。載入器對於較舊的外掛程式仍然會回退使用 `activate(api)`，但套件外掛程式和新的外部外掛程式應將 `register` 視為公開合約。

`api.registrationMode` 會告訴外掛程式為什麼其進入點正在被載入：

| 模式            | 含義                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `full`          | 執行階段啟動。註冊工具、hooks、服務、指令、路由和其他即時副作用。                              |
| `discovery`     | 唯讀功能探索。註冊提供者和中繼資料；可信任的外掛程式進入點程式碼可能會載入，但跳過即時副作用。 |
| `setup-only`    | 透過輕量級設定項目載入通道設定元數據。                                                         |
| `setup-runtime` | 同時需要執行時期項目的通道設定載入。                                                           |
| `cli-metadata`  | 僅收集 CLI 指令元數據。                                                                        |

開啟 sockets、資料庫、背景工作執行緒或長期執行用戶端的插件項目，應使用 `api.registrationMode === "full"` 來防護這些副作用。探索載入與啟動載入分開快取，且不會取代執行中的 Gateway 註冊表。探索是非啟動的，但並非無匯入：OpenClaw 可能會評估受信任的插件項目或通道插件模組以建構快照。請保持模組頂層輕量化且無副作用，並將網路用戶端、子行程、監聽器、憑證讀取和服務啟動移至完整執行時期路徑之後。

常見註冊方法：

| 方法                                    | 註冊內容              |
| --------------------------------------- | --------------------- |
| `registerProvider`                      | 模型提供者 (LLM)      |
| `registerChannel`                       | 聊天通道              |
| `registerTool`                          | 代理工具              |
| `registerHook` / `on(...)`              | 生命週期鉤子          |
| `registerSpeechProvider`                | 文字轉語音 / STT      |
| `registerRealtimeTranscriptionProvider` | 串流 STT              |
| `registerRealtimeVoiceProvider`         | 雙向即時語音          |
| `registerMediaUnderstandingProvider`    | 圖片/音訊分析         |
| `registerImageGenerationProvider`       | 圖片生成              |
| `registerMusicGenerationProvider`       | 音樂生成              |
| `registerVideoGenerationProvider`       | 影片生成              |
| `registerWebFetchProvider`              | 網頁擷取 / 爬取提供者 |
| `registerWebSearchProvider`             | 網頁搜尋              |
| `registerHttpRoute`                     | HTTP 端點             |
| `registerCommand` / `registerCli`       | CLI 指令              |
| `registerContextEngine`                 | 情境引擎              |
| `registerService`                       | 背景服務              |

型別化生命週期鉤子的防護行為：

- `before_tool_call`： `{ block: true }` 是終結的；較低優先順序的處理器會被跳過。
- `before_tool_call`： `{ block: false }` 是無操作指令，且不會清除先前的阻擋。
- `before_install`：`{ block: true }` 是終止的；較低優先級的處理程序將被跳過。
- `before_install`：`{ block: false }` 是空操作（no-op），不會清除先前的區塊。
- `message_sending`：`{ cancel: true }` 是終止的；較低優先級的處理程序將被跳過。
- `message_sending` `{ cancel: false }` 是空操作（no-op），不會清除先前的取消動作。

原生 Codex 應用程式伺服器將橋接器 Codex 原生工具事件回傳至此 hook 介面。外掛程式可以透過 `before_tool_call` 封鎖原生 Codex 工具，透過 `after_tool_call` 觀察結果，並參與 Codex `PermissionRequest` 的核准。橋接器目前尚不會重寫 Codex 原生工具引數。確切的 Codex 執行時期支援邊界記載於 [Codex harness v1 support contract](/zh-Hant/plugins/codex-harness#v1-support-contract)。

如需完整的型別化 hook 行為，請參閱 [SDK overview](/zh-Hant/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [Building plugins](/zh-Hant/plugins/building-plugins) — 建立您自己的外掛程式
- [Plugin bundles](/zh-Hant/plugins/bundles) — Codex/Claude/Cursor bundle 相容性
- [Plugin manifest](/zh-Hant/plugins/manifest) — manifest schema
- [Registering tools](/zh-Hant/plugins/building-plugins#registering-agent-tools) — 在外掛程式中新增 agent 工具
- [Plugin internals](/zh-Hant/plugins/architecture) — 功能模型與載入管線
- [Community plugins](/zh-Hant/plugins/community) — 第三方列表
