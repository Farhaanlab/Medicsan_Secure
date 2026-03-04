import SplineBackground from "./SplineBackground";
import BottomNavBar from "./BottomNavBar";
import SideNav from "./SideNav";
import { motion } from "framer-motion";
import ActiveReminderPopup from "./ActiveReminderPopup";

interface AppLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const AppLayout = ({ children, showNav = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen relative">
      <ActiveReminderPopup />
      <SplineBackground />
      {showNav && <SideNav />}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 px-4 sm:px-6 lg:pl-72 lg:pr-8 pt-6 pb-24 lg:pb-8 min-h-screen"
      >
        <div className="max-w-5xl">
          {children}
        </div>
      </motion.main>
      {showNav && <BottomNavBar />}
    </div>
  );
};

export default AppLayout;
