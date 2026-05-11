---
summary: "使用 SOUL.md 賦予您的 OpenClaw 代理真實的聲音，而不是平庸的助手腔調"
read_when:
  - You want your agent to sound less generic
  - You are editing SOUL.md
  - You want a stronger personality without breaking safety or brevity
title: "SOUL.md 個性指南"
---

`SOUL.md` 是您代理語氣所在的地方。

OpenClaw 會在一般會話中注入它，因此它具有實際的權重。如果您的代理聽起來平淡、迴避或奇怪地充滿官僚氣氛，這通常是需要修復的檔案。

## SOUL.md 中應包含什麼

放入那些能改變代理交談感受的內容：

- 語氣
- 觀點
- 簡潔
- 幽默
- 界限
- 預設的直白程度

請**勿**將其變成：

- 生活故事
- 變更日誌
- 傾倒安全策略
- 一大段沒有行為影響的氛围描述

簡短勝於冗長。犀利勝於模糊。

## 為什麼這有效

這與 OpenAI 的提示詞指導一致：

- 提示詞工程指南指出，高層級的行為、語氣、目標和範例屬於高優先級指令層，而不應埋沒在使用者輪次中。
- 同一份指南建議將提示詞視為您反覆迭代、固定和評估的內容，而不是寫一次就忘記的魔法散文。

對於 OpenClaw，`SOUL.md` 就是那一層。

如果您想要更好的個性，請撰寫更強的指令。如果您想要穩定的個性，請保持簡潔並進行版本控制。

OpenAI 參考資料：

- [提示詞工程](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [訊息角色與指令遵循](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## Molty 提示詞

將其貼上到您的代理中，並讓它重寫 `SOUL.md`。

路徑已針對 OpenClaw 工作區修正：請使用 `SOUL.md`，而不是 `http://SOUL.md`。

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

- 要有自己的看法
- 跳過填充詞
- 適時發揮幽默
- 及早指出糟糕的想法
- 保持簡潔，除非深度確實有用

糟糕的 `SOUL.md` 規則聽起來像這樣：

- 隨時保持專業
- 提供全面且周到的協助
- 確保積極且支持的體驗

這第二份清單就是您會變得模糊不清的原因。

## 一個警告

個性不是草率行事的許可。

將 `AGENTS.md` 用於操作規則。將 `SOUL.md` 用於語氣、立場和風格。如果您的代理在共享頻道、公開回覆或客戶介面上工作，請確保語氣仍然適合該場合。

犀利是好的。煩人則不然。

## 相關文件

- [Agent workspace](/zh-Hant/concepts/agent-workspace)
- [System prompt](/zh-Hant/concepts/system-prompt)
- [SOUL.md template](/zh-Hant/reference/templates/SOUL)
