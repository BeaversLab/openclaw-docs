---
summary: "使用 SOUL.md 赋予您的 OpenClaw 代理真正的声音，而不是通用的助手陈词滥调"
read_when:
  - You want your agent to sound less generic
  - You are editing SOUL.md
  - You want a stronger personality without breaking safety or brevity
title: "SOUL.md 个性指南"
---

# SOUL.md 个性指南

`SOUL.md` 是您的代理声音栖息的地方。

OpenClaw 在普通会话中注入它，因此它具有实际的份量。如果您的代理听起来乏味、含糊其辞，或者带有奇怪的企业腔调，这通常是需要修复的文件。

## SOUL.md 中应包含什么

放入那些能改变代理交流感觉的内容：

- 语气
- 观点
- 简洁性
- 幽默感
- 界限
- 默认直率程度

**不要**把它变成：

- 生平故事
- 更新日志
- 安全策略堆砌
- 一大堆没有行为效应的空洞描述

简短胜过长篇。犀利胜过含糊。

## 为什么这样做有效

这与 OpenAI 的提示词指南相一致：

- 提示词工程指南指出，高层级行为、语气、目标和示例属于高优先级指令层，不应埋没在用户轮次中。
- 同一指南建议将提示词视为需要迭代、固定和评估的内容，而不是写一次就忘记的神奇散文。

对于 OpenClaw 来说，`SOUL.md` 就是那个层。

如果您想要更好的个性，请编写更强的指令。如果您想要稳定的个性，请保持它们简洁并进行版本控制。

OpenAI 参考：

- [提示词工程](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [消息角色和指令遵循](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## The Molty 提示词

将其粘贴到您的代理中，让它重写 `SOUL.md`。

路径已针对 OpenClaw 工作空间修正：使用 `SOUL.md`，而不是 `http://SOUL.md`。

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

## 好的标准是什么

好的 `SOUL.md` 规则听起来是这样的：

- 要有主见
- 跳过废话
- 在适当的时候幽默一下
- 尽早指出糟糕的想法
- 保持简洁，除非深度确实有用

糟糕的 `SOUL.md` 规则听起来是这样的：

- 时刻保持专业
- 提供全面且周到的协助
- 确保积极和支持的体验

这第二种列表只会让您的代理变得软弱无力。

## 一个警告

个性不是马虎的借口。

将 `AGENTS.md` 用于操作规则。将 `SOUL.md` 用于语调、立场和
风格。如果您的代理在共享频道、公开回复或客户界面中工作，请确保语调仍然得体。

犀利是好的。令人讨厌则不是。

## 相关文档

- [Agent 工作区](/en/concepts/agent-workspace)
- [系统提示](/en/concepts/system-prompt)
- [SOUL.md 模板](/en/reference/templates/SOUL)
