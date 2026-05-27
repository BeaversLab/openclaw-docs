---
summary: "將相容的 Codex、Claude 和 Cursor 套件作為 OpenClaw 外掛安裝"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to know which bundle features OpenClaw executes
  - You are debugging bundle detection, MCP tools, LSP defaults, or missing capabilities
title: "外掛套件"
doc-schema-version: 1
---

外掛套件讓 OpenClaw 能重複使用相容的 Codex、Claude 和 Cursor 外掛佈局，而無需將其作為原生的 OpenClaw 執行時模組載入。當您擁有現有套件並需要安裝它，驗證 OpenClaw 如何對其進行分類，以及了解哪些部分會變成 OpenClaw 技能、Hooks、MCP 工具、設定或診斷功能時，請使用本頁面。

<Info>套件並非原生的 OpenClaw 外掛。原生外掛在進程中運行，並可直接註冊 OpenClaw 功能。套件是內容和元資料包，OpenClaw 會選擇性地將其映射到支援的介面上。</Info>

## 選擇正確的外掛格式

當您已經擁有 Codex、Claude 或 Cursor 相容套件，並希望 OpenClaw 將其支援的內容映射為技能、Hook 包、MCP 工具、設定或 LSP 預設值，而無需將其重寫為原生外掛時，請使用套件。當整合必須註冊通道、提供者、服務、HTTP 路由、Gateway 方法、外掛擁有的 CLI 命令或其他執行時功能時，請建構原生 OpenClaw 外掛。

| 需要                                                               | 使用     |
| ------------------------------------------------------------------ | -------- |
| 從相容的生態系統重複使用技能、指令 Markdown、MCP 設定或 LSP 預設值 | 套件     |
| 在 OpenClaw 中執行任意的外掛執行時代碼                             | 原生外掛 |
| 發布完整的 OpenClaw 功能                                           | 原生外掛 |
| 移植現有的 Claude 或 Cursor 指令包                                 | 套件     |

請參閱 [建構外掛](/zh-Hant/plugins/building-plugins) 以了解原生外掛的撰寫，並參閱 [外掛](/zh-Hant/tools/plugin) 以了解主要的安裝流程。

## 安裝並驗證套件

<Steps>
  <Step title="安裝套件">
    從本機目錄、壓縮檔或支援的市集來源進行安裝：

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

  <Step title="檢查偵測結果">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    相容的套件會顯示 `Format: bundle` 以及 `codex`、`claude`
    或 `cursor` 子類型。

  </Step>

  <Step title="重新啟動 Gateway">
    ```bash
    openclaw gateway restart
    ```

    安裝或更新外掛程式碼需要重新啟動 Gateway。

  </Step>
</Steps>

## OpenClaw 從套件映射的內容

並非每個套件功能目前都能在 OpenClaw 中執行。OpenClaw 會將支援的內容映射至原生介面，並在外掛程式診斷中回報僅供偵測的內容。

### 目前支援

| 功能       | 映射方式                                                                  | 適用於         |
| ---------- | ------------------------------------------------------------------------- | -------------- |
| 技能內容   | 套件技能根目錄會作為一般 OpenClaw 技能載入                                | 所有格式       |
| 指令       | `commands/` 和 `.cursor/commands/` 被視為技能根目錄                       | Claude、Cursor |
| Hook 套件  | OpenClaw 風格的 `HOOK.md` 和 `handler.ts` 或 `handler.js` 佈局            | 主要是 Codex   |
| MCP 工具   | 套件 MCP 設定會合併至內嵌 Pi 設定中；支援的 stdio 和 HTTP 伺服器會載入    | 所有格式       |
| LSP 伺服器 | Claude `.lsp.json` 和宣告資訊中的 `lspServers` 會合併至內嵌 Pi LSP 預設值 | Claude         |
| 設定       | Claude `settings.json` 在移除 shell 覆寫金鑰後，會匯入為內嵌 Pi 預設值    | Claude         |

### 技能內容

套件技能根目錄會作為一般 OpenClaw 技能根目錄載入。Claude `commands/` 和
Cursor `.cursor/commands/` 會透過相同路徑載入。

### Hook 套件

套件 hook 根目錄**僅**在使用一般 OpenClaw hook 套件佈局時執行：
`HOOK.md` 搭配 `handler.ts` 或 `handler.js`。目前這主要是
與 Codex 相容的情況。

### MCP 工具

已啟用的套件可將 MCP 伺服器設定以 `mcpServers` 的形式提供給內嵌 Pi。
支援的 stdio 和 HTTP 伺服器可在內嵌 Pi 週期中公開工具。`coding` 和
`messaging` 工具設定檔預設包含套件 MCP 工具；使用 `tools.deny: ["bundle-mcp"]` 即可針對特定代理程式或 Gateway 選擇退出。

### 內嵌 Pi 設定

當套件啟用時，Claude `settings.json` 會匯入為預設內嵌 Pi 設定。OpenClaw 會在套用前移除 shell 覆寫金鑰。

### 內嵌 Pi LSP

Claude `.lsp.json` 和清單聲明的 `lspServers` 會合併到內嵌 Pi LSP
預設值中。支援的 stdio 支援 LSP 伺服器可以執行。

### 已偵測但未執行

OpenClaw 會在診斷中回報這些項目，但不會執行它們：

- Claude `agents`、`hooks/hooks.json`、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 應用程式或內聯元資料

## Bundle 格式與偵測

OpenClaw 會在檢查 bundle 標記之前先檢查原生外掛標記。包含
`openclaw.plugin.json` 或有效 `package.json` `openclaw.extensions` 項目的目錄
會被視為原生外掛，即使它同時包含 bundle 檔案。這可以防止
雙格式套件透過 bundle 路徑被部分載入。

在原生偵測之後，OpenClaw 會辨識這些 bundle 版面配置：

<AccordionGroup>
  <Accordion title="Codex bundles">
    標記：`.codex-plugin/plugin.json`

    支援的對應內容：`skills/`、`hooks/`、`.mcp.json` 和 `.app.json`
    能力回報。

    當 Codex bundles 使用技能根目錄和 OpenClaw 風格的
    hook-pack 目錄時，最適合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 套件">
    偵測模式：

    - **基於清單：** `.claude-plugin/plugin.json`
    - **無清單：** 預設 Claude 版面配置，包含 `skills/`、`commands/`、
      `agents/`、`hooks/hooks.json`、`.mcp.json`、`.lsp.json` 或
      `settings.json`

    支援的對應內容：`skills/`、`commands/`、`settings.json`、
    `.mcp.json`、`.lsp.json`、清單宣告的 `mcpServers` 以及
    清單宣告的 `lspServers`。

    僅偵測內容：`agents`、`hooks/hooks.json` 和 `outputStyles`。

  </Accordion>

  <Accordion title="Cursor 套件">
    標記：`.cursor-plugin/plugin.json`

    支援的對應內容：`skills/`、`.cursor/commands/` 和 `.mcp.json`。

    僅偵測內容：`.cursor/agents`、`.cursor/hooks.json` 和
    `.cursor/rules`。

  </Accordion>
</AccordionGroup>

Claude 清單元件路徑是累加的。宣告自訂路徑會擴充套件中存在的預設路徑，而不是取代它們。

## MCP 設定參考

套件 MCP 工具使用合成外掛鍵 `bundle-mcp` 進行設定檔過濾。
若要讓代理程式或 Gateway 選擇不加入，請拒絕該鍵：

```json5
{
  tools: {
    deny: ["bundle-mcp"],
  },
}
```

專案本機的嵌入式 Pi 設定在套件預設值之後仍然生效，因此工作區設定可以在需要時覆寫套件 MCP 項目。

### MCP 設定結構

套件 MCP 檔案可以使用 `mcpServers`、`servers` 或頂層伺服器
對應。Stdio 伺服器會啟動子行程：

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "PORT": "3000" }
    }
  }
}
```

HTTP 伺服器預設透過 `sse` 連線，或在要求時透過 `streamable-http` 連線：

```json
{
  "mcpServers": {
    "my-server": {
      "url": "http://localhost:3100/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer local-dev-token"
      },
      "connectionTimeoutMs": 30000
    }
  }
}
```

規則：

- `transport` 可以是 `"sse"` 或 `"streamable-http"`。當省略時，OpenClaw
  會使用 `sse`。
- `type: "http"` 是一個 CLI 原生下游別名。請在
  套件組態中優先使用 `transport: "streamable-http"`；`openclaw mcp set` 和
  `openclaw doctor --fix` 會將別名正規化。
- 僅支援 `http:` 和 `https:` URL。
- `headers` 必須是具有字串相容值的 JSON 物件。
- 具有 `command` 的伺服器條目會被視為 stdio。具有 `url`
  且沒有指令的伺服器條目會被視為 HTTP。
- URL 憑證（包括使用者資訊和查詢參數）會從工具
  描述和日誌中編修。
- `connectionTimeoutMs` 會覆寫 stdio 和 HTTP 傳輸的預設 30 秒連線逾時。

為了 stdio 啟動安全性，不支援的環境變數條目會被忽略
並顯示診斷資訊，而不是盲目地傳遞。

### MCP 路徑和工具名稱

檔案備援 MCP 組態是相對於宣告它的套件檔案解析的。明確的相對 `command`、`args`、`cwd` 和 `workingDirectory` 值
會根據該檔案的目錄展開。Claude 套件組態也可以使用
`${CLAUDE_PLUGIN_ROOT}` 來參照套件根目錄。

OpenClaw 使用提供者安全的名稱註冊套件 MCP 工具：

```text
serverName__toolName
```

命名規則：

- `A-Za-z0-9_-` 以外的字元會變成 `-`。
- 伺服器前置碼必須以字母開頭；數字伺服器金鑰會加上 `mcp-`
  前置碼。
- 空的伺服器名稱會回退到 `mcp`。
- 伺服器前置碼上限為 30 個字元。
- 完整的工具名稱上限為 64 個字元。
- 衝突的清理後名稱會加上數字後綴。
- 公開的工具會依照安全名稱確定性排序，因此重複的 Pi 輪次
  會保持穩定的工具區塊。
- 設定檔允許清單和拒絕清單可以命名個別公開的工具或
  `bundle-mcp` 外掛金鑰。

## 嵌入式 Pi 設定和 LSP 預設值

已啟用的 Claude 套件可以為嵌入式 Pi 執行階段提供 `settings.json` 預設值。OpenClaw 會在套用本機專案設定之前先套用這些設定，然後清理 shell 覆寫鍵，以確保套件或工作區設定無法變更 shell 執行行為。

已清理的鍵：

- `shellPath`
- `shellCommandPrefix`

已啟用的 Claude 套件也可以透過 `.lsp.json` 或資訊清單宣告的 `lspServers` 提供 LSP 伺服器設定。OpenClaw 會將這些項目合併至嵌入式 Pi LSP 預設值中。支援的 stdio 支援 LSP 伺服器可以執行；不支援的伺服器項目仍會出現在 `openclaw plugins inspect <id>` 診斷中。

## 執行階段相依性與清理

第三方相容套件不會獲得啟動時的 `npm install` 修復。請使用 `openclaw plugins install` 安裝它們，並將其所需的所有執行階段檔案包含在已安裝的外掛目錄中。

OpenClaw 擁有的打包外掛可能是核心內建的輕量版本，或是可透過外掛安裝程式下載。閘道啟動程序不會為其執行套件管理員。`openclaw doctor --fix` 可以移除舊版的暫存相依性目錄，並還原設定中有參照但本機外掛索引遺失的可下載外掛。

## 安全性邊界

套件的執行階段邊界比原生外掛更狹窄：

- OpenClaw 不會在程序中載入任意的套件執行階段模組。
- 讀取 Skill 根目錄、Hook 套件路徑、設定檔、MCP 檔案和 LSP 檔案時，會進行外掛根目錄邊界檢查。
- OpenClaw 風格的 Hook 套件必須保留在外掛根目錄內。
- 支援的 stdio MCP 伺服器仍可啟動子程序。

請將第三方套件視為其對應功能（特別是 MCP 伺服器和 Hook 套件）的可信內容。

## 疑難排解

| 徵狀                          | 檢查                                                          | 修正                                                                           |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 功能已列出但未執行            | 執行 `openclaw plugins inspect <id>` 並檢查是否標記為未連線   | 這是目前產品的限制，並非安裝損壞                                               |
| Claude 命令檔案未顯示為技能   | 請檢查 markdown 檔案是否位於 `commands/` 或已宣告的命令路徑內 | 將檔案移至已偵測到的 `commands/` 或 `skills/` 根目錄下，啟用該套件，並重新啟動 |
| Claude `settings.json` 未套用 | 檢查套件是否已啟用並查看診斷資訊                              | 僅匯入內嵌的 Pi 設定；會移除 shell 覆寫鍵                                      |
| Claude hooks 未執行           | 檢查該套件是否僅有 `hooks/hooks.json`                         | 使用 OpenClaw hook-pack 版面配置或發布原生外掛                                 |

## 相關

- [外掛](/zh-Hant/tools/plugin) - 安裝、設定與疑難排解外掛
- [管理外掛](/zh-Hant/plugins/manage-plugins) - 常見的外掛 CLI 範例
- [外掛清單](/zh-Hant/plugins/plugin-inventory) - 生成的套件與外部外掛列表
- [外掛清單](/zh-Hant/plugins/manifest) - 原生外掛清單架構
- [建置外掛](/zh-Hant/plugins/building-plugins) - 建立原生外掛
