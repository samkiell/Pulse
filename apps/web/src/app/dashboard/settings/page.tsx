import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@pulse/db";
import { AccountSettingsClient } from "./AccountSettingsClient";

export default async function SettingsPage() {
  const user = await requireUser();

  // Fetch all active Telegram chats across user's projects
  const userProjects = await prisma.project.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      telegramIntegrations: {
        where: { isActive: true, consumedAt: { not: null } },
        select: {
          id: true,
          chatId: true,
          chatTitle: true,
          createdAt: true,
        },
      },
    },
  });

  const allChats = userProjects.flatMap((p) =>
    p.telegramIntegrations.map((t) => ({
      id: t.id,
      chatId: t.chatId,
      chatTitle: t.chatTitle,
      createdAt: t.createdAt,
      projectName: p.name,
      projectSlug: p.slug,
    }))
  );

  return <AccountSettingsClient user={user} chats={allChats} />;
}

