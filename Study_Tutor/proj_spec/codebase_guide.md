# Codebase Guide

## Important Files

- `app/page.tsx`: Home page route that reads optional selected-course URL params.
- `components/HomeClient.tsx`: Client-side home UI and selected-course state.
- `components/CourseSelector.tsx`: Client component that loads and displays course folders.
- `components/ActionPanel.tsx`: Shows the selected course and action links.
- `app/api/courses/route.ts`: API route used by the course selector.
- `app/api/llm/health/route.ts`: API route for testing OpenAI and Claude connections.
- `app/api/problem-generator/profile/route.ts`: Generates or regenerates a course-specific `problem_generation_guide.md`.
- `app/api/problem-generator/generate/route.ts`: Generates one structured practice problem from a course guide.
- `app/api/problem-generator/feedback/route.ts`: Archives good/bad feedback for generated problems.
- `app/api/problem-set/problem/route.ts`: Loads one saved generated problem with its matching attempts.
- `app/api/practice/attempts/route.ts`: Grades submitted answers and saves answer records locally.
- `lib/courses.ts`: Filesystem helper for reading `course_database/`.
- `lib/coursePaths.ts`: Resolves semester/course pairs to safe course folder paths.
- `lib/llm.ts`: Server-side OpenAI and Claude connection helpers.
- `lib/materialScanner.ts`: Extracts prioritized text from course materials, especially `supplement/`.
- `lib/answerGrader.ts`: Uses OpenAI to grade submitted answers and produce brief feedback.
- `lib/problemGuide.ts`: Builds course-specific problem generation guides with Claude.
- `lib/problemGenerator.ts`: Generates one practice problem from a course guide, recent feedback examples, and saves it locally.
- `lib/practiceStorage.ts`: Writes answer records and good/bad problem archives inside each course folder.
- `lib/weaknessAnalyzer.ts`: Aggregates graded answer records into local weakness summaries.
- `app/practice/page.tsx`: Practice page route and course validation.
- `app/problem-set/page.tsx`: Lists generated problems and previous attempt status for one course.
- `components/BackButton.tsx`: Client-side back button that uses browser history with a home fallback.
- `components/PracticeWorkspace.tsx`: Client-side practice UI with problem display and answer text area.
- `app/weakness/page.tsx`: Weakness summary page for graded course attempts.
- `app/not-found.tsx`: User-facing fallback for invalid selected courses.

## Component Responsibilities

`CourseSelector` owns the click-to-load behavior for courses. It handles loading, empty/error messages, and course selection.

`ActionPanel` receives a selected course and renders the course actions: `Do Practice`, `Problem Set`, and `View Weakness`. It also has a `Back` button that returns to the course selector.

Selected-course navigation is URL-restorable through `/?semester=[semester]&course=[course]`. Practice, problem set, and weakness pages use this URL as their back target, so returning from those pages restores the selected-course action panel instead of losing state.

The practice and weakness pages validate the selected semester/course pair through `resolveCoursePath()` before rendering.

`PracticeWorkspace` calls `/api/problem-generator/generate` when opened without a `problemId`. When opened from the problem set with a `problemId`, it calls `/api/problem-set/problem` to load that saved problem and its previous attempts. It displays the generated problem, creates separate answer boxes for generated problem parts, and shows a coordinate-grid diagram canvas above the answer boxes when the generated problem requires a graph or diagram. It submits answers to `/api/practice/attempts`, then displays the returned score and brief grader feedback.

For older generated problems without explicit `answerParts`, `PracticeWorkspace` infers separate answer boxes from common subquestion labels in the problem text.

Previous attempts appear as collapsible review bars below the problem text. Each bar shows submitted answers and grader feedback.

`PracticeWorkspace` also has `Good` and `Bad` problem feedback controls. Good problems are archived immediately. Bad problems open a short reason form before archiving.

`app/weakness/page.tsx` reads course attempts from `answer_records/` and shows average score, weak topics, weak problem types, repeated weakness signals, recent attempts, and recommended next steps.

`lib/courses.ts` detects semester folders first. A folder like `course_database/Spring 2026` is shown as a semester. After that semester is selected, folders like `course_database/Spring 2026/CS 61B` are shown as courses.

`lib/llm.ts` creates provider clients only on the server. API keys must stay in `.env.local` and must not be exposed to client components.

For problem generation profiles, each course may include a `supplement/` folder. Files in `supplement/` are treated as high-priority guidance because they can summarize exam goals, known topics, or your own study-guide notes more cheaply than rereading all raw materials.

## Where To Add Future Features

- Add filters/search to the problem set page.
- Add topic and difficulty controls to `PracticeWorkspace`.
- Connect optional file upload for handwritten or PDF answers.
- Add LLM-assisted explanation to the weakness page after the local summary is reliable.
- Add shared course-related filesystem helpers in `lib/courses.ts`.
- Add shared TypeScript types in `lib/types.ts`.
- Add future course material parsing, exam profiles, practice generation, answer grading, tutor explanations, and weakness logging under new small modules after the local data shape is defined.

## How To Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Local API Keys

Create `.env.local` from `.env.example` and fill in your keys:

```bash
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_MODEL=gpt-5.4-mini
CLAUDE_MODEL=claude-sonnet-4-5-20250929
```

Restart `npm run dev` after changing `.env.local`.

Test connections:

```bash
curl http://localhost:3000/api/llm/health
curl "http://localhost:3000/api/llm/health?provider=openai"
curl "http://localhost:3000/api/llm/health?provider=claude"
```

## Problem Generator

Each course should have:

```text
problem_generation_guide.md
supplement/
generated_problems/
answer_records/
problem_archive/
  good/
  bad/
```

Generate or regenerate a guide:

```bash
curl -X POST http://localhost:3000/api/problem-generator/profile \
  -H "Content-Type: application/json" \
  -d '{"semester":"Spring 2026","course":"ECON 100B"}'
```

Generate one practice problem:

```bash
curl -X POST http://localhost:3000/api/problem-generator/generate \
  -H "Content-Type: application/json" \
  -d '{"semester":"Spring 2026","course":"ECON 100B","difficulty":"medium"}'
```

Submitting an answer from the UI creates a graded JSON record:

```text
course_database/[semester]/[course]/answer_records/
```

The answer record includes:

```text
score
feedback
grading.strengths
grading.improvements
grading.weaknessSignals
```

Marking a problem as good or bad creates a JSON archive record:

```text
course_database/[semester]/[course]/problem_archive/good/
course_database/[semester]/[course]/problem_archive/bad/
```

## Testing The Phase 1 Flow

1. Add semester folders inside `course_database/`.
2. Add course folders under a semester folder, such as `course_database/Spring 2026/CS 61B`.
3. Start the app.
4. Click `Choose Course`.
5. Select a semester.
6. Select a course.
7. Confirm the selected course appears with `Do Practice` and `View Weakness`.
8. Click each action and confirm the placeholder page appears.

## Verification Commands

```bash
npm run lint
npm run build
```
