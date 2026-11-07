import { TEMPLATES } from "@/lib/coloring/templates";
import { Editor } from "@/components/coloring/Editor";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ id: t.id }));
}

export default async function ColoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Editor id={id} />;
}
