---
summary: "ClawHub 發布作業如何針對技能、外掛、擁有者、範圍、版本及審查運作。"
read_when:
  - Publishing a skill or plugin
  - Debugging owner or package scope errors
  - Adding publish UI, CLI, or backend behavior
---

# 在 ClawHub 上發布

ClawHub 發布作業是以擁有者為範圍的：每次發布都會以發布者為目標，而伺服器會決定登入的使用者是否允許在該處發布。

## 擁有者

擁有者是一個 ClawHub 發布者代號，例如 `@alice` 或 `@openclaw`。
個人擁有者是為使用者建立的。組織擁有者可以有多個成員。

當您發布時，您可以使用您的個人擁有者，或是選擇一個您具有發布權限的組織擁有者。

## 技能

技能是從技能資料夾發布的。公開頁面為：

```text
https://clawhub.ai/<owner>/<slug>
```

範例：

```text
https://clawhub.ai/alice/review-helper
```

發布請求包含選定的擁有者、Slug、版本、變更記錄和檔案。伺服器會在建立版本之前，驗證操作者是否能以該擁有者身分發布。

## 外掛

外掛使用 npm 風格的套件名稱。範圍套件名稱在名稱的第一部分包含擁有者：

```text
@owner/package-name
```

範圍必須符合選定的發布擁有者。如果您的套件名稱是 `@openclaw/dronzer`，它只能以 `@openclaw` 的身分發布。如果您以 `@vintageayu` 的身分發布，請將套件重新命名為 `@vintageayu/dronzer`。

這可以防止套件聲稱發布者不控制的組織命名空間。

## 發布流程

1. UI、CLI 或 GitHub 工作流程會收集套件中繼資料和檔案。
2. 發布請求隨同選定的擁有者傳送至 ClawHub。
3. 伺服器會驗證擁有者權限、套件範圍、套件名稱、版本、檔案限制和來源中繼資料。
4. ClawHub 會儲存該版本並啟動自動化安全性檢查。
5. 新版本在審查和驗證完成之前，會在一般安裝/下載介面上隱藏。

如果驗證失敗，則不會建立版本。

## 常見問題

### 套件範圍必須符合選定的擁有者

如果套件範圍與選定的擁有者不符，ClawHub 會拒絕發布：

```text
Package scope "@openclaw" must match selected owner "@vintageayu".
Publish as "@openclaw" or rename this package to "@vintageayu/dronzer".
```

若要修正此問題，請選擇以套件範圍命名的擁有者，或是重新命名套件，使範圍符合您可以發布的擁有者。

如果套件名稱已經具有正確的範圍，但套件歸錯誤的發布者所有，請改為轉移擁有權：

```sh
clawhub package transfer @opik/opik-openclaw --to opik
```

僅當您對目前套件擁有者和目標發布者都具有管理員權限時，才使用套件轉移。它不允許您發布到您無法管理的範圍。

這是為了保護組織命名空間。名為 `@openclaw/dronzer` 的套件聲稱了 `@openclaw` 命名空間，因此只有擁有 `@openclaw` 擁有者存取權的發布者才能發布它。
