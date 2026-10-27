import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Nota } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  isValid,
  format,
  addMonths,
  subMonths,
  parse,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { exigirModulo } from "@/lib/acesso";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await exigirModulo("calendario");
  const { mes } = await searchParams;
  const mesParseado = mes ? parse(mes, "yyyy-MM", new Date()) : new Date();
  const referencia = isValid(mesParseado) ? mesParseado : new Date();

  const inicioMes = startOfMonth(referencia);
  const fimMes = endOfMonth(referencia);
  const inicioGrade = startOfWeek(inicioMes);
  const fimGrade = endOfWeek(fimMes);
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade });

  const hoje = new Date();

  const projetos = await prisma.projeto.findMany({
    where: { prazoData: { not: null }, statusGeral: { in: ["ATIVO", "PAUSADO"] } },
    include: { cliente: { select: { nome: true } } },
    orderBy: { prazoData: "asc" },
  });

  // compara por dia, não pelo instante exato — um prazo "hoje" não pode
  // virar atrasado só porque já passou do meio-dia
  const atrasados = projetos.filter(
    (p) => p.prazoData && isBefore(startOfDay(p.prazoData), startOfDay(hoje))
  );

  const mesAnterior = format(subMonths(referencia, 1), "yyyy-MM");
  const proximoMes = format(addMonths(referencia, 1), "yyyy-MM");

  return (
    <div>
      <PageHeader
        eyebrow="Produção" title="Calendário de *prazos*"
        description="Prazos de projetos ativos"
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <AssistenteDaTela chave="calendario" />
            <Link href={`/calendario?mes=${mesAnterior}`} className="underline">
              ← mês anterior
            </Link>
            <span className="font-medium capitalize">{format(referencia, "MMMM yyyy", { locale: ptBR })}</span>
            <Link href={`/calendario?mes=${proximoMes}`} className="underline">
              próximo mês →
            </Link>
          </div>
        }
      />

      {atrasados.length > 0 && (
        <Nota id="calendario-atrasados" tom="perigo" className="mb-8">
          <p className="mb-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">Projetos atrasados</p>
          <div className="space-y-1">
            {atrasados.map((p) => (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="flex justify-between gap-4 text-sm text-neutral-700 hover:underline dark:text-neutral-300"
              >
                <span>
                  {p.nome} — {p.cliente.nome}
                </span>
                <span>{p.prazoData && format(p.prazoData, "dd/MM/yyyy")}</span>
              </Link>
            ))}
          </div>
        </Nota>
      )}

      <div id="grade-calendario">
      <div className="grid grid-cols-7 gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dias.map((dia) => {
          const projetosDoDia = projetos.filter((p) => p.prazoData && isSameDay(p.prazoData, dia));
          const foraDoMes = !isSameMonth(dia, referencia);
          const ehHoje = isSameDay(dia, hoje);

          return (
            <Card
              key={dia.toISOString()}
              className={`p-2 min-h-[90px] rounded-lg ${foraDoMes ? "opacity-40" : ""} ${ehHoje ? "border-neutral-900 dark:border-neutral-100 border-2" : ""}`}
            >
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">{format(dia, "d")}</p>
              <div className="space-y-1">
                {projetosDoDia.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projetos/${p.id}`}
                    className="block text-[11px] leading-tight bg-neutral-100 dark:bg-neutral-800 rounded px-1 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 truncate"
                    title={`${p.nome} — ${p.cliente.nome}`}
                  >
                    {p.nome}
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      </div>
    </div>
  );
}
