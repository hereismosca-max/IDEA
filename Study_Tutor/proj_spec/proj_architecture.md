# Project Architecture

## Folder Structure

```text
Study_Tutor/
  app/
    api/
      courses/
        route.ts
      llm/
        health/
          route.ts
      problem-generator/
        feedback/
          route.ts
        generate/
          route.ts
        profile/
          route.ts
      problem-set/
        problem/
          route.ts
      practice/
        attempts/
          route.ts
    practice/
      page.tsx
    problem-set/
      page.tsx
    weakness/
      page.tsx
    globals.css
    layout.tsx
    not-found.tsx
    page.tsx
  components/
    ActionPanel.tsx
    CourseSelector.tsx
    PracticeWorkspace.tsx
  lib/
    coursePaths.ts
    courses.ts
    llm.ts
    materialScanner.ts
    answerGrader.ts
    practiceStorage.ts
    problemGuide.ts
    problemGenerator.ts
    weaknessAnalyzer.ts
    types.ts
  course_database/
    Spring 2026/
      CS 61B/
      ECON 131/
  proj_spec/
    codebase_guide.md
    dev_log.md
    proj_architecture.md
    todo.md
```

## Frontend Flow

1. `app/page.tsx` renders the initial home screen.
2. The initial screen shows only the `Choose Course` action.
3. `components/CourseSelector.tsx` fetches semester folder names from `/api/courses` after the user clicks `Choose Course`.
4. Selecting a semester fetches course folder names from `/api/courses?semester=[semester name]`.
5. Selecting a course swaps the page view to `components/ActionPanel.tsx`.
6. `ActionPanel` shows the selected course and links to practice, problem set, and weakness views.
7. The practice view renders `components/PracticeWorkspace.tsx`, which generates one course-specific practice problem and displays typed answer fields.
8. If the generated problem has multiple answer parts, the practice page shows separate answer boxes.
9. If the generated problem requires a graph, sketch, or diagram, the practice page shows a coordinate-grid diagram canvas above the written answer fields.
10. The practice page can submit an answer, display grader feedback, and archive problem-quality feedback.
11. The problem set page lists generated problems from `generated_problems/` and connects them with attempt counts from `answer_records/`.
12. Opening a problem set item reuses the practice page with `problemId`, loading the saved problem and showing previous attempts in collapsible review bars.
13. The weakness page reads graded attempts and summarizes weak topics, problem types, weakness signals, recent attempts, and next-step recommendations.

## Backend/API Flow

`app/api/courses/route.ts` is a small API route.

Without a query parameter, it calls `getAvailableSemesters()` from `lib/courses.ts` and returns JSON:

```ts
{
  semesters: string[];
  error: string | null;
}
```

With `?semester=Spring%202026`, it calls `getCoursesForSemester()` and returns JSON:

```ts
{
  courses: string[];
  error: string | null;
}
```

`app/api/llm/health/route.ts` is a small connection-test API route. It does not implement tutoring, grading, or generation yet. It only verifies whether configured providers can answer a tiny test prompt.

```text
GET /api/llm/health
GET /api/llm/health?provider=openai
GET /api/llm/health?provider=claude
```

The route reads keys and model names from local environment variables.

`app/api/problem-generator/profile/route.ts` creates a course-specific `problem_generation_guide.md` inside the course folder. It scans `supplement/`, `knowledges/`, and `practices/`, prioritizes high-value files, extracts text, and asks Claude to synthesize a stable guide.

`app/api/problem-generator/generate/route.ts` reads the course guide and asks Claude to generate one structured practice problem. The structured result includes `answerParts` for multi-part answer boxes and `needsDrawing` for diagram questions. Generated problem JSON is saved under the course folder in `generated_problems/`.

`app/problem-set/page.tsx` lists generated problems for a selected course. It marks problems as not done or shows the number of previous attempts, latest score, and last attempt time.

`app/api/problem-set/problem/route.ts` loads one saved generated problem plus its matching answer attempts. The practice page uses this route when opened with a `problemId`.

`app/api/practice/attempts/route.ts` grades and saves local answer attempts. It sends the generated problem, answer key, rubric, student answer text, and optional drawing image to the OpenAI Answer Grader Agent, then writes JSON records under the selected course folder:

```text
answer_records/
```

Each record includes the generated problem, typed answers, optional canvas image data, status, percentage score, brief feedback, strengths, improvements, and weakness signals. If grading fails, the answer is still saved with a grading error.

`app/api/problem-generator/feedback/route.ts` saves local good/bad problem feedback. It writes JSON records under:

```text
problem_archive/
  good/
  bad/
```

Bad records can include reason flags for problem type, content mismatch, and a free-text other reason.

`app/weakness/page.tsx` is a server-rendered page. It calls `analyzeCourseWeakness()` from `lib/weaknessAnalyzer.ts`, which reads `answer_records/` and performs local deterministic aggregation. It does not call an LLM in the current version.

## Course Folder Detection

`lib/courses.ts` reads `course_database/` from the project root using Node filesystem APIs. It expects a semester-first layout:

```text
course_database/
  Fall 2026/
  Spring 2026/
    CS 61B/
    ECON 131/
  Summer 2026/
```

Top-level folders are treated as semesters. Folders inside a semester are treated as selectable courses. Empty semester folders are valid and show `No courses recorded.`

If `course_database/` is missing, empty, or unreadable, the helper returns a clear user-facing error message instead of throwing into the UI.

## Long-Term Study Tutor Direction

The intended future app is a personal course tutor, not just a course picker. The likely course workspace should eventually support:

- course materials and study guides
- past exams and practice exams
- student-provided supplement notes such as topic lists, study guides, and generation preferences
- professor reminders, exam format notes, and topic distribution notes
- generated flashcard-style practice problems
- submitted answers and grading feedback
- mistake logs and weakness diagnosis
- tutor explanations in formal academic style and plain English

These features should remain local and structured before any LLM APIs are connected.

## Future Agent Roles

The broader plan may include separate responsibilities for document processing, course profile building, problem generation, answer grading, academic answers, plain-English tutoring, mistake logging, weakness diagnosis, study planning, and quality control.

The app now implements the first piece of the Problem Generator Agent, Answer Grader Agent, and Weakness Diagnosis Agent. The problem generator uses course-specific generation guides and produces one generated practice problem at a time. The practice UI can accept typed multi-part answers and draw graph-style diagrams locally on a coordinate grid. The grader returns a score, short feedback, and weakness signals. The weakness page summarizes those saved grading records. Tutoring and normalized mistake logs are still future work.

The problem generator also has a small local feedback loop. Normal generated problems are saved in `generated_problems/`. User-marked good and bad examples are saved in `problem_archive/`, and recent archived examples are included in future generation prompts for that same course.

Initial model-provider direction:

- OpenAI: answer grading, weakness diagnosis, structured analysis, and quality control.
- Claude: document understanding, course profile building, problem generation, and plain-English tutoring.

This is only a planning split. The app currently connects to the APIs but does not assign real tasks to them yet.

## Planned Future Expansion

- Support richer course metadata.
- Refine the per-course folder schema for exam profile notes, mistake logs, and weakness summaries.
- Add real practice workflows.
- Add richer weakness tracking and LLM-assisted analysis from graded `answer_records/`.
