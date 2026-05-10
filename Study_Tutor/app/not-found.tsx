import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Course not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The selected course does not exist in course_database.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Choose Course
        </Link>
      </section>
    </main>
  );
}
