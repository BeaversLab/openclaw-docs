---
summary: "`openclaw voicecall`（voice-call 外掛程式指令介面）的 CLI 參考資料"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall setup|smoke|call|continue|dtmf|status|tail|expose`
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一個由外掛程式提供的指令。只有在安裝並啟用 voice-call 外掛程式後才會顯示。

主要文件：

- Voice-call 外掛程式：[Voice Call](/zh-Hant/plugins/voice-call)

## 常用指令

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` 預設會列印人類可讀的就緒檢查結果。請使用 `--json` 以用於
腳本：

```bash
openclaw voicecall setup --json
```

對於外部提供者（`twilio`、`telnyx`、`plivo`），設定必須能夠從 `publicUrl`、通道或 Tailscale expose 解析出公開的
webhook URL。由於業者無法存取，因此會拒絕使用回送/私人伺服器作為後備方案。

`smoke` 會執行相同的就緒檢查。除非同時存在 `--to` 和 `--yes`，否則它不會撥打真正的電話：

```bash
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

## 公開 webhook（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全性提示：僅將 webhook 端點公開給您信任的網路。盡可能優先使用 Tailscale Serve 而非 Funnel。

## 相關連結

- [CLI 參考資料](/zh-Hant/cli)
- [Voice call 外掛程式](/zh-Hant/plugins/voice-call)
