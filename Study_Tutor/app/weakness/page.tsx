import { notFound } from "next/navigation";

import { BackButton } from "@/components/BackButton";
import { resolveCoursePath } from "@/lib/coursePaths";
import { analyzeCourseWeakness } from "@/lib/weaknessAnalyzer";

type WeaknessPageProps = {
  searchParams: Promise<{
    semester?: string;
    course?: string;
  }>;
};

export default async function WeaknessPage({ searchParams }: WeaknessPageProps) {
  const { semester, course } = await searchParams;

  if (!semester || !course) {
    notFound();
  }

  const resolvedCourse = await resolveCoursePath(semester, course);

  if (!resolvedCourse) {
    notFound();
  }

  const summary = await analyzeCourseWeakness(resolvedCourse.coursePath);
  const encodedSemester = encodeURIComponent(semester);
  const encodedCourse = encodeURIComponent(course);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <BackButton
          href={`/?semester=${encodedSemester}&course=${encodedCourse}`}
          className="w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50"
        />

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Weakness
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{course}</h1>
              <p className="mt-1 text-sm text-slate-500">{semester}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Average Score</p>
              <p className="text-3xl font-semibold text-slate-900">
                {summary.averageScore === null ? "--" : `${summary.averageScore}%`}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard label="Total Attempts" value={summary.totalAttempts} />
            <MetricCard label="Graded Attempts" value={summary.gradedAttempts} />
            <MetricCard
              label="Weakness Signals"
              value={summary.weaknessSignals.length}
            />
          </div>

          {summary.gradedAttempts ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <SummaryPanel
                title="Weakest Topics"
                emptyText="No topic data yet."
                items={summary.weakestTopics.map((item) => ({
                  title: item.name,
                  detail: `${item.averageScore}% average across ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}`,
                  meta: `${item.lowScoreCount} below 70%`
                }))}
              />
              <SummaryPanel
                title="Weakest Problem Types"
                emptyText="No problem-type data yet."
                items={summary.weakestProblemTypes.map((item) => ({
                  title: item.name,
                  detail: `${item.averageScore}% average across ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}`,
                  meta: `${item.lowScoreCount} below 70%`
                }))}
              />
              <SummaryPanel
                title="Repeated Weakness Signals"
                emptyText="No repeated signals yet."
                items={summary.weaknessSignals.map((item) => ({
                  title: item.name,
                  detail: `${item.count} mention${item.count === 1 ? "" : "s"}`,
                  meta: "from grader feedback"
                }))}
              />
              <SummaryPanel
                title="What To Do Next"
                emptyText="No recommendations yet."
                items={summary.recommendations.map((recommendation) => ({
                  title: recommendation,
                  detail: "",
                  meta: ""
                }))}
              />
            </div>
          ) : (
            <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              No graded attempts yet. Complete and submit practice problems for
              this course, then this page will summarize weak topics, weak
              problem types, and repeated feedback signals.
            </div>
          )}

          {summary.recentAttempts.length ? (
            <div className="mt-8">
              <h2 className="text-base font-semibold text-slate-900">
                Recent Attempts
              </h2>
              <div className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200">
                {summary.recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {attempt.problem.topic || "Uncategorized"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {attempt.problem.problemType || "Unknown type"} ·{" "}
                          {formatDate(attempt.submittedAt)}
                        </p>
                      </div>
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                        {attempt.score === null ? "Ungraded" : `${attempt.score}%`}
                      </span>
                    </div>
                    {attempt.feedback ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {attempt.feedback}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryPanel({
  title,
  emptyText,
  items
}: {
  title: string;
  emptyText: string;
  items: Array<{ title: string; detail: string; meta: string }>;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {items.length ? (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={`${item.title}-${item.detail}`} className="text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-slate-800">{item.title}</p>
                {item.meta ? (
                  <p className="text-xs text-slate-500">{item.meta}</p>
                ) : null}
              </div>
              {item.detail ? (
                <p className="mt-1 text-slate-600">{item.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
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
