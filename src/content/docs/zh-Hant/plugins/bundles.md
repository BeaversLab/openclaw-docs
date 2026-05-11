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

| 功能       | 映射方式                                                                    | 適用於         |
| ---------- | --------------------------------------------------------------------------- | -------------- |
| 技能內容   | Bundle 技能根目錄作為普通的 OpenClaw 技能加載                               | 所有格式       |
| 指令       | `commands/` 和 `.cursor/commands/` 被視為技能根目錄                         | Claude、Cursor |
| 鉤子包     | OpenClaw 風格的 `HOOK.md` + `handler.ts` 佈局                               | Codex          |
| MCP 工具   | Bundle MCP 配置合併到嵌入式 Pi 設定中；支持的 stdio 和 HTTP 伺服器被加載    | 所有格式       |
| LSP 伺服器 | Claude `.lsp.json` 和宣告清單中的 `lspServers` 合併到嵌入式 Pi LSP 預設值中 | Claude         |
| 設定       | Claude `settings.json` 作為嵌入式 Pi 預設值匯入                             | Claude         |

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

#### Pi 的 MCP

- 已啟用的套件可以貢獻 MCP 伺服器設定
- OpenClaw 將套件 MCP 設定合併到有效嵌入式 Pi 設定中作為
  `mcpServers`
- OpenClaw 在嵌入式 Pi 代理輪次期間透過
  啟動 stdio 伺服器或連接到 HTTP 伺服器來公開支援的套件 MCP 工具
- `coding` 和 `messaging` 工具設定檔預設包含套件 MCP 工具；
  使用 `tools.deny: ["bundle-mcp"]` 讓代理或網關選擇退出
- 專案本機 Pi 設定在套件預設值之後仍然適用，因此工作區設定可以在需要時覆寫套件 MCP 項目
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
- 伺服器前綴上限為 30 個字元
- 完整工具名稱上限為 64 個字元
- 空的伺服器名稱會退回至 `mcp`
- 重複的清理名稱會加上數字尾碼以消除歧義
- 最終公開的工具順序依安全名稱決定，以保持重複 Pi 輪次的快取穩定性
- 設定檔過濾會將來自單一套件 MCP 伺服器的所有工具視為由 `bundle-mcp` 擁有，因此設定檔允許清單和拒絕清單可以包含個別公開的工具名稱或 `bundle-mcp` 外掛程式金鑰

#### 嵌入式 Pi 設定

- 啟用套件時，會將 Claude `settings.json` 匯入為預設的嵌入式 Pi 設定
- OpenClaw 會在套用 shell 覆寫金鑰之前將其淨化

淨化後的金鑰：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 Pi LSP

- 啟用的 Claude 套件可以提供 LSP 伺服器設定
- OpenClaw 會載入 `.lsp.json` 以及任何清單中宣告的 `lspServers` 路徑
- 套件 LSP 設定會合併至有效的嵌入式 Pi LSP 預設值中
- 目前僅支援執行以 stdio 為基礎的 LSP 伺服器；不支援的傳輸方式仍會顯示在 `openclaw plugins inspect <id>` 中

### 已偵測但未執行

這些項目會被識別並顯示在診斷中，但 OpenClaw 不會執行它們：

- Claude `agents`、`hooks.json` 自動化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 內聯/應用程式中介資料 (除功能報告外)

## 套件格式

<AccordionGroup>
  <Accordion title="Codex 套件">
    標記：`.codex-plugin/plugin.json`

    選用內容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    當 Codex 套件使用技能根目錄和 OpenClaw 風格的掛勾套件目錄（`HOOK.md` + `handler.ts`）時，最適合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 套件">
    兩種偵測模式：

    - **基於清單 (Manifest-based)：** `.claude-plugin/plugin.json`
    - **無清單 (Manifestless)：** 預設 Claude 版面配置 (`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`)

    Claude 特定行為：

    - `commands/` 被視為技能內容
    - `settings.json` 被匯入至內嵌 Pi 設定 (shell 覆寫鍵會被清理)
    - `.mcp.json` 將支援的 stdio 工具暴露給內嵌 Pi
    - `.lsp.json` 加上清單中宣告的 `lspServers` 路徑會載入至內嵌 Pi LSP 預設值
    - `hooks/hooks.json` 會被偵測到但不執行
    - 清單中的自訂元件路徑為累加性 (它們會擴充預設值，而非取代)

  </Accordion>

  <Accordion title="Cursor 套件">
    標記： `.cursor-plugin/plugin.json`

    選用內容： `skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被視為技能內容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 僅供偵測

  </Accordion>
</AccordionGroup>

## 偵測優先順序

OpenClaw 會優先檢查原生外掛程式格式：

1. `openclaw.plugin.json` 或包含 `openclaw.extensions` 的有效 `package.json` — 視為 **原生外掛**
2. 套件標記 (`.codex-plugin/`、`.claude-plugin/` 或預設 Claude/Cursor 版面配置) — 視為 **套件**

如果目錄同時包含兩者，OpenClaw 會使用原生路徑。這可以防止雙格式套件被部分安裝為套件。

## 執行時期相依性與清理

- Bundled plugin runtime dependencies ship inside the OpenClaw package under
  `dist/*`. OpenClaw does **not** run `npm install` at startup for bundled
  plugins; the release pipeline is responsible for shipping a complete bundled
  dependency payload (see the postpublish verification rule in
  [Releasing](/zh-Hant/reference/RELEASING)).

## Security

Bundles have a narrower trust boundary than native plugins:

- OpenClaw does **not** load arbitrary bundle runtime modules in-process
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
