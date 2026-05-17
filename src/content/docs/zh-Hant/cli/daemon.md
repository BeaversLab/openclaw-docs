---
summary: "CLI 參考，用於 `openclaw daemon`（閘道服務管理的舊版別名）"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "Daemon"
---

# `openclaw daemon`

閘道服務管理命令的舊版別名。

`openclaw daemon ...` 對應到與 `openclaw gateway ...` 服務命令相同的服務控制介面。

## 用法

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## 子命令

- `status`：顯示服務安裝狀態並探查閘道健康狀況
- `install`：安裝服務 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服務
- `start`：啟動服務
- `stop`：停止服務
- `restart`：重新啟動服務

## 常用選項

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- `restart`：`--safe`、`--skip-deferral`、`--force`、`--wait <duration>`、`--json`
- lifecycle (`uninstall|start|stop`)：`--json`

備註：

- `status` 會在可行時為探測認證解析已設定的認證 SecretRefs。
- 如果在這個指令路徑中所需的認證 SecretRef 未被解析，當探測連線/認證失敗時，`daemon status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探測成功，會抑制未解析的 auth-ref 警告以避免誤報。
- `status --deep` 會新增一個盡力而為的系統層級服務掃描。當它發現其他類似 gateway 的服務時，人類可讀的輸出會列印清理提示，並警告每台機器一個 gateway 仍然是正常的建議。
- `status --deep` 也會在感知外掛模式下執行配置驗證，並顯示已配置的外掛清單警告（例如缺少通道配置元資料），以便安裝和更新冒煙測試能捕捉到這些問題。預設的 `status` 會保留跳過外掛驗證的快速唯讀路徑。
- 在 Linux systemd 安裝中，`status` 權杖漂移檢查包含 `Environment=` 和 `EnvironmentFile=` 單元來源。
- 漂移檢查會使用合併的執行時環境（優先使用服務指令環境，然後是進程環境回退）來解析 `gateway.auth.token` SecretRefs。
- 如果權杖驗證未有效啟用（顯式設定 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或未設定模式且密碼可能獲勝而沒有權杖候選者能獲勝），權杖漂移檢查將跳過配置權杖解析。
- 當權杖驗證需要權杖且 `gateway.auth.token` 由 SecretRef 管理時，`install` 會驗證 SecretRef 是否可解析，但不會將解析出的權杖保存到服務環境元資料中。
- 如果權杖驗證需要權杖且已配置的權杖 SecretRef 未解析，安裝將會失敗並關閉。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將被阻擋，直到明確設定模式為止。
- 在 macOS 上，`install` 會將 LaunchAgent plists 保持為僅擁有者可讀寫，並透過僅擁有者可讀寫的檔案和包裝程式載入受管理的服務環境值，而不是將 API 金鑰或驗證設定檔環境引用序列化到 `EnvironmentVariables` 中。
- 如果您有意在同一台主機上執行多個閘道，請隔離連接埠、配置/狀態和工作區；請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。
- `restart --safe` 會要求正在執行的閘道對活動工作進行預檢，並在活動工作排出後排程一次合併重新啟動。普通的 `restart` 保留現有的服務管理器行為；`--force` 仍然是立即覆寫路徑。
- `restart --safe --skip-deferral` 會執行感知 OpenClaw 的安全重啟，但會繞過活動工作延遲閘門，因此即使回報了阻礙項目，Gateway 也會立即發出重啟。當卡住的任務執行導致無法安全重啟時，操作員的緊急應變措施；需要 `--safe`。

## 建議改用

請使用 [`openclaw gateway`](/zh-Hant/cli/gateway) 查看最新文件和範例。

## 相關連結

- [CLI 參考資料](/zh-Hant/cli)
- [Gateway 操作手冊](/zh-Hant/gateway)
