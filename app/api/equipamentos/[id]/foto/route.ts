import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/acesso";

// /api não passa pelo proxy.ts (ver matcher), então a checagem de login é aqui.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModulo("equipamentos");
  } catch {
    return new Response("Não autorizado", { status: 401 });
  }

  const { id } = await params;
  const foto = await prisma.equipamentoFoto.findUnique({ where: { equipamentoId: id } });
  if (!foto) return new Response("Não encontrada", { status: 404 });

  return new Response(foto.dados, {
    headers: {
      "Content-Type": foto.tipo,
      "X-Content-Type-Options": "nosniff",
      // a URL muda (?v=) a cada novo envio, então pode cachear por bastante tempo
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
