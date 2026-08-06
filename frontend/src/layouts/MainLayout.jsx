// layouts/MainLayout.jsx
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/layout.css";

export default function MainLayout({
  activePage,
  onNavigate,
  title,
  subtitle,
  onNewBooking,
  onViewHistory,
  children,
}) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="app-content">
        <Navbar
          title={title}
          subtitle={subtitle}
          onNewBooking={onNewBooking}
          onViewHistory={onViewHistory}
          onNavigate={onNavigate}  
        />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
