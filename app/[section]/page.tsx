import { notFound } from "next/navigation";
import { navigation } from "@/lib/tasks";
import { SectionPage } from "@/components/section-page";
export function generateStaticParams() {
  return navigation
    .filter((n) => n !== "Today")
    .map((n) => ({ section: n.toLowerCase() }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const label = navigation.find(
    (n) => n.toLowerCase() === section && n !== "Today",
  );
  if (!label) notFound();
  return <SectionPage section={label} />;
}
