import { useReducer } from 'react';
import type { PurchaseHistory } from '../modules/DataTransformSchema';

import { LoadingPage } from './LoadingPage';
import { OnboardingPage } from './OnboardingPage';
import { DashboardPage } from './DashboardPage';
import { ErrorPage } from './ErrorPage';

type ConnectionState =
  | 'INITIAL'
  | 'CONNECTING'
  | 'CONNECTED_EMPTY'
  | 'CONNECTED_WITH_DATA'
  | 'ERROR';

type ConnectionAction =
  | { type: 'START_CONNECTION' }
  | { type: 'PROGRESS_STEP'; step: number }
  | { type: 'AUTH_COMPLETE' }
  | { type: 'CONNECTION_SUCCESS'; data: PurchaseHistory[] }
  | { type: 'CONNECTION_ERROR'; error: string }
  | { type: 'RETRY_CONNECTION' }
  | { type: 'RESET_TO_INITIAL' };

type ConnectionStateData = {
  state: ConnectionState;
  orders: PurchaseHistory[];
  currentLoadingStep: number;
  error: {
    title?: string;
    message?: string;
    details?: string;
  } | null;
};

const connectionReducer = (
  state: ConnectionStateData,
  action: ConnectionAction
): ConnectionStateData => {
  switch (action.type) {
    case 'START_CONNECTION':
      return {
        ...state,
        state: 'CONNECTING',
        currentLoadingStep: 1,
        error: null,
      };

    case 'PROGRESS_STEP':
      return {
        ...state,
        currentLoadingStep: action.step,
      };

    case 'AUTH_COMPLETE':
      return {
        ...state,
        currentLoadingStep: 2,
      };

    case 'CONNECTION_SUCCESS':
      const hasOrders = action.data.length > 0;
      return {
        ...state,
        state: hasOrders ? 'CONNECTED_WITH_DATA' : 'CONNECTED_EMPTY',
        orders: action.data,
        currentLoadingStep: 4,
        error: null,
      };

    case 'CONNECTION_ERROR':
      return {
        ...state,
        state: 'ERROR',
        error: {
          title: 'Connection Failed',
          message:
            'Failed to connect to Goodreads. Please try again or contact support if the problem persists.',
          details: action.error,
        },
      };

    case 'RETRY_CONNECTION':
      return {
        ...state,
        state: 'INITIAL',
        error: null,
        orders: [],
        currentLoadingStep: 0,
      };

    case 'RESET_TO_INITIAL':
      return {
        state: 'INITIAL',
        orders: [],
        currentLoadingStep: 0,
        error: null,
      };

    default:
      return state;
  }
};

export function MainPage() {
  const [connectionState, dispatch] = useReducer(connectionReducer, {
    state: 'INITIAL',
    orders: [],
    currentLoadingStep: 0,
    error: null,
  });

  const handleConnectStart = () => {
    dispatch({ type: 'START_CONNECTION' });
  };

  // Function to progress loading steps manually
  const progressToStep = (step: number) => {
    dispatch({ type: 'PROGRESS_STEP', step });
  };

  // Handle authentication completion
  const handleAuthComplete = () => {
    dispatch({ type: 'AUTH_COMPLETE' });
  };

  const handleSuccessConnect = (data: PurchaseHistory[]) => {
    // Progress to step 4 (Complete) before finishing
    dispatch({ type: 'PROGRESS_STEP', step: 4 });

    // Wait a moment to show completion, then finish
    setTimeout(() => {
      dispatch({ type: 'CONNECTION_SUCCESS', data });
    }, 1500);
  };

  const handleConnectionError = (errorDetails: string) => {
    console.error('Connection failed:', errorDetails);
    dispatch({ type: 'CONNECTION_ERROR', error: errorDetails });
  };

  const handleRetry = () => {
    dispatch({ type: 'RETRY_CONNECTION' });
  };

  const handleGoHome = () => {
    dispatch({ type: 'RESET_TO_INITIAL' });
  };

  // Render based on current state
  switch (connectionState.state) {
    case 'ERROR':
      return (
        <ErrorPage
          error={connectionState.error!}
          onRetry={handleRetry}
          onGoHome={handleGoHome}
        />
      );

    case 'CONNECTING':
      return (
        <LoadingPage
          autoComplete={false}
          initialStep={connectionState.currentLoadingStep}
          totalSteps={4}
        />
      );

    case 'INITIAL':
      return (
        <OnboardingPage
          onSuccessConnect={handleSuccessConnect}
          onConnectStart={handleConnectStart}
          onConnectionError={handleConnectionError}
          onProgressStep={progressToStep}
          onAuthComplete={handleAuthComplete}
          isConnecting={false}
        />
      );

    case 'CONNECTED_EMPTY':
      return (
        <DashboardPage
          orders={connectionState.orders}
          onRetryConnection={handleRetry}
          onConnectAnother={handleGoHome}
          isEmpty={true}
        />
      );

    case 'CONNECTED_WITH_DATA':
      return (
        <DashboardPage
          orders={connectionState.orders}
          onRetryConnection={handleRetry}
          onConnectAnother={handleGoHome}
          isEmpty={false}
        />
      );

    default:
      return null;
  }
}
