import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  backTo?: string;
}

const PageHeader = ({ title, backTo }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 mb-6"
    >
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="p-2 rounded-xl transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      )}
      <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
    </motion.div>
  );
};

export default PageHeader;
