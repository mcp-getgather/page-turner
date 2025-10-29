import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrandConfig } from '../modules/Config';
import { transformData, type Book } from '../modules/DataTransformSchema';
import { apiClient } from '../api';
import * as Sentry from '@sentry/react';
import FollowUpForm from './FollowUpForm';
import Modal from './Modal';

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

type SigninData = {
  url: string;
  signin_id: string;
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signinData, setSigninData] = useState<SigninData>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const hasRequestedBookList = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!email || !email.includes('@') || hasRequestedBookList.current) return;

    const fetchBookList = async () => {
      const response = await apiClient.getBookList();
      // When user start typing email, call the dpage URL to trigger the initial process (e.g., launch the browser and open the Goodreads sign-in page)
      // This results in a faster response since we don’t need to start the entire process from the beginning when user submit the form.
      await fetch(response.url, { method: 'POST' });
      setSigninData(response as SigninData);
    };

    fetchBookList();
    hasRequestedBookList.current = true;
  }, [email]);

  const startAuthentication = useCallback(
    async (signinId?: string) => {
      if (!signinId) {
        throw new Error('No Signin ID received');
      }

      onConnectStart?.();

      try {
        let pollResult;
        while (true) {
          try {
            pollResult = await apiClient.pollSignin(signinId);
            console.log('Poll result:', pollResult);
            if (pollResult?.status === 'SUCCESS') break;
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

        // Transform and send success data
        const transformedData = transformData(
          pollResult,
          brandConfig.dataTransform
        );
        console.log('Transformed data:', transformedData);

        onAuthComplete?.();
        onProgressStep?.(3);
        setIsSubmitting(false);
        onSuccessConnect(transformedData as unknown as Book[]);
        apiClient.finalizeSignin(signinId);
      } catch (error) {
        console.error('Connection error:', error);
        Sentry.captureException(error, {
          tags: {
            component: 'DataSource',
            brand_id: brandConfig.brand_id,
            brand_name: brandConfig.brand_name,
          },
          extra: { brandConfig },
        });
        setIsSubmitting(false);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown connection error';
        onConnectionError?.(errorMessage);
      }
    },
    [
      brandConfig,
      onAuthComplete,
      onConnectStart,
      onConnectionError,
      onProgressStep,
      onSuccessConnect,
    ]
  );

  useEffect(() => {
    if (!isSubmitting || !signinData || !email || !password) return;

    const submitLogin = async () => {
      const response = await fetch(signinData.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password }),
      });

      const data = await response.text();
      const isFailedSignin = data.includes('<title>Goodreads Sign In</title>');

      if (isFailedSignin) {
        onRetryConnection?.(signinData.url);
      }
    };

    setIsSubmitting(false);
    submitLogin().catch(console.error);
    startAuthentication(signinData.signin_id);
  }, [
    isSubmitting,
    signinData,
    email,
    password,
    onRetryConnection,
    startAuthentication,
  ]);

  useEffect(() => {
    if (signinUrl) {
      setIsModalOpen(true);
    }
  }, [signinUrl]);

  const isFormDisabled = disabled || isSubmitting;
  const canSubmit = email && password && !isFormDisabled;

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
              onClick={() => setIsModalOpen(true)}
              className={`px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors ${
                disabled || isConnected ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Connect
            </button>
          )}
        </div>
      </div>
      <Modal
        title={
          <div className="flex items-center gap-3">
            <img
              src={brandConfig.logo_url}
              alt={`${brandConfig.brand_name} logo`}
              className="w-8 h-8 object-contain"
            />
            <h3 className="font-medium">{brandConfig.brand_name}</h3>
          </div>
        }
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
      >
        {!!signinUrl && (
          <FollowUpForm
            signinUrl={signinUrl}
            onFinishSignin={startAuthentication}
          />
        )}

        {!signinUrl && (
          <div className="bg-white rounded-xl transition-colors p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isFormDisabled}
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSubmit) {
                      setIsSubmitting(true);
                    }
                  }}
                  disabled={isFormDisabled}
                  placeholder="Password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <button
                disabled={!canSubmit}
                onClick={() => setIsSubmitting(true)}
                className={`w-full px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors ${
                  !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
