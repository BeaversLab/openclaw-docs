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
- `coding` 和 `messaging` 工具設定檔預設包含套件 MCP 工具；針對特定代理程式或閘道，可使用 `tools.deny: ["bundle-mcp"]` 來選擇退出
- 在套件預設值之後，專案本機 Pi 設定仍然適用，因此在必要時工作區設定可以覆寫套件 MCP 項目
- 套件 MCP 工具目錄在註冊前會經過確定性排序，因此上游 `listTools()` 順序的變更不會導致提示快取工具區塊的重新整理

##### 傳輸方式

MCP 伺服器可以使用 stdio 或 HTTP 傳輸：

**Stdio** 會啟動一個子行程：

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

**HTTP** 預設透過 `sse` 連接到執行中的 MCP 伺服器，或在有要求時使用 `streamable-http`：

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

- `transport` 可設為 `"streamable-http"` 或 `"sse"`；若省略，OpenClaw 會使用 `sse`
- 僅允許 `http:` 和 `https:` URL 網址方案
- `headers` 值支援 `${ENV_VAR}` 插值
- 同時包含 `command` 和 `url` 的伺服器項目會被拒絕
- URL 憑證（使用者資訊和查詢參數）會從工具描述和日誌中編輯移除
- `connectionTimeoutMs` 會覆寫 stdio 和 HTTP 傳輸預設的 30 秒連線逾時

##### 工具命名

OpenClaw 會使用提供者安全名稱來註冊套件 MCP 工具，格式為 `serverName__toolName`。舉例來說，鍵值為 `"vigil-harbor"` 的伺服器若公開 `memory_search` 工具，將註冊為 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 以外的字元會被替換為 `-`
- 伺服器前綴上限為 30 個字元
- 完整工具名稱上限為 64 個字元
- 空的伺服器名稱會退回到 `mcp`
- 重複的清理名稱會加上數字尾碼以消除歧義
- 最終公開的工具順序依安全名稱決定，以保持重複 Pi 輪次的快取穩定性
- 設定檔過濾會將來自單一套件 MCP 伺服器的所有工具視為由 `bundle-mcp` 外掛程式所擁有，因此設定檔允許清單和拒絕清單可以包含個別公開的工具名稱或 `bundle-mcp` 外掛程式金鑰

#### 嵌入式 Pi 設定

- 啟用套件時，會將 Claude `settings.json` 匯入為預設的嵌入式 Pi 設定
- OpenClaw 會在套用 shell 覆寫金鑰之前將其淨化

淨化後的金鑰：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 Pi LSP

- 啟用的 Claude 套件可以提供 LSP 伺服器設定
- OpenClaw 會載入 `.lsp.json` 加上任何宣告資訊清單的 `lspServers` 路徑
- 套件 LSP 設定會合併至有效的嵌入式 Pi LSP 預設值中
- 目前僅支援受支援的 stdio 支援 LSP 伺服器可執行；不支援的傳輸仍會顯示在 `openclaw plugins inspect <id>` 中

### 已偵測但未執行

這些項目會被識別並顯示在診斷中，但 OpenClaw 不會執行它們：

- Claude `agents`、`hooks.json` 自動化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 內聯/應用程式中介資料 (除功能報告外)

## 套件格式

<AccordionGroup>
  <Accordion title="Codex bundles">
    標記：`.codex-plugin/plugin.json`

    選用內容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    當 Codex 套件使用技能根目錄和 OpenClaw 風格的掛鉤套件目錄 (`HOOK.md` + `handler.ts`) 時，最適合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 套件">
    兩種偵測模式：

    - **基於清單 (Manifest-based)：** `.claude-plugin/plugin.json`
    - **無清單 (Manifestless)：** 預設的 Claude 版面配置 (`skills/`、 `commands/`、 `agents/`、 `hooks/`、 `.mcp.json`、 `.lsp.json`、 `settings.json`)

    Claude 專屬行為：

    - `commands/` 被視為技能內容
    - `settings.json` 被匯入至內嵌的 Pi 設定 (shell 覆寫鍵會被清理)
    - `.mcp.json` 將支援的 stdio 工具公開給內嵌的 Pi
    - `.lsp.json` 加上清單中宣告的 `lspServers` 路徑會載入至內嵌 Pi 的 LSP 預設值
    - `hooks/hooks.json` 會被偵測到但不會執行
    - 清單中的自訂元件路徑具有累加性 (它們會擴展預設值，而非取代它們)

  </Accordion>

  <Accordion title="Cursor 套件">
    標記： `.cursor-plugin/plugin.json`

    選用內容： `skills/`、 `.cursor/commands/`、 `.cursor/agents/`、 `.cursor/rules/`、 `.cursor/hooks.json`、 `.mcp.json`

    - `.cursor/commands/` 被視為技能內容
    - `.cursor/rules/`、 `.cursor/agents/` 和 `.cursor/hooks.json` 僅供偵測

  </Accordion>
</AccordionGroup>

## 偵測優先順序

OpenClaw 會優先檢查原生外掛程式格式：

1. `openclaw.plugin.json` 或具有 `openclaw.extensions` 的有效 `package.json` — 視為 **原生外掛程式**
2. 套件標記 (`.codex-plugin/`、 `.claude-plugin/` 或預設 Claude/Cursor 版面配置) — 視為 **套件**

如果目錄同時包含兩者，OpenClaw 會使用原生路徑。這可以防止雙格式套件被部分安裝為套件。

## 安全性

套件的信任邊界比原生外掛程式更狹窄：

- OpenClaw **不會** 在行程內載入任意的套件執行階段模組
- Skills and hook-pack paths must stay inside the plugin root (boundary-checked)
- Settings files are read with the same boundary checks
- Supported stdio MCP servers may be launched as subprocesses

This makes bundles safer by default, but you should still treat third-party
bundles as trusted content for the features they do expose.

## Troubleshooting

<AccordionGroup>
  <Accordion title="Bundle is detected but capabilities do not run">
    Run `openclaw plugins inspect <id>`. If a capability is listed but marked as
    not wired, that is a product limit — not a broken install.
  </Accordion>

<Accordion title="Claude command files do not appear">Make sure the bundle is enabled and the markdown files are inside a detected `commands/` or `skills/` root.</Accordion>

<Accordion title="Claude settings do not apply">Only embedded Pi settings from `settings.json` are supported. OpenClaw does not treat bundle settings as raw config patches.</Accordion>

  <Accordion title="Claude hooks do not execute">
    `hooks/hooks.json` is detect-only. If you need runnable hooks, use the
    OpenClaw hook-pack layout or ship a native plugin.
  </Accordion>
</AccordionGroup>

## Related

- [Install and Configure Plugins](/zh-Hant/tools/plugin)
- [Building Plugins](/zh-Hant/plugins/building-plugins) — create a native plugin
- [Plugin Manifest](/zh-Hant/plugins/manifest) — native manifest schema
