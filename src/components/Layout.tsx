import { Link, useLocation } from 'react-router-dom';
import {
  Leaf,
  Warehouse,
  Store,
  BarChart3,
  ClipboardCheck,
  Menu,
  X,
  User,
  FileText,
  Database,
  Sprout,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: BarChart3 },
  { path: '/farmer', label: 'Farmer', icon: Leaf },
  { path: '/grading', label: 'Quality', icon: ClipboardCheck },
  { path: '/warehouse', label: 'Warehouse', icon: Warehouse },
  { path: '/retailer', label: 'Retailer', icon: Store },
  { path: '/customer', label: 'Customer & Traceability', icon: User },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Floating Navbar */}
      <div className={cn(
        "fixed top-4 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none transition-all duration-700 ease-in-out",
        navCollapsed && "-translate-y-20 opacity-0"
      )}>
        <header className={cn(
          "w-full max-w-7xl rounded-2xl glass px-4 py-3 flex items-center justify-between pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
          navCollapsed && "max-w-fit"
        )}>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <span className={cn(
              "text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent whitespace-nowrap overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
              navCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100"
            )}>
              Agrovia
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className={cn(
            "hidden md:flex items-center gap-1 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
            navCollapsed ? "max-w-0 opacity-0" : "max-w-[800px] opacity-100"
          )}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/25 layout-id-active" />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className={cn(
              "overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
              navCollapsed ? "max-w-0 opacity-0" : "max-w-[100px] opacity-100"
            )}>
              <ThemeToggle />
            </div>

            {/* Collapse/Expand Button - Desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex rounded-xl hover:bg-secondary/50 transition-all duration-300 hover:scale-110"
              onClick={() => setNavCollapsed(!navCollapsed)}
            >
              {navCollapsed ? (
                <ChevronRight className="h-5 w-5 transition-transform duration-300" />
              ) : (
                <ChevronLeft className="h-5 w-5 transition-transform duration-300" />
              )}
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-xl hover:bg-secondary/50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>
      </div>

      {/* Show Navbar Button - appears when navbar is collapsed */}
      {navCollapsed && (
        <Button
          variant="default"
          size="sm"
          className="fixed top-4 right-4 z-50 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-500"
          onClick={() => setNavCollapsed(false)}
        >
          <Menu className="h-4 w-4 mr-2" />
          Show Menu
        </Button>
      )}

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden pt-24 px-4">
          <nav className="glass rounded-3xl p-4 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 text-base font-medium rounded-2xl transition-all active:scale-98',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Spacer for Floating Nav */}
      <main className="container py-24 md:py-28 max-w-7xl animate-in fade-in duration-700 slide-in-from-bottom-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-secondary/20 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4 text-foreground font-bold">
            <Leaf className="h-5 w-5 text-primary" /> AgroVia
          </div>
          <p className="text-sm">&copy; 2026 AgroVia Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
