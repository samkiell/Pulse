import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { requireApiUser, getOwnedIncident } from "@/lib/auth-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { slug, id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["OPEN", "RESOLVED", "MUTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const incident = await getOwnedIncident(user.id, slug, id);

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API incident status PATCH]", error);
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
