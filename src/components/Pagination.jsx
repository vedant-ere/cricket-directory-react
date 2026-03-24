import { memo } from 'react';

/**
 * Purpose: Reusable pagination control with compact ellipsis behavior for large page sets.
 * Why: Showing every page button at large counts hurts usability and layout stability.
 */

/**
 * @param {{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }} props
 * @returns {JSX.Element | null}
 */
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = [];
  const shouldShowAll = totalPages <= 7;

  if (shouldShowAll) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
  } else {
    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 4) {
      start = 2;
      end = 5;
    } else if (currentPage >= totalPages - 3) {
      start = totalPages - 4;
      end = totalPages - 1;
    }

    if (start > 2) {
      pages.push('start-ellipsis');
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages - 1) {
      pages.push('end-ellipsis');
    }

    pages.push(totalPages);
  }

  return (
    <nav className="pagination" aria-label="Players pagination">
      <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        Previous
      </button>

      <div className="pagination-pages">
        {pages.map((page) => (
          typeof page === 'number' ? (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={page === currentPage ? 'active' : ''}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ) : (
            <span key={page} className="pagination-ellipsis" aria-hidden="true">
              ...
            </span>
          )
        ))}
      </div>

      <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </button>
    </nav>
  );
}

export default memo(Pagination);
