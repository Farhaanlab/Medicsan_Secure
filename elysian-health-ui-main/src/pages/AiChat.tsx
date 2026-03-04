import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

type Message = {
    role: "user" | "assistant";
    content: string;
};

const AiChat = () => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: t('chat.greeting') },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setInput("");
        setIsLoading(true);

        try {
            const data = await api.chat(userMessage);
            setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: t('chat.error') },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout>
            <PageHeader title={t('chat.title')} backTo="/dashboard" />

            {/* Chat Area */}
            <div className="glass-card flex flex-col overflow-hidden mb-20" style={{ minHeight: "60vh" }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                        >
                            {msg.role === "assistant" && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                                    msg.role === "user"
                                        ? "bg-gradient-to-r from-primary to-accent text-foreground"
                                        : "bg-secondary/60 text-foreground"
                                )}
                            >
                                {msg.content}
                            </div>
                            {msg.role === "user" && (
                                <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="bg-secondary/60 rounded-2xl px-4 py-2.5 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Bar */}
            <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto z-30">
                <form onSubmit={sendMessage} className="flex gap-2 relative">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('chat.placeholder')}
                        className="glass-input w-full h-12 pr-12 rounded-full shadow-lg"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1 top-1 h-10 w-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                        <Send className="w-4 h-4 text-foreground" />
                    </button>
                </form>
            </div>
        </AppLayout>
    );
};

export default AiChat;
