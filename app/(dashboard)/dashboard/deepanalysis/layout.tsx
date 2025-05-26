'use client';

import React from 'react';
// Import the toaster that's already in your project from the upload components
import { Toaster } from '@/components/upload/ui/toaster';

// This layout adds the Toaster component for notifications
// and any other chatbot-specific layout elements
export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}