# Tweakcn 自訂主題匯入設計

狀態：已於 2026-04-22 在終端機中批准

## 摘要

新增一個可從 tweakcn 分享連結匯入的瀏覽器本機自訂 Control UI 主題槽位。現有的內建主題系列保持為 `claw`、`knot` 和 `dash`。新的 `custom` 系列的運作方式如同正常的 OpenClaw 主題系列，並且當匯入的 tweakcn 載荷同時包含亮色和暗色標記集時，支援 `light`、`dark` 和 `system` 模式。

匯入的主題僅與其他 Control UI 設定一起儲存在目前的瀏覽器設定檔中。它不會寫入閘道設定，也不會在裝置或瀏覽器之間同步。

## 問題

Control UI 主題系統目前僅限於三個硬編碼的主題系列：

- `ui/src/ui/theme.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/styles/base.css`

使用者可以在內建系列和模式變體之間切換，但他們無法在不編輯 repo CSS 的情況下從 tweakcn 引入主題。請求的結果小於一般主題系統：保留三個內建項目並新增一個可從 tweakcn 連結替換的使用者控制匯入槽位。

## 目標

- 保持現有內建主題系列不變。
- 新增僅一個匯入的自訂槽位，而非主題庫。
- 接受 tweakcn 分享連結或直接 `https://tweakcn.com/r/themes/{id}` URL。
- 僅在瀏覽器本機儲存中保存匯入的主題。
- 使匯入的槽位與現有的 `light`、`dark` 和 `system` 模式控制項搭配運作。
- 保持失敗行為安全：錯誤的匯入絕不會破壞使用中的 UI 主題。

## 非目標

- 不提供多重主題庫或瀏覽器本機匯入列表。
- 不提供閘道端持久性或跨裝置同步。
- 不提供任意 CSS 編輯器或原始主題 JSON 編輯器。
- 不自動從 tweakcn 載入遠端字體資源。
- 不嘗試支援僅公開一種模式的 tweakcn 載荷。
- 除了 Control UI 所需的接縫之外，不進行 repo 範圍的主題重構。

## 已做出的使用者決策

- 保留三個內建主題。
- 新增一個由 tweakcn 驅動的匯入槽位。
- 將匯入的主題儲存在瀏覽器中，而非閘道組態中。
- 針對匯入的插槽，支援 `light`、`dark` 和 `system`。
- 使用下一次匯入來覆寫自訂插槽是預期的行為。

## 建議的方法

在 Control UI 主題模型中加入第四個主題系列 ID `custom`。只有在存在有效的 tweakcn 匯入時，`custom` 系列才會變為可選。匯入的載荷會被正規化為 OpenClaw 專用的自訂主題記錄，並與其餘 UI 設定一起儲存在瀏覽器本機儲存空間中。

在執行階段，OpenClaw 會渲染一個受控的 `<style>` 標籤，定義已解析的自訂 CSS 變數區塊：

```css
:root[data-theme="custom"] { ... }
:root[data-theme="custom-light"] { ... }
```

這能保持自訂主題變數限定在 `custom` 系列範圍內，並避免將內聯 CSS 變數洩漏到內建系列中。

## 架構

### 主題模型

更新 `ui/src/ui/theme.ts`：

- 擴充 `ThemeName` 以包含 `custom`。
- 擴充 `ResolvedTheme` 以包含 `custom` 和 `custom-light`。
- 擴充 `VALID_THEME_NAMES`。
- 更新 `resolveTheme()`，使 `custom` 能鏡像現有系列的行為：
  - `custom + dark` -> `custom`
  - `custom + light` -> `custom-light`
  - `custom + system` -> 根據作業系統偏好設為 `custom` 或 `custom-light`

不會為 `custom` 新增舊版別名。

### 持續性模型

使用一個可選的自訂主題載荷擴充 `UiSettings` 在 `ui/src/ui/storage.ts` 中的持續性：

- `customTheme?: ImportedCustomTheme`

建議的儲存結構：

```ts
type ImportedCustomTheme = {
  sourceUrl: string;
  themeId: string;
  label: string;
  importedAt: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};
```

註記：

- `sourceUrl` 儲存正規化後的原始使用者輸入。
- `themeId` 是從 URL 中提取的 tweakcn 主題 ID。
- `label` 是當 tweakcn `name` 欄位存在時的值，否則為 `Custom`。
- `light` 和 `dark` 已經是標準化的 OpenClaw token 對應表，而非原始的 tweakcn 載荷。
- 匯入的載荷與其他瀏覽器本地設定並存，並且序列化在相同的 local-storage 文件中。
- 如果在載入時儲存的自訂主題資料遺失或無效，請忽略該載荷，並在儲存的系列是 `custom` 時回退到 `theme: "claw"`。

### 執行階段應用

在 Control UI 執行階段中新增一個精簡的自訂主題樣式表管理器，其擁有者位於 `ui/src/ui/app-settings.ts` 和 `ui/src/ui/theme.ts` 附近。

職責：

- 在 `document.head` 中建立或更新一個穩定的 `<style id="openclaw-custom-theme">` 標籤。
- 僅當存在有效的自訂主題載荷時才發出 CSS。
- 當載荷被清除時，移除 style 標籤的內容。
- 將內建系列 CSS 保留在 `ui/src/styles/base.css` 中；不要將匯入的 token 拼接到已簽入的樣式表中。

每當載入、儲存、匯入或清除設定時，此管理器就會執行。

### 淺色模式選擇器

實作應偏好使用 `data-theme-mode="light"` 進行跨系列淺色樣式設定，而不是對 `custom-light` 進行特殊處理。如果現有的選擇器被固定到 `data-theme="light"` 並且需要套用到每個淺色系列，請將其擴展作為此工作的一部分。

## 匯入 UX

更新 `Appearance` 區段中的 `ui/src/ui/views/config.ts`：

- 在 `Claw`、`Knot` 和 `Dash` 旁邊新增一個 `Custom` 主題卡片。
- 當不存在匯入的自訂主題時，將該卡片顯示為停用狀態。
- 在主題網格下方新增一個匯入面板，其中包含：
  - 一個用於輸入 tweakcn 分享連結或 `/r/themes/{id}` URL 的文字輸入框
  - 一個 `Import` 按鈕
  - 一個當自訂載荷已存在時的 `Replace` 路徑
  - 一個當自訂載荷已存在時的 `Clear` 動作
- 當載荷存在時，顯示匯入的主題標籤和來源主機。
- 如果目前使用的主題是 `custom`，則匯入替換內容會立即生效。
- 如果現用主題不是 `custom`，匯入僅會儲存新的 payload，直到使用者選擇 `Custom` 卡片。

`ui/src/ui/views/config-quick.ts` 中的快速設定主題選擇器也應僅在 payload 存在時顯示 `Custom`。

## URL 解析與遠端擷取

瀏覽器匯入路徑接受：

- `https://tweakcn.com/themes/{id}`
- `https://tweakcn.com/r/themes/{id}`

實作應將兩種形式標準化為：

- `https://tweakcn.com/r/themes/{id}`

然後瀏覽器會直接擷取標準化的 `/r/themes/{id}` 端點。

使用嚴格的 schema 驗證器來驗證外部 payload。首選 zod schema，因為這是一個不受信任的外部邊界。

必要的遠端欄位：

- 頂層 `name` 作為選用字串
- `cssVars.theme` 作為選用物件
- `cssVars.light` 作為物件
- `cssVars.dark` 作為物件

如果 `cssVars.light` 或 `cssVars.dark` 遺失，則拒絕匯入。這是有意為之的：核准的產品行為是完整模式支援，而非盡力合成遺失的一方。

## Token 對應

不要盲目鏡像 tweakcn 變數。將有限的子集標準化為 OpenClaw tokens，並在輔助函式中推導其餘部分。

### 直接匯入的 Tokens

來自每個 tweakcn 模式區塊：

- `background`
- `foreground`
- `card`
- `card-foreground`
- `popover`
- `popover-foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `muted`
- `muted-foreground`
- `accent`
- `accent-foreground`
- `destructive`
- `destructive-foreground`
- `border`
- `input`
- `ring`
- `radius`

來自共享的 `cssVars.theme` （如果存在）：

- `font-sans`
- `font-mono`

如果某個模式區塊覆寫了 `font-sans`、`font-mono` 或 `radius`，則模式區域內的值優先。

### 為 OpenClaw 推導的 Tokens

匯入工具會從匯入的基礎顏色推導出 OpenClaw 專用的變數：

- `--bg-accent`
- `--bg-elevated`
- `--bg-hover`
- `--panel`
- `--panel-strong`
- `--panel-hover`
- `--chrome`
- `--chrome-strong`
- `--text`
- `--text-strong`
- `--chat-text`
- `--muted`
- `--muted-strong`
- `--accent-hover`
- `--accent-muted`
- `--accent-subtle`
- `--accent-glow`
- `--focus`
- `--focus-ring`
- `--focus-glow`
- `--secondary`
- `--secondary-foreground`
- `--danger`
- `--danger-muted`
- `--danger-subtle`

推導規則位於一個純輔助函式中，以便能夠獨立進行測試。確切的色彩混合公式屬於實作細節，但該輔助函式必須滿足兩個約束條件：

- 保持接近匯入主題意圖的可讀對比度
- 針對相同的匯入載荷產生穩定的輸出

### 在 v1 中忽略的 Tokens

這些 tweakcn tokens 在第一個版本中會被刻意忽略：

- `chart-*`
- `sidebar-*`
- `font-serif`
- `shadow-*`
- `tracking-*`
- `letter-spacing`
- `spacing`

這樣可以將範圍保持在目前 Control UI 實際需要的 tokens 上。

### 字型

如果有提供字型堆疊字串則會被匯入，但 OpenClaw 在 v1 中不會載入遠端字型資源。如果匯入的堆疊參照了瀏覽器中不可用的字型，則會套用正常的後備行為。

## 失敗行為

不正確的匯入必須以封閉式失敗處理。

- 無效的 URL 格式：顯示內聯驗證錯誤，不進行擷取。
- 不支援的主機或路徑格式：顯示行內驗證錯誤，不進行擷取。
- 網路失敗、非 OK 回應，或格式錯誤的 JSON：顯示行內錯誤，保持目前儲存的 payload 不變。
- Schema 失敗或缺少 light/dark 區塊：顯示行內錯誤，保持目前儲存的 payload 不變。
- 清除動作：
  - 移除已儲存的 custom payload
  - 移除受管理的 custom style tag 內容
  - 如果 `custom` 是啟用的，將主題系列切換回 `claw`
- 初次載入時無效的已儲存 custom payload：
  - 忽略已儲存的 payload
  - 不發出自訂 CSS
  - 如果持續化的主題系列是 `custom`，則退回到 `claw`

在任何情況下，失敗的匯入都不應該讓作用中的文件保留部分套用的自訂 CSS 變數。

## 預期在實作中變更的檔案

主要檔案：

- `ui/src/ui/theme.ts`
- `ui/src/ui/storage.ts`
- `ui/src/ui/app-settings.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/ui/views/config-quick.ts`
- `ui/src/styles/base.css`

可能的新輔助函式：

- `ui/src/ui/custom-theme.ts`
- `ui/src/ui/custom-theme-import.ts`

測試：

- `ui/src/ui/app-settings.test.ts`
- `ui/src/ui/storage.node.test.ts`
- `ui/src/ui/views/config.browser.test.ts`
- 針對 URL 解析和 payload 正規化的新專注測試

## 測試

最低實作涵蓋範圍：

- 將分享連結 URL 解析為 tweakcn theme id
- 將 `/themes/{id}` 和 `/r/themes/{id}` 正規化為擷取 URL
- 拒絕不支援的主機和格式錯誤的 id
- 驗證 tweakcn payload 格式
- 將有效的 tweakcn payload 映射到正規化的 OpenClaw light 和 dark token maps
- 在瀏覽器本機設定中載入並儲存 custom payload
- 解析 `light`、`dark` 和 `system` 的 `custom`
- 當不存在 payload 時停用 `Custom` 選擇
- 當 `custom` 已經是啟用狀態時，立即套用匯入的主題
- 當作用中的自訂主題被清除時，退回到 `claw`

手動驗證目標：

- 從設定匯入已知的 tweakcn 主題
- 在 `light`、`dark` 和 `system` 之間切換
- 在 `custom` 與內建系列之間切換
- 重新載入頁面，確認匯入的自訂主題會保留在本地

## 推出說明

此功能刻意保持精簡。如果使用者後續要求支援匯入多個主題、重新命名、匯出或跨裝置同步，請將其視為後續設計。請勿在此實作中預先建構主題庫抽象層。
