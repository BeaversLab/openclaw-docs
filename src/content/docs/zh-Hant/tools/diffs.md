---
summary: "代理程式的唯讀差異檢視器和檔案渲染器（選用外掛工具）"
title: "差異"
sidebarTitle: "差異"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

`diffs` 是一個選用的外掛工具，具有簡短的內建系統指引和配套技能，可將變更內容轉換為代理程式的唯讀差異構件。

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
        畫布優先流程：代理程式使用 `mode: "view"` 呼叫 `diffs`，並使用 `canvas present` 開啟 `details.viewerUrl`。
      </Tab>
      <Tab title="file">
        聊天檔案傳送：代理程式使用 `mode: "file"` 呼叫 `diffs`，並使用 `path` 或 `filePath` 搭配 `message` 傳送 `details.filePath`。
      </Tab>
      <Tab title="both">
        組合：代理程式使用 `mode: "both"` 呼叫 `diffs` 以在一次呼叫中取得兩個構件。
      </Tab>
    </Tabs>
  </Step>
</Steps>

## 停用內建系統指引

如果您想要保持 `diffs` 工具啟用但停用其內建系統提示詞指引，請將 `plugins.entries.diffs.hooks.allowPromptInjection` 設定為 `false`：

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

這會封鎖差異外掛的 `before_prompt_build` hook，同時保持外掛、工具和配套技能可用。

如果您想同時停用指引和工具，請改為停用外掛程式。

## 典型代理工作流程

<Steps>
  <Step title="呼叫差異">代理程式使用輸入呼叫 `diffs` 工具。</Step>
  <Step title="讀取詳情">Agent 從回應中讀取 `details` 欄位。</Step>
  <Step title="呈現">Agent 可以開啟 `details.viewerUrl` 並使用 `canvas present`，透過 `path` 或 `filePath` 發送 `details.filePath` 與 `message`，或者兩者都做。</Step>
</Steps>

## 輸入範例

<Tabs>
  <Tab title="之前與之後">
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
  原始文字。當省略 `patch` 時，需與 `after` 一起提供。
</ParamField>
<ParamField path="after" type="string">
  更新後的文字。當省略 `patch` 時，需與 `before` 一起提供。
</ParamField>
<ParamField path="patch" type="string">
  Unified diff 文字。與 `before` 和 `after` 互斥。
</ParamField>
<ParamField path="path" type="string">
  用於之前與之後模式的顯示檔名。
</ParamField>
<ParamField path="lang" type="string">
  用於之前與之後模式的語言覆寫提示。未知的值和預設檢視器集合以外的語言會回退為純文字，除非已安裝 Diff Viewer Language Pack 外掛程式。
</ParamField>

<ParamField path="title" type="string">
  檢視器標題覆寫。
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  輸出模式。預設為外掛預設值 `defaults.mode`。已棄用的別名：`"image"` 的行為類似於 `"file"`，為了向後相容性仍被接受。
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  檢視器主題。預設為外掛預設值 `defaults.theme`。
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  差異佈局。預設為外掛預設值 `defaults.layout`。
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  當完整內容可用時展開未變更的區段。僅限單次呼叫選項（非外掛預設鍵）。
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  轉譯的檔案格式。預設為外掛預設值 `defaults.fileFormat`。
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  PNG 或 PDF 轉譯的品質預設。
</ParamField>
<ParamField path="fileScale" type="number">
  裝置縮放覆寫（`1`-`4`）。
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  CSS 像素中的最大轉譯寬度（`640`-`2400`）。
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  檢視器和獨立檔案輸出的 Artifact TTL（秒）。最大值 21600。
</ParamField>
<ParamField path="baseUrl" type="string">
  檢視器 URL 來源覆寫。覆寫外掛的 `viewerBaseUrl`。必須為 `http` 或 `https`，無查詢/雜湊。
</ParamField>

<AccordionGroup>
  <Accordion title="舊版輸入別名">
    為了向後相容性，仍接受以下別名：

    - `format` -> `fileFormat`
    - `imageFormat` -> `fileFormat`
    - `imageQuality` -> `fileQuality`
    - `imageScale` -> `fileScale`
    - `imageMaxWidth` -> `fileMaxWidth`

  </Accordion>
  <Accordion title="驗證與限制">
    - `before` 和 `after` 每個最大 512 KiB。
    - `patch` 最大 2 MiB。
    - `path` 最大 2048 位元組。
    - `lang` 最大 128 位元組。
    - `title` 最大 1024 位元組。
    - 補丁複雜度上限：最多 128 個檔案和 120000 行總行數。
    - `patch` 和 `before` 或 `after` 一起使用時會被拒絕。
    - 轉譯檔案安全性限制（適用於 PNG 和 PDF）：
      - `fileQuality: "standard"`：最大 8 MP (8,000,000 個轉譯像素)。
      - `fileQuality: "hq"`：最大 14 MP (14,000,000 個轉譯像素)。
      - `fileQuality: "print"`：最大 24 MP (24,000,000 個轉譯像素)。
      - PDF 最多 50 頁。

  </Accordion>
</AccordionGroup>

## 語法高亮

OpenClaw 包含針對常見原始碼、設定和文件語言的語法高亮：

`javascript`、`typescript`、`tsx`、`jsx`、`json`、`markdown`、`yaml`、`css`、`html`、`sh`、`python`、`go`、`rust`、`java`、`c`、`cpp`、`csharp`、`php`、`sql`、`docker`、`ruby`、`swift`、`kotlin`、`r`、`dart`、`lua`、`powershell`、`xml` 和 `toml`。

常見的別名，例如 `js`、`ts`、`bash`、`md`、`yml`、`c++`、`dockerfile`、`rb`、`kt` 和 `ps1`，會被正規化為這些預設語言。

安裝 Diff Viewer Language Pack 外掛程式以突顯其他語言：

```bash
openclaw plugins install diffs-language-pack
```

如果語言包可用，OpenClaw 會自動將其用於預設清單之外的語言。如果沒有語言包，這些檔案將保持為純文字可讀狀態。

## 輸出詳細資訊合約

該工具會在 `details` 下傳回結構化中繼資料。

<AccordionGroup>
  <Accordion title="檢視器欄位">
    建立檢視器模式共用的欄位：

    - `artifactId`
    - `viewerUrl`
    - `viewerPath`
    - `title`
    - `expiresAt`
    - `inputKind`
    - `fileCount`
    - `mode`
    - `context` （如有可用，則為 `agentId`、`sessionId`、`messageChannel`、`agentAccountId`）

  </Accordion>
  <Accordion title="檔案欄位">
    當呈現 PNG 或 PDF 時的檔案欄位：

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path` （與 `filePath` 的值相同，用於訊息工具相容性）
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="相容性別名">
    亦會為現有呼叫者回傳：

    - `format` （與 `fileFormat` 的值相同）
    - `imagePath` （與 `filePath` 的值相同）
    - `imageBytes` （與 `fileBytes` 的值相同）
    - `imageQuality` （與 `fileQuality` 的值相同）
    - `imageScale` （與 `fileScale` 的值相同）
    - `imageMaxWidth` （與 `fileMaxWidth` 的值相同）

  </Accordion>
</AccordionGroup>

模式行為摘要：

| 模式     | 回傳內容                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------- |
| `"view"` | 僅檢視器欄位。                                                                                    |
| `"file"` | 僅檔案欄位，無檢視器成果。                                                                        |
| `"both"` | 檢視器欄位加上檔案欄位。如果檔案呈現失敗，檢視器仍會回傳並帶有 `fileError` 和 `imageError` 別名。 |

## 收合未變更區段

- 檢視器可以顯示像 `N unmodified lines` 這樣的行。
- 這些行上的展開控制項是有條件的，且不保證適用於所有輸入類型。
- 當呈現的差異具有可展開的上下文資料時，會出現展開控制項，這在輸入前後內容時很常見。
- 對於許多統一補丁輸入，解析後的補丁區塊中無法使用省略的上下文主體，因此該行可能會在沒有展開控制項的情況下出現。這是預期的行為。
- `expandUnchanged` 僅在存在可展開上下文時套用。

## 外掛預設值

在 `~/.openclaw/openclaw.json` 中設定外掛範圍的預設值：

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

### 持久檢視器 URL 設定

<ParamField path="viewerBaseUrl" type="string">
  當工具呼叫未傳遞 `baseUrl` 時，傳回的檢視器連結的外掛擁有者後援。必須是 `http` 或 `https`，不得包含查詢/雜湊。
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
  `false`：拒絕對檢視器路由的非回送請求。`true`：如果標記化路徑有效，則允許遠端檢視器。
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

## 產生成果生命週期與儲存

- 產生成果儲存在 temp 子資料夾下：`$TMPDIR/openclaw-diffs`。
- 檢視器產生成果元資料包含：
  - 隨機產生成果 ID（20 個十六進位字元）
  - 隨機權杖（48 個十六進位字元）
  - `createdAt` 和 `expiresAt`
  - 儲存的 `viewer.html` 路徑
- 未指定時，預設產生成果 TTL 為 30 分鐘。
- 檢視器接受的 TTL 上限為 6 小時。
- 清理會在建立工件後機動執行。
- 過期的工件會被刪除。
- 當中繼資料缺失時，後備清理會移除超過 24 小時的過時資料夾。

## 檢視器 URL 與網路行為

檢視器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

檢視器資源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`
- `/plugins/diffs-language-pack/assets/viewer.js` 當差異使用 Diff Viewer Language Pack 中的語言時

檢視器文件會相對於檢視器 URL 解析這些資源，因此選用的 `baseUrl` 路徑前綴也會保留給這兩個資源請求。

URL 建構行為：

- 如果提供工具呼叫 `baseUrl`，則會在嚴格驗證後使用。
- 否則，如果設定了外掛程式 `viewerBaseUrl`，則會使用它。
- 如果沒有上述覆寫，檢視器 URL 預設為 loopback `127.0.0.1`。
- 如果閘道綁定模式是 `custom` 且設定了 `gateway.customBindHost`，則會使用該主機。

`baseUrl` 規則：

- 必須是 `http://` 或 `https://`。
- 查詢和雜湊會被拒絕。
- 允許來源加上選用的基底路徑。

## 安全性模型

<AccordionGroup>
  <Accordion title="檢視器加固">
    - 預設僅限 Loopback。
    - 具有嚴格 ID 和 Token 驗證的權杖化檢視器路徑。
    - 檢視器回應 CSP：
      - `default-src 'none'`
      - 腳本和資源僅來自 self
      - 沒有傳出 `connect-src`
    - 啟用遠端存取時的遠端未命中節流：
      - 每 60 秒 40 次失敗
      - 60 秒鎖定 (`429 Too Many Requests`)

  </Accordion>
  <Accordion title="檔案渲染加固">
    - 截圖瀏覽器請求路由預設為拒絕。
    - 僅允許來自 `http://127.0.0.1/plugins/diffs/assets/*` 的本機檢視器資源。
    - 外部網路請求會被阻擋。

  </Accordion>
</AccordionGroup>

## 檔案模式的瀏覽器需求

`mode: "file"` 和 `mode: "both"` 需要相容 Chromium 的瀏覽器。

解析順序：

<Steps>
  <Step title="Config">
    OpenClaw 配置中的 `browser.executablePath`。
  </Step>
  <Step title="Environment variables">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step title="Platform fallback">
    平台命令/路徑探索回退機制。
  </Step>
</Steps>

常見錯誤訊息：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

解決方法：安裝 Chrome、Chromium、Edge 或 Brave，或設定上述其中一個可執行檔路徑選項。

## 疑難排解

<AccordionGroup>
  <Accordion title="Input validation errors">
    - `Provide patch or both before and after text.` — 請同時包含 `before` 與 `after`，或提供 `patch`。
    - `Provide either patch or before/after input, not both.` — 請勿混用輸入模式。
    - `Invalid baseUrl: ...` — 請使用帶有可選路徑的 `http(s)` 來源，不包含查詢參數或雜湊。
    - `{field} exceeds maximum size (...)` — 請減少承載大小。
    - Large patch rejection — 請減少修補檔案數量或總行數。

  </Accordion>
  <Accordion title="Viewer accessibility">
    - 檢視器 URL 預設解析為 `127.0.0.1`。
    - 對於遠端存取場景，您可以：
      - 設定外掛程式 `viewerBaseUrl`，或
      - 在每次工具呼叫時傳遞 `baseUrl`，或
      - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
    - 如果 `gateway.trustedProxies` 包含同主機代理的回環位址（例如 Tailscale Serve），則未轉發用戶端標頭的原始回環檢視器請求會依設計封閉失敗。
    - 對於該代理拓撲：
      - 若您只需要附件，請優先使用 `mode: "file"` 或 `mode: "both"`，或
      - 當您需要可分享的檢視器 URL 時，請刻意啟用 `security.allowRemoteViewer` 並設定外掛程式 `viewerBaseUrl` 或傳遞代理/公開的 `baseUrl`
    - 僅在您預期進行外部檢視器存取時啟用 `security.allowRemoteViewer`。

  </Accordion>
  <Accordion title="未修改的行沒有展開按鈕">
    對於補丁輸入，當補丁未攜帶可展開的內容時，可能會發生這種情況。這是預期的行為，並不表示檢視器發生故障。
  </Accordion>
  <Accordion title="找不到檔案">
    - 檔案因 TTL 過期。
    - 權杖或路徑已變更。
    - 清理作業已移除過時資料。

  </Accordion>
</AccordionGroup>

## 操作指引

- 針對畫布中的本機互動式檢閱，建議優先使用 `mode: "view"`。
- 針對需要附件的外部聊天頻道，建議優先使用 `mode: "file"`。
- 除非您的部署需要遠端檢視器 URL，否則請保持 `allowRemoteViewer` 為停用狀態。
- 針對敏感的差異，請設定明確的較短 `ttlSeconds`。
- 若非必要，請避免在差異輸入中傳送機密資訊。
- 如果您的頻道會大幅壓縮圖片 (例如 Telegram 或 WhatsApp)，建議優先選擇 PDF 輸出 (`fileFormat: "pdf"`)。

<Note>差異呈現引擎由 [Diffs](https://diffs.com) 提供技術支援。</Note>

## 相關內容

- [瀏覽器](/zh-Hant/tools/browser)
- [外掛程式](/zh-Hant/tools/plugin)
- [工具概覽](/zh-Hant/tools)
