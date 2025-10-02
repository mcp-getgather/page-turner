import { DataSource } from '../components/DataSource';
import goodreads from '../config/goodreads.json';
import type { BrandConfig } from '../modules/Config';
import type { ReadingHistory } from '../modules/DataTransformSchema';
import pageTurnerLogo from '../assets/page-turner-logo.svg';

const goodreadsConfig = goodreads as BrandConfig;
const BRANDS: Array<BrandConfig> = [goodreadsConfig];

type OnboardingPageProps = {
  onSuccessConnect: (data: ReadingHistory[]) => void;
  onConnectStart?: () => void;
  onConnectionError?: (errorDetails: string) => void;
  onProgressStep?: (step: number) => void;
  onAuthComplete?: () => void;
  isConnecting?: boolean;
};

export function OnboardingPage({
  onSuccessConnect,
  onConnectStart,
  onConnectionError,
  onProgressStep,
  onAuthComplete,
  isConnecting,
}: OnboardingPageProps) {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <img src={pageTurnerLogo} alt="PageTurner" className="h-12" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Connect Your Goodreads
          </h2>
          <p className="text-gray-600 text-center max-w-sm mx-auto">
            Get $50 store credit and exclusive personalized perks at PageTurner
            when you link your Goodreads Account!
          </p>
        </div>

        {/* Goodreads Connection */}
        <div className="space-y-6">
          {BRANDS.map((brandConfig) => (
            <DataSource
              key={brandConfig.brand_id}
              brandConfig={brandConfig}
              onSuccessConnect={(data) => onSuccessConnect(data)}
              onConnectStart={onConnectStart}
              onConnectionError={onConnectionError}
              onProgressStep={onProgressStep}
              onAuthComplete={onAuthComplete}
              disabled={isConnecting}
            />
          ))}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              By linking your account, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
