/**
 * Qore Virtual List - High-performance list rendering
 * Windowed rendering for large lists
 */

import { signal, computed, effect } from './signal';
import { h, render, VNode, Component, For } from './render';

export interface VirtualListItem<T> {
  id: string | number;
  data: T;
  height?: number;
}

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number) => VNode;
  overscan?: number; // Number of items to render outside visible area
  onScroll?: (scrollTop: number) => void;
  onRangeChange?: (startIndex: number, endIndex: number) => void;
  className?: string;
  getKey?: (item: T, index: number) => string | number;
}

export interface VirtualListState {
  scrollTop: number;
  containerHeight: number;
  totalHeight: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
}

/**
 * Virtual List Component
 * Only renders visible items for better performance
 */
export function VirtualList<T>(props: VirtualListProps<T>): Component {
  const {
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5,
    onScroll,
    onRangeChange,
    className = 'virtual-list',
    getKey = (item, index) => index
  } = props;
  
  const isDynamicHeight = typeof itemHeight === 'function';
  
  // Scroll position
  const scrollTop = signal(0);
  
  // Calculate total height
  const totalHeight = computed(() => {
    if (!isDynamicHeight) {
      return items.length * itemHeight;
    }
    
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += itemHeight(items[i], i);
    }
    return height;
  });
  
  // Get item height at index
  const getItemHeight = (index: number): number => {
    if (!isDynamicHeight) {
      return itemHeight as number;
    }
    return itemHeight(items[index], index);
  };
  
  // Calculate item position (offset from top)
  const getItemOffset = (index: number): number => {
    if (!isDynamicHeight) {
      return index * (itemHeight as number);
    }
    
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  };
  
  // Find the first visible item index
  const findStartIndex = (scrollPos: number): number => {
    if (!isDynamicHeight) {
      return Math.max(0, Math.floor(scrollPos / (itemHeight as number)));
    }
    
    let offset = 0;
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (offset + height > scrollPos) {
        return i;
      }
      offset += height;
    }
    return items.length - 1;
  };
  
  // Find the last visible item index
  const findEndIndex = (startIndex: number, scrollPos: number): number => {
    const viewportEnd = scrollPos + containerHeight;
    
    if (!isDynamicHeight) {
      return Math.min(
        items.length - 1,
        Math.ceil(viewportEnd / (itemHeight as number))
      );
    }
    
    let offset = getItemOffset(startIndex);
    for (let i = startIndex; i < items.length; i++) {
      const height = getItemHeight(i);
      if (offset > viewportEnd) {
        return i;
      }
      offset += height;
    }
    return items.length - 1;
  };
  
  // Visible range
  const visibleRange = computed(() => {
    const scrollPos = scrollTop();
    let startIndex = findStartIndex(scrollPos);
    let endIndex = findEndIndex(startIndex, scrollPos);
    
    // Add overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(items.length - 1, endIndex + overscan);
    
    return { startIndex, endIndex };
  });
  
  // Notify range change
  effect(() => {
    const { startIndex, endIndex } = visibleRange();
    onRangeChange?.(startIndex, endIndex);
  });
  
  // Handle scroll
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    scrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };
  
  // Render
  return () => {
    const { startIndex, endIndex } = visibleRange();
    const visibleItems = items.slice(startIndex, endIndex + 1);
    
    // Calculate spacer heights
    const topSpacerHeight = getItemOffset(startIndex);
    const bottomSpacerHeight = totalHeight() - getItemOffset(endIndex + 1);
    
    return h('div', { 
      class: className,
      style: {
        height: containerHeight + 'px',
        overflowY: 'auto',
        position: 'relative'
      },
      onscroll: handleScroll
    }, [
      // Top spacer
      h('div', {
        style: {
          height: topSpacerHeight + 'px',
          flexShrink: 0
        }
      }),
      
      // Visible items
      ...visibleItems.map((item, i) => {
        const index = startIndex + i;
        const key = getKey(item, index);
        const height = getItemHeight(index);
        
        return h('div', {
          key: key,
          'data-index': index,
          style: {
            height: height + 'px',
            flexShrink: 0
          }
        }, [
          renderItem(item, index)
        ]);
      }),
      
      // Bottom spacer
      h('div', {
        style: {
          height: Math.max(0, bottomSpacerHeight) + 'px',
          flexShrink: 0
        }
      })
    ]);
  };
}

/**
 * Infinite Scroll Virtual List
 * Supports loading more items as user scrolls
 */
export interface InfiniteListProps<T> extends VirtualListProps<T> {
  onLoadMore: () => Promise<T[]>;
  hasMore: boolean;
  loading?: boolean;
  loadingComponent?: VNode;
  endComponent?: VNode;
}

export function InfiniteList<T>(props: InfiniteListProps<T>): Component {
  const {
    items,
    itemHeight,
    containerHeight,
    renderItem,
    onLoadMore,
    hasMore,
    loading = false,
    loadingComponent = h('div', { class: 'loading' }, 'Loading...'),
    endComponent = h('div', { class: 'end' }, 'No more items'),
    ...listProps
  } = props;
  
  const isLoading = signal(loading);
  const nearEnd = signal(false);
  
  // Load more when near end
  effect(() => {
    if (nearEnd() && hasMore && !isLoading()) {
      isLoading(true);
      onLoadMore().finally(() => {
        isLoading(false);
      });
    }
  });
  
  return () => {
    const allItems = [...items];
    
    // Add loading indicator
    if (isLoading()) {
      allItems.push({ __loading: true } as any);
    }
    
    // Add end message
    if (!hasMore && !isLoading()) {
      allItems.push({ __end: true } as any);
    }
    
    const augmentedRenderItem = (item: any, index: number): VNode => {
      if ((item as any).__loading) {
        return loadingComponent;
      }
      if ((item as any).__end) {
        return endComponent;
      }
      return renderItem(item, index);
    };
    
    return h(VirtualList, {
      ...listProps,
      items: allItems,
      itemHeight,
      containerHeight,
      renderItem: augmentedRenderItem,
      onRangeChange: (start, end) => {
        // Trigger load more when near end
        const threshold = Math.floor(allItems.length * 0.8);
        nearEnd(end >= threshold);
        listProps.onRangeChange?.(start, end);
      }
    });
  };
}

/**
 * Fixed-height virtual list (optimized for uniform item heights)
 */
export function FixedVirtualList<T>(props: Omit<VirtualListProps<T>, 'itemHeight'> & {
  itemHeight: number;
}): Component {
  return VirtualList(props);
}

/**
 * Grid-based virtual list for 2D layouts
 */
export interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => VNode;
  gap?: number;
  overscan?: number;
  className?: string;
}

export function VirtualGrid<T>(props: VirtualGridProps<T>): Component {
  const {
    items,
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    renderItem,
    gap = 0,
    overscan = 2,
    className = 'virtual-grid'
  } = props;
  
  const columns = Math.floor(containerWidth / (itemWidth + gap));
  const rows = Math.ceil(items.length / columns);
  
  const scrollTop = signal(0);
  
  const visibleRows = Math.ceil(containerHeight / itemHeight);
  
  const visibleRange = computed(() => {
    const scrollPos = scrollTop();
    const startRow = Math.max(0, Math.floor(scrollPos / itemHeight) - overscan);
    const endRow = Math.min(rows - 1, Math.ceil((scrollPos + containerHeight) / itemHeight) + overscan);
    
    return {
      startRow,
      endRow,
      startIndex: startRow * columns,
      endIndex: Math.min(items.length - 1, (endRow + 1) * columns - 1)
    };
  });
  
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    scrollTop(target.scrollTop);
  };
  
  return () => {
    const { startRow, startIndex, endIndex } = visibleRange();
    const visibleItems = items.slice(startIndex, endIndex + 1);
    
    const topSpacerHeight = startRow * itemHeight;
    const bottomSpacerHeight = (rows - startRow - Math.ceil(visibleItems.length / columns)) * itemHeight;
    
    return h('div', {
      class: className,
      style: {
        width: containerWidth + 'px',
        height: containerHeight + 'px',
        overflowY: 'auto',
        position: 'relative'
      },
      onscroll: handleScroll
    }, [
      h('div', {
        style: {
          height: topSpacerHeight + 'px'
        }
      }),
      
      h('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: gap + 'px'
        }
      }, [
        ...visibleItems.map((item, i) => {
          const index = startIndex + i;
          return h('div', {
            key: index,
            'data-index': index,
            style: {
              width: itemWidth + 'px',
              height: itemHeight + 'px',
              flexShrink: 0
            }
          }, [
            renderItem(item, index)
          ]);
        })
      ]),
      
      h('div', {
        style: {
          height: Math.max(0, bottomSpacerHeight) + 'px'
        }
      })
    ]);
  };
}
