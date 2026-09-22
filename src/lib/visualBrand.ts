/**
 * Camada visual de substituição de marca
 * PHILIPS DO BRASIL -> ABC EQUIPAMENTOS
 * PHILIPS -> ABC EQUIPAMENTOS
 *
 * IMPORTANTE: Apenas camada visual (DOM text nodes).
 * Nenhum dado em banco, payload de API, ou regra de negócio é alterado.
 * Comparações como `cliente.nome === 'PHILIPS DO BRASIL'` continuam funcionando.
 */

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/PHILIPS DO BRASIL/gi, 'ABC EQUIPAMENTOS'],
  [/PHILIPS/gi, 'ABC EQUIPAMENTOS'],
];

/**
 * Aplica substituição apenas para exibição
 * Usar quando precisar formatar manualmente: formatBrandVisual("PHILIPS DO BRASIL")
 */
export function formatBrandVisual(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return (text as string) ?? '';
  let result = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// Verifica se o texto contém marca para evitar trabalho desnecessário
function containsBrand(text: string): boolean {
  return /PHILIPS/i.test(text);
}

function replaceBrandInNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (text && containsBrand(text)) {
      let newText = text;
      for (const [pattern, replacement] of REPLACEMENTS) {
        newText = newText.replace(pattern, replacement);
      }
      if (newText !== text) {
        node.textContent = newText;
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tag = el.tagName;
    // Não alterar scripts, estilos, inputs, etc
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'IFRAME' || tag === 'CODE' || tag === 'PRE') {
      return;
    }
    // Não alterar valores de input/textarea (dados)
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return;
    }
    for (const child of Array.from(node.childNodes)) {
      replaceBrandInNode(child);
    }
  }
}

let observer: MutationObserver | null = null;
let installed = false;

export function installVisualBrand(): void {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;

  // Substituição inicial após render
  const initialReplace = () => {
    if (document.body) {
      replaceBrandInNode(document.body);
    }
  };

  // Tenta imediatamente e também após DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialReplace);
  } else {
    initialReplace();
  }

  // Observa mudanças futuras (navegação SPA, dados carregados do Supabase)
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of Array.from(mutation.addedNodes)) {
          replaceBrandInNode(node);
        }
      } else if (mutation.type === 'characterData') {
        const target = mutation.target;
        if (target.textContent && containsBrand(target.textContent)) {
          replaceBrandInNode(target);
        }
      }
    }
  });

  const startObserving = () => {
    if (document.body && observer) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  };

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving);
  }

  // Fallback: verifica periodicamente nos primeiros segundos (para conteúdo lazy)
  let checks = 0;
  const interval = setInterval(() => {
    checks++;
    if (document.body) replaceBrandInNode(document.body);
    if (checks >= 10) clearInterval(interval);
  }, 500);
}

export function uninstallVisualBrand(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  installed = false;
}
