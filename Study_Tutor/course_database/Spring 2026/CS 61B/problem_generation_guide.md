# Problem Generation Guide: CS 61B

## Course Snapshot

**Course:** CS 61B – Data Structures  
**Semester:** Spring 2026  
**Institution:** UC Berkeley  
**Language:** Java  
**Core Philosophy:** "Pick the right data structure for the job."

**Exam Structure:**
- **Midterm 1:** Asynchronous, covers Java fundamentals through inheritance (Lectures 1–12)
- **Midterm 2:** Wednesday, April 8, 8–10 PM PT; covers asymptotics through heaps (Lectures 13–20)
- **Final Exam:** Tuesday, May 12, 2026, 8–11 AM (3 hours); cumulative with heavy emphasis on post-MT2 material (graphs, hashing, tries, sorting)

**Exam Logistics:**
- In-person, written, closed-book
- Handwritten cheat sheets allowed (MT2: 2 sheets; Final: typically 3 sheets; printed/tablet-printed confiscated)
- Clobber policy: final percentile can replace midterm scores
- One alternate exam time offered immediately after scheduled exam
- Reference sheets provided with standard Java data structures and common algorithms

---

## Material Inventory Summary

**Supplement files (highest priority, student-provided):**
- ✅ `supplement/03_CS_61B_Topics.pdf` — comprehensive topic list with lecture mapping and exam scoping
- ✅ `supplement/STUDY_GUIDE_CS_61B.html` and `.pdf` — structured exam-level guide covering all 21 major topics with definitions, runtimes, invariants, and exam patterns

**Practice materials:**
- ✅ 48 past exams with solutions (Midterm 1, Midterm 2, Finals from Spring 2015–Spring 2025, Fall 2020–Fall 2025)
- ✅ Midterm 2 review session worksheet with solutions (Spring 2026)
- ✅ MT2 study guide (`.md`) and cheat sheet (`.md`)
- ✅ Reference file of codes for Midterm 1

**Knowledge materials:**
- ✅ Exam policies and study tips
- ✅ 11 discussion section worksheets with solutions (`disc01`–`disc11`)
- ✅ 9 exam prep worksheets with solutions (`examprep02`–`examprep11`)
- ✅ 61B Style Guide
- ✅ 30+ lecture slide decks covering all course content

**Coverage:** Complete. Supplement files provide authoritative scoping. Past exams span 10+ years, showing stable question patterns.

---

## Evidence From Course Materials

### From Supplement Files (Authoritative)

**Topic Progression** (`03_CS_61B_Topics.pdf`):
- **MT1 territory (Lec 1–12):** Java syntax, static vs. instance, references vs. primitives, testing (JUnit), lists (IntList → SLList → DLList → AList → ArrayList), inheritance (extends, super, equals, hashCode, iterators, Comparable/Comparator)
- **MT2 territory (Lec 13–20):** Asymptotics (Big-O/Θ/Ω), recurrences, amortized analysis, Disjoint Sets (Union-Find with path compression and union-by-size), BSTs, B-trees (2-3-4 trees), Red-Black trees, heaps and priority queues
- **Post-MT2 / Final-heavy (Lec 21–40):** Graphs (representations, DFS, BFS, shortest paths [Dijkstra, A*], MSTs [Prim, Kruskal], DAGs and topological sort), hashing (separate chaining, linear probing, double hashing), tries, sorting (selection, insertion, heapsort, mergesort, quicksort, quickselect, radix sorts), theoretical bounds (comparison-based lower bound), compression (Huffman)

**Exam Philosophy** (`STUDY_GUIDE_CS_61B.pdf`):
- Each topic tested via: runtime analysis, invariant verification, trace/draw diagrams, code completion (fill-in-the-blank), True/False conceptual questions
- "Memorize runtime tables cold"
- Problems emphasize corner cases, worst-case vs. best-case distinctions, and choosing optimal data structures
- Code problems restricted: no ternary operators, lambdas, streams, or multiple assignment; strict line limits enforced; one statement per blank

### From Past Exams (2015–2025)

**Question Type Distribution:**
1. **True/False or multiple-choice conceptual** (10–20% of points): invariants, runtime guarantees, data structure properties
2. **Trace/draw problems** (20–30%): draw heap after operations, draw B-tree after insertions, show DFS/BFS traversal order, illustrate tree rotations
3. **Runtime analysis** (15–25%): fill in Big-Θ for given code snippets; identify best/worst/average case; recurrence solving
4. **Code completion** (30–40%): implement helper methods (e.g., `countChar`, comparators, iterator methods, graph traversal functions, sorting subroutines)
5. **Algorithm selection/design** (5–10%): "Which algorithm is best for this scenario?" or "Modify Dijkstra's for this constraint"

**Common Patterns:**
- **Inheritance tracing:** Given class hierarchy with overrides, predict output of method calls (e.g., Spring 2023 Final Q1 "I Got A ...")
- **Heap operations:** Insert/removeMin sequences with bubble-up/bubble-down visualization (Midterm 2 Review Session, multiple finals)
- **Graph shortest path:** Apply Dijkstra or A* step-by-step; identify when A* heuristic is admissible
- **Sorting stability:** Identify which sorts are stable; trace first few swaps of selection/insertion/quicksort
- **B-tree insertion/split:** Draw tree after sequence of inserts, show split/promote operations
- **Hashing collision resolution:** Trace insertions into hash table with linear probing or separate chaining; compute load factor
- **Comparator/Comparable:** Implement custom comparators (e.g., XComparator counting character occurrences — Fall 2020 MT1)
- **Asymptotic bounds:** Given nested loops, derive Θ; given recurrence T(n) = aT(n/b) + f(n), apply Master Theorem
- **Amortized analysis:** Prove ArrayList resize cost is amortized O(1); analyze Union-Find with path compression

**Difficulty Calibration:**
- Early questions: straightforward (e.g., "True/False: BST guarantees log height" → False)
- Mid-exam: moderate traces and fill-ins (e.g., implement iterator `hasNext()`)
- Late questions: complex multi-part scenarios (e.g., design modified Dijkstra, prove amortized bound, write quickselect with custom pivot rule)

**Line Limits and Style Constraints:**
- Code problems enforce strict line counts (e.g., "Our solution uses 7 lines. You may use up to 10.")
- Solutions reformatted per 61B style guide: braces on own lines, if-statements count as ≥3 lines
- Crossing out answers disqualifies them
- Ambiguous or partially filled bubbles graded as incorrect

---

## Main Topics To Test

Based on supplement files and past exam frequency, topics in descending order of exam weight:

1. **Graphs** (Lectures 21–25): ~20–25% of final
   - Representations (adjacency list, adjacency matrix, edge list)
   - Traversals (DFS preorder/postorder, BFS level-order)
   - Shortest paths (Dijkstra, A* with admissible heuristics)
   - MSTs (Prim's, Kruskal's with Union-Find)
   - DAGs and topological sort

2. **Sorting** (Lectures 32–36): ~15–20% of final
   - Basic sorts: selection, insertion, heapsort
   - Quicksort (partitioning, pivot strategies, worst-case, quickselect)
   - Mergesort (stable, guaranteed O(n log n))
   - Comparison-based lower bound (Ω(n log n))
   - Radix sorts (LSD, MSD, counting sort)
   - Stability and in-place properties

3. **Asymptotics and Recurrences** (Lectures 13, 15–16): ~10–15%
   - Big-O, Big-Ω, Big-Θ definitions and proofs
   - Analyzing nested loops, recursive algorithms
   - Master Theorem (including cases a < b^d, a = b^d, a > b^d)
   - Amortized analysis (potential method, aggregate method)

4. **Trees (BSTs, B-trees, Red-Black, Heaps)** (Lectures 17–20): ~15–20%
   - BST operations (search, insert, delete) and worst-case Θ(n)
   - B-tree (2-3-4) insertion, split, promotion
   - Red-Black tree rotations and recoloring
   - Min/max heaps: bubble-up, bubble-down, heapify, runtime guarantees
   - Priority queue ADT

5. **Hashing** (Lectures 26–27): ~10%
   - Hash functions (universal hashing, modular hashing)
   - Collision resolution: separate chaining vs. open addressing (linear probing, double hashing)
   - Load factor and resizing
   - Runtime: expected O(1) under uniform hashing

6. **Tries** (Lecture 28): ~5%
   - Structure, insertion, search
   - Prefix matching
   - Space vs. hash map trade-offs

7. **Inheritance and Java OOP** (Lectures 9–11): ~5–10% (mostly MT1, but appears on final in complex scenarios)
   - Dynamic method selection
   - Casting and runtime types
   - `equals`, `hashCode`, `Comparable`, `Comparator`
   - Iterators (`hasNext`, `next`)

8. **Lists and ADTs** (Lectures 5–8): ~5% (typically only on final in context of another problem)
   - IntList recursion
   - SLList, DLList, AList resizing

9. **Disjoint Sets (Union-Find)** (Lecture 14): ~5% (often paired with MST problems)
   - Quick-union, quick-find
   - Path compression, union-by-size
   - Inverse Ackermann amortized runtime

10. **Testing and Software Engineering** (Lectures 4, 29–31): <5%
    - Rarely heavy on exams; conceptual questions about JUnit, assertions, test coverage

11. **Compression** (Lecture 39): <5%
    - Huffman coding basics
    - Build Huffman tree, compute encoding

---

## Likely Exam / Practice Problem Types

### By Format

1. **True/False Conceptual (1–2 pts each)**
   - "Iterators in Java use the `yield` keyword." (False)
   - "A graph with |V| - 1 edges is always a tree." (False; must also be connected and acyclic)
   - "Red-Black trees guarantee O(log n) height." (True)
   - "Quicksort is stable." (False)

2. **Multiple Choice / Select All That Apply (2–4 pts each)**
   - "Which sorts are stable? □ Mergesort □ Quicksort □ Insertion □ Heapsort"
   - "Which graph algorithms use a priority queue? □ Dijkstra □ Prim □ Kruskal □ DFS"

3. **Draw/Trace Diagrams (5–15 pts)**
   - "Draw the min-heap after inserting [4, 13, 3] then calling removeMin twice."
   - "Draw the 2-3-4 tree after inserting keys [10, 20, 30, 40, 50]."
   - "Show the order nodes are visited in BFS starting from vertex A."
   - "Draw the Red-Black tree after inserting 15 into this BST, then perform rotations."

4. **Fill-in-the-Blank Runtime Analysis (3–8 pts)**
   - "The worst-case runtime of inserting into a BST is Θ(___)."
   - "Dijkstra's algorithm with binary heap runs in Θ(___)."
   - "Union-Find with path compression and union-by-size: find is amortized Θ(___)."

5. **Code Completion (10–30 pts per problem)**
   - Implement `hasNext()` and `next()` for a custom iterator (≤10 lines)
   - Write a comparator that orders strings by number of vowels (≤5 lines)
   - Complete a recursive IntList method (≤8 lines)
   - Implement partition step of quicksort (≤12 lines)
   - Fill in Dijkstra's relaxation loop (≤6 lines)

6. **Algorithm Application (10–25 pts)**
   - "Run Kruskal's algorithm on this graph. Show the MST edges in order added."
   - "Apply quickselect to find the 5th smallest element. Show partition steps."
   - "Compute the Huffman encoding for this frequency table."

7. **Proof / Justification (5–10 pts)**
   - "Prove that comparison-based sorting requires Ω(n log n) comparisons in the worst case."
   - "Show that ArrayList add is amortized O(1) using the potential method."

### By Topic (Cross-Reference)

- **Graphs:** Trace DFS/BFS, run Dijkstra/Prim/Kruskal, detect cycles, topological sort
- **Sorting:** Trace first 3 swaps of selection sort, identify pivot in quicksort, explain stability, apply radix sort
- **Heaps:** Insert/removeMin sequences, heapify array, prove heap property
- **Hashing:** Insert into hash table with collisions, compute load factor, design hash function
- **Trees:** Insert into BST/B-tree/RB-tree, perform rotations, analyze worst-case height
- **Asymptotics:** Derive Θ for nested loops, solve recurrence with Master Theorem
- **Inheritance:** Trace dynamic dispatch, implement equals/hashCode, write Comparator
- **Disjoint Sets:** Trace union/find with path compression, analyze amortized runtime

---

## Topic-To-Problem Mapping

| **Topic** | **Common Problem Types** | **Typical Point Value** |
|-----------|--------------------------|-------------------------|
| **Graphs – Traversal** | Draw DFS/BFS tree, list visit order, identify reachable nodes | 8–15 pts |
| **Graphs – Shortest Path** | Run Dijkstra step-by-step, verify A* heuristic admissibility, find shortest path cost | 10–20 pts |
| **Graphs – MST** | Apply Prim/Kruskal, draw MST, compute total weight | 10–18 pts |
| **Graphs – DAG/Topo** | Topological sort, detect cycle, compute longest path in DAG | 5–12 pts |
| **Sorting – Trace** | Show array after each pass of selection/insertion/quicksort | 5–10 pts |
| **Sorting – Stability** | Identify stable sorts, explain why quicksort is unstable | 3–5 pts |
| **Sorting – Quickselect** | Find kth smallest element, show partitions | 8–15 pts |
| **Sorting – Radix** | Trace LSD radix sort on integers or strings | 8–12 pts |
| **Heaps – Operations** | Insert/removeMin, draw resulting heap | 8–15 pts |
| **Heaps – Runtime** | Fill in Θ for insert/removeMin/heapify | 3–6 pts |
| **Hashing – Collision** | Insert keys into hash table, show collision resolution | 8–12 pts |
| **Hashing – Load Factor** | Calculate α, explain resize threshold | 3–5 pts |
| **Tries – Insert/Search** | Draw trie after insertions, list keys with prefix | 5–
