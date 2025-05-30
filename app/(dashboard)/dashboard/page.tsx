import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { MessageSquare, Brain, Database, BarChart, ArrowRight, Sparkles } from 'lucide-react';
import { sql } from "@vercel/postgres";

async function getTableCount() {
  try {
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    // Filter out system tables (same as in TableSelector)
    const filteredTables = result.rows
      .map(row => row.table_name)
      .filter(table => 
        table !== "library" && 
        table !== "historical" && 
        table !== "chatbot_historical" && 
        table !== "messages" && 
        table !== "conversations"
      );
    
    return filteredTables.length;
  } catch (error) {
    console.error("Error fetching table count:", error);
    return 0;
  }
}

export default async function DashboardPage() {
  const user = await getUser();
  const tableCount = await getTableCount();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto p-6 space-y-10">
      {/* Welcome Section with Quick Stats */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 overflow-hidden">
        <div className="px-8 py-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">Welcome back, {user.name}! 👋</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Ready to uncover new insights? Your data analysis toolkit is ready to go.
              </p>
            </div>
            <div className="flex gap-6 flex-wrap">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm text-muted-foreground">Data Sources</div>
                <div className="text-2xl font-bold mt-1">{tableCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Link href="/dashboard/upload">
          <Card className="group relative p-6 hover:shadow-lg transition-all duration-200 cursor-pointer h-full border-2 hover:border-orange-200 dark:hover:border-orange-900">
            <div className="space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                <Database className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Upload Data</h2>
              <p className="text-sm text-muted-foreground">
                Upload your CSV or PDF files to create database tables for analysis.
              </p>
              <ArrowRight className="h-5 w-5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-6 right-6" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/chatbot">
          <Card className="group relative p-6 hover:shadow-lg transition-all duration-200 cursor-pointer h-full border-2 hover:border-orange-200 dark:hover:border-orange-900">
            <div className="space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                <MessageSquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">AI Chat Interface</h2>
                <span className="inline-flex items-center text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded-full px-2 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Beta
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Chat with your data using our AI assistant. Get instant insights and answers.
              </p>
              <ArrowRight className="h-5 w-5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-6 right-6" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/deepanalysis_ai">
          <Card className="group relative p-6 hover:shadow-lg transition-all duration-200 cursor-pointer h-full border-2 hover:border-orange-200 dark:hover:border-orange-900">
            <div className="space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                <Brain className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Deep Analysis</h2>
                <span className="inline-flex items-center text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded-full px-2 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Beta
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive reports with charts and insights from your data.
              </p>
              <ArrowRight className="h-5 w-5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-6 right-6" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
