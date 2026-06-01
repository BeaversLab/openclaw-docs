---
summary: "安裝並使用 Codex、Claude 和 Cursor 套件作為 OpenClaw 外掛程式"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "Plugin bundles"
---

OpenClaw 可以從三個外部生態系統安裝外掛：**Codex**、**Claude**
和 **Cursor**。這些稱為 **bundles**（套件）—— OpenClaw 將其映射為技
能、鉤子和 MCP 工具等原生功能的內容和元數據包。

<Info>Bundles **並不**等同於原生 OpenClaw 外掛。原生外掛在進程內 運行，並可以註冊任何功能。Bundles 是內容包，具有選擇性的 功能映射和更狹窄的信任邊界。</Info>

## 為什麼存在 bundles

許多有用的外掛以 Codex、Claude 或 Cursor 格式發布。OpenClaw
檢測這些格式，並將其支持的內容映射到原生功能集中，而不是要求
作者將其重寫為原生 OpenClaw 外掛。這意味著您可以安裝 Claude 指令包
或 Codex 技能包並立即使用。

## 安裝 bundle

<Steps>
  <Step title="從目錄、歸檔或市場安裝">
    ```bash
    # Local directory
    openclaw plugins install ./my-bundle

    # Archive
    openclaw plugins install ./my-bundle.tgz

    # Claude marketplace
    openclaw plugins marketplace list <marketplace-name>
    openclaw plugins install <plugin-name>@<marketplace-name>
    ```

  </Step>

  <Step title="驗證檢測">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    Bundles 顯示為 `Format: bundle`，其子類型為 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重啟並使用">
    ```bash
    openclaw gateway restart
    ```

    映射的功能（技能、鉤子、MCP 工具、LSP 預設值）將在下一個工作階段中可用。

  </Step>
</Steps>

## OpenClaw 從 bundles 映射的內容

並非所有 bundle 功能都能在 OpenClaw 中運行。以下是目前可用的功能
以及已檢測到但尚未連接的功能。

### 目前已支持

| 功能       | 映射方式                                                                            | 適用於         |
| ---------- | ----------------------------------------------------------------------------------- | -------------- |
| 技能內容   | Bundle 技能根目錄作為普通的 OpenClaw 技能加載                                       | 所有格式       |
| 指令       | `commands/` 和 `.cursor/commands/` 被視為技能根目錄                                 | Claude、Cursor |
| 鉤子包     | OpenClaw 風格的 `HOOK.md` + `handler.ts` 佈局                                       | Codex          |
| MCP 工具   | Bundle MCP 設定已合併至嵌入式 OpenClaw 設定；已載入支援的 stdio 和 HTTP 伺服器      | 所有格式       |
| LSP 伺服器 | Claude `.lsp.json` 和資訊清單聲明的 `lspServers` 已合併至嵌入式 OpenClaw LSP 預設值 | Claude         |
| 設定       | Claude `settings.json` 已作為嵌入式 OpenClaw 預設值匯入                             | Claude         |

#### 技能內容

- 套件技能根目錄作為一般 OpenClaw 技能根目錄載入
- Claude `commands` 根目錄被視為額外的技能根目錄
- Cursor `.cursor/commands` 根目錄被視為額外的技能根目錄

這意味著 Claude markdown 指令檔案透過一般 OpenClaw 技能
載入器運作。Cursor 指令 markdown 透過相同路徑運作。

#### Hook 套件

- 套件 hook 根目錄**僅**在它們使用一般 OpenClaw hook-pack
  佈局時運作。目前這主要是 Codex 相容的情況：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### MCP for embedded OpenClaw

- 已啟用的套件可以貢獻 MCP 伺服器設定
- OpenClaw 將 bundle MCP 設定合併至有效的嵌入式 OpenClaw 設定中，作為
  `mcpServers`
- OpenClaw 透過啟動 stdio 伺服器或連接至 HTTP 伺服器，在嵌入式 OpenClaw 代理程序回合期間公開支援的 bundle MCP 工具
- `coding` 和 `messaging` 工具設定檔預設包含套件 MCP 工具；
  使用 `tools.deny: ["bundle-mcp"]` 讓代理或網關選擇退出
- 專本機嵌入式代理程序設定仍在 bundle 預設值之後生效，因此工作區
  設定可以在需要時覆寫 bundle MCP 項目
- 套件 MCP 工具目錄在註冊前會進行確定性排序，因此
  上游 `listTools()` 順序的變更不會破壞提示快取工具區塊

##### 傳輸方式

MCP 伺服器可以使用 stdio 或 HTTP 傳輸方式：

**Stdio** 會啟動子程序：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["server.js"],
        "env": { "PORT": "3000" }
      }
    }
  }
}
```

**HTTP** 預設透過 `sse` 連接到正在運行的 MCP 伺服器，或在要求時透過 `streamable-http`：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "url": "http://localhost:3100/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${MY_SECRET_TOKEN}"
        },
        "connectionTimeoutMs": 30000
      }
    }
  }
}
```

- `transport` 可設定為 `"streamable-http"` 或 `"sse"`；省略時，OpenClaw 使用 `sse`
- `type: "http"` 是 CLI 原生的下游形狀；在 OpenClaw 設定中使用 `transport: "streamable-http"`。`openclaw mcp set` 和 `openclaw doctor --fix` 會正規化通用別名。
- 僅允許 `http:` 和 `https:` URL 網協
- `headers` 值支援 `${ENV_VAR}` 插值
- 同時包含 `command` 和 `url` 的伺服器項目將被拒絕
- URL 憑證（使用者資訊和查詢參數）會從工具描述和日誌中編輯移除
- `connectionTimeoutMs` 會覆寫 stdio 和 HTTP 傳輸預設的 30 秒連線逾時

##### 工具命名

OpenClaw 會以提供者安全的名稱形式註冊套件 MCP 工具，例如 `serverName__toolName`。舉例來說，一個金鑰為 `"vigil-harbor"` 且公開 `memory_search` 工具的伺服器會註冊為 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 以外的字元會被替換為 `-`
- 以非字母開頭的片段會獲得字母前綴，因此數值伺服器金鑰（例如 `12306`）會變成提供者安全的工具前綴
- 伺服器前綴限制為 30 個字元
- 完整工具名稱限制為 64 個字元
- 空的伺服器名稱會退回至 `mcp`
- 衝突的清理名稱會透過數值後綴來消除歧義
- 最終公開的工具順序依安全名稱決定，以保持重複的嵌入式代理程序
  回合的快取穩定性
- 設定檔過濾會將來自單一套件 MCP 伺服器的所有工具視為由 `bundle-mcp` 外掛擁有，因此設定檔允許清單和拒絕清單可以包含個別公開工具名稱或 `bundle-mcp` 外掛金鑰

#### Embedded OpenClaw settings

- 啟用 bundle 時，Claude `settings.json` 會作為預設的嵌入式 OpenClaw 設定匯入
- OpenClaw 會在套用 Shell 覆寫金鑰之前先將其清理

已清理的金鑰：

- `shellPath`
- `shellCommandPrefix`

#### Embedded OpenClaw LSP

- 已啟用的 Claude 套件可以提供 LSP 伺服器設定
- OpenClaw 會載入 `.lsp.json` 加上任何清單宣告的 `lspServers` 路徑
- bundle LSP 設定會合併至有效的嵌入式 OpenClaw LSP 預設值
- 目前僅支援的 stdio 支援 LSP 伺服器可以執行；不支援的傳輸方式仍會顯示在 `openclaw plugins inspect <id>` 中

### 已偵測但未執行

這些項目會被辨識並顯示在診斷中，但 OpenClaw 不會執行它們：

- Claude `agents`、`hooks.json` 自動化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- 除功能回報之外的 Codex 內聯/應用程式中繼資料

## 套件格式

<AccordionGroup>
  <Accordion title="Codex 套件">
    標記：`.codex-plugin/plugin.json`

    可選內容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    當 Codex 套件使用技能根目錄和 OpenClaw 風格的 hook-pack 目錄（`HOOK.md` + `handler.ts`）時，最適合 OpenClaw。

  </Accordion>

  <Accordion title="Claude bundles">
    兩種偵測模式：

    - **Manifest-based（基於資訊清單）：** `.claude-plugin/plugin.json`
    - **Manifestless（無資訊清單）：** 預設 Claude 版面配置 (`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`)

    Claude 特定行為：

    - `commands/` 被視為技能內容
    - `settings.json` 被匯入至嵌入式 OpenClaw 設定（shell 覆寫鍵會被清理）
    - `.mcp.json` 將支援的 stdio 工具公開至嵌入式 OpenClaw
    - `.lsp.json` 加上資訊清單聲明的 `lspServers` 路徑會載入至嵌入式 OpenClaw LSP 預設值
    - `hooks/hooks.json` 會被偵測到但不會執行
    - 資訊清單中的自訂元件路徑是累加的（它們會擴充預設值，而非取代預設值）

  </Accordion>

  <Accordion title="Cursor 套件">
    標記：`.cursor-plugin/plugin.json`

    可選內容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被視為技能內容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 僅供偵測

  </Accordion>
</AccordionGroup>

## 偵測優先順序

OpenClaw 會先檢查原生外掛格式：

1. `openclaw.plugin.json` 或帶有 `openclaw.extensions` 的有效 `package.json` —— 視為 **原生插件**
2. Bundle 標記（`.codex-plugin/`、`.claude-plugin/` 或預設 Claude/Cursor 佈局）—— 視為 **bundle**

如果目錄同時包含這兩者，OpenClaw 將使用原生路徑。這可以防止雙格式套件被部分安裝為 bundle。

## 執行時依賴與清理

- 第三方相容的 bundle 不會獲得啟動 `npm install` 修復。它們應通過 `openclaw plugins install` 安裝，並將其所需的一切包含在已安裝的插件目錄中。
- OpenClaw 擁有的打包插件要么在核心中輕量級發布，要么可通過插件安裝程式下載。Gateway 啟動從不會為它們執行套件管理器。
- `openclaw doctor --fix` 會移除舊版的暫存相依性目錄，並且當配置參照到本機外掛程式索引中遺失的可下載外掛程式時，可以還原這些外掛程式。

## 安全性

套件組合具有比原生外掛程式更狹窄的信任邊界：

- OpenClaw **不會** 在行程內載入任意的套件組合執行階段模組
- 技能和 Hook 套件的路徑必須保持在外掛程式根目錄內（經過邊界檢查）
- 設定檔的讀取會經過相同的邊界檢查
- 支援的 stdio MCP 伺服器可能會作為子行程啟動

這使得套件組合預設上更安全，但您仍應將第三方套件組合視為其公開功能的受信任內容。

## 疑難排解

<AccordionGroup>
  <Accordion title="Bundle is detected but capabilities do not run">
    執行 `openclaw plugins inspect <id>`。如果列出了某個功能但標記為未連接，那是產品限制 —— 並非安裝損壞。
  </Accordion>

<Accordion title="Claude command files do not appear">請確保已啟用該套件，且 markdown 檔案位於偵測到的 `commands/` 或 `skills/` 根目錄內。</Accordion>

<Accordion title="Claude 設定不適用">僅支援來自 `settings.json` 的內嵌 OpenClaw 設定。OpenClaw 不會將 bundle 設定視為原始設定檔修補（raw config patches）。</Accordion>

  <Accordion title="Claude 掛鉤不會執行">
    `hooks/hooks.json` 僅供偵測。如果您需要可執行的掛鉤，請使用
    OpenClaw 的掛鉤包佈局或提供原生外掛程式。
  </Accordion>
</AccordionGroup>

## 相關

- [安裝與設定外掛程式](/zh-Hant/tools/plugin)
- [建置外掛程式](/zh-Hant/plugins/building-plugins) — 建立原生外掛程式
- [外掛程式清單](/zh-Hant/plugins/manifest) — 原生清單架構
