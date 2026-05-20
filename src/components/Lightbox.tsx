import React from 'react';
import { X } from 'lucide-react';

interface LightboxProps {
  imageSrc: string | null;
  productName: string | null;
  onClose: () => void;
}

export function Lightbox({ imageSrc, productName, onClose }: LightboxProps) {
  if (!imageSrc) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/95 transition-all z-[9999] flex flex-col justify-center items-center p-4 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.2s ease' }}
      id="lightbox-overlay-root"
    >
      {/* Close button with large hit area */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/25 text-white/90 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
        title="ปิดหน้าต่างภาพขยาย (Close)"
        id="lightbox-close-btn"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Lightbox Main Stage Image Wrapper */}
      <div 
        className="max-w-4xl max-h-[80vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageSrc} 
          alt={productName || 'Zoomed item'} 
          className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10 animate-zoomIn"
          referrerPolicy="no-referrer"
          id="lightbox-content-img"
        />
        
        {productName && (
          <div className="mt-4 bg-black/60 px-6 py-2 rounded-full border border-white/10 text-center animate-slideUp">
            <h4 className="text-white text-lg font-bold tracking-wide font-sans">{productName}</h4>
          </div>
        )}
      </div>

      <p className="absolute bottom-6 text-slate-500 text-xs text-center font-sans tracking-widest uppercase">
        คลิกที่ใดก็ได้เพื่อปิดหน้าต่างภาพขยาย
      </p>

      {/* Simple Inline Keyframes */}
      <style>{`
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-zoomIn {
          animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out 0.1s both;
        }
      `}</style>
    </div>
  );
}
