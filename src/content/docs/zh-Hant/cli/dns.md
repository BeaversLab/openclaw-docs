---
summary: "CLI 參考手冊（廣域發現輔助工具） `openclaw dns`"
read_when:
  - You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS
  - You’re setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: "dns"
---

# `openclaw dns`

用於廣域發現（Tailscale + CoreDNS）的 DNS 輔助工具。目前主要針對 macOS + Homebrew CoreDNS。

相關主題：

- 閘道探索：[探索](/zh-Hant/gateway/discovery)
- 廣域探索設定：[設定](/zh-Hant/gateway/configuration)

## 設定

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

## `dns setup`

規劃或套用 CoreDNS 設定以進行單播 DNS-SD 探索。

選項：

- `--domain <domain>`：廣域探索網域（例如 `openclaw.internal`）
- `--apply`：安裝或更新 CoreDNS 設定並重新啟動服務（需要 sudo；僅限 macOS）

顯示內容：

- 已解析的探索網域
- 區域檔案路徑
- 目前的 tailnet IP
- 建議的 `openclaw.json` 探索設定
- 要設定的 Tailscale Split DNS 名稱伺服器/網域值

備註：

- 如果沒有 `--apply`，此指令僅作為規劃輔助工具，並會列印建議的設定。
- 如果省略 `--domain`，OpenClaw 會使用設定中的 `discovery.wideArea.domain`。
- `--apply` 目前僅支援 macOS，且預期使用 Homebrew CoreDNS。
- `--apply` 會視需要建立區域檔案，確保 CoreDNS 匯入 stanza 存在，並重新啟動 `coredns` brew 服務。
