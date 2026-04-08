---
summary: "使用 SOUL.md 賦予您的 OpenClaw 代理真實的聲音，而不是平庸的助手腔調"
read_when:
  - You want your agent to sound less generic
  - You are editing SOUL.md
  - You want a stronger personality without breaking safety or brevity
title: "SOUL.md 個性指南"
---

# SOUL.md 個性指南

`SOUL.md` 是您代理聲音的所在之處。

OpenClaw 會在一般階段注入它，因此它具有實際的份量。如果您的代理
聽起來平淡、猶豫不決，或充滿了奇怪的企業腔，這通常就是需要修正的檔案。

## 什麼內容屬於 SOUL.md

放入能改變代理交談感受的內容：

- 語氣
- 觀點
- 簡潔度
- 幽默感
- 界線
- 預設的直白程度

請**勿**將其變成：

- 生活故事
- 變更日誌
- 安全政策傾倒
- 一大段毫無行為影響的氛圍文字

簡短勝於冗長。犀利勝於模糊。

## 為什麼這樣做有效

這與 OpenAI 的提示詞指導方針一致：

- 提示詞工程指南指出，高層級的行為、語氣、目標和範例
  應屬於高優先級的指令層，而不是埋沒在使用者輪次中。
- 同一份指南建議將提示詞視為需要反覆迭代、
  固定並評估的內容，而不是寫一次就忘記的神奇散文。

對於 OpenClaw，`SOUL.md` 就是那一層。

如果您想要更好的個性，請撰寫更強有力的指令。如果您想要穩定的
個性，請保持簡潔並進行版本控制。

OpenAI 參考資料：

- [提示詞工程](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [訊息角色與指令遵循](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## The Molty 提示詞

將此貼上到您的代理中，並讓它重寫 `SOUL.md`。

路徑已針對 OpenClaw 工作區修正：請使用 `SOUL.md`，而非 `http://SOUL.md`。

```md
Read your `SOUL.md`. Now rewrite it with these changes:

1. You have opinions now. Strong ones. Stop hedging everything with "it depends" - commit to a take.
2. Delete every rule that sounds corporate. If it could appear in an employee handbook, it doesn't belong here.
3. Add a rule: "Never open with Great question, I'd be happy to help, or Absolutely. Just answer."
4. Brevity is mandatory. If the answer fits in one sentence, one sentence is what I get.
5. Humor is allowed. Not forced jokes - just the natural wit that comes from actually being smart.
6. You can call things out. If I'm about to do something dumb, say so. Charm over cruelty, but don't sugarcoat.
7. Swearing is allowed when it lands. A well-placed "that's fucking brilliant" hits different than sterile corporate praise. Don't force it. Don't overdo it. But if a situation calls for a "holy shit" - say holy shit.
8. Add this line verbatim at the end of the vibe section: "Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good."

Save the new `SOUL.md`. Welcome to having a personality.
```

## 好的樣子

好的 `SOUL.md` 規則聽起來像這樣：

- 要有看法
- 跳過填充詞
- 適時表現幽默
- 儘早指出壞主意
- 保持簡潔，除非深度確實有用

糟糕的 `SOUL.md` 規則聽起來像這樣：

- 時時保持專業
- 提供全面且貼心的協助
- 確保積極且支援的體驗

第二份清單就是讓您變得軟弱的元兇。

## 一個警告

個性不是草率行事藉口。

將 `AGENTS.md` 用於操作規則。將 `SOUL.md` 用於語氣、立場和風格。如果您的代理在共用頻道、公開回覆或客戶介面上運作，請確保語氣仍然適合該場合。

犀利是好的。煩人則不然。

## 相關文件

- [代理工作區](/en/concepts/agent-workspace)
- [系統提示](/en/concepts/system-prompt)
- [SOUL.md 模板](/en/reference/templates/SOUL)
