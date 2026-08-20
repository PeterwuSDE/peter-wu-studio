# 网站生成向导 · 六个气质锚点

配套文档：[`wizard-stages.md`](./wizard-stages.md)（七步流程）、
[`wizard-spec-schema.md`](./wizard-spec-schema.md)（spec 形状与解析规则）。

本文定义 Stage 2 的六个锚点，以及 `themeDefaults(vector)` 的混合规则。

---

## 为什么锚点质量 = 产出质量上限

Stage 2 让客户从六张缩略图里选 2 张喜欢、1 张不喜欢，由此得到 tone vector，
再推导出全站 token。这六张图不是装饰——它们同时是：

1. **客户看到的六个选项**
2. **插值的基底**（所有中间态都是它们的混合）

**定锚原则**：每个锚点必须是一个**能独立成立的真实风格**，
而不是在四维坐标系里均匀撒的点。均匀撒点会撒出一堆没人想要的中间态
（衬线字配霓虹色那种）。先保证六个都好看，再让坐标去适应它们。

---

## 四个轴

| 轴 | -1 | +1 |
|---|---|---|
| `restraintBold` | 克制：小字号、低对比、大量留白 | 大胆：巨大字号、高对比、大色块 |
| `classicModern` | 经典：衬线、对称、传统构图 | 当代：无衬线、非对称、几何 |
| `warmCool` | 温暖：米/砂/陶土，暖灰 | 冷峻：冷白/石墨，蓝绿调 |
| `denseAiry` | 密集：紧凑、可见分隔线、高信息量 | 疏朗：大留白、稀疏、慢节奏 |

客户全程看不到这四个数。它们只在系统内部流动，以及被 LLM 翻译成人话
（「你偏克制、偏当代，所以我们把这三套配色收窄给你」）。

---

## 1. 编辑室 · Editorial

> 建筑事务所、独立出版、写作者、顾问。**文字是主角。**

```
restraintBold -0.7   classicModern -0.6   warmCool -0.5   denseAiry +0.4
```

| token | 值 |
|---|---|
| `--paper` / `--paper-alt` | `#f7f4ed` / `#fffdf8` |
| `--ink` / `--ink-soft` | `#26231e` / `#5c574e` |
| `--primary` | `#8c3b2e`（暗酒红） |
| `--accent` | 无 |
| `--line` | `rgba(38,35,30,.16)` |
| display / body / mono | Source Serif 4 · Source Serif 4 · IBM Plex Mono |
| h1 | 42 → 68px，weight 400，tracking -0.01em |
| body | 17px / 1.75 |
| section-pad | 110 → 160px |
| radius | card 3px · pill 3px |
| motion | subtle |

## 2. 旷野 · Open　←　现有 Northline 站点

> 设计工作室、精品服务商、需要有存在感但不咄咄逼人的品牌。

```
restraintBold +0.6   classicModern +0.5   warmCool -0.5   denseAiry +0.6
```

| token | 值 |
|---|---|
| `--paper` / `--paper-alt` | `#f3f0e8` / `#fbfaf6` |
| `--ink` / `--ink-soft` | `#171815` / `#4b4c48` |
| `--primary` | `#294fe5`（hover 态 `#1939bc`） |
| `--accent` | `#d9ff72` 柠檬 · `#ff6b37` 橙 |
| `--line` | `rgba(23,24,21,.18)` |
| display / body / mono | Geist · Geist · Geist Mono；`em` → Georgia 斜体着主色 |
| h1 | 54 → 100px，weight 620，tracking 0 |
| body | 16px / 1.7 |
| section-pad | 90 → 170px |
| radius | card 12px · pill 999px |
| motion | lively |

**这一栏的每个值都来自 `app/globals.css:3-12` 与现有规则，原样照搬。**
它是唯一经过真实打磨的锚点，其余五个应当以它为质量基准。

## 3. 石墨 · Graphite

> 技术公司、开发者工具、金融/法务、B2B 顾问。**信息密度即专业度。**

```
restraintBold +0.5   classicModern +0.8   warmCool +0.8   denseAiry -0.6
```

| token | 值 |
|---|---|
| `--paper` / `--paper-alt` | `#eef0f2` / `#ffffff` |
| `--ink` / `--ink-soft` | `#0d1117` / `#4a5560` |
| `--primary` | `#1a4fd6` |
| `--accent` | `#00b3a4`（冷青） |
| `--line` | `rgba(13,17,23,.14)`　**边框大量可见** |
| display / body / mono | Inter · Inter · IBM Plex Mono（mono 用于所有标签） |
| h1 | 38 → 70px，weight 680，tracking -0.02em |
| body | 15px / 1.55 |
| section-pad | 64 → 104px |
| radius | card 6px · pill 6px |
| motion | subtle |

构图特征：表格化、栅格可见、每行塞更多条目。

## 4. 柔光 · Bloom

> 身心健康、咖啡与餐饮、花艺、私人诊所、亲子。**低压力、可亲近。**

```
restraintBold -0.5   classicModern +0.3   warmCool -0.8   denseAiry +0.8
```

| token | 值 |
|---|---|
| `--paper` / `--paper-alt` | `#fcf8f3` / `#ffffff` |
| `--ink` / `--ink-soft` | `#3b342c`（不用纯黑） / `#7a6f63` |
| `--primary` | `#c2694a`（陶土） |
| `--accent` | `#8ba07c`（鼠尾草绿） |
| `--line` | `rgba(59,52,44,.12)` |
| display / body / mono | Fraunces · Inter · — |
| h1 | 40 → 64px，weight 500，tracking -0.005em |
| body | 17px / 1.8 |
| section-pad | 120 → 190px |
| radius | card 24px · pill 999px |
| motion | subtle（缓慢淡入） |

## 5. 宣言 · Manifesto

> 时装、创意代理、演出与活动、态度鲜明的个人品牌。**要么被记住，要么被讨厌。**

```
restraintBold +1.0   classicModern +0.6   warmCool +0.4   denseAiry -0.5
```

| token | 值 |
|---|---|
| `--paper` / `--paper-alt` | `#ffffff` / `#000000`（整块反色） |
| `--ink` / `--ink-soft` | `#000000` / `#555555` |
| `--primary` | `#ff3b00` |
| `--accent` | `#d6ff00` |
| `--line` | `#000000` 1px 实线 |
| display / body / mono | Archivo Expanded · Inter · — |
| h1 | 72 → 170px，weight 800，tracking -0.035em，**line-height 0.9** |
| body | 16px / 1.5 |
| section-pad | 72 → 120px |
| radius | **全部 0** |
| motion | lively（快、硬切，无缓动） |

## 6. 器物 · Atelier

> 珠宝、高端室内、律所、私人执业、藏品。**贵在克制。**

```
restraintBold -0.8   classicModern -0.4   warmCool +0.5   denseAiry +0.9
```

| token | 值 |
|---|---|
| `--paper` / `--paper-alt` | `#f2f2f0` / `#ffffff` |
| `--ink` / `--ink-soft` | `#16181a` / `#6b6f73` |
| `--primary` | `#2c4a3e`（深松绿） |
| `--accent` | 无 |
| `--line` | `rgba(22,24,26,.12)` 发丝线 |
| display / body / mono | Playfair Display · Inter · — |
| h1 | **34 → 56px**（刻意小），weight 400，tracking +0.01em |
| body | 15px / 1.7；标签用小型大写 + tracking 0.14em |
| section-pad | 150 → 230px |
| radius | card 2px · pill 2px |
| motion | none |

---

## 对比度实测

全部实测值（`scripts/` 下应补一个校验脚本，纳入 `npm test`）：

| 组合 | 比值 | 结果 |
|---|---|---|
| 编辑室 ink / paper | 14.25:1 | AA ✓ |
| 编辑室 primary / paper | 6.88:1 | AA ✓ |
| 编辑室 白字 / primary | 7.55:1 | AA ✓ |
| 旷野 ink / paper | 15.65:1 | AA ✓ |
| 旷野 白字 / primary | 6.28:1 | AA ✓ |
| 石墨 ink / paper | 16.57:1 | AA ✓ |
| 石墨 白字 / primary | 6.70:1 | AA ✓ |
| 柔光 ink / paper | 11.59:1 | AA ✓ |
| **柔光 白字 / primary** | **3.88:1** | **仅大字号达标** ⚠️ |
| 宣言 黑字 / accent | 18.16:1 | AA ✓ |
| **宣言 白字 / primary** | **3.57:1** | **仅大字号达标** ⚠️ |
| 器物 ink / paper | 15.88:1 | AA ✓ |
| 器物 白字 / primary | 9.74:1 | AA ✓ |

### 护栏在两个锚点上会真实触发

柔光的陶土色和宣言的橙红色，配白字都够不到 4.5:1。
按 [schema](./wizard-spec-schema.md) 的规则，系统**不改客户选的主色**——
主色仍用于标题、图标、大字号 CTA（大字号 3:1 即达标）；
只有**小字号按钮的底色**被压深到达标为止：

| 锚点 | 展示用主色 | 小字 CTA 底色 | 压深后 |
|---|---|---|---|
| 柔光 | `#c2694a` | `#b16043` | 4.54:1 ✓ |
| 宣言 | `#ff3b00` | `#e03400` | 4.51:1 ✓ |

压深沿明度方向进行，保持色相不变（柔光 ×0.91，宣言 ×0.88），
所以视觉上仍是同一个颜色，客户不会察觉主色被动过。

---

## 覆盖度自检

| 轴 | 分布 |
|---|---|
| `restraintBold` | -0.8 器物 · -0.7 编辑室 · -0.5 柔光 · +0.5 石墨 · +0.6 旷野 · +1.0 宣言 |
| `classicModern` | -0.6 编辑室 · -0.4 器物 · +0.3 柔光 · +0.5 旷野 · +0.6 宣言 · +0.8 石墨 |
| `warmCool` | -0.8 柔光 · -0.5 编辑室 · -0.5 旷野 · +0.4 宣言 · +0.5 器物 · +0.8 石墨 |
| `denseAiry` | -0.6 石墨 · -0.5 宣言 · +0.4 编辑室 · +0.6 旷野 · +0.8 柔光 · +0.9 器物 |

四个轴都有两端锚点，没有空白区间。

---

## themeDefaults(vector)：怎么混

**vector 的算法**：`likes` 两个锚点坐标取质心，再沿 `disliked` 的反方向推开 0.25。

混合分两类字段，这是防止出现"衬线配霓虹"的关键。

### 连续字段 —— 在 top-2 锚点之间线性插值

间距、字号区间、行高、圆角、饱和度微调、动效时长。

```ts
const [a, b] = twoNearestAnchors(vector);
const t = distance(vector, a) / (distance(vector, a) + distance(vector, b));
sectionPad = lerp(a.sectionPad, b.sectionPad, t);
```

### 离散字段 —— 直接取最近的单个锚点，不插值

字体族、图形语言（有无大色块 / 反色区块 / 边框栅格）、
配色的色相关系、字重策略。

> 这些东西没有"中间态"。Georgia 和 Geist 之间不存在 50%，
> 强行插值只会得到两边都不像的东西。

**离散字段取哪一个**：不是先点的那张，而是**推开 disliked 之后离 vector 更近的那张**。
这样"不喜欢"这一票才真正有分量——它决定了最显眼的字体族。

### 必须挡住的边界情况

客户可能同时喜欢**编辑室**和**宣言**（坐标上几乎对角），
质心会落在谁也不像的正中间。

规则：`distance(a, b) > 1.4` 时**不混合**——
取离 vector 更近的那个作为主锚点，只从另一个借**色温**一项（`warmCool` 的插值），
其余全部取主锚点。

宁可给一个明确的风格，也不给一个平均出来的四不像。

---

## 与 Stage 4 / 5 的衔接

Stage 2 之后，客户还要在 Stage 4 选配色、Stage 5 选字体。给他看的是：

- **配色**：top-2 锚点各自的 palette + 1 个由 vector 微调过的变体 = 3 套
- **字体**：top-2 锚点的 pairing + 1 套中性备选 = 3 套

所以锚点的 palette 与字体配对**直接就是 Stage 4/5 的选项池**，
不需要再单独维护配色表和字体表 ——
`PaletteId` / `TypePairId` 与 `TonePresetId` 一一对应。

---

## 待定夺

1. **六个名字**（编辑室 / 旷野 / 石墨 / 柔光 / 宣言 / 器物）—— 客户会看到，要顺口
2. **柔光与器物的主色**（陶土 `#c2694a` / 深松绿 `#2c4a3e`）是提案值，这两个最主观
3. **宣言是否保留** —— 它最极端，可能没有客户敢选；
   但缺了它，`restraintBold` 的 +1 端就空了，
   所有"想大胆一点"的需求都会顶到旷野
4. **字体加载策略** —— `app/layout.tsx` 现走 `next/font/google`，
   Fraunces / Playfair Display / Archivo / Source Serif 4 / IBM Plex Mono 都在库里；
   但 Stage 2 要同屏渲染六套缩略图，意味着首屏需同时加载六套字体。
   需子集化 + 缩略图只加载 display 字重

## 下一步

1. `lib/wizard/anchors.ts` —— 六个锚点的 TypeScript 常量
2. `lib/wizard/theme.ts` —— `themeDefaults()` 与对比度护栏
3. `app/globals.css` 的 `:root` → `.theme-scope` 改造
