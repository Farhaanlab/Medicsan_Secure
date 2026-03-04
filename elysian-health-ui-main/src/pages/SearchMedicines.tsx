import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Pill, Loader2, Camera, X, Upload, ImagePlus, ScanLine, RotateCcw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

interface Medicine {
  id: string;
  name: string;
  manufacturer?: string;
  composition?: string;
  price?: string;
  dosageForm?: string;
  packSizeLabel?: string;
  description?: string;
}

const SearchMedicines = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scan state
  const [showScan, setShowScan] = useState(false);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResults, setScanResults] = useState<Medicine[]>([]);
  const [scanText, setScanText] = useState("");
  const [scanError, setScanError] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Custom Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Environmental camera failed, falling back to default camera");
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setIsCameraOpen(true);
      setCapturedImage(null);
      setScanError("");
    } catch (err) {
      console.error("Camera error:", err);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions and ensure you are on HTTPS.",
        variant: "destructive"
      });
    }
  };

  // Effect to attach stream to video element once it's rendered
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current && !capturedImage) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch(err => console.error("Video play failed:", err));
      };
    }
  }, [isCameraOpen, capturedImage]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(dataUrl);
      }
    }
  };

  const approvePhoto = () => {
    if (capturedImage) {
      setScanImage(capturedImage);
      // Convert dataURL to File for existing processScan logic
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "prescription_camera.jpg", { type: "image/jpeg" });
          setScanFile(file);
        });
      stopCamera();
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await api.searchMedicines(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleScanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScanFile(file);
      setScanImage(URL.createObjectURL(file));
      setScanResults([]);
      setScanText("");
      setScanError("");
    }
  };

  const processScan = async () => {
    if (!scanFile) return;
    setScanLoading(true);
    setScanError("");
    try {
      const formData = new FormData();
      formData.append("image", scanFile);
      const data = await api.scanPrescription(formData);
      setScanResults(data.matches || []);
      setScanText(data.text || "");
    } catch {
      setScanError(t('scan.failed'));
    } finally {
      setScanLoading(false);
    }
  };

  const clearScan = () => {
    setScanImage(null);
    setScanFile(null);
    setScanResults([]);
    setScanText("");
    setScanError("");
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  return (
    <AppLayout>
      <PageHeader title={t('search.title')} backTo="/dashboard" />

      {/* Search Bar + Scan Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="glass-input w-full pl-11"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          <button
            onClick={() => navigate("/scan")}
            className="flex items-center justify-center w-12 h-12 rounded-xl transition-all bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            title={t('scan.title')}
          >
            <ScanLine className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Scan Panel */}
      <AnimatePresence>
        {showScan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <GlassCard delay={0} className="overflow-hidden">
              {scanImage ? (
                <div>
                  <div className="relative mb-3">
                    <img src={scanImage} alt="Scan preview" className="w-full max-h-48 object-contain rounded-lg" />
                    <button
                      onClick={clearScan}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/80 text-foreground flex items-center justify-center hover:bg-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {scanResults.length === 0 && !scanLoading && !scanError && (
                    <button
                      onClick={processScan}
                      className="btn-gradient w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {t('scan.extract')}
                    </button>
                  )}

                  {scanLoading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">{t('scan.scanning')}</span>
                    </div>
                  )}

                  {scanError && (
                    <p className="text-sm text-destructive text-center py-2">{scanError}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-muted-foreground">{t('scan.takePhoto')}</p>
                  <p className="text-[10px] text-muted-foreground/60">{t('scan.handwritten')}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={startCamera}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-foreground text-xs font-semibold"
                    >
                      <Camera className="w-4 h-4" />
                      {t('scan.camera')}
                    </button>
                    <button
                      onClick={() => galleryRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
                    >
                      <ImagePlus className="w-4 h-4" />
                      {t('scan.gallery')}
                    </button>
                  </div>
                </div>
              )}
              <input type="file" ref={galleryRef} className="hidden" accept="image/*" onChange={handleScanFile} />
              <canvas ref={canvasRef} className="hidden" />
            </GlassCard>

            {/* CUSTOM CAMERA INTERFACE OVERLAY - PORTALED TO BODY */}
            {isCameraOpen && createPortal(
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9999] bg-black flex flex-col"
                  style={{ height: '100vh', width: '100vw' }}
                >
                  {/* Camera Top Bar */}
                  <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                    <button
                      onClick={stopCamera}
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <h3 className="text-white font-black text-xs tracking-[0.3em] uppercase">Capturing Prescription</h3>
                    <div className="w-12" />
                  </div>

                  {/* Viewfinder / Captured Image */}
                  <div className="flex-1 relative overflow-hidden bg-zinc-950 flex items-center justify-center">
                    {capturedImage ? (
                      <img
                        src={capturedImage}
                        className="w-full h-full object-contain"
                        alt="Captured"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                    {!capturedImage && (
                      <div className="absolute inset-x-40 inset-y-8 border-2 border-dashed border-white/30 rounded-[2.5rem] pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-full h-[1px] bg-white/10 absolute top-1/2 -translate-y-1/2" />
                        <div className="w-[1px] h-full bg-white/10 absolute left-1/2 -translate-x-1/2" />
                        <div className="text-white/60 text-[11px] font-black uppercase tracking-[0.3em] border-2 border-white/20 px-6 py-3 rounded-full backdrop-blur-md bg-black/40">
                          Align Prescription
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Camera Bottom Controls */}
                  <div className="p-12 pb-16 bg-zinc-950 flex flex-col items-center gap-10 border-t border-white/5">
                    {capturedImage ? (
                      <div className="flex items-center justify-around w-full max-w-md">
                        <button
                          onClick={() => setCapturedImage(null)}
                          className="flex flex-col items-center gap-3 group"
                        >
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:bg-white/10 group-hover:border-white/30 transition-all duration-300">
                            <RotateCcw className="w-7 h-7" />
                          </div>
                          <span className="text-[10px] font-bold text-white/40 group-hover:text-white/80 uppercase tracking-widest transition-colors">Retake</span>
                        </button>

                        <button
                          onClick={approvePhoto}
                          className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-95 hover:scale-105 transition-all duration-300"
                        >
                          <Check className="w-12 h-12 stroke-[3px]" />
                        </button>
                        <div className="w-16 h-16 opacity-0 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <button
                          onClick={capturePhoto}
                          className="w-24 h-24 rounded-full border-[6px] border-white/20 flex items-center justify-center active:scale-90 transition-all relative group"
                        >
                          <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-white group-hover:bg-white/90 transition-colors shadow-2xl" />
                          <div className="absolute inset-[-12px] border-2 border-white/10 rounded-full animate-ping opacity-20" />
                        </button>
                      </div>
                    )}
                    <p className="text-white/30 text-[11px] font-black uppercase tracking-widest text-center max-w-[200px] leading-relaxed">
                      {capturedImage ? "Clear photo found" : "Keep your hand steady while capturing"}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>,
              document.body
            )}

            {/* Scan Results */}
            {scanResults.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{t('scan.medsFound')}</span>
                  <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">{scanResults.length} {t('scan.found')}</span>
                </div>
                {scanResults.map((med, i) => (
                  <GlassCard
                    key={med.id}
                    delay={i * 0.04}
                    className="cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => navigate(`/medicine/${med.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-4 h-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{med.name}</p>
                        {med.composition && <p className="text-[10px] text-muted-foreground truncate">{med.composition}</p>}
                      </div>
                      {med.price && <span className="text-sm font-semibold text-success flex-shrink-0">₹{med.price}</span>}
                    </div>
                  </GlassCard>
                ))}
                <details className="mt-2">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer">{t('scan.viewRaw')}</summary>
                  <div className="mt-1 p-2 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">{scanText}</p>
                  </div>
                </details>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default State */}
      {!query && !showScan && (
        <GlassCard delay={0.2} className="flex flex-col items-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
            <Pill className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground text-center">{t('search.typeToSearch')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('search.resultsAppear')}</p>
          <p className="text-xs text-muted-foreground/40 mt-3">{t('search.orScan')}</p>
        </GlassCard>
      )}

      {!query && showScan && scanResults.length === 0 && !scanImage && (
        <GlassCard delay={0.2} className="flex flex-col items-center py-10">
          <p className="text-xs text-muted-foreground/60">{t('search.typeToSearch')}</p>
        </GlassCard>
      )}

      {query && !loading && searched && results.length === 0 && (
        <GlassCard delay={0.15} className="text-center py-10">
          <p className="text-sm text-muted-foreground">{t('search.noResults')} "{query}"</p>
        </GlassCard>
      )}

      {query && results.length > 0 && (
        <div className="space-y-3">
          {results.map((med, i) => (
            <GlassCard
              key={med.id}
              delay={0.1 + i * 0.04}
              className="cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_20px_hsla(var(--glow-primary))] transition-all duration-300"
              onClick={() => navigate(`/medicine/${med.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{med.name}</p>
                  {med.composition && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{med.composition}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {med.manufacturer && (
                      <span className="text-[10px] text-muted-foreground">{med.manufacturer}</span>
                    )}
                    {med.packSizeLabel && (
                      <span className="text-[10px] text-muted-foreground">{med.packSizeLabel}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {med.price && (
                    <span className="text-sm font-semibold text-success">₹{med.price}</span>
                  )}
                  <span className="text-[10px] text-primary font-medium">{t('search.view')}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default SearchMedicines;
