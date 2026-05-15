---
summary: "安全地更新 OpenClaw（全域安裝或原始碼），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

保持 OpenClaw 為最新狀態。

## 建議使用：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git），取得最新版本，執行 `openclaw doctor`，然後重新啟動 gateway。

```bash
openclaw update
```

若要切換頻道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`openclaw update` 不接受 `--verbose`。若要進行更新診斷，請使用
`--dry-run` 預覽計畫操作，`--json` 取得結構化結果，或
`openclaw update status --json` 檢查通道和可用性狀態。安裝程式有其自己的
`--verbose` 標誌，但該標誌並非 `openclaw update` 的一部分。

`--channel beta` 偏好 beta，但當 beta 標籤缺失或比最新的穩定版舊時，執行時
會退回至 stable/latest。如果您想要一次性套件更新的原始 npm beta dist-tag，請使用
`--tag beta`。

請參閱 [開發通道](/zh-Hant/install/development-channels) 以了解通道語意。

## 在 npm 和 git 安裝之間切換

當您想要變更安裝類型時，請使用通道。更新程式會將您的狀態、設定、
憑證和工作區保留在 `~/.openclaw` 中；它僅會變更 CLI 和 gateway
所使用的 OpenClaw 程式碼安裝。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

請先使用 `--dry-run` 執行，以預覽確切的安裝模式切換：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 通道會確保進行 git checkout，進行建構，並從該 checkout
安裝全域 CLI。`stable` 和 `beta` 通道則使用套件安裝。
如果 gateway 已安裝，除非您傳遞 `--no-restart`，否則 `openclaw update`
會重新整理服務中繼資料並重新啟動服務。

## 替代方案：重新執行安裝程式

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

加入 `--no-onboard` 以跳過入門導覽。若要透過安裝程式強制執行特定
安裝類型，請傳遞 `--install-method git --no-onboard` 或
`--install-method npm --no-onboard`。

如果在 npm 套件安裝階段後 `openclaw update` 失敗，請重新執行
安裝程式。安裝程式不會呼叫舊的更新程式；它會直接執行全域
套件安裝，並可以恢復部分更新的 npm 安裝。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

若要將恢復作業鎖定至特定版本或分發標籤，請新增 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 替代方案：手動 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

對於受監管的安裝，建議優先使用 `openclaw update`，因為它可以協調
與執行中的 Gateway 服務進行套件交換。如果您在受管理的 Gateway 執行時
手動更新，請在套件管理員完成後立即重新啟動 Gateway，以免舊程序繼續
從已取代的套件檔案中提供服務。

當 `openclaw update` 管理全域 npm 安裝時，它會先將目標安裝到
暫時的 npm 前綴中，驗證打包的 `dist` 清單，然後將
乾淨的套件樹交換到實際的全域前綴中。這避免了 npm 將新套件
覆蓋在舊套件的過時檔案上。如果安裝指令失敗，
OpenClaw 會使用 `--omit=optional` 重試一次。該重試有助於原生
選用相依性無法編譯的主機，同時若後備方案也失敗，則保留
原始失敗的可見性。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 進階 npm 安裝主題

<AccordionGroup>
  <Accordion title="唯讀套件樹">
    OpenClaw 在執行時期會將打包的全域安裝視為唯讀，即使全域套件目錄可由當前使用者寫入。外掛程式套件安裝位於使用者設定目錄下 OpenClaw 擁有的 npm/git 根目錄中，且 Gateway 啟動不會變更 OpenClaw 套件樹。

    某些 Linux npm 設定會將全域套件安裝在 root 擁有的目錄下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 支援該配置，因為外掛程式安裝/更新指令會在該全域套件目錄之外進行寫入。

  </Accordion>
  <Accordion title="強化 systemd 單元">
    授予 OpenClaw 對其設定/狀態根目錄的寫入權限，以便明確的外掛程式安裝、外掛程式更新和 doctor 清理可以保存其變更：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="磁碟空間預檢">
    在套件更新和明確的插件安裝之前，OpenClaw 會嘗試對目標卷進行盡力的磁碟空間檢查。空間不足會產生帶有已檢查路徑的警告，但不會阻擋更新，因為檔案系統配額、快照和網路卷在檢查後可能會變化。實際的套件管理器安裝和安裝後驗證仍然具有決定性。
  </Accordion>
</AccordionGroup>

## 自動更新程式

自動更新程式預設為關閉。在 `~/.openclaw/openclaw.json` 中啟用它：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| 通道     | 行為                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| `stable` | 等待 `stableDelayHours`，然後在 `stableJitterHours` 內套用決定性抖動（分階段推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 檢查一次（預設：每小時）並立即套用。                   |
| `dev`    | 不自動套用。手動使用 `openclaw update`。                                             |

閘道還會在啟動時記錄更新提示（使用 `update.checkOnStart: false` 禁用）。
若要降級或進行事件復原，請在閘道環境中設定 `OPENCLAW_NO_AUTO_UPDATE=1` 以阻擋自動套用，即使已設定 `update.auto.enabled`。除非同時停用 `update.checkOnStart`，否則啟動更新提示仍可執行。

透過即時 Gateway 控制平面處理程序請求的套件管理器更新，會在套件交換後強制執行非延遲、無冷卻的更新重新啟動。這可避免讓舊的記憶體內進程停留太久，以至於從已被替換的套件樹延遲載入區塊。Shell `openclaw update` 仍為受監管安裝的首選路徑，因為它可以在更新期間停止並重新啟動服務。

## 更新後

<Steps>

### 執行 Doctor

```bash
openclaw doctor
```

遷移設定、稽核 DM 原則並檢查閘道健康狀況。詳情：[Doctor](/zh-Hant/gateway/doctor)

### 重新啟動閘道

```bash
openclaw gateway restart
```

### 驗證

```bash
openclaw health
```

</Steps>

## 還原

### 固定版本 (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>`npm view openclaw version` 顯示當前已發布的版本。</Tip>

### 固定提交 (來源)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要返回最新版本：`git checkout main && git pull`。

## 如果您遇到困難

- 再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 對於原始碼結帳上的 `openclaw update --channel dev`，更新程式會在需要時自動啟動 `pnpm`。如果您看到 pnpm/corepack 啟動錯誤，請手動安裝 `pnpm`（或重新啟用 `corepack`）並重新執行更新。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中提問：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相關

- [安裝概覽](/zh-Hant/install)：所有安裝方法。
- [Doctor](/zh-Hant/gateway/doctor)：更新後的健康檢查。
- [遷移](/zh-Hant/install/migrating)：主要版本遷移指南。
