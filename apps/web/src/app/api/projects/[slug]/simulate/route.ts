import { NextResponse } from "next/server";
import { requireApiUser, getOwnedProject } from "@/lib/auth-helpers";

export async function POST(
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

    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (!internalSecret) {
      return NextResponse.json(
        { error: "Simulation disabled: INTERNAL_API_SECRET is unset on web service." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const errorType = body.errorType || "uncaughtException";

    const apiPort = process.env.API_PORT || "3001";
    const internalApiUrl =
      process.env.INTERNAL_API_URL || `http://localhost:${apiPort}`;

    const simulateUrl = `${internalApiUrl}/internal/simulate`;

    const apiResponse = await fetch(simulateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        projectId: project.id,
        errorType,
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => "");
      return NextResponse.json(
        { error: `Internal API returned ${apiResponse.status}: ${errText}` },
        { status: apiResponse.status }
      );
    }

    const result = await apiResponse.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API simulate POST]", error);
    return NextResponse.json({ error: error.message || "Simulation failed" }, { status: 500 });
  }
}
