---
summary: "CLI 參考資料，用於 `openclaw setup` (初始化設定檔 + 工作區)"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "安裝"
---

# `openclaw setup`

初始化基線配置和代理工作區，而不執行完整的引導式入職流程。

<Note>`openclaw setup` 適用於可變配置安裝。在 Nix 模式下（`OPENCLAW_NIX_MODE=1`），OpenClaw 會拒絕設定寫入，因為配置檔案是由 Nix 管理的。代理應使用第一方 [nix-openclaw 快速開始](https://github.com/openclaw/nix-openclaw#quick-start) 或其他 Nix 套件的對應來源配置。</Note>

相關：

- 開始使用：[開始使用](/zh-Hant/start/getting-started)
- CLI 入職：[入職 (CLI)](/zh-Hant/start/wizard)

## 範例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 選項

- `--workspace <dir>`：代理工作區目錄（儲存為 `agents.defaults.workspace`）
- `--wizard`：執行入職
- `--non-interactive`：執行入職而不提示
- `--mode <local|remote>`：入職模式
- `--import-from <provider>`：在入職期間執行的遷移提供者
- `--import-source <path>`：`--import-from` 的來源代理主目錄
- `--import-secrets`：在入職遷移期間匯入支援的機密
- `--remote-url <url>`：遠端 Gateway WebSocket URL
- `--remote-token <token>`：遠端 Gateway 權杖

若要透過 setup 執行入職：

```bash
openclaw setup --wizard
```

備註：

- 單純的 `openclaw setup` 會初始化配置 + 工作區，而不包含完整的入職流程。
- 在單純設定之後，執行 `openclaw onboard` 以進行完整的引導式旅程，執行 `openclaw configure` 以進行特定變更，或執行 `openclaw channels add` 以新增頻道帳戶。
- 當存在任何入職旗標時，入職會自動執行（`--wizard`、`--non-interactive`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`）。
- 如果偵測到 Hermes 狀態，互動式入職可以自動提供遷移。匯入入職需要全新的設定；在入職之外，請使用 [Migrate](/zh-Hant/cli/migrate) 進行試執行計畫、備份和覆寫模式。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [安裝概覽](/zh-Hant/install)
