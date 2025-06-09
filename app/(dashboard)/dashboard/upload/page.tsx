"use client";

import { useRef, useState, useEffect } from 'react';
import { Upload, FileType, AlertCircle, Database, Trash2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/upload/ui/button";
import { Card } from "@/components/upload/ui/card";
import { Alert } from "@/components/upload/ui/alert";
import { Progress } from "@/components/upload/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { processFiles } from '@/lib/file-processor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/upload/ui/alert-dialog";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTableName, setDeleteTableName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      if (!res.ok) throw new Error('Failed to fetch tables');
      const data = await res.json();
      
      // Filter out system tables
      const filteredTables = data.tables.filter((table: string) => 
        !["library", "historical", "chatbot_historical", "messages", "conversations"].includes(table)
      );
      
      setTables(filteredTables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tables",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => 
        file.type === 'text/csv' || file.type === 'application/pdf'
      );
      
      if (validFiles.length !== selectedFiles.length) {
        toast({
          title: "Invalid file type",
          description: "Only CSV and PDF files are supported",
          variant: "destructive"
        });
      }
      
      setFiles(validFiles);
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setProgress(0);
    setStatus('');
    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive"
      });
      return;
    }
  
    setProcessing(true);
    setProgress(0);
    setStatus('Initializing...');
  
    try {
      for (const file of files) {
        await processFiles(file, (progress) => {
          setProgress(progress);
        }, (message) => {
          setStatus(message);
        });
      }
  
      toast({
        title: "Success",
        description: "Files processed and tables created successfully",
      });
  
      resetForm();
      fetchTables(); // Refresh table list
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while processing files",
        variant: "destructive"
      });
      resetForm();
    } finally {
      setProcessing(false);
    }
  };
  
  const handleDeleteTable = async () => {
    if (!deleteTableName) return;

    try {
      const response = await fetch('/api/tables', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName: deleteTableName }),
      });

      const data = await response.json().catch(() => null);
      
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete table');
      }

      toast({
        title: "Success",
        description: "Table deleted successfully",
      });

      fetchTables(); // Refresh table list
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete table",
        variant: "destructive"
      });
    } finally {
      setDeleteTableName(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 overflow-hidden mb-6">
        <div className="px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <Upload className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Upload Data</h1>
              <p className="text-muted-foreground">
                Upload CSV or PDF files to create database tables for analysis
            </p>
            </div>
          </div>
        </div>
          </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card className="p-6 border-2 hover:border-purple-100 dark:hover:border-purple-900 transition-colors">
          <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                processing ? 'opacity-50' : 'hover:border-purple-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={processing}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer flex flex-col items-center ${
                processing ? 'cursor-not-allowed' : ''
              }`}
            >
                <Upload className="h-12 w-12 text-purple-400" />
                <span className="mt-2 text-sm text-muted-foreground">
                Click to upload CSV or PDF files
              </span>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Selected Files:</h3>
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <FileType className="h-4 w-4 text-purple-500" />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {(processing || status) && (
            <div className="space-y-4">
                <Progress value={progress} className="bg-purple-100" />
              <div className="text-sm text-center space-y-2">
                  <p className="text-purple-600 font-medium">{status}</p>
                <p className="text-muted-foreground">Progress: {progress}%</p>
              </div>
            </div>
          )}

            <Alert variant="default" className="bg-purple-50 dark:bg-purple-900/20">
              <AlertCircle className="h-4 w-4 text-purple-500" />
            <span className="ml-2">
              Make sure your CSV files have consistent headers and data types.
              PDF files will be processed for tabular data.
            </span>
          </Alert>

          <Button
            onClick={handleUpload}
            disabled={processing || files.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {processing ? "Processing..." : "Process Files"}
          </Button>
        </div>
      </Card>

        {/* Tables Section */}
        <Card className="p-6 border-2 hover:border-purple-100 dark:hover:border-purple-900 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-500" />
              <h2 className="text-xl font-semibold">Available Tables</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTables}
              disabled={isLoading}
              className="text-purple-600"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch('/api/tables/debug');
                  const data = await response.json();
                  console.log("Debug - All tables:", data.tables);
                } catch (error) {
                  console.error("Debug error:", error);
                }
              }}
              className="ml-2 text-purple-600"
            >
              <Database className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading tables...
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tables available. Upload some data to get started.
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {tables.map((table) => (
                <div
                  key={table}
                  className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20"
                >
                  <span className="font-medium truncate">{table}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTableName(table)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #c084fc;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #a855f7;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-track {
              background: #1f2937;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #6b21a8;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #7e22ce;
            }
          `}</style>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTableName} onOpenChange={() => setDeleteTableName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the table "{deleteTableName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteTable}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}