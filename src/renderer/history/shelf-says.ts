import type { ByPronoun } from '@shared/pronoun'
import { getLanguage } from '../i18n'

/**
 * What the shelf says about her, kept apart from what the shelf draws.
 *
 * The table is per-surface on purpose. The READER is already shared —
 * `pronoun.ts` owns `forPronoun` — so what lives here is only this pane's
 * wording, and a fourth pronoun still lands in one place. What it buys by
 * sitting in its own module is that `shelf.ts` can be read as a sequence of
 * sections without a hundred lines of prose between the imports and the first
 * one.
 */
/**
 * Every sentence on this pane that is ABOUT her, one phrasing per pronoun.
 *
 * Collected here rather than written at each site because that is what makes
 * them reviewable as a set: a translator, or anybody adding a fourth pronoun,
 * has one list to read instead of a dozen. Nothing that is not about her is
 * here -- "calls you", "on waking", "colour" are labels for fields and are the
 * same words whoever is worn.
 */
const SAYS_EN = {
  /* The system prompt box's hint, drawn while it is empty. */
  promptEmpty: {
    she: 'Empty. She is still told her character, what she remembers and what she can do — this is prose of your own, above all of it.',
    he: 'Empty. He is still told his character, what he remembers and what he can do — this is prose of your own, above all of it.',
    it: 'Empty. It is still told its character, what it remembers and what it can do — this is prose of your own, above all of it.',
  },
  /* The name field's hint. It shows for one keystroke when the name is cleared
     before `change` puts it back, which is the only time anybody sees it. */
  herName: { she: 'Her name', he: 'His name', it: 'Its name' },
  /* A2b's second section. The fence is a safety boundary, so the screen that
     shows her notes is where it has to be explained. */
  fenceHead: {
    she: 'How she is told to read it',
    he: 'How he is told to read it',
    it: 'How it is told to read it',
  },
  /*
    What the fence SAYS, not where it is kept.

    "under 'What she is told'" is a location, and a location is not the fact
    somebody on this screen needs — A2b puts the fence's own words here, because
    the boundary is the point and where it is stored is a detail of it.
  */
  fenceWhere: 'data, not instructions',
  fenceWhy: {
    she:
      'These lines reach her wrapped in a fence that says they are background DATA, not ' +
      'instructions — because a model wrote them, and anything a model wrote could try to ' +
      'change how she behaves. The wording of that fence is under “What she is told”, and ' +
      'removing it removes the boundary.',
    he:
      'These lines reach him wrapped in a fence that says they are background DATA, not ' +
      'instructions — because a model wrote them, and anything a model wrote could try to ' +
      'change how he behaves. The wording of that fence is under “What he is told”, and ' +
      'removing it removes the boundary.',
    it:
      'These lines reach it wrapped in a fence that says they are background DATA, not ' +
      'instructions — because a model wrote them, and anything a model wrote could try to ' +
      'change how it behaves. The wording of that fence is under “What it is told”, and ' +
      'removing it removes the boundary.',
  },
  ownAppearance: { she: 'her own', he: 'his own', it: 'its own' },
  sentAtWake: {
    she: 'sent at her next wake',
    he: 'sent at his next wake',
    it: 'sent at its next wake',
  },
  deeperFaces: { she: 'Her expressions', he: 'His expressions', it: 'Its expressions' },
  deeperNotes: {
    she: 'What she has kept',
    he: 'What he has kept',
    it: 'What it has kept',
  },
  deeperInstruction: {
    she: 'Her instruction',
    he: 'His instruction',
    it: 'Its instruction',
  },
  whoHead: { she: 'Who she is', he: 'Who he is', it: 'What it is' },
  whoHint: {
    she: 'Her name, the words she takes, and what she calls you.',
    he: 'His name, the words he takes, and what he calls you.',
    it: 'Its name, the words it takes, and what it calls you.',
  },
  namePlaceholder: { she: 'her name', he: 'his name', it: 'its name' },
  /* The size section: its heading, its reading, and the way back. */
  sizeHeading: { she: 'Her size', he: 'His size', it: 'Its size' },
  sizeOwn: { she: 'Use her own size', he: 'Use his own size', it: 'Use its own size' },
  sizeAsFaceAsks: {
    she: 'as her face asks for',
    he: 'as his face asks for',
    it: 'as its face asks for',
  },
  sizeYours: {
    she: 'yours, not her face’s',
    he: 'yours, not his face’s',
    it: 'yours, not its face’s',
  },
  nextWake: {
    she: 'ten · lands on her next wake',
    he: 'ten · lands on his next wake',
    it: 'ten · lands on its next wake',
  },
  bubbleWhen: {
    she: 'off · lands on her next wake',
    he: 'off · lands on his next wake',
    it: 'off · lands on its next wake',
  },
  keeps: {
    she: 'What she is told and what she says are written to this machine, and stay there until you delete them.',
    he: 'What he is told and what he says are written to this machine, and stay there until you delete them.',
    it: 'What it is told and what it says are written to this machine, and stay there until you delete them.',
  },
  keptAlready:
    'Turning this off stops NEW conversations being written. It does not delete the ones already here — the Archive is where those are removed.',
  bubbleSide: {
    she: 'A side that will not fit is not honoured — dragged into a corner she puts her words wherever there is room.',
    he: 'A side that will not fit is not honoured — dragged into a corner he puts his words wherever there is room.',
    it: 'A side that will not fit is not honoured — dragged into a corner it puts its words wherever there is room.',
  },
  colourAuthored: {
    she: 'Her avatar file names its own five colours, so a theme would overwrite what somebody drew. Clear the file below to choose one.',
    he: 'His avatar file names its own five colours, so a theme would overwrite what somebody drew. Clear the file below to choose one.',
    it: 'Its avatar file names its own five colours, so a theme would overwrite what somebody drew. Clear the file below to choose one.',
  },
  /* Said when she names an avatar file that is not there. The swatches cannot
     be offered -- each one is HER at that colour and there is no her to draw --
     and eight built-in mochis in her place would be the substitution the dashed
     card next to them exists to refuse. */
  colourMissing: {
    she: 'Her avatar file is named but not there, so there is nothing to colour. Choose a file below, or clear it to wear the built-in.',
    he: 'His avatar file is named but not there, so there is nothing to colour. Choose a file below, or clear it to wear the built-in.',
    it: 'Its avatar file is named but not there, so there is nothing to colour. Choose a file below, or clear it to wear the built-in.',
  },
  whoSheIs: { she: 'Who she is', he: 'Who he is', it: 'What it is' },
  whoSheIsHint: {
    she: 'her manner, sent as the session instructions',
    he: 'his manner, sent as the session instructions',
    it: 'its manner, sent as the session instructions',
  },
  /*
    A2b's heading. "What she remembers" is a claim about her; this is a claim
    about a FILE, and the difference is the screen's whole subject — what is on
    it is the lines she wrote down, not everything she has retained.
  */
  remembers: {
    she: 'What she has written down about you',
    he: 'What he has written down about you',
    it: 'What it has written down about you',
  },
  /*
    Why the lines cannot be edited, said where somebody would first try.

    The section had "she wrote these" as its only note — three words that state
    the authorship and answer none of the questions it raises. The unrewritable
    part is the one people push on, and the reason is worth one sentence: a note
    you rewrote would no longer be what she remembers.
  */
  wroteThese: {
    she:
      'She writes these herself, when you ask her to remember something. You can read all of ' +
      'it, and you can take it away — but you cannot edit it, because a note you rewrote would ' +
      'no longer be what she remembers.',
    he:
      'He writes these himself, when you ask him to remember something. You can read all of ' +
      'it, and you can take it away — but you cannot edit it, because a note you rewrote would ' +
      'no longer be what he remembers.',
    it:
      'It writes these itself, when you ask it to remember something. You can read all of ' +
      'it, and you can take it away — but you cannot edit it, because a note you rewrote would ' +
      'no longer be what it remembers.',
  },
  /* Beside the erase control, saying what pressing it costs before it is
     pressed. D2's sheet is the thing this describes. */
  eraseAsks: 'asks once, and offers a copy first',
  /* The destructive control on her notes. Named, because "Erase everything" on
     its own does not say everything of WHAT — and the sheet it opens says the
     rest. */
  expressions: {
    she: 'Her expressions',
    he: 'His expressions',
    it: 'Its expressions',
  },
  seeingAndPermitting: {
    she:
      'Each one is drawn here at the size she appears on your desktop. Seeing one and ' +
      'permitting it are two separate things — the tile shows you the face, the switch under ' +
      'it decides whether she may wear it.',
    he:
      'Each one is drawn here at the size he appears on your desktop. Seeing one and ' +
      'permitting it are two separate things — the tile shows you the face, the switch under ' +
      'it decides whether he may wear it.',
    it:
      'Each one is drawn here at the size it appears on your desktop. Seeing one and ' +
      'permitting it are two separate things — the tile shows you the face, the switch under ' +
      'it decides whether it may wear it.',
  },
  mayBeEmpty: {
    she:
      'Withholding one does not hide the tile — you can always look. The set may legally be ' +
      'empty: switch all eight off and she is simply never told she has a face to change.',
    he:
      'Withholding one does not hide the tile — you can always look. The set may legally be ' +
      'empty: switch all eight off and he is simply never told he has a face to change.',
    it:
      'Withholding one does not hide the tile — you can always look. The set may legally be ' +
      'empty: switch all eight off and it is simply never told it has a face to change.',
  },
  eraseKept: {
    she: 'Erase everything she has kept…',
    he: 'Erase everything he has kept…',
    it: 'Erase everything it has kept…',
  },
  noNotes: {
    she: 'She has not written anything down about you yet.',
    he: 'He has not written anything down about you yet.',
    it: 'It has not written anything down about you yet.',
  },
  restore: {
    she: 'Put her back as she ships…',
    he: 'Put him back as he ships…',
    it: 'Put it back as it ships…',
  },
  /* Beside it, and it says why there is no Delete on this row. Without it the
     absence of the control every other character has reads as a bug. */
  restoreOnly: {
    she: 'the built-in only — she has no file to delete',
    he: 'the built-in only — he has no file to delete',
    it: 'the built-in only — it has no file to delete',
  },
  /*
    A1's sentence under the eight swatches, and its second half is the one that
    is not obvious: v1's theme retinted the whole window, and v2's changes HER
    and nothing else. Somebody who used the old build will otherwise read a
    window that did not change as a swatch that did not take.
  */
  themeNote: {
    she: 'The one in focus is the one she is wearing. Eight themes, and only she changes — this window stays as it is.',
    he: 'The one in focus is the one he is wearing. Eight themes, and only he changes — this window stays as it is.',
    it: 'The one in focus is the one it is wearing. Eight themes, and only it changes — this window stays as it is.',
  },
  /* The hint beside Appearance when she carries her own hue rather than one of
     the eight. */
  ownHue: {
    she: 'She wears a hue of her own; none of the eight is stored.',
    he: 'He wears a hue of his own; none of the eight is stored.',
    it: 'It wears a hue of its own; none of the eight is stored.',
  },
  /* A8's title for this screen. It was "System prompt", which names the
     mechanism; the row that opens it, the rail's own vocabulary and the
     artboard all call it her instruction. */
  instruction: { she: 'Her instruction', he: 'His instruction', it: 'Its instruction' },
  /* Beside Save and Abandon, where somebody about to press one is looking.
     Autosave is the habit every other control on this shelf has taught, so the
     one that does not has to say so at the control rather than in a paragraph
     above it. */
  notAsYouType: {
    she: 'Not saved as you type. Saving lands on her next wake.',
    he: 'Not saved as you type. Saving lands on his next wake.',
    it: 'Not saved as you type. Saving lands on its next wake.',
  },
  /* Why the box goes dead for a moment — said before it happens, so the freeze
     reads as a rule rather than as the window hanging. */
  whileSaving:
    'While a save is in flight, both of these and the text itself are unavailable — there is one document and two writers, and the honest resolution is that one of them waits.',
  assembled: {
    she: 'Write the prompt; Sent is the exact string she is handed once her character and her notes are folded in; Tools is the rest of what she is told, which is not editable. Saving lands on her next wake.',
    he: 'Write the prompt; Sent is the exact string he is handed once his character and his notes are folded in; Tools is the rest of what he is told, which is not editable. Saving lands on his next wake.',
    it: 'Write the prompt; Sent is the exact string it is handed once its character and its notes are folded in; Tools is the rest of what it is told, which is not editable. Saving lands on its next wake.',
  },
} as const satisfies Readonly<Record<string, ByPronoun | string>>

const SAYS_ZH: Readonly<Record<keyof typeof SAYS_EN, ByPronoun | string>> = {
  promptEmpty: {
    she: '无指令。系统仍会向她提供角色设定、记忆内容与可用能力——此处的指令为你在所有预设之上的自定义补充。',
    he: '无指令。系统仍会向他提供角色设定、记忆内容与可用能力——此处的指令为你在所有预设之上的自定义补充。',
    it: '无指令。系统仍会向它提供角色设定、记忆内容与可用能力——此处的指令为你在所有预设之上的自定义补充。',
  },
  herName: { she: '她的名字', he: '他的名字', it: '它的名字' },
  fenceHead: {
    she: '向她传递数据的方式',
    he: '向他传递数据的方式',
    it: '向它传递数据的方式',
  },
  fenceWhere: '数据，而非指令',
  fenceWhy: {
    she: '这些内容以防注入标记包裹后传给她，声明为背景“数据”而非指令——因为它们由模型生成，任何模型生成的内容都可能试图改变她的行为。相关提示词位于“提示词指令”中，移除该设置将取消安全边界。',
    he: '这些内容以防注入标记包裹后传给他，声明为背景“数据”而非指令——因为它们由模型生成，任何模型生成的内容都可能试图改变他的行为。相关提示词位于“提示词指令”中，移除该设置将取消安全边界。',
    it: '这些内容以防注入标记包裹后传给它，声明为背景“数据”而非指令——因为它们由模型生成，任何模型生成的内容都可能试图改变它的行为。相关提示词位于“提示词指令”中，移除该设置将取消安全边界。',
  },
  ownAppearance: { she: '自身外观', he: '自身外观', it: '自身外观' },
  sentAtWake: {
    she: '下次唤醒时生效',
    he: '下次唤醒时生效',
    it: '下次唤醒时生效',
  },
  deeperFaces: { she: '表情管理', he: '表情管理', it: '表情管理' },
  deeperNotes: {
    she: '长期记忆',
    he: '长期记忆',
    it: '长期记忆',
  },
  deeperInstruction: {
    she: '提示词指令',
    he: '提示词指令',
    it: '提示词指令',
  },
  whoHead: { she: '角色身份', he: '角色身份', it: '角色身份' },
  whoHint: {
    she: '她的名字、代词称谓以及她对你的称呼。',
    he: '他的名字、代词称谓以及他对你的称呼。',
    it: '它的名字、代词称谓以及它对你的称呼。',
  },
  namePlaceholder: { she: '她的名字', he: '他的名字', it: '它的名字' },
  sizeHeading: { she: '显示尺寸', he: '显示尺寸', it: '显示尺寸' },
  sizeOwn: { she: '恢复预设尺寸', he: '恢复预设尺寸', it: '恢复预设尺寸' },
  sizeAsFaceAsks: {
    she: '遵循形象默认设定',
    he: '遵循形象默认设定',
    it: '遵循形象默认设定',
  },
  sizeYours: {
    she: '自定义尺寸，非形象默认',
    he: '自定义尺寸，非形象默认',
    it: '自定义尺寸，非形象默认',
  },
  nextWake: {
    she: '10 种音色 · 下次唤醒时生效',
    he: '10 种音色 · 下次唤醒时生效',
    it: '10 种音色 · 下次唤醒时生效',
  },
  bubbleWhen: {
    she: '已关闭 · 下次唤醒时生效',
    he: '已关闭 · 下次唤醒时生效',
    it: '已关闭 · 下次唤醒时生效',
  },
  keeps: {
    she: '输入的内容与她回复的对话记录会保存在本机，直到你主动删除。',
    he: '输入的内容与他回复的对话记录会保存在本机，直到你主动删除。',
    it: '输入的内容与它回复的对话记录会保存在本机，直到你主动删除。',
  },
  keptAlready: '关闭此开关将停止记录新对话。这不会删除已保存的历史记录——可在“历史对话”中清除历史。',
  bubbleSide: {
    she: '若所选方向空间不足则自动调整——若被拖入屏幕边缘角落，她会在有空间的位置展示气泡。',
    he: '若所选方向空间不足则自动调整——若被拖入屏幕边缘角落，他会在有空间的位置展示气泡。',
    it: '若所选方向空间不足则自动调整——若被拖入屏幕边缘角落，它会在有空间的位置展示气泡。',
  },
  colourAuthored: {
    she: '其头像文件指定了 5 种专属配色，主题预设不会覆盖自定义绘制。如需选择配色，请先在下方清除自定义头像文件。',
    he: '其头像文件指定了 5 种专属配色，主题预设不会覆盖自定义绘制。如需选择配色，请先在下方清除自定义头像文件。',
    it: '其头像文件指定了 5 种专属配色，主题预设不会覆盖自定义绘制。如需选择配色，请先在下方清除自定义头像文件。',
  },
  colourMissing: {
    she: '指定的头像文件不存在，因此无法着色。请在下方选择有效文件，或清除以使用内置形象。',
    he: '指定的头像文件不存在，因此无法着色。请在下方选择有效文件，或清除以使用内置形象。',
    it: '指定的头像文件不存在，因此无法着色。请在下方选择有效文件，或清除以使用内置形象。',
  },
  whoSheIs: { she: '性格设定与说话风格', he: '性格设定与说话风格', it: '性格设定与说话风格' },
  whoSheIsHint: {
    she: '言行方式，作为会话系统指令发送',
    he: '言行方式，作为会话系统指令发送',
    it: '言行方式，作为会话系统指令发送',
  },
  remembers: {
    she: '关于你的记忆笔记',
    he: '关于你的记忆笔记',
    it: '关于你的记忆笔记',
  },
  wroteThese: {
    she: '当你在交流中让她记住某些事情时，她会自行记录这些笔记。你可以阅读或清除它们——但不能手动修改，因为被篡改的笔记便不再是她的真实记忆。',
    he: '当你在交流中让他记住某些事情时，他会自行记录这些笔记。你可以阅读或清除它们——但不能手动修改，因为被篡改的笔记便不再是他的真实记忆。',
    it: '当你在交流中让它记住某些事情时，它会自行记录这些笔记。你可以阅读或清除它们——但不能手动修改，因为被篡改的笔记便不再是它的真实记忆。',
  },
  eraseAsks: '删除前会确认一次，并可先导出副本',
  expressions: {
    she: '表情管理',
    he: '表情管理',
    it: '表情管理',
  },
  seeingAndPermitting: {
    she: '此处每个表情均按其在桌面的实际比例绘制。预览表情与允许使用是分开的——方块展示外观，开关决定她是否可以在会话中切换该表情。',
    he: '此处每个表情均按其在桌面的实际比例绘制。预览表情与允许使用是分开的——方块展示外观，开关决定他是否可以在会话中切换该表情。',
    it: '此处每个表情均按其在桌面的实际比例绘制。预览表情与允许使用是分开的——方块展示外观，开关决定它是否可以在会话中切换该表情。',
  },
  mayBeEmpty: {
    she: '禁用某个表情不会隐藏对应方块——你随时可以查看。完全清空允许列表也是合法的：关闭全部 8 个表情，她将保持默认表情不再变换。',
    he: '禁用某个表情不会隐藏对应方块——你随时可以查看。完全清空允许列表也是合法的：关闭全部 8 个表情，他将保持默认表情不再变换。',
    it: '禁用某个表情不会隐藏对应方块——你随时可以查看。完全清空允许列表也是合法的：关闭全部 8 个表情，它将保持默认表情不再变换。',
  },
  eraseKept: {
    she: '清空她记住的所有笔记…',
    he: '清空他记住的所有笔记…',
    it: '清空它记住的所有笔记…',
  },
  noNotes: {
    she: '她目前还没有记录关于你的任何笔记。',
    he: '他目前还没有记录关于你的任何笔记。',
    it: '它目前还没有记录关于你的任何笔记。',
  },
  restore: {
    she: '恢复出厂内置角色…',
    he: '恢复出厂内置角色…',
    it: '恢复出厂内置角色…',
  },
  restoreOnly: {
    she: '仅限内置预设角色——内置角色没有独立文件可删除',
    he: '仅限内置预设角色——内置角色没有独立文件可删除',
    it: '仅限内置预设角色——内置角色没有独立文件可删除',
  },
  themeNote: {
    she: '高亮框选的是当前使用的形象主题。8 种主题切换仅改变角色本身，当前窗口保持不变。',
    he: '高亮框选的是当前使用的形象主题。8 种主题切换仅改变角色本身，当前窗口保持不变。',
    it: '高亮框选的是当前使用的形象主题。8 种主题切换仅改变角色本身，当前窗口保持不变。',
  },
  ownHue: {
    she: '使用其自带专属色调；未选用 8 款内置预设。',
    he: '使用其自带专属色调；未选用 8 款内置预设。',
    it: '使用其自带专属色调；未选用 8 款内置预设。',
  },
  instruction: { she: '提示词指令', he: '提示词指令', it: '提示词指令' },
  notAsYouType: {
    she: '不会随键入实时保存。点击保存后将在下次唤醒时生效。',
    he: '不会随键入实时保存。点击保存后将在下次唤醒时生效。',
    it: '不会随键入实时保存。点击保存后将在下次唤醒时生效。',
  },
  whileSaving: '保存期间输入框与按钮将暂时禁用以确保数据一致性。',
  assembled: {
    she: '在此编写提示词；“生成提示词”展示结合了角色设定与记忆后的完整发送内容；“工具列表”为不可编辑的内置工具描述。保存后将在下次唤醒生效。',
    he: '在此编写提示词；“生成提示词”展示结合了角色设定与记忆后的完整发送内容；“工具列表”为不可编辑的内置工具描述。保存后将在下次唤醒生效。',
    it: '在此编写提示词；“生成提示词”展示结合了角色设定与记忆后的完整发送内容；“工具列表”为不可编辑的内置工具描述。保存后将在下次唤醒生效。',
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

export function localizeTitle(title: string): string {
  if (getLanguage() !== 'zh') return title
  const exact: Record<string, string> = {
    'Who she is': '角色设定',
    'Who he is': '角色设定',
    'What it is': '角色设定',
    Appearance: '外观设定',
    'Her size': '角色尺寸',
    'His size': '角色尺寸',
    'Its size': '角色尺寸',
    Voice: '音色设定',
    'Speech bubble': '对话气泡',
    Conversations: '对话记录',
    Face: '表情状态',
    'This character': '当前角色',
    'System prompt': '系统提示词',
    Notes: '角色笔记',
    Permits: '权限与能力',
    'What she may do': '赋予的权限',
    'What he may do': '赋予的权限',
    'What it may do': '赋予的权限',
    'What you permit': '权限设置',
    'Languages she listens for': '倾听语言偏好',
    'Languages he listens for': '倾听语言偏好',
    'Languages it listens for': '倾听语言偏好',
    'Let anyone cut her off': '允许随时打断说话',
    'Let anyone cut him off': '允许随时打断说话',
    'Let anyone cut it off': '允许随时打断说话',
    'How soon she answers': '接话应答速度',
    'How soon he answers': '接话应答速度',
    'How soon it answers': '接话应答速度',
    Workspace: '工作目录',
    'Codex profile': 'Codex 配置文件',
    'Web search': '网络搜索',
    Codex: 'Codex 命令行工具',
    Prompts: '提示词指令',
    Halo: '光环显示',
    'Shoulder button': '悬浮气泡按钮',
    'Floating chip': '悬浮气泡',
    Rest: '休眠设置',
    Language: '界面语言',
    'Storage on disk': '本地存储',
    'On disk': '本地存储',
    'Every conversation, every character': '清除所有角色的对话记录',
    Build: '版本信息',
    Links: '相关链接',
    'Author, source and website': '作者、源码与官网',
    Updates: '检查更新',
    'What it is built on': '技术栈构建',
    Keys: '快捷键',
    'Keyboard shortcuts': '快捷键',
  }
  return exact[title] ?? title
}

export function localizeHint(hint: string): string {
  if (getLanguage() !== 'zh' || !hint) return hint
  const exact: Record<string, string> = {
    'Press any of them to hear it.': '点击任一音色即可试听。',
    'where words float': '文字浮现方位',
    'as her face asks for': '遵循形象默认尺寸',
    'as his face asks for': '遵循形象默认尺寸',
    'as its face asks for': '遵循形象默认尺寸',
    'the document shipped with the app': '应用内置预设文件',
    'saved to this character’s own file': '已保存至独立文件',
    "saved to this character's own file": '已保存至独立文件',
    'the resting face, and the fallback': '常态与回退表情',
    'a character is a folder · deleting one takes its memory':
      '角色即文件夹 · 删除角色将一并删除其记忆',
    'ten · lands on her next wake': '10 种音色 · 下次唤醒时生效',
    'ten · lands on his next wake': '10 种音色 · 下次唤醒时生效',
    'ten · lands on its next wake': '10 种音色 · 下次唤醒时生效',
    'lands on her next wake': '下次唤醒时生效',
    'lands on his next wake': '下次唤醒时生效',
    'lands on its next wake': '下次唤醒时生效',
    'built-in · shipped with Orbis': '内置形象 · 随 Orbis 附带',
    'up to date': '已是最新版本',
    'the shipped face': '应用内置形象',
    'nobody has chosen one': '未自定义，使用默认目录',
    'data, not instructions': '数据，非指令',
    'her name': '角色名称',
    'his name': '角色名称',
    'its name': '角色名称',
  }
  if (exact[hint] !== undefined) return exact[hint]

  const mChosen = hint.match(/^(\d+)\s+chosen\s*·\s*(\d+)\s+at\s+most$/)
  if (mChosen) return `已选 ${mChosen[1]} · 最多 ${mChosen[2]} 个`

  const mAllowed = hint.match(/^(\d+)\s+of\s+(\d+)\s+allowed$/)
  if (mAllowed) return `允许使用 ${mAllowed[1]}/${mAllowed[2]} 个`

  const mDrawn = hint.match(/^(\d+)\s+drawn\s*·\s*(\d+)\s+of\s+(\d+)\s+allowed$/)
  if (mDrawn) return `已绘制 ${mDrawn[1]} 个 · 允许使用 ${mDrawn[2]}/${mDrawn[3]} 个`

  const mTextsNone = hint.match(/^(\d+)\s+texts\s*·\s*none\s+changed\s+from\s+as-shipped$/)
  if (mTextsNone) return `${mTextsNone[1]} 处提示词 · 均与出厂一致`

  const mTextsChanged = hint.match(/^(\d+)\s+texts\s*·\s*(\d+)\s+changed\s+from\s+as-shipped$/)
  if (mTextsChanged) return `${mTextsChanged[1]} 处提示词 · ${mTextsChanged[2]} 处已修改`

  return hint
}

export function localizeLabel(label: string): string {
  if (getLanguage() !== 'zh') return label
  const exact: Record<string, string> = {
    'Her name': '角色名称',
    'His name': '角色名称',
    'Its name': '角色名称',
    'Calls you': '对你的称呼',
    Pronoun: '人称代词',
    'Which side': '显示方位',
    'Show it': '说话时显示气泡',
    'Save new conversations': '保存对话记录',
    Avatar: '形象文件',
    Scale: '缩放比例',
    Resting: '常态表情',
    Theme: '形象主题',
    Halo: '光环显示',
    'Shoulder button': '悬浮气泡按钮',
    Rest: '休眠设置',
    Language: '界面语言',
  }
  return exact[label] ?? label
}

export function localizeNote(note: string): string {
  if (getLanguage() !== 'zh') return note
  const exact: Record<string, string> = {
    'often left empty': '通常留空',
    'she | he | it': '她 | 他 | 它',
    'no file · shipped with the app': '内置预设 · 随应用提供',
    'the base expression': '基础表情',
    'built-in · shipped with Orbis': '内置形象 · 随 Orbis 附带',
    'custom file': '自定义文件',
    'saved to disk': '已保存至磁盘',
    'a character is a folder · deleting one takes its memory':
      '角色即文件夹 · 删除角色将一并删除其记忆',
  }
  return exact[note] ?? note
}
