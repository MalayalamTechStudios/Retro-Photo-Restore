import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UploadArea } from './components/UploadArea';
import { ImageCard } from './components/ImageCard';
import { RestorationItem, RestorationStatus } from './types';
import { restoreImageWithGemini } from './services/geminiService';

const App: React.FC = () => {
  const [items, setItems] = useState<RestorationItem[]>([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [keySelected, setKeySelected] = useState(false);

  // Check for API key selection on mount or before action
  const ensureApiKey = async (): Promise<boolean> => {
    // Cast window to any to avoid type conflicts with global AIStudio declarations
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (hasKey) {
        setKeySelected(true);
        return true;
      }
    }
    return false;
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
        await aistudio.openSelectKey();
        // Assume success as per guidance to avoid race condition
        setKeySelected(true);
    }
  };

  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: RestorationItem[] = files.map((file) => ({
      id: uuidv4(),
      file,
      originalUrl: URL.createObjectURL(file),
      status: RestorationStatus.IDLE,
    }));

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.restoredUrl) URL.revokeObjectURL(target.restoredUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const processItem = async (item: RestorationItem) => {
    try {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: RestorationStatus.PROCESSING, error: undefined } : i));
      
      const restoredDataUrl = await restoreImageWithGemini(item.file);

      setItems(prev => prev.map(i => i.id === item.id ? { 
        ...i, 
        status: RestorationStatus.COMPLETED, 
        restoredUrl: restoredDataUrl 
      } : i));
    } catch (error: any) {
      setItems(prev => prev.map(i => i.id === item.id ? { 
        ...i, 
        status: RestorationStatus.ERROR, 
        error: error.message 
      } : i));
    }
  };

  const handleRestoreAll = async () => {
    if (!keySelected) {
        const hasKey = await ensureApiKey();
        if (!hasKey) {
            await handleSelectKey();
        }
    }

    const pendingItems = items.filter(i => i.status === RestorationStatus.IDLE || i.status === RestorationStatus.ERROR);
    if (pendingItems.length === 0) return;

    setIsGlobalProcessing(true);

    // Process sequentially to be nice to rate limits, or parallel if confident. 
    // Given high quality image gen can be slow, let's do parallel with a small concurrency limit or just `Promise.all` for small batches.
    // Simpler approach for this demo: parallel (browsers usually limit connections anyway).
    await Promise.all(pendingItems.map(item => processItem(item)));
    
    setIsGlobalProcessing(false);
  };

  const handleDownloadAll = () => {
    items.forEach(item => {
        if(item.status === RestorationStatus.COMPLETED && item.restoredUrl) {
             const link = document.createElement('a');
             link.href = item.restoredUrl;
             const originalName = item.file.name.substring(0, item.file.name.lastIndexOf('.'));
             link.download = `${originalName}_restored.png`;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
        }
    });
  };

  const stats = {
      total: items.length,
      completed: items.filter(i => i.status === RestorationStatus.COMPLETED).length,
      processing: items.filter(i => i.status === RestorationStatus.PROCESSING).length
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              RetroRestore AI
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {stats.completed > 0 && (
                 <button 
                    onClick={handleDownloadAll}
                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                 >
                    Download All ({stats.completed})
                 </button>
            )}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Billing Info
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro / Upload Section */}
        {items.length === 0 ? (
          <div className="max-w-3xl mx-auto text-center mt-12">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Restore your memories with Professional AI</h2>
            <p className="text-lg text-slate-400 mb-8">
              Remove scratches, enhance faces, and correct colors instantly. 
              <br />Powered by Gemini 3 Pro Vision for maximum quality.
            </p>
            
            <div className="bg-slate-800/30 p-1 rounded-2xl backdrop-blur-sm">
                <UploadArea onFilesSelected={handleFilesSelected} />
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                {[
                    { title: "Scratch Removal", desc: "Automatically detects and fills scratches, dust, and tears." },
                    { title: "Face Enhancement", desc: "Sharpens facial features while preserving identity." },
                    { title: "Color Correction", desc: "Restores faded colors to their natural vibrance." }
                ].map((feature, i) => (
                    <div key={i} className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <h3 className="font-semibold text-indigo-400 mb-2">{feature.title}</h3>
                        <p className="text-slate-400 text-sm">{feature.desc}</p>
                    </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-2 overflow-hidden">
                        {items.slice(0, 5).map(i => (
                            <img key={i.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-slate-900 object-cover" src={i.originalUrl} alt="" />
                        ))}
                        {items.length > 5 && (
                            <div className="h-10 w-10 rounded-full ring-2 ring-slate-900 bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                +{items.length - 5}
                            </div>
                        )}
                    </div>
                    <div className="text-sm text-slate-400">
                        <span className="text-white font-medium">{items.length}</span> images uploaded
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                     <UploadArea onFilesSelected={handleFilesSelected} />
                     {/* Hacking the UploadArea to be a small button by hiding it and triggering a hidden input is complex with the current component. 
                         Instead, let's just add a separate "Add More" button that triggers a hidden input or just rely on the main one above if we redesign.
                         Actually, let's just keep the main upload area for "Add More" in a different visual if needed, but for now, 
                         users can drag drop onto the page or we add a small button.
                      */}
                     <label className="cursor-pointer px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                        Add More
                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
                             if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                        }} />
                     </label>
                     
                     <button
                        onClick={handleRestoreAll}
                        disabled={isGlobalProcessing || stats.processing > 0}
                        className={`px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                            isGlobalProcessing 
                            ? 'bg-indigo-600/50 cursor-not-allowed text-indigo-200' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        }`}
                     >
                        {isGlobalProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Restoring...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                Restore All
                            </>
                        )}
                     </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <div key={item.id} className="h-[400px]">
                    <ImageCard item={item} onRemove={handleRemoveItem} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;