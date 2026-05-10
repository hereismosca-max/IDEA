# CS 61A — Exam Reference Sheet
> Pattern signals → Solving template → Common mistakes

---

## MIDTERM 1

---

### 1. Expression Trees & Call Expression Evaluation

**Recognize when:** Asked to evaluate a nested expression like `mul(add(2, mul(4, 6)), add(3, 5))`, or draw an expression tree.

**Template:**
1. Identify the outermost operator
2. Evaluate each operand **left to right**, recursively
3. Apply the operator to the resulting argument values
4. Pure functions: return a value only. Non-pure: side effect (e.g. `print` → returns `None`, displays output)

**Common mistakes:**
- Thinking `print(x)` returns `x` — it returns `None`
- Evaluating operands right-to-left
- Confusing `abs(-2) → 2` (pure) with `print(-2) → None` (non-pure, side effect = displays `-2`)

---

### 2. Environment Diagrams

**Recognize when:** "Draw the environment diagram", "what does this evaluate to", or any question involving nested `def` or function calls.

**Template:**
1. Global frame always exists first
2. `def f(x):` → creates `func f(x) [parent=Global]`, binds name `f` in current frame
3. `f(arg)` → open new frame titled `f`, parent = function's parent, bind formal params to args, execute body
4. A **name** looks up the **earliest frame** in the current environment where it's found (local → parent → ... → global)
5. Return value is **not** a binding — it's just the result passed back

**Template for nested def:**
```
make_adder(3) called:
  → f1: make_adder [parent=Global], n=3
  → def adder(k): creates func adder [parent=f1]
  → returns func adder
add_three(4) called:
  → f2: adder [parent=f1], k=4
  → looks up n → not in f2, found in f1: n=3
  → returns 7
```

**Common mistakes:**
- Setting a frame's parent to the **calling** frame instead of the **function's** parent frame
- Forgetting that `lambda` functions also have a parent (the frame where they were defined)
- Thinking return value creates a binding in the frame — it doesn't
- `def` inside `def`: the inner function's parent is the frame of the outer function **at the time of definition**, not at call time

---

### 3. Higher-Order Functions & Lambda

**Recognize when:** A function takes a function as an argument, or returns a function. `lambda` in the code.

**Template:**
```python
# HOF pattern: function passed as argument
def apply(f, x):
    return f(x)          # f is called like a normal function

# Returning a function
def make_adder(n):
    def adder(k):
        return k + n     # n from enclosing frame
    return adder         # return the function object, no ()

# Lambda: single expression only, no return keyword
square = lambda x: x * x
# Equivalent to:
def square(x): return x * x
# Difference: lambda has NO intrinsic name
```

**Common mistakes:**
- Writing `return adder()` instead of `return adder` — calling it instead of returning it
- Writing `lambda x: return x * x` — `return` is illegal in lambda
- Calling `make_adder(3)(4)` and getting confused — evaluate left to right: `make_adder(3)` → function, then call that with `4`

---

### 4. Boolean Short-Circuit Evaluation

**Recognize when:** `and`, `or`, `not` expressions, or questions about what value is returned (not just True/False).

**Template:**
```
A and B:
  → evaluate A
  → if A is falsy: return A (short-circuit, B never evaluated)
  → else: return B

A or B:
  → evaluate A
  → if A is truthy: return A (short-circuit, B never evaluated)
  → else: return B

not A:
  → if A is falsy: True
  → if A is truthy: False
```

False values: `0`, `False`, `None`, `''`, `[]`, `{}`, `()`
Everything else is truthy (including `lambda x: 0`, non-empty strings, `[0]`).

**Common mistakes:**
- Thinking `and`/`or` always returns `True` or `False` — they return **one of the operands**
- `1 or 1/0` → returns `1`, never raises error (short-circuit)
- `0 and 1/0` → returns `0`, never raises error
- `not` always returns an actual `True` or `False`

---

### 5. Recursion (Basic)

**Recognize when:** Problem can be reduced to a smaller version of itself. "Write a recursive function."

**Template:**
```python
def f(n):
    if <base case>:      # smallest input with known answer
        return <value>
    else:
        return <combine> f(<smaller n>)  # trust the recursion
```

**Common mistakes:**
- Missing or wrong base case (infinite recursion)
- Not returning the recursive call: `f(n-1)` instead of `return f(n-1)`
- Mutating state in a pure recursive function and getting confused
- Off-by-one: `fib(1)` base case matters

---

## MIDTERM 2

---

### 6. Lists: Mutation, Identity vs Equality, Slicing

**Recognize when:** Questions about `is` vs `==`, list operations, or shared references.

**Template:**
```python
# Identity: same object in memory
a is b       # True only if a and b point to exact same list object

# Equality: same contents
a == b       # True if contents match, regardless of identity

# Mutation (modifies IN PLACE, returns None unless noted):
lst.append(x)        # add one element to end
lst.extend([x, y])   # add multiple elements
lst.pop()            # remove & return last element
lst.remove(x)        # remove first occurrence of x
lst.insert(i, x)     # insert at index i
lst[i] = x           # element assignment (mutation)
lst[a:b] = [x]       # slice assignment (mutation)

# Copying (creates new object):
list(a)   or   a[:]
```

**Common mistakes:**
- `b = a` makes `b` point to the **same** list — mutating `b` mutates `a`
- `b = a[:]` is a **copy** — mutating `b` does NOT affect `a`
- `lst.append(x)` returns `None` — don't use as an expression
- `lst.sort()` returns `None`; `sorted(lst)` returns a new list
- Slicing (`lst[1:3]`) creates a **new** list (no mutation)

---

### 7. List & Dictionary Comprehensions

**Recognize when:** Need to build a list/dict from an iterable, possibly with a filter.

**Template:**
```python
# List comprehension
[<expr> for <name> in <iterable> if <condition>]
# Steps: for each element → bind name → if condition true → evaluate expr → add to result

# Dict comprehension
{k: v for <name> in <iterable>}

# Examples
[x*x for x in range(5) if x % 2 == 0]   # [0, 4, 16]
{x: x**2 for x in range(3, 6)}           # {3:9, 4:16, 5:25}
```

**Common mistakes:**
- `if` goes at the **end**, not before `for`
- The comprehension creates its own scope — name binding doesn't leak into enclosing frame
- Nested comprehensions: outer `for` runs first

---

### 8. Iterators & Generators

**Recognize when:** `iter()`, `next()`, `yield`, `yield from`, or lazy evaluation questions.

**Template:**
```python
# Iterator protocol
t = iter([3, 4, 5])
next(t)  # 3
next(t)  # 4  — advances state, can't go back

# Generator function: uses yield instead of return
def gen(x):
    yield x
    yield -x
t = gen(3)
next(t)  # 3
next(t)  # -3

# yield from: delegates to another iterable
def a_then_b(a, b):
    yield from a
    yield from b
list(a_then_b([1,2],[3,4]))  # [1,2,3,4]
```

**Common mistakes:**
- Calling a generator function does **not** execute its body — it returns a generator object
- `next()` on an exhausted iterator raises `StopIteration`, not returns `None`
- Iterators are stateful and one-directional — you can't reset without calling `iter()` again
- `map()`, `filter()`, `zip()` all return iterators (lazy), not lists

---

### 9. Tree Recursion & Orders of Growth

**Recognize when:** Multiple recursive calls per function call (e.g., `f(n-1) + f(n-2)`). Counting problem with two choices.

**Template (count_partitions pattern):**
```python
def count_partitions(n, m):
    if n == 0: return 1          # base: success
    if n < 0 or m == 0: return 0 # base: failure
    return count_partitions(n-m, m) + count_partitions(n, m-1)
    #      ^^^ use m              ^^^ don't use m
```

**Orders of growth quick reference:**
| Growth | Example | What it means |
|--------|---------|---------------|
| Θ(1)   | constant op | n doesn't matter |
| Θ(log n) | `exp_fast` (halving) | doubling n adds 1 step |
| Θ(n)   | linear loop | incrementing n adds 1 step |
| Θ(n²)  | nested loops | incrementing n adds n steps |
| Θ(bⁿ)  | recursive fib | incrementing n multiplies steps by b |

**Common mistakes:**
- Recursive fib is **exponential** Θ(2ⁿ), not linear
- A while loop that halves `n` each iteration is Θ(log n), not Θ(n)
- Space complexity (frames on stack) often differs from time complexity

---

### 10. Trees (List ADT & Class)

**Recognize when:** Hierarchical structure, "write a function on a tree", traversal problems.

**Template (list-based ADT):**
```python
tree(label, branches=[])   # constructor
label(t)                   # root label = t[0]
branches(t)                # list of subtrees = t[1:]
is_leaf(t)                 # not branches(t)

# Traversal template
def process(t):
    if is_leaf(t):
        return <base>
    return <combine>([process(b) for b in branches(t)])
```

**Template (class-based):**
```python
t.label          # root value
t.branches       # list of Tree objects
t.is_leaf()      # not self.branches
isinstance(branch, Tree)  # used in __init__ validation
```

**Common mistakes:**
- `branches(t)` returns a **list** of trees, not a single tree — always iterate over it
- Forgetting the base case when a node is a leaf
- `sum([leaves(b) for b in branches(t)], [])` — the `[]` start value is required to concatenate lists (not sum numbers)
- Class Tree: `self.branches = list(branches)` converts to list; don't mutate the default `[]`

---

### 11. OOP: Classes, Instances & Inheritance

**Recognize when:** `class`, `self`, dot expressions, attribute lookup, subclasses.

**Template (attribute lookup order):**
```
obj.attr  →  1. instance attributes of obj
             2. class attributes of type(obj)
             3. base class attributes (inheritance chain)
```

**Template (class definition):**
```python
class MyClass:
    class_attr = 0           # shared by all instances

    def __init__(self, x):
        self.x = x           # instance attribute

    def method(self):        # self = the instance
        return self.x
```

**Template (inheritance):**
```python
class Sub(Base):
    def method(self):
        return super().method()   # or Base.method(self)
        # super() preferred; both call parent's method
```

**Common mistakes:**
- `Account.interest = 0.04` changes class attr → affects ALL instances **unless** they have their own instance attr
- `jim.interest = 0.08` creates an **instance** attr — now `jim.interest` shadows the class attr
- `type(a.deposit)` → `method`; `type(Account.deposit)` → `function` — different types
- `Account.deposit(a, amount)` == `a.deposit(amount)` — always pass `self` explicitly when using class name
- `__init__` is not called `__initialize__` or `__new__`

---

### 12. Linked Lists (class Link)

**Recognize when:** `Link` class, linked list traversal or construction problems.

**Template:**
```python
# Structure
Link(first, rest)       # rest must be Link or Link.empty
Link.empty = ()         # sentinel, not None

# Traversal
def process(lnk):
    if lnk is Link.empty:
        return <base>
    return <f(lnk.first)> + process(lnk.rest)

# Build (prepend pattern — builds in reverse if iterating forward)
result = Link.empty
for x in lst:
    result = Link(x, result)
```

**Common mistakes:**
- `lnk.rest` is a `Link` object (or `Link.empty`), not a value — don't treat it like a number
- Check `lnk is Link.empty`, not `lnk == None` or `not lnk`
- `Link(1)` → rest defaults to `Link.empty` (not an error)
- Mutating: `lnk.first = x` and `lnk.rest = Link(...)` are both valid (unlike tuples)
