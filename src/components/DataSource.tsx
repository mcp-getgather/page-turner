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
  onRetryConnection?: (url?: string) => void;
  signinUrl?: string;
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
  onRetryConnection,
  signinUrl: signinUrlProp,
}: DataSourceProps) {
  const signinUrl = signinUrlProp?.replace('3001', '5174');
  const [isLoading, setIsLoading] = useState(false);
  const [signinData, setSigninData] = useState<
    | {
        url: string;
        signin_id: string;
      }
    | undefined
  >(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const isLoaded = useRef(false);

  const fetchBookList = async () => {
    const response = await apiClient.getBookList();
    await fetch(response.url, {
      method: 'POST',
    });
    setSigninData(response as { url: string; signin_id: string });
  };

  useEffect(() => {
    if (email && !isLoaded.current) {
      fetchBookList();
      isLoaded.current = true;
    }
  }, [email]);

  const submitLoginForm = () => {
    if (!signinData) {
      return;
    }

    fetch(signinData.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email,
        password,
      }),
    })
      .then((response) => response.text())
      .then((data) => {
        const isFailedSignin = data.includes(
          '<title>Goodreads Sign In</title>'
        );

        if (isFailedSignin) {
          onRetryConnection?.(signinData.url);
        }
      })
      .catch((error) => console.error('Error:', error));
    handleConnect(signinData);
  };

  useEffect(() => {
    if (isLoading && signinData && email && password) {
      setIsLoading(false);
      submitLoginForm();
    }
  }, [isLoading, signinData, email, password]);

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

  const handleConnect = async (signinData: {
    url: string;
    signin_id: string;
  }) => {
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

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIsIframeLoaded(false);
  }, [signinUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      setIsIframeLoaded(true);
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        const style = iframeDoc?.createElement('style');
        if (!style) return;
        style.textContent = `
            body { background-color: #eef5ff !important; }
          `;
        iframeDoc?.head.appendChild(style);
      } catch (err) {
        console.warn('Cannot access iframe — likely cross-origin:', err);
      }
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [signinUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      const iframeDoc =
        iframeRef.current?.contentDocument ||
        iframeRef.current?.contentWindow?.document;
      if (!iframeDoc) return;

      const text = iframeDoc.body?.innerText || '';
      if (
        text.includes('Finished! You can close this window now') &&
        signinUrl
      ) {
        handleConnect({
          signin_id: signinUrl.split('/').filter(Boolean).pop() ?? '',
          url: signinUrl,
        });
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  if (signinUrl) {
    return (
      <div className="relative">
        {!isIframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl border border-gray-200 h-[380px]">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={signinUrl}
          className={`w-full h-[380px] rounded-xl ${
            isIframeLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-center justify-between mb-4">
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
            </div>
          </div>
          {isConnected && (
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
          )}
        </div>

        {!isConnected && !signinUrl && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={disabled || isLoading}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disabled || isLoading}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              disabled={disabled || !email || !password || isLoading}
              onClick={() => setIsLoading(true)}
              className={`w-full px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors ${
                disabled || !email || !password || isLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
