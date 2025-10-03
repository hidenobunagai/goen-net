import { requireUserSession } from "@/lib/session";
import { PrioritizationBoard } from "./_components/prioritization-board";

export default async function PrioritizationPage() {
  await requireUserSession();
  return <PrioritizationBoard />;
}
