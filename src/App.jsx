import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

export default function PDFFlipbook() {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageOrientation, setPageOrientation] = useState('portrait');
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const PDF_URL = '/test.pdf';

  useEffect(() => {
    loadPDF();
  }, []);

  useEffect(() => {
    if (pages.length > 0) {
      if (currentPage + 2 < pages.length) {
        const img1 = new Image();
        img1.src = pages[currentPage + 2];
      }
      if (currentPage + 3 < pages.length) {
        const img2 = new Image();
        img2.src = pages[currentPage + 3];
      }
      if (currentPage - 1 >= 0) {
        const img3 = new Image();
        img3.src = pages[currentPage - 1];
      }
      if (currentPage - 2 >= 0) {
        const img4 = new Image();
        img4.src = pages[currentPage - 2];
      }
    }
  }, [currentPage, pages]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (isFlipping) return;
      
      e.preventDefault();
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (e.deltaY > 0) {
          nextPage();
        } else if (e.deltaY < 0) {
          prevPage();
        }
      }, 50);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentPage, isFlipping, pages.length]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const loadingTask = window.pdfjsLib.getDocument(PDF_URL);
      const pdf = await loadingTask.promise;
      
      const totalPages = Math.min(pdf.numPages, 500);
      const pageImages = [];

      const firstPage = await pdf.getPage(1);
      const firstViewport = firstPage.getViewport({ scale: 1 });
      const orientation = firstViewport.width > firstViewport.height ? 'landscape' : 'portrait';
      setPageOrientation(orientation);

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        pageImages.push(canvas.toDataURL());
      }

      setPages(pageImages);
      setLoading(false);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF. Please check the PDF URL and ensure the file exists.');
      setLoading(false);
    }
  };

  const nextPage = () => {
    if (isFlipping || currentPage >= pages.length - 2) return;
    
    setFlipDirection('next');
    setIsFlipping(true);
    
    setTimeout(() => {
      setCurrentPage(prev => prev + 2);
      setIsFlipping(false);
      setFlipDirection('');
    }, 700);
  };

  const prevPage = () => {
    if (isFlipping || currentPage <= 0) return;
    
    setFlipDirection('prev');
    setIsFlipping(true);
    
    // Don't update currentPage immediately - wait for animation
    setTimeout(() => {
      setCurrentPage(prev => prev - 2);
      setFlipDirection('');
      setIsFlipping(false);
    }, 700);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.6));

  const getPageDimensions = () => {
    if (pageOrientation === 'landscape') {
      return { width: 550, height: 400 };
    }
    return { width: 400, height: 550 };
  };

  const pageDimensions = getPageDimensions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-900 text-lg font-medium">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading PDF</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-600">
            Please update the PDF_URL in the code to point to your PDF file.
          </p>
          <button
            onClick={loadPDF}
            className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col overflow-hidden">
      <div className="bg-white shadow-md py-4 px-6 flex items-center justify-between">
       <img src="/icomputerlogo.png" alt="Logo" className="h-24 pl-12" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Page {currentPage + 1}-{Math.min(currentPage + 2, pages.length)} of {pages.length}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Scroll to flip
          </span>
          <div className="flex gap-2">
            <button onClick={zoomOut} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ZoomOut className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={zoomIn} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ZoomIn className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-100 rounded-lg transition">
              {isFullscreen ? <X className="w-5 h-5 text-gray-700" /> : <Maximize2 className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative" style={{ transform: `scale(${zoom})`, transition: 'transform 0.3s' }}>
          <div className="relative flex shadow-2xl" style={{ perspective: '3000px' }}>
            {/* Left Page */}
            <div
              className="relative bg-white border-r border-gray-200"
              style={{
                width: `${pageDimensions.width}px`,
                height: `${pageDimensions.height}px`,
              }}
            >
              {/* Show current left page when not flipping backward */}
              {!(isFlipping && flipDirection === 'prev') && pages[currentPage] && (
                <>
                  <img
                    src={pages[currentPage]}
                    alt={`Page ${currentPage + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-gray-300/30 to-transparent pointer-events-none"></div>
                </>
              )}
              
              {/* When flipping backward, show the previous left page (Page 1) underneath */}
              {isFlipping && flipDirection === 'prev' && pages[currentPage - 2] && (
                <div className="absolute inset-0 bg-white" style={{ zIndex: 1 }}>
                  <img
                    src={pages[currentPage - 2]}
                    alt={`Page ${currentPage - 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-gray-300/30 to-transparent pointer-events-none"></div>
                </div>
              )}
              
              {/* Backward flip - Left page (page 3) flipping to right */}
              {isFlipping && flipDirection === 'prev' && (
                <div
                  className="absolute inset-0 flip-page-left-to-right"
                  style={{
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'right center',
                    zIndex: 10,
                  }}
                >
                  {/* Front: Current left page (page 3) */}
                  <div 
                    className="absolute inset-0 bg-white"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <img
                      src={pages[currentPage]}
                      alt={`Page ${currentPage + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-gray-300/30 to-transparent pointer-events-none"></div>
                  </div>
                  
                  {/* Back: Page 2 (what you see on the back as page 3 flips) */}
                  <div 
                    className="absolute inset-0 bg-white"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(-180deg)',
                    }}
                  >
                    <img
                      src={pages[currentPage - 1]}
                      alt={`Page ${currentPage}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-300/30 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Page Container */}
            <div
              className="relative"
              style={{
                width: `${pageDimensions.width}px`,
                height: `${pageDimensions.height}px`,
              }}
            >
              {/* Static right page (shown when not flipping OR when flipping backward to keep Page 4 visible) */}
              {(!isFlipping || flipDirection === 'prev') && pages[currentPage + 1] && (
                <div className="absolute inset-0 bg-white">
                  <img
                    src={pages[currentPage + 1]}
                    alt={`Page ${currentPage + 2}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-300/30 to-transparent pointer-events-none"></div>
                </div>
              )}

              {/* Forward flip - Right page (page 2) flipping to left */}
              {isFlipping && flipDirection === 'next' && (
                <div
                  className="absolute inset-0 flip-page-forward"
                  style={{
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'left center',
                    zIndex: 10,
                  }}
                >
                  {/* Front: Page 2 - normal, readable */}
                  <div 
                    className="absolute inset-0 bg-white"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <img
                      src={pages[currentPage + 1]}
                      alt={`Page ${currentPage + 2}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-300/30 to-transparent pointer-events-none"></div>
                  </div>
                  
                  {/* Back: Page 3 - normal, readable (not mirrored) */}
                  <div 
                    className="absolute inset-0 bg-white"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <img
                      src={pages[currentPage + 2]}
                      alt={`Page ${currentPage + 3}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-300/30 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              )}

              {/* Page revealed underneath after forward flip */}
              {isFlipping && flipDirection === 'next' && pages[currentPage + 3] && (
                <div className="absolute inset-0 bg-white" style={{ zIndex: 1 }}>
                  <img
                    src={pages[currentPage + 3]}
                    alt={`Page ${currentPage + 4}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-300/30 to-transparent pointer-events-none"></div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevPage}
            disabled={currentPage <= 0 || isFlipping}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 p-3 bg-white rounded-full shadow-lg hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-6 h-6 text-amber-900" />
          </button>

          <button
            onClick={nextPage}
            disabled={currentPage >= pages.length - 2 || isFlipping}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 p-3 bg-white rounded-full shadow-lg hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-6 h-6 text-amber-900" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes flipForward {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(-180deg);
          }
        }

        @keyframes flipBackward {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(180deg);
          }
        }

        @keyframes flipLeftToRight {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(-180deg);
          }
        }

        .flip-page-forward {
          animation: flipForward 0.7s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards;
        }

        .flip-page-backward {
          animation: flipBackward 0.7s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards;
        }

        .flip-page-left-to-right {
          animation: flipLeftToRight 0.7s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards;
        }
      `}</style>
    </div>
  );
}