import type { NextConfig } from "next";

// fixa o fuso do processo Node — sem isso, "hoje"/"atrasado" em lib/avisos.ts e
// no calendário dependeria do fuso do host (a maioria dos provedores usa UTC),
// podendo virar o dia até 3h antes da meia-noite de Brasília.
process.env.TZ = "America/Sao_Paulo";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
