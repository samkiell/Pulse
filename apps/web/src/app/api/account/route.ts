import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { requireApiUser } from "@/lib/auth-helpers";

export async function DELETE(req: Request) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const body = await req.json().catch(() => ({}));
    const confirmUsername = (body.confirmUsername || "").trim();

    // Verify confirmation matches user name or user email prefix
    const expectedName = (user.name || user.email?.split("@")[0] || "delete").trim();
    if (confirmUsername.toLowerCase() !== expectedName.toLowerCase()) {
      return NextResponse.json(
        { error: `Confirmation username "${confirmUsername}" does not match "${expectedName}"` },
        { status: 400 }
      );
    }

    // Delete user which cascades everything (projects, keys, incidents, events, integrations)
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("[API account DELETE]", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

