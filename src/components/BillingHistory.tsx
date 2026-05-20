import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { POSOrder, ParsedItem } from '../types.js';
import { Calendar, Trash2, Receipt, AlertCircle, ShoppingBag, ArrowRightLeft, CreditCard, Banknote, HelpCircle, Clock } from 'lucide-react';

interface RentalCountdownProps {
  createdAt: string;
  days: number;
  isReturned?: boolean;
}

export function RentalCountdown({ createdAt, days, isReturned }: RentalCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (isReturned) return;

    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const expirationTime = createdTime + (days * 24 * 60 * 60 * 1000);
      const now = Date.now();
      const difference = expirationTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('หมดระยะเวลาเช่า / EXPIRED');
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const d = Math.floor(totalSeconds / (3600 * 24));
      const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      let timeString = '';
      if (d > 0) {
        timeString += `${d} วัน `;
      }
      timeString += `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      
      setTimeLeft(timeString);
      setIsExpired(false);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [createdAt, days, isReturned]);

  if (isReturned) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-450 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md select-none">
        🟢 คืนรถครบแล้ว (In Stock)
      </span>
    );
  }

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-450 bg-rose-950/40 border border-rose-500/20 px-2 py-0.5 rounded-md select-none">
        ❌ หมดระยะเวลาเช่า (EXPIRED)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(16,185,129,0.15)] animate-pulse select-none">
      <Clock className="w-2.5 h-2.5 text-emerald-400" />
      <span>⏰ เหลือเวลาเช่า: <span className="font-mono text-[10px]">{timeLeft}</span></span>
    </span>
  );
}

interface BillingHistoryProps {
  orders: POSOrder[];
  products: any[];
  onDeleteOrder: (orderId: string) => Promise<void>;
  onReturnVehicle: (productId: string, productName?: string, licensePlate?: string) => Promise<void>;
  loading: boolean;
}

export function BillingHistory({ orders, products, onDeleteOrder, onReturnVehicle, loading }: BillingHistoryProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deleteConfirmOrderId, setDeleteConfirmOrderId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  // Helper to parse items string safely
  const parseOrderItems = (itemsStr: string): ParsedItem[] => {
    try {
      return JSON.parse(itemsStr) as ParsedItem[];
    } catch {
      return [];
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getMethodBadge = (method: 'Cash' | 'Debit card' | 'QR') => {
    switch (method) {
      case 'Cash':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-950/40 text-orange-450 border border-orange-500/20 space-x-1">
            <Banknote className="w-3 h-3" />
            <span>CASH / เงินสด</span>
          </span>
        );
      case 'Debit card':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/40 text-blue-400 border border-blue-500/20 space-x-1">
            <CreditCard className="w-3 h-3" />
            <span>CARD / บัตร</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/40 text-purple-400 border border-purple-500/20 space-x-1">
            <ArrowRightLeft className="w-3 h-3" />
            <span>QR / พร้อมเพย์</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#05070a]/50 border border-white/10 rounded-3xl p-6 shadow-[0_15px_35px_rgba(0,0,0,0.4)]" id="billing-history-root">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.15)]">
          <Receipt className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Billing Logs Archive / ประวัติบิล</h3>
          <p className="text-[10px] text-slate-500 font-mono">Sync real-time collection: <span className="text-blue-500">rent car</span></p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500" id="history-loading">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          <span className="text-xs font-mono">Connecting Firestore Cluster...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2" id="history-empty">
          <AlertCircle className="w-8 h-8 text-slate-750" />
          <span className="text-xs font-bold text-slate-400">ยังไม่มีประวัติการทำรายการในฐานข้อมูล</span>
          <span className="text-[10px] text-slate-600 max-w-xs">ทดลองสั่งจองชุดเช่ารถยนต์แล้วกดปุ่ม "Add to Billing" เพื่อบันทึก</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-[460px] overflow-auto pr-1" id="history-list">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const parsedItems = parseOrderItems(order.items);

            return (
              <div 
                key={order.id} 
                className="border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all bg-[#05070a]"
                id={`order-block-${order.id}`}
              >
                {/* Accordion Trigger Header */}
                <div 
                  onClick={() => order.id && toggleExpand(order.id)}
                  className="p-4 flex items-center justify-between cursor-pointer active:bg-white/5 transition-all"
                >
                  <div className="space-y-2 text-left flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/40 border border-blue-500/20 px-1.5 py-0.5 rounded">
                        #{order.id?.slice(-6).toUpperCase()}
                      </span>
                      {getMethodBadge(order.paymentMethod)}
                      {order.customerName ? (
                        <span className="text-[10px] font-sans font-extrabold text-[#03e2ff] bg-cyan-950/45 border border-cyan-500/20 px-2.5 py-0.5 rounded flex items-center gap-1">
                          👤 ผู้ซื้อ/เช่า: {order.customerName}
                        </span>
                      ) : (
                        <span className="text-[10px] font-sans font-medium text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                          👤 ไม่ระบุนามผู้เช่า
                        </span>
                      )}
                      {parsedItems.length > 0 && (() => {
                        const allReturned = parsedItems.every((item) => {
                          const currentProduct = products.find(
                            (p) =>
                              p.id === item.productId ||
                              (item.licensePlate && p.licensePlate === item.licensePlate) ||
                              p.name === item.productName
                          );
                          return currentProduct ? currentProduct.status === 'In Stock' : false;
                        });
                        return (
                          <RentalCountdown 
                            createdAt={order.createdAt} 
                            days={Math.max(...parsedItems.map(i => i.quantity), 1)} 
                            isReturned={allReturned}
                          />
                        );
                      })()}
                    </div>
                    
                    {/* Display ชื่อรถ & ทะเบียนรถที่เช่า inside collapsed view */}
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4 text-slate-350 text-[11px]">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-slate-500 text-[10px] font-bold">พาหนะ:</span>
                        {parsedItems.map((item, idx) => (
                          <div key={idx} className="inline-flex items-center space-x-1.5 font-sans bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            <span className="text-[10px] font-bold text-slate-300 font-sans">{item.quantity} วัน</span>
                            <span className="font-extrabold text-white text-[11px]">{item.productName}</span>
                            {item.licensePlate ? (
                              <span className="text-[10px] font-mono font-black bg-blue-950/60 text-blue-400 border border-blue-500/10 px-1.5 py-0.2 rounded">
                                ทะเบียน: {item.licensePlate}
                              </span>
                            ) : (
                              <span className="text-[9px] font-sans text-slate-500 italic">ไม่มีทะเบียน</span>
                            )}
                            {idx < parsedItems.length - 1 && <span className="text-slate-600">,</span>}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center space-x-1 text-slate-500 text-[10px] font-mono">
                        <Calendar className="w-3 h-3 text-slate-650" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Total</span>
                      <span className="block font-black text-blue-400 text-sm font-mono leading-none">
                        ฿{order.totalAmount.toLocaleString('th-TH')}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (order.id) {
                          setDeleteConfirmOrderId(order.id);
                        }
                      }}
                      className="p-2 text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                      title="ลบบิลนี้ออกจาก Firestore"
                      id={`delete-btn-${order.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Extended Details Panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-slate-950/50 border-t border-white/5 font-sans" id={`order-expand-${order.id}`}>
                    <div className="mb-3 text-[9px] text-slate-550 font-mono flex flex-wrap justify-between gap-1 items-center bg-[#0a0f1d] p-2 rounded-lg border border-white/5">
                      <span>Operator: {order.userEmail}</span>
                      {order.customerName && (
                        <span className="text-[#03e2ff] font-sans font-extrabold bg-[#03e2ff]/10 px-2 py-0.5 rounded">
                          ผู้เช่า: {order.customerName}
                        </span>
                      )}
                      <span>UID: {order.userId.slice(0, 8)}...</span>
                    </div>

                    {/* Bill Items table inside history */}
                    <div className="space-y-2 border-t border-white/5 pt-2">
                      {parsedItems.map((item, idx) => {
                        const currentProduct = products.find(
                          (p) =>
                            p.id === item.productId ||
                            (item.licensePlate && p.licensePlate === item.licensePlate) ||
                            p.name === item.productName
                        );
                        const isCurrentlyInStock = currentProduct ? currentProduct.status === 'In Stock' : false;

                        return (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-350 font-sans py-1.5 border-b border-white/5 last:border-0 items-center">
                            <div className="flex items-center space-x-2">
                              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-400 text-[10px] font-mono font-bold">
                                {item.quantity} วัน
                              </span>
                              <span className="text-white font-bold">{item.productName}</span>
                              {item.licensePlate && (
                                <span className="text-[10px] font-mono bg-blue-950/50 text-blue-400 border border-blue-500/10 px-2 py-0.5 rounded font-black">
                                  ทะเบียนรถ: {item.licensePlate}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-3.5">
                              <span className="font-mono text-emerald-400 font-bold text-xs">฿{(item.productPrice * item.quantity).toLocaleString('th-TH')}</span>
                              {isCurrentlyInStock ? (
                                <span className="text-[9.5px] font-bold text-emerald-450 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded select-none">
                                  🟢 คืนรถแล้ว
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await onReturnVehicle(item.productId, item.productName, item.licensePlate);
                                  }}
                                  className="text-[9.5px] font-black tracking-wide text-[#03e2ff] bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-[0_2px_8px_rgba(3,226,255,0.1)] active:scale-95"
                                  title="ทำเรื่องคืนรถคันนี้ก่อนเวลากำหนด และปรับสถานะเป็นว่างทันที"
                                >
                                  ↩️ คืนรถก่อนเวลา
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Order Confirmation dialog overlay */}
      <AnimatePresence>
        {deleteConfirmOrderId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#05070a] border border-red-500/20 w-full max-w-sm rounded-[24px] p-6 shadow-[0_20px_50px_rgba(239,68,68,0.1)] text-center text-white font-sans animate-fade-in"
              id="order-delete-modal"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-200">
                ยืนยันการลบบิลประวัตินี้?
              </h3>

              <div className="bg-[#0a0f1d] border border-white/5 rounded-xl p-3 mb-4 text-left font-mono">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">เลขที่บิล:</div>
                <div className="text-xs font-black text-rose-400 truncate">
                  #{deleteConfirmOrderId.slice(-8).toUpperCase()}
                </div>
              </div>

              <p className="text-[10.5px] text-slate-400 mb-5 leading-relaxed">
                ข้อมูลการสั่งซื้อและธุรกรรมของบิลนี้จะถูกลบออกจากคอลเลกชัน <span className="text-red-400 font-bold">"rent car"</span> บน Firestore ถาวร
              </p>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOrderId(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-350 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = deleteConfirmOrderId;
                    setDeleteConfirmOrderId(null);
                    await onDeleteOrder(id);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-600/20"
                >
                  ยืนยันลบบิล
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
