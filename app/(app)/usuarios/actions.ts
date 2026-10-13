"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { str } from "@/lib/form";
import type { Role } from "@/app/generated/prisma/client";

export async function createUsuario(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const name = str(formData, "name");
  const email = str(formData, "email");
  const senha = str(formData, "senha");
  const role = formData.get("role") as Role;
  if (!name || !email || !senha || !role) return;

  const passwordHash = await bcrypt.hash(senha, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  revalidatePath("/usuarios");
}

export async function updateUsuario(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const id = formData.get("id") as string;
  if (!id) return;
  // ninguém edita a própria conta por aqui — evita se autobloquear
  // (tirar o próprio ADMIN ou trocar a própria senha sem querer)
  if (id === session.user.id) return;

  const name = str(formData, "name");
  const role = formData.get("role") as Role | null;
  const senha = str(formData, "senha");

  await prisma.user.update({
    where: { id },
    data: {
      name: name ?? undefined,
      role: role || undefined,
      passwordHash: senha ? await bcrypt.hash(senha, 10) : undefined,
    },
  });

  revalidatePath("/usuarios");
}

export async function alternarAtivoUsuario(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const id = formData.get("id") as string;
  if (!id || id === session.user.id) return;

  const usuario = await prisma.user.findUnique({ where: { id } });
  if (!usuario) return;

  await prisma.user.update({ where: { id }, data: { ativo: !usuario.ativo } });
  revalidatePath("/usuarios");
}
