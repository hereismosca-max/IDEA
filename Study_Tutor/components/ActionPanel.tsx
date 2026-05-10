import Link from "next/link";

type ActionPanelProps = {
  course: string;
  semester: string;
  onBack?: () => void;
};

export function ActionPanel({ course, semester, onBack }: ActionPanelProps) {
  const encodedCourse = encodeURIComponent(course);
  const encodedSemester = encodeURIComponent(semester);

  return (
    <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
        Selected Course
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{course}</h2>
      <p className="mt-1 text-sm text-slate-500">{semester}</p>

      <div className="mt-6 grid gap-3">
        <Link
          href={`/practice?semester=${encodedSemester}&course=${encodedCourse}`}
          className="rounded-md bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Do Practice
        </Link>
        <Link
          href={`/problem-set?semester=${encodedSemester}&course=${encodedCourse}`}
          className="rounded-md border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Problem Set
        </Link>
        <Link
          href={`/weakness?semester=${encodedSemester}&course=${encodedCourse}`}
          className="rounded-md border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          View Weakness
        </Link>
      </div>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Back
        </button>
      ) : null}
    </section>
  );
}
