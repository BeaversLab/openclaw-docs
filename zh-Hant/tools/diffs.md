---
title: "Diffs"
summary: "專屬於代理的唯讀差異查看器與檔案轉譯器（選用外掛工具）"
description: "使用選用的 Diffs 外掛，將變更前後的文字或統一差異格式轉譯為閘道代管的差異檢視、檔案（PNG 或 PDF），或兩者皆有。"
read_when:
  - 您希望代理以差異形式顯示程式碼或 Markdown 編輯
  - 您需要可放入畫布的檢視器 URL 或轉譯後的差異檔案
  - 您需要具備安全預設值的受控暫時性差異物件
---

# Diffs

`diffs` 是一個選用外掛工具，具有簡短的內建系統指引以及一個伴隨技能，可將變更內容轉換為供代理使用的唯讀差異物件。

它接受：

- `before` 和 `after` 文字
- 統一的 `patch`

它可以傳回：

- 用於畫布呈現的閘道檢視器 URL
- 用於訊息傳遞的轉譯檔案路徑（PNG 或 PDF）
- 在單一呼叫中同時傳回這兩種輸出

啟用後，此外掛會將簡潔的使用指引加到系統提示詞空間的前方，並公開一個詳細技能，以供代理需要更完整指令的情況使用。

## 快速入門

1. 啟用外掛。
2. 針對優先使用畫布的流程，請使用 `mode: "view"` 呼叫 `diffs`。
3. 針對聊天檔案傳遞流程，請使用 `mode: "file"` 呼叫 `diffs`。
4. 當您需要這兩種物件時，請使用 `mode: "both"` 呼叫 `diffs`。

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

如果您想保持 `diffs` 工具啟用但停用其內建系統提示詞指引，請將 `plugins.entries.diffs.hooks.allowPromptInjection` 設為 `false`：

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

這會封鎖 diffs 外掛的 `before_prompt_build` 掛鉤，同時保持外掛、工具和伴隨技能可用。

如果您想同時停用指引和工具，請改為停用外掛。

## 典型代理工作流程

1. 代理呼叫 `diffs`。
2. 代理讀取 `details` 欄位。
3. 代理可以：
   - 使用 `canvas present` 開啟 `details.viewerUrl`
   - 使用 `path` 或 `filePath` 傳送包含 `message` 的 `details.filePath`
   - 兩者皆做

## 輸入範例

修改前與修改後：

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

除非另有說明，否則所有欄位皆為選填：

- `before` (`string`): 原始文字。當省略 `patch` 時，需與 `after` 搭配使用。
- `after` (`string`): 更新後的文字。當省略 `patch` 時，需與 `before` 搭配使用。
- `patch` (`string`): 統一差異文字。與 `before` 和 `after` 互斥。
- `path` (`string`): 修改前與修改後模式的顯示檔名。
- `lang` (`string`): 修改前與修改後模式的語言覆寫提示。
- `title` (`string`): 檢視器標題覆寫。
- `mode` (`"view" | "file" | "both"`): 輸出模式。預設為外掛預設值 `defaults.mode`。
- `theme` (`"light" | "dark"`): 檢視器主題。預設為外掛預設值 `defaults.theme`。
- `layout` (`"unified" | "split"`): 差異版面配置。預設為外掛預設值 `defaults.layout`。
- `expandUnchanged` (`boolean`): 當完整內容可用時展開未變更的區段。僅限單次呼叫選項 (非外掛預設金鑰)。
- `fileFormat` (`"png" | "pdf"`): 轉譯的檔案格式。預設為外掛預設值 `defaults.fileFormat`。
- `fileQuality` (`"standard" | "hq" | "print"`): PNG 或 PDF 轉譯的品質預設值。
- `fileScale` (`number`): 裝置縮放覆寫 (`1`-`4`)。
- `fileMaxWidth` (`number`): CSS 像素的最大轉譯寬度 (`640`-`2400`)。
- `ttlSeconds` (`number`): 檢視器產物 TTL（以秒為單位）。預設值為 1800，最大值為 21600。
- `baseUrl` (`string`): 檢視器 URL 來源覆寫。必須是 `http` 或 `https`，不可包含查詢/雜湊。

驗證與限制：

- `before` 和 `after` 各自最大 512 KiB。
- `patch` 最大 2 MiB。
- `path` 最大 2048 位元組。
- `lang` 最大 128 位元組。
- `title` 最大 1024 位元組。
- 修補程式複雜度上限：最多 128 個檔案和 120,000 行總計。
- `patch` 與 `before` 或 `after` 同時存在會被拒絕。
- 算繪檔案安全限制（適用於 PNG 和 PDF）：
  - `fileQuality: "standard"`: 最大 8 MP (8,000,000 像素)。
  - `fileQuality: "hq"`: 最大 14 MP (14,000,000 像素)。
  - `fileQuality: "print"`: 最大 24 MP (24,000,000 像素)。
  - PDF 也最多 50 頁。

## 輸出細項合約

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

算繪 PNG 或 PDF 時的檔案欄位：

- `filePath`
- `path` (與 `filePath` 的值相同，以與訊息工具相容)
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行為摘要：

- `mode: "view"`: 僅含檢視器欄位。
- `mode: "file"`: 僅含檔案欄位，無檢視器產物。
- `mode: "both"`: 檢視器欄位加上檔案欄位。如果檔案算繪失敗，檢視器仍會傳回並帶有 `fileError`。

## 已折疊未變更區段

- 檢視器可以顯示像 `N unmodified lines` 這樣的行。
- 這些行上的展開控制項是附屬條件，並不保證適用於每種輸入類型。
- 當渲染的 diff 具有可展開的上下文資料時，會出現展開控制項，這在「之前」和「之後」輸入中很常見。
- 對於許多統一補丁輸入，解析的補丁區塊中無法使用省略的上下文內容，因此該行可能會在沒有展開控制項的情況下出現。這是預期的行為。
- `expandUnchanged` 僅在存在可展開的上下文時適用。

## 外掛程式預設值

在 `~/.openclaw/openclaw.json` 中設定整個外掛程式的預設值：

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

## 安全設定

- `security.allowRemoteViewer` (`boolean`，預設為 `false`)
  - `false`：拒絕對檢視器路由的非回送請求。
  - `true`：如果標記化的路徑有效，則允許遠端檢視器。

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

## 成品生命週期與儲存

- 成品儲存在 temp 子資料夾下：`$TMPDIR/openclaw-diffs`。
- 檢視器成品元資料包含：
  - 隨機成品 ID（20 個十六進位字元）
  - 隨機權杖（48 個十六進位字元）
  - `createdAt` 和 `expiresAt`
  - 已儲存的 `viewer.html` 路徑
- 若未指定，預設的檢視器 TTL 為 30 分鐘。
- 接受的最大檢視器 TTL 為 6 小時。
- 清理作業會在建立成品後視機會執行。
- 過期的成品會被刪除。
- 當元資料遺失時，後援清理會移除超過 24 小時的過時資料夾。

## 檢視器 URL 與網路行為

檢視器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

檢視器資產：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

URL 建構行為：

- 如果提供了 `baseUrl`，則會在經過嚴格驗證後使用。
- 若無 `baseUrl`，檢視器 URL 預設為 loopback `127.0.0.1`。
- 如果 gateway bind mode 為 `custom` 且設定了 `gateway.customBindHost`，則使用該主機。

`baseUrl` 規則：

- 必須為 `http://` 或 `https://`。
- 查詢和雜湊會被拒絕。
- 允許 origin 加上可選的 base path。

## 安全模型

檢視器防護強化：

- 預設僅限 loopback。
- 對於使用記號的檢視器路徑，會嚴格驗證 ID 和 token。
- 檢視器回應 CSP：
  - `default-src 'none'`
  - 腳本和資源僅來自 self
  - 無 `connect-src` 連出
- 啟用遠端存取時的遠端失敗限流：
  - 60 秒內 40 次失敗
  - 60 秒鎖定 (`429 Too Many Requests`)

檔案渲染防護強化：

- 擷圖瀏覽器要求路由預設為拒絕。
- 僅允許來自 `http://127.0.0.1/plugins/diffs/assets/*` 的本機檢視器資源。
- 外部網路要求會被阻擋。

## 檔案模式的瀏覽器需求

`mode: "file"` 和 `mode: "both"` 需要 Chromium 相容的瀏覽器。

解析順序：

1. OpenClaw 設定中的 `browser.executablePath`。
2. 環境變數：
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. 平台指令/路徑探索後備機制。

常見失敗文字：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

請安裝 Chrome、Chromium、Edge 或 Brave，或是設定上述其中一個可執行檔路徑選項來解決此問題。

## 疑難排解

輸入驗證錯誤：

- `Provide patch or both before and after text.`
  - 請同時包含 `before` 和 `after`，或是提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 請勿混合輸入模式。
- `Invalid baseUrl: ...`
  - 請使用 `http(s)` origin 搭配可選路徑，不含查詢/雜湊。
- `{field} exceeds maximum size (...)`
  - 請減少 payload 大小。
- 大型修補程式拒絕
  - 減少修補檔數量或總行數。

檢視器無障礙問題：

- 檢視器 URL 預設解析為 `127.0.0.1`。
- 對於遠端存取場景，您可以：
  - 在每次工具呼叫時傳遞 `baseUrl`，或
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
- 僅在您打算讓外部檢視器存取時啟用 `security.allowRemoteViewer`。

未修改行沒有展開按鈕：

- 當修補輸入不包含可展開內容時，可能會發生這種情況。
- 這是預期的行為，並不代表檢視器失敗。

找不到成品：

- 成品因 TTL 過期。
- Token 或路徑已變更。
- 清理作業已移除過時資料。

## 操作指引

- 對於畫布中的本機互動式審查，建議優先使用 `mode: "view"`。
- 對於需要附件的外向聊天頻道，建議優先使用 `mode: "file"`。
- 除非您的部署需要遠端檢視器 URL，否則請保持 `allowRemoteViewer` 停用。
- 為敏感的差異設定明確的短 `ttlSeconds`。
- 避免在差異輸入中傳送不必要的機密資訊。
- 如果您的頻道會大幅壓縮圖片（例如 Telegram 或 WhatsApp），建議優先使用 PDF 輸出 (`fileFormat: "pdf"`)。

差異渲染引擎：

- 由 [Diffs](https://diffs.com) 提供支援。

## 相關文件

- [工具概覽](/zh-Hant/tools)
- [外掛程式](/zh-Hant/tools/plugin)
- [瀏覽器](/zh-Hant/tools/browser)

import en from "/components/footer/en.mdx";

<en />
