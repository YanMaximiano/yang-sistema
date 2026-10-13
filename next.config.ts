import type { NextConfig } from "next";

// fixa o fuso do processo Node — sem isso, "hoje"/"atrasado" em lib/avisos.ts e
// no calendário dependeria do fuso do host (a maioria dos provedores usa UTC),
// podendo virar o dia até 3h antes da meia-noite de Brasília.
process.env.TZ = "America/Sao_Paulo";

const nextConfig: NextConfig = {
  experimental: {
    // o padrão (1 MB) rejeitaria fotos de equipamento tiradas por celular/câmera;
    // o limite real de 5 MB por foto é validado em equipamentos/actions.ts
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
