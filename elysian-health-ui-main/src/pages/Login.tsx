import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";
import SplineBackground from "@/components/SplineBackground";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <SplineBackground />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 glass-card p-8 w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-[0_0_30px_hsla(var(--glow-primary))]">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">{t('brand.name')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('brand.tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-gradient w-full mt-2 flex items-center justify-center gap-2" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t('login.signingIn') : t('login.signIn')}
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
  );
};

export default Login;
