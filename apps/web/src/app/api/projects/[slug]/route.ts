import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { requireApiUser, getOwnedProject } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { slug } = await params;
    const project = await getOwnedProject(user.id, slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const incidents = await prisma.incident.findMany({
      where: { projectId: project.id },
      orderBy: { lastSeenAt: "desc" },
      include: {
        events: {
          take: 5,
          orderBy: { timestamp: "desc" },
        },
      },
    });

    const openIncidentsCount = incidents.filter((i) => i.status === "OPEN").length;
    const totalOccurrences = incidents.reduce((acc, curr) => acc + curr.occurrenceCount, 0);

    const botUsername =
      process.env.TELEGRAM_BOT_USERNAME ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      "rumptypulsebot";

    const sanitizedProject = {
      ...project,
      incidents,
      apiKeys: project.apiKeys.map((k) => ({
        ...k,
        maskedKey: `${k.keyPrefix}••••••••••••••••••••••••`,
      })),
      telegramIntegrations: project.telegramIntegrations.map((t) => ({
        ...t,
        deepLink: `https://t.me/${botUsername}?start=${t.verificationToken}`,
      })),
    };

    return NextResponse.json({
      project: sanitizedProject,
      stats: {
        openIncidents: openIncidentsCount,
        resolvedIncidents: incidents.length - openIncidentsCount,
        totalErrors: totalOccurrences,
      },
    });
  } catch (error) {
    console.error("[API project by slug GET]", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { slug } = await params;
    const project = await getOwnedProject(user.id, slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { name },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("[API project by slug PATCH]", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { slug } = await params;
    const project = await getOwnedProject(user.id, slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id: project.id },
    });

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("[API project by slug DELETE]", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
