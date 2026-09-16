import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackToTopProps {
  /** Pixels of scroll before showing. Default 400. */
  threshold?: number;
  /** Optional scroll container. Defaults to window. */
  scrollContainer?: HTMLElement | null;
  className?: string;
}

export function BackToTop({ threshold = 400, scrollContainer, className }: BackToTopProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target: HTMLElement | Window = scrollContainer ?? window;
    const getY = () =>
      scrollContainer ? scrollContainer.scrollTop : window.scrollY || document.documentElement.scrollTop;

    const onScroll = () => setShow(getY() > threshold);
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [threshold, scrollContainer]);

  const goTop = () => {
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Button
      onClick={goTop}
      size="icon"
      aria-label="Voltar ao topo"
      className={cn(
        'fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full shadow-lg shadow-primary/30 transition-all duration-300',
        show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none',
        className
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
