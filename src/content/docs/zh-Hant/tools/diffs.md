---
summary: "專供 Agent 使用的唯讀差異檢視器與檔案轉譯器（選用性外掛工具）"
title: "差異"
sidebarTitle: "差異"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

`diffs` 是一個選用性的外掛工具，具備簡短的內建系統引導以及一個配套技能，可將變更內容轉換為供 Agent 使用的唯讀差異檔案。

它接受：

- `before` 和 `after` 文字
- 統一 `patch`

它可以返回：

- 用於 Canvas 呈現的閘道檢視器 URL
- 用於訊息傳遞的已渲染檔案路徑 (PNG 或 PDF)
- 在一次呼叫中返回這兩種輸出

啟用後，此外掛會將簡明的使用指引前置到系統提示空間中，並公開詳細技能以供需要更完整指示的情況使用。

## 快速入門

<Steps>
  <Step title="安裝外掛">
    ```bash
    openclaw plugins install diffs
    ```
  </Step>
  <Step title="啟用外掛">
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
  </Step>
  <Step title="選擇模式">
    <Tabs>
      <Tab title="view">
        畫布優先流程：Agent 呼叫帶有 `mode: "view"` 的 `diffs`，並使用 `canvas present` 開啟 `details.viewerUrl`。
      </Tab>
      <Tab title="file">
        聊天檔案傳遞：Agent 呼叫帶有 `mode: "file"` 的 `diffs`，並使用 `path` 或 `filePath` 傳送帶有 `message` 的 `details.filePath`。
      </Tab>
      <Tab title="both">
        結合：Agent 呼叫帶有 `mode: "both"` 的 `diffs`，在一次呼叫中取得兩種檔案。
      </Tab>
    </Tabs>
  </Step>
</Steps>

## 停用內建系統指引

如果您想保持啟用 `diffs` 工具，但停用其內建的系統提示詞引導，請將 `plugins.entries.diffs.hooks.allowPromptInjection` 設定為 `false`：

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

這會阻擋差異外掛的 `before_prompt_build` 掛鉤，同時保持外掛、工具和配套技能可用。

如果您想同時停用指引和工具，請改為停用外掛程式。

## 典型代理工作流程

<Steps>
  <Step title="呼叫差異">Agent 帶有輸入內容呼叫 `diffs` 工具。</Step>
  <Step title="讀取詳細資訊">Agent 從回應中讀取 `details` 欄位。</Step>
  <Step title="呈現">Agent 開啟 `details.viewerUrl` 並搭配 `canvas present`，使用 `path` 或 `filePath` 傳送帶有 `message` 的 `details.filePath`，或者兩者都做。</Step>
</Steps>

## 輸入範例

<Tabs>
  <Tab title="變更前後">
    ```json
    {
      "before": "# Hello\n\nOne",
      "after": "# Hello\n\nTwo",
      "path": "docs/example.md",
      "mode": "view"
    }
    ```
  </Tab>
  <Tab title="修補檔">
    ```json
    {
      "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
      "mode": "both"
    }
    ```
  </Tab>
</Tabs>

## 工具輸入參考

除非另有註記，否則所有欄位皆為選填。

<ParamField path="before" type="string">
  原始文字。當省略 `patch` 時，若使用 `after` 則為必填。
</ParamField>
<ParamField path="after" type="string">
  更新後的文字。當省略 `patch` 時，若使用 `before` 則為必填。
</ParamField>
<ParamField path="patch" type="string">
  統一差異文字。與 `before` 和 `after` 互斥。
</ParamField>
<ParamField path="path" type="string">
  前後對比模式的顯示檔名。
</ParamField>
<ParamField path="lang" type="string">
  前後對比模式的語言覆寫提示。未知值將回退為純文字。
</ParamField>
<ParamField path="title" type="string">
  檢視器標題覆寫。
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  輸出模式。預設為外掛預設值 `defaults.mode`。已棄用的別名：`"image"` 的行為類似 `"file"`，為了向後相容性仍被接受。
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  檢視器主題。預設為外掛預設值 `defaults.theme`。
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  差異佈局。預設為外掛預設值 `defaults.layout`。
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  當完整內容可用時展開未變更的部分。僅限單次呼叫選項（非外掛預設金鑰）。
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  轉譯的檔案格式。預設為外掛預設值 `defaults.fileFormat`。
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  PNG 或 PDF 轉譯的品質預設值。
</ParamField>
<ParamField path="fileScale" type="number">
  裝置縮放覆寫 (`1`-`4`)。
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  CSS 像素的最大轉譯寬度 (`640`-`2400`)。
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  檢視器和獨立檔案輸出的成品 TTL（秒數）。最大值 21600。
</ParamField>
<ParamField path="baseUrl" type="string">
  檢視器 URL 來源覆寫。覆寫外掛 `viewerBaseUrl`。必須是 `http` 或 `https`，不可包含查詢/雜湊。
</ParamField>

<AccordionGroup>
  <Accordion title="舊版輸入別名">
    為向後相容性仍接受：

    - `format` -> `fileFormat`
    - `imageFormat` -> `fileFormat`
    - `imageQuality` -> `fileQuality`
    - `imageScale` -> `fileScale`
    - `imageMaxWidth` -> `fileMaxWidth`

  </Accordion>
  <Accordion title="驗證與限制">
    - `before` 和 `after` 各自最多 512 KiB。
    - `patch` 最多 2 MiB。
    - `path` 最多 2048 位元組。
    - `lang` 最多 128 位元組。
    - `title` 最多 1024 位元組。
    - 修補程式複雜度上限：最多 128 個檔案和 120,000 總行數。
    - 同時提供 `patch` 與 `before` 或 `after` 將被拒絕。
    - 轉譯檔案安全限制（適用於 PNG 和 PDF）：
      - `fileQuality: "standard"`：最多 8 MP (8,000,000 轉譯像素)。
      - `fileQuality: "hq"`：最多 14 MP (14,000,000 轉譯像素)。
      - `fileQuality: "print"`：最多 24 MP (24,000,000 轉譯像素)。
      - PDF 也最多 50 頁。

  </Accordion>
</AccordionGroup>

## 輸出詳細資料合約

此工具會在 `details` 下傳回結構化中繼資料。

<AccordionGroup>
  <Accordion title="檢視器欄位">
    建立檢視器之模式的共用欄位：

    - `artifactId`
    - `viewerUrl`
    - `viewerPath`
    - `title`
    - `expiresAt`
    - `inputKind`
    - `fileCount`
    - `mode`
    - `context` (可用時包含 `agentId`、`sessionId`、`messageChannel`、`agentAccountId`)

  </Accordion>
  <Accordion title="檔案欄位">
    當呈現 PNG 或 PDF 時的檔案欄位：

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path` (值與 `filePath` 相同，以相容訊息工具)
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="相容性別名">
    同時回傳給既有呼叫端：

    - `format` (值與 `fileFormat` 相同)
    - `imagePath` (值與 `filePath` 相同)
    - `imageBytes` (值與 `fileBytes` 相同)
    - `imageQuality` (值與 `fileQuality` 相同)
    - `imageScale` (值與 `fileScale` 相同)
    - `imageMaxWidth` (值與 `fileMaxWidth` 相同)

  </Accordion>
</AccordionGroup>

模式行為摘要：

| 模式     | 傳回內容                                                                                    |
| -------- | ------------------------------------------------------------------------------------------- |
| `"view"` | 僅檢視器欄位。                                                                              |
| `"file"` | 僅檔案欄位，無檢視器產物。                                                                  |
| `"both"` | 檢視器欄位加上檔案欄位。如果檔案呈現失敗，檢視器仍會回傳 `fileError` 和 `imageError` 別名。 |

## 收合未變更區段

- 檢視器可以顯示像 `N unmodified lines` 這樣的列。
- 這些資料列上的展開控制項是有條件的，且不保證適用於每種輸入類型。
- 當呈現的差異具有可展開的內文資料時，會出現展開控制項，這在「之前」和「之後」的輸入中很典型。
- 對於許多統一修補輸入，省略的內文主體在解析的修補區塊中不可用，因此資料列可能會在沒有展開控制項的情況下出現。這是預期的行為。
- `expandUnchanged` 僅在存在可展開的內容時適用。

## 外掛程式預設值

在 `~/.openclaw/openclaw.json` 中設定外掛層級的預設值：

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
            ttlSeconds: 21600,
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
- `ttlSeconds`

明確的工具參數會覆寫這些預設值。

### 持續性檢視器 URL 設定

<ParamField path="viewerBaseUrl" type="string">
  當工具呼叫未傳遞 `baseUrl` 時，外掛程式擁有的返回檢視器連結之後備機制。必須是 `http` 或 `https`，不可包含查詢/雜湊。
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          viewerBaseUrl: "https://gateway.example.com/openclaw",
        },
      },
    },
  },
}
```

## 安全性設定

<ParamField path="security.allowRemoteViewer" type="boolean" default="false">
  `false`：拒絕對檢視器路由的非本機回傳請求。`true`：如果標記化的路徑有效，則允許遠端檢視器。
</ParamField>

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

## 產生生命週期與儲存

- 產生儲存在 temp 子資料夾下：`$TMPDIR/openclaw-diffs`。
- 檢視器產生中繼資料包含：
  - 隨機產生 ID（20 個十六進位字元）
  - 隨機權杖（48 個十六進位字元）
  - `createdAt` 和 `expiresAt`
  - 已儲存的 `viewer.html` 路徑
- 若未指定，預設產生 TTL 為 30 分鐘。
- 接受的最大檢視器 TTL 為 6 小時。
- 清理工作會在建立產生後視機會執行。
- 過期的產生會被刪除。
- 當中繼資料遺失時，後備清理會移除超過 24 小時的過時資料夾。

## 檢視器 URL 與網路行為

檢視器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

檢視器資產：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

檢視器文件會相對於檢視器 URL 解析這些資產，因此選用的 `baseUrl` 路徑前綴也會保留給這兩個資產請求。

URL 建構行為：

- 如果提供了工具呼叫 `baseUrl`，則會在嚴格驗證後使用它。
- 否則，如果設定了外掛程式 `viewerBaseUrl`，則會使用它。
- 如果沒有上述兩種覆寫，檢視器 URL 預設為本機回傳 `127.0.0.1`。
- 如果閘道綁定模式為 `custom` 且設定了 `gateway.customBindHost`，則會使用該主機。

`baseUrl` 規則：

- 必須是 `http://` 或 `https://`。
- 查詢和雜湊會被拒絕。
- 允許來源加上選用的基底路徑。

## 安全性模型

<AccordionGroup>
  <Accordion title="檢視器加固">
    - 預設僅限本機回環。
    - 檢視器路徑具有嚴格的 ID 和 Token 驗證。
    - 檢視器回應 CSP：
      - `default-src 'none'`
      - 腳本和資產僅來自自身
      - 無對外 `connect-src`
    - 啟用遠端存取時的遠端未命中節流：
      - 每 60 秒 40 次失敗
      - 60 秒鎖定 (`429 Too Many Requests`)

  </Accordion>
  <Accordion title="檔案渲染加固">
    - 截圖瀏覽器請求路由預設為拒絕。
    - 僅允許來自 `http://127.0.0.1/plugins/diffs/assets/*` 的本機檢視器資產。
    - 外部網路請求已被封鎖。

  </Accordion>
</AccordionGroup>

## 檔案模式的瀏覽器需求

`mode: "file"` 和 `mode: "both"` 需要相容於 Chromium 的瀏覽器。

解析順序：

<Steps>
  <Step title="設定">
    在 OpenClaw 設定中設定 `browser.executablePath`。
  </Step>
  <Step title="環境變數">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step title="平台後備">
    平台指令/路徑探索後備機制。
  </Step>
</Steps>

常見失敗訊息：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

請安裝 Chrome、Chromium、Edge 或 Brave 來修正，或設定上述其中一個可執行檔路徑選項。

## 疑難排解

<AccordionGroup>
  <Accordion title="輸入驗證錯誤">
    - `Provide patch or both before and after text.` — 請同時包含 `before` 和 `after`，或提供 `patch`。
    - `Provide either patch or before/after input, not both.` — 請勿混用輸入模式。
    - `Invalid baseUrl: ...` — 請使用 `http(s)` 來源搭配可選路徑，不包含查詢/雜湊。
    - `{field} exceeds maximum size (...)` — 請減少 Payload 大小。
    - 大型 Patch 拒絕 — 請減少 Patch 檔案數量或總行數。

  </Accordion>
  <Accordion title="檢視器存取性">
    - 檢視器 URL 預設解析為 `127.0.0.1`。
    - 對於遠端存取場景，您可以：
      - 設定外掛程式 `viewerBaseUrl`，或
      - 在每次工具呼叫時傳遞 `baseUrl`，或
      - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
    - 如果 `gateway.trustedProxies` 包含同主機 Proxy 的回環位址（例如 Tailscale Serve），則沒有轉送用戶端 IP 標頭的原始回環檢視器請求會依設計封閉式失敗。
    - 對於該 Proxy 拓撲：
      - 如果您只需要附件，請優先使用 `mode: "file"` 或 `mode: "both"`，或
      - 當您需要可分享的檢視器 URL 時，請刻意啟用 `security.allowRemoteViewer` 並設定外掛程式 `viewerBaseUrl` 或傳遞 Proxy/公開 `baseUrl`
    - 僅當您打算進行外部檢視器存取時，才啟用 `security.allowRemoteViewer`。

  </Accordion>
  <Accordion title="未修改的行沒有展開按鈕">
    當修補輸入不包含可展開的上下文時，可能會發生這種情況。這是預期的行為，並不表示檢視器發生故障。
  </Accordion>
  <Accordion title="找不到成品">
    - 成品因 TTL 過期。
    - 權杖或路徑已變更。
    - 清理程序已移除過期資料。

  </Accordion>
</AccordionGroup>

## 操作指引

- 對於畫布中的本機互動式審查，請優先使用 `mode: "view"`。
- 對於需要附件的外向聊天頻道，請優先使用 `mode: "file"`。
- 請保持 `allowRemoteViewer` 為停用狀態，除非您的部署需要遠端檢視器 URL。
- 針對敏感的差異，請設定明確的短 `ttlSeconds`。
- 若非必要，請避免在差異輸入中傳送機密。
- 如果您的頻道會大幅壓縮圖片（例如 Telegram 或 WhatsApp），請優先選擇 PDF 輸出 (`fileFormat: "pdf"`)。

<Note>差異呈現引擎由 [Diffs](https://diffs.com) 提供動力。</Note>

## 相關

- [瀏覽器](/zh-Hant/tools/browser)
- [外掛程式](/zh-Hant/tools/plugin)
- [工具總覽](/zh-Hant/tools)
