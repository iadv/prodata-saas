

  
  // src/components/ui/table.tsx

import React from 'react';

export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <table className="min-w-full table-auto">
      {children}
    </table>
  );
};

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <thead className="bg-gray-100">{children}</thead>;
};

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <tbody>{children}</tbody>;
};

export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <tr className={className}>{children}</tr>;
};

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
};

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <th className={`px-4 py-2 text-left ${className}`}>{children}</th>;
};
