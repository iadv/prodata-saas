'use client';

import { useState } from 'react';
import { Result } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  columns: string[];
  data: Result[];
}

export function DataTable({ columns, data }: DataTableProps) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;
  
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startRow = page * rowsPerPage;
  const endRow = Math.min(startRow + rowsPerPage, data.length);
  const currentPageData = data.slice(startRow, endRow);

  const formatColumnTitle = (title: string) => {
    return title
      .split('_')
      .map((word, index) =>
        index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
      )
      .join(' ');
  };

  const formatCellValue = (column: string, value: any) => {
    if (column.toLowerCase().includes('valuation')) {
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return '';
      }
      const formattedValue = parsedValue.toFixed(2);
      const trimmedValue = formattedValue.replace(/\.?0+$/, '');
      return `$${trimmedValue}B`;
    }
    if (column.toLowerCase().includes('rate')) {
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return '';
      }
      const percentage = (parsedValue * 100).toFixed(2);
      return `${percentage}%`;
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value || '');
  };

  const handlePrevious = () => {
    setPage((p) => Math.max(0, p - 1));
  };

  const handleNext = () => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  };

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className="whitespace-nowrap">
                  {formatColumnTitle(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPageData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex} className="py-2">
                    {formatCellValue(column, row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="text-xs text-gray-500">
            Showing {startRow + 1}-{endRow} of {data.length} rows
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handlePrevious}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handleNext}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}