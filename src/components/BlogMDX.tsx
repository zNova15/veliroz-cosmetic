import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";

/* ============================================================
   Veliroz Cosmetic — Renderer MDX del blog (Server Component)
   - Usa next-mdx-remote/rsc para compilar el body server-side.
   - Aplica plugins: gfm (tablas/checkbox), slug (anchors) y
     pretty-code (syntax highlighting hooked al tema "veliroz").
   - Overrides de componentes → estética editorial Veliroz:
     Fraunces para H1-H3, Inter para body, taupe para blockquote,
     champagne divider entre secciones. Sin @tailwindcss/typography.
   Nota: los <a href> internos se detectan por prefijo "/" y se
   sirven con next/link (prefetch + SPA nav).
   ============================================================ */

/* Anchor: usa next/link para rutas internas — se activa por prefijo. */
function ProseAnchor({ href, children, ...rest }: ComponentProps<"a">) {
  const isInternal = typeof href === "string" && href.startsWith("/");
  const className =
    "text-rose-deep underline underline-offset-4 decoration-champagne hover:decoration-rose-deep hover:text-ink transition-colors";
  if (isInternal) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

/* ============================================================
   Prose components — mapeados sobre los tags que emite MDX.
   El "look" copia la vibe editorial de Aesop / The Ordinary:
   - H1 sólo si no lo pinta la página (por defecto sí, pero el
     detail lo maneja como hero → escondemos en padding minimal)
   - H2/H3 con opsz alta, tracking suave
   - p con leading generosa y color ink-soft
   - blockquote con borde champagne + serif italic
   ============================================================ */
const proseComponents = {
  h1: (props: ComponentProps<"h1">) => (
    <h1
      {...props}
      className="font-serif text-[--text-display] leading-[1.02] text-ink mt-16 mb-6 text-balance"
    />
  ),
  h2: (props: ComponentProps<"h2">) => (
    <h2
      {...props}
      className="font-serif text-3xl md:text-4xl leading-tight text-ink mt-14 mb-4 scroll-mt-28 text-balance"
    />
  ),
  h3: (props: ComponentProps<"h3">) => (
    <h3
      {...props}
      className="font-serif text-2xl leading-snug text-ink mt-10 mb-3 scroll-mt-28"
    />
  ),
  h4: (props: ComponentProps<"h4">) => (
    <h4
      {...props}
      className="font-mono text-[11px] tracking-[0.22em] uppercase text-taupe mt-8 mb-3"
    />
  ),
  p: (props: ComponentProps<"p">) => (
    <p
      {...props}
      className="text-[1.02rem] leading-[1.85] text-ink-soft my-5 text-pretty"
    />
  ),
  a: ProseAnchor,
  strong: (props: ComponentProps<"strong">) => (
    <strong {...props} className="text-ink font-semibold" />
  ),
  em: (props: ComponentProps<"em">) => (
    <em {...props} className="font-italic-serif text-clay" />
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul
      {...props}
      className="list-disc marker:text-champagne-dark pl-6 my-6 space-y-2 text-ink-soft"
    />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol
      {...props}
      className="list-decimal marker:text-champagne-dark pl-6 my-6 space-y-2 text-ink-soft"
    />
  ),
  li: (props: ComponentProps<"li">) => (
    <li {...props} className="leading-[1.75] pl-1" />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      {...props}
      className="my-10 border-l-2 border-champagne pl-6 py-2 font-italic-serif text-xl leading-snug text-taupe"
    />
  ),
  hr: () => <hr className="divider-champagne my-16 border-0" />,
  code: (props: ComponentProps<"code">) => (
    <code
      {...props}
      className="font-mono text-[0.88em] bg-mist text-clay px-1.5 py-0.5 rounded-sm"
    />
  ),
  pre: (props: ComponentProps<"pre">) => (
    <pre
      {...props}
      className="my-6 rounded-md bg-ink text-cream p-5 overflow-x-auto font-mono text-sm leading-relaxed"
    />
  ),
  table: (props: ComponentProps<"table">) => (
    <div className="my-8 overflow-x-auto rounded-md border border-[--border]">
      <table {...props} className="w-full text-sm text-left" />
    </div>
  ),
  th: (props: ComponentProps<"th">) => (
    <th
      {...props}
      className="bg-mist font-mono text-[10px] tracking-[0.2em] uppercase text-taupe px-4 py-3 border-b border-[--border]"
    />
  ),
  td: (props: ComponentProps<"td">) => (
    <td {...props} className="px-4 py-3 border-b border-[--border] text-ink-soft" />
  ),
} as const;

/* Opciones de rehype-pretty-code — Shiki con tema "one-dark-pro" invertido.
   Si el tema no está disponible, next-mdx-remote hace fallback grácil. */
const prettyCodeOptions = {
  theme: "github-dark-dimmed",
  keepBackground: false,
} as const;

interface Props {
  source: string;
  /** Extras opcionales que se inyectan en el mapping por página. */
  extraComponents?: Record<string, (props: { children?: ReactNode }) => ReactNode>;
}

export function BlogMDX({ source, extraComponents }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <MDXRemote
        source={source}
        components={{ ...proseComponents, ...(extraComponents ?? {}) }}
        options={{
          parseFrontmatter: false, // ya lo hicimos con gray-matter aguas arriba
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              rehypeSlug,
              [rehypePrettyCode, prettyCodeOptions],
            ],
          },
        }}
      />
    </div>
  );
}
