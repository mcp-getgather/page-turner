import { useMemo, useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';
import type { Book } from '../modules/DataTransformSchema';
import pageTurnerLogo from '../assets/page-turner-logo.svg';

type DashboardPageProps = {
  orders: Book[];
  onRetryConnection?: () => void;
  onConnectAnother?: () => void;
  isEmpty?: boolean;
};

export function DashboardPage({
  orders,
  onRetryConnection,
  onConnectAnother,
  isEmpty = false,
}: DashboardPageProps) {
  const [isConfirmed, setConfirmed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const parseDate = (dateString: string) => {
    // Extract date from "Ordered on July 22, 2024" format
    const match = dateString.match(/Ordered on (.+)/);
    return match ? new Date(match[1]) : new Date();
  };

  const parseShelfName = (shelf: string) => {
    const shelfName = shelf
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    switch (shelfName) {
      case 'To Read':
        return 'Wish to Read';
      case 'Read':
        return 'Reading History';
      default:
        return shelfName;
    }
  };

  const shelvingBooks: Record<string, Book[]> = useMemo(() => {
    return orders.reduce(
      (acc, book) => {
        acc[parseShelfName(book.shelf)] = [
          ...(acc[parseShelfName(book.shelf)] || []),
          book,
        ];
        return acc;
      },
      {} as Record<string, Book[]>
    );
  }, [orders]);

  const onConfirmClicked = () => {
    setConfirmed(true);
    setShowConfetti(true);
  };

  useEffect(() => {
    let confettiTimer: NodeJS.Timeout;
    if (showConfetti) {
      confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 10 * 1000); // 10 seconds
    }
    return () => {
      if (confettiTimer) {
        clearTimeout(confettiTimer);
      }
    };
  }, [showConfetti]);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderBookCard = (order: Book, index: number) => {
    const addedDate =
      typeof order.added_date === 'string'
        ? parseDate(order.added_date)
        : new Date(order.added_date || new Date());

    // Handle both string and array types for product_names and image_urls
    const productName = order.title;
    const imageUrl = order.cover;

    return (
      <div
        key={`order_${index}`}
        className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-4"
      >
        <div className="flex-shrink-0 w-16 h-16 bg-white rounded-md overflow-hidden">
          <img
            src={imageUrl}
            alt={productName || 'Product'}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-2">
            {productName || 'Unknown Book'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">From Goodreads</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Added: {addedDate.toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
              </svg>
              {order.rating}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {order.url && (
            <a
              href={`https://goodreads.com${order.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View Book
            </a>
          )}
        </div>
      </div>
    );
  };

  const renderShelves = (shelves: Record<string, Book[]>) => {
    return Object.entries(shelves).map(([shelf, books]) => {
      return (
        <div className="mb-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {shelf} ({books.length} books)
          </h3>
          <div className="space-y-4">
            {books.length > 0 ? (
              books.map((book, index) => renderBookCard(book, index))
            ) : (
              <p className="text-gray-500 text-center py-8 bg-white rounded-lg border border-gray-200">
                No books in this shelf
              </p>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showConfetti && (
        <ReactConfetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={true}
          numberOfPieces={500}
          gravity={0.1}
        />
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <img src={pageTurnerLogo} alt="PageTurner" className="h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Thanks for connecting your reading accounts!
          </h1>

          {/* Confirmation Section */}
          {!isEmpty && !isConfirmed && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-blue-700 mb-4">
                Almost there! Confirm sharing your reading list below with
                PageTurner to claim your $50
              </p>
              <button
                onClick={onConfirmClicked}
                className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          )}

          {/* Success Section */}
          {!isEmpty && isConfirmed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <p className="text-green-700 font-medium">
                Please check your email to redeem the $50 store credit.
              </p>
            </div>
          )}

          {/* Empty State Section */}
          {isEmpty && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 mb-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Books Found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any books in your connected accounts. This
                might be because you haven't added any books recently, or they
                might be in a different account.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onRetryConnection}
                  className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onConnectAnother}
                  className="bg-gray-600 text-white px-6 py-2 rounded font-medium hover:bg-gray-700 transition-colors"
                >
                  Connect Different Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!isEmpty && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-8">
            Your Reading List
          </h2>

          {renderShelves(shelvingBooks)}
        </div>
      )}
    </div>
  );
}
