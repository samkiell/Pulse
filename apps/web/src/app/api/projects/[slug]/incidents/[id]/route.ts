import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["OPEN", "RESOLVED", "MUTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, projectId: project.id },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found in project" }, { status: 404 });
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API incident status PATCH]", error);
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
