import { useEffect, useRef, useState } from 'react';
import type { BrandConfig } from '../modules/Config';
import { transformData, type Book } from '../modules/DataTransformSchema';
import { apiClient } from '../api';
import * as Sentry from '@sentry/react';

interface DataSourceProps {
  onSuccessConnect: (data: Book[]) => void;
  onConnectStart?: () => void;
  onConnectionError?: (errorDetails: string) => void;
  onProgressStep?: (step: number) => void;
  disabled?: boolean;
  brandConfig: BrandConfig;
  isConnected?: boolean;
  onAuthComplete?: () => void;
}

export function DataSource({
  onSuccessConnect,
  onConnectStart,
  onConnectionError,
  onProgressStep,
  disabled,
  brandConfig,
  isConnected,
  onAuthComplete,
}: DataSourceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isUrlOpened = useRef(false);
  const [signinData, setSigninData] = useState<
    | {
        url: string;
        signin_id: string;
      }
    | undefined
  >(undefined);

  const fetchBookList = async () => {
    const response = await apiClient.getBookList();
    await fetch(response.url, {
      method: 'POST',
    });
    setSigninData(response as { url: string; signin_id: string });
  };

  useEffect(() => {
    fetchBookList();
  }, []);

  useEffect(() => {
    if (!isUrlOpened.current && isLoading && signinData) {
      isUrlOpened.current = true;
      handleConnect();
    }
  }, [isLoading, signinData]);

  const handleSuccessConnect = (data: unknown) => {
    const transformedData = transformData(data, brandConfig.dataTransform);
    console.log('Transformed purchase history:', transformedData);
    setIsLoading(false);
    onSuccessConnect(transformedData as unknown as Book[]);
  };

  const handleAuthentication = async (structuredContent: {
    url?: string;
    signin_id?: string;
  }) => {
    window.open(
      structuredContent.url,
      '_blank',
      'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!structuredContent.signin_id) {
      throw new Error('No Signin ID received');
    }

    let pollAuthResult;
    while (true) {
      try {
        pollAuthResult = await apiClient.pollSignin(
          structuredContent.signin_id
        );
        console.log('Result poll auth:', pollAuthResult);
        if (pollAuthResult?.status === 'SUCCESS') {
          break;
        }
      } catch (error) {
        console.error('Poll auth error:', error);
        Sentry.captureException(error, {
          tags: {
            component: 'DataSource',
            brand_id: brandConfig.brand_id,
            brand_name: brandConfig.brand_name,
          },
        });
      }
    }

    onAuthComplete?.();
    onProgressStep?.(3);
    setIsLoading(false);
    handleSuccessConnect(pollAuthResult);
  };

  const handleConnect = async () => {
    if (!signinData) {
      return;
    }
    onConnectStart?.();
    try {
      handleAuthentication(signinData);
    } catch (error) {
      console.error('Connection error:', error);
      Sentry.captureException(error, {
        tags: {
          component: 'DataSource',
          brand_id: brandConfig.brand_id,
          brand_name: brandConfig.brand_name,
        },
        extra: {
          brandConfig,
        },
      });
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown connection error';
      onConnectionError?.(errorMessage);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8">
              <img
                src={brandConfig.logo_url}
                alt={`${brandConfig.brand_name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-medium">{brandConfig.brand_name}</h3>
              {brandConfig.is_mandatory && (
                <span className="text-xs text-gray-500">Required</span>
              )}
            </div>
          </div>
          {isConnected ? (
            <div className="px-4 py-2 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-4 text-green-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>

              <span className="text-green-700 text-sm font-medium">
                Connected
              </span>
            </div>
          ) : (
            <button
              disabled={disabled}
              onClick={() => setIsLoading(true)}
              className={`px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors ${
                disabled || isConnected || isLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
