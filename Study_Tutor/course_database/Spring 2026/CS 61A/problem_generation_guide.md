# Problem Generation Guide: CS 61A

## Course Snapshot

**CS 61A — Structure and Interpretation of Computer Programs** is Berkeley's foundational computer science course that teaches programming through three paradigms: **functional (Python)**, **object-oriented (Python)**, and **declarative (Scheme, SQL)**. The course emphasizes the **environment model** as the unifying evaluation framework. Students must master reading, writing, tracing, and interpreting code across all three languages.

**Final exam format (Spring 2026):**
- **Date:** Tuesday, May 12, 2026
- **Duration:** ~3 hours, in-person, written
- **Cheat sheet:** 2 double-sided pages of handwritten notes (standard; confirm before Day 1)
- **Cumulative:** Covers all material, but emphasizes post-Midterm 2 topics (Scheme interpreters, tail calls, streams, SQL)

**Course philosophy:** Strip programming down to a small set of evaluation rules, then rebuild the same conceptual model in three different syntaxes.

---

## Material Inventory Summary

### Supplement files (highest priority)
✅ **3 supplement files available** — these define course scope, priorities, and student-identified weak points:
1. `supplement/02_CS_61A_Topics.pdf` — **official topic list, priorities, workload plan**
2. `supplement/STUDY_GUIDE_CS_61A.html` / `.pdf` — **exam-level concept catalog with definitions, templates, tracing examples, and pitfall warnings**

### Practice exams
✅ **17 past exams with solutions:**
- 5 finals (Fa24, Fa25, Sp25, Su24, Su25)
- 7 midterms (Fa24 MT1/MT2, Fa25 MT1/MT2, Sp25 MT1/MT2, Su24/Su25 midterm)
- Exam PDFs + solution PDFs for all

### Handwritten student references
✅ **3 handwritten study aids:**
1. `61A_Exam_Reference.md` — pattern→template trigger sheet
2. `CS61A_Midterm1_StudyGuide.pdf` — MT1 condensed reference (expressions, HOF, recursion, env diagrams)
3. `CS61A_Midterm2_StudyGuide.pdf` + `MT2_Code_Trigger_Sheet.md` — MT2 material (OOP, linked structures, Scheme intro)

### Lecture slides
✅ **28 slide decks** covering the full semester (some gaps due to holidays/exams):
- Pre-MT1: Functions, control, HOF, environments, recursion, trees
- MT1–MT2: Sequences, mutability, iterators, generators, OOP (objects, attributes, inheritance, composition)
- Post-MT2: Scheme, interpreters, macros, SQL (queries, aggregation, recursive CTEs)

---

## Evidence From Course Materials

### From `supplement/02_CS_61A_Topics.pdf`
**Evidence-backed claims:**
- **Languages tested:** Python (primary), Scheme, SQL
- **Final exam emphasis:** Post-MT2 material (Scheme depth, interpreters, tail calls, streams, SQL), but cumulative — "expects you to have all of MT1/MT2 still cold"
- **Midterm split:**
  - MT1: tracing + functional programming
  - MT2: OOP + linked structures + Scheme intro
  - Final: everything + Scheme depth + SQL
- **Core evaluation model:** Environment model (frames, parents, name lookup) is the foundation for all tracing

### From `supplement/STUDY_GUIDE_CS_61A.pdf`
**Evidence-backed claims:**
- **18 canonical topic blocks**, each structured as:
  - Formal definition
  - Plain English explanation
  - Code template students should write from memory
  - Trace example or diagram
  - **Exam patterns / pitfalls** — explicit warnings about what 61A finals test
- **Most common pitfalls identified:**
  - Confusing `print(x)` (returns `None`) with returning `x`
  - Setting a frame's parent to the **calling** frame instead of the function's **definition** frame
  - Forgetting that lambda closures capture their parent frame
  - Mutability vs. identity (`==` vs. `is`, list aliasing)
  - Iterator exhaustion (calling `next()` on a consumed iterator)
  - Scheme evaluation order and quote/quasiquote misuse
  - SQL aggregation without `GROUP BY`

### From past exam solutions (Fa24, Fa25, Sp25, Su24, Su25 finals)
**Evidence-backed patterns:**
1. **"What Would Python Display?"** — always first question, 3–5 subparts, tests:
   - Generator/iterator behavior (`yield`, `yield from`, `next()`, exhaustion)
   - Lambda closures and environment capture
   - List/dict mutation and aliasing
   - Higher-order functions with side effects
2. **Environment diagrams** — 1–2 questions, 2–3 frames deep, asks "what is displayed by `print(...)` on line X?"
3. **Code-writing (Python)** — fill-in-the-blank or complete a function:
   - Recursive tree processing (Tree class)
   - Generator functions (yielding filtered/transformed data)
   - Linked list manipulation (Link class)
4. **Scheme code-writing** — implement recursive functions, often tail-recursive or using helper functions
5. **Scheme tracing** — "What Would Scheme Display?" with `cons`, `car`, `cdr`, `map`, `filter`, tail calls
6. **Interpreter questions** — modify or extend a Scheme/Calculator interpreter (add a special form, fix evaluation logic)
7. **SQL queries** — write `SELECT` statements with:
   - JOINs (explicit or implicit)
   - Aggregation (`GROUP BY`, `HAVING`)
   - Recursive CTEs (`WITH RECURSIVE`)
   - Subqueries

### From `61A_Exam_Reference.md` and `MT2_Code_Trigger_Sheet.md`
**Evidence-backed trigger patterns:**
- **See nested `def`** → trace parent frame of inner function at definition time
- **See `lambda` in a loop** → each lambda captures the **current** value of loop variable (common trap)
- **See `yield`** → function returns a generator; must call `next()` to get values
- **See `Link` or `Tree`** → recursive base case is `Link.empty` or `tree.is_leaf()`
- **See `sum(...)` or `all(...)`** → check if generator is consumed before second use
- **See `GROUP BY` without all selected columns** → SQL error
- **See Scheme `map`/`filter`** → returns a Scheme list, not a Python list

---

## Main Topics To Test

### Tier 1: Core mechanics (tested every exam)
1. **Environment model & tracing** — frames, parents, name lookup, return values
2. **Higher-order functions & lambda** — closures, returning functions, function as arguments
3. **Recursion & tree recursion** — base case, recursive case, tree-shaped problems
4. **Iterators & generators** — `yield`, `yield from`, `next()`, exhaustion, lazy evaluation
5. **Mutability & aliasing** — list/dict mutation, `==` vs. `is`, shallow vs. deep copy
6. **Object-oriented programming** — classes, `__init__`, inheritance, `super()`, method lookup
7. **Scheme syntax & evaluation** — `cons`, `car`, `cdr`, `map`, `filter`, `lambda`, special forms
8. **SQL queries** — `SELECT`, `JOIN`, `GROUP BY`, `HAVING`, subqueries

### Tier 2: Advanced topics (finals only, post-MT2)
9. **Linked lists (`Link` class)** — recursive list processing, building lists
10. **Trees (`Tree` class)** — recursive tree traversal, mutation, construction
11. **Tail calls & tail recursion** — recognizing tail context, converting to tail-recursive form
12. **Streams (lazy Scheme lists)** — `cons-stream`, `car`, `cdr-stream`, infinite sequences
13. **Interpreters** — evaluating expressions, `eval`/`apply`, special forms, environment lookup
14. **Programs as data** — Scheme code as lists, `quote`, `quasiquote`, `unquote`
15. **Macros** — `define-macro`, transforming unevaluated expressions
16. **Recursive CTEs in SQL** — `WITH RECURSIVE`, base + recursive union

### Tier 3: Foundational (MT1 only, assumed knowledge by final)
17. **Expressions & control flow** — pure vs. non-pure functions, short-circuit evaluation
18. **Sequences & comprehensions** — list/dict comprehensions, slicing, `map`/`filter`

---

## Likely Exam / Practice Problem Types

### Type 1: "What Would Python Display?" (WWPD)
**Frequency:** Every exam, always first question, 5–8 points  
**Format:** Given 5–15 lines of tricky Python code; answer "what does this print?" for 3–5 expressions  
**Tests:**
- Generator/iterator mechanics (yield, yield from, next(), exhaustion)
- Lambda closures capturing variables from enclosing scope
- List/dict mutation and aliasing
- Higher-order functions with side effects (e.g., `print` inside `map`)
- Short-circuit evaluation (`and`, `or`)

**Answer format:** Exact Python repr output, or `ERROR`, or `Iterator`, or `Generator`

---

### Type 2: Environment Diagram Tracing
**Frequency:** 1–2 per exam, 4–8 points  
**Format:** Given 10–20 lines of Python code with nested `def` or lambda; draw the environment diagram, then answer:
- "What is displayed by `print(...)` on line X?"
- "What is the value of variable `y` in frame f3?"
- "How many frames exist after line X?"

**Tests:**
- Frame creation, parent pointers (function's parent = frame where function was **defined**)
- Name lookup (local → parent → ... → global)
- Return values (not bindings)
- Lambda parent frames
- Mutation of shared objects across frames

**Answer format:** Single value (number, list, `None`, etc.) or diagram annotations

---

### Type 3: Code-Writing — Python Recursion
**Frequency:** 2–3 per exam, 4–6 points each  
**Format:** "Complete the function `foo(...)` that does X." Often 1–3 blanks to fill in.  
**Common tasks:**
- Process a Tree recursively (sum all labels, filter by condition, build a new tree)
- Process a Link recursively (count elements, reverse, interleave)
- Implement a generator that yields filtered/transformed values
- Write a higher-order function that returns a closure

**Tests:**
- Correct base case (e.g., `tree.is_leaf()`, `link is Link.empty`)
- Correct recursive call (e.g., `[foo(b) for b in tree.branches]`)
- Correct use of `yield` vs. `return`

**Answer format:** Fill-in-the-blank code, or write 3–8 lines of Python

---

### Type 4: Code-Writing — Scheme
**Frequency:** 2–3 per final, 4–6 points each  
**Format:** "Implement `(define (foo x) ...)` that does X."  
**Common tasks:**
- Recursive list processing (filter, map, fold)
- Tail-recursive function with helper
- Build a Scheme list using `cons`
- Implement a higher-order function (e.g., `(define (twice f) (lambda (x) (f (f x))))`)

**Tests:**
- Correct Scheme syntax (`cond`, `if`, `cons`, `car`, `cdr`)
- Tail recursion (final exam often asks "rewrite this to be tail-recursive")
- Proper use of `quote` vs. unquoted symbols

**Answer format:** Fill-in-the-blank Scheme code, or write 3–8 lines of Scheme

---

### Type 5: Scheme Tracing ("What Would Scheme Display?")
**Frequency:** 1–2 per final, 3–5 points  
**Format:** Given Scheme expressions; answer "what does this print?"  
**Tests:**
- Evaluation order (operands evaluated before operator)
- List construction (`cons`, `list`, `append`)
- Tail call optimization (does this recurse forever or return?)
- Special forms (`quote`, `define`, `lambda`, `let`)

**Answer format:** Scheme value (e.g., `(1 2 3)`, `#t`, `5`)

---

### Type 6: Interpreter Modification
**Frequency:** 1 per final, 6–10 points  
**Format:** "Modify the `scheme_eval` or `calc_eval` function to support feature X."  
**Common tasks:**
- Add a new special form (e.g., `(begin ...)`, `(while ...)`)
- Implement `eval` for a new expression type
- Fix a bug in environment lookup
- Add tail call optimization logic

**Tests:**
- Understanding `eval`/`apply` separation
- Correct environment frame creation
- Correct recursion (often tail-recursive)

**Answer format:** Fill-in-the-blank Python code (3–10 lines)

---

### Type 7: SQL Query Writing
**Frequency:** 2–3 per final, 4–8 points each  
**Format:** "Write a SQL query that returns X from tables Y and Z."  
**Common tasks:**
- JOIN two tables (explicit `INNER JOIN` or implicit comma join)
- Aggregate with `GROUP BY` + `HAVING`
- Subquery in `WHERE` or `FROM`
- Recursive CTE (e.g., "find all ancestors of node N")

**Tests:**
- Correct `GROUP BY` (all non-aggregated columns must be in `GROUP BY`)
- Correct `HAVING` (filter on aggregated values, not `WHERE`)
- Correct recursive CTE syntax (`WITH RECURSIVE`, base UNION recursive case)

**Answer format:** Complete SQL query (3–10 lines)

---

### Type 8: SQL Tracing ("What Would SQL Display?")
**Frequency:** 0–1 per final, 3–5 points  
**Format:** Given a SQL query; answer "what rows are returned?"  
**Tests:**
- Understanding JOIN semantics (cross product + filter)
- Aggregation with `GROUP BY`
- Subquery evaluation order

**Answer format:** Table of rows (sometimes multiple-choice)

---

### Type 9: Conceptual Multiple-Choice (rare)
**Frequency:** 0–1 per final, 1–3 points  
**Format:** "Which statement is true?" or "What does NP stand for?"  
**Tests:** High-level CS concepts (complexity, recursion depth, tail calls, streams)

**Answer format:** Select one or more choices

---

## Topic-To-Problem Mapping

| **Topic** | **WWPD (Python)** | **Env Diagram** | **Code: Python** | **Code: Scheme** | **Scheme Trace** | **Interpreter** | **SQL Write** | **SQL Trace** |
|-----------|:-----------------:|:---------------:|:----------------:|:----------------:|:----------------:|:---------------:|:-------------:|:-------------:|
| Environment model | ✓ | ✓✓✓ | — | — | — | ✓ | — | — |
| Higher-order functions | ✓✓ | ✓✓ | ✓ | ✓✓ | ✓ | — | — | — |
| Lambda closures | ✓✓✓ | ✓✓✓ | ✓ | ✓ | ✓ | — | — | — |
| Recursion | ✓ | ✓ | ✓✓✓ | ✓✓✓ | ✓✓ | ✓ | — | — |
| Tree recursion | — | — | ✓✓✓ | ✓✓ | ✓ | — | — | — |
| Iterators | ✓✓✓ | — | ✓ | — | — | — | —
