# CS61B Midterm 2 — Study Guide

This is a fuller companion to `MT2_cheatsheet.md`. Read this if you have time tonight; otherwise focus on the cheat sheet.

---

## Exam Logistics (from Ed Main Post and Exam Policies)

- **When:** Wednesday, April 8, 2026, 8:00–10:00 PM PT (starts promptly 8:10 PM, 110 minutes).
- **Where:** In-person, course staff proctors.
- **Bring:** Cal ID, writing implements, your TWO handwritten double-sided letter sheets.
- **Given to you:** exam packet, reference sheet, scratch paper.
- **Cheat sheet:** TWO double-sided US letter sheets, HANDWRITTEN ONLY. Printed notes are confiscated. No printed diagrams or typed text. No printed-from-tablet.
- **Clobber policy:** if MT2 goes badly, final percentile can replace MT2 score. Reduces pressure; MT2 is not make-or-break.

## Scoring Strategy

1. **Lock in easy tracing points first.** B-tree inserts, Dijkstra traces, Kruskal traces, BST inserts. These are mechanical once you know the rules. Be meticulous.
2. **Memorize runtimes cold.** Every exam has several "what's the runtime of X" questions. Pure memorization → pure points.
3. **Skip and return** on hard conceptual proofs. Don't burn 15 min on 3 points.
4. **Hashing is lightly tested** — don't over-invest. A couple short questions max.
5. **Read tie-breaking rules carefully.** Each question may specify its own tie-breaking rule.

---

## Block 1: Asymptotics

### The question asymptotics answers
"If I double the input size, how much slower does my code get?"

### Method for any runtime problem
1. Count how many times the innermost line runs (write it as a sum or formula).
2. Simplify: drop constants and lower-order terms.
3. The dominant term is your Θ.

### O, Ω, Θ
- **O** = ceiling. Any growth rate at or above the truth is a valid O.
- **Ω** = floor. Any growth rate at or below the truth is a valid Ω.
- **Θ** = tight. Must match the truth exactly.
- Only one Θ answer is ever correct; many O and Ω answers can be correct simultaneously.

### Common loop patterns
- `i++`: n iterations
- `i = i * k` or `i = i / k`: log n iterations (logarithmic growth)
- Nested `[i][j<n]`: n²
- Nested `[i][j<i]`: triangular, still Θ(n²) because sum 1 to n is n(n+1)/2
- `[i*=2][j<i]`: 1+2+4+…+n = Θ(n) (geometric sum dominated by largest term)

### Recursion tree method
For recursive functions, draw the call tree and count work per level.
- `T(n) = 2T(n/2) + O(n)` → n work × log n levels = Θ(n log n). Mergesort.
- `T(n) = 2T(n/2) + O(1)` → geometric, dominated by bottom level of n calls → Θ(n).
- `T(n) = T(n/2) + O(1)` → log n levels, 1 work each → Θ(log n). Binary search.
- `T(n) = T(n−1) + O(n)` → n + (n−1) + … + 1 = Θ(n²). Bubble/selection sort.

### Traps
- Log base doesn't matter. log₂ n = log₁₀ n = ln n up to a constant.
- Big-O is NOT the same as worst case. You can talk about Big-O of any scenario (best, worst, average).
- Amortized vs worst case: ArrayList add is Θ(1) amortized but Θ(n) worst case.
- Space complexity ≠ time complexity. They're separate.

---

## Block 2: Disjoint Sets (Union-Find)

### API
- `connect(a, b)` / `union(a, b)`: merge a's group with b's group.
- `isConnected(a, b)`: are a and b in the same group?
- `find(a)`: return the root of a's tree (the "group id").

### Implementations (evolution toward WQU + Path Compression)
1. **Quick Find:** id array; `isConnected` is Θ(1), `connect` is Θ(n) (scan array).
2. **Quick Union:** parent array; worst-case trees can be tall (Θ(n)).
3. **Weighted Quick Union:** attach smaller tree under larger → height ≤ log n. Ops Θ(log n).
4. **WQU + Path Compression:** during `find`, make every visited node point directly at root. Ops ~Θ(1) amortized.

### The critical mental model
- `parent[]` has n entries ALWAYS. It does not shrink.
- `parent[i]` is the parent of item i. `parent[i] == i` means i is a root.
- `connect(a, b)`: find a's root (rA) and b's root (rB). Modify `parent[rA]` (or rB), **not** `parent[a]`.
- Path compression triggers during `find`, flattening visited nodes.

### CS61B specifics (from Lec 14)
- Use **size** (number of nodes), not height, for weighting.
- Root stores size as a negative number (e.g., -3 means root of a 3-node tree).
- Tiebreaking on equal size is arbitrary per slide 52 — the exam will specify.

---

## Block 3: BSTs and B-Trees

### BST
- Invariant: for every node N, all keys in left subtree < N < all keys in right subtree.
- Search, insert: walk down based on comparisons. Insert adds a leaf where the search would fall off.
- Delete (Hibbard):
  - 0 children: just remove.
  - 1 child: promote child.
  - 2 children: replace with in-order successor (smallest in right subtree), then delete successor recursively.
- Runtime Θ(h). Best-case balanced h = Θ(log n), worst-case spindly h = Θ(n).
- In-order traversal of a BST gives sorted output. Use this as a self-check.

### 2-3-4 Tree (B-Tree with L = 3)
- Nodes hold 1–3 keys (2/3/4 children). A node with 4 keys is overfull.
- All leaves at same depth by construction. Tree is always balanced. Ops Θ(log n).
- **Insertion (CS61B, reactive):**
  1. Walk down to the target leaf like BST.
  2. Insert the key into the leaf (possibly making it overfull).
  3. If overfull, split: promote the **left-middle** key to parent, split remaining keys into two sibling nodes.
  4. If parent becomes overfull, split again (chain reaction).
- Tree grows in height only when the root splits, creating a new root.

---

## Block 4: Rotations + LLRBs

### Rotations
- `rotateLeft(G)`: x = G.right. Make G the new left child of x. Requires G to have a right child.
- `rotateRight(G)`: x = G.left. Make G the new right child of x. Requires G to have a left child.
- Rotations preserve the BST property.
- Use case: reshape a BST without changing its keys. Foundation of self-balancing trees.

### LLRB (Left-Leaning Red-Black Tree)
CS61B uses LLRBs corresponding to **2-3 trees**, NOT 2-3-4 trees.

The idea: an LLRB is a normal BST, but with some links colored "red." A red link is a bookkeeping trick that says "this edge is part of a 3-node from the 2-3 tree view."

### 2-3 → LLRB conversion
- **2-node** in 2-3 tree → single BST node, all children connected by black (normal) links.
- **3-node** `[a, b]` in 2-3 tree → BST pair with `b` as parent and `a` as the red-left child.

### LLRB validity rules
1. Valid BST.
2. All red links lean LEFT (no right-leaning red links).
3. No node has two red children (would correspond to a 4-node, not allowed in 2-3 trees).
4. Perfect black balance: every root-to-null path has the same number of BLACK links.

### Heights
- LLRB height ≤ 2× (2-3 tree height). Since 2-3 tree is Θ(log n), so is LLRB.
- All ops Θ(log n) worst case.

### What's on the exam
- Convert a 2-3 tree to an LLRB (and vice versa).
- Check if a given tree is a valid LLRB.
- Apply a rotation to a given BST.
- Full LLRB insertion is marked as "extra" in the lecture. Focus on the conversion and validity problems.

---

## Block 5: Heaps and Priority Queues

### Structure
- **Complete binary tree** stored in an array (usually root at index 1).
- **Heap order:** for a min-heap, every parent ≤ children. (Max-heap is mirror.)
- Array index math (root at 1): parent of i = i/2. Left child = 2i. Right child = 2i+1.
- No sibling ordering — heap is NOT a BST.

### Operations
- **peek()**: return root. Θ(1).
- **insert(x)**: add at end of array (next open slot), then **bubble up** (swap with parent while smaller than parent). Θ(log n).
- **removeMin()**: save root, move last element to root, **bubble down** (swap with SMALLER child while larger than a child). Θ(log n).
- **heapify**: bottom-up bubble-down from index n/2 to 1. Θ(n).

### Traps
- Bubble down swaps with the **smaller** child (for a min-heap). Swapping with the bigger would violate the heap order on the other side.
- removeMin is not sorting. Doing removeMin repeatedly IS heapsort.
- Shape rule: must be a complete binary tree. New items go to the leftmost open slot on the bottom level.

---

## Block 6: Hashing I

### Basic mechanism
1. Compute `key.hashCode()`.
2. Compute `bucket = Math.floorMod(hashCode, M)`.
3. Store/search within that bucket's linked list (separate chaining).

### Load factor
- LF = N / M (total items / total buckets).
- Resize (typically double M and rehash all keys) when LF exceeds threshold.
- Amortized cost of resize: Θ(1) per insert.

### Runtimes
- Average case (good hash, bounded LF): Θ(1) per op.
- Worst case (everyone collides): Θ(n) per op.

### The hashCode/equals contract
If `a.equals(b)`, then `a.hashCode() == b.hashCode()`. Otherwise the HashMap silently loses keys.

### Traps
- Negative hash codes: use `floorMod`, not `%`.
- Mutable keys: if a key's hash changes after insertion, it becomes unfindable.
- Resize re-assigns every bucket: you can't skip rehashing.

---

## Block 7: Graphs, DFS, BFS

### Representations
- **Adjacency list**: Θ(V+E) space, fast neighbor iteration. Default choice.
- **Adjacency matrix**: Θ(V²) space, Θ(1) edge lookup. Good for dense graphs.

### DFS
- Recursive. Mark-and-recurse-on-neighbors.
- Preorder: order of first visit.
- Postorder: order of completion (after all descendants finish).
- Reverse postorder: used in topological sort.
- Runtime: Θ(V+E).

### BFS
- Uses FIFO queue.
- Mark on ENQUEUE, not on dequeue (critical to avoid re-enqueuing).
- Gives shortest path (fewest edges) in unweighted graphs.
- Runtime: Θ(V+E).

### Traps
- Specify neighbor iteration order (alphabetical, by adjacency list order, etc.) — the question will tell you.
- Disconnected graphs: one DFS/BFS call only visits one component. Loop over all vertices to cover everything.
- DFS tree and BFS tree: the spanning structure built by the traversal.

---

## Block 8: Dijkstra + Topological Sort

### Dijkstra's Algorithm
Shortest paths from a single source, non-negative weights only.

```
Initialize dist[source]=0, dist[v]=∞ for all others
PQ contains all vertices keyed by dist
while PQ is not empty:
    u = removeMin(PQ)
    for each edge (u,v) with weight w:
        if dist[u] + w < dist[v]:    // "relax"
            dist[v] = dist[u] + w
            edgeTo[v] = u
            (update v's priority in PQ)
```

- **Non-negative edges only.** Breaks on negative edges.
- Once a vertex is removeMin'd from the PQ, its distance is final.
- Reconstruct a shortest path by walking `edgeTo` backward from destination to source, then reversing.
- Runtime: Θ(E log V) with a binary heap.

### Topological Sort
For DAGs only. Linear ordering such that for every edge u→v, u appears before v.

**Algorithm (DFS-based, CS61B's approach):**
1. Run DFS from every unvisited vertex.
2. Compute the postorder.
3. Reverse the postorder → topological order.

Runtime: Θ(V+E).

If the graph has a cycle, no valid topological order exists.

---

## Block 9: Minimum Spanning Trees

### The problem
Given a connected, undirected, weighted graph, find a subset of V−1 edges that connects all vertices with minimum total weight.

### Prim's Algorithm
Grow a tree from a starting vertex by repeatedly adding the cheapest edge that connects an in-tree vertex to an out-of-tree vertex. Uses a PQ keyed by edge weight. Θ(E log V).

### Kruskal's Algorithm
Sort all edges by weight. For each edge in increasing order, add it to the MST if it doesn't form a cycle (check with disjoint sets). Stop when MST has V−1 edges. Θ(E log V) (sort dominates).

### Cut property
For any cut (partition of vertices into 2 non-empty sets), the minimum-weight edge crossing the cut is in some MST. This is the theoretical foundation for both algorithms.

### MST ≠ Shortest-path tree
- **MST** minimizes total edge weight across the whole tree.
- **SPT** (built by Dijkstra) minimizes distance from a source to each other vertex.
- They can coincide in special cases but are different problems in general.

### Traps
- MST is undefined on disconnected graphs (you get a "minimum spanning forest").
- Tie-breaking can produce different valid MSTs, all with the same total weight.
- Kruskal's fundamentally depends on disjoint sets for cycle detection.

---

## Final Tips for Exam Day

1. **Tonight: copy the cheat sheet by hand.** ~45 minutes. Don't rush. Neat, legible handwriting. This is your most important prep step.
2. **Sleep.** Cognitive function the next day beats 1 more hour of cramming.
3. **Arrive early.** Exam starts at 8:10 promptly.
4. **Read each question carefully twice.** Misreading a tie-breaking rule or a "non-negative weights" caveat costs more points than any memorization.
5. **Draw everything.** When asked to trace an algorithm, draw explicitly. Show work for partial credit.
6. **Runtime questions are gifts.** Always spend the 30 seconds to answer them first; they're the highest points-per-minute on the exam.
7. **If you blank on a topic, skip and come back.** Your brain will often resolve it in the background.
8. **Remember the clobber policy.** Even a bad MT2 can be replaced by a good final. Breathe.
