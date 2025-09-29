import { useMemo } from 'react';
import type { ReadingHistory } from '../modules/DataTransformSchema';
import pageTurnerLogo from '../assets/page-turner-logo.svg';

type DashboardPageProps = {
  orders: ReadingHistory[];
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
  const parseOrderDate = (dateString: string) => {
    // Extract date from "Ordered on July 22, 2024" format
    const match = dateString.match(/Ordered on (.+)/);
    return match ? new Date(match[1]) : new Date();
  };

  const sortedOrders = useMemo(() => {
    return orders.sort((a, b) => {
      const dateA =
        typeof a.reading_date === 'string'
          ? parseOrderDate(a.reading_date)
          : new Date(a.reading_date ?? new Date());
      const dateB =
        typeof b.reading_date === 'string'
          ? parseOrderDate(b.reading_date)
          : new Date(b.reading_date ?? new Date());
      return dateB.getTime() - dateA.getTime();
    });
  }, [orders]);

  // Categorize orders into upcoming deliveries and past orders
  const upcomingDeliveries = useMemo(() => {
    const today = new Date();
    return sortedOrders.filter((order) => {
      if (!order.reading_date) return false;
      const orderDate =
        typeof order.reading_date === 'string'
          ? parseOrderDate(order.reading_date)
          : new Date(order.reading_date);
      const daysSinceOrder = Math.floor(
        (today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Consider orders from last 30 days as upcoming/recent
      return daysSinceOrder <= 30;
    });
  }, [sortedOrders]);

  const pastOrders = useMemo(() => {
    const today = new Date();
    return sortedOrders.filter((order) => {
      if (!order.reading_date) return true;
      const orderDate =
        typeof order.reading_date === 'string'
          ? parseOrderDate(order.reading_date)
          : new Date(order.reading_date);
      const daysSinceOrder = Math.floor(
        (today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Consider orders older than 30 days as past orders
      return daysSinceOrder > 30;
    });
  }, [sortedOrders]);

  const getOrderStatus = (order: ReadingHistory) => {
    if (!order.reading_date) return 'Processing';
    const orderDate =
      typeof order.reading_date === 'string'
        ? parseOrderDate(order.reading_date)
        : new Date(order.reading_date);
    const today = new Date();
    const daysSinceOrder = Math.floor(
      (today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceOrder <= 1) return 'Processing';
    if (daysSinceOrder <= 7) return 'Shipped';
    return 'Delivered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOrderCard = (order: ReadingHistory, index: number) => {
    const status = getOrderStatus(order);
    const orderDate =
      typeof order.reading_date === 'string'
        ? parseOrderDate(order.reading_date)
        : new Date(order.reading_date || new Date());
    const deliveryDate = new Date(
      orderDate.getTime() + 7 * 24 * 60 * 60 * 1000
    );

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
              Added: {orderDate.toLocaleDateString()}
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

  return (
    <div className="min-h-screen bg-gray-50">
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
          {!isEmpty && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-blue-700 mb-4">
                Almost there! Confirm sharing your reading list below with
                PageTurner to claim your $50
              </p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition-colors">
                Confirm
              </button>
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

          {/* Upcoming Deliveries */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Currently Reading ({upcomingDeliveries.length})
            </h3>
            <div className="space-y-4">
              {upcomingDeliveries.length > 0 ? (
                upcomingDeliveries.map((order, index) =>
                  renderOrderCard(order, index)
                )
              ) : (
                <p className="text-gray-500 text-center py-8 bg-white rounded-lg border border-gray-200">
                  No books currently being read
                </p>
              )}
            </div>
          </div>

          {/* Past Orders */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reading History ({pastOrders.length})
            </h3>
            <div className="space-y-4">
              {pastOrders.length > 0 ? (
                pastOrders.map((order, index) => renderOrderCard(order, index))
              ) : (
                <p className="text-gray-500 text-center py-8 bg-white rounded-lg border border-gray-200">
                  No reading history to display
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
