import { Config, Result } from "@/lib/types";

export type MessageType = 'user' | 'assistant';

export interface TableData {
  columns: string[];
  rows: Result[];
}

export interface ChartData {
  config: Config;
  data: Result[];
}

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  tableData?: TableData;
  chartData?: ChartData;
  isLoading?: boolean;
  error?: string;
  rawQuery?: string;
}

export interface ConversationHistory {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  title: string;
}