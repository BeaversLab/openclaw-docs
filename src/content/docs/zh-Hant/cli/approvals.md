---
summary: "`openclaw approvals` 和 `openclaw exec-policy` 的 CLI 參考資料"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "核准"
---

# `openclaw approvals`

管理 **本地主機**、**閘道主機** 或 **節點主機** 的執行核准。
預設情況下，指令會針對磁碟上的本地核准檔案。使用 `--gateway` 針對閘道，或使用 `--node` 針對特定節點。

別名：`openclaw exec-approvals`

相關：

- 執行核准：[執行核准](/zh-Hant/tools/exec-approvals)
- 節點：[節點](/zh-Hant/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` 是本地便捷指令，用於單步保持請求的
`tools.exec.*` 設定與本地主機核准檔案的同步。

當您想要執行以下操作時請使用：

- 檢查本地請求的原則、主機核准檔案和有效合併
- 套用本地預設值，例如 YOLO 或 deny-all
- 同步本地 `tools.exec.*` 和本地 `~/.openclaw/exec-approvals.json`

範例：

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

輸出模式：

- 無 `--json`：列印人類可讀的表格視圖
- `--json`：列印機器可讀的結構化輸出

目前範圍：

- `exec-policy` 僅限 **本地**
- 它會同時更新本地設定檔和本地核准檔案
- 它**不會**將原則推送到閘道主機或節點主機
- `--host node` 在此指令中會被拒絕，因為節點執行核准是在執行時從節點獲取的，必須改為透過針對節點的核准指令進行管理
- `openclaw exec-policy show` 將 `host=node` 範圍在執行時標記為由節點管理，而不是從本地核准檔案衍生有效原則

如果您需要直接編輯遠端主機核准，請繼續使用 `openclaw approvals set --gateway`
或 `openclaw approvals set --node <id|name|ip>`。

## 常用指令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 現在會顯示針對本地、閘道和節點目標的有效執行原則：

- 請求的 `tools.exec` 原則
- 主機核准檔案原則
- 套用優先順序規則後的實際結果

優先順序是有意的：

- 主機核准檔案是可執行的真實來源
- 請求的 `tools.exec` 政策可以縮小或擴大意圖，但實際結果仍衍生自主機規則
- `--node` 結合了節點主機核准檔案與閘道 `tools.exec` 政策，因為兩者在執行時間仍然適用
- 如果閘道組態無法取得，CLI 會回退到節點核准快照，並指出無法計算最終執行時間政策

## 從檔案取代核准

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` 接受 JSON5，而不僅是嚴格的 JSON。請使用 `--file` 或 `--stdin` 其中之一，不要同時使用。

## "永遠不提示" / YOLO 範例

對於不應該在執行核准時停止的主機，請將主機核准預設值設定為 `full` + `off`：

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

這僅會變更 **主機核准檔案**。若要讓請求的 OpenClaw 政策保持一致，也請設定：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

為什麼在此範例中使用 `tools.exec.host=gateway`：

- `host=auto` 仍然表示「可用時使用沙箱，否則使用閘道」。
- YOLO 是關於核准，而非路由。
- 如果您想要主機執行，即使已設定沙箱，請使用 `gateway` 或 `/exec host=gateway` 明確選擇主機。

這符合目前的主機預設 YOLO 行為。如果您想要核准，請縮小範圍。

本機捷徑：

```bash
openclaw exec-policy preset yolo
```

該本機捷徑會同時更新請求的本機 `tools.exec.*` 組態和
本機核准預設值。其意圖等同於上述的手動兩步驟
設定，但僅適用於本機機器。

## 允許清單輔助工具

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用選項

`get`、`set` 和 `allowlist add|remove` 都支援：

- `--node <id|name|ip>`
- `--gateway`
- 共用的節點 RPC 選項：`--url`、`--token`、`--timeout`、`--json`

指定目標備註：

- 無目標旗標表示磁碟上的本機核准檔案
- `--gateway` 針對閘道主機核准檔案
- `--node` 在解析 id、名稱、IP 或 id 前綴後，針對單個節點主機

`allowlist add|remove` 也支援：

- `--agent <id>` (預設為 `*`)

## 備註

- `--node` 使用與 `openclaw nodes` 相同的解析程式 (id、名稱、ip 或 id 前綴)。
- `--agent` 預設為 `"*"`，這適用於所有代理程式。
- 節點主機必須通告 `system.execApprovals.get/set` (macOS 應用程式或無頭節點主機)。
- 核准檔案按主機儲存在 `~/.openclaw/exec-approvals.json`。
