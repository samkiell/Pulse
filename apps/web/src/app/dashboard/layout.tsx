import { requireUser, computeConnectionStatus } from "@/lib/auth-helpers";
import { prisma } from "@pulse/db";
import { DashboardNav } from "./DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const userProjects = await prisma.project.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      errorEvents: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { timestamp: true },
      },
      _count: {
        select: { errorEvents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const projectNavItems = userProjects.map((p) => {
    const totalEvents = p._count.errorEvents;
    const lastEventAt = p.errorEvents[0]?.timestamp;
    const status = computeConnectionStatus(totalEvents, lastEventAt);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status,
    };
  });

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <DashboardNav user={user} projects={projectNavItems} />
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

