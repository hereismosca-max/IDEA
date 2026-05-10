import { notFound } from "next/navigation";

import { BackButton } from "@/components/BackButton";
import { PracticeWorkspace } from "@/components/PracticeWorkspace";
import { resolveCoursePath } from "@/lib/coursePaths";

type PracticePageProps = {
  searchParams: Promise<{
    semester?: string;
    course?: string;
    problemId?: string;
  }>;
};

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const { semester, course, problemId } = await searchParams;

  if (!semester || !course || !(await resolveCoursePath(semester, course))) {
    notFound();
  }

  const encodedSemester = encodeURIComponent(semester);
  const encodedCourse = encodeURIComponent(course);
  const backHref = problemId
    ? `/problem-set?semester=${encodedSemester}&course=${encodedCourse}`
    : `/?semester=${encodedSemester}&course=${encodedCourse}`;

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <BackButton
          href={backHref}
          className="w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50"
        />
        <PracticeWorkspace
          course={course}
          semester={semester}
          problemId={problemId}
        />
      </div>
    </main>
  );
}
