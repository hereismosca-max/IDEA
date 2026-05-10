# CS61B MT2 Cheat Sheet — HANDWRITE THIS

**COPY THIS BY HAND onto your two double-sided letter sheets.** Printed notes are confiscated. The act of writing it is itself a final review pass.

---

## SHEET 1 — Side A: Runtimes + Asymptotics

### Growth hierarchy (slowest → fastest)
`1 ≪ log n ≪ √n ≪ n ≪ n log n ≪ n² ≪ n³ ≪ 2ⁿ ≪ n!`

### O / Ω / Θ
- **O** = upper bound (ceiling). Ceiling at or above truth is valid.
- **Ω** = lower bound (floor). Floor at or below truth is valid.
- **Θ** = tight bound. Must match exactly.
- Rule: drop constants and lower-order terms → dominant term is Θ.

### Loop patterns
- `i++` → n iter
- `i *= k` or `i /= k` (k > 1) → log n iter
- Nested `[i][j<n]` → n²
- Nested `[i][j<i]` → Σi = n(n+1)/2 = Θ(n²)
- `[i*=2][j<i]` → geometric 1+2+4+…+n = Θ(n)

### Summations
- 1+2+…+n = n(n+1)/2 = Θ(n²)
- 1+2+4+…+n = 2n−1 = Θ(n) (geometric, last term dominates)
- 1²+2²+…+n² = Θ(n³)

### Recurrence patterns
- `T(n) = 2T(n/2) + n` → Θ(n log n) [mergesort]
- `T(n) = 2T(n/2) + 1` → Θ(n)
- `T(n) = T(n/2) + 1` → Θ(log n) [binary search]
- `T(n) = T(n−1) + n` → Θ(n²) [bubble sort]

### Data structure runtimes (CRITICAL)

| Structure | contains | insert | remove | notes |
|---|---|---|---|---|
| Sorted array | Θ(log n) | Θ(n) | Θ(n) | binary search |
| Unsorted array | Θ(n) | Θ(1)* | Θ(n) | *amortized |
| Sorted linked list | Θ(n) | Θ(n) | Θ(n) | |
| BST (balanced) | Θ(log n) | Θ(log n) | Θ(log n) | best case |
| BST (worst) | Θ(n) | Θ(n) | Θ(n) | spindly |
| 2-3-4 / B-Tree | Θ(log n) | Θ(log n) | Θ(log n) | always |
| LLRB | Θ(log n) | Θ(log n) | Θ(log n) | always |
| Hash table (avg) | Θ(1) | Θ(1)* | Θ(1) | *amortized |
| Hash table (worst) | Θ(n) | Θ(n) | Θ(n) | all collide |
| Min-heap | peek Θ(1) | Θ(log n) | removeMin Θ(log n) | heapify Θ(n) |

### Disjoint sets runtimes

| Impl | connect | isConnected |
|---|---|---|
| Quick Find | Θ(n) | Θ(1) |
| Quick Union | Θ(n) worst | Θ(n) worst |
| Weighted QU | Θ(log n) | Θ(log n) |
| WQU + Path Comp | ~Θ(1) amort | ~Θ(1) amort |

### Graph algorithm runtimes (adj list)

| Algorithm | Runtime |
|---|---|
| DFS / BFS | Θ(V + E) |
| Dijkstra (binary heap) | Θ((V+E) log V) = Θ(E log V) |
| Prim's (binary heap) | Θ(E log V) |
| Kruskal's | Θ(E log V) (sort dominates) |
| Topological sort (DFS) | Θ(V + E) |

---

## SHEET 1 — Side B: Disjoint Sets + BST/B-Tree

### Disjoint Sets (WQU + Path Compression)
- `parent[]` array with n entries always. `parent[i] = i` means i is a root.
- Root stores size as negative number (e.g., -3 means root of 3-node tree).
- **connect(a, b)**: rA = find(a), rB = find(b). Attach smaller under larger. On ties, first arg's root under second's.
- **find(x)**: walk up to root. Path compression: all visited nodes point directly to root after find.
- **RULE:** modify parent at the ROOT, never at the input node directly.

### BST
- Property: left < node < right for every node.
- Insert: walk down like search, attach as leaf where you fall off.
- Delete (3 cases):
  1. 0 children: just remove.
  2. 1 child: promote the child.
  3. 2 children (Hibbard): replace with in-order successor (smallest in right subtree) or predecessor, then delete the successor from the right subtree.
- Runtime: Θ(h). Best Θ(log n), worst Θ(n).
- Traversals: in-order gives sorted. Pre = node,L,R. In = L,node,R. Post = L,R,node.

### 2-3-4 Tree (B-Tree, L=3)
- Nodes hold 1, 2, or 3 keys (2/3/4 children). 4 keys = overfull.
- All leaves at same depth ALWAYS. Height Θ(log n) guaranteed.
- **Insert**: walk down, insert at leaf. If overfull, split reactively.
- **Split** (CS61B convention): for `[a,b,c,d]`, promote **left-middle** (`b`) to parent. Left = `[a]`, Right = `[c, d]`.
- Chain reaction: parent may also become overfull → split again upward.
- Tree grows in height ONLY when root splits.
- Runtime: all ops Θ(log n).

---

## SHEET 2 — Side A: LLRB + Heaps + Hashing

### Rotations
- **rotateLeft(G)**: let x = G.right. Make G the new left child of x.
- **rotateRight(G)**: let x = G.left. Make G the new right child of x.
- Preserves BST property. Undefined if required child is null.

### LLRB (2-3 tree in disguise — NOT 2-3-4)
**Rules:**
1. Valid BST (in-order sorted).
2. Red links lean LEFT only.
3. No node has 2 red children.
4. Perfect black balance: all root→null paths have same # of black links.

**2-3 → LLRB conversion:**
- 2-node → single BST node (black links).
- 3-node `[a,b]` → parent `b`, red-left child `a`.

**LLRB → 2-3:** merge every red-linked pair into a 3-node.

**Height:** at most 2× the 2-3 tree height. All ops Θ(log n).

### Heap (binary min-heap)
- Complete binary tree stored in array. Root at index 1. Child of i: 2i, 2i+1. Parent of i: i/2.
- **Insert:** add at end, bubble up (swap with parent while smaller).
- **removeMin:** save root, move last element to root, bubble down (swap with **smaller** child while bigger).
- **heapify** from unsorted array: call bubbleDown on nodes n/2 down to 1. Total Θ(n).
- peek: Θ(1). insert/removeMin: Θ(log n).
- Heap ≠ BST. No sibling ordering. Parent-child only.

### Hashing (Hashing I — lightly tested)
- `bucket index = Math.floorMod(key.hashCode(), M)` (handles negative hash codes).
- **Separate chaining:** each bucket is a linked list. Walk it using `.equals()` to find keys.
- **Load factor** = N/M (items / buckets).
- **Resize** when LF > threshold: double M, rehash every key (bucket indices change!).
- **hashCode/equals contract:** `a.equals(b)` ⇒ `a.hashCode() == b.hashCode()`. Reverse NOT required.
- Runtime: Θ(1) avg, Θ(n) worst (all collide).
- Worst case = bad hash or adversarial input.

---

## SHEET 2 — Side B: Graphs + Shortest Paths + MSTs

### Graph basics
- V = vertices, E = edges. Undirected/directed. Weighted/unweighted.
- Tree: connected acyclic undirected, V−1 edges.
- DAG: directed acyclic graph. Admits topological sort.
- Adjacency **list**: Θ(V+E) space, iterate neighbors Θ(deg).
- Adjacency **matrix**: Θ(V²) space, check edge Θ(1).

### DFS (depth-first, recursive, stack)
```
dfs(v):
  mark v
  for each neighbor u:
    if not marked: dfs(u)
```
- Preorder: list v when first visited.
- Postorder: list v when dfs(v) finishes.
- Reverse postorder: reverse of postorder → **topological sort**.
- Runtime: Θ(V+E).

### BFS (breadth-first, iterative, FIFO queue)
```
queue.enqueue(start); mark start
while queue not empty:
  v = queue.dequeue()
  for each neighbor u:
    if not marked: mark u; queue.enqueue(u)
```
- Mark on ENQUEUE, not on dequeue.
- Gives **shortest path (fewest edges)** in unweighted graphs.
- Runtime: Θ(V+E).

### Dijkstra's (shortest path, non-negative weights)
```
dist[source] = 0; others = ∞
PQ contains all vertices keyed by dist
while PQ not empty:
  u = removeMin(PQ)
  for each edge (u,v) with weight w:
    if dist[u] + w < dist[v]:
      dist[v] = dist[u] + w
      edgeTo[v] = u
```
- **BREAKS on negative edges.**
- Once removed from PQ, distance is FINAL.
- Runtime: Θ(E log V).
- Reconstruct path: walk edgeTo from dest to source, reverse.

### Topological sort (DAGs only)
- Run DFS from every unvisited vertex.
- Compute postorder.
- **Reverse postorder = topological order.**
- Runtime: Θ(V+E).
- Cyclic graph → no valid order.

### Prim's MST
- Start from any vertex, mark as in-tree.
- Repeatedly add cheapest edge connecting in-tree to out-of-tree vertex.
- Uses PQ keyed by **edge weight**.
- Runtime: Θ(E log V).

### Kruskal's MST
- Sort edges by weight.
- For each edge in order: if endpoints in different DSU sets, add edge and union.
- Skip edges whose endpoints are already connected (would form cycle).
- Uses **disjoint sets**.
- Runtime: Θ(E log V) (sort dominates).

### MST facts
- Requires connected, undirected, weighted graph.
- MST has V−1 edges.
- Cut property: min edge across any cut is in some MST.
- **MST ≠ SPT** (shortest-path tree). MST minimizes TOTAL weight; SPT minimizes each vertex's distance from source.
- Ties in edge weights → MST not unique.
