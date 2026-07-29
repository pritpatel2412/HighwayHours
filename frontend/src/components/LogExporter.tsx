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
    if (!el) {
      alert('Log sheet element not found for export.');
      return;
    }

    try {
      setIsExporting(true);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: 1280,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanDate = dateStr.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `FMCSA_Daily_Log_Day_${dayNumber}_${cleanDate}.png`;
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
    if (!el) {
      alert('Log sheet element not found for export.');
      return;
    }

    try {
      setIsExporting(true);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: 1280,
      });

      const imgData = canvas.toDataURL('image/png');

      // Create standard landscape A4 PDF document (297mm width x 210mm height)
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 297 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm

      const margin = 10; // 10mm margin around page
      const maxImgWidth = pageWidth - margin * 2;
      const maxImgHeight = pageHeight - margin * 2;

      let renderWidth = maxImgWidth;
      let renderHeight = (canvas.height * renderWidth) / canvas.width;

      if (renderHeight > maxImgHeight) {
        renderHeight = maxImgHeight;
        renderWidth = (canvas.width * renderHeight) / canvas.height;
      }

      const posX = (pageWidth - renderWidth) / 2;
      const posY = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight);

      const cleanDate = dateStr.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`FMCSA_Daily_Log_Day_${dayNumber}_${cleanDate}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(`Failed to export PDF file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportPNG}
        disabled={isExporting}
        className="px-3.5 py-1.5 bg-[#F4F5F5] hover:bg-[#171719] hover:text-white text-[#232427] border border-black/5 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
        title="Download high-resolution PNG image of this log sheet"
      >
        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 text-[#E34A32]" />}
        Export PNG
      </button>

      <button
        onClick={exportPDF}
        disabled={isExporting}
        className="button-orange px-4 py-1.5 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all disabled:opacity-50"
        title="Download printable PDF document of this log sheet"
      >
        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-white" />}
        Export PDF
      </button>
    </div>
  );
};
