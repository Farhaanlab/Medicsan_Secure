import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Loader2, AlertCircle, Pill, X, ImagePlus, Check, Plus, Search, Square, CheckSquare, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

const ScanPrescription = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { toast } = useToast();
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [editableMeds, setEditableMeds] = useState<any[]>([]);
    const [selectedMeds, setSelectedMeds] = useState<Set<number>>(new Set());
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Custom Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            // Stop any existing stream first
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 3840 }, // Ask for 4K resolution to maximize OCR clarity on mobile
                    height: { ideal: 2160 },
                    // Try to force auto-focus if supported
                    advanced: [{
                        focusMode: "continuous"
                    }] as any
                }
            };

            // Try with environment first, then fallback to any camera
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
            setError("");
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
                const dataUrl = canvas.toDataURL("image/jpeg", 1.0); // 100% quality instead of 0.8
                setCapturedImage(dataUrl);
            }
        }
    };

    const approvePhoto = () => {
        if (capturedImage) {
            setSelectedImage(capturedImage);
            // Convert dataURL to File for existing processImage logic
            fetch(capturedImage)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "prescription_camera.jpg", { type: "image/jpeg" });
                    setSelectedFile(file);
                });
            stopCamera();
        }
    };

    const toggleMedSelection = (index: number) => {
        const newSelected = new Set(selectedMeds);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedMeds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedMeds.size === editableMeds.length) {
            setSelectedMeds(new Set());
        } else {
            setSelectedMeds(new Set(editableMeds.map((_, i) => i)));
        }
    };

    const proceedToOnboarding = () => {
        const selectedMedsData = Array.from(selectedMeds).map(index => editableMeds[index]);
        navigate("/multi-onboarding", { state: { medicines: selectedMedsData } });
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setSelectedImage(URL.createObjectURL(file));
            setResult(null);
            setEditableMeds([]);
            setSelectedMeds(new Set());
            setError("");
        }
    };

    const processImage = async () => {
        if (!selectedFile) return;
        setIsLoading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            const data = await api.scanPrescription(formData);
            setResult(data);
            
            // Check both standard Node.js Response ({ parsed: { medicines: [] } })
            // AND legacy Python response ({ medicines: [] })
            const rawMeds = data?.parsed?.medicines || data?.medicines || [];
            
            // The node backend uses 'medicine_name', the python backend used 'matched_name'
            const meds = rawMeds.filter((m: any) => m.medicine_name || m.matched_name);

            if (meds.length > 0) {
                setEditableMeds(meds.map((med: any) => ({
                    medicine_name: med.medicine_name || med.matched_name,
                    manufacturer: med.manufacturer,
                    composition: med.composition || med.dosage || "Standard Formulation",
                    price: med.price,
                    dosage: med.dosage || med.type || "Tablet",
                    packSizeLabel: med.pack_size || "",
                })));
                // DESELECT ALL BY DEFAULT as requested
                setSelectedMeds(new Set());
            } else {
                setEditableMeds([]);
                setError("No medicines could be detected. Please try a clearer image.");
            }
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('Unauthorized')) {
                setError("Please log in first to use the scanner.");
            } else if (msg.includes('500') || msg.includes('server')) {
                setError("AI is temporarily busy. Please wait 30 seconds and try again.");
            } else {
                setError(msg || t('scan.failed'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const clearImage = () => {
        setSelectedImage(null);
        setSelectedFile(null);
        setResult(null);
        setEditableMeds([]);
        setSelectedMeds(new Set());
        setError("");
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleManualSearch = (val: string) => {
        setSearchQuery(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        if (val.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const results = await api.searchMedicines(val);
                setSearchResults(results);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const addManualMed = (med: any) => {
        const newMed = {
            medicine_name: med.name,
            manufacturer: med.manufacturer,
            composition: med.composition,
            dosage: "1 tablet",
            price: med.price,
            packSizeLabel: med.packSizeLabel,
            id: med.id
        };
        const newIndex = editableMeds.length;
        setEditableMeds([...editableMeds, newMed]);
        const newSelected = new Set(selectedMeds);
        newSelected.add(newIndex);
        setSelectedMeds(newSelected);
        setSearchQuery("");
        setSearchResults([]);
        toast({ title: "Added", description: `${med.name} added to list.` });
    };

    return (
        <AppLayout>
            <PageHeader title={t('scan.title')} backTo="/dashboard" />

            {/* Upload Area */}
            <GlassCard delay={0.05} className="mb-4 overflow-hidden">
                {selectedImage ? (
                    <div className="relative">
                        <img src={selectedImage} alt="Preview" className="w-full max-h-64 object-contain rounded-lg" />
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/80 text-foreground flex items-center justify-center hover:bg-destructive transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-primary/60" />
                        </div>
                        <p className="text-sm text-muted-foreground">{t('scan.takePhoto')}</p>
                        <p className="text-[11px] text-muted-foreground/60">{t('scan.handwritten')}</p>

                        <div className="flex gap-3 w-full max-w-xs">
                            <button
                                onClick={startCamera}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                <Camera className="w-4 h-4" />
                                {t('scan.camera')}
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                            >
                                <ImagePlus className="w-4 h-4" />
                                {t('scan.gallery')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Hidden File Input for Gallery */}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelected} />

                {/* Hidden Canvas for Capture */}
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

                            {/* Framing Overlay (Guides) - Taller and Narrower */}
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
                                        {/* Animation rings */}
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

            {/* Extract Button */}
            {selectedImage && !result && (
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={processImage}
                    disabled={isLoading}
                    className="btn-gradient w-full py-4 text-sm font-semibold flex items-center justify-center gap-2 mb-4"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('scan.scanning')}
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            {t('scan.extract')}
                        </>
                    )}
                </motion.button>
            )}

            {/* Error */}
            {error && (
                <GlassCard className="mb-4 border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                </GlassCard>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* Manual Add Feature - REFINED */}
                    <div className="p-5 rounded-2xl bg-black/20 border border-primary/20 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-3">
                            <Search className="w-4 h-4 text-primary" />
                            <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">
                                Add Missing Medicine
                            </h3>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search & add manually..."
                                value={searchQuery}
                                onChange={(e) => handleManualSearch(e.target.value)}
                                className="glass-input w-full pl-4 h-11 text-xs bg-black/40 border-primary/10 focus:border-primary/40"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                            )}
                        </div>

                        <AnimatePresence>
                            {searchResults.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-3"
                                >
                                    <div className="max-h-[220px] overflow-y-auto pr-2 space-y-1.5 custom-scrollbar bg-black/40 rounded-xl p-2 border border-white/5">
                                        {searchResults.map((res) => (
                                            <button
                                                key={res.id}
                                                onClick={() => addManualMed(res)}
                                                className="w-full p-3 rounded-lg bg-white/5 border border-white/5 flex items-center gap-3 hover:bg-white/10 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{res.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate italic">{res.manufacturer}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Results Header - BOXED */}
                    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h2 className="text-[15px] font-black text-foreground uppercase tracking-tight">{t('scan.medsFound')}</h2>
                                <p className="text-[11px] text-muted-foreground font-medium">Select items to configure reminders</p>
                            </div>
                            <button
                                onClick={toggleSelectAll}
                                className={cn(
                                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all font-black text-[12px] tracking-tighter",
                                    selectedMeds.size === editableMeds.length
                                        ? "bg-white border-white text-black"
                                        : "bg-transparent border-white text-white hover:bg-white/10"
                                )}
                            >
                                {selectedMeds.size === editableMeds.length ? <CheckSquare className="w-5 h-5 text-black" /> : <Square className="w-5 h-5 text-white" />}
                                {selectedMeds.size === editableMeds.length ? "DESELECT ALL" : "SELECT ALL"}
                            </button>
                        </div>
                    </div>

                    {/* MEDICINE CARDS - REFINED COLORS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-40">
                        {editableMeds.map((med: any, i: number) => {
                            const isSelected = selectedMeds.has(i);
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => toggleMedSelection(i)}
                                    className={cn(
                                        "relative cursor-pointer rounded-2xl border-2 transition-all duration-500 overflow-hidden flex flex-col group",
                                        isSelected
                                            ? "border-white bg-black shadow-[0_15px_45px_rgba(0,0,0,0.8)] scale-[1.02]"
                                            : "border-white/5 bg-[#12141c] hover:border-white/20"
                                    )}
                                >
                                    <div className="p-6 flex flex-col h-full z-10">
                                        {/* Row 1: Checkbox + Name */}
                                        <div className="flex items-start gap-3.5 mb-6">
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 flex-shrink-0",
                                                isSelected ? "bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "border-muted-foreground/20 bg-black/40"
                                            )}>
                                                {isSelected && <Check className="w-4 h-4 text-black stroke-[3.5px]" />}
                                            </div>
                                            <h3 className="text-[17px] font-black text-foreground leading-snug tracking-tight">
                                                {med.medicine_name}
                                            </h3>
                                        </div>

                                        {/* Details Sections */}
                                        <div className="space-y-6">
                                            {/* Price */}
                                            <div className="flex flex-col">
                                                <label className="text-[10px] uppercase font-black text-primary tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    Price
                                                </label>
                                                <span className="text-[20px] font-black text-emerald-400">
                                                    ₹{med.price && med.price !== 'N/A' ? med.price : '—'}
                                                </span>
                                            </div>

                                            {/* Composition */}
                                            <div className="flex flex-col">
                                                <label className="text-[10px] uppercase font-black text-primary tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    Composition
                                                </label>
                                                <span className="text-[13px] font-bold text-foreground/90 leading-relaxed">
                                                    {med.composition || med.dosage || 'Standard Formulation'}
                                                </span>
                                            </div>

                                            {/* Manufacturer */}
                                            <div className="flex flex-col">
                                                <label className="text-[10px] uppercase font-black text-primary tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    Manufacturer
                                                </label>
                                                <span className="text-[13px] font-bold text-foreground/70 leading-relaxed italic">
                                                    {med.manufacturer || 'Unknown Manufacturer'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Background Decor */}
                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none"
                                        />
                                    )}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Action Button Container - Fixed Alignment */}
                    <div className="fixed bottom-0 left-0 right-0 p-8 md:px-12 lg:px-24 bg-gradient-to-t from-background via-background/95 to-transparent z-40 flex justify-center backdrop-blur-sm">
                        <motion.button
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={proceedToOnboarding}
                            disabled={selectedMeds.size === 0}
                            className={cn(
                                "w-full max-w-2xl py-4 px-8 text-[15px] font-black flex items-center justify-center gap-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all uppercase tracking-widest",
                                selectedMeds.size > 0
                                    ? "bg-gradient-to-r from-primary to-accent text-foreground hover:scale-[1.03] active:scale-[0.97] border border-white/20"
                                    : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed border border-white/5"
                            )}
                        >
                            <Plus className="w-6 h-6 flex-shrink-0 stroke-[3px]" />
                            <span className="truncate">
                                {selectedMeds.size > 0
                                    ? `PROCEED WITH ${selectedMeds.size} SELECTIONS`
                                    : "CHOOSE MEDICINES TO ADD"}
                            </span>
                        </motion.button>
                    </div>

                    {/* Raw OCR text */}
                    <details className="mt-8 opacity-20 hover:opacity-100 transition-opacity pb-20">
                        <summary className="text-[9px] text-muted-foreground cursor-pointer uppercase font-bold tracking-widest flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> {t('scan.viewRaw')}
                        </summary>
                        <div className="mt-2 p-4 rounded-xl bg-black/40 border border-primary/10">
                            <p className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap leading-loose">{result.text}</p>
                        </div>
                    </details>
                </div>
            )}
        </AppLayout>
    );
};

export default ScanPrescription;
