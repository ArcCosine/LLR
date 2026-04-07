import type { ReactNode } from "react";

function getSafeUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("/")
  ) {
    return url;
  }
  return undefined;
}

function renderHtmlNode(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) =>
    renderHtmlNode(child, `${key}-${index}`),
  );

  switch (tag) {
    case "h1":
      return (
        <h1
          key={key}
          className="mb-4 mt-8 max-w-full [overflow-wrap:anywhere] text-[1.8em] font-bold leading-tight"
        >
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2
          key={key}
          className="mb-4 mt-8 max-w-full [overflow-wrap:anywhere] text-[1.5em] font-bold leading-tight"
        >
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3
          key={key}
          className="mb-3 mt-6 max-w-full [overflow-wrap:anywhere] text-[1.25em] font-bold leading-snug"
        >
          {children}
        </h3>
      );
    case "h4":
    case "h5":
    case "h6":
      return (
        <h4
          key={key}
          className="mb-3 mt-6 max-w-full [overflow-wrap:anywhere] text-[1.125em] font-semibold leading-snug"
        >
          {children}
        </h4>
      );
    case "p":
      return (
        <p key={key} className="mb-4 max-w-full [overflow-wrap:anywhere] leading-relaxed">
          {children}
        </p>
      );
    case "a": {
      const href = getSafeUrl(element.getAttribute("href"));
      return (
        <a
          key={key}
          href={href}
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-blue-600 underline"
        >
          {children}
        </a>
      );
    }
    case "ul":
      return (
        <ul key={key} className="mb-4 max-w-full list-disc pl-6 [overflow-wrap:anywhere]">
          {children}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="mb-4 max-w-full list-decimal pl-6 [overflow-wrap:anywhere]">
          {children}
        </ol>
      );
    case "li":
      return (
        <li key={key} className="mb-1 max-w-full [overflow-wrap:anywhere]">
          {children}
        </li>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-4 max-w-full border-l-4 border-gray-300 pl-4 text-gray-700 [overflow-wrap:anywhere]"
        >
          {children}
        </blockquote>
      );
    case "pre":
      return (
        <pre
          key={key}
          className="mb-4 max-w-full overflow-x-hidden whitespace-pre-wrap rounded bg-gray-100 p-4 text-[0.875em] break-words"
        >
          {children}
        </pre>
      );
    case "code":
      return (
        <code
          key={key}
          className="max-w-full rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] break-words [overflow-wrap:anywhere]"
        >
          {children}
        </code>
      );
    case "img": {
      const src = getSafeUrl(element.getAttribute("src"));
      const alt = element.getAttribute("alt") || "";
      return src ? (
        <img key={key} src={src} alt={alt} className="my-6 h-auto max-w-full" />
      ) : null;
    }
    case "br":
      return <br key={key} />;
    case "hr":
      return <hr key={key} className="my-6 border-gray-200" />;
    case "strong":
    case "b":
      return <strong key={key}>{children}</strong>;
    case "em":
    case "i":
      return <em key={key}>{children}</em>;
    case "figure":
      return (
        <figure key={key} className="my-6 max-w-full overflow-hidden">
          {children}
        </figure>
      );
    case "figcaption":
      return (
        <figcaption
          key={key}
          className="mt-2 max-w-full text-[0.875em] text-gray-500 [overflow-wrap:anywhere]"
        >
          {children}
        </figcaption>
      );
    case "div":
    case "span":
    case "section":
    case "article":
      return (
        <div key={key} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
          {children}
        </div>
      );
    default:
      return <>{children}</>;
  }
}

export function ArticleContent({ content }: { content: string }) {
  const doc = new DOMParser().parseFromString(content, "text/html");

  return Array.from(doc.body.childNodes).map((node, index) =>
    renderHtmlNode(node, `article-${index}`),
  );
}
