---
summary: "`openclaw status` 的 CLI 參考（診斷、探測、使用情況快照）"
read_when:
  - 您想要快速診斷通道健康狀況 + 最近的會話接收者
  - 您想要一個可貼上的「全部」狀態用於除錯
title: "status"
---

# `openclaw status`

通道與會話的診斷資訊。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

備註：

- `--deep` 執行即時探測（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 當配置了多個代理時，輸出包含每個代理的會話存儲。
- 概覽（當可用時）包含 Gateway + 節點主機服務的安裝/運行狀態。
- 概覽包含更新通道 + git SHA（針對原始碼檢出）。
- 更新資訊顯示在概覽中；如果有可用的更新，status 會列印提示執行 `openclaw update`（請參閱 [更新](/zh-Hant/install/updating)）。
- 唯讀狀態表面（`status`、`status --json`、`status --all`）會在可能時解析其目標配置路徑支援的 SecretRefs。
- 如果配置了支援的通道 SecretRef 但在當前命令路徑中無法使用，status 將保持唯讀並報告降級輸出，而不是崩潰。人類可讀輸出顯示諸如「此命令路徑中無法使用已配置的令牌」之類的警告，而 JSON 輸出包含 `secretDiagnostics`。
- 當命令本地 SecretRef 解析成功時，status 優先使用解析後的快照，並從最終輸出中清除臨時的「secret unavailable」通道標記。
- `status --all` 包含一個 Secrets 概覽列和一個診斷部分，該部分總結了 secret 診斷資訊（為了可讀性而被截斷），而不會停止報告生成。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
