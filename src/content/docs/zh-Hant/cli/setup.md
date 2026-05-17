---
summary: "`openclaw setup` 的 CLI 參考（初始化設定檔與工作區，並選擇性地執行入門引導）"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
  - You need every flag and how setup decides between baseline and wizard mode
title: "設定"
---

# `openclaw setup`

初始化基準設定檔與代理程式工作區。如果出現任何入門引導旗標，也會執行精靈。

<Note>`openclaw setup` 適用於可變設定檔安裝。在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，OpenClaw 會拒絕寫入設定，因為設定檔是由 Nix 管理。請使用第一方 [nix-openclaw 快速入門](https://github.com/openclaw/nix-openclaw#quick-start) 或其他 Nix 套件的對應來源設定檔。</Note>

## 選項

| 旗標                       | 描述                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | 代理程式工作區目錄（預設 `~/.openclaw/workspace`；儲存為 `agents.defaults.workspace`）。 |
| `--wizard`                 | 執行互動式入門引導。                                                                     |
| `--non-interactive`        | 不提示即執行入門引導。                                                                   |
| `--mode <mode>`            | 入門引導模式：`local` 或 `remote`。                                                      |
| `--import-from <provider>` | 要在入門引導期間執行的移轉提供者。                                                       |
| `--import-source <path>`   | `--import-from` 的來源代理程式家目錄。                                                   |
| `--import-secrets`         | 在入門引導移轉期間匯入支援的機密資訊。                                                   |
| `--remote-url <url>`       | 遠端 Gateway WebSocket URL。                                                             |
| `--remote-token <token>`   | 遠端 Gateway 權杖（選用）。                                                              |

### 精靈自動觸發

`openclaw setup` 當明確出現下列任一旗標時會執行精靈，即使沒有 `--wizard`：

`--wizard`、`--non-interactive`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`。

## 範例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 備註

- 單純的 `openclaw setup` 會初始化設定檔與工作區，而不執行完整的入門引導流程。
- 完成基本設定後，請執行 `openclaw onboard` 以進行完整的引導式流程、執行 `openclaw configure` 進行特定變更，或執行 `openclaw channels add` 以新增頻道帳戶。
- 若偵測到 Hermes 狀態，互動式引導可自動提供遷移選項。匯入引導需要全新的設定；請在引導流程之外使用 [Migrate](/zh-Hant/cli/migrate) 進行試執行計畫、備份與覆寫模式。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Onboarding (CLI)](/zh-Hant/start/wizard)
- [Getting started](/zh-Hant/start/getting-started)
- [安裝概覽](/zh-Hant/install)
