import React from 'react';
import { Product } from '../types.js';
import { Plus, Maximize } from 'lucide-react';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onAddToCart: (product: Product) => void;
  onImageClick: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onImageClick }: ProductCardProps) {
  // Format price with thousands separator
  const formattedPrice = product.price.toLocaleString('th-TH');
  const isSoldOut = product.status === 'Sold Out';

  return (
    <div 
      className={`bg-[#0f172a]/40 border border-white/5 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${isSoldOut ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:border-blue-500/30'} transition-all duration-300 relative group flex flex-col h-full`}
      style={{
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
      }}
      id={`product-card-${product.id}`}
    >
      {/* Product Image Stage */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 group-hover:brightness-110 transition-all border-b border-white/5">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          draggable="false"
          referrerPolicy="no-referrer"
        />
        
        {/* Fullscreen Magnifier Overlay Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onImageClick(product);
          }}
          className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-blue-600 hover:text-white text-slate-300 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer border border-white/10"
          title="ดูรูปขนาดขยาย"
          id={`product-magnify-${product.id}`}
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isSoldOut ? 'bg-rose-950/80 text-rose-450 border border-rose-500/30' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'}`}>
            {isSoldOut ? 'Sold Out / หมด' : 'In Stock / ว่าง'}
          </span>
        </div>

        {/* Quick Add Overlay on Hover (Only if in stock) */}
        {!isSoldOut && (
          <div className="absolute inset-0 bg-[#05070a]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onAddToCart(product)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-[0_4px_15px_rgba(37,99,235,0.4)] transform translate-y-2 group-hover:translate-y-0 transition-all cursor-pointer"
              id={`product-quickadd-${product.id}`}
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มลงบิล</span>
            </button>
          </div>
        )}
      </div>

      {/* Card Detail Content */}
      <div 
        className="p-4 flex flex-col flex-grow text-center justify-between cursor-pointer" 
        onClick={() => {
          if (!isSoldOut) {
            onAddToCart(product);
          }
        }}
      >
        <div>
          <h5 
            className="text-sm font-bold text-slate-100 line-clamp-1 my-tooltip mb-0.5 select-none"
            data-desc={product.tooltip || product.description}
            id={`product-title-${product.id}`}
          >
            {product.name}
          </h5>
          <div className="flex items-center justify-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">{product.nameEn}</span>
            {product.licensePlate && (
              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-blue-950/50 text-blue-400 border border-blue-500/10">
                {product.licensePlate}
              </span>
            )}
          </div>
          {product.description && (
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 mb-1 leading-relaxed text-center px-1">
              {product.description}
            </p>
          )}

          {/* Customization levels shown if any are custom set */}
          {(product.engine || product.brakes || product.transmission || product.armor || product.turbo) && (
            <div className="mt-2 grid grid-cols-5 gap-1 text-[9px] font-mono border border-white/5 bg-[#020408]/40 p-2 rounded-xl text-center">
              <div className="flex flex-col items-center">
                <span className="text-[7px] text-blue-400 uppercase tracking-tight" title="Engine (เครื่องยนต์)">ENG</span>
                <span className={`text-[10px] font-black ${product.engine === 'Max' ? 'text-amber-400' : 'text-slate-200'}`}>{product.engine}</span>
              </div>
              <div className="flex flex-col items-center border-l border-white/5">
                <span className="text-[7px] text-emerald-400 uppercase tracking-tight" title="Brakes (เบรค)">BRK</span>
                <span className={`text-[10px] font-black ${product.brakes === 'Max' ? 'text-amber-400' : 'text-slate-200'}`}>{product.brakes}</span>
              </div>
              <div className="flex flex-col items-center border-l border-white/5">
                <span className="text-[7px] text-purple-400 uppercase tracking-tight" title="Transmission (เกียร์)">TRN</span>
                <span className={`text-[10px] font-black ${product.transmission === 'Max' ? 'text-amber-400' : 'text-slate-200'}`}>{product.transmission}</span>
              </div>
              <div className="flex flex-col items-center border-l border-white/5">
                <span className="text-[7px] text-rose-450 uppercase tracking-tight" title="Armor (เกราะ)">ARM</span>
                <span className={`text-[10px] font-black ${product.armor === 'Max' ? 'text-amber-400' : 'text-slate-200'}`}>{product.armor}</span>
              </div>
              <div className="flex flex-col items-center border-l border-white/5">
                <span className="text-[7px] text-cyan-400 uppercase tracking-tight" title="Turbo (เทอร์โบ)">TRB</span>
                <span className={`text-[10px] font-black ${product.turbo === 'Max' ? 'text-amber-400' : 'text-slate-200'}`}>{product.turbo}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            {product.unit || 'วัน / Day'}
          </span>
          <p className="text-blue-400 font-extrabold text-sm font-mono">
            ฿{formattedPrice}
          </p>
        </div>
      </div>
    </div>
  );
}
