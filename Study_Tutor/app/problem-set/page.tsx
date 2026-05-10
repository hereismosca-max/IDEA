import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/BackButton";
import { resolveCoursePath } from "@/lib/coursePaths";
import { listProblemSet } from "@/lib/practiceStorage";

type ProblemSetPageProps = {
  searchParams: Promise<{
    semester?: string;
    course?: string;
  }>;
};

export default async function ProblemSetPage({
  searchParams
}: ProblemSetPageProps) {
  const { semester, course } = await searchParams;

  if (!semester || !course) {
    notFound();
  }

  const resolvedCourse = await resolveCoursePath(semester, course);

  if (!resolvedCourse) {
    notFound();
  }

  const problems = await listProblemSet(resolvedCourse.coursePath);
  const encodedSemester = encodeURIComponent(semester);
  const encodedCourse = encodeURIComponent(course);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <BackButton
          href={`/?semester=${encodedSemester}&course=${encodedCourse}`}
          className="w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50"
        />

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Problem Set
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {course}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{semester}</p>

          {problems.length ? (
            <div className="mt-6 divide-y divide-slate-200">
              {problems.map((problem) => {
                const encodedProblemId = encodeURIComponent(problem.id);

                return (
                  <Link
                    key={problem.id}
                    href={`/practice?semester=${encodedSemester}&course=${encodedCourse}&problemId=${encodedProblemId}`}
                    className="block py-4 hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          {problem.topic || "Untitled problem"}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                          {problem.problemType ? (
                            <span className="rounded border border-slate-200 bg-white px-2 py-1">
                              {problem.problemType}
                            </span>
                          ) : null}
                          {problem.difficulty ? (
                            <span className="rounded border border-slate-200 bg-white px-2 py-1 capitalize">
                              {problem.difficulty}
                            </span>
                          ) : null}
                          <span className="rounded border border-slate-200 bg-white px-2 py-1">
                            {problem.attemptCount
                              ? `${problem.attemptCount} attempt${problem.attemptCount === 1 ? "" : "s"}`
                              : "Not done"}
                          </span>
                          {problem.latestScore !== null ? (
                            <span className="rounded border border-slate-200 bg-white px-2 py-1">
                              Latest {problem.latestScore}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {problem.lastAttemptAt
                          ? `Last attempted ${formatDate(problem.lastAttemptAt)}`
                          : problem.generatedAt
                            ? `Generated ${formatDate(problem.generatedAt)}`
                            : ""}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {problem.problemPreview}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No generated problems found yet. Use Do Practice first to generate
              course-specific problems.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
