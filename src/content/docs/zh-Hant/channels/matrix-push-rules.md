---
summary: "針對收件者的安靜最終預覽編輯的 Matrix 推送規則"
read_when:
  - Setting up Matrix quiet streaming for self-hosted Synapse or Tuwunel
  - Users want notifications only on finished blocks, not on every preview edit
title: "安靜預覽的 Matrix 推送規則"
---

當 `channels.matrix.streaming` 為 `"quiet"` 時，OpenClaw 會就地編輯單一預覽事件，並使用自訂內容標誌標記最終編輯。Matrix 客戶端僅在符合該標誌的每個使用者推送規則存在時，才會通知最終編輯。此頁面適用於自託管 Matrix 且想要為每個收件者帳戶安裝該規則的操作員。

如果您只想要標準的 Matrix 通知行為，請使用 `streaming: "partial"` 或保持串流關閉。請參閱 [Matrix 頻道設定](/zh-Hant/channels/matrix#streaming-previews)。

## 先決條件

- 收件者使用者 = 應該接收通知的人
- 機器人使用者 = 傳送回覆的 OpenClaw Matrix 帳戶
- 對下列 API 呼叫使用收件者使用者的存取權杖
- 將推送規則中的 `sender` 與機器人使用者的完整 MXID 進行比對
- 收件者帳戶必須已經有可用的推送器 — 安靜預覽規則僅在正常的 Matrix 推送傳遞健全時運作

## 步驟

<Steps>
  <Step title="設定安靜預覽">

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

  </Step>

  <Step title="取得收件者的存取權杖">
    盡可能重複使用現有的客戶端階段權杖。若要建立一個新的：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@alice:example.org" },
    "password": "REDACTED"
  }'
```

  </Step>

  <Step title="驗證推送器存在">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果沒有傳回任何推送器，請先修正此帳戶的正常 Matrix 推送傳遞，然後再繼續。

  </Step>

  <Step title="安裝覆蓋推送規則">
    OpenClaw 會使用 `content["com.openclaw.finalized_preview"] = true` 標記最終的純文字預覽編輯。請安裝一個規則，使其符合該標記以及機器人 MXID 作為發送者：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

    執行前請替換：

    - `https://matrix.example.org`：您的伺服器基礎 URL
    - `$USER_ACCESS_TOKEN`：接收者使用者的存取權杖
    - `openclaw-finalized-preview-botname`：每個機器人每個接收者唯一的規則 ID （格式：`openclaw-finalized-preview-<botname>`）
    - `@bot:example.org`：您的 OpenClaw 機器人 MXID，而非接收者的

  </Step>

  <Step title="驗證">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

然後測試串流回應。在靜音模式下，房間會顯示靜音草稿預覽，並在區塊或輪次完成時發送通知。

  </Step>
</Steps>

若稍後要移除此規則，請使用接收者的權杖對相同的規則 URL 執行 `DELETE`。

## 多機器人注意事項

推送規則是以 `ruleId` 為鍵：對同一個 ID 重新執行 `PUT` 會更新單一規則。對於多個通知同一接收者的 OpenClaw 機器人，請為每個機器人建立一個具有不同發送者比對的規則。

新的使用者自訂 `override` 規則會插入在預設抑制規則之前，因此不需要額外的排序參數。此規則僅影響可就地完成的純文字預覽編輯；媒體後備和過時預覽後備則使用正常的 Matrix 傳遞方式。

## Homeserver 注意事項

<AccordionGroup>
  <Accordion title="Synapse">
    不需要進行特殊的 `homeserver.yaml` 變更。如果正常的 Matrix 通知已經能傳達給該使用者，上述的收件者權杖 + `pushrules` 呼叫就是主要的設定步驟。

    如果您在反向代理或 Worker 後方執行 Synapse，請確保 `/_matrix/client/.../pushrules/` 能正確抵達 Synapse。推播傳遞是由主程序或 `synapse.app.pusher` / 已設定的 Pusher Worker 處理 — 請確保這些元件運作正常。

    此規則使用 `event_property_is` 推播規則條件（MSC3758，推播規則 v1.10），該條件於 2023 年加入 Synapse。較舊的 Synapse 版本會接受 `PUT pushrules/...` 呼叫，但會默默無法符合該條件 — 如果在完成的預覽編輯上沒有收到通知，請升級 Synapse。

  </Accordion>

  <Accordion title="Tuwunel">
    流程與 Synapse 相同；不需要針對完成的預覽標記進行特定於 Tuwunel 的設定。

    如果在使用者於另一個裝置上啟用時通知消失了，請檢查是否已啟用 `suppress_push_when_active`。Tuwunel 在 1.4.2 版（2025 年 9 月）新增了此選項，它可以在某個裝置啟用時刻意抑制對其他裝置的推播。

  </Accordion>
</AccordionGroup>

## 相關

- [Matrix 頻道設定](/zh-Hant/channels/matrix)
- [串流概念](/zh-Hant/concepts/streaming)
