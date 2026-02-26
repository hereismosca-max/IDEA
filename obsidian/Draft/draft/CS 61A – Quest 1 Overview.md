Salutations everyone,

I hope you have enjoyed 61A so far. With the Quest coming up, I wanted to give everyone some tips on how to approach it and study for it.

How to Study
============

Start today. It is far better to practice a little over many days than to cram the few days before the exam. Additionally, starting early will allow you to understand what you need more practice on and allow you the time to deep dive into those topics.

I highly recommend practicing over rewatching lectures. By this I mean it is far more useful to look through past midterm 1 exams, re-do homework/lab/discussion questions, and play around with the interactive terminal than review lecture slides or re-watch videos. This class is about application more than memorization.

Here are some recommended past exams to go through:

Fall 2025 (very highly recommended), Spring 2025 (very highly recommend), Fall 2024 (very highly recommend), Spring 2024 (very highly recommend), Fall 2023 (very highly recommend), Spring 2023 (highly recommend), Fall 2022 (highly recommend).

I would recommend against doing exams from pre-COVID or COVID since the scope is quite different. Additionally, I must stress that I would also spend some time practicing other course content (re-doing homework/lab/discussion questions, testing things on the interactive terminal, etc.) as the Quest may not be the same format as past midterms.

Once you are ready to see your preparedness for the actual Quest, take the practice Quest!

Overview of What To Study + Approaches to Problems
==================================================

The following is an overview of some types of common problems in 61A as well as tips on content that students mess up on most commonly. The questions you see on your exam will not be limited to what is written below!

Expression Evaluation
---------------------

When we are evaluating an expression, we take the following steps...

1) Evaluate the operator -> This does NOT mean apply the operator. This means check if the operator is a valid function.

2) Evaluate each operand, left to right. -> This includes fully evaluating nested function calls before applying the outer function.

3) Apply the function to the arguments.

Take the following example...

print(print(1), 4)

Expand (0 lines)

print(print(1), 4)

Expand (0 lines)

1) Is `print` a valid function? Yes!

2) Evaluate `print(1)`

Within this, we check if `print` is a valid function again since it is the operator. It is!

Then, we evaluate `1`, which simply evaluates to `1`.

Then we print `1` (output it to the terminal), and then we return the value `None` to the call of `print(1)` since `print` always returns `None`.

3) Evaluate `4`, which simply evaluates to `4`

4) Apply `print` on the evaluated operands. This would essentially be the following...

\>>> print(None, 4) None

Expand (1 line)

\>>> print(None, 4) None

Expand (1 line)

This will print `None 4` (on the same line, with a space in between).

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Assignment Evaluation
---------------------

Two types of assignment: single and multiple.

Single assignment has only one name and one value. Multiple assignment has multiple names and multiple values separated by commas on each side. Multiple assignment is respective, meaning the leftmost name on the left correlates with the leftmost value on the right.

It is important to remember that _all_ values on the right are evaluated before any names are assigned to them.

Take the following example...

\>>> x = 10 \>>> x, b = x // 2, x - 1 \>>> x 5 \>>> b 9

Expand (5 lines)

\>>> x = 10 \>>> x, b = x // 2, x - 1 \>>> x 5 \>>> b 9

Expand (5 lines)

View how we got `9` as the value for `b` above. This is because the first thing evaluated was `x // 2` (but it was not assigned to `x` yet), then `x - 1` was evaluated, then the values `x` and `b` were assigned respectively.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Environment Diagrams
--------------------

When going through environment diagram questions, go through them slowly and calmly. Don't overthink, rather keep asking yourself "what would Python do here"? Additionally, keep in mind the following rules:

*   A new frame is opened when a function is called (including lambda functions)
    
*   The parent frame of a function is where the function was DEFINED. Not where it was called.
    
*   When a lambda function is called, the frame will say λ rather than the name assigned to the lambda
    
*   When looking for a variable/function, we look in the current frame first, then up through the parent frames until we find the variable/function
    
*   The Global frame is the outermost frame. If a function is not defined within another function, then its parent is likely the Global frame.
    

I would recommend going through past exams for practice with this. The more questions you do, the better and more comfortable you will get!

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Ands/Ors
--------

`and` and `or` return the value, not `True` or `False` necessarily (unless the value itself is `True` or `False`).

`and` short-circuits at the first falsy value or it will return the last truthy value if there are no falsy values.

`or` short-circuits at the first truthy value or it will return the last falsy value if there are no truthy values.

Falsy values include the following: `0`, `""`, `''`, `0.0`, `False`. The rest of the values are truthy.

Ex.

\>>> "Hello" and "World" "World" \>>> 0 and "World" 0 \>>> 0 or False False \>>> "" or 6 or 7 6

Expand (7 lines)

\>>> "Hello" and "World" "World" \>>> 0 and "World" 0 \>>> 0 or False False \>>> "" or 6 or 7 6

Expand (7 lines)

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Digit Manipulation
------------------

For these questions, your two most important tools will be `%` and `//`.

\>>> 1234 % 10 4 \>>> 1234 // 10 123

Expand (3 lines)

\>>> 1234 % 10 4 \>>> 1234 // 10 123

Expand (3 lines)

As you can see `% 10` finds the modulo 10 of the value given, which will always be the last digit of the integer. `// 10` will floor divide the value, always giving the integer with the rightmost digit removed.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Final Tips
==========

*   Each time you get a question wrong, write it down and write down _why_ you got it wrong.
    
*   Explain some of your solutions to friends to ensure you fully understand how the problem works
    
*   Go to office hours in the days leading up to the quest to clarify your understanding of anything. You can learn so much just from talking to people!
    
*   Ask questions on Ed. We will get back to you ASAP
    
*   Eat and sleep very well! Your mind stores and processes information as you sleep.
    
*   Try to not get flustered on the exam. If you get stuck, think for ~6 minutes and then move on and come back later. You won't be able to think straight if you let the stress get to you.
    
*   Go into the exam very, very confident. Know that you got this!
    

We all believe in you. We want to see you succeed. We are rooting for you. You deserve to be here just as much as anybody else. I hope you know the moments that feel like the biggest challenge are the times you are growing the most.

The best of luck to all of you.
