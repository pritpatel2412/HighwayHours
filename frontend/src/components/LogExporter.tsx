import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

interface LogExporterProps {
  logElementId: string;
  dayNumber: number;
  dateStr: string;
}

export const LogExporter: React.FC<LogExporterProps> = ({ logElementId, dayNumber, dateStr }) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportPNG = async () => {
    const el = document.getElementById(logElementId);
    if (!el) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `FMCSA_Daily_Log_Day_${dayNumber}_${dateStr.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Failed to export PNG image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = async () => {
    const el = document.getElementById(logElementId);
    if (!el) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`FMCSA_Daily_Log_Day_${dayNumber}_${dateStr.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportPNG}
        disabled={isExporting}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
        title="Download high-resolution PNG image of this log sheet"
      >
        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-400" />}
        PNG Image
      </button>

      <button
        onClick={exportPDF}
        disabled={isExporting}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
        title="Download printable PDF document of this log sheet"
      >
        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-white" />}
        PDF Document
      </button>
    </div>
  );
};
