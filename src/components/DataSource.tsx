import { useState } from 'react';
import type { BrandConfig } from '../modules/Config';
import {
  transformData,
  type ReadingHistory,
} from '../modules/DataTransformSchema';
import { apiClient } from '../api';
import * as Sentry from '@sentry/react';

interface DataSourceProps {
  onSuccessConnect: (data: ReadingHistory[]) => void;
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

  const handleSuccessConnect = (data: unknown) => {
    const transformedData = transformData(data, brandConfig.dataTransform);
    console.log('Transformed purchase history:', transformedData);
    setIsLoading(false);
    onSuccessConnect(transformedData as unknown as ReadingHistory[]);
  };

  const handleAuthentication = async (structuredContent: {
    url?: string;
    link_id?: string;
  }) => {
    window.open(
      structuredContent.url,
      '_blank',
      'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!structuredContent.link_id) {
      throw new Error('No session ID received');
    }

    while (true) {
      try {
        const pollAuthResult = await apiClient.pollAuth(
          structuredContent.link_id
        );
        console.log('Result poll auth:', pollAuthResult);
        if (pollAuthResult?.status === 'FINISHED') {
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
    await loadBookData();
  };

  // NOTE: temporary solution until we fix in the mcp, related to https://github.com/mcp-getgather/mcp-getgather/pull/411/files#diff-6c7ad2429ff4f85d533ff32dc0d8328605a8dc6d12d47b8eb9d7351b3626362cR421
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const extractBookListFromResponse = (
    structuredContent: Record<string, any>
  ) => {
    const bookList =
      structuredContent[brandConfig.dataTransform.dataPath]?.[0]?.terminated !=
      null
        ? structuredContent[brandConfig.dataTransform.dataPath]?.[0]?.result
        : structuredContent[brandConfig.dataTransform.dataPath];
    return {
      ...structuredContent,
      [brandConfig.dataTransform.dataPath]: bookList,
    };
  };

  const loadBookData = async () => {
    // Start data loading - step 3
    onProgressStep?.(3);

    const structuredContent = await apiClient.getBookList();
    console.log('Structured content (after auth):', structuredContent);

    setIsLoading(false);
    handleSuccessConnect(extractBookListFromResponse(structuredContent));
  };

  const handleConnect = async () => {
    setIsLoading(true);
    onConnectStart?.();

    try {
      const structuredContent = await apiClient.getBookList();
      console.log('Structured content:', structuredContent);

      if (structuredContent.url) {
        await handleAuthentication(structuredContent);
      } else {
        setIsLoading(false);
        handleSuccessConnect(extractBookListFromResponse(structuredContent));
      }
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
              onClick={handleConnect}
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
