import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./utils";

export type PageReference = ((el: HTMLDivElement | null) => void) | undefined;

export type PaginatedScrollViewProps<T> = {
  data: T[];
  pageSize?: number;
  renderPage: (pageData: T[], pageIndex: number, ref: PageReference) => React.ReactNode;
  loadingPrevious?: React.ReactNode | null;
  loadingNext?: React.ReactNode | null;
  wrapperClassNames?: string;
  pageLoadDelay?: number;
};

export function BidirectionalInfiniteScroll<T>({
  data,
  pageSize = 20,
  renderPage,
  loadingPrevious = null,
  loadingNext = null,
  wrapperClassNames = "",
  pageLoadDelay = 400,
}: PaginatedScrollViewProps<T>) {
  const [visiblePages, setVisiblePages] = useState<number[]>([0, 1]);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollToPage, setScrollToPage] = useState<number | null>(null);
  const [showTopOverlay, setShowTopOverlay] = useState(false);
  const [showBottomOverlay, setShowBottomOverlay] = useState(false);

  const totalPages = Math.ceil(data.length / pageSize);
  const canLoadNext = visiblePages[visiblePages.length - 1] < totalPages - 1;
  const canLoadPrev = visiblePages[0] > 0;

  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topRef.current || !bottomRef.current) return;

    const topObserver = new IntersectionObserver(async ([entry]) => {
      const isAtTop = entry.isIntersecting;
      setShowTopOverlay(!isAtTop);
      if (isAtTop && !isLoading && canLoadPrev) await loadPrevPage();
    }, { threshold: 1.0 });

    const bottomObserver = new IntersectionObserver(async ([entry]) => {
      const isAtBottom = entry.isIntersecting;
      setShowBottomOverlay(!isAtBottom);
      if (isAtBottom && !isLoading && canLoadNext) await loadNextPage();
    }, { threshold: 1.0 });

    topObserver.observe(topRef.current);
    bottomObserver.observe(bottomRef.current);
    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [isLoading, canLoadNext, canLoadPrev]);

  const loadNextPage = async () => {
    if (isLoading) return;
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, pageLoadDelay));
    setVisiblePages((prev) => {
      const nextPage = prev[prev.length - 1] + 1;
      return nextPage >= totalPages ? prev : [prev[1], nextPage];
    });
    setIsLoading(false);
  };

  const loadPrevPage = async () => {
    if (isLoading) return;
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, pageLoadDelay));
    setVisiblePages((prev) => {
      const prevPage = prev[0] - 1;
      if (prevPage < 0) return prev;
      setScrollToPage(prevPage + 1);
      return [prevPage, prev[0]];
    });
    setIsLoading(false);
  };

  const paginatedChunks = useMemo(() =>
      visiblePages.map((page) => ({
        page,
        items: data.slice(page * pageSize, page * pageSize + pageSize),
      })),
    [visiblePages, data, pageSize]
  );

  return (
    <div ref={scrollWrapperRef} className={cn("relative w-full max-h-[400px] overflow-y-auto", wrapperClassNames)}>
      <div ref={topRef} />
      {showTopOverlay && (
        <div className="pointer-events-none sticky top-0 h-12 bg-gradient-to-b from-gray-100 via-gray-100/70 to-transparent" />
      )}
      {isLoading && canLoadPrev && (loadingPrevious ?? <div>Loading previous...</div>)}
      {paginatedChunks.map(({ page, items }) => {
        const shouldScrollTo = page === scrollToPage;
        const ref = shouldScrollTo ? (el: HTMLDivElement | null) => {
          if (el && scrollWrapperRef.current) {
            scrollWrapperRef.current.scrollTop = el.offsetTop - scrollWrapperRef.current.offsetTop + el.clientHeight;
            setScrollToPage(null);
          }
        } : undefined;
        return <React.Fragment key={page}>{renderPage(items, page, ref)}</React.Fragment>;
      })}
      {isLoading && canLoadNext && (loadingNext ?? <div>Loading next...</div>)}
      {showBottomOverlay && (
        <div className="pointer-events-none sticky bottom-0 h-12 bg-gradient-to-t from-gray-100 via-gray-100/70 to-transparent" />
      )}
      <div ref={bottomRef} />
    </div>
  );
}