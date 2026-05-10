# Problem Generation Guide: ECON 131

## Course Snapshot

**Course:** ECON 131 – Public Economics  
**Instructor:** Prof. Danny Yagan  
**Semester:** Spring 2026  
**Level:** Upper-division undergraduate economics  

**Core Focus:** Evaluate government intervention in the economy using a small set of empirical tools (DiD, RD, event studies) and theoretical concepts (elasticity, deadweight loss, marginal social benefit/cost, optimal taxation). Topics span tax incidence, optimal taxation, externalities, public goods, and social insurance.

**Assessment Structure:**
- Two midterms (75 minutes each, 150 points each)
- Final exam (180 minutes, cumulative, closed-everything—no notes, no calculator, no devices)
- Problem sets (empirical and analytical)
- Weekly section worksheets

**The Yagan Rule (critical for generation):**  
Students MUST memorize **definitions** and **basic formula definitions** (e.g., poverty rate, debt evolution equation, elasticity definitions). They do NOT need to memorize complex **derived formulas** (e.g., optimal top tax rate formula from calculus). They DO need to know the **intuitive lessons** those formulas teach (e.g., "high taxable-income elasticity → low optimal top rate").

---

## Material Inventory Summary

### High-Priority Supplement Files (Student Guidance)
- `supplement/04_ECON_131_Topics.pdf` – Course-wide topic inventory, priorities, and Yagan's explicit rules.
- `supplement/STUDY_GUIDE_ECON_131.pdf` and `.html` – Comprehensive, student-facing study guide with definitions, formulas, diagram sketches, and exam pattern warnings organized by topic block.

### Practice Materials
- **Midterm 1 (2026):** Exam, solutions, graded copy, study guide, key concepts.
- **Midterm 2 (2026):** Exam, solutions, graded copy, study guide, practice problem set, diagram reference, professor announcements.
- **Past exams:** Midterm 2024 (final and solutions), Finals Fall 2019 and Fall 2020.
- **Section worksheets:** 12 sections with problems and solutions (Sections 1–12, Section 11 marked "Skipping").
- **Final exam review materials:** Math setup guide and final review from GSI (Spring 2026).
- **Problem sets:** PS1 (budget/CBO data analysis), PS2 (empirical/analytical), PS3 (coding in Python/R with Chetty mobility data).

### Knowledge Base
- **Syllabus:** Course and section syllabi with grading, policies, community guidelines.
- **Lectures:** 19 lecture PDFs (Lecture 1–19, no Lecture 13) covering intro, empirical tools, budget/debt, income distribution, tax incidence, optimal labor tax, labor supply, business tax, capital tax/savings, externalities, public goods, local public goods, education, social insurance, UI/DI/WC, health insurance, social security. Several include live Stata analysis PDFs.
- **Reference material:** Lecture 02 (theory tools) marked as reference only.

### Evidence Quality
**High confidence:** Supplement files provide explicit, curated guidance on what to test, how, and what to avoid. Actual exams and solutions show realized question types and grading rubrics. Study guides synthesize Yagan's pedagogical philosophy directly.

---

## Evidence From Course Materials

### Supplement Files Shaped This Guide
Yes—**three high-priority supplement files were available and heavily used:**

1. **`04_ECON_131_Topics.pdf`**: Lists all 19 lectures, Gruber chapter mapping, priority tags (HIGH/MEDIUM/LOW), topic summaries, and Yagan's explicit rule on memorization vs. conceptual understanding. States that the final is "closed everything" and "memory load is the binding constraint." Warns that the final replaces the lower midterm score if it improves grade → high-leverage.

2. **`STUDY_GUIDE_ECON_131.pdf/.html`**: Exhaustive topic-by-topic guide with:
   - "9 Mandatory Definitions" to memorize cold.
   - Formula tags: "⚠ MEMORIZE" vs. concept-only.
   - Diagram sketches (ASCII art and prose descriptions of geometry).
   - "Exam patterns / pitfalls" subsections for each concept.
   - Plain-English explanations of why each concept matters.
   - Explicit warnings: "Do not memorize the optimal top tax rate formula mathematically; know the lesson it teaches."

3. **Section 2026 materials**: GSI advice on T/F/U strategy, identifying what the question is *actually asking*, recognizing relevant topics, and avoiding common pitfalls (e.g., assuming hypotheticals are true, not debating political feasibility).

### Exam Format Evidence (High Confidence)

**Midterm 1 (2026, 75 min, 150 pts):**
1. True/False/Uncertain (5 questions × 10 pts = 50 pts): Short conceptual statements requiring economic reasoning.
2. Empirical Application (50 pts): Interpret a study (e.g., Best & Kleven housing tax experiment), assess causal identification, interpret DiD estimates.
3. Analytical/Math Problem (50 pts): Government budget dynamics, labor supply model with taxes, utility maximization.

**Midterm 2 (2026, 75 min, 150 pts):**
1. T/F/U (6 questions × 10 pts = 60 pts): Harder conceptual coverage (business tax, capital tax, externalities, public goods).
2. Empirical Application (30 pts): Event study or DD regression interpretation (lectures 08–14, including event study methods).
3. Analytical/Math Problem (60 pts): Optimal labor tax, business tax math, savings models, externalities, NIT budget constraints, public goods.

**Final (2026, 180 min, cumulative):**
- Format inferred: closed-everything, written, on paper, no calculator.
- Likely structure: T/F/U section, multiple analytical/math problems spanning all topics (taxation, externalities, public goods, social insurance, education, health, social security), possibly one empirical interpretation.
- Emphasis on **definitions, formulas flagged for memorization, and conceptual lessons** rather than rote derivations.

**Past Finals (Fall 2019, Fall 2020):**
- T/F/U questions (e.g., "generous welfare causes less work," "coffee subsidy creates DWL," "EITC is desirable," "capital tax reduces savings").
- Analytic problems: labor supply with taxes, savings models, insurance expected utility, public goods Samuelson condition.
- Empirical interpretation: assess causality, identify threats, interpret DiD.

---

## Main Topics To Test

Organized by **lecture block and priority** (from supplement guide):

### Block A: Foundations (Lectures 01–04) – Midterm 1 Core
- **L01 Intro (LOW):** Why government intervenes; market failures; redistribution; normative vs. positive analysis.
- **L02 Theory Tools (MEDIUM):** Utility maximization, budget constraint, MRS, income/substitution effects, elasticity definitions.
- **L03 Empirical Tools (HIGH):** Difference-in-differences, parallel pre-trends, RCTs, natural experiments, event studies.
- **L04 Budget & Debt (HIGH):** Debt dynamics equation `Δ(Debt/GDP) = (r-g)×(Debt/GDP) + primary deficit/GDP`, Laffer curve, revenue-maximizing tax rate, sustainable debt conditions.

### Block B: Taxation – Part 1 (Lectures 05–07) – Midterm 1 Core
- **L05 Income Distribution & Poverty (HIGH):** Official vs. true poverty rate, CPI-RS adjustment, Gini coefficient, top income shares, inequality trends, EITC design.
- **L06 Tax Incidence (HIGH):** Economic vs. statutory incidence, elasticity determines burden, DWL formula `0.5 × ε × t² × Q`, Danish high-earner mobility study.
- **L07 Optimal Labor Tax (HIGH):** Optimal top tax rate formula concept, equity-efficiency trade-off, extensive vs. intensive margin, taxable income elasticity, sufficient statistics approach.

### Block C: Taxation – Part 2 (Lectures 08–10) – Midterm 2 Focus
- **L08 Labor Supply Evidence (HIGH):** Real vs. avoidance responses, EITC empirical effects (Eissa & Liebman, Meyer & Rosenbaum), taxable income elasticity, bunching at kinks.
- **L08B Event Study (HIGH):** DD regression `Y = α + βT + γPost + δ(T×Post)`, coefficient interpretation, event study plots.
- **L09 Business Tax (HIGH):** Cost-of-capital model, gross vs. net profit tax, immediate vs. delayed depreciation, traditional vs. new view of dividends, C-corp vs. S-corp, tax avoidance.
- **L10 Taxes & Savings (MEDIUM):** Life-cycle savings model, substitution vs. income effect on savings, consumption tax equivalence, wealth inequality, estate tax, bequest motives.

### Block D: Externalities & Public Goods (Lectures 11–14) – Midterm 2 & Final
- **L11 Externalities (HIGH):** SMC vs. PMC, Coase theorem, corrective taxes vs. tradable permits, DWL from externalities, uncertainty and policy choice (Weitzman), climate policy.
- **L12 Public Goods (MEDIUM/HIGH):** Private vs. public goods, non-rivalry, non-excludability, free-rider problem, Samuelson condition (sum of MRS = MRT), voluntary provision inefficiency.
- **L14 Local Public Goods (MEDIUM):** Tiebout sorting, capitalization into house prices, optimal community size, zoning.

### Block E: Social Insurance & Spending (Lectures 15–19) – Final Focus
- **L15 Education (MEDIUM):** Human capital vs. signaling, peer effects, tracking, returns to schooling (Angrist & Krueger IV).
- **L16 Social Insurance (HIGH):** Adverse selection, moral hazard, efficient risk-bearing, Akerlof lemons, Rothschild-Stiglitz.
- **L17 Unemployment Insurance (HIGH):** Baily-Chetty sufficient statistics formula, replacement rate, consumption smoothing, job search moral hazard, UI optimal design.
- **L17 (cont.) DI & Workers' Comp (MEDIUM):** Disability Insurance incidence and moral hazard, workers' compensation benefit-duration trade-off.
- **L18 Health Insurance (HIGH):** RAND Health Insurance Experiment, ACA effects, adverse selection in exchanges, mandate rationale, Medicaid expansion (Oregon experiment).
- **L19 Social Security (MEDIUM):** PAYG vs. funded systems, intergenerational redistribution, implicit tax on work, myopia and paternalism rationale.

---

## Likely Exam / Practice Problem Types

### Type 1: True/False/Uncertain with Explanation (T/F/U)
**Weight:** 50–60 points on midterms; likely substantial portion of final.

**Structure:**
- Short declarative statement (1–3 sentences).
- Student writes "True," "False," "Uncertain," "Partially true," etc. (label choice irrelevant).
- **Grade entirely on explanation** (3–10 lines; longer than 10 lines not graded).
- Must apply **economic logic** related to social welfare, efficiency, equity, behavioral responses, or empirical evidence.

**Content Patterns (from actual exams):**
- **Causal inference:** "Large sample makes correlation causal" (FALSE—large N ≠ identification).
- **Budget/debt:** "If g > r, government can run primary deficit and stabilize Debt/GDP" (TRUE).
- **Tax incidence:** "Most tax burden falls on consumers when supply slope = 1, demand slope = -1000" (FALSE—elastic side escapes).
- **Optimal taxation:** "EITC desirable when intensive margin > extensive margin" (FALSE—EITC targets extensive margin).
- **Business tax:** "Cut corporate rate + immediate expensing → investment increases" (PARTIALLY TRUE—expensing clear, rate cut ambiguous).
- **Capital tax:** "Capital tax must reduce savings" (FALSE—income effect can dominate).
- **Externalities:** "Data center raises electricity prices → market failure" (FALSE—pecuniary externality, not real externality).
- **Public goods vs. externalities:** Distinguish real externality (SMC ≠ PMC) from pecuniary (price-mediated).
- **Permits vs. taxes under uncertainty:** Steep MB curve + uncertain MC → permits preferred (Weitzman).
- **Behavioral claims:** "High welfare → people work less, so welfare causes less work" (UNCERTAIN—correlation ≠ causation).

**Common Pitfalls (from GSI advice & grading rubrics):**
- Restating the statement without adding economic reasoning.
- Confusing correlation with causation.
- Misidentifying pecuniary externalities as market failures.
- Assuming political feasibility matters when question asks for economic effect.
- Missing baseline assumptions (e.g., "equal utility functions" for utilitarian result).

---

### Type 2: Empirical Application / Study Interpretation
**Weight:** 30–50 points on midterms; likely one question on final.

**Structure:**
- Describe a study (often real: Best & Kleven housing tax, Eissa & Liebman EITC, RAND HIE, Oregon Medicaid, Chetty mobility, Danish high-earner migration).
- Provide data table, graph (event study plot, DiD chart), or regression setup.
- Ask 3–5 sub-questions:
  1. What is the causal question?
  2. What is the identification strategy (DiD, RD, RCT, IV)?
  3. Assess internal validity: parallel trends? selection bias? confounders?
  4. Interpret coefficient (e.g., "What does δ = -0.15 mean in `Y = α + βT + γPost + δ(T×Post)`?").
  5. External validity: generalize to other settings?
  6. Policy implication.

**Common Study Types:**
- **DiD:** Treatment group vs. control group, before/after. Check parallel pre-trends. Interpret `δ` as causal effect.
- **Event study:** Plot coefficients by year relative to treatment. Flat pre-period → valid; jump at t=0 → effect.
- **RD:** Discontinuity at threshold (e.g., income cutoff for benefit). Check no sorting at cutoff.
- **RCT:** Random assignment (RAND HIE, Oregon Medicaid lottery).
- **IV:** Instrument for endogenous variable (Angrist & Krueger use quarter of birth → schooling).

**Grading Evidence (from Midterm 1 rubric):**
- Full credit requires **explicit reasoning** about identification threats (e.g., "pre-existing differences could explain gap").
- Partial credit for mentioning DiD or parallel trends without explaining *why* they matter.
- No credit for restating numbers without interpretation.

---

### Type 3: Analytical / Math Problem – Government Budget & Debt
**Weight:** 12–16 points on Midterm 1; may appear on final.

**Setup:**
- Debt evolution equation: `Δ(Debt/GDP) = (r - g) × (Debt₀/GDP) + (Primary Deficit/GDP)`.
- Given values for `r`, `g`, `Debt₀/GDP`, spending, tax revenue.
- Tasks:
  1. Compute primary deficit.
  2. Compute change in Debt/GDP.
  3. Find tax rate or spending level to stabilize Debt/GDP.
  4. Draw Laffer curve (tax revenue vs. tax rate).
  5. Identify revenue-maximizing tax rate (top of Laffer curve).

**Key Formulas to Memorize (from study guide):**
- Debt dynamics: `d(Debt/GDP)/dt = (r - g) × (Debt₀/GDP) + (G - T)/GDP`
- Stabilization condition: `Primary Deficit/GDP = -(r - g) × (Debt₀/GDP)`
- Laffer curve peak: occurs where `ε_taxable_income,net-of-tax
