import Link from "next/link";
import { PageHeader, Card, Badge } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { listarAvisos, avisosVisiveis } from "@/lib/avisos";
import { exigirModulo } from "@/lib/acesso";

export default async function AvisosPage() {
  const acesso = await exigirModulo("avisos");
  const avisos = avisosVisiveis(await listarAvisos(), acesso.tem);

  return (
    <div>
      <PageHeader
        eyebrow="Atenção" title="Central de *avisos*"
        description="Prazos, pagamentos e pendências que precisam de atenção."
        actions={<AssistenteDaTela chave="avisos" />}
      />
      <div id="lista-avisos" className="space-y-3">
        {avisos.map((aviso, i) => (
          <Link key={i} href={aviso.href}>
            <Card className="p-4 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{aviso.titulo}</span>
                <Badge variant={aviso.severidade === "atraso" ? "danger" : "warning"}>
                  {aviso.severidade === "atraso" ? "Atrasado" : "Atenção"}
                </Badge>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{aviso.descricao}</p>
            </Card>
          </Link>
        ))}
        {avisos.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum aviso pendente.</p>}
      </div>
    </div>
  );
}
