import type { ByPronoun } from '@shared/pronoun'
import { getLanguage } from '../i18n'

/**
 * Every sentence in this window that is ABOUT her, one phrasing per pronoun.
 *
 * What the panes SAY, kept apart from what they draw.
 *
 * Group NAMES are deliberately mixed in with them rather than kept apart:
 * "Looking things up" and "Keys" are the same words whoever is worn, and
 * writing each three times would put one word in three slots and invite
 * somebody to change one of them. `Pane.label` is therefore `string |
 * ByPronoun`, and `label()` is what reads either kind -- which is the case
 * `pronoun.ts` describes and the reason that function exists.
 */
const SAYS_EN = {
  mayDo: { she: 'What she may do', he: 'What he may do', it: 'What it may do' },
  /*
    Says WHOSE answer this is.

    Permissions became per character in 2026-08 and this pane did not say so, so
    somebody withholding the workspace here would reasonably believe they had
    withheld it everywhere. The switches are the same; what changed is who they
    are about, and a pane that does not say that is a pane that misleads.
  */
  grantInForce: 'in force now',
  grantAtWake: {
    she: 'applies from her next wake',
    he: 'applies from his next wake',
    it: 'applies from its next wake',
  },
  mayDoHead: 'What you permit',
  atOnce: {
    she:
      'Turning one off takes effect at once, and she is told — she will say she can no longer ' +
      'do it rather than quietly failing. Speaking first is the exception: it is decided when ' +
      'she wakes, so that one applies from her next wake.',
    he:
      'Turning one off takes effect at once, and he is told — he will say he can no longer ' +
      'do it rather than quietly failing. Speaking first is the exception: it is decided when ' +
      'he wakes, so that one applies from his next wake.',
    it:
      'Turning one off takes effect at once, and it is told — it will say it can no longer ' +
      'do it rather than quietly failing. Speaking first is the exception: it is decided when ' +
      'it wakes, so that one applies from its next wake.',
  },
  told: {
    she: 'What she is told she can do',
    he: 'What he is told he can do',
    it: 'What it is told it can do',
  },
  noTools: {
    she: 'Nothing. She is offered no tools at all, which is a fault in this build.',
    he: 'Nothing. He is offered no tools at all, which is a fault in this build.',
    it: 'Nothing. It is offered no tools at all, which is a fault in this build.',
  },
  /* The prompts group's own name. It was the one pane label with a pronoun in
     it and it was a bare string, so a character worn as `he` or `it` was
     offered "What she is told" in the nav -- the failure `SettingsView.pronoun`
     describes, in the one place this file exists to prevent it. */
  promptsLabel: {
    she: 'What she is told',
    he: 'What he is told',
    it: 'What it is told',
  },
  /* Said when the pane refuses a selection before main is asked. Main refuses
     it again in words of its own, and deliberately pronoun-free: `applyHearing`
     is a pure checker with no character in hand, and this is the sentence
     somebody actually sees. */
  tooManyLanguages: {
    she: ' languages, or none to let her work it out.',
    he: ' languages, or none to let him work it out.',
    it: ' languages, or none to let it work it out.',
  },
  noLanguages: {
    she:
      'Nothing chosen, so she works out the language herself. Choose only languages that are ' +
      'actually spoken here — a hint for one nobody uses makes the transcript worse, not better.',
    he:
      'Nothing chosen, so he works out the language himself. Choose only languages that are ' +
      'actually spoken here — a hint for one nobody uses makes the transcript worse, not better.',
    it:
      'Nothing chosen, so it works out the language itself. Choose only languages that are ' +
      'actually spoken here — a hint for one nobody uses makes the transcript worse, not better.',
  },
  someLanguages: {
    she: 'A hint, not a restriction. Anything else spoken is still transcribed; these are what she expects.',
    he: 'A hint, not a restriction. Anything else spoken is still transcribed; these are what he expects.',
    it: 'A hint, not a restriction. Anything else spoken is still transcribed; these are what it expects.',
  },
  /* Used by the hearing pane and by the two prompt messages. Nothing on screen
     changes when one of those is saved, so saying when it lands is the whole
     message rather than a footnote to it. */
  nextWake: {
    she: 'It takes effect on her next wake.',
    he: 'It takes effect on his next wake.',
    it: 'It takes effect on its next wake.',
  },
  /* The `0` answer in the rest timer, which is a decision rather than a
     duration -- and the only option in that list with a pronoun in it. */
  restsNever: {
    she: 'never on her own',
    he: 'never on his own',
    it: 'never on its own',
  },
  /* Under the keys, and it says what a reset actually does — deleting the
     stored answer rather than writing today's default in, so the key keeps
     tracking whatever later releases ship. */
  keysReset: {
    she:
      'Reset gives a key back to what the app ships, and keeps it there: it stops being a ' +
      'choice of yours rather than becoming a copy of today\u2019s answer. Both work while she ' +
      'is asleep.',
    he:
      'Reset gives a key back to what the app ships, and keeps it there: it stops being a ' +
      'choice of yours rather than becoming a copy of today\u2019s answer. Both work while he ' +
      'is asleep.',
    it:
      'Reset gives a key back to what the app ships, and keeps it there: it stops being a ' +
      'choice of yours rather than becoming a copy of today\u2019s answer. Both work while it ' +
      'is asleep.',
  },
  /* The hint inside the empty workspace field. Unreachable in practice — the
     workspace always resolves to at least the default — and it keeps the box's
     edge while it is empty, which is what `:placeholder-shown` reads. */
  /* B1's sentence under the workspace picker. It says the LIMIT, not the
     purpose: "the one folder" and "nothing above it" are the two facts a person
     needs to predict what a lookup will answer, and neither was on the page. */
  /* B7's note under what the build stands on. The CJK sentence is the reason
     the list is short: nothing is fetched, and the one thing that would be
     expensive to bundle is deliberately not bundled. */
  /* B2's heading. "Languages spoken" is a heading about the world; this is a
     heading about her, and it is her listening that the setting changes. */
  /* B6's heading over the folders. They were loose rows under a sentence, so a
     reader scanning headings found the destruction below them and nothing above
     them. */
  /* B3's heading over the catalogue. The pane opened straight into the first of
     twenty-seven editors, so it had no name of its own on screen. */
  promptsHead: {
    she: 'What she is told',
    he: 'What he is told',
    it: 'What it is told',
  },
  onDisk: 'On disk',
  languagesHead: {
    she: 'Languages she listens for',
    he: 'Languages he listens for',
    it: 'Languages it listens for',
  },
  interruptibleHead: {
    she: 'Let anyone cut her off',
    he: 'Let anyone cut him off',
    it: 'Let anyone cut it off',
  },
  /* Says WHOSE voice, because the answer is never "yours" -- a microphone
     cannot tell one mouth from another, and the whole reason this switch
     exists is that the second voice in the room is usually not the one she
     belongs to. */
  interruptibleOn: {
    she: 'She stops mid-sentence when any voice is heard — including another child, or another Mochi across the table.',
    he: 'He stops mid-sentence when any voice is heard — including another child, or another Mochi across the table.',
    it: 'It stops mid-sentence when any voice is heard — including another child, or another Mochi across the table.',
  },
  /* The cost is stated in the same breath as the benefit, because it is a real
     one and somebody who is not told will read it as a bug the first time
     their own interjection goes unanswered. */
  interruptibleOff: {
    she: 'She finishes her sentence whoever speaks. Good in a shared room — but your own interruptions may go unheard until she is done.',
    he: 'He finishes his sentence whoever speaks. Good in a shared room — but your own interruptions may go unheard until he is done.',
    it: 'It finishes its sentence whoever speaks. Good in a shared room — but your own interruptions may go unheard until it is done.',
  },
  eagernessHead: {
    she: 'How soon she answers',
    he: 'How soon he answers',
    it: 'How soon it answers',
  },
  eagernessNote: {
    she: 'How long she waits before deciding you have finished. Waiting longer is steadier in a noisy room; waiting less feels quicker at a quiet desk.',
    he: 'How long he waits before deciding you have finished. Waiting longer is steadier in a noisy room; waiting less feels quicker at a quiet desk.',
    it: 'How long it waits before deciding you have finished. Waiting longer is steadier in a noisy room; waiting less feels quicker at a quiet desk.',
  },
  typefaces:
    'Outfit and JetBrains Mono, both under the SIL Open Font License, bundled rather than fetched. CJK comes from the operating system — bundling a face for せんせい would be tens of megabytes to replace what the system already ships.',
  workspaceNote: {
    she: 'The one folder she may read. Nothing above it is reachable.',
    he: 'The one folder he may read. Nothing above it is reachable.',
    it: 'The one folder it may read. Nothing above it is reachable.',
  },
  /*
    Under the profile field when nobody has chosen one.

    The second sentence is B1's and it is a WARNING, not a description: read-only
    confines what Codex may write, and a profile's own MCP servers are outside
    that confinement. Somebody about to type a profile name here should know
    that before they type it, not after.
  */
  profileDefault:
    'Nobody has chosen one, so this is the default. A profile can carry its own MCP servers, which read-only does not confine.',
  /* The same warning, once a profile IS chosen — which is when it matters most,
     and when the sentence above stops being true. */
  profileChosen: 'A profile can carry its own MCP servers, which read-only does not confine.',
  workspacePlaceholder: {
    she: 'a folder she may read',
    he: 'a folder he may read',
    it: 'a folder it may read',
  },
  /* Said after the folder panel, and it NAMES the folder: a picker that
     answered "Saved." alone would leave somebody checking the field to find out
     what they had just agreed to. */
  workspaceSaved: {
    she: 'Saved. She reads ',
    he: 'Saved. He reads ',
    it: 'Saved. It reads ',
  },
  /*
    Where the words in this column come from, and that they are not fixed.

    Every description here is an entry in the prompt catalogue and has been
    rewritable the whole time -- but only from another group, under a title that
    does not obviously cover "what a tool is for". Somebody reading a
    description they disagree with had nothing on screen telling them it could
    be changed, which is `prompts.ts`'s own complaint about the state before
    that pane existed, one pane along.
  */
  /*
    A7's sentence, which answers a different question than the one this used to.

    It opened "Not fixed." — two words that read as an unresolved defect before
    they read as "these words are not immutable", which is the opposite meaning
    and the one somebody reaches first on a page about permissions. A7 leads
    with the fact that explains why the block below is so long, and puts the
    editability in the heading's hint, where it is four words instead of a
    clause.
  */
  toolWording: {
    she:
      'The largest body of text she is given. You can read all of it; the wording lives under ' +
      '"What she is told".',
    he:
      'The largest body of text he is given. You can read all of it; the wording lives under ' +
      '"What he is told".',
    it:
      'The largest body of text it is given. You can read all of it; the wording lives under ' +
      '"What it is told".',
  },
  noCli: {
    she: 'The Codex CLI could not be found, so she cannot look anything up.',
    he: 'The Codex CLI could not be found, so he cannot look anything up.',
    it: 'The Codex CLI could not be found, so it cannot look anything up.',
  },
  noCliLong: {
    she:
      'The Codex CLI could not be found on this machine, so nothing here has anything to ' +
      'run. She says so out loud rather than answering from memory.',
    he:
      'The Codex CLI could not be found on this machine, so nothing here has anything to ' +
      'run. He says so out loud rather than answering from memory.',
    it:
      'The Codex CLI could not be found on this machine, so nothing here has anything to ' +
      'run. It says so out loud rather than answering from memory.',
  },
  halo: {
    she:
      'The ring over her head. Hiding it hides nothing you need: the menu bar item marks ' +
      'itself while the microphone is open, whatever this says and wherever she is, and macOS ' +
      'shows its own orange dot beside it that no application can turn off.',
    he:
      'The ring over his head. Hiding it hides nothing you need: the menu bar item marks ' +
      'itself while the microphone is open, whatever this says and wherever he is, and macOS ' +
      'shows its own orange dot beside it that no application can turn off.',
    it:
      'The ring over it. Hiding it hides nothing you need: the menu bar item marks itself ' +
      'while the microphone is open, whatever this says and wherever it is, and macOS shows ' +
      'its own orange dot beside it that no application can turn off.',
  },
  chipSwitch: {
    she: 'Show it while the pointer is on her',
    he: 'Show it while the pointer is on him',
    it: 'Show it while the pointer is on it',
  },
  chip: {
    she:
      'The little speech bubble at her shoulder, which opens her conversations. Turning it off ' +
      'closes no door: the same control sits inside her speech bubble whenever she has said ' +
      'something, and the menu bar opens the same window.',
    he:
      'The little speech bubble at his shoulder, which opens his conversations. Turning it off ' +
      'closes no door: the same control sits inside his speech bubble whenever he has said ' +
      'something, and the menu bar opens the same window.',
    it:
      'The little speech bubble at its shoulder, which opens its conversations. Turning it off ' +
      'closes no door: the same control sits inside its speech bubble whenever it has said ' +
      'something, and the menu bar opens the same window.',
  },
  rests: {
    she:
      'Resting closes the session and gives the microphone back, so nothing is connected while ' +
      'nobody is talking to her. She wakes from the menu bar, the key, or a click on her.',
    he:
      'Resting closes the session and gives the microphone back, so nothing is connected while ' +
      'nobody is talking to him. He wakes from the menu bar, the key, or a click on him.',
    it:
      'Resting closes the session and gives the microphone back, so nothing is connected while ' +
      'nobody is talking to it. It wakes from the menu bar, the key, or a click on it.',
  },
  kept: {
    she:
      'What she remembers and how long conversations are kept are per character, and live ' +
      'on the shelf with the character they belong to.',
    he:
      'What he remembers and how long conversations are kept are per character, and live ' +
      'on the shelf with the character they belong to.',
    it:
      'What it remembers and how long conversations are kept are per character, and live ' +
      'on the shelf with the character they belong to.',
  },
  everythingOf: {
    she: 'Everything of hers is under ',
    he: 'Everything of his is under ',
    it: 'Everything of its is under ',
  },
  whoSheIs: {
    she:
      'Who she is — her name, her voice, her face, her prompt, her bubble and what she ' +
      'remembers about you — is on the shelf, with the character it belongs to. This ' +
      'window holds only what is true whoever is worn.',
    he:
      'Who he is — his name, his voice, his face, his prompt, his bubble and what he ' +
      'remembers about you — is on the shelf, with the character it belongs to. This ' +
      'window holds only what is true whoever is worn.',
    it:
      'Who it is — its name, its voice, its face, its prompt, its bubble and what it ' +
      'remembers about you — is on the shelf, with the character it belongs to. This ' +
      'window holds only what is true whoever is worn.',
  },
  readingLabel: {
    she: 'Reading & Retelling',
    he: 'Reading & Retelling',
    it: 'Reading & Retelling',
  },
  readingWidthHead: {
    she: 'Reading content width',
    he: 'Reading content width',
    it: 'Reading content width',
  },
  readingMarginHead: {
    she: 'Reading page margin',
    he: 'Reading page margin',
    it: 'Reading page margin',
  },
  readingFontSizeHead: {
    she: 'Reading font size',
    he: 'Reading font size',
    it: 'Reading font size',
  },
  readingLatinFontHead: {
    she: 'Reading Latin font',
    he: 'Reading Latin font',
    it: 'Reading Latin font',
  },
  readingCjkFontHead: {
    she: 'Reading CJK font',
    he: 'Reading CJK font',
    it: 'Reading CJK font',
  },
  readingLineHeightHead: {
    she: 'Reading line height',
    he: 'Reading line height',
    it: 'Reading line height',
  },
} as const satisfies Readonly<Record<string, ByPronoun | string>>

const SAYS_ZH: Readonly<Record<keyof typeof SAYS_EN, ByPronoun | string>> = {
  mayDo: { she: '赋予她的权限', he: '赋予他的权限', it: '赋予它的权限' },
  grantInForce: '立即生效',
  grantAtWake: {
    she: '下次唤醒时生效',
    he: '下次唤醒时生效',
    it: '下次唤醒时生效',
  },
  mayDoHead: '你授予的权限',
  atOnce: {
    she: '关闭权限立即生效，并且她会获知——当被询问时她会说明自己不再具备该权限，而不是默默失败。开场发言为特例：它在唤醒时决定，因此下次唤醒时生效。',
    he: '关闭权限立即生效，并且他会获知——当被询问时他会说明自己不再具备该权限，而不是默默失败。开场发言为特例：它在唤醒时决定，因此下次唤醒时生效。',
    it: '关闭权限立即生效，并且它会获知——当被询问时它会说明自己不再具备该权限，而不是默默失败。开场发言为特例：它在唤醒时决定，因此下次唤醒时生效。',
  },
  told: {
    she: '她获悉自己可以做的事情',
    he: '他获悉自己可以做的事情',
    it: '它获悉自己可以做的事情',
  },
  noTools: {
    she: '无。她没有被提供任何工具能力。',
    he: '无。他没有被提供任何工具能力。',
    it: '无。它没有被提供任何工具能力。',
  },
  promptsLabel: {
    she: '提示词指令',
    he: '提示词指令',
    it: '提示词指令',
  },
  tooManyLanguages: {
    she: ' 种语言，或不选以让她自动识别。',
    he: ' 种语言，或不选以让他自动识别。',
    it: ' 种语言，或不选以让它自动识别。',
  },
  noLanguages: {
    she: '未选择任何语言，她将自动识别你的语言。请只选择日常真正会说到的语言——设置不会使用的语言提示会降低转录准确率。',
    he: '未选择任何语言，他将自动识别你的语言。请只选择日常真正会说到的语言——设置不会使用的语言提示会降低转录准确率。',
    it: '未选择任何语言，它将自动识别你的语言。请只选择日常真正会说到的语言——设置不会使用的语言提示会降低转录准确率。',
  },
  someLanguages: {
    she: '作为倾听提示而非限制。说到其他语言时仍会转录，此处为预期优先识别的语言。',
    he: '作为倾听提示而非限制。说到其他语言时仍会转录，此处为预期优先识别的语言。',
    it: '作为倾听提示而非限制。说到其他语言时仍会转录，此处为预期优先识别的语言。',
  },
  nextWake: {
    she: '将在下次唤醒时生效。',
    he: '将在下次唤醒时生效。',
    it: '将在下次唤醒时生效。',
  },
  restsNever: {
    she: '从不自动休眠',
    he: '从不自动休眠',
    it: '从不自动休眠',
  },
  keysReset: {
    she: '“重置”将快捷键还原为软件出厂预设值。在休眠时同样有效。',
    he: '“重置”将快捷键还原为软件出厂预设值。在休眠时同样有效。',
    it: '“重置”将快捷键还原为软件出厂预设值。在休眠时同样有效。',
  },
  promptsHead: {
    she: '提示词指令',
    he: '提示词指令',
    it: '提示词指令',
  },
  onDisk: '本地文件',
  languagesHead: {
    she: '倾听语言偏好',
    he: '倾听语言偏好',
    it: '倾听语言偏好',
  },
  interruptibleHead: {
    she: '允许随时打断说话',
    he: '允许随时打断说话',
    it: '允许随时打断说话',
  },
  interruptibleOn: {
    she: '当听到任何声音时她会立即停下发言——包括环境中的其他人声。',
    he: '当听到任何声音时他会立即停下发言——包括环境中的其他人声。',
    it: '当听到任何声音时它会立即停下发言——包括环境中的其他人声。',
  },
  interruptibleOff: {
    she: '无论外界是否有声音，她都会说完当前句子。适合嘈杂环境，但在她说完整句之前打断可能不会立即响应。',
    he: '无论外界是否有声音，他都会说完当前句子。适合嘈杂环境，但在他说完整句之前打断可能不会立即响应。',
    it: '无论外界是否有声音，它都会说完当前句子。适合嘈杂环境，但在它说完整句之前打断可能不会立即响应。',
  },
  eagernessHead: {
    she: '接话应答速度',
    he: '接话应答速度',
    it: '接话应答速度',
  },
  eagernessNote: {
    she: '判定你已说完话前的等待时长。在嘈杂房间中等待更久更稳定，在安静书桌前缩短等待感觉更灵敏。',
    he: '判定你已说完话前的等待时长。在嘈杂房间中等待更久更稳定，在安静书桌前缩短等待感觉更灵敏。',
    it: '判定你已说完话前的等待时长。在嘈杂房间中等待更久更稳定，在安静书桌前缩短等待感觉更灵敏。',
  },
  typefaces: 'Outfit 与 JetBrains Mono 字体遵循 SIL 开源许可打包内置。中文字体直接调用系统字体。',
  workspaceNote: {
    she: '她可读取的唯一目录。该目录层级之上的文件均不可访问。',
    he: '他可读取的唯一目录。该目录层级之上的文件均不可访问。',
    it: '它可读取的唯一目录。该目录层级之上的文件均不可访问。',
  },
  profileDefault: '未指定配置，当前使用默认值。配置文件可携带其自身的 MCP 服务。',
  profileChosen: '配置文件可携带其自身的 MCP 服务。',
  workspacePlaceholder: {
    she: '可供其读取的目录',
    he: '可供其读取的目录',
    it: '可供其读取的目录',
  },
  workspaceSaved: {
    she: '已保存工作区：',
    he: '已保存工作区：',
    it: '已保存工作区：',
  },
  toolWording: {
    she: '提供给她的完整工具描述文本。文本内容可在“提示词指令”中查看。',
    he: '提供给他的完整工具描述文本。文本内容可在“提示词指令”中查看。',
    it: '提供给它的完整工具描述文本。文本内容可在“提示词指令”中查看。',
  },
  noCli: {
    she: '未找到 Codex CLI，无法检索信息。',
    he: '未找到 Codex CLI，无法检索信息。',
    it: '未找到 Codex CLI，无法检索信息。',
  },
  noCliLong: {
    she: '本机未找到 Codex CLI 工具。当需要查找信息时她会如实语音告知，而不是臆造记忆回答。',
    he: '本机未找到 Codex CLI 工具。当需要查找信息时他会如实语音告知，而不是臆造记忆回答。',
    it: '本机未找到 Codex CLI 工具。当需要查找信息时它会如实语音告知，而不是臆造记忆回答。',
  },
  halo: {
    she: '角色头顶的状态光环。菜单栏图标在麦克风开启时同样会有指示。',
    he: '角色头顶的状态光环。菜单栏图标在麦克风开启时同样会有指示。',
    it: '角色头顶的状态光环。菜单栏图标在麦克风开启时同样会有指示。',
  },
  chipSwitch: {
    she: '鼠标悬停在身上时显示',
    he: '鼠标悬停在身上时显示',
    it: '鼠标悬停在身上时显示',
  },
  chip: {
    she: '肩旁的快捷气泡按钮，用于快速打开对话历史窗口。',
    he: '肩旁的快捷气泡按钮，用于快速打开对话历史窗口。',
    it: '肩旁的快捷气泡按钮，用于快速打开对话历史窗口。',
  },
  rests: {
    she: '休眠会断开实时会话并释放麦克风占用。可通过点击角色、菜单栏或快捷键唤醒。',
    he: '休眠会断开实时会话并释放麦克风占用。可通过点击角色、菜单栏或快捷键唤醒。',
    it: '休眠会断开实时会话并释放麦克风占用。可通过点击角色、菜单栏或快捷键唤醒。',
  },
  kept: {
    she: '记忆笔记与对话保留策略均为角色独立配置，保存在各自角色的档案中。',
    he: '记忆笔记与对话保留策略均为角色独立配置，保存在各自角色的档案中。',
    it: '记忆笔记与对话保留策略均为角色独立配置，保存在各自角色的档案中。',
  },
  everythingOf: {
    she: '角色相关所有数据存放于：',
    he: '角色相关所有数据存放于：',
    it: '角色相关所有数据存放于：',
  },
  whoSheIs: {
    she: '角色身份（姓名、音色、外观、提示词、气泡与记忆）均归属于各自角色设定。本机设置仅包含对所有角色通用的系统选项。',
    he: '角色身份（姓名、音色、外观、提示词、气泡与记忆）均归属于各自角色设定。本机设置仅包含对所有角色通用的系统选项。',
    it: '角色身份（姓名、音色、外观、提示词、气泡与记忆）均归属于各自角色设定。本机设置仅包含对所有角色通用的系统选项。',
  },
  readingLabel: {
    she: '阅读与复述',
    he: '阅读与复述',
    it: '阅读与复述',
  },
  readingWidthHead: {
    she: '正文最大宽度',
    he: '正文最大宽度',
    it: '正文最大宽度',
  },
  readingMarginHead: {
    she: '左右页边距',
    he: '左右页边距',
    it: '左右页边距',
  },
  readingFontSizeHead: {
    she: '正文字号大小',
    he: '正文字号大小',
    it: '正文字号大小',
  },
  readingLatinFontHead: {
    she: '西文字体',
    he: '西文字体',
    it: '西文字体',
  },
  readingCjkFontHead: {
    she: '中文字体',
    he: '中文字体',
    it: '中文字体',
  },
  readingLineHeightHead: {
    she: '正文行高倍率',
    he: '正文行高倍率',
    it: '正文行高倍率',
  },
} as const satisfies Readonly<Record<keyof typeof SAYS_EN, ByPronoun | string>>

export const SAYS = new Proxy(SAYS_EN, {
  get(target, prop, receiver) {
    if (getLanguage() === 'zh' && prop in SAYS_ZH) {
      return (SAYS_ZH as Record<string, ByPronoun | string>)[prop as string]
    }
    return Reflect.get(target, prop, receiver)
  },
})

/**
 * What each halo answer is called on screen.
 *
 * Here rather than in `HALO_WHEN`, because the store's list is the GRAMMAR — the
 * values main will accept — and these are words somebody reads. `?? one` in the
 * caller, so a value main starts offering before anybody writes a label for it
 * appears as itself rather than as a blank row.
 */
const HALO_LABELS_EN: Readonly<Record<string, string>> = {
  always: 'always',
  listening: 'only while the microphone is open',
  never: 'never',
}

const HALO_LABELS_ZH: Readonly<Record<string, string>> = {
  always: '始终显示',
  listening: '仅在麦克风开启时',
  never: '从不显示',
}

export const HALO_LABELS = new Proxy(HALO_LABELS_EN, {
  get(target, prop, receiver) {
    if (getLanguage() === 'zh' && prop in HALO_LABELS_ZH) {
      return HALO_LABELS_ZH[prop as string]
    }
    return Reflect.get(target, prop, receiver)
  },
}) as Record<string, string>

/**
 * The waiting speeds, said as waits rather than as speeds.
 *
 * `low`, `medium` and `high` name the model's EAGERNESS to answer, which is the
 * opposite direction from the thing somebody is choosing: `low` means she waits
 * LONGER. Drawing the service's own words would leave the one control in this
 * window whose labels run backwards from their effect.
 *
 * The seconds are the maximum waits the service documents for each, and they
 * are here because "longer" means nothing on its own — the difference between
 * these choices is four seconds, and a person deciding whether it is worth
 * touching deserves to know that before they try it.
 */
const EAGERNESS_LABELS_EN: Readonly<Record<string, string>> = {
  auto: 'let the service decide',
  low: 'wait longest — up to 8s',
  medium: 'wait a little — up to 4s',
  high: 'answer soonest — up to 2s',
}

const EAGERNESS_LABELS_ZH: Readonly<Record<string, string>> = {
  auto: '由服务决定',
  low: '等待最久 — 最多 8 秒',
  medium: '稍作等待 — 最多 4 秒',
  high: '尽快回答 — 最多 2 秒',
}

export const EAGERNESS_LABELS = new Proxy(EAGERNESS_LABELS_EN, {
  get(target, prop, receiver) {
    if (getLanguage() === 'zh' && prop in EAGERNESS_LABELS_ZH) {
      return EAGERNESS_LABELS_ZH[prop as string]
    }
    return Reflect.get(target, prop, receiver)
  },
}) as Record<string, string>
