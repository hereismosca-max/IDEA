import { HomeClient } from "@/components/HomeClient";

type HomePageProps = {
  searchParams: Promise<{
    semester?: string;
    course?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const { semester, course } = await searchParams;

  return (
    <HomeClient
      initialSelectedCourse={
        semester && course
          ? {
              semester,
              course
            }
          : null
      }
    />
  );
}
