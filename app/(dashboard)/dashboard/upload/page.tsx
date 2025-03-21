"use client";

import { useRef, useState } from 'react';
import { Upload, FileType, AlertCircle } from 'lucide-react';
import { Button } from "@/components/upload/ui/button";
import { Card } from "@/components/upload/ui/card";
import { Alert } from "@/components/upload/ui/alert";
import { Progress } from "@/components/upload/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { processFiles } from '@/lib/file-processor';


export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      setProcessing(false); // Reset processing state when new files are selected
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
      // Process each file individually
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
  

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">File Upload</h1>
            <p className="text-muted-foreground mt-2">
              Upload CSV or PDF files to create database tables
            </p>
          </div>

          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              processing ? 'opacity-50' : 'hover:border-gray-400'
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
              <Upload className="h-12 w-12 text-gray-400" />
              <span className="mt-2 text-sm text-gray-500">
                Click to upload CSV or PDF files
              </span>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Selected Files:</h3>
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileType className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {(processing || status) && (
            <div className="space-y-4">
              <Progress value={progress} />
              <div className="text-sm text-center space-y-2">
                <p className="text-primary font-medium">{status}</p>
                <p className="text-muted-foreground">Progress: {progress}%</p>
              </div>
            </div>
          )}

          <Alert variant="default" className="bg-blue-50">
            <AlertCircle className="h-4 w-4" />
            <span className="ml-2">
              Make sure your CSV files have consistent headers and data types.
              PDF files will be processed for tabular data.
            </span>
          </Alert>

          <Button
            onClick={handleUpload}
            disabled={processing || files.length === 0}
            className="w-full"
          >
            {processing ? "Processing..." : "Process Files"}
          </Button>
        </div>
      </Card>
    </div>
  );
}