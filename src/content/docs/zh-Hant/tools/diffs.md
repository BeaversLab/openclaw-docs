---
title: "差異"
summary: "供代理使用的唯讀差異檢視器和檔案渲染器（可選的外掛工具）"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# 差異

`diffs` 是一個可選的外掛工具，具有簡短的內建系統指引，以及一個配套技能，可將變更內容轉換為供代理使用的唯讀差異檔案。

它接受：

- `before` 和 `after` 文字
- 統一 `patch`

它可以返回：

- 用於 Canvas 呈現的閘道檢視器 URL
- 用於訊息傳遞的已渲染檔案路徑 (PNG 或 PDF)
- 在一次呼叫中返回這兩種輸出

啟用後，此外掛會將簡明的使用指引前置到系統提示空間中，並公開詳細技能以供需要更完整指示的情況使用。

## 快速入門

1. 啟用外掛。
2. 使用 `mode: "view"` 呼叫 `diffs`，以進行以 Canvas 為優先的流程。
3. 使用 `mode: "file"` 呼叫 `diffs`，以進行聊天檔案傳遞流程。
4. 當您需要這兩種檔案時，使用 `mode: "both"` 呼叫 `diffs`。

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

如果您想保持 `diffs` 工具啟用，但停用其內建的系統提示指引，請將 `plugins.entries.diffs.hooks.allowPromptInjection` 設定為 `false`：

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

這會封鎖差異外掛的 `before_prompt_build` 掛鉤，同時保持外掛、工具和配套技能可用。

如果您想同時停用指引和工具，請改為停用外掛。

## 典型的代理工作流程

1. 代理呼叫 `diffs`。
2. 代理讀取 `details` 欄位。
3. 代理會：
   - 使用 `canvas present` 開啟 `details.viewerUrl`
   - 使用 `path` 或 `filePath` 傳送 `details.filePath`，其中包含 `message`
   - 同時執行這兩項操作

## 輸入範例

修改前後：

```json
{
  "before": "# Hello\n\nOne",
  "after": "# Hello\n\nTwo",
  "path": "docs/example.md",
  "mode": "view"
}
```

修補檔：

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## 工具輸入參考

除非另有註明，否則所有欄位皆為選填：

- `before` (`string`): 原始文字。當省略 `patch` 時，需與 `after` 一併使用。
- `after` (`string`): 更新後的文字。當省略 `patch` 時，需與 `before` 一併使用。
- `patch` (`string`): 統一差異文字。與 `before` 和 `after` 互斥。
- `path` (`string`): 前後模式的顯示檔名。
- `lang` (`string`)：用於前後模式的語言覆寫提示。未知值會回退為純文字。
- `title` (`string`): 檢視器標題覆寫。
- `mode` (`"view" | "file" | "both"`): 輸出模式。預設為外掛程式預設值 `defaults.mode`。
  已棄用的別名：`"image"` 的行為類似於 `"file"`，為向後相容性仍予以接受。
- `theme` (`"light" | "dark"`): 檢視器主題。預設為外掛程式預設值 `defaults.theme`。
- `layout` (`"unified" | "split"`): 差異佈局。預設為外掛程式預設值 `defaults.layout`。
- `expandUnchanged` (`boolean`): 當完整內容可用時，展開未變更的章節。僅限單次呼叫選項 (非外掛程式預設鍵)。
- `fileFormat` (`"png" | "pdf"`): 轉譯的檔案格式。預設為外掛程式預設值 `defaults.fileFormat`。
- `fileQuality` (`"standard" | "hq" | "print"`): PNG 或 PDF 轉譯的品質預設值。
- `fileScale` (`number`): 裝置縮放覆寫 (`1`-`4`)。
- `fileMaxWidth` (`number`): CSS 像素的最大轉譯寬度 (`640`-`2400`)。
- `ttlSeconds` (`number`)：檢視器產物 TTL（以秒為單位）。預設 1800，最大 21600。
- `baseUrl` (`string`)：檢視器 URL 來源覆寫。必須是 `http` 或 `https`，無查詢/雜湊。

驗證與限制：

- `before` 和 `after` 各最大 512 KiB。
- `patch` 最大 2 MiB。
- `path` 最大 2048 位元組。
- `lang` 最大 128 位元組。
- `title` 最大 1024 位元組。
- 修補複雜度上限：最多 128 個檔案和 120,000 行總計。
- `patch` 和 `before` 或 `after` 一併提供會被拒絕。
- 呈現檔案安全性限制（適用於 PNG 和 PDF）：
  - `fileQuality: "standard"`：最大 8 MP（8,000,000 像素）。
  - `fileQuality: "hq"`：最大 14 MP（14,000,000 像素）。
  - `fileQuality: "print"`：最大 24 MP（24,000,000 像素）。
  - PDF 最多 50 頁。

## 輸出詳情合約

工具會在 `details` 下傳回結構化中繼資料。

建立檢視器模式的共用欄位：

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`
- `context` （可用時包含 `agentId`、`sessionId`、`messageChannel`、`agentAccountId`）

呈現 PNG 或 PDF 時的檔案欄位：

- `artifactId`
- `expiresAt`
- `filePath`
- `path` （值與 `filePath` 相同，用於訊息工具相容性）
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行為摘要：

- `mode: "view"`：僅檢視器欄位。
- `mode: "file"`：僅檔案欄位，不包含檢視器產物。
- `mode: "both"`：檢視器欄位加上檔案欄位。如果檔案渲染失敗，檢視器仍會返回 `fileError`。

## 摺疊未變更的區段

- 檢視器可以顯示類似 `N unmodified lines` 的列。
- 這些列上的展開控制項是條件性的，不保證對每種輸入類型都可用。
- 當渲染的差異具有可展開的上下文資料時，會出現展開控制項，這對於前後輸入來說很典型。
- 對於許多統一補丁輸入，省略的上下文內容在解析的補丁區塊中不可用，因此該列可能會出現而沒有展開控制項。這是預期的行為。
- `expandUnchanged` 僅在存在可展開的上下文時套用。

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
  - `false`：對檢視器路由的非回環請求會被拒絕。
  - `true`：如果權杖化路徑有效，則允許遠端檢視器。

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

## 產物生命週期與儲存

- 產物儲存在 temp 子資料夾下：`$TMPDIR/openclaw-diffs`。
- 檢視器產物中繼資料包含：
  - 隨機產物 ID（20 個十六進位字元）
  - 隨機權杖（48 個十六進位字元）
  - `createdAt` 和 `expiresAt`
  - 儲存的 `viewer.html` 路徑
- 若未指定，預設檢視器 TTL 為 30 分鐘。
- 可接受的檢視器 TTL 上限為 6 小時。
- 清理工作會在建立產出後視機執行。
- 過期的產出會被刪除。
- 當中繼資料遺失時，後備清理會移除超過 24 小時的過時資料夾。

## 檢視器 URL 與網路行為

檢視器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

檢視器資產：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

檢視器文件會相對於檢視器 URL 解析這些資產，因此可選的 `baseUrl` 路徑前綴也會保留給這兩個資源請求使用。

URL 建構行為：

- 如果提供了 `baseUrl`，則會在嚴格驗證後使用。
- 如果沒有 `baseUrl`，檢視器 URL 預設為回環 `127.0.0.1`。
- 如果閘道綁定模式是 `custom` 且設定了 `gateway.customBindHost`，則會使用該主機。

`baseUrl` 規則：

- 必須是 `http://` 或 `https://`。
- 查詢和雜湊會被拒絕。
- 允許來源加上可選的基礎路徑。

## 安全模型

檢視器防護加固：

- 預設僅限回環。
- 標記化的檢視器路徑，具有嚴格的 ID 和權杖驗證。
- 檢視器回應 CSP：
  - `default-src 'none'`
  - 腳本和資產僅來源於自身
  - 沒有出站 `connect-src`
- 啟用遠端存取時的遠端失敗限流：
  - 60 秒內 40 次失敗
  - 60 秒鎖定 (`429 Too Many Requests`)

檔案渲染防護加固：

- 擷圖瀏覽器請求路由預設為拒絕。
- 僅允許來自 `http://127.0.0.1/plugins/diffs/assets/*` 的本機檢視器資產。
- 外部網路請求被阻擋。

## 檔案模式的瀏覽器需求

`mode: "file"` 和 `mode: "both"` 需要相容於 Chromium 的瀏覽器。

解析順序：

1. OpenClaw 配置中的 `browser.executablePath`。
2. 環境變數：
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. 平台指令/路徑探索回退。

常見失敗訊息：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

請安裝 Chrome、Chromium、Edge 或 Brave，或是設定上述其中一個可執行檔路徑選項來修正。

## 疑難排解

輸入驗證錯誤：

- `Provide patch or both before and after text.`
  - 請同時包含 `before` 和 `after`，或是提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 請勿混用輸入模式。
- `Invalid baseUrl: ...`
  - 使用 `http(s)` origin 搭配選用路徑，不使用 query/hash。
- `{field} exceeds maximum size (...)`
  - 縮減 payload 大小。
- 大型 patch 拒絕
  - 減少 patch 檔案數量或總行數。

檢視器無障礙問題：

- 檢視器 URL 預設解析為 `127.0.0.1`。
- 對於遠端存取場景，請：
  - 每次工具呼叫傳遞 `baseUrl`，或
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
- 僅當您打算允許外部檢視器存取時，才啟用 `security.allowRemoteViewer`。

未修改行沒有展開按鈕：

- 當 patch 未包含可展開的內容時，patch 輸入可能會發生此情況。
- 這是預期行為，並不表示檢視器故障。

找不到項目：

- 項目因 TTL 過期。
- Token 或路徑已變更。
- 清理已移除過期資料。

## 操作指引

- 在畫布中進行本機互動式審查時，建議使用 `mode: "view"`。
- 對於需要附件的外傳聊天頻道，建議使用 `mode: "file"`。
- 除非您的部署需要遠端檢視器 URL，否則請保持 `allowRemoteViewer` 為停用狀態。
- 針對敏感 diff，請設定明確的短 `ttlSeconds`。
- 若非必要，請避免在 diff 輸入中傳送機密資訊。
- 如果您的頻道會積極壓縮圖片（例如 Telegram 或 WhatsApp），建議使用 PDF 輸出（`fileFormat: "pdf"`）。

Diff 渲染引擎：

- 由 [Diffs](https://diffs.com) 提供支援。

## 相關文件

- [工具總覽](/en/tools)
- [外掛程式](/en/tools/plugin)
- [瀏覽器](/en/tools/browser)
