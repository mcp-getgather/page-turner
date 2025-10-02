export default function LoadingAnimation({ logoUrl }: { logoUrl?: string }) {
  return (
    <div id="loading">
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Brand Logo"
          className="absolute inset-0 w-full h-full object-contain opacity-70"
        />
      )}
      <div className="dazzling-animation">
        <div className="scanning-line"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
      </div>
    </div>
  );
}
