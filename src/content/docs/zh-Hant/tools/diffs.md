---
title: "Diffs"
summary: "專供代理程式使用的唯讀差異檢視器與檔案轉譯器（選用外掛程式工具）"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# Diffs

`diffs` 是一個選用外掛程式工具，具備簡短的內建系統指引，以及一個伴隨技能，可將變更內容轉換為供代理程式使用的唯讀差異產出。

它接受：

- `before` 和 `after` 文字
- 一個統一的 `patch`

它可以回傳：

- 用於畫布呈現的閘道檢視器 URL
- 用於訊息傳遞的轉譯檔案路徑（PNG 或 PDF）
- 在一次呼叫中回傳這兩種輸出

啟用後，此外掛程式會將簡潔的使用指引加到系統提示詞空間的開頭，並提供一項詳細技能，供代理程式需要更完整指示時使用。

## 快速入門

1. 啟用外掛程式。
2. 呼叫 `diffs` 並使用 `mode: "view"` 以進行優先使用畫布的工作流程。
3. 呼叫 `diffs` 並使用 `mode: "file"` 以進行傳遞聊天檔案的工作流程。
4. 當您需要這兩種產出時，呼叫 `diffs` 並使用 `mode: "both"`。

## 啟用外掛程式

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

如果您想讓 `diffs` 工具保持啟用，但停用其內建的系統提示詞指引，請將 `plugins.entries.diffs.hooks.allowPromptInjection` 設為 `false`：

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

這會封鎖差異外掛程式的 `before_prompt_build` 掛勾，同時保持外掛程式、工具和伴隨技能可用。

如果您想同時停用指引和工具，請改為停用外掛程式。

## 典型代理程式工作流程

1. 代理程式呼叫 `diffs`。
2. 代理程式讀取 `details` 欄位。
3. 代理程式會：
   - 使用 `canvas present` 開啟 `details.viewerUrl`
   - 使用 `path` 或 `filePath` 傳送帶有 `message` 的 `details.filePath`
   - 兩者都做

## 輸入範例

Before and after:

```json
{
  "before": "# Hello\n\nOne",
  "after": "# Hello\n\nTwo",
  "path": "docs/example.md",
  "mode": "view"
}
```

Patch:

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## 工具輸入參考

除非另有註明，所有欄位皆為選用：

- `before` (`string`): 原始文字。當省略 `patch` 時，與 `after` 一起為必填。
- `after` (`string`): 更新後的文字。當省略 `patch` 時，與 `before` 一起為必填。
- `patch` (`string`): 統一差異文字。與 `before` 和 `after` 互斥。
- `path` (`string`): 修改前後模式的顯示檔名。
- `lang` (`string`): 修改前後模式的語言覆寫提示。
- `title` (`string`): 檢視器標題覆寫。
- `mode` (`"view" | "file" | "both"`): 輸出模式。預設為外掛預設值 `defaults.mode`。
  已棄用的別名：`"image"` 的行為類似 `"file"`，為向後相容性仍可接受。
- `theme` (`"light" | "dark"`): 檢視器主題。預設為外掛預設值 `defaults.theme`。
- `layout` (`"unified" | "split"`): 差異佈局。預設為外掛預設值 `defaults.layout`。
- `expandUnchanged` (`boolean`): 當提供完整上下文時展開未變更的部分。僅限單次呼叫選項（非外掛預設金鑰）。
- `fileFormat` (`"png" | "pdf"`): 轉譯的檔案格式。預設為外掛預設值 `defaults.fileFormat`。
- `fileQuality` (`"standard" | "hq" | "print"`): PNG 或 PDF 轉譯的品質預設值。
- `fileScale` (`number`): 裝置縮放比例覆寫 (`1`-`4`)。
- `fileMaxWidth` (`number`): CSS 像素的最大轉譯寬度 (`640`-`2400`)。
- `ttlSeconds` (`number`)：檢視器產物 TTL（以秒為單位）。預設 1800，最大 21600。
- `baseUrl` (`string`)：檢視器 URL 來源覆寫。必須為 `http` 或 `https`，無查詢/雜湊。

驗證與限制：

- `before` 和 `after` 各自最大 512 KiB。
- `patch` 最大 2 MiB。
- `path` 最大 2048 位元組。
- `lang` 最大 128 位元組。
- `title` 最大 1024 位元組。
- 修補程式複雜度上限：最多 128 個檔案和 120,000 行總行數。
- `patch` 與 `before` 或 `after` 同時使用會被拒絕。
- 呈現檔案安全限制（適用於 PNG 和 PDF）：
  - `fileQuality: "standard"`：最大 8 MP（8,000,000 像素）。
  - `fileQuality: "hq"`：最大 14 MP（14,000,000 像素）。
  - `fileQuality: "print"`：最大 24 MP（24,000,000 像素）。
  - PDF 也限制最多 50 頁。

## 輸出詳情契約

此工具會在 `details` 下傳回結構化中繼資料。

建立檢視器之模式的共用欄位：

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`
- `context` (`agentId`, `sessionId`, `messageChannel`, `agentAccountId` 當可用時)

呈現 PNG 或 PDF 時的檔案欄位：

- `artifactId`
- `expiresAt`
- `filePath`
- `path` (與 `filePath` 值相同，以相容訊息工具)
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行為摘要：

- `mode: "view"`：僅檢視器欄位。
- `mode: "file"`：僅檔案欄位，無檢視器產物。
- `mode: "both"`：檢視器欄位加檔案欄位。如果檔案轉換失敗，檢視器仍會傳回並帶有 `fileError`。

## 收合未變更區段

- 檢視器可以顯示如 `N unmodified lines` 的行。
- 這些行上的展開控制項是有條件的，並不保證每種輸入類型都有。
- 當轉換後的 diff 具有可展開的內容資料時，會出現展開控制項，這對於輸入前後的內容來說很典型。
- 對於許多統一補丁輸入，省略的內容主體在解析後的補丁區塊中不可用，因此該行可能會在沒有展開控制項的情況下顯示。這是預期的行為。
- `expandUnchanged` 僅在存在可展開內容時套用。

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

- `security.allowRemoteViewer` (`boolean`，預設值為 `false`)
  - `false`：對檢視器路由的非回環請求會被拒絕。
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

## 產物生命週期與儲存

- 產物儲存在 temp 子資料夾下：`$TMPDIR/openclaw-diffs`。
- 檢視器產物中繼資料包含：
  - 隨機產物 ID（20 個十六進位字元）
  - 隨機記號（48 個十六進位字元）
  - `createdAt` 和 `expiresAt`
  - 儲存的 `viewer.html` 路徑
- 若未指定，預設檢視器 TTL 為 30 分鐘。
- 接受的最大檢視器 TTL 為 6 小時。
- 清理作業會在建立構件後在適當時機執行。
- 過期的構件會被刪除。
- 當中繼資料缺失時，後備清理會移除超過 24 小時的過時資料夾。

## 檢視器 URL 和網路行為

檢視器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

檢視器資源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

URL 建構行為：

- 如果提供了 `baseUrl`，則會在嚴格驗證後使用它。
- 若未提供 `baseUrl`，檢視器 URL 預設為本地回環 `127.0.0.1`。
- 如果閘道綁定模式是 `custom` 且設定了 `gateway.customBindHost`，則會使用該主機。

`baseUrl` 規則：

- 必須是 `http://` 或 `https://`。
- 會拒絕查詢字串和雜湊。
- 允許來源加上可選的基底路徑。

## 安全模型

檢視器防護強化：

- 預設僅限本地回環。
- 使用記號化的檢視器路徑，並進行嚴格的 ID 和記號驗證。
- 檢視器回應 CSP：
  - `default-src 'none'`
  - 指令碼和資源僅能來自自身
  - 無對外 `connect-src`
- 啟用遠端存取時的遠端未命中節流：
  - 60 秒內 40 次失敗
  - 60 秒鎖定 (`429 Too Many Requests`)

檔案渲染防護強化：

- 螢幕截圖瀏覽器請求路由預設為拒絕。
- 僅允許來自 `http://127.0.0.1/plugins/diffs/assets/*` 的本機檢視器資源。
- 外部網路請求會被封鎖。

## 檔案模式的瀏覽器需求

`mode: "file"` 和 `mode: "both"` 需要相容於 Chromium 的瀏覽器。

解析順序：

1. OpenClaw 設定中的 `browser.executablePath`。
2. 環境變數：
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. 平台指令/路徑探索後備機制。

常見失敗訊息：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

請安裝 Chrome、Chromium、Edge 或 Brave，或設定上述其中一個可執行檔路徑選項來修正問題。

## 疑難排解

輸入驗證錯誤：

- `Provide patch or both before and after text.`
  - 同時包含 `before` 和 `after`，或提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 請勿混合輸入模式。
- `Invalid baseUrl: ...`
  - 使用帶有可選路徑的 `http(s)` 來源，不包含查詢/雜湊。
- `{field} exceeds maximum size (...)`
  - 減少負載大小。
- 大型修補程式遭拒絕
  - 減少修補檔案數量或總行數。

檢視器無障礙問題：

- 檢視器 URL 預設解析為 `127.0.0.1`。
- 對於遠端存取場景，請執行下列其中一項：
  - 每次工具呼叫傳遞 `baseUrl`，或
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
- 僅在您打算讓外部檢視器存取時啟用 `security.allowRemoteViewer`。

未修改行沒有展開按鈕：

- 當修補程式不包含可展開的內容時，輸入修補程式可能會發生這種情況。
- 這是預期的行為，並不表示檢視器發生故障。

找不到構件：

- 構件因 TTL 過期。
- 權杖或路徑已變更。
- 清理已移除過時資料。

## 操作指引

- 對於畫布中的本機互動式審閱，請優先使用 `mode: "view"`。
- 對於需要附件的外向聊天頻道，請優先使用 `mode: "file"`。
- 除非您的部署需要遠端檢視器 URL，否則請保持 `allowRemoteViewer` 停用。
- 為敏感的差異設定明確的短 `ttlSeconds`。
- 在不需要時，請避免在差異輸入中傳送秘密。
- 如果您的頻道會大幅壓縮圖片（例如 Telegram 或 WhatsApp），請優先使用 PDF 輸出 (`fileFormat: "pdf"`)。

差異渲染引擎：

- 由 [Diffs](https://diffs.com) 提供技術支援。

## 相關文件

- [工具概覽](/zh-Hant/tools)
- [外掛程式](/zh-Hant/tools/plugin)
- [瀏覽器](/zh-Hant/tools/browser)
