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

## 你將獲得

- Gateway + macOS 應用程式 + 工具 —— 全部鎖定版本
- 重啟後仍會存活的 Launchd 服務
- 具有宣告式配置的外掛系統
- 即時回滾： `home-manager switch --rollback`

## 快速入門

<Steps>
  <Step title="安裝 Determinate Nix">如果尚未安裝 Nix，請遵循 [Determinate Nix 安裝程式](https://github.com/DeterminateSystems/nix-installer) 的說明。</Step>
  <Step title="建立本地 flake">使用 nix-openclaw repo 中的 agent-first 樣板： ```exec mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="設定 secrets">設定您的傳訊機器人 token 和模型提供者 API 金鑰。位於 `~/.secrets/` 的純文字檔案即可。</Step>
  <Step title="填寫樣板預留位置並切換">```exec home-manager switch ```</Step>
  <Step title="Verify">確認 launchd 服務正在運行，且您的機器人會回應訊息。</Step>
</Steps>

請參閱 [nix-openclaw README](https://github.com/openclaw/nix-openclaw) 以了解完整的模組選項與範例。

## Nix 模式執行時期行為

當設定 `OPENCLAW_NIX_MODE=1` 時（使用 nix-openclaw 會自動設定），OpenClaw 會進入一個停用自動安裝流程的確定性模式。

您也可以手動進行設定：

```exec
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 應用程式不會自動繼承 shell 環境變數。請改用 defaults 啟用 Nix 模式：

```exec
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式中的變更

- 自動安裝與自我修改流程已停用
- 遺失相依套件會顯示 Nix 專屬的修復訊息
- UI 會顯示唯讀的 Nix 模式橫幅

### 組態與狀態路徑

OpenClaw 從 `OPENCLAW_CONFIG_PATH` 讀取 JSON5 設定，並將可變資料儲存在 `OPENCLAW_STATE_DIR` 中。在 Nix 下執行時，請將這些明確設定為 Nix 管理的位置，以便執行時狀態和設定不會進入不可變的儲存庫中。

| 變數                   | 預設值                                  |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

## 相關

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- 完整安裝指南
- [精靈](/zh-Hant/start/wizard) -- 非 Nix CLI 安裝
- [Docker](/zh-Hant/install/docker) -- 容器化安裝
