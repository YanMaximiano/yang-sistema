import Link from "next/link";
import { PageHeader, Card, Badge } from "@/components/ui";
import { listarAvisos } from "@/lib/avisos";

export default async function AvisosPage() {
  const avisos = await listarAvisos();

  return (
    <div>
      <PageHeader
        title="Central de avisos"
        description="Prazos, pagamentos e pendências que precisam de atenção."
      />
      <div className="space-y-3">
        {avisos.map((aviso, i) => (
          <Link key={i} href={aviso.href}>
            <Card className="p-4 hover:border-neutral-300 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{aviso.titulo}</span>
                <Badge variant={aviso.severidade === "atraso" ? "danger" : "warning"}>
                  {aviso.severidade === "atraso" ? "Atrasado" : "Atenção"}
                </Badge>
              </div>
              <p className="text-sm text-neutral-600">{aviso.descricao}</p>
            </Card>
          </Link>
        ))}
        {avisos.length === 0 && <p className="text-sm text-neutral-500">Nenhum aviso pendente.</p>}
      </div>
    </div>
  );
}
