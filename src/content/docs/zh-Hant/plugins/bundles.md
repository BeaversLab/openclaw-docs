---
summary: "安裝並將 Codex、Claude 和 Cursor 套件作為 OpenClaw 外掛程式使用"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "外掛程式套件"
---

# 外掛程式套件

OpenClaw 可以從三個外部生態系統安裝外掛程式：**Codex**、**Claude** 和 **Cursor**。這些被稱為**套件**（bundles）—— OpenClaw 會將其內容和元資料套件映射到技能、掛鉤和 MCP 工具等原生功能。

<Info>套件與 OpenClaw 原生外掛程式**並不相同**。原生外掛程式在程式內運行，並可註冊任何功能。套件是具有選擇性功能映射和更狹窄信任邊界的內容套件。</Info>

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

    映射的功能（技能、掛鉤、MCP 工具）將在下次會話中可用。

  </Step>
</Steps>

## OpenClaw 從套件映射的內容

並非所有的套件功能目前都能在 OpenClaw 中運行。以下是運作正常以及已被偵測但尚未連接的功能。

### 目前支援

| 功能     | 映射方式                                                                   | 適用於         |
| -------- | -------------------------------------------------------------------------- | -------------- |
| 技能內容 | 套件技能根目錄會作為一般 OpenClaw 技能載入                                 | 所有格式       |
| 指令     | `commands/` 和 `.cursor/commands/` 被視為技能根目錄                        | Claude, Cursor |
| 掛鉤套件 | OpenClaw 風格的 `HOOK.md` + `handler.ts` 佈局                              | Codex          |
| MCP 工具 | 套件 MCP 設定會合併到內嵌 Pi 設定中；受支援的 stdio 伺服器會作為子程序啟動 | 所有格式       |
| 設定     | Claude `settings.json` 會作為內嵌 Pi 預設值匯入                            | Claude         |

### 已偵測但未執行

這些內容會被識別並顯示在診斷資訊中，但 OpenClaw 不會執行它們：

- Claude `agents`、`hooks.json` 自動化、`lspServers`、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 超出能力回報範圍的內聯/應用程式中繼資料

## 套件格式

<AccordionGroup>
  <Accordion title="Codex 套件">
    標記：`.codex-plugin/plugin.json`

    可選內容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    當 Codex 套件使用技能根目錄和 OpenClaw 風格的 hook-pack 目錄時 (`HOOK.md` + `handler.ts`)，最適合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 套件">
    兩種偵測模式：

    - **基於清單：** `.claude-plugin/plugin.json`
    - **無清單：** 預設 Claude 版面配置 (`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`settings.json`)

    Claude 特定行為：

    - `commands/` 被視為技能內容
    - `settings.json` 被匯入到嵌入式 Pi 設定中 (shell 覆寫金鑰會被清理)
    - `.mcp.json` 將受支援的 stdio 工具暴露給嵌入式 Pi
    - `hooks/hooks.json` 會被偵測到但不執行
    - 清單中的自訂元件路徑是累加的 (它們會擴展預設值，而非替換)

  </Accordion>

  <Accordion title="Cursor 套件">
    標記：`.cursor-plugin/plugin.json`

    可選內容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被視為技能內容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 僅供檢測

  </Accordion>
</AccordionGroup>

## 檢測優先順序

OpenClaw 會首先檢查原生外掛程式格式：

1. `openclaw.plugin.json` 或具有 `openclaw.extensions` 的有效 `package.json` — 被視為 **原生外掛程式**
2. 套件標記（`.codex-plugin/`、`.claude-plugin/` 或預設的 Claude/Cursor 佈局）— 被視為 **套件**

如果目錄同時包含這兩者，OpenClaw 將使用原生路徑。這可防止雙格式套件被部分安裝為套件。

## 安全性

套件比原生外掛程式具有更狹窄的信任邊界：

- OpenClaw **不會** 在進程內加載任意套件執行時模組
- 技能和 hook-pack 路徑必須保持在外掛程式根目錄內（經過邊界檢查）
- 設定檔會透過相同的邊界檢查進行讀取
- 受支援的 stdio MCP 伺服器可能會作為子進程啟動

這使得套件預設情況下更安全，但您仍應將第三方套件視為其所公開功能的受信任內容。

## 疑難排解

<AccordionGroup>
  <Accordion title="偵測到套件但功能未執行">
    執行 `openclaw plugins inspect <id>`。如果列出了某項功能但標記為
    未連接 (not wired)，那是產品限制 — 而非安裝失敗。
  </Accordion>

<Accordion title="Claude 指令檔未顯示">請確保已啟用套件，且 markdown 檔案位於偵測到的 `commands/` 或 `skills/` 根目錄內。</Accordion>

<Accordion title="Claude settings do not apply">僅支援來自 `settings.json` 的內嵌 Pi 設定。OpenClaw 不會將打包套件的設定視為原始設定檔補丁。</Accordion>

  <Accordion title="Claude hooks do not execute">
    `hooks/hooks.json` 僅供偵測。如果您需要可執行的 hooks，請使用
    OpenClaw hook-pack 版面配置或發佈原生外掛程式。
  </Accordion>
</AccordionGroup>

## 相關

- [安裝與設定外掛程式](/en/tools/plugin)
- [建置外掛程式](/en/plugins/building-plugins) — 建立原生外掛程式
- [外掛程式清單](/en/plugins/manifest) — 原生清單架構
