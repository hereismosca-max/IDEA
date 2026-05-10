# Development Log

## 2026-05-10 - Phase 1: Course Selection Skeleton

### Files Created or Modified
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tsconfig.json`
- `next-env.d.ts`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `eslint.config.mjs`
- `.gitignore`
- `app/layout.tsx`
- `app/globals.css`
- `app/page.tsx`
- `app/not-found.tsx`
- `app/api/courses/route.ts`
- `app/api/llm/health/route.ts`
- `app/api/problem-generator/profile/route.ts`
- `app/api/problem-generator/generate/route.ts`
- `app/api/problem-generator/feedback/route.ts`
- `app/api/problem-set/problem/route.ts`
- `app/api/practice/attempts/route.ts`
- `app/practice/page.tsx`
- `app/problem-set/page.tsx`
- `app/weakness/page.tsx`
- `components/BackButton.tsx`
- `components/HomeClient.tsx`
- `components/CourseSelector.tsx`
- `components/ActionPanel.tsx`
- `components/PracticeWorkspace.tsx`
- `lib/courses.ts`
- `lib/coursePaths.ts`
- `lib/llm.ts`
- `lib/materialScanner.ts`
- `lib/answerGrader.ts`
- `lib/problemGuide.ts`
- `lib/problemGenerator.ts`
- `lib/practiceStorage.ts`
- `lib/weaknessAnalyzer.ts`
- `lib/types.ts`
- `.env.example`
- `proj_spec/dev_log.md`
- `proj_spec/proj_architecture.md`
- `proj_spec/codebase_guide.md`
- `proj_spec/todo.md`

### Summary
Built a minimal Next.js App Router application with TypeScript and Tailwind CSS. The home page starts with a single `Choose Course` button. Clicking it calls `/api/courses`, which reads course folders inside `course_database/` and returns them as selectable course names.

Course detection now follows the semester-first layout. Clicking `Choose Course` shows semester folders such as `Fall 2026`, `Spring 2026`, and `Summer 2026`. Selecting a semester then shows course folders under that semester, such as `CS 61B` and `ECON 131`. Empty semester folders show `No courses recorded.`

After a course is selected, the app displays the selected course and three actions: `Do Practice`, `Problem Set`, and `View Weakness`. `Do Practice` opens a practice workspace with a `Problem` section and answer inputs.

The selected course action panel now also includes `Problem Set`. This page lists previously generated problems for the selected course, including untouched generated problems and problems with one or more attempts. Selecting a problem reopens it in the practice workspace.

Added the first LLM API connection layer for OpenAI and Claude. The app now has a server-side `/api/llm/health` route for testing provider connectivity with local environment variables.

Added the problem generator foundation. Each Spring 2026 course now has a course-specific `problem_generation_guide.md`. These guides are created from high-priority `supplement/` files plus selected course materials, and are intended to stabilize future problem generation. The app also has `/api/problem-generator/generate`, which reads a course guide, asks Claude for one structured practice problem, and saves the generated JSON under `generated_problems/`.

Practice UI now supports multi-part generated problems by rendering separate answer boxes. Generated problems can also signal `needsDrawing`, which displays a coordinate-grid diagram canvas above the written answer boxes for graph/curve/line/sketch questions. A disabled file-upload control is present as a placeholder for later PDF/image answer checking.

Older generated problems that do not include explicit `answerParts` are now handled by detecting common part labels in the problem text, such as `(a)`, `(b)`, `Part a`, or numbered subquestions, so reopened problem-set items can still show separated answer boxes.

Added local practice persistence and OpenAI grading. Clicking `Submit Answer` sends the generated problem, expected answer, rubric, typed answers, and optional canvas image to the Answer Grader Agent. The resulting percentage score, brief feedback, strengths, improvements, weakness signals, and example solution are saved with the answer record under the selected course in `answer_records/`. Blank submissions are treated as the student not knowing the question and should be graded near zero with first-step learning feedback.

Reopened problems show previous attempts below the problem text as collapsible bars. Each attempt panel shows the submitted answers and grader feedback, so past work can be reviewed before submitting another attempt.

Added the first local weakness analysis page. `View Weakness` now reads graded records from `answer_records/`, summarizes average score, weakest topics, weakest problem types, repeated grader weakness signals, recent attempts, and recommended next steps. If no graded attempts exist yet, it shows a clear empty state.

Course navigation now keeps the selected semester/course in the home URL. The selected-course action panel has its own `Back` button that returns to the course selector. Practice, problem set, and weakness pages now return to the selected-course action panel, while reopened problem-set items return to the problem set.

Added problem quality feedback. Each generated problem can be marked `Good` or `Bad`. Good problems are archived under `problem_archive/good/`. Bad problems open a short reason form for type/content/other feedback and are archived under `problem_archive/bad/`. Future generation prompts read recent archived good/bad examples for the same course so the generator has course-local style references and avoid-pattern references.

Verification completed with `npm run lint`, `npm run build`, API checks, and browser testing against `http://localhost:3000`.

### Known Limitations
- Practice mode now requests a generated problem from Claude when opened.
- Answer submission, grading, and local weakness summaries are connected, but tutor follow-up is not connected yet.
- Canvas drawings are included in grading when submitted, but uploaded files are not yet accepted or graded.
- LLM calls require local `.env.local` keys, internet access, and explicit care because course-derived content is sent to the provider.
- No authentication or external database is included.
- Weakness analysis is currently deterministic and local; it does not call an LLM yet.
- `npm audit --omit=dev` reports two moderate advisories through Next.js/PostCSS; npm currently suggests a breaking downgrade path, so no automated audit fix was applied in Phase 1.
