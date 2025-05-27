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

  const navGroups: NavGroup[] = [
    {
      label: 'main',
      items: [
        { href: '/dashboard/upload', icon: Database, label: 'Upload data' },
        { href: '/dashboard/chatbot', icon: MessageSquare, label: 'AI Chat Interface' },
        { href: '/dashboard/deepanalysis_ai', icon: Brain, label: 'Deep Analysis' },
      ]
    },
    {
      label: 'Additional Interfaces',
      items: [
        { href: '/dashboard/vercelchat', icon: BarChart, label: 'Data Analysis (Beta)' },
      ]
    },
    {
      label: 'Settings',
      items: [
        { href: '/dashboard/general', icon: Settings, label: 'General' },
        { href: '/dashboard', icon: Users, label: 'Team' },
        { href: '/dashboard/security', icon: Shield, label: 'Security' },
        { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <span className="font-medium">Settings</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                {group.label !== 'main' && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between mb-1 font-medium text-gray-500"
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
                <div className={group.label !== 'main' && !expandedGroups.includes(group.label) ? 'hidden' : ''}>
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} passHref>
                      <Button
                        variant={pathname === item.href ? 'secondary' : 'ghost'}
                        className={`shadow-none my-1 w-full justify-start ${
                          pathname === item.href ? 'bg-gray-100' : ''
                        }`}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}