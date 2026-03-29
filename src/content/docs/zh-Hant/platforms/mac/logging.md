---
summary: "OpenClaw 記錄：輪替診斷檔案記錄 + 統一記錄隱私旗標"
read_when:
  - Capturing macOS logs or investigating private data logging
  - Debugging voice wake/session lifecycle issues
title: "macOS 記錄"
---

# 記錄

## 輪替診斷檔案記錄

OpenClaw 透過 swift-log (預設為統一記錄) 路由 macOS 應用程式記錄，並且在您需要持久性擷取時，可以將本機輪替檔案記錄寫入磁碟。

- 詳細程度：**Debug pane → Logs → App logging → Verbosity**
- 啟用：**Debug pane → Logs → App logging → “Write rolling diagnostics log (JSONL)”**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl` (自動輪替；舊檔案會附加上 `.1`、`.2`，…)
- 清除：**Debug pane → Logs → App logging → “Clear”**

備註：

- 此功能**預設為關閉**。僅在主動進行除錯時啟用。
- 請將該檔案視為敏感資料；未經審查請勿分享。

## macOS 上的統一記錄私人資料

統一記錄會對大多數 payload 進行編修，除非子系統選擇加入 `privacy -off`。根據 Peter 關於 macOS [logging privacy shenanigans](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025) 的文章，這是由 `/Library/Preferences/Logging/Subsystems/` 中以子系統名稱為鍵的 plist 所控制。只有新的記錄項目會套用該旗標，因此請在重現問題之前啟用它。

## 為 OpenClaw 啟用 (`ai.openclaw`)

- 先將 plist 寫入暫存檔，然後以 root 權限原子性地安裝它：

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

- 不需要重新啟動；logd 會很快注意到該檔案，但只有新的記錄行會包含私人 payload。
- 使用現有的輔助工具查看更豐富的輸出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 除錯後停用

- 移除覆寫：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 您可以選擇執行 `sudo log config --reload` 以強制 logd 立即捨棄該覆寫。
- 請記住，此介面可能包含電話號碼和訊息內容；僅在您主動需要額外細節時才保留該 plist。
