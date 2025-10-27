import { useEffect, useRef, useState } from 'react';

const FollowUpForm = ({
  signinUrl,
  onFinishSignin,
}: {
  signinUrl: string;
  onFinishSignin: (signinId: string) => void;
}) => {
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIsIframeLoaded(false);
  }, [signinUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !signinUrl) return;

    const handleLoad = () => {
      setIsIframeLoaded(true);

      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const style = iframeDoc.createElement('style');
        style.textContent = 'body { background-color: #ffffff !important; }';
        iframeDoc.head.appendChild(style);
      } catch (err) {
        console.warn('Cannot access iframe (cross-origin):', err);
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [signinUrl]);

  useEffect(() => {
    if (!signinUrl) return;

    const checkCompletion = () => {
      const iframeDoc =
        iframeRef.current?.contentDocument ||
        iframeRef.current?.contentWindow?.document;
      if (!iframeDoc) return;

      const text = iframeDoc.body?.innerText || '';
      if (text.includes('Finished! You can close this window now')) {
        const signinId = signinUrl.split('/').filter(Boolean).pop() ?? '';
        onFinishSignin(signinId);
        clearInterval(interval);
      }
    };

    const interval = setInterval(checkCompletion, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signinUrl]);

  if (signinUrl) {
    return (
      <div className="relative">
        {!isIframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl border border-gray-200 h-[380px]">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={signinUrl}
          className={`w-full h-[380px] rounded-xl transition-opacity duration-300 ${
            isIframeLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  }
};

export default FollowUpForm;
