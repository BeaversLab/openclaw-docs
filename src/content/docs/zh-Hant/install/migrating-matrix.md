---
summary: "OpenClaw 如何就地升級先前的 Matrix 外掛程式，包括加密狀態復原限制和手動復原步驟。"
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Matrix 遷移"
---

# Matrix 遷移

本頁面涵蓋從先前的公用 `matrix` 外掛程式升級至目前實作版本的內容。

對於大多數使用者而言，升級是就地進行的：

- 外掛程式保持 `@openclaw/matrix`
- 頻道保持 `matrix`
- 您的設定保持在 `channels.matrix` 之下
- 快取的憑證保持在 `~/.openclaw/credentials/matrix/` 之下
- 執行時狀態保持在 `~/.openclaw/matrix/` 之下

您不需要重新命名設定金鑰，或以新名稱重新安裝外掛程式。

## 遷移自動執行的作業

當閘道啟動，以及當您執行 [`openclaw doctor --fix`](/en/gateway/doctor) 時，OpenClaw 會嘗試自動修復舊的 Matrix 狀態。
在任何可執行的 Matrix 遷移步驟變更磁碟狀態之前，OpenClaw 會建立或重用專用的復原快照。

當您使用 `openclaw update` 時，確切的觸發程序取決於 OpenClaw 的安裝方式：

- 原始碼安裝會在更新流程中執行 `openclaw doctor --fix`，然後依預設重新啟動閘道
- 套件管理程式安裝會更新套件，執行非互動式的 doctor 檢查，然後依賴預設的閘道重新啟動，以便啟動程序能完成 Matrix 遷移
- 如果您使用 `openclaw update --no-restart`，啟動時備援的 Matrix 遷移會延後，直到您稍後執行 `openclaw doctor --fix` 並重新啟動閘道

自動遷移涵蓋：

- 在 `~/Backups/openclaw-migrations/` 下建立或重用遷移前快照
- 重用您快取的 Matrix 憑證
- 保持相同的帳戶選擇和 `channels.matrix` 設定
- 將最舊的平面 Matrix 同步存放區移至目前的帳戶範圍位置
- 當可以安全解析目標帳戶時，將最舊的平面 Matrix 加密存放區移至目前的帳戶範圍位置
- 當金鑰在本機存在時，從舊的 rust 加密存放區中擷取先前儲存的 Matrix 房間金鑰備份解密金鑰
- 當存取權杖稍後變更時，針對相同的 Matrix 帳戶、主伺服器和使用者，重複使用最完整的現有權杖雜湊儲存根目錄
- 當 Matrix 存取權杖變更但帳戶/裝置身分保持不變時，掃描同級的權杖雜湊儲存根目錄以尋找待處理的加密狀態還原中繼資料
- 在下次 Matrix 啟動時，將備份的房間金鑰還原到新的加密儲存中

快照詳情：

- OpenClaw 在成功快照後會在 `~/.openclaw/matrix/migration-snapshot.json` 寫入一個標記檔案，以便後續的啟動和修復程序可以重複使用同一個存檔。
- 這些自動 Matrix 遷移快照僅備份設定 + 狀態 (`includeWorkspace: false`)。
- 如果 Matrix 僅具有僅警示的遷移狀態，例如因為 `userId` 或 `accessToken` 仍然缺失，OpenClaw 尚不會建立快照，因為沒有可執行的 Matrix 變更。
- 如果快照步驟失敗，OpenClaw 會跳過該次執行的 Matrix 遷移，而不是在沒有復原點的情況下變更狀態。

關於多帳戶升級：

- 最舊的扁平 Matrix 儲存 (`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`)) 來自單一儲存佈局，因此 OpenClaw 只能將其遷移到一個已解析的 Matrix 帳戶目標
- 已經具有帳戶範圍的舊版 Matrix 儲存會根據每個已設定的 Matrix 帳戶進行偵測和準備

## 遷移無法自動執行的操作

先前的公開 Matrix 外掛**並不會**自動建立 Matrix 房間金鑰備份。它會保存本機加密狀態並請求裝置驗證，但不保證您的房間金鑰已備份到主伺服器。

這意味著某些加密安裝只能部分遷移。

OpenClaw 無法自動復原：

- 從未備份過的僅限本機的房間金鑰
- 當目標 Matrix 帳戶尚無法解析時的加密狀態，因為 `homeserver`、`userId` 或 `accessToken` 仍然無法使用
- 當設定了多個 Matrix 帳戶但未設定 `channels.matrix.defaultAccount` 時，自動遷移一個共用的扁平 Matrix 儲存
- 固定在儲存庫路徑而非標準 Matrix 套件的自訂外掛路徑安裝
- 舊儲存區有備份金鑰但未在本機保留解密金鑰時遺失了復原金鑰

目前警告範圍：

- 自訂 Matrix 外掛路徑安裝會在閘道啟動和 `openclaw doctor` 時顯示

如果您的舊安裝包含從未備份的僅限本機加密歷史記錄，升級後部分較舊的加密訊息可能仍無法讀取。

## 建議升級流程

1. 正常更新 OpenClaw 和 Matrix 外掛。
   建議使用不帶 `--no-restart` 的純 `openclaw update`，以便啟動時能立即完成 Matrix 遷移。
2. 執行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可執行的遷移工作，doctor 會先建立或重複使用遷移前快照，並列印存檔路徑。

3. 啟動或重新啟動閘道。
4. 檢查目前的驗證與備份狀態：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 如果 OpenClaw 提示您需要復原金鑰，請執行：

   ```bash
   openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"
   ```

6. 如果此裝置仍未驗證，請執行：

   ```bash
   openclaw matrix verify device "<your-recovery-key>"
   ```

7. 如果您有意放棄無法復原的舊歷史記錄，並希望為未來的訊息建立全新的備份基準，請執行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

8. 如果尚未存在伺服器端金鑰備份，請建立一個以供日後復原：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 加密遷移運作方式

加密遷移是一個兩階段程序：

1. 如果加密遷移是可執行的，啟動或 `openclaw doctor --fix` 會建立或重複使用遷移前快照。
2. 啟動或 `openclaw doctor --fix` 會透過作用中的 Matrix 外掛安裝檢查舊的 Matrix 加密儲存區。
3. 如果找到備份解密金鑰，OpenClaw 會將其寫入新的復原金鑰流程，並將房間金鑰還原標記為待處理。
4. 在下次 Matrix 啟動時，OpenClaw 會自動將備份的房間金鑰還原至新的加密儲存區。

如果舊儲存區回報從未備份的房間金鑰，OpenClaw 會發出警告，而不是假裝復原成功。

## 常見訊息及其含義

### 升級與偵測訊息

`Matrix plugin upgraded in place.`

- 含義：偵測到舊的磁碟上 Matrix 狀態並已遷移至目前的配置。
- 處理方式：除非相同的輸出也包含警告，否則無需做任何事。

`Matrix migration snapshot created before applying Matrix upgrades.`

- 含義：OpenClaw 在變更 Matrix 狀態前建立了復原存檔。
- 處理方式：在您確認遷移成功之前，請保留列印的存檔路徑。

`Matrix migration snapshot reused before applying Matrix upgrades.`

- 意義：OpenClaw 發現了一個現有的 Matrix 遷移快照標記，並重用了該存檔，而不是建立重複的備份。
- 作法：在確認遷移成功之前，請保留列印出的存檔路徑。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 意義：舊的 Matrix 狀態存在，但 OpenClaw 無法將其對應到目前的 Matrix 帳戶，因為尚未設定 Matrix。
- 作法：設定 `channels.matrix`，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 意義：OpenClaw 發現了舊狀態，但仍無法確定確切的目前帳戶/裝置根目錄。
- 作法：使用有效的 Matrix 登入啟動一次閘道，或在存在快取憑證後重新執行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 意義：OpenClaw 發現了一個共用的扁平 Matrix 存儲，但它拒絕猜測哪個命名的 Matrix 帳戶應該接收它。
- 作法：將 `channels.matrix.defaultAccount` 設定為預期的帳戶，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Matrix legacy sync store not migrated because the target already exists (...)`

- 意義：新的帳戶範圍位置已經有同步或加密存儲，因此 OpenClaw 沒有自動覆寫它。
- 作法：在手動移除或移動衝突目標之前，請驗證目前的帳戶是否正確。

`Failed migrating Matrix legacy sync store (...)` 或 `Failed migrating Matrix legacy crypto store (...)`

- 意義：OpenClaw 嘗試移動舊的 Matrix 狀態，但檔案系統操作失敗。
- 作法：檢查檔案系統權限和磁碟狀態，然後重新執行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- 意義：OpenClaw 發現了一個舊的加密 Matrix 存儲，但沒有目前的 Matrix 設定可以將其附加。
- 作法：設定 `channels.matrix`，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 意義：加密存儲存在，但 OpenClaw 無法安全地決定它屬於哪個目前的帳戶/裝置。
- 作法：使用有效的 Matrix 登入啟動一次閘道，或在快取憑證可用後重新執行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含義：OpenClaw 發現一個共用的舊版平面加密存儲，但它拒絕推測應將其分配給哪個命名的 Matrix 帳戶。
- 解決方法：將 `channels.matrix.defaultAccount` 設定為預期的帳戶，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- 含義：OpenClaw 偵測到舊的 Matrix 狀態，但遷移仍因缺少身分或憑證資料而受阻。
- 解決方法：完成 Matrix 登入或配置設定，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- 含義：OpenClaw 發現舊的加密 Matrix 狀態，但無法從通常檢查該存儲的 Matrix 外掛載入輔助入口點。
- 解決方法：重新安裝或修復 Matrix 外掛（`openclaw plugins install @openclaw/matrix`，或是如果是從 repo checkout，則使用 `openclaw plugins install ./path/to/local/matrix-plugin`），然後重新執行 `openclaw doctor --fix` 或重新啟動 gateway。

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- 含義：OpenClaw 發現一個超出外掛根目錄或未通過外掛邊界檢查的輔助檔案路徑，因此拒絕匯入它。
- 解決方法：從受信任的路徑重新安裝 Matrix 外掛，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- 含義：OpenClaw 拒絕變更 Matrix 狀態，因為它無法先建立還原快照。
- 解決方法：解決備份錯誤，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Failed migrating legacy Matrix client storage: ...`

- 含義：Matrix 用戶端後備機制找到了舊的平面存儲，但移動失敗。OpenClaw 現在會中止該後備機制，而不是靜默地以全新的存儲啟動。
- 解決方法：檢查檔案系統權限或衝突，保持舊狀態完整，並在修正錯誤後重試。

`Matrix is installed from a custom path: ...`

- 含義：Matrix 被釘選到路徑安裝，因此主線更新不會自動將其替換為版本庫的標準 Matrix 套件。
- 解決方法：當您想回到預設 Matrix 外掛時，請使用 `openclaw plugins install @openclaw/matrix` 重新安裝。

### 加密狀態還原訊息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含義：備份的房間金鑰已成功還原至新的加密存儲中。
- 處理方式：通常不需要做任何事。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含義：部分舊的房間金鑰僅存在於舊的本地儲存中，且從未上傳至 Matrix 備份。
- 處理方式：預期部分舊的加密歷史記錄將保持無法存取的狀態，除非您能從其他已驗證的用戶端手動恢復這些金鑰。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key <key>" after upgrade if they have the recovery key.`

- 含義：備份存在，但 OpenClaw 無法自動恢復還原金鑰。
- 處理方式：執行 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含義：OpenClaw 找到了舊的加密儲存，但無法安全地檢查它以準備恢復。
- 處理方式：重新執行 `openclaw doctor --fix`。如果重複出現，請保持舊的狀態目錄完整，並使用其他已驗證的 Matrix 用戶端加上 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 來進行恢復。

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- 含義：OpenClaw 偵測到備份金鑰衝突，並拒絕自動覆寫目前的還原金鑰檔案。
- 處理方式：在重試任何還原指令之前，請先驗證哪個還原金鑰是正確的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含義：這是舊儲存格式的硬體限制。
- 處理方式：已備份的金鑰仍然可以還原，但僅限本地的加密歷史記錄可能仍無法存取。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含義：新外掛程式嘗試還原，但 Matrix 傳回了錯誤。
- 處理方式：執行 `openclaw matrix verify backup status`，然後在需要時使用 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 重試。

### 手動恢復訊息

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- 含義：OpenClaw 知道您應該有備份金鑰，但它在這台裝置上並未啟用。
- 處理方式：執行 `openclaw matrix verify backup restore`，或在需要時傳遞 `--recovery-key`。

`Store a recovery key with 'openclaw matrix verify device <key>', then run 'openclaw matrix verify backup restore'.`

- 含義：此裝置目前未儲存還原金鑰。
- 處理方式：請先使用您的還原金鑰驗證裝置，然後再還原備份。

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device <key>' with the matching recovery key.`

- 含義：儲存的金鑰與目前的 Matrix 備份不符。
- 處理方式：使用正確的金鑰重新執行 `openclaw matrix verify device "<your-recovery-key>"`。

如果您接受失去無法恢復的舊加密歷史記錄，您可以使用 `openclaw matrix verify backup reset --yes` 來重設目前的備份基準線。

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device <key>'.`

- 含義：備份存在，但此裝置尚不足夠信任交叉簽署鏈。
- 處理方式：重新執行 `openclaw matrix verify device "<your-recovery-key>"`。

`Matrix recovery key is required`

- 含義：您嘗試了恢復步驟，但在需要時未提供復原金鑰。
- 處理方式：使用您的復原金鑰重新執行指令。

`Invalid Matrix recovery key: ...`

- 含義：提供的金鑰無法解析或不符合預期格式。
- 處理方式：使用您的 Matrix 客戶端或復原金鑰檔案中的準確復原金鑰重試。

`Matrix device is still unverified after applying recovery key. Verify your recovery key and ensure cross-signing is available.`

- 含義：金鑰已套用，但裝置仍無法完成驗證。
- 處理方式：確認您使用了正確的金鑰，且帳號上啟用了交叉簽署，然後重試。

`Matrix key backup is not active on this device after loading from secret storage.`

- 含義：秘密儲存未在此裝置上產生有效的備份階段。
- 處理方式：先驗證裝置，然後使用 `openclaw matrix verify backup status` 重新檢查。

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device <key>' first.`

- 含義：此裝置在完成裝置驗證之前，無法從秘密儲存恢復。
- 處理方式：先執行 `openclaw matrix verify device "<your-recovery-key>"`。

### 自訂外掛安裝訊息

`Matrix is installed from a custom path that no longer exists: ...`

- 含義：您的外掛安裝記錄指向一個已不存在的本機路徑。
- 解決方法：使用 `openclaw plugins install @openclaw/matrix` 重新安裝，或者如果您是從 repo checkout 執行，則使用 `openclaw plugins install ./path/to/local/matrix-plugin`。

## 如果加密歷史記錄仍然無法恢復

請依序執行這些檢查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
openclaw matrix verify backup restore --recovery-key "<your-recovery-key>" --verbose
```

如果備份成功恢復，但某些舊房間仍然缺少歷史記錄，這些遺失的金鑰可能從未被先前的外掛備份過。

## 如果您想針對未來的訊息重新開始

如果您接受遺失無法恢復的舊加密歷史記錄，並且只想為未來建立乾淨的備份基準，請依序執行這些指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果之後裝置仍然未驗證，請透過比較 SAS 表情符號或十進位代碼，並確認它們相符，從您的 Matrix 客戶端完成驗證。

## 相關頁面

- [Matrix](/en/channels/matrix)
- [Doctor](/en/gateway/doctor)
- [Migrating](/en/install/migrating)
- [Plugins](/en/tools/plugin)
