import { Capacitor } from '@capacitor/core';

const SplineBackground = () => {
  // Spline 3D iframe doesn't work in native Android/iOS WebViews,
  // so we use a CSS gradient fallback on native platforms.
  const isNative = Capacitor.isNativePlatform();

  return (
    <div className="fixed inset-0 z-0">
      {isNative ? (
        <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(260,30%,12%)] to-[hsl(var(--background))]">
          {/* Animated gradient circles for visual interest */}
          <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-60 h-60 rounded-full bg-accent/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            src="https://my.spline.design/particleshand-vdVv1d29pJyHoQBxURCJNvoG/"
            frameBorder="0"
            className="absolute w-[120vw] h-[120vh] -left-[10vw] -top-[10vh]"
            style={{ pointerEvents: 'auto', maxWidth: 'none', border: 'none' }}
            title="3D Background"
          />
        </div>
      )}
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
};

export default SplineBackground;
