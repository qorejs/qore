import { type ComponentChildren, type JSX, signal } from '@qorejs/qore'

export interface PaginationProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Total number of items */
  total: number
  
  /** Items per page */
  pageSize?: number
  
  /** Current page (controlled) */
  currentPage?: number
  
  /** Default current page (uncontrolled) */
  defaultPage?: number
  
  /** onPageChange handler */
  onPageChange?: (page: number) => void
  
  /** Show first/last buttons */
  showFirstLast?: boolean
  
  /** Show previous/next buttons */
  showPrevNext?: boolean
  
  /** Show page size selector */
  showSizeSelector?: boolean
  
  /** Available page sizes */
  pageSizes?: number[]
  
  /** Show total count */
  showTotal?: boolean
  
  /** Total format function */
  totalFormat?: (total: number, range: [number, number]) => string
  
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Children (for custom rendering) */
  children?: ComponentChildren
}

/**
 * Pagination Component
 * 
 * Displays pagination controls for navigating through pages of data.
 * Supports custom page sizes, first/last buttons, and total count display.
 * 
 * @example
 * ```tsx
 * // Basic Pagination
 * <Pagination total={100} pageSize={10} />
 * 
 * // Controlled
 * const [page, setPage] = signal(1)
 * <Pagination 
 *   total={100} 
 *   pageSize={10} 
 *   currentPage={page()} 
 *   onPageChange={setPage} 
 * />
 * 
 * // With all features
 * <Pagination 
 *   total={1000} 
 *   pageSize={20} 
 *   showFirstLast 
 *   showSizeSelector 
 *   showTotal 
 * />
 * ```
 */
export function Pagination(props: PaginationProps) {
  const {
    total,
    pageSize = 10,
    currentPage: controlledCurrentPage,
    defaultPage = 1,
    onPageChange,
    showFirstLast = false,
    showPrevNext = true,
    showSizeSelector = false,
    pageSizes = [10, 20, 50, 100],
    showTotal = false,
    totalFormat,
    size = 'md',
    children,
    class: className = '',
    id,
    ...rest
  } = props
  
  // Calculate total pages
  const totalPages = Math.ceil(total / pageSize)
  
  // Internal state for uncontrolled mode
  const internalCurrentPage = signal(defaultPage)
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledCurrentPage !== undefined
  
  const currentPage = isControlled ? controlledCurrentPage : internalCurrentPage()
  
  const setCurrentPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    if (!isControlled) {
      internalCurrentPage(validPage)
    }
    onPageChange?.(validPage)
  }
  
  // Calculate start and end indices
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, total)
  
  // Generate page numbers to display
  const generatePageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    const maxVisible = 5 // Maximum visible page buttons
    
    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page
      pages.push(1)
      
      // Show ellipsis if needed
      if (currentPage > 3) {
        pages.push('...')
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      
      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }
  
  // Build class names
  const paginationClasses = [
    'qore-pagination',
    `qore-pagination-${size}`,
    className,
  ].filter(Boolean).join(' ')
  
  const handlePageSizeChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    const newPageSize = parseInt(target.value, 10)
    const newPage = Math.ceil((currentPage - 1) * pageSize / newPageSize) + 1
    setCurrentPage(newPage)
    // Could emit a separate onPageSizeChange event if needed
  }
  
  return (
    <div 
      id={id}
      class={paginationClasses}
      role="navigation"
      aria-label="Pagination"
      {...rest}
    >
      {/* Total count */}
      {showTotal && (
        <div class="qore-pagination-total">
          {totalFormat 
            ? totalFormat(total, [startIndex, endIndex])
            : `Showing ${startIndex}-${endIndex} of ${total}`}
        </div>
      )}
      
      {/* Pagination controls */}
      <div class="qore-pagination-controls">
        {/* First page button */}
        {showFirstLast && (
          <button
            class="qore-pagination-button qore-pagination-first"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            aria-label="First page"
            tabIndex={currentPage === 1 ? -1 : 0}
          >
            «
          </button>
        )}
        
        {/* Previous page button */}
        {showPrevNext && (
          <button
            class="qore-pagination-button qore-pagination-prev"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            tabIndex={currentPage === 1 ? -1 : 0}
          >
            ‹
          </button>
        )}
        
        {/* Page numbers */}
        <div class="qore-pagination-pages">
          {generatePageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} class="qore-pagination-ellipsis">
                  ...
                </span>
              )
            }
            
            const pageNum = page as number
            const isActive = currentPage === pageNum
            
            return (
              <button
                key={pageNum}
                class={`qore-pagination-button qore-pagination-page ${isActive ? 'qore-pagination-page-active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Page ${pageNum}`}
                tabIndex={isActive ? -1 : 0}
              >
                {pageNum}
              </button>
            )
          })}
        </div>
        
        {/* Next page button */}
        {showPrevNext && (
          <button
            class="qore-pagination-button qore-pagination-next"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            tabIndex={currentPage === totalPages ? -1 : 0}
          >
            ›
          </button>
        )}
        
        {/* Last page button */}
        {showFirstLast && (
          <button
            class="qore-pagination-button qore-pagination-last"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
            tabIndex={currentPage === totalPages ? -1 : 0}
          >
            »
          </button>
        )}
      </div>
      
      {/* Page size selector */}
      {showSizeSelector && (
        <div class="qore-pagination-size">
          <label class="qore-pagination-size-label">
            <span class="qore-pagination-size-text">Show</span>
            <select
              class="qore-pagination-size-select"
              value={pageSize}
              onChange={handlePageSizeChange}
              aria-label="Items per page"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      
      {children}
    </div>
  )
}

export type { PaginationProps }
