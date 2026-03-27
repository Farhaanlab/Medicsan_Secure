import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, Eye, EyeOff, Lock, ChevronRight } from "lucide-react";
import SplineBackground from "@/components/SplineBackground";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

/* ─── Typewriter phrases ─── */
const phrases = [
  "MediScan Secure",
  "Your Health, Protected.",
  "Smart Medicine Tracking.",
  "Scan. Search. Stay Safe.",
  "AI-Powered Care.",
  "MediScan Secure",
];

/* ─── Typewriter Hook ─── */
function useTypewriter(phrases: string[], typingSpeed = 80, deletingSpeed = 40, pauseTime = 1800) {
  const [displayText, setDisplayText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const tick = useCallback(() => {
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      // Typing
      setDisplayText(currentPhrase.substring(0, displayText.length + 1));
      if (displayText.length + 1 === currentPhrase.length) {
        // Finished typing — pause, then start deleting
        setTimeout(() => setIsDeleting(true), pauseTime);
        return;
      }
    } else {
      // Deleting
      setDisplayText(currentPhrase.substring(0, displayText.length - 1));
      if (displayText.length - 1 === 0) {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        return;
      }
    }
  }, [displayText, phraseIndex, isDeleting, phrases, pauseTime]);

  useEffect(() => {
    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [tick, isDeleting, typingSpeed, deletingSpeed]);

  return displayText;
}

/* ─── Login Page ─── */
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const typedText = useTypewriter(phrases);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: t('login.error'), description: t('login.fillAll'), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: t('login.failed'), description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex">
      <SplineBackground />

      {/* ─── Left Side: Branding + Typewriter ─── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex flex-col justify-center items-start w-1/2 relative z-10 px-16 xl:px-24"
      >
        {/* Floating glow accent */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-primary/8 blur-[120px] pointer-events-none" />

        <div className="relative">
          {/* Shield icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8 shadow-[0_0_40px_hsla(var(--glow-primary))]"
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>

          {/* Typewriter text */}
          <div className="min-h-[5rem]">
            <h1 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight">
              {typedText}
              <span className="inline-block w-[3px] h-[1.1em] bg-white ml-1 align-text-bottom animate-pulse" />
            </h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-white text-lg mt-6 max-w-md leading-relaxed"
          >
            Your all-in-one platform for medicine tracking, prescription scanning, and AI-powered health insights.
          </motion.p>
        </div>


      </motion.div>

      {/* ─── Right Side: Login Form ─── */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 relative z-10 p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="glass-card p-8 sm:p-10 w-full max-w-sm"
        >
          {/* Mobile-only branding */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-[0_0_30px_hsla(var(--glow-primary))]">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('brand.name')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('brand.tagline')}</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('login.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('login.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-gradient w-full mt-2 flex items-center justify-center gap-2 group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              {loading ? t('login.signingIn') : t('login.signIn')}
              {!loading && <ChevronRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('login.noAccount')}{" "}
            <button onClick={() => navigate("/signup")} className="text-primary hover:underline font-medium">
              {t('login.signUp')}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
