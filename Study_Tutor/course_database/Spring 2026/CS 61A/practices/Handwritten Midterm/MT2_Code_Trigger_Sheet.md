# CS 61A — Midterm 2 Code Trigger Sheet
> What code should immediately come to mind when you see this topic.
> Names, attributes, and patterns taken directly from your 61A materials.

---

## 1. LINKED LIST (`class Link`)

### Exact class definition (from your Study Guide p.2)
```python
class Link:
    empty = ()                          # sentinel — NOT None, NOT [], NOT 0

    def __init__(self, first, rest=empty):
        self.first = first
        self.rest = rest                # rest is ALWAYS a Link or Link.empty
```

### Attributes / names to know
| Name | What it is |
|------|-----------|
| `lnk.first` | the value at this node |
| `lnk.rest`  | the next Link object (or `Link.empty`) |
| `Link.empty` | the sentinel — a tuple `()` |

### Base case check
```python
if lnk is Link.empty:   # ← ALWAYS use `is`, NOT == None, NOT not lnk
```

### Core templates

**Traverse (recursive read)**
```python
def process(lnk):
    if lnk is Link.empty:
        return <base>
    return <f(lnk.first)> <op> process(lnk.rest)
```

**Filter (exclude elements) — FA25 MT2 Q4 pattern**
```python
def exclude_link(s, x):
    if s is Link.empty:
        return Link.empty
    elif s.first == x:
        return exclude_link(s.rest, x)   # skip this node
    else:
        return Link(s.first, exclude_link(s.rest, x))
```

**Build (prepend — iterative)**
```python
result = Link.empty
for x in lst:
    result = Link(x, result)    # builds in REVERSE order
```

**Mutate in place**
```python
lnk.first = new_val
lnk.rest = Link(new_val, lnk.rest)   # insert after current
lnk.rest = lnk.rest.rest             # delete next node
```

### Common confusions
- `lnk.rest` is a **Link object**, not a value. Don't do arithmetic on it.
- `Link(1)` → rest defaults to `Link.empty`. Not an error.
- `if lnk:` is truthy even for single-element lists. Always check `lnk is Link.empty`.
- The input should not be modified → build a **new** Link chain, don't reassign `.first`/`.rest` of the input.

---

## 2. TREES

### Two flavors — know both

#### Flavor A: List ADT (functional interface)
```python
tree(label, branches=[])   # constructor
label(t)                   # t[0]
branches(t)                # t[1:]  — returns a LIST of trees
is_leaf(t)                 # not branches(t)
```

#### Flavor B: Class interface (from your Study Guide p.2)
```python
class Tree:
    def __init__(self, label, branches=[]):
        self.label = label
        for branch in branches:
            assert isinstance(branch, Tree)
        self.branches = list(branches)   # always converted to list

    def is_leaf(self):
        return not self.branches
```

### Attributes / names to know
| Flavor | Root value | Children | Leaf check |
|--------|-----------|---------|-----------|
| ADT    | `label(t)` | `branches(t)` | `is_leaf(t)` |
| Class  | `t.label`  | `t.branches`  | `t.is_leaf()` |

### Base case
```python
if t.is_leaf():    # class
if is_leaf(t):     # ADT
```

### Core templates

**Traverse / aggregate — FA24 MT2 Q1 pattern (`run`, `climb`)**
```python
def process(t):
    if t.is_leaf():
        return t.label                     # base: return label
    return <combine>([process(b) for b in t.branches])
    # combine options: max(...), sum(..., []), any(...), all(...)

# max over branches with key:
return max(map(process, t.branches))        # returns value
return max(t.branches, key=f)              # returns branch object
```

**Collect leaves (list ADT)**
```python
def leaves(t):
    if is_leaf(t):
        return [label(t)]
    else:
        return sum([leaves(b) for b in branches(t)], [])
        #           ↑ list comprehension           ↑ start=[] required!
```

**Recursive tree construction**
```python
def fib_tree(n):
    if n == 0 or n == 1:
        return Tree(n)
    left, right = fib_tree(n-2), fib_tree(n-1)
    return Tree(left.label + right.label, [left, right])
```

**Tree inclusion / matching — FA25 MT2 Q3 pattern**
```python
# Walk branches of both trees in parallel with indices:
p, w = 0, 0
while p < len(part.branches) and w < len(whole.branches):
    if includes(part.branches[p], whole.branches[w]):
        p += 1
    w += 1
return p == len(part.branches)
```

**Recursive search over tree with OOP — FA24 MT2 Q3 (Store.copies)**
```python
def copies(self, s):
    return sum([1 for p in self.inventory if p == s]) + \
           sum([b.copies(s) for b in self.branches])
```

### Common confusions
- `branches(t)` / `t.branches` is a **list** of Tree objects. Always iterate it.
- `sum([leaves(b) for b in branches(t)], [])` — the `[]` start is **required** to concatenate lists (not numbers).
- Don't confuse `t.label` (class) with `label(t)` (ADT). Know which interface the problem gives you.
- `t.is_leaf()` with `()` — it's a method call. `t.is_leaf` alone is a function object (truthy!).

---

## 3. RECURSION

### Anatomy (from your Study Guide)
```python
def f(n):
    if <base case>:          # smallest input with known answer
        return <value>
    # recursive case — trust the recursion
    return <combine> f(<smaller n>)
```

### Common base cases
```python
if n == 0: return 0          # digits/counts
if n < 10: return n          # sum_digits pattern
if s is Link.empty: return   # linked list
if t.is_leaf(): return       # tree
if not lst: return []        # list recursion
```

### count_partitions template (from your Study Guide p.2)
```python
def count_partitions(n, m):
    if n == 0: return 1           # success: exactly filled
    if n < 0 or m == 0: return 0  # failure: overshot or no parts left
    return count_partitions(n-m, m) + count_partitions(n, m-1)
    #      ↑ use m                   ↑ don't use m
```

### Two-choice tree recursion template — FA25 MT2 Q6 (count_pizzas / pizzas)
```python
# Whenever: "count ways to arrange/choose from options"
# Pattern: recurse on subproblem, combine choices
def f(n, first, previous):
    if n == 0:                           # base: no slices left
        if first == previous or ...:     # end condition check
            return 1
        return 0
    allowed_next = list(slice_types)     # copy to mutate safely
    if previous == 'P': allowed_next.remove('M')
    return sum([f(n-1, first, x) for x in allowed_next])
```

### Nested helper function pattern — FA24 MT2 Q4 (semiperfect)
```python
def semiperfect(n):
    def f(s, d):                  # s = remaining sum, d = current divisor
        if s == 0: return True    # exactly hit target
        if d >= n: return False   # ran out of divisors
        if n % d == 0 and f(s - d, d + 1):   # use divisor d
            return True
        return f(s, d + 1)       # skip divisor d
    return f(n, 1)
```

### sum_digits pattern (digit manipulation)
```python
def sum_digits(n):
    if n < 10: return n
    all_but_last, last = n // 10, n % 10
    return sum_digits(all_but_last) + last
```

### Common confusions
- Always `return` the recursive call: `return f(n-1)` not `f(n-1)`.
- Off-by-one: double-check base cases at `n == 0` vs `n == 1`.
- Two-choice problems need **two** recursive calls, not one.
- `n % d == 0` checks divisibility; `n // d` gives quotient; `n % d` gives remainder.

---

## 4. GENERATORS / ITERATORS

### Key vocabulary
| Term | What it is |
|------|-----------|
| `iter(x)` | returns an iterator over x |
| `next(it)` | returns next element; raises `StopIteration` when exhausted |
| generator function | any function with `yield` |
| generator object | returned by *calling* a generator function (body not run yet) |
| `yield from x` | yields each element of iterable x one by one |

### Generator skeleton
```python
def gen(x):
    yield x          # pauses here, returns x
    yield -x         # resumes, returns -x
    # function ends → StopIteration raised automatically

t = gen(3)
next(t)   # → 3
next(t)   # → -3
next(t)   # → StopIteration
```

### yield from
```python
def a_then_b(a, b):
    yield from a     # equivalent to: for x in a: yield x
    yield from b
list(a_then_b([1,2],[3,4]))  # [1, 2, 3, 4]
```

### Generator with recursion — FA24 MT2 Q4b (subsums)
```python
def subsums(s, n):
    if s:
        if n == s[0]:             # base: found a sublist summing to n
            yield [n]
        for t in subsums(s[1:], n - s[0]):   # include s[0]
            yield [s[0]] + t
        yield from subsums(s[1:], n)          # exclude s[0]
```

### Generator with conditional yields — FA25 MT2 Q1 (weird)
```python
def weird(s):
    if s:                          # nothing yielded if s is empty
        if len(s) > 1:
            yield s[1]             # yield second element first
        for x in weird(s[1:]):    # recurse and yield each
            yield x
        yield s[0]                 # yield first element last
```

### Iterator protocol in practice
```python
t = iter([3, 4, 5])
next(t)   # 3
next(t)   # 4
# t is stateful — can't reset without iter() again

# map/filter/zip return ITERATORS (lazy), not lists:
list(map(f, [1,2,3]))        # force evaluation
list(filter(f, [1,2,3]))

# dict iteration:
k = iter(d)         # yields keys
v = iter(d.values())  # yields values
```

### Common confusions
- Calling `gen(3)` does **not** run the body. It returns a generator object.
- `yield` inside a `for` loop: each iteration of the loop can yield.
- `yield from` vs `return`: `return` in a generator raises `StopIteration` immediately; don't confuse with `yield from`.
- Exhausted iterator raises `StopIteration`, doesn't return `None`.
- `map()`, `filter()`, `zip()`, `reversed()` are all **lazy iterators**.

---

## 5. OOP / INHERITANCE

### Class definition skeleton (from your Study Guide p.2)
```python
class MyClass:
    class_attr = 0                   # shared by ALL instances

    def __init__(self, x):
        self.x = x                   # instance attribute (per-object)

    def method(self):                # self = the calling instance
        return self.x
```

### Attribute lookup order (memorize this)
```
obj.attr  →  1. instance attributes of obj
             2. class attributes of type(obj)
             3. base class attributes (up the chain)
```

### Inheritance — two ways to call parent method
```python
class Sub(Base):
    def method(self, amount):
        return super().method(amount)          # preferred
        # OR:
        return Base.method(self, amount)       # explicit, pass self manually
```

### FA25 MT2 Q5 (Parlor / MegaParlor) — key patterns
```python
class Parlor:
    def __init__(self, name, price, pizzas, alt):
        self.name, self.price, self.pizzas, self.alt = name, price, pizzas, alt
        self.profit = 0

    def cook(self, q):
        overload = max(0, q - self.pizzas)   # amount to send to alt
        self.pizzas -= (q - overload)        # cook only what we can
        return overload

    def order(self, quantity, source=None):
        if isinstance(source, Parlor):       # isinstance check — FA25 MT2 pattern
            print(source.name, 'forwarded an order of', quantity, 'to', self.name)
        self.profit += self.price * quantity
        rest = self.cook(quantity)           # call own cook
        if rest:
            self.profit -= self.alt.price * rest
            self.alt.order(rest, self)       # delegate to alt, pass self as source

class MegaParlor(Parlor):
    def __init__(self, price):
        self.name, self.price, self.profit = "MEGA", price, 0

    def cook(self, q):
        return 0                             # can always handle everything
```

### FA24 MT2 Q3 (Store / add_to) — returning a lambda that mutates
```python
def add_to(self, k):
    return lambda s: self.branches[k].inventory.append(s)
    # returns a FUNCTION that, when called, mutates branch inventory
```

### class vs instance attribute mutation
```python
# Class-level change → affects ALL instances (unless shadowed)
Account.interest = 0.04      # all accounts now see 0.04

# Instance-level assignment → shadows class attr for that instance only
jim.interest = 0.08          # jim.interest = 0.08; tom.interest still 0.04

# After Account.interest = 0.05:
# tom.interest → 0.05 (no instance attr, reads class)
# jim.interest → 0.08 (instance attr shadows class)
```

### Function vs method
```python
type(Account.deposit)   # <class 'function'>
type(a.deposit)         # <class 'method'>
Account.deposit(a, 5)   # == a.deposit(5) — must pass self explicitly
```

### isinstance vs type
```python
isinstance(x, Tree)     # True if x is a Tree or any subclass — USE THIS
type(x) == Tree         # True only if exactly Tree, not subclasses
```

### Common confusions
- `__init__` not `__initialize__` or `__new__`.
- `self.branches = list(branches)` in Tree `__init__` converts to list; don't rely on the default `[]` being mutable.
- `super().method(amount)` — no `self` argument; `Base.method(self, amount)` — must pass `self`.
- Printing an f-string: `f'{self.name} now has ${self.profit} profit'` — know this pattern from FA25 MT2.

---

## 6. HIGHER-ORDER FUNCTIONS / CLOSURES

### HOF skeleton
```python
# Takes a function as argument:
def apply(f, x):
    return f(x)          # call it like any function

# Returns a function:
def make_adder(n):
    def adder(k):
        return k + n     # n captured from enclosing frame
    return adder         # NO () — return the function object

add_three = make_adder(3)
add_three(4)             # → 7
```

### Lambda — one-liner function
```python
square = lambda x: x * x
# NO return keyword
# NO multi-line
# Has NO intrinsic name (unlike def)

# Lambda capturing enclosing variable:
def add_to(self, k):
    return lambda s: self.branches[k].inventory.append(s)
    # s is the parameter; self and k are captured from enclosing frame
```

### Closure — what gets captured
```python
def f(x):
    def g(y):
        return x + y     # x is from f's frame, captured at g's definition
    return g
h = f(10)
h(5)    # → 15  (x=10 is still alive in h's closure)
```

### Environment diagram rule for HOFs
```
When a function is DEFINED:
  → creates func <name>(<params>) [parent=<current frame>]
  → binds name in current frame

When a function is CALLED:
  → creates new frame titled <name>
  → parent = THE FUNCTION'S PARENT (not the calling frame!)
  → binds params to args
  → executes body in this new environment
```

### FA25 MT2 Q2 (peel/wrap) — environment diagram with lambdas
```python
def wrap(s):
    return [s[0], s]             # returns a list containing two items

def peel(f, s):
    f(f(s)).append(2)            # f is called TWICE before append
    t = s[1]                     # s[1] is the nested list
    t[0] = 3                     # mutates t (which is s[1])
    t = [4]                      # REBINDS t locally — does NOT affect s
    return s                     # s still has original structure (with mutation at s[1][0])
```

### Common confusions
- `return adder` not `return adder()` — returning a function, not calling it.
- `lambda x: return x` → **SyntaxError**. Lambda body is an expression only.
- When `t = [4]` inside a function, it rebinds the local name `t` — it does NOT change what `s[1]` points to.
- `make_adder(3)(4)`: evaluate left-to-right. `make_adder(3)` → function. Then call that with `4`.

---

## 7. LIST MUTATION / SEQUENCES

### Mutation methods — all modify IN PLACE, most return `None`
```python
lst.append(x)         # add one element to end — returns None
lst.extend([x, y])    # add multiple elements — returns None
lst.pop()             # remove & return last element — returns the element
lst.remove(x)         # remove first occurrence — returns None
lst.insert(i, x)      # insert at index i — returns None
lst[i] = x            # element assignment — mutation
lst[a:b] = [x, y]     # slice assignment — mutation (can change length!)
lst.sort()            # in-place sort — returns None
```

### Non-mutating operations — return NEW objects
```python
lst[a:b]              # slicing — new list
list(a)               # copy
a[:]                  # copy
sorted(lst)           # new sorted list
lst + [x]             # concatenation — new list
```

### Identity vs Equality
```python
a = [10]; b = [10]
a == b    # True  (same contents)
a is b    # False (different objects)

b = a                 # b and a point to SAME object
b.append(20)          # mutates a too!
a                     # [10, 20]

b = a[:]              # b is a COPY — independent
b.append(20)          # does NOT affect a
```

### FA24 MT2 Q2 (slice_up) — mutation trap
```python
def slice_up(s):
    copy = s             # DANGER: copy IS s (same reference!)
    t = [copy]           # t is a list containing one element: the same list s
    while len(s) > 1:
        t.append(s[:len(s)-1])   # appends a SLICE (new list) each time
        s.pop()                  # mutates s in place
        s[0] = len(s)           # mutates s[0]
    return t
# After: t = [3, 4, 5] would be [<mutated s>, [3, 4], [3]]
```

### Dictionary quick reference
```python
d[key]              # KeyError if missing
d.get(key, default) # safe access — returns default if missing
d.get(key)          # returns None if missing
key in d            # membership — checks KEYS only
d.keys()            # view of keys
d.values()          # view of values
{k: v for k in d}   # dict comprehension

# FA25 MT2 Q6a (symmetrical):
# d.get(d[k]) == k  ← checks if reverse mapping exists
```

### List comprehension
```python
[expr for name in iterable if condition]
#      ↑ iterates    ↑ filter (optional)
# Creates its own scope — name doesn't leak out
# if goes AFTER for, not before
```

### sum() with list start — critical for trees
```python
sum([[1,2],[3,4]], [])   # → [1, 2, 3, 4]   (flattens one level)
sum([1, 2], 3)           # → 6              (starts from 3)
sum([])                  # → 0
```

### Common confusions
- `lst.append(x)` returns `None` — never use as expression.
- `b = a` → same object. `b = a[:]` or `b = list(a)` → copy.
- `lst.sort()` returns `None`; `sorted(lst)` returns new list.
- Slice assignment `lst[0:2] = ['x']` can shrink the list.

---

## 8. ENVIRONMENT MODEL (Key Rules Only)

### The 5 rules you must know cold

**Rule 1 — def creates a function object:**
```
def f(x):  →  creates  func f(x) [parent=<current frame>]
               binds name f in the CURRENT frame
```

**Rule 2 — call creates a new frame:**
```
f(arg)  →  new frame titled "f"
           parent = THE FUNCTION'S PARENT FRAME (not the caller!)
           bind formal params to args
           execute body in this new environment
```

**Rule 3 — name lookup:**
```
Look up a name:  current frame → parent → parent's parent → ... → Global
Return the FIRST binding found.
```

**Rule 4 — lambda has a parent too:**
```
lambda x: x + n    # parent = frame where this lambda was written
                   # n is looked up in that parent frame
```

**Rule 5 — assignment vs mutation:**
```
x = [4]         # rebinds the name x in the current frame — does NOT affect other refs
x[0] = 4        # mutates the object x points to — DOES affect all refs to same object
```

### Frame parent — the most common exam trap
```
# The parent of a frame is the parent of the FUNCTION CALLED, not the caller.

def make_adder(n):          # parent=Global
    def adder(k):           # parent=f1 (make_adder's frame)
        return k + n
    return adder

add3 = make_adder(3)        # f1: make_adder [parent=Global], n=3
add3(4)                     # f2: adder [parent=f1], k=4
                            # looks up n → not in f2, found in f1: n=3
```

### Return value rule
```
Return value is NOT a binding in any frame.
It's just a value passed back to the calling expression.
```

### Don't mix up
| Thing | What it is |
|-------|-----------|
| `def f(x):` in a frame | creates function, binds `f` in THAT frame |
| calling `f(3)` | creates a NEW frame with parent = `f`'s parent |
| `x = 5` in a frame | binds `x` in THAT frame, nowhere else |
| `x[0] = 5` | mutates the object — visible everywhere that references it |

---

## ★ MINIMUM MUST-REMEMBER SYNTAX — 1-PAGE QUICK REF

### Link class
```python
Link.empty            # sentinel (NOT None)
lnk is Link.empty     # base case check
lnk.first / lnk.rest  # attributes
Link(val, rest)        # constructor; rest=Link.empty by default
```

### Tree (class)
```python
t.label               # root value
t.branches            # list of Tree objects
t.is_leaf()           # True if no branches
isinstance(x, Tree)   # use this, not type(x) == Tree
Tree(label, [b1, b2]) # constructor
```

### Tree (ADT)
```python
tree(label, branches=[])
label(t)              # t[0]
branches(t)           # t[1:]
is_leaf(t)            # not branches(t)
sum([leaves(b) for b in branches(t)], [])   # flatten with [] start
```

### Generators
```python
yield x               # pauses, emits x
yield from iterable   # emits each element of iterable
next(gen_obj)         # advances; raises StopIteration when done
t = gen_func(args)    # body NOT run yet — returns generator object
```

### OOP
```python
self.attr             # instance attribute
ClassName.attr        # class attribute
super().method(args)  # call parent method (preferred)
Base.method(self, args)  # explicit parent call
isinstance(x, Class)  # True for instances of Class or subclasses
type(a.method)        # <class 'method'>
type(A.method)        # <class 'function'>
```

### List mutation (all return None except pop)
```python
lst.append(x)         # returns None
lst.extend([...])     # returns None
lst.pop()             # returns removed element
lst.remove(x)         # returns None
lst.insert(i, x)      # returns None
lst[i] = x            # in-place
lst.sort()            # in-place, returns None
sorted(lst)           # returns NEW list
lst[:]  or  list(lst) # shallow copy
```

### Identity vs equality
```python
a is b     # same object in memory
a == b     # same contents
b = a      # SAME object (mutation to b affects a)
b = a[:]   # COPY (mutation to b does NOT affect a)
```

### Recursion base cases
```python
if lnk is Link.empty: ...     # linked list empty
if t.is_leaf(): ...            # tree leaf
if n == 0: return 1            # count_partitions success
if n < 0 or m == 0: return 0  # count_partitions failure
if n < 10: return n            # digit recursion
```

### Environment diagram frame parent rule
```
New frame's parent = the FUNCTION'S parent (where it was defined)
                     NOT the frame that called it
```

### Boolean / falsy values
```python
# Falsy: 0, False, None, '', [], {}, (), Link.empty (it's ())
# Truthy: everything else including [0], lambda x: 0, non-empty containers
# and/or return one of the OPERANDS, not True/False
# not always returns True or False
```

### dict
```python
d.get(key, default)   # safe — no KeyError
key in d              # checks keys only
d[key] = val          # add/update
{k: v for k in d}     # dict comprehension
```
