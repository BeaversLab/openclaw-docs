---
summary: "使用 Nix 宣告式安裝 OpenClaw"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 宣告式地安裝 OpenClaw —— 這是一個功能齊全的 Home Manager 模組。

<Info>[nix-openclaw](https://github.com/openclaw/nix-openclaw) repo 是 Nix 安裝的權威來源。本頁面是一個快速概覽。</Info>

## 你將獲得

- Gateway + macOS 應用程式 + 工具 (whisper, spotify, cameras) —— 全部鎖定版本
- 能夠在重啟後存活的 Launchd 服務
- 具有宣告式配置的外掛系統
- 即時回滾：`home-manager switch --rollback`

## 快速開始

<Steps>
  <Step title="安裝 Determinate Nix">如果尚未安裝 Nix，請依照 [Determinate Nix installer](https://github.com/DeterminateSystems/nix-installer) 的指示操作。</Step>
  <Step title="建立本地 flake">使用 nix-openclaw repo 中的 agent-first 範本： ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="設定 secrets">設定您的訊息 bot token 和模型提供商 API key。位於 `~/.secrets/` 的純文字檔案即可。</Step>
  <Step title="填寫範本預留位置並切換">```bash home-manager switch ```</Step>
  <Step title="驗證">確認 launchd 服務正在運行，且您的 bot 能回應訊息。</Step>
</Steps>

請參閱 [nix-openclaw README](https://github.com/openclaw/nix-openclaw) 以了解完整的模組選項和範例。

## Nix 模式執行時期行為

當設定 `OPENCLAW_NIX_MODE=1` 時（使用 nix-openclaw 時自動設定），OpenClaw 會進入一個停用自動安裝流程的確定性模式。

您也可以手動進行設定：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 應用程式不會自動繼承 shell 環境變數。請改用 defaults 來啟用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式下的變更

- 自動安裝和自我變異流程已停用
- 遺失相依性會顯示 Nix 專屬的修補訊息
- UI 會顯示唯讀的 Nix 模式橫幅

### 配置與狀態路徑

OpenClaw 從 `OPENCLAW_CONFIG_PATH` 讀取 JSON5 設定，並將可變數據存儲在 `OPENCLAW_STATE_DIR` 中。在 Nix 下運行時，請將這些顯式設置為 Nix 管理的位置，以便運行時狀態和設定不會進入不可變存儲（store）。

| 變數                   | 預設值                                  |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### 服務 PATH 發現

launchd/systemd 閘道服務會自動發現 Nix-profile 二進位檔，因此透過 shell 呼叫 `nix` 安裝的可執行檔的外掛和工具無需手動設定 PATH 即可運作：

- 設置 `NIX_PROFILES` 後，每個條目都會按從右到左的優先級添加到服務 PATH 中（與 Nix shell 優先級相符——最右側的優先）。
- 未設置 `NIX_PROFILES` 時，將 `~/.nix-profile/bin` 作為後備添加。

這適用於 macOS launchd 和 Linux systemd 服務環境。

## 相關

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- 完整設定指南
- [精靈 (Wizard)](/zh-Hant/start/wizard) -- 非 Nix CLI 設定
- [Docker](/zh-Hant/install/docker) -- 容器化設定
