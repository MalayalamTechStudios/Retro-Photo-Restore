import React, { useState } from 'react';
import { RestorationItem, RestorationStatus } from '../types';

interface ImageCardProps {
  item: RestorationItem;
  onRemove: (id: string) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ item, onRemove }) => {
  const [viewMode, setViewMode] = useState<'original' | 'restored' | 'split'>('split');

  const handleDownload = () => {
    if (item.restoredUrl) {
      const link = document.createElement('a');
      link.href = item.restoredUrl;
      const originalName = item.file.name.substring(0, item.file.name.lastIndexOf('.'));
      link.download = `${originalName}_restored.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderStatusOverlay = () => {
    if (item.status === RestorationStatus.PROCESSING) {
      return (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span className="text-white font-medium text-sm animate-pulse">Restoring...</span>
        </div>
      );
    }
    if (item.status === RestorationStatus.ERROR) {
      return (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center backdrop-blur-sm z-20 p-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-100 text-sm font-medium">{item.error || 'Failed'}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg flex flex-col h-full relative group">
      {/* Header */}
      <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
        <span className="text-xs font-mono text-slate-400 truncate max-w-[150px]">{item.file.name}</span>
        <div className="flex items-center gap-2">
          {item.status === RestorationStatus.COMPLETED && (
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button 
                    onClick={() => setViewMode('original')}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${viewMode === 'original' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Orig
                </button>
                <button 
                    onClick={() => setViewMode('split')}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Split
                </button>
                <button 
                    onClick={() => setViewMode('restored')}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${viewMode === 'restored' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    New
                </button>
            </div>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Remove"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div className="relative flex-grow bg-slate-900/80 min-h-[200px] max-h-[400px] flex items-center justify-center overflow-hidden">
        {renderStatusOverlay()}
        
        {item.status === RestorationStatus.COMPLETED && item.restoredUrl ? (
            // Display Logic for Completed State
            <div className="relative w-full h-full flex items-center justify-center">
                {viewMode === 'original' && (
                    <img src={item.originalUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                )}
                {viewMode === 'restored' && (
                    <img src={item.restoredUrl} alt="Restored" className="max-h-full max-w-full object-contain" />
                )}
                {viewMode === 'split' && (
                    <div className="relative w-full h-full flex items-center justify-center group">
                        <div className="relative w-full h-full">
                             {/* Back Image (Original) */}
                            <div className="absolute inset-0 w-full h-full">
                                <img src={item.originalUrl} alt="Original" className="w-full h-full object-contain opacity-50" />
                            </div>
                             {/* Front Image (Restored) with clip-path if we were doing a slider, but simpler side-by-side or overlay for now */}
                             {/* Let's do a simple toggle on hover for quick check or just show restored primarily with original accessible */}
                             <img src={item.restoredUrl} alt="Restored" className="absolute inset-0 w-full h-full object-contain" />
                             <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white pointer-events-none">Restored</div>
                        </div>
                    </div>
                )}
            </div>
        ) : (
             // Display Logic for Idle/Processing/Error
            <img
                src={item.originalUrl}
                alt="Original"
                className={`max-h-full max-w-full object-contain transition-opacity ${item.status === RestorationStatus.PROCESSING ? 'opacity-50 blur-sm' : 'opacity-100'}`}
            />
        )}
      </div>

      {/* Actions */}
      {item.status === RestorationStatus.COMPLETED && (
        <div className="p-3 bg-slate-800 border-t border-slate-700">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Result
          </button>
        </div>
      )}
    </div>
  );
};
