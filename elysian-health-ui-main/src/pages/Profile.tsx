import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Lock, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { api, API_HOST } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, LANGUAGE_LIST, type Language } from "@/lib/i18n";

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const { t, lang, setLang } = useTranslation();

  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Ringtone state
  const [uploadingTone, setUploadingTone] = useState(false);
  const ringtoneUrl = user?.ringtoneUrl;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ fullName: name, email });
      await refreshUser();
      toast({ title: t('prof.saved'), description: t('prof.profileUpdated') });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: t('common.error'), description: t('prof.fillBoth'), variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast({ title: t('prof.success'), description: t('prof.passwordChanged') });
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || "Failed to change password", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRingtoneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ title: t('common.error'), description: "Please select an audio file", variant: "destructive" });
      return;
    }

    setUploadingTone(true);
    try {
      await api.uploadRingtone(file);
      await refreshUser();
      toast({ title: t('prof.success') || "Success", description: "Custom ringtone updated" });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || "Failed to upload ringtone", variant: "destructive" });
    } finally {
      setUploadingTone(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppLayout>
      <PageHeader title={t('prof.title')} backTo="/dashboard" />

      <div className="space-y-4 max-w-lg">
        {/* Profile Info */}
        <GlassCard delay={0.05}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('prof.profileInfo')}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('prof.fullName')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="glass-input w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('prof.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input w-full" />
            </div>
            <button
              onClick={handleSaveProfile}
              className="btn-gradient w-full mt-2 flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? t('prof.saving') : t('prof.saveChanges')}
            </button>
          </div>
        </GlassCard>

        {/* Language */}
        <GlassCard delay={0.15}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('prof.langPref')}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_LIST.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200",
                  lang === l.code
                    ? "bg-gradient-to-r from-primary to-accent text-foreground shadow-[0_0_12px_hsla(var(--glow-primary))]"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Custom Ringtone */}
        <GlassCard delay={0.20}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Alert Ringtone</h3>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Select a custom audio file (.mp3, .wav) to play during medicine reminders.</p>

            <div className="flex items-center gap-3">
              <label className="btn-gradient px-4 py-2 cursor-pointer flex items-center justify-center gap-2 flex-1">
                {uploadingTone && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploadingTone ? "Uploading..." : "Upload New Tone"}
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleRingtoneUpload}
                  disabled={uploadingTone}
                />
              </label>
            </div>

            {ringtoneUrl && (
              <div className="mt-3 p-3 rounded-xl bg-secondary/30">
                <p className="text-xs font-medium mb-2">Current Ringtone:</p>
                <audio controls className="w-full h-8" src={`${API_HOST}${ringtoneUrl}`}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Security */}
        <GlassCard delay={0.25}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('prof.security')}</h3>
          <div className="space-y-2">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{t('prof.changePassword')}</span>
            </button>

            {showPasswordForm && (
              <div className="space-y-2 p-3 rounded-xl bg-secondary/30">
                <input
                  type="password"
                  placeholder={t('prof.currentPassword')}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="glass-input w-full text-sm"
                />
                <input
                  type="password"
                  placeholder={t('prof.newPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input w-full text-sm"
                />
                <button
                  onClick={handleChangePassword}
                  className="btn-gradient w-full flex items-center justify-center gap-2"
                  disabled={changingPassword}
                >
                  {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {changingPassword ? t('prof.changing') : t('prof.updatePassword')}
                </button>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{t('prof.logout')}</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default Profile;
