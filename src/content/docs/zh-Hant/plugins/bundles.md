---
summary: "安裝並使用 Codex、Claude 和 Cursor 套件作為 OpenClaw 外掛程式"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "外掛程式套件"
---

# 外掛程式套件

OpenClaw 可以從三個外部生態系統安裝外掛程式：**Codex**、**Claude** 和 **Cursor**。這些被稱為**套件**（bundles）—— OpenClaw 會將其內容和元資料套件映射到技能、掛鉤和 MCP 工具等原生功能。

<Info>套件與原生的 OpenClaw 外掛並**不**相同。原生外掛在 進程內運行，並可以註冊任何功能。套件則是內容套件，具有 選擇性的功能映射和更狹窄的信任邊界。</Info>

## 為何存在套件

許多實用的外掛程式是以 Codex、Claude 或 Cursor 格式發布的。OpenClaw 不會要求作者將其重寫為原生 OpenClaw 外掛程式，而是會偵測這些格式，並將其支援的內容映射到原生功能集中。這意味著您可以安裝 Claude 指令套件或 Codex 技能套件並立即使用。

## 安裝套件

<Steps>
  <Step title="從目錄、歸檔或市集安裝">
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

  <Step title="驗證偵測">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    套件會顯示為 `Format: bundle`，子類型為 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重新啟動並使用">
    ```bash
    openclaw gateway restart
    ```

    對應的功能（技能、鉤子、MCP 工具、LSP 預設值）將在下次工作階段中可用。

  </Step>
</Steps>

## OpenClaw 從套件對應的內容

並非所有套件功能目前都能在 OpenClaw 中運作。以下列出可用的功能以及已被偵測但尚未連線的功能。

### 目前支援

| 功能       | 對應方式                                                                      | 適用於         |
| ---------- | ----------------------------------------------------------------------------- | -------------- |
| 技能內容   | 套件技能根目錄會作為一般 OpenClaw 技能載入                                    | 所有格式       |
| 指令       | `commands/` 和 `.cursor/commands/` 被視為技能根目錄                           | Claude、Cursor |
| Hook 套件  | OpenClaw 風格的 `HOOK.md` + `handler.ts` 佈局                                 | Codex          |
| MCP 工具   | 套件 MCP 設定合併至內嵌 Pi 設定；支援的 stdio 與 HTTP 伺服器已載入            | 所有格式       |
| LSP 伺服器 | Claude `.lsp.json` 與 manifest 中宣告的 `lspServers` 合併至內嵌 Pi LSP 預設值 | Claude         |
| 設定       | Claude `settings.json` 匯入為內嵌 Pi 預設值                                   | Claude         |

#### 技能內容

- 套件技能根目錄會作為一般 OpenClaw 技能根目錄載入
- Claude `commands` 根目錄被視為額外的技能根目錄
- Cursor `.cursor/commands` 根目錄被視為額外的技能根目錄

這表示 Claude Markdown 指令檔案透過一般 OpenClaw 技能載入器運作。Cursor 指令 Markdown 也透過相同路徑運作。

#### Hook 套件

- 套件 hook 根目錄**僅**在它們使用一般 OpenClaw hook-pack
  佈局時運作。目前這主要是指相容 Codex 的情況：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### Pi 的 MCP

- 啟用的套件可以提供 MCP 伺服器設定
- OpenClaw 會將套件 MCP 設定合併到有效的嵌入式 Pi 設定中，作為
  `mcpServers`
- OpenClaw 透過啟動 stdio 伺服器或連線到 HTTP 伺服器，在嵌入式 Pi 代理程式輪次期間公開支援的套件 MCP 工具
- 專案本機 Pi 設定在套件預設值之後仍然適用，因此工作區設定可以在需要時覆寫套件 MCP 項目
- 套件 MCP 工具目錄在註冊前會進行確定性排序，因此上游 `listTools()` 順序的變更不會對提示快取工具區塊造成頻繁變動

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

**HTTP** 預設透過 `sse` 連線到執行中的 MCP 伺服器，或在請求時使用 `streamable-http`：

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

- `transport` 可以設定為 `"streamable-http"` 或 `"sse"`；如果省略，OpenClaw 會使用 `sse`
- 僅允許 `http:` 和 `https:` URL 網址通訊協定
- `headers` 值支援 `${ENV_VAR}` 插值
- 同時包含 `command` 和 `url` 的伺服器項目將被拒絕
- URL 憑證（使用者資訊和查詢參數）會從工具描述和日誌中進行編輯
- `connectionTimeoutMs` 會覆寫 stdio 和 HTTP 傳輸預設的 30 秒連線逾時

##### 工具命名

OpenClaw 會以供應商安全名稱形式註冊套件 MCP 工具，格式為
`serverName__toolName`。例如，金鑰為 `"vigil-harbor"` 的伺服器公開
`memory_search` 工具，會註冊為 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 以外的字元會被替換為 `-`
- 伺服器前綴上限為 30 個字元
- 完整工具名稱上限為 64 個字元
- 空的伺服器名稱會回退到 `mcp`
- 衝突的清理名稱會透過數字後綴進行消除歧義
- 最終公開的工具順序依安全名稱確定性排列，以保持重複的 Pi 輪次快取穩定

#### 嵌入式 Pi 設定

- 當啟用套件時，`settings.json` 會匯入為預設的內嵌 Pi 設定
- OpenClaw 會在套用 shell 覆寫鍵之前對其進行清理

已清理的鍵：

- `shellPath`
- `shellCommandPrefix`

#### 內嵌 Pi LSP

- 已啟用的 Claude 套件可以提供 LSP 伺服器設定
- OpenClaw 會載入 `.lsp.json` 以及任何清單中宣告的 `lspServers` 路徑
- 套件 LSP 設定會合併到有效的內嵌 Pi LSP 預設值中
- 目前僅支援以 stdio 為後端的 LSP 伺服器；不支援的傳輸方式仍會顯示在 `openclaw plugins inspect <id>` 中

### 已偵測但未執行

這些項目會被識別並顯示在診斷資訊中，但 OpenClaw 不會執行它們：

- Claude `agents`、`hooks.json` 自動化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- 除功能報告之外的 Codex 內聯/應用程式中繼資料

## 套件格式

<AccordionGroup>
  <Accordion title="Codex 套件">
    標記：`.codex-plugin/plugin.json`

    選用內容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    當 Codex 套件使用技能根目錄和 OpenClaw 風格的掛鉤套件目錄 (`HOOK.md` + `handler.ts`) 時，最適合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 套件">
    兩種偵測模式：

    - **基於清單：** `.claude-plugin/plugin.json`
    - **無清單：** 預設 Claude 版面配置 (`skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `.lsp.json`, `settings.json`)

    Claude 特定行為：

    - `commands/` 被視為技能內容
    - `settings.json` 被匯入至嵌入式 Pi 設定（shell 覆寫鍵會被清理）
    - `.mcp.json` 將支援的 stdio 工具公開給嵌入式 Pi
    - `.lsp.json` 加上清單宣告的 `lspServers` 路徑會載入至嵌入式 Pi LSP 預設值
    - `hooks/hooks.json` 會被偵測到但不會執行
    - 清單中的自訂元件路徑是累加的（它們會擴充預設值，而不是取代它們）

  </Accordion>

  <Accordion title="Cursor 套件">
    標記：`.cursor-plugin/plugin.json`

    選用內容：`skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` 被視為技能內容
    - `.cursor/rules/`, `.cursor/agents/`, 以及 `.cursor/hooks.json` 僅供偵測

  </Accordion>
</AccordionGroup>

## 偵測優先順序

OpenClaw 會先檢查原生外掛程式格式：

1. `openclaw.plugin.json` 或具有 `openclaw.extensions` 的有效 `package.json` — 視為 **原生外掛程式**
2. 套件標記 (`.codex-plugin/`, `.claude-plugin/`, 或預設 Claude/Cursor 版面配置) — 視為 **套件**

如果目錄同時包含這兩者，OpenClaw 將使用原生路徑。這可防止雙格式套件被部分安裝為套件。

## 安全性

與原生外掛程式相比，套件的信任邊界更窄：

- OpenClaw **不會** 在程序內載入任意的套件執行階段模組
- 技能和 hook-pack 路徑必須保持在插件根目錄內（進行邊界檢查）
- 設定檔會透過相同的邊界檢查進行讀取
- 支援的 stdio MCP 伺服器可以作為子程序啟動

這使得套件預設更安全，但您仍應將第三方套件視為其所公開功能的可信內容。

## 疑難排解

<AccordionGroup>
  <Accordion title="偵測到套件但功能未執行">
    執行 `openclaw plugins inspect <id>`。如果列出了某項功能但標記為未連線，那是產品限制 —— 而非安裝錯誤。
  </Accordion>

<Accordion title="Claude 指令檔未顯示">請確保套件已啟用，且 markdown 檔案位於偵測到的 `commands/` 或 `skills/` 根目錄內。</Accordion>

<Accordion title="Claude 設定未套用">僅支援來自 `settings.json` 的嵌入式 Pi 設定。OpenClaw 不會將套件設定視為原始設定檔補丁。</Accordion>

  <Accordion title="Claude hooks 未執行">
    `hooks/hooks.json` 僅供偵測。如果您需要可執行的 hooks，請使用 OpenClaw hook-pack 版面配置或發布原生插件。
  </Accordion>
</AccordionGroup>

## 相關

- [安裝和設定插件](/zh-Hant/tools/plugin)
- [建置插件](/zh-Hant/plugins/building-plugins) —— 建立原生插件
- [插件清單](/zh-Hant/plugins/manifest) —— 原生清單架構
