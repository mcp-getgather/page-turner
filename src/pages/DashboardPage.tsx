import { useMemo } from 'react';
import type { PurchaseHistory } from '../modules/DataTransformSchema';
import circuitShackLogo from '../assets/circuit-shack-logo.svg';

type DashboardPageProps = {
  orders: PurchaseHistory[];
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
        typeof a.order_date === 'string'
          ? parseOrderDate(a.order_date)
          : new Date(a.order_date ?? new Date());
      const dateB =
        typeof b.order_date === 'string'
          ? parseOrderDate(b.order_date)
          : new Date(b.order_date ?? new Date());
      return dateB.getTime() - dateA.getTime();
    });
  }, [orders]);

  // Categorize orders into upcoming deliveries and past orders
  const upcomingDeliveries = useMemo(() => {
    const today = new Date();
    return sortedOrders.filter((order) => {
      if (!order.order_date) return false;
      const orderDate =
        typeof order.order_date === 'string'
          ? parseOrderDate(order.order_date)
          : new Date(order.order_date);
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
      if (!order.order_date) return true;
      const orderDate =
        typeof order.order_date === 'string'
          ? parseOrderDate(order.order_date)
          : new Date(order.order_date);
      const daysSinceOrder = Math.floor(
        (today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Consider orders older than 30 days as past orders
      return daysSinceOrder > 30;
    });
  }, [sortedOrders]);

  const getOrderStatus = (order: PurchaseHistory) => {
    if (!order.order_date) return 'Processing';
    const orderDate =
      typeof order.order_date === 'string'
        ? parseOrderDate(order.order_date)
        : new Date(order.order_date);
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

  const renderOrderCard = (order: PurchaseHistory, index: number) => {
    const status = getOrderStatus(order);
    const orderDate =
      typeof order.order_date === 'string'
        ? parseOrderDate(order.order_date)
        : new Date(order.order_date || new Date());
    const deliveryDate = new Date(
      orderDate.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    // Handle both string and array types for product_names and image_urls
    const productName = order.product_name;
    const imageUrl = order.product_image;

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
            {productName || 'Unknown Product'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">From Amazon</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Ordered: {orderDate.toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
              </svg>
              Delivery: {deliveryDate.toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z"
                  clipRule="evenodd"
                />
              </svg>
              Electronics
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}
          >
            {status}
          </span>
          {order.product_url && (
            <a
              href={`https://amazon.com${order.product_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View Product
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
            <div className="w-8 h-8 mr-3">
              <img
                src={circuitShackLogo}
                alt="Circuit Shack"
                className="w-full h-full"
              />
            </div>
            <span
              className="text-xl font-bold text-blue-600"
              style={{ textDecoration: 'underline' }}
            >
              CIRCUIT SHACK
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Thanks for linking your Amazon Account!
          </h1>

          {/* Confirmation Section */}
          {!isEmpty && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-blue-700 mb-4">
                Almost there! Confirm sharing the electronics purchases below
                with Circuit Shack to claim your $50
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
                No Electronics Orders Found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any electronics purchases in your Amazon
                account. This might be because you haven't made any electronics
                purchases recently, or they might be in a different account.
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
            Your Electronics Orders
          </h2>

          {/* Upcoming Deliveries */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upcoming Deliveries ({upcomingDeliveries.length})
            </h3>
            <div className="space-y-4">
              {upcomingDeliveries.length > 0 ? (
                upcomingDeliveries.map((order, index) =>
                  renderOrderCard(order, index)
                )
              ) : (
                <p className="text-gray-500 text-center py-8 bg-white rounded-lg border border-gray-200">
                  No upcoming deliveries
                </p>
              )}
            </div>
          </div>

          {/* Past Orders */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Past Orders ({pastOrders.length})
            </h3>
            <div className="space-y-4">
              {pastOrders.length > 0 ? (
                pastOrders.map((order, index) => renderOrderCard(order, index))
              ) : (
                <p className="text-gray-500 text-center py-8 bg-white rounded-lg border border-gray-200">
                  No past orders to display
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
