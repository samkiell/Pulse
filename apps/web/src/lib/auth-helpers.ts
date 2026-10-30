import { redirect, notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "@pulse/db";
import crypto from "node:crypto";

export const MAX_PROJECTS_PER_USER = parseInt(
  process.env.MAX_PROJECTS_PER_USER || "5",
  10
);

export type ProjectConnectionStatus = "Waiting for first event" | "Connected" | "Silent";

export function computeConnectionStatus(
  totalEvents: number,
  lastEventAt: Date | string | null | undefined
): ProjectConnectionStatus {
  if (totalEvents === 0 || !lastEventAt) {
    return "Waiting for first event";
  }

  const lastEventTime = new Date(lastEventAt).getTime();
  if (Number.isNaN(lastEventTime)) {
    return "Waiting for first event";
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now - lastEventTime <= oneDayMs) {
    return "Connected";
  }

  return "Silent";
}

export function generateProjectSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "project";

  const randomSuffix = crypto.randomBytes(2).toString("hex"); // 4 random chars
  return `${base}-${randomSuffix}`;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    redirect("/login");
  }
  return user as { id: string; name?: string | null; email?: string | null; image?: string | null };
}

export async function requireApiUser(): Promise<{
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  unauthorizedResponse?: NextResponse;
}> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return {
      user: null as any,
      unauthorizedResponse: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return {
    user: user as { id: string; name?: string | null; email?: string | null; image?: string | null },
  };
}

/**
 * Returns project owned by userId with matching slug.
 * Returns null or throws 404 (never 403) so foreign records do not leak existence.
 */
export async function getOwnedProject(userId: string, slug: string) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ownerId: userId,
    },
    include: {
      apiKeys: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      telegramIntegrations: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          errorEvents: true,
          incidents: true,
        },
      },
    },
  });

  return project;
}

/**
 * Helper that strictly returns the project or triggers a 404.
 */
export async function requireOwnedProject(userId: string, slug: string) {
  const project = await getOwnedProject(userId, slug);
  if (!project) {
    notFound();
  }
  return project;
}

/**
 * Returns incident scoped to project owned by userId.
 * Returns null or throws 404 (never 403).
 */
export async function getOwnedIncident(
  userId: string,
  projectSlug: string,
  incidentId: string
) {
  const project = await prisma.project.findFirst({
    where: {
      slug: projectSlug,
      ownerId: userId,
    },
    select: { id: true, slug: true, name: true },
  });

  if (!project) {
    return null;
  }

  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      projectId: project.id,
    },
    include: {
      events: {
        orderBy: { timestamp: "desc" },
        take: 50,
      },
      project: {
        select: { id: true, slug: true, name: true },
      },
    },
  });

  return incident;
}

export async function requireOwnedIncident(
  userId: string,
  projectSlug: string,
  incidentId: string
) {
  const incident = await getOwnedIncident(userId, projectSlug, incidentId);
  if (!incident) {
    notFound();
  }
  return incident;
}
