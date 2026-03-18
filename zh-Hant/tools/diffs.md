---
title: "Diffs"
summary: "適用於代理程式的唯讀差異檢視器和檔案轉譯程式（選用外掛工具）"
description: "使用選用的 Diffs 外掛，將前後文字或統一補丁轉譯為閘道託管的差異檢視、檔案（PNG 或 PDF），或兩者。"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# Diffs

`diffs` 是一個選用外掛工具，具有簡短的內建系統指引，以及一個配套技能，可將變更內容轉換為適用於代理程式的唯讀差異工件。

它接受：

- `before` 和 `after` 文字
- 統一 `patch`

它可以返回：

- 用於畫布呈現的閘道檢視器 URL
- 用於訊息傳遞的轉譯檔案路徑（PNG 或 PDF）
- 單次呼叫中同時返回兩種輸出

啟用後，此外掛會將簡明的使用指引新增至系統提示空間，並公開詳細的技能，以供代理程式需要更完整指令時使用。

## 快速入門

1. 啟用外掛。
2. 呼叫 `diffs` 並設定 `mode: "view"`，用於畫布優先的流程。
3. 呼叫 `diffs` 並設定 `mode: "file"`，用於聊天檔案傳遞流程。
4. 呼叫 `diffs` 並設定 `mode: "both"`，當您同時需要這兩種工件時。

## 啟用外掛

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
      },
    },
  },
}
```

## 停用內建系統指引

如果您想保持 `diffs` 工具啟用但停用其內建的系統提示指引，請將 `plugins.entries.diffs.hooks.allowPromptInjection` 設定為 `false`：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
      },
    },
  },
}
```

這會阻擋 diffs 外掛的 `before_prompt_build` 掛鉤，同時保持外掛、工具和配套技能可供使用。

如果您想同時停用指引和工具，請改為停用外掛。

## 典型的代理程式工作流程

1. 代理程式呼叫 `diffs`。
2. 代理程式讀取 `details` 欄位。
3. 代理程式執行以下其中一項：
   - 使用 `canvas present` 開啟 `details.viewerUrl`
   - 使用 `path` 或 `filePath` 傳送帶有 `message` 的 `details.filePath`
   - 兩者都做

## 輸入範例

變更前與變更後：

```json
{
  "before": "# Hello\n\nOne",
  "after": "# Hello\n\nTwo",
  "path": "docs/example.md",
  "mode": "view"
}
```

補丁：

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## 工具輸入參考

除非另有註明，所有欄位皆為選用：

- `before` (`string`): 原始文字。當省略 `patch` 時，與 `after` 搭配使用為必填。
- `after` (`string`): 更新後的文字。當省略 `patch` 時，與 `before` 搭配使用為必填。
- `patch` (`string`): 統一差異文字。與 `before` 和 `after` 互斥。
- `path` (`string`): 前後模式顯示的檔案名稱。
- `lang` (`string`): 前後模式的語言覆寫提示。
- `title` (`string`): 檢視器標題覆寫。
- `mode` (`"view" | "file" | "both"`): 輸出模式。預設為外掛預設值 `defaults.mode`。
- `theme` (`"light" | "dark"`): 檢視器主題。預設為外掛預設值 `defaults.theme`。
- `layout` (`"unified" | "split"`): 差異版面配置。預設為外掛預設值 `defaults.layout`。
- `expandUnchanged` (`boolean`): 當完整語境可用時展開未變更的區段。僅限單次呼叫選項 (非外掛預設金鑰)。
- `fileFormat` (`"png" | "pdf"`): 轉譯檔案格式。預設為外掛預設值 `defaults.fileFormat`。
- `fileQuality` (`"standard" | "hq" | "print"`): PNG 或 PDF 轉譯的品質預設值。
- `fileScale` (`number`): 裝置縮放覆寫 (`1`-`4`)。
- `fileMaxWidth` (`number`): CSS 像素的最大轉譯寬度 (`640`-`2400`)。
- `ttlSeconds` (`number`)：檢視器工件的 TTL（以秒為單位）。預設為 1800，最大值為 21600。
- `baseUrl` (`string`)：檢視器 URL 來源覆寫。必須是 `http` 或 `https`，不得包含查詢/雜湊。

驗證與限制：

- `before` 和 `after` 每個大小上限皆為 512 KiB。
- `patch` 大小上限為 2 MiB。
- `path` 上限為 2048 位元組。
- `lang` 上限為 128 位元組。
- `title` 上限為 1024 位元組。
- 修補檔複雜度上限：最多 128 個檔案和總計 120,000 行。
- 同時提供 `patch` 以及 `before` 或 `after` 將會被拒絕。
- 轉譯檔案的安全限制（適用於 PNG 和 PDF）：
  - `fileQuality: "standard"`：上限 8 MP（8,000,000 個轉譯像素）。
  - `fileQuality: "hq"`：上限 14 MP（14,000,000 個轉譯像素）。
  - `fileQuality: "print"`：上限 24 MP（24,000,000 個轉譯像素）。
  - PDF 也最多 50 頁。

## 輸出細節合約

此工具會在 `details` 下傳回結構化的中繼資料。

建立檢視器之模式的共用欄位：

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`

轉譯 PNG 或 PDF 時的檔案欄位：

- `filePath`
- `path`（與 `filePath` 的值相同，用於訊息工具相容性）
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行為摘要：

- `mode: "view"`：僅檢視器欄位。
- `mode: "file"`：僅檔案欄位，無檢視器工件。
- `mode: "both"`：檢視器欄位加上檔案欄位。如果檔案轉譯失敗，檢視器仍會傳回並附帶 `fileError`。

## 折疊未變更的區段

- 檢視器可以顯示像 `N unmodified lines` 這樣的行。
- 這些行上的展開控制項是條件式的，並不保證對每種輸入類型都適用。
- 當渲染的差異具有可展開的上下文資料時，會出現展開控制項，這在輸入內容前後對比時很常見。
- 對於許多統一的補丁輸入，解析出的補丁區塊中沒有省略的上下文主體，因此該行可能不會出現展開控制項。這是預期的行為。
- `expandUnchanged` 僅在存在可展開上下文時適用。

## 外掛程式預設值

在 `~/.openclaw/openclaw.json` 中設定外掛程式範圍的預設值：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          defaults: {
            fontFamily: "Fira Code",
            fontSize: 15,
            lineSpacing: 1.6,
            layout: "unified",
            showLineNumbers: true,
            diffIndicators: "bars",
            wordWrap: true,
            background: true,
            theme: "dark",
            fileFormat: "png",
            fileQuality: "standard",
            fileScale: 2,
            fileMaxWidth: 960,
            mode: "both",
          },
        },
      },
    },
  },
}
```

支援的預設值：

- `fontFamily`
- `fontSize`
- `lineSpacing`
- `layout`
- `showLineNumbers`
- `diffIndicators`
- `wordWrap`
- `background`
- `theme`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`
- `mode`

明確的工具參數會覆寫這些預設值。

## 安全性設定

- `security.allowRemoteViewer` (`boolean`，預設值 `false`)
  - `false`：拒絕對檢視器路由的非回送請求。
  - `true`：如果記號化路徑有效，則允許遠端檢視器。

範例：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          security: {
            allowRemoteViewer: false,
          },
        },
      },
    },
  },
}
```

## 成果生命週期與儲存

- 成果儲存在 temp 子資料夾下：`$TMPDIR/openclaw-diffs`。
- 檢視器成果元資料包含：
  - 隨機成果 ID（20 個十六進位字元）
  - 隨機記號（48 個十六進位字元）
  - `createdAt` 和 `expiresAt`
  - 儲存的 `viewer.html` 路徑
- 若未指定，預設的檢視器 TTL 為 30 分鐘。
- 可接受的檢視器 TTL 上限為 6 小時。
- 清理作業會在建立成果後視機會執行。
- 過期的成果會被刪除。
- 當元資料遺失時，後備清理會移除超過 24 小時的過時資料夾。

## 檢視器 URL 與網路行為

檢視器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

檢視器資產：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

URL 建構行為：

- 如果提供了 `baseUrl`，則在嚴格驗證後使用它。
- 如果沒有 `baseUrl`，檢視器 URL 預設為 loopback `127.0.0.1`。
- 如果閘道綁定模式為 `custom` 且設定了 `gateway.customBindHost`，則使用該主機。

`baseUrl` 規則：

- 必須是 `http://` 或 `https://`。
- 會拒絕 query 和 hash。
- 允許 origin 加上可選的 base path。

## 安全模型

檢視器防護硬化：

- 預設僅限 loopback。
- 具備嚴格 ID 和 token 驗證的權杖化檢視器路徑。
- 檢視器回應 CSP：
  - `default-src 'none'`
  - scripts 和資產僅來自 self
  - 無 outbound `connect-src`
- 啟用遠端存取時的遠端遺漏限流：
  - 60 秒內 40 次失敗
  - 60 秒鎖定 (`429 Too Many Requests`)

檔案渲染防護硬化：

- 截圖瀏覽器請求路由預設為拒絕。
- 僅允許來自 `http://127.0.0.1/plugins/diffs/assets/*` 的本機檢視器資產。
- 外部網路請求會被封鎖。

## 檔案模式的瀏覽器需求

`mode: "file"` 和 `mode: "both"` 需要相容 Chromium 的瀏覽器。

解析順序：

1. OpenClaw 設定中的 `browser.executablePath`。
2. 環境變數：
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. 平台指令/路徑探索後備機制。

常見失敗訊息：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

請安裝 Chrome、Chromium、Edge 或 Brave 來修正，或設定上述其中一個可執行檔路徑選項。

## 疑難排解

輸入驗證錯誤：

- `Provide patch or both before and after text.`
  - 請同時包含 `before` 和 `after`，或提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 請勿混用輸入模式。
- `Invalid baseUrl: ...`
  - 請使用 `http(s)` origin 加上可選路徑，不得包含 query/hash。
- `{field} exceeds maximum size (...)`
  - 請減少 payload 大小。
- 大型 patch 拒絕
  - 請減少 patch 檔案數量或總行數。

檢視器無法存取的問題：

- 檢視器 URL 預設會解析為 `127.0.0.1`。
- 針對遠端存取場景，請：
  - 每次工具呼叫都傳遞 `baseUrl`，或
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
- 僅在您打算讓外部檢視器存取時啟用 `security.allowRemoteViewer`。

未修改行沒有展開按鈕：

- 當修補輸入不包含可展開的內容時，可能會發生這種情況。
- 這是預期行為，並不代表檢視器發生故障。

找不到成品：

- 成品因 TTL 過期。
- 權杖或路徑已變更。
- 清理程序移除了過時資料。

## 操作指引

- 針對畫布中的本機互動式審查，建議優先使用 `mode: "view"`。
- 針對需要附件的外部聊天頻道，建議優先使用 `mode: "file"`。
- 除非您的部署需要遠端檢視器 URL，否則請將 `allowRemoteViewer` 保持停用狀態。
- 針對敏感的差異，請設定明確的短 `ttlSeconds`。
- 若非必要，請避免在差異輸入中傳送祕密。
- 如果您的頻道會大幅壓縮影像（例如 Telegram 或 WhatsApp），建議使用 PDF 輸出（`fileFormat: "pdf"`）。

差異渲染引擎：

- 由 [Diffs](https://diffs.com) 提供技術支援。

## 相關文件

- [工具總覽](/zh-Hant/tools)
- [外掛程式](/zh-Hant/tools/plugin)
- [瀏覽器](/zh-Hant/tools/browser)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
