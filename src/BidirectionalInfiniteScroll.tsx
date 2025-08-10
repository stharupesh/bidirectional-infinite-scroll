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

/**
 * BiDirectionalInfiniteScroll
 *
 * A React component that provides infinite scrolling in both directions (up and down)
 * while efficiently rendering only two pages of data at a time.
 *
 * 🔁 Features:
 * - Loads two pages in memory: for example, [page 0, page 1]
 * - When scrolling down: loads the next page and removes the oldest → [page 1, page 2]
 * - When scrolling up: loads the previous page and removes the last → [page 0, page 1]
 * - Automatically detects scroll position using IntersectionObserver (top & bottom sentinels)
 * - Supports scroll-to-view when prepending content
 * - Optional custom loading indicators for top and bottom
 * - Configurable page size, load delay, and scroll container class names
 *
 * ⚠️ Important:
 * This component does **not** handle API-based pagination.
 * All data is expected to be preloaded and passed in via the `data` prop.
 *
 * 💡 When to Use:
 * - Your data is already fully loaded or loads very quickly
 * - But rendering all the data at once causes performance issues in the browser
 * - Ideal for scenarios where DOM rendering becomes slow due to large data size
 *   (e.g., thousands of rows in a table, large lists with complex components)
 */
export function BidirectionalInfiniteScroll<T>({
  data,
  pageSize = 20,
  renderPage,
  loadingPrevious = null,
  loadingNext = null,
  wrapperClassNames = "",
  pageLoadDelay = 400,
}: PaginatedScrollViewProps<T>) {
  /**
   * Tracks the currently visible page indices.
   *
   * This component maintains two pages in memory at a time for performance.
   * For example:
   * - Initially loads pages 0 and 1
   * - On scroll down, removes page 0 and loads page 2 → visiblePages = [1, 2]
   * - On scroll up, removes page 2 and loads page 0 → visiblePages = [0, 1]
   */
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

    const topObserver = new IntersectionObserver(
      async ([entry]) => {
        const isAtTop = entry.isIntersecting;
        setShowTopOverlay(!isAtTop);

        if (entry.isIntersecting && !isLoading && canLoadPrev) {
          await loadPrevPage();
        }
      },
      { threshold: 1.0 }
    );

    const bottomObserver = new IntersectionObserver(
      async ([entry]) => {
        const isAtBottom = entry.isIntersecting;
        setShowBottomOverlay(!isAtBottom);

        if (entry.isIntersecting && !isLoading && canLoadNext) {
          await loadNextPage();
        }
      },
      { threshold: 1.0 }
    );

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
      if (nextPage >= totalPages) return prev;
      return [prev[1], nextPage];
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
      setScrollToPage(prevPage + 1); // scroll to second of the newly-visible pages
      return [prevPage, prev[0]];
    });

    setIsLoading(false);
  };

  const paginatedChunks = useMemo(() => {
    return visiblePages.map((page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      return {
        page,
        items: data.slice(start, end),
      };
    });
  }, [visiblePages, data, pageSize]);

  return (
    <div ref={scrollWrapperRef} className={cn("relative w-full max-h-[400px] overflow-y-auto", wrapperClassNames)}>
      <div ref={topRef} />

      {showTopOverlay && (
        <div className="pointer-events-none top-0 left-0 right-0 bg-gradient-to-b from-gray-100 via-gray-100/70 to-transparent h-12 z-10 sticky" />
      )}

      {isLoading && canLoadPrev && (
        loadingPrevious ?? (
          <div className="flex flex-col space-y-1 items-center">
            <span className="text-sm font-semibold text-gray-500 px-2">Loading previous...</span>
          </div>
        )
      )}

      {paginatedChunks.map(({ page, items }) => {
        const shouldScrollTo = page === scrollToPage;
        const ref = shouldScrollTo
          ? (el: HTMLDivElement | null) => {
            if (el && scrollWrapperRef.current) {
              scrollWrapperRef.current.scrollTop = el.offsetTop - scrollWrapperRef.current.offsetTop + el.clientHeight;
              setScrollToPage(null);
            }
          }
          : undefined;

        return (
          <React.Fragment key={page}>
            {renderPage(items, page, ref)}
          </React.Fragment>
        );
      })}

      {isLoading && canLoadNext && (
        loadingNext ?? (
          <div className="flex flex-col space-y-1 items-center">
            <span className="text-sm font-semibold text-gray-500 px-2">Loading next...</span>
          </div>
        )
      )}

      {showBottomOverlay && (
        <div className="pointer-events-none bottom-0 left-0 right-0 bg-gradient-to-t from-gray-100 via-gray-100/70 to-transparent h-12 z-10 sticky" />
      )}

      <div ref={bottomRef} />
    </div>
  );
}