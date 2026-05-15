---
summary: "適用於 OpenClaw 感知客戶端的 Matrix 訊息呈現元資料"
read_when:
  - Building Matrix clients that render OpenClaw rich responses
  - Debugging com.openclaw.presentation event content
title: "Matrix 呈現元資料"
---

OpenClaw 可以在 `com.openclaw.presentation` 下將標準化的 `MessagePresentation` 元資料附加到外寄的 Matrix `m.room.message` 事件。

標準 Matrix 客戶端會繼續呈現純文字 `body`。支援 OpenClaw 的客戶端可以讀取結構化元資料，並呈現按鈕、選擇器、內容列和分隔線等原生 UI。

## 事件內容

元資料儲存在 Matrix 事件內容中：

```json
{
  "msgtype": "m.text",
  "body": "Select model\n\n- DeepSeek: /model deepseek/deepseek-chat",
  "com.openclaw.presentation": {
    "version": 1,
    "type": "message.presentation",
    "title": "Select model",
    "tone": "info",
    "blocks": [
      {
        "type": "select",
        "placeholder": "Choose model",
        "options": [
          {
            "label": "DeepSeek",
            "value": "/model deepseek/deepseek-chat"
          }
        ]
      }
    ]
  }
}
```

`version` 是 Matrix 呈現元資料架構版本。`type` 是適用於 OpenClaw 感知客戶端的穩定辨識符。客戶端應忽略未知的 `type` 值、無法安全解讀的未知版本，以及未知的區塊類型。

## 後備行為

OpenClaw 總是會將可讀的純文字後備版本呈現至 `body`。結構化元資料是附加性的，不得成為基本 Matrix 互操作性的必要條件。

不支援的客戶端應繼續顯示後備文字。支援 OpenClaw 的客戶端可能偏好使用結構化元資料進行顯示，同時保留後備文字用於複製、搜尋、通知和無障礙功能。

## 支援的區塊

Matrix 外配接器宣佈支援：

- `buttons`
- `select`
- `context`
- `divider`

客戶端應將這些區塊視為盡力而為的呈現提示。未知欄位和未知區塊類型應被忽略，而不是導致整則訊息無法呈現。

## 互動

此元資料並不新增 Matrix 回呼語意。按鈕和選擇器選項的值是後備互動負載，通常是斜線指令或文字指令。想要支援互動的 Matrix 客戶端可以將選取的值作為一般訊息傳送回房間。

例如，值為 `/model deepseek/deepseek-chat` 的按鈕可以透過在相同房間中將該值作為加密 Matrix 文字訊息傳送來處理。

## 與審核元資料的關係

`com.openclaw.presentation` 用於一般豐富訊息的呈現。

批准提示使用專用的 `com.openclaw.approval` 元數據，因為批准攜帶安全敏感的狀態、決策和執行/插件詳細資訊。如果同一事件上同時存在這兩個元數據鍵，客戶端應優先使用專用的批准呈現器。

## 媒體訊息

當回覆包含多個媒體 URL 時，OpenClaw 會為每個媒體 URL 發送一個 Matrix 事件。呈現元數據僅附加到第一個媒體事件，以便客戶端獲得一個穩定的結構化負載並避免重複的呈現器。

保持呈現元數據簡潔。大型用戶可見文本應保留在 `body` 中，並使用正常的 Matrix 文本分塊路徑。
