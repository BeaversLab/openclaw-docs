---
summary: "使用 Nix 宣告式安裝 OpenClaw"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

# Nix 安裝

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 宣告式安裝 OpenClaw —— 一個功能齊全的 Home Manager 模組。

<Info>[nix-openclaw](https://github.com/openclaw/nix-openclaw) 儲存庫是 Nix 安裝的權威來源。本頁面僅提供快速概覽。</Info>

## 您將獲得

- Gateway + macOS 應用程式 + 工具 —— 全部鎖定版本
- 可在重啟後存活的 Launchd 服務
- 具有宣告式配置的插件系統
- 即時回滾：`home-manager switch --rollback`

## 快速開始

<Steps>
  <Step title="安裝 Determinate Nix">如果尚未安裝 Nix，請依照 [Determinate Nix installer](https://github.com/DeterminateSystems/nix-installer) 的指示操作。</Step>
  <Step title="建立本地 flake">使用來自 nix-openclaw 儲存庫的 agent-first 樣板： ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="設定 secrets">設定您的訊息機器人權杖和模型提供者 API 金鑰。位於 `~/.secrets/` 的純文字檔案即可。</Step>
  <Step title="填寫樣板預留位置並切換">```bash home-manager switch ```</Step>
  <Step title="Verify">確認 launchd 服務正在運行，且您的機器人會回應訊息。</Step>
</Steps>

請參閱 [nix-openclaw README](https://github.com/openclaw/nix-openclaw) 以了解完整的模組選項和範例。

## Nix 模式運行時行為

當設定 `OPENCLAW_NIX_MODE=1` 時（使用 nix-openclaw 會自動設定），OpenClaw 會進入一種停用自動安裝流程的確定性模式。

您也可以手動設定它：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 應用程式不會自動繼承 shell 環境變數。請改透過 defaults 啟用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式下的變更

- 自動安裝和自我變更流程已停用
- 缺失的依賴項會顯示 Nix 特定的修復訊息
- UI 會顯示唯讀的 Nix 模式橫幅

### 配置和狀態路徑

OpenClaw 從 `OPENCLAW_CONFIG_PATH` 讀取 JSON5 配置，並將可變數據存儲在 `OPENCLAW_STATE_DIR` 中。在 Nix 下運行時，將這些顯式設置為 Nix 管理的位置，以便運行時狀態和配置不會進入不可變存儲。

| 變量                   | 預設值                                  |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

## 相關

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- 完整設置指南
- [Wizard](/en/start/wizard) -- 非 Nix CLI 設置
- [Docker](/en/install/docker) -- 容器化設置
