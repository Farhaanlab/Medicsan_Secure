import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, Check, X, Mail } from "lucide-react";
import SplineBackground from "@/components/SplineBackground";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);

  // UI State
  const [loading, setLoading] = useState(false);

  // Dynamic Password Validations
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const isPasswordValid = strengthScore === 5;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  // OTP Timer
  useEffect(() => {
    if (isOtpSent && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isOtpSent, timer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !isEmailValid || !isPasswordValid) {
      toast({ title: t('login.error'), description: "Please fill all fields correctly.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await api.sendOtp(email);
      setIsOtpSent(true);
      setTimer(60);
      toast({ title: "Verification Sent", description: "Please check your email for the 6-digit code." });
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message || "Invalid email.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Error", description: "OTP must be 6 digits.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // The auth context signup now needs to accept OTP. Using the direct API if context doesn't support it.
      await api.signup(email, password, name, otp);
      toast({ title: "Account Created", description: "You can now log in." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Signup Failed", description: err.message || "Invalid OTP.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const strengthColor =
    strengthScore <= 2 ? "bg-red-500" :
      strengthScore <= 4 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <SplineBackground />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 glass-card p-8 w-full max-w-sm overflow-hidden"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-[0_0_30px_hsla(var(--glow-primary))]">
            {isOtpSent ? <Mail className="w-7 h-7 text-primary" /> : <Shield className="w-7 h-7 text-primary" />}
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isOtpSent ? "Verify Email" : t('signup.createAccount')}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {!isOtpSent ? (
            <motion.form
              key="signup-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('signup.fullName')}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="glass-input w-full" placeholder="John Doe" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('login.email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input w-full" placeholder="you@example.com" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('login.password')}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input w-full" placeholder="••••••••" />

                {/* Password Strength UI */}
                {password && (
                  <div className="mt-3 space-y-2 bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="flex h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(strengthScore / 5) * 100}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                      <ValidationItem isValid={hasLength} text="8+ chars" />
                      <ValidationItem isValid={hasUpper} text="Uppercase" />
                      <ValidationItem isValid={hasLower} text="Lowercase" />
                      <ValidationItem isValid={hasNumber} text="Number" />
                      <ValidationItem isValid={hasSpecial} text="Special Char" />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-gradient w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={loading || !name || !isEmailValid || !isPasswordValid}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Verifying..." : "Continue"}
              </button>

              <p className="text-center text-sm text-muted-foreground mt-4 pb-2">
                {t('signup.hasAccount')}{" "}
                <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">{t('login.signIn')}</button>
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleVerifyOtp}
              className="space-y-5"
            >
              <div className="text-center space-y-2 mb-6">
                <p className="text-sm text-foreground">We sent a verification code to</p>
                <div className="bg-primary/10 text-primary py-1.5 px-3 rounded-full text-xs font-medium inline-block mx-auto border border-primary/20">
                  {email}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-center">Enter 6-digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="glass-input w-full text-center text-2xl tracking-[0.5em] font-mono py-3"
                  placeholder="------"
                />
              </div>

              <button
                type="submit"
                className="btn-gradient w-full flex items-center justify-center gap-2"
                disabled={loading || otp.length !== 6}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating Account..." : "Verify & Create Account"}
              </button>

              <div className="text-center pt-2">
                {timer > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend code in {timer}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-primary hover:underline font-medium"
                    disabled={loading}
                  >
                    Resend Verification Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setIsOtpSent(false); setOtp(""); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-4"
              >
                ← Back to signup
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Helper component for validation checks
const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 ${isValid ? 'text-emerald-400' : 'text-muted-foreground'}`}>
    {isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-50" />}
    <span>{text}</span>
  </div>
);

export default Signup;
