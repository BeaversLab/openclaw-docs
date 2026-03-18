---
summary: "OpenClaw 記錄：輪替診斷檔案記錄 + 統一記錄隱私標誌"
read_when:
  - Capturing macOS logs or investigating private data logging
  - Debugging voice wake/session lifecycle issues
title: "macOS 記錄"
---

# 記錄 (macOS)

## 輪替診斷檔案記錄 (偵錯窗格)

OpenClaw 透過 swift-log (預設為統一記錄) 路由 macOS 應用程式記錄，並且當您需要持久擷取時，可以將本地的輪替檔案記錄寫入磁碟。

- 詳細程度：**偵錯窗格 → Logs → App logging → Verbosity**
- 啟用：**偵錯窗格 → Logs → App logging → “Write rolling diagnostics log (JSONL)”**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl` (自動輪替；舊檔案會加上 `.1`、`.2` 等後綴)
- 清除：**偵錯窗格 → Logs → App logging → “Clear”**

備註：

- 這項功能**預設為關閉**。僅在進行主動偵錯時啟用。
- 請將此檔案視為敏感資料；未經審查切勿分享。

## macOS 上的統一記錄私人資料

除非子系統選擇加入 `privacy -off`，否則統一記錄會編修大多數負載內容。根據 Peter 關於 macOS [記錄隱私惡作劇](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025) 的文章，這是由 `/Library/Preferences/Logging/Subsystems/` 中的 plist 檔案控制的，該檔案以子系統名稱為鍵。只有新的記錄項目會套用該標誌，因此請在重現問題之前啟用它。

## 為 OpenClaw 啟用 (`ai.openclaw`)

- 先將 plist 寫入暫存檔，然後以 root 身分原子性地安裝它：

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

- 不需要重新開機；logd 會很快注意到該檔案，但只有新的記錄行會包含私人負載內容。
- 使用現有的輔助工具查看更豐富的輸出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 偵錯完成後停用

- 移除覆寫設定：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 您可以選擇執行 `sudo log config --reload` 以強制 logd 立即捨棄該覆寫設定。
- 請記住，此層面可能包含電話號碼和訊息內容；僅在您主動需要額外細節時才保留該 plist 檔案。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
