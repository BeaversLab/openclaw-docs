---
summary: "`openclaw approvals` 的 CLI 參考資料（閘道或節點主機的 exec 批准）"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "approvals"
---

# `openclaw approvals`

管理 **本地主機**、**閘道主機** 或 **節點主機** 的 exec 批准。
預設情況下，指令會以磁碟上的本機批准檔案為目標。使用 `--gateway` 以閘道為目標，或使用 `--node` 以特定節點為目標。

別名：`openclaw exec-approvals`

相關：

- Exec 批准：[Exec 批准](/en/tools/exec-approvals)
- 節點：[節點](/en/nodes)

## 常用指令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 現在會顯示針對本地、閘道和節點目標的有效執行政策：

- 請求的 `tools.exec` 政策
- 主機 批准檔案 政策
- 套用優先順序規則後的有效結果

優先順序是刻意設計的：

- 主機批准檔案是可執行的唯一真實來源
- 請求的 `tools.exec` 政策可以縮小或擴大意圖，但有效結果仍衍生自主機規則
- `--node` 結合了節點主機批准檔案與閘道 `tools.exec` 政策，因為兩者在執行時期仍然適用
- 如果無法取得閘道設定，CLI 會回退到節點批准快照，並且註記無法計算最終執行時期政策

## 從檔案取代批准

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` 接受 JSON5，而不僅是嚴格的 JSON。請使用 `--file` 或 `--stdin` 其中之一，不要同時使用。

## "永不提示" / YOLO 範例

對於不應因 exec 批准而停止的主機，請將主機批准預設值設定為 `full` + `off`：

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

節點變體：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

這僅會變更 **主機批准檔案**。若要保持請求的 OpenClaw 政策一致，也請設定：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

為何在此範例中使用 `tools.exec.host=gateway`：

- `host=auto` 仍然表示「可用時使用沙箱，否則使用閘道」。
- YOLO 是關於批准，而非路由。
- 如果您在配置了沙箱的情況下仍希望進行主機執行，請使用 `gateway` 或 `/exec host=gateway` 明確指定主機選項。

這符合當前主機預設的 YOLO 行為。如果您需要審批，請縮小範圍。

## 允許清單輔助工具

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用選項

`get`、`set` 和 `allowlist add|remove` 均支援：

- `--node <id|name|ip>`
- `--gateway`
- 共用的節點 RPC 選項：`--url`、`--token`、`--timeout`、`--json`

指定目標註記：

- 無目標旗標表示本機磁碟上的審批檔案
- `--gateway` 指向閘道主機審批檔案
- `--node` 在解析 id、名稱、IP 或 id 前綴後指向一個節點主機

`allowlist add|remove` 也支援：

- `--agent <id>`（預設為 `*`）

## 註記

- `--node` 使用與 `openclaw nodes` 相同的解析器（id、name、ip 或 id 前綴）。
- `--agent` 預設為 `"*"`，這適用於所有代理程式。
- 節點主機必須廣播 `system.execApprovals.get/set`（macOS app 或無頭節點主機）。
- 每台主機的審批檔案儲存在 `~/.openclaw/exec-approvals.json`。
