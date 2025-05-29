'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Settings, Shield, Activity, Menu, MessageSquare, Database, BarChart, Brain, ChevronDown, ChevronRight } from 'lucide-react';

interface NavGroup {
  label: string;
  items: {
    href: string;
    icon: any;
    label: string;
  }[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main']);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const mainNavItems = [
    { href: '/dashboard/upload', icon: Database, label: 'Upload Data' },
    { href: '/dashboard/chatbot', icon: MessageSquare, label: 'AI Chat Interface (Beta)' },
    { href: '/dashboard/deepanalysis_ai', icon: Brain, label: 'Deep Analysis (Beta)' },
  ];

  const additionalInterfaces = [
    { href: '/dashboard/data-analysis', icon: BarChart, label: 'Data Analysis (Beta)' },
  ];

  const settingsNavItems = [
    { href: '/dashboard/settings/general', icon: Settings, label: 'General' },
    { href: '/dashboard/settings/team', icon: Users, label: 'Subscription and Team' },
    { href: '/dashboard/settings/security', icon: Shield, label: 'Security' },
    { href: '/dashboard/settings/activity', icon: Activity, label: 'Activity' },
  ];

  const navGroups = [
    { label: 'main', items: mainNavItems },
    { label: 'Additional Interfaces', items: additionalInterfaces },
    { label: 'Settings', items: settingsNavItems },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <div className="flex h-16 items-center gap-4 border-b px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      <div className="flex flex-1">
        <aside
          className={`${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:block w-64 border-r bg-gray-100/40 dark:bg-gray-800/40`}
        >
          <nav className="flex flex-col gap-4 p-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                {group.label !== 'main' && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between font-semibold mb-2"
                    onClick={() => toggleGroup(group.label)}
                  >
                    {group.label}
                    {expandedGroups.includes(group.label) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {(group.label === 'main' || expandedGroups.includes(group.label)) && (
                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <span
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-50 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800 ${
                            pathname === item.href
                              ? 'bg-gray-200 dark:bg-gray-800'
                              : ''
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}