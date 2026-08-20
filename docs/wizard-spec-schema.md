# 网站生成向导 · Spec Schema 设计

配套文档：向导的 Stage 设计（七步：定位 · 气质 · 结构 · 配色 · 排版 · 内容 · 上线）。
本文只定义 **spec 的形状与解析规则**，不含 UI 与 API 实现。

---

## 一条核心原则

> **spec 只存"决策"，不存"结果"。**

渲染出来的颜色值、字号阶梯、文案，全部由 `resolve(spec)` 现场推导。
spec 里躺着的只有两类东西：客户说过的话，和客户点过的选项。

这一条直接决定了向导最难的那个需求能不能成立：

> 客户回到 Stage 2 换气质时，Stage 4/5 里**手动确认过**的选择要保留，
> 但**系统默认给的**应该跟着变。

如果 spec 存的是结果（`primary: "#294fe5"`），系统无从判断这个蓝色是它自己算出来的、
还是客户特意挑的，于是只剩两个都错的选择：全覆盖（破坏客户决策）或全不覆盖（换气质没反应）。

存决策 + 标注来源，这个问题就消失了。

---

## Provenance：贯穿全 schema 的一个类型

```ts
/** 决策的来源。决定它在上游变化时会不会被重算。 */
type Source =
  | "auto"    // 系统按 tone 推导出来的 —— 上游一变就重算，无需过问客户
  | "chosen"  // 客户从系统给的选项里点了一个 —— 保留，冲突时询问
  | "custom"; // 客户手动调出来的值 —— 永远保留，只做合法性校验

interface Sourced<T> {
  value: T;
  source: Source;
}
```

`auto` 与 `chosen` 的区别不看值，看**客户有没有实际点过**。
系统预选高亮了「石墨」配色，客户没动直接下一步 → 仍是 `auto`。
客户点了「石墨」（哪怕就是预选的那个）→ 变成 `chosen`。

> 这个区分要在 UI 层如实记录，是整套机制的地基。
> 实现时的具体表现：**默认高亮不写 spec，只有 onClick 才写。**

---

## 顶层结构

五层，按向导顺序排列，每层只被它下游的层依赖：

```ts
interface SiteSpec {
  version: 1;
  id: string;                 // 分享链接 / 中断续做的标识
  createdAt: string;
  updatedAt: string;
  furthestStage: StageId;     // 进度条与续做用

  brief:     Brief;              // Stage 0–1
  tone:      Tone;               // Stage 2
  structure: StructureDecisions; // Stage 3
  theme:     ThemeDecisions;     // Stage 4–5
  content:   ContentState;       // Stage 6
}

type StageId =
  | "intent" | "positioning" | "tone" | "structure"
  | "color"  | "type"        | "content" | "ship";
```

依赖方向严格单向 —— `brief → tone → structure → theme → content`。
没有回边，所以任何一层变化时，需要重算的范围是确定的、可枚举的。

---

## Layer 1 · brief（Stage 0–1）

纯事实，不推导，不需要 provenance —— 客户说的就是客户说的。
唯一的例外是 `positioning`：它是 LLM 归纳的，所以要标来源。

```ts
interface Brief {
  intent: "portfolio" | "service" | "landing";   // Stage 0

  name: string;         // 品牌/个人名
  business: string;     // 一句话业务，客户自己的口语
  audience: string;     // 目标客群
  goal: Goal;           // 看完希望对方做什么

  /** LLM 归纳的定位陈述，客户确认过。后续所有文案生成的 system context。 */
  positioning: Sourced<string>;

  /** 影响字体栈（中西文混排）与文案语言。 */
  locale: "zh" | "en" | "zh-en";
}

type Goal = "view-work" | "call" | "book" | "lead";
```

**下游影响**：

| 字段 | 影响谁 |
|---|---|
| `intent` | structure 的默认区块集 |
| `goal` | structure 的默认排序（选 `book`/`call` → 联系区块前移） |
| `locale` | theme 的字体栈候选 |
| `positioning` + `audience` | content 的生成 prompt |

---

## Layer 2 · tone（Stage 2）

```ts
interface Tone {
  liked: [TonePresetId, TonePresetId];  // 选中的 2 张
  disliked: TonePresetId;               // 明确排除的 1 张

  /** 由 liked/disliked 推导，但落盘存储。 */
  vector: ToneVector;
}

/** 四个轴，各自 -1..1。 */
interface ToneVector {
  restraintBold:  number;  // -1 克制  ↔  +1 大胆
  classicModern:  number;  // -1 经典  ↔  +1 当代
  warmCool:       number;  // -1 温暖  ↔  +1 冷峻
  denseAiry:      number;  // -1 密集  ↔  +1 疏朗
}

type TonePresetId = string;  // 六种气质预设，token 值待定调
```

**vector 为什么要落盘**（明明可以从 liked/disliked 算出来）：

1. 它是 Stage 4/5 过滤选项的输入，每次渲染重算没有收益
2. 它要**讲给客户听** ——「你偏克制、偏当代，所以我们把这三套配色收窄给你」
3. 预设的 token 值将来会调整；把当时的 vector 存下来，老 spec 才不会因为
   预设改版而悄悄换了气质

推导方式：`liked` 两者的质心，再沿 `disliked` 的反方向推开一段。

---

## Layer 3 · structure（Stage 3）

```ts
interface StructureDecisions {
  blocks: BlockInstance[];      // 有序；启用与否用 enabled 表示，不从数组里删
  pages: "single" | "multi";

  /** 客户是否动过结构。false = 仍跟随推荐，true = 已冻结。 */
  touched: boolean;
}

interface BlockInstance {
  /** 稳定实例 id。content 以此为键 —— 拖动排序不会丢文案。 */
  id: string;
  kind: BlockKind;
  enabled: boolean;
  variant?: Sourced<string>;   // 区块级布局变体，受 tone 过滤
}

type BlockKind =
  | "hero" | "intro" | "work" | "services"
  | "process" | "proof" | "faq" | "contact";
```

三个刻意的决定：

- **停用的区块留在数组里**（`enabled: false`），不删除。客户改主意时文案还在。
- **`id` 与 `kind` 分开**。content 以 `id` 为键，所以拖动排序、甚至同一 kind 出现两次
  （两个 `services` 区块）都不会串味。
- **`touched` 放在层级而非字段级**。结构是一个整体决策：客户一旦动过顺序，
  整份排序就归他了，系统不该再回来动其中一两个。这比给每个区块单独标 provenance 简单得多，
  且符合直觉。

---

## Layer 4 · theme（Stage 4–5）—— provenance 真正起作用的地方

```ts
interface ThemeDecisions {
  paletteId: Sourced<PaletteId>;
  /** 唯一开放手调的颜色维度，其余由算法跟随。 */
  primary:   Sourced<string>;
  typePairId: Sourced<TypePairId>;
  density:   Sourced<"airy" | "standard" | "compact">;
}
```

整个 theme 层只有四个字段。这是刻意的——
**护栏在系统里，不在客户脑子里**：纸张色、墨色、强调色、字号阶梯、行高、区块内边距
全部由这四个决策 + tone 推导，客户碰不到，也就改不坏。

解析规则：

```ts
function resolveTheme(spec: SiteSpec): ResolvedTheme {
  const base = themeDefaults(spec.tone.vector, spec.brief.locale);

  return {
    palette:  spec.theme.paletteId.source === "auto"  ? base.palette  : lookup(spec.theme.paletteId.value),
    primary:  spec.theme.primary.source   === "auto"  ? base.primary  : spec.theme.primary.value,
    typePair: spec.theme.typePairId.source === "auto" ? base.typePair : lookup(spec.theme.typePairId.value),
    density:  spec.theme.density.source   === "auto"  ? base.density  : spec.theme.density.value,
    // 以下全部推导，永不落盘
    ...deriveScale(density),
    ...deriveSurfaces(palette, primary),
  };
}
```

**对比度护栏**跑在推导的最后一步，而不是选择的时候：
`primary` 无论来自哪一层，落到具体表面色上时都过一遍 WCAG AA 校验，
不通过就自动调整**配套色**（而不是改客户选的主色）。
客户的决策永远保留，系统只调它周围的东西。

---

## Layer 5 · content（Stage 6）

内容是唯一"生成很贵"的层，所以它既要缓存又要可重算。

```ts
interface ContentState {
  /** LLM 生成的首稿缓存。键为 `${blockInstanceId}.${field}`。 */
  generated: Record<string, string>;

  /** 客户就地编辑过的字段。永远优先。 */
  edited: Record<string, string>;

  /** 生成 generated 时的输入指纹，用于判断是否已过期。 */
  fingerprint: string | null;

  assets: {
    logo?: AssetRef;
    images: Record<string, AssetRef>;
  };
}
```

解析：`edited[key] ?? generated[key] ?? placeholder(key)`

**指纹**由 `brief.positioning` + `tone.vector` + 启用区块的 kind 列表哈希得到。
当前指纹与存储指纹不一致时 → 提示「内容依据已变，要重新生成吗？」

> **绝不自动重新生成。** 它花钱，而且会当着客户的面抹掉他刚看顺眼的文案。
> 过期只是一个提示，不是一个动作。

重新生成时 `edited` 原样保留，只刷新 `generated`。

---

## 换气质时发生什么：完整走一遍

客户在 Stage 4 手动点了「暖砂」配色（→ `chosen`），
在 Stage 5 没动字体（→ 仍是 `auto`），
然后回到 Stage 2 把气质从「温暖」改成「冷峻」。

```
1. spec.tone.vector 更新              warmCool: -0.6 → +0.7
2. reconcile(spec, "tone") 逐字段检查：

   theme.typePairId  source=auto    → 直接重算成新气质的推荐字体     ✅ 静默
   theme.density     source=auto    → 直接重算                        ✅ 静默
   theme.primary     source=auto    → 直接重算                        ✅ 静默
   theme.paletteId   source=chosen  → 保留「暖砂」
                                       但「暖砂」不在冷峻气质的推荐集内
                                       → 产出一条 Conflict            ⚠️ 询问

3. structure.touched === false      → 重新套用推荐排序（intent/goal 未变，实际无变化）
4. content.fingerprint 失配          → 标记为过期，提示可重新生成      ⚠️ 提示
5. 渲染：字体和留白立刻变冷、变疏；配色仍是暖砂
6. UI 浮出一条：
     「你选过的『暖砂』配色和新的气质不太搭，
       我们建议改用『石墨』。   [保留暖砂]  [改用石墨]」
```

选「改用石墨」→ `paletteId` 写成 `{ value: "graphite", source: "chosen" }`。
仍然是 `chosen`，因为这依然是客户点的。

```ts
function reconcile(spec: SiteSpec, changed: StageId): Conflict[];

interface Conflict {
  field: string;          // "theme.paletteId"
  kept: unknown;          // 客户当前的值
  suggested: unknown;     // 新气质下的推荐值
  reason: string;         // 给客户看的人话
}
```

**冲突永远只提示，不自动执行。** 这是"不可破坏"的字面含义。

---

## 尺寸与存储

spec 只存决策，所以很小：

| 部分 | 量级 |
|---|---|
| brief + tone + theme | ~600 B |
| structure（8 个区块） | ~400 B |
| content.generated | 3–8 KB ← 唯一的大头 |

**分享链接**：编码 `content.generated` 以外的全部内容（它可重算），
gzip + base64url 后约 700–900 字符，可直接进 URL。
接收方打开时重新生成一次文案即可 —— 结构、配色、排版完全一致。

**中断续做**：v1 用 localStorage 存整份 spec（含 `generated`），按 `id` 索引。
需要跨设备续做时再上 `.openai/hosting.json` 里预留的 D1，
schema 简单到一张表：`(id, spec_json, created_at, updated_at)`。

---

## 与现有代码的衔接

- `app/globals.css:3-12` 的 `:root` 变量就是 `ResolvedTheme` 的输出目标。
  改为 `.theme-scope` 后，Stage 2 的六张缩略图 = 六个 `.theme-scope` 容器
  各自吃一份不同的 `resolveTheme()` 结果。
- `app/page.tsx` 里硬编码的 `projects` / `services` / `faqs` 数组，
  就是 `ContentState` 解析后要喂给区块组件的东西。
- 现有 Northline 站点应当能表达为一份完整的 `SiteSpec` ——
  **这是区块库质量的验收标准**：如果它表达不了现在这个站点，
  说明抽象丢了东西，产出会退化成通用模板。

---

## 待定（需要 Peter 定调）

1. 六种气质预设各自的 `ToneVector` 坐标与 token 值
2. 配色方案清单（`PaletteId`）与各自适配的 tone 区间
3. 字体配对清单（`TypePairId`），含中西文混排栈
4. `themeDefaults(vector, locale)` 的具体映射曲线 —— 即"偏冷峻"到底该出什么颜色
