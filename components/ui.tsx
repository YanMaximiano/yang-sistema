import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// botões em pílula; o preenchimento forte é só do primário (off-white no escuro, quase preto no claro)
const BOTAO_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

const BOTAO_VARIANTES = {
  primary:
    "bg-neutral-900 text-neutral-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-300",
  secondary:
    "border border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800",
  danger: "bg-red-700 text-white hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700",
  ghost:
    "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
};

export type BotaoVariante = keyof typeof BOTAO_VARIANTES;

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BotaoVariante;
}) {
  return <button className={cn(BOTAO_BASE, BOTAO_VARIANTES[variant], className)} {...props} />;
}

export function LinkButton({
  href,
  className,
  variant = "primary",
  children,
}: {
  href: string;
  className?: string;
  variant?: BotaoVariante;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(BOTAO_BASE, BOTAO_VARIANTES[variant], className)}>
      {children}
    </Link>
  );
}

// campos: contorno fino e, ao focar, o âmbar da identidade
const CAMPO =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-[var(--destaque)] focus:ring-4 focus:ring-[var(--destaque-suave)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CAMPO, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CAMPO, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CAMPO, className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400",
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
      {...props}
    />
  );
}

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

// etiqueta minimalista: contorno fino e um ponto colorido; só o "perigo" também colore o texto
const BADGE_VARIANTES: Record<BadgeVariant, { caixa: string; ponto: string }> = {
  neutral: {
    caixa: "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300",
    ponto: "bg-neutral-400",
  },
  success: {
    caixa: "border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200",
    ponto: "bg-emerald-500",
  },
  warning: {
    caixa: "border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200",
    ponto: "bg-amber-500",
  },
  danger: {
    caixa: "border-red-200 text-red-700 dark:border-red-900/60 dark:text-red-400",
    ponto: "bg-red-500",
  },
  info: {
    caixa: "border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200",
    ponto: "bg-sky-500",
  },
};

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
}) {
  const v = BADGE_VARIANTES[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-semibold",
        v.caixa,
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", v.ponto)} />
      {children}
    </span>
  );
}

// "*palavra*" no título vira ênfase serifada em âmbar (use uma por tela)
export function comDestaque(titulo: string) {
  return titulo.split(/\*([^*]+)\*/g).map((parte, i) =>
    i % 2 === 1 ? (
      <span key={i} className="destaque">
        {parte}
      </span>
    ) : (
      parte
    )
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div id="cabecalho-pagina" className="flex flex-wrap items-end justify-between gap-6 mb-10">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-extrabold leading-[1.08] tracking-tight text-neutral-900 dark:text-neutral-100">
          {comDestaque(title)}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// título de seção dentro das páginas: pequeno, com fio fino
export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
      <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{children}</h2>
      {aside && <div className="text-sm text-neutral-500 dark:text-neutral-400">{aside}</div>}
    </div>
  );
}

// nota discreta: contorno fino e um ponto colorido, no lugar das caixas coloridas
export function Nota({
  tom = "neutro",
  className,
  id,
  children,
}: {
  tom?: "neutro" | "atencao" | "perigo" | "ok";
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const ponto = { neutro: "bg-neutral-400", atencao: "bg-amber-500", perigo: "bg-red-500", ok: "bg-emerald-500" }[tom];
  return (
    <div
      id={id}
      className={cn(
        "flex gap-3 rounded-2xl border border-neutral-200 px-4 py-3 text-sm leading-relaxed text-neutral-700 dark:border-neutral-800 dark:text-neutral-300",
        className
      )}
    >
      <span aria-hidden="true" className={cn("mt-[7px] size-2 shrink-0 rounded-full", ponto)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export type ItemDeMetrica = {
  rotulo: string;
  valor: React.ReactNode;
  apoio?: string;
  // um único número por tela em âmbar (a identidade pede ênfase rara)
  destaque?: boolean;
  negativo?: boolean;
};

// números principais em linha, separados por fios finos (sem caixas)
export function MetricasEmLinha({ itens, className, id }: { itens: ItemDeMetrica[]; className?: string; id?: string }) {
  return (
    <div
      id={id}
      className={cn(
        "grid grid-cols-2 border-y border-neutral-200 dark:border-neutral-800 lg:[grid-template-columns:repeat(var(--colunas),minmax(0,1fr))]",
        className
      )}
      style={{ "--colunas": itens.length } as React.CSSProperties}
    >
      {itens.map((m, i) => (
        <div
          key={m.rotulo}
          className={cn(
            "min-w-0 px-5 py-6 lg:px-7 lg:py-8",
            // duas colunas (telas menores): fio vertical entre as colunas e horizontal entre as linhas
            i % 2 === 1 && "border-l border-neutral-200 dark:border-neutral-800",
            i >= 2 && "border-t border-neutral-200 dark:border-neutral-800",
            // uma linha só (telas grandes): fio vertical entre todos, sem fio horizontal
            "lg:border-t-0",
            i > 0 ? "lg:border-l lg:border-neutral-200 lg:dark:border-neutral-800" : "lg:border-l-0",
            i === 0 && "pl-0 lg:pl-0"
          )}
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            {m.rotulo}
          </p>
          <p
            className={cn(
              "whitespace-nowrap text-2xl font-extrabold leading-none tracking-tight tabular-nums xl:text-3xl 2xl:text-4xl",
              m.destaque ? "texto-destaque" : m.negativo ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"
            )}
          >
            {m.valor}
          </p>
          {m.apoio && <p className="mt-3 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{m.apoio}</p>}
        </div>
      ))}
    </div>
  );
}

export function LoadingSpinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 py-12 justify-center">
      <span className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-[var(--destaque)] dark:border-t-[var(--destaque)] animate-spin" />
      {label}
    </div>
  );
}
