import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { createHash, randomBytes } from "node:crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const rawKey = `pulse_live_${randomBytes(16).toString("hex")}`;
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    // Revoke previous active keys for this project
    await prisma.apiKey.updateMany({
      where: { projectId: project.id, isActive: true },
      data: { isActive: false },
    });

    // Create new key
    const newApiKey = await prisma.apiKey.create({
      data: {
        projectId: project.id,
        keyHash,
        keyPrefix,
        name: "Rotated Key",
      },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        createdAt: true,
      },
    });

    // Return the full key exactly once
    return NextResponse.json(
      {
        id: newApiKey.id,
        key: rawKey,
        keyPrefix: newApiKey.keyPrefix,
        name: newApiKey.name,
        createdAt: newApiKey.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API rotate key POST]", error);
    return NextResponse.json({ error: "Failed to rotate API key" }, { status: 500 });
  }
}
