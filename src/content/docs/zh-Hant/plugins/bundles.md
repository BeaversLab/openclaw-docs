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
  <Step title="Install from a directory, archive, or marketplace">
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

    套件會顯示為 `Format: bundle`，並帶有 `codex`、`claude` 或 `cursor` 子類型。

  </Step>

  <Step title="重新啟動並使用">
    ```bash
    openclaw gateway restart
    ```

    對應的功能（技能、Hooks、 MCP 工具）將在下一個工作階段中可用。

  </Step>
</Steps>

## OpenClaw 從套件映射的內容

並非所有的套件功能目前都能在 OpenClaw 中運行。以下是運作正常以及已被偵測但尚未連接的功能。

### 目前支援

| 功能     | 映射方式                                                               | 適用於         |
| -------- | ---------------------------------------------------------------------- | -------------- |
| 技能內容 | 套件技能根目錄會作為一般 OpenClaw 技能載入                             | 所有格式       |
| 指令     | `commands/` 和 `.cursor/commands/` 視為技能根目錄                      | Claude, Cursor |
| 掛鉤套件 | OpenClaw 風格的 `HOOK.md` + `handler.ts` 版面配置                      | Codex          |
| MCP 工具 | 套件 MCP 設定會合併到內嵌 Pi 設定中；支援的 stdio 與 HTTP 伺服器已載入 | 所有格式       |
| 設定     | Claude `settings.json` 會匯入為內嵌 Pi 預設值                          | Claude         |

#### 技能內容

- 套件技能根目錄會像一般 OpenClaw 技能根目錄一樣載入
- Claude `commands` 根目錄會被視為額外的技能根目錄
- Cursor `.cursor/commands` 根目錄會被視為額外的技能根目錄

這意味著 Claude markdown 指令檔案可透過一般的 OpenClaw 技能載入器運作。Cursor 指令 markdown 也透過相同路徑運作。

#### Hook 套件

- 套件 hook 根目錄僅在使用一般 OpenClaw hook-pack
  版面配置時運作。目前這主要是指 Codex 相容的情況：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### 適用於 Pi 的 MCP

- 已啟用的套件可提供 MCP 伺服器設定
- OpenClaw 會將套件 MCP 設定合併至有效的內嵌 Pi 設定中，作為
  `mcpServers`
- OpenClaw 透過啟動 stdio 伺服器或連線至 HTTP 伺服器，在內嵌 Pi agent 回合期間公開支援的套件 MCP 工具
- 專案本機 Pi 設定仍會在套件預設值之後套用，因此工作區
  設定可在需要時覆寫套件 MCP 項目

##### 傳輸方式

MCP 伺服器可使用 stdio 或 HTTP 傳輸方式：

**Stdio** 會啟動子行程：

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

**HTTP** 預設透過 `sse` 連接到正在執行的 MCP 伺服器，或在請求時透過 `streamable-http` 連接：

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

- `transport` 可設定為 `"streamable-http"` 或 `"sse"`；若省略，OpenClaw 會使用 `sse`
- 僅允許 `http:` 和 `https:` URL 配置
- `headers` 值支援 `${ENV_VAR}` 插值
- 同時包含 `command` 和 `url` 的伺服器條目會被拒絕
- URL 憑證 (userinfo 和 query params) 會從工具描述和日誌中刪除
- `connectionTimeoutMs` 會覆寫 stdio 和 HTTP 傳輸預設的 30 秒連線逾時

##### 工具命名

OpenClaw 會以提供者安全的名稱形式註冊套件 MCP 工具，格式為
`serverName__toolName`。例如，一個鍵值為 `"vigil-harbor"` 且暴露
`memory_search` 工具的伺服器會註冊為 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 以外的字元會被替換為 `-`
- 伺服器前綴上限為 30 個字元
- 完整工具名稱上限為 64 個字元
- 空的伺服器名稱會回退為 `mcp`
- 衝突的清理名稱會透過數字後綴進行消歧

#### 嵌入式 Pi 設定

- 當啟用套件時，會將 Claude `settings.json` 匯入為預設的嵌入式 Pi 設定
- OpenClaw 會在應用 shell 覆寫鍵之前將其清理

已清理的鍵：

- `shellPath`
- `shellCommandPrefix`

### 已偵測但未執行

這些項目會被識別並顯示在診斷中，但 OpenClaw 不會執行它們：

- Claude `agents`、`hooks.json` 自動化、`lspServers`、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- 超出能力報告的 Codex 行內/應用程式中繼資料

## 套件格式

<AccordionGroup>
  <Accordion title="Codex 捆綁包">
    標記：`.codex-plugin/plugin.json`

    可選內容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    當 Codex 捆綁包使用技能根目錄和 OpenClaw 風格的 Hook 套件目錄（`HOOK.md` + `handler.ts`）時，最適合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 捆綁包">
    兩種檢測模式：

    - **基於清單：** `.claude-plugin/plugin.json`
    - **無清單：** 預設 Claude 佈局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`settings.json`）

    Claude 特定行為：

    - `commands/` 被視為技能內容
    - `settings.json` 被匯入到嵌入式 Pi 設定中（Shell 覆寫金鑰會被清洗）
    - `.mcp.json` 將受支援的 stdio 工具暴露給嵌入式 Pi
    - `hooks/hooks.json` 會被檢測到但不會執行
    - 清單中的自訂元件路徑是附加性的（它們會擴展預設值，而不是替換它們）

  </Accordion>

  <Accordion title="Cursor 捆綁包">
    標記：`.cursor-plugin/plugin.json`

    可選內容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被視為技能內容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 僅供檢測

  </Accordion>
</AccordionGroup>

## 檢測優先順序

OpenClaw 會先檢查原生外掛格式：

1. `openclaw.plugin.json` 或具有 `openclaw.extensions` 的有效 `package.json` — 視為 **原生外掛**
2. 捆綁包標記（`.codex-plugin/`、`.claude-plugin/` 或預設 Claude/Cursor 佈局）— 視為 **捆綁包**

如果目錄同時包含這兩者，OpenClaw 將使用原生路徑。這可以防止雙格式套件被部分安裝為套件。

## 安全性

套件具有比原生外掛更狹窄的信任邊界：

- OpenClaw **不**會在進程中加載任意的套件運行時模組
- Skills 和 hook-pack 的路徑必須保留在外掛根目錄內（經過邊界檢查）
- 讀取設定檔時會執行相同的邊界檢查
- 支援的 stdio MCP 伺服器可能會作為子進程啟動

這使得套件預設情況下更安全，但對於其實際公開的功能，您仍應將第三方套件視為受信任的內容。

## 疑難排解

<AccordionGroup>
  <Accordion title="套件已偵測到但功能未執行">
    執行 `openclaw plugins inspect <id>`。如果列出了某項功能但標記為
    未連接，那是產品限制 —— 而非安裝損壞。
  </Accordion>

<Accordion title="Claude 指令檔未出現">請確定已啟用該套件，且 markdown 檔案位於偵測到的 `commands/` 或 `skills/` 根目錄中。</Accordion>

<Accordion title="Claude 設定未生效">僅支援來自 `settings.json` 的嵌入式 Pi 設定。OpenClaw 不 會將套件設定視為原始設定檔修補程式。</Accordion>

  <Accordion title="Claude hooks 未執行">
    `hooks/hooks.json` 僅供偵測。如果您需要可執行的 hooks，請使用
    OpenClaw hook-pack 版面配置或提供原生外掛。
  </Accordion>
</AccordionGroup>

## 相關

- [安裝並設定外掛](/en/tools/plugin)
- [建置外掛](/en/plugins/building-plugins) — 建立原生外掛
- [外掛清單](/en/plugins/manifest) — 原生清單架構
