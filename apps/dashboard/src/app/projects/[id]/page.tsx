import { Suspense } from "react";
import ProjectView from "./view";

async function ResolvedProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectView id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Loading project...</p>}>
      <ResolvedProject params={params} />
    </Suspense>
  );
}