---
summary: "OpenClaw 日誌記錄：輪替診斷檔案日誌 + 統一日誌隱私旗標"
read_when:
  - Capturing macOS logs or investigating private data logging
  - Debugging voice wake/session lifecycle issues
title: "macOS 日誌記錄"
---

# 日誌記錄

## 輪替診斷檔案日誌（除錯面板）

OpenClaw 透過 swift-log（預設為統一日誌）路由 macOS 應用程式日誌，並且當您需要持久擷取時，可以將本機輪替檔案日誌寫入磁碟。

- 詳細程度：**除錯面板 → 日誌 → 應用程式日誌 → 詳細程度**
- 啟用：**除錯面板 → 日誌 → 應用程式日誌 → 「寫入輪替診斷日誌」**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`（自動輪替；舊檔案後綴為 `.1`、`.2`，……）
- 清除：**除錯面板 → 日誌 → 應用程式日誌 → 「清除」**

備註：

- 這項功能**預設為關閉**。僅在主動除錯期間啟用。
- 請將此檔案視為敏感資訊；未經審查請勿分享。

## macOS 上的統一記錄私有資料

統一記錄會編輯大多數負載內容，除非子系統選擇加入 `privacy -off`。根據 Peter 關於 macOS [記錄隱私權亂象](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025) 的文章，這是由 `/Library/Preferences/Logging/Subsystems/` 中以子系統名稱為鍵值的 plist 所控制。只有新的記錄項目會套用該標誌，因此在重現問題前請先啟用它。

## 為 OpenClaw (`ai.openclaw`) 啟用

- 先將 plist 寫入暫存檔，然後以 root 權限透過原子操作安裝它：

```exec
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

- 不需要重新開機；logd 會很快注意到該檔案，但只有新的記錄行會包含私有負載。
- 使用現有的輔助工具查看更豐富的輸出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 除錯後停用

- 移除覆寫設定：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 選擇性執行 `sudo log config --reload` 以強制 logd 立即捨棄覆寫設定。
- 請記得此介面可能包含電話號碼與訊息內容；請僅在您實際需要額外細節時保留該 plist 檔案。
