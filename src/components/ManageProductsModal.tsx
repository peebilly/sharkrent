import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Link2, 
  Sparkles, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Plus, 
  RotateCcw, 
  Car, 
  Database,
  Eye,
  Shield,
  Cpu,
  Zap,
  Disc,
  Settings
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.js';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface ManageProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  user: any;
  isDemoMode: boolean;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function ManageProductsModal({
  isOpen,
  onClose,
  products,
  user,
  isDemoMode,
  onShowSuccess,
  onShowError
}: ManageProductsModalProps) {
  // Mode: 'list' (shows list & Add button) or 'form' (for add/edit)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number>(1000);
  const [unit, setUnit] = useState('วัน / Day');
  const [detail, setDetail] = useState('');
  const [imageType, setImageType] = useState<'upload' | 'url'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadPreset, setUploadPreset] = useState('ml_default');
  const [status, setStatus] = useState<'In Stock' | 'Sold Out'>('In Stock');

  // Custom upgrade customization states (Levels 1-5 and Max)
  const [engine, setEngine] = useState<string>('1');
  const [brakes, setBrakes] = useState<string>('1');
  const [transmission, setTransmission] = useState<string>('1');
  const [armor, setArmor] = useState<string>('1');
  const [turbo, setTurbo] = useState<string>('1');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [deleteConfirmProd, setDeleteConfirmProd] = useState<any | null>(null);

  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop usability pattern
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const selectFileManual = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  // Cloudinary direct client-side upload
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/de3pzafko/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Cloudinary upload failed. Check preset name or cloud account settings.');
      }

      const data = await response.json();
      if (data.secure_url) {
        setImageUrl(data.secure_url);
        onShowSuccess('อัพโหลดรูปภาพขึ้น Cloudinary สำเร็จ!');
      } else {
        throw new Error('Invalid upload response from Cloudinary.');
      }
    } catch (err: any) {
      console.error(err);
      onShowError(err.message || 'การเชื่อมต่อ Cloudinary ล้มเหลว ปรับปรุง Preset หรือแก้ไขด้วย Link รูปภาพแทน');
    } finally {
      setUploading(false);
    }
  };

  // Reset form status
  const resetForm = () => {
    setTitle('');
    setPrice(1000);
    setUnit('วัน / Day');
    setDetail('');
    setImageUrl('');
    setImageType('url');
    setStatus('In Stock');
    setEngine('1');
    setBrakes('1');
    setTransmission('1');
    setArmor('1');
    setTurbo('1');
    setLicensePlate('');
    setEditingProduct(null);
  };

  const openAddForm = () => {
    resetForm();
    setViewMode('form');
  };

  const openEditForm = (prod: any) => {
    setEditingProduct(prod);
    setTitle(prod.title || '');
    setPrice(prod.price || 0);
    setUnit(prod.unit || 'วัน / Day');
    setDetail(prod.detail || '');
    setImageUrl(prod.image || '');
    setImageType((prod.image && prod.image.startsWith('http')) ? 'url' : 'url'); // Fallback to URL mode
    setStatus(prod.status || 'In Stock');
    setEngine(prod.engine || '1');
    setBrakes(prod.brakes || '1');
    setTransmission(prod.transmission || '1');
    setArmor(prod.armor || '1');
    setTurbo(prod.turbo || '1');
    setLicensePlate(prod.licensePlate || '');
    setViewMode('form');
  };

  // Save changes (Add / Edit) inside "rent car" collection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onShowError('กรุณากรอกชื่อสเปครถยนต์');
      return;
    }
    if (!imageUrl.trim()) {
      onShowError('กรุณาอัพโหลดรูปภาพหรือกรอก URL รูปภาพ');
      return;
    }

    setIsSubmitting(true);

    const productDoc = {
      type: 'product',
      title: title.trim(),
      price: Number(price) || 0,
      unit: unit.trim(),
      detail: detail.trim(),
      image: imageUrl.trim(),
      status: status,
      engine: engine,
      brakes: brakes,
      transmission: transmission,
      armor: armor,
      turbo: turbo,
      licensePlate: licensePlate.trim(),
      userId: user?.uid || 'demo_user_id_999',
      userEmail: user?.email || 'guest@demo-mode.th',
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
    };

    if (isDemoMode) {
      // Simulation mode
      onShowSuccess(`[Demo] บันทึกข้อมูลรถยนต์ "${title}" สำเร็จ!`);
      setViewMode('list');
      setIsSubmitting(false);
      resetForm();
      return;
    }

    try {
      if (editingProduct) {
        // Edit flow
        const docRef = doc(db, 'rent car', editingProduct.id);
        await updateDoc(docRef, productDoc);
        onShowSuccess(`อัพเดตสเปครถยนต์ "${title}" เรียบร้อย!`);
      } else {
        // Add flow
        await addDoc(collection(db, 'rent car'), productDoc);
        onShowSuccess(`เพิ่มข้อมูลรถเช่า "${title}" บันทึกสู่ Firestore สำเร็จ!`);
      }
      setViewMode('list');
      resetForm();
    } catch (err: any) {
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'rent car');
      onShowError('ไม่สามารถเซฟข้อมูลได้เนื่องจากมีข้อขัดแย้งของกฎคีย์ Rules');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initiate Delete product sequence (show modal)
  const handleDeleteProduct = (prod: any) => {
    setDeleteConfirmProd(prod);
  };

  // Perform actual deletion after confirmation
  const confirmDeleteProduct = async () => {
    if (!deleteConfirmProd) return;
    const prodId = deleteConfirmProd.id;
    const titleToDelete = deleteConfirmProd.title || 'รายการรถ';

    setDeleteConfirmProd(null);

    if (isDemoMode) {
      onShowSuccess(`[Demo] ลบรายการสินค้าสำเร็จ!`);
      return;
    }

    try {
      await deleteDoc(doc(db, 'rent car', prodId));
      onShowSuccess(`ดึงข้อมูลรถ "${titleToDelete}" ออกจากระบบสำเร็จ`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `rent car/${prodId}`);
      onShowError('ไม่มีสิทธิ์ลบรายการนี้');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#05070a] border border-white/10 w-full max-w-3xl rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]"
          id="manage-products-modal-container"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#080d1a]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl">
                <Car className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Manage Fleet Inventory / จัดการรถเช่า
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Sync secure with Cloud: <span className="text-blue-500">rent car</span>
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              id="close-manage-products-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Wrapper */}
          <div className="flex-grow overflow-y-auto p-6 text-left">
            {viewMode === 'list' ? (
              <div className="space-y-6">
                {/* List Action Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400">รายการรถที่มีในระบบคลาวด์ขณะนี้ ({products.length} คัน)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">กดแก้ไขรายละเอียดหรือเพิ่มรถใหม่เข้าพอร์ตสเปค</p>
                  </div>
                  <button
                    onClick={openAddForm}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
                    id="add-new-car-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มรถเช่าใหม่ (Add Car)</span>
                  </button>
                </div>

                {/* Products Table/List */}
                {products.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/2">
                    <Database className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400 font-bold">ยังไม่พบรถเช่าที่คุณอัพโหลดขึ้น Firestore</p>
                    <p className="text-[10px] text-slate-600 mt-1 max-w-xs mx-auto">ลองกด "เพิ่มรถเช่าใหม่" สำหรับกำหนดราคา อัพโหลด สเปครถของคุณให้ระบบ POS บันทึก</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((prod) => (
                      <div 
                        key={prod.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#0a101f]/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all gap-4"
                        id={`manage-item-${prod.id}`}
                      >
                        {/* Thumbnail / Specs */}
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <img 
                            src={prod.image} 
                            alt={prod.title} 
                            className="w-14 h-10 object-cover rounded-lg bg-slate-900 border border-white/10 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="truncate-container flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="text-xs font-black text-white truncate">{prod.title}</h5>
                              {prod.licensePlate && (
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono bg-blue-950/60 text-blue-400 border border-blue-500/20 font-bold uppercase">
                                  ทะเบียน: {prod.licensePlate}
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${prod.status === 'Sold Out' ? 'bg-rose-950/60 text-rose-400 border border-rose-500/20' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'}`}>
                                {prod.status === 'Sold Out' ? 'หมด / Sold' : 'ว่าง / In Stock'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              ฿{prod.price?.toLocaleString()} .- / {prod.unit || 'วัน'}
                            </span>
                            <p className="text-[10.5px] text-slate-400 line-clamp-1 mt-0.5" title={prod.detail}>{prod.detail}</p>
                          </div>
                        </div>

                        {/* Config Actions */}
                        <div className="flex items-center space-x-2 border-t border-white/5 sm:border-0 pt-3 sm:pt-0 w-full sm:w-auto justify-end shrink-0">
                          <button
                            onClick={() => openEditForm(prod)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950/20 rounded-xl border border-white/5 transition cursor-pointer"
                            title="แก้ไขรายละเอียด"
                            id={`edit-car-${prod.id}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-xl border border-white/5 transition cursor-pointer"
                            title="ลบตัวเลือกนี้"
                            id={`delete-car-${prod.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Add & Edit Product form view */
              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in" id="add-edit-car-form">
                <div className="bg-[#0a101f]/30 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      {editingProduct ? 'Edit Details / แก้ไขสเปคยานพาหนะ' : 'Add New Member / เพิ่มข้อมูลรุ่นจำหน่าย'}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">กรอกคุณสมบัติเพื่อผลักเก็บเข้าคอลเลกชัน "rent car"</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-bold rounded-xl transition cursor-pointer"
                    id="cancel-form-btn"
                  >
                    กลับถ้อยความสารบัญ
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Specs fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                          Vehicle Variant (ชื่อรถยนต์และสป็ค) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น บริการเช่ารถ Honda Civic 2024"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full bg-[#05070a] border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                          id="form-input-title"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                          Plate (ทะเบียนรถ)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น กข 123 กรุงเทพ"
                          value={licensePlate}
                          onChange={(e) => setLicensePlate(e.target.value)}
                          className="w-full bg-[#05070a] border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                          id="form-input-licenseplate"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                          Price (ราคาเช่า) *
                        </label>
                        <input
                          type="number"
                          required
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full bg-[#05070a] border border-white/10 p-2.5 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                          id="form-input-price"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                          Pricing Unit (หน่วยเช่า) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="วัน / Day, ชม. / Hour"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full bg-[#05070a] border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                          id="form-input-unit"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                        Availability Status (สถานะการเช่า)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStatus('In Stock')}
                          className={`p-2 rounded-xl text-xs font-bold border transition ${status === 'In Stock' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-black' : 'bg-white/5 border-white/5 text-slate-400'}`}
                        >
                          In Stock / ว่าง
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus('Sold Out')}
                          className={`p-2 rounded-xl text-xs font-bold border transition ${status === 'Sold Out' ? 'bg-rose-950/40 border-rose-500 text-rose-400 font-black' : 'bg-white/5 border-white/5 text-slate-400'}`}
                        >
                          Sold Out / ไม่ว่าง
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Image/Uploader fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                        Product Details / รายละเอียดสเปครถยนต์
                      </label>
                      <textarea
                        rows={3}
                        placeholder="ระบุสเปครถยนต์ เช่น สมรรถภาพเครื่องยนต์, ระบบเกียร์, จำนวนที่นั่ง..."
                        value={detail}
                        onChange={(e) => setDetail(e.target.value)}
                        className="w-full bg-[#05070a] border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                        id="form-input-detail"
                      />
                    </div>

                    {/* Image setup type selectors */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Vehicle Image (รูปภาพ) *
                        </label>
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 text-[9px]">
                          <button
                            type="button"
                            onClick={() => setImageType('url')}
                            className={`px-2 py-1 rounded transition ${imageType === 'url' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                          >
                            Image Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageType('upload')}
                            className={`px-2 py-1 rounded transition ${imageType === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                          >
                            Cloudinary File
                          </button>
                        </div>
                      </div>

                      {imageType === 'url' ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="วางลิงก์รูปภาพ เช่น https://images.unsplash.com/..."
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full bg-[#05070a] border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                            id="form-input-imageurl"
                          />
                          <p className="text-[9px] text-slate-500 leading-normal">
                            สามารถใช้ลิงก์ภาพพรีโหลดจาก Unsplash หรือวาง URL เพื่อความรวดเร็ว
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 mb-1.5">
                            <span className="text-[10px] text-slate-500 font-mono flex items-center shrink-0">Preset:</span>
                            <input
                              type="text"
                              value={uploadPreset}
                              onChange={(e) => setUploadPreset(e.target.value)}
                              className="bg-[#05070a] border border-white/10 px-2 py-0.5 rounded text-[10px] text-blue-400 font-mono w-full focus:outline-none focus:border-blue-500"
                              title="Unsigned preset needed in Cloudinary dashboard (e.g. ml_default)"
                            />
                          </div>

                          {/* Drag and Drop Zone Area */}
                          <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={selectFileManual}
                            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${dragActive ? 'border-blue-500 bg-blue-950/10' : 'border-white/10 hover:border-blue-500/50 bg-[#05070a]/50'}`}
                          >
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileChange} 
                              accept="image/*" 
                              className="hidden" 
                            />
                            {uploading ? (
                              <div className="flex flex-col items-center justify-center space-y-1 py-1.5">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                                <span className="text-[10px] font-mono text-slate-400">Uploading to de3pzafko...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center space-y-1.5 text-slate-400">
                                <Upload className="w-5 h-5 text-blue-400" />
                                <span className="text-[11px] font-bold">วางไฟล์ภาพที่นี่ หรือกดเพื่อเลือกอัพโหลด</span>
                                <span className="text-[8px] font-mono text-slate-600">Cloud: de3pzafko</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* VEHICLE UPGRADES & CUSTOMIZATION (1-5 & Max) */}
                <div className="bg-[#0a101f]/25 border border-white/5 p-4 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                        CUSTOMIZATION LEVELS / อัพเกรดสมรรถนะตัวรถ (1-5 & Max)
                      </h4>
                      <p className="text-[10px] text-slate-500">เลือกช่วงระดับชุดแต่งของระบบยานยนต์แต่ละประเภท</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    {/* ENGINE UPGRADE LEVEL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Cpu className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Engine (เครื่องยนต์)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['1', '2', '3', '4', '5', 'Max'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setEngine(lvl)}
                            className={`px-1.5 py-1 text-[9.5px] font-mono rounded font-bold transition-all border shrink-0 cursor-pointer ${
                              engine === lvl
                                ? lvl === 'Max' ? 'bg-amber-500 text-black border-amber-400 font-extrabold scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-blue-600 border-blue-500 text-white scale-105'
                                : 'bg-[#05070a]/85 border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* BRAKES UPGRADE LEVEL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Disc className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Brakes (ระบบเบรค)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['1', '2', '3', '4', '5', 'Max'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setBrakes(lvl)}
                            className={`px-1.5 py-1 text-[9.5px] font-mono rounded font-bold transition-all border shrink-0 cursor-pointer ${
                              brakes === lvl
                                ? lvl === 'Max' ? 'bg-amber-500 text-black border-amber-400 font-extrabold scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-blue-600 border-blue-500 text-white scale-105'
                                : 'bg-[#05070a]/85 border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TRANSMISSION UPGRADE LEVEL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Settings className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Transmission (เกียร์)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['1', '2', '3', '4', '5', 'Max'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setTransmission(lvl)}
                            className={`px-1.5 py-1 text-[9.5px] font-mono rounded font-bold transition-all border shrink-0 cursor-pointer ${
                              transmission === lvl
                                ? lvl === 'Max' ? 'bg-amber-500 text-black border-amber-400 font-extrabold scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-blue-600 border-blue-500 text-white scale-105'
                                : 'bg-[#05070a]/85 border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ARMOR UPGRADE LEVEL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Shield className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Armor (เกราะกำบัง)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['1', '2', '3', '4', '5', 'Max'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setArmor(lvl)}
                            className={`px-1.5 py-1 text-[9.5px] font-mono rounded font-bold transition-all border shrink-0 cursor-pointer ${
                              armor === lvl
                                ? lvl === 'Max' ? 'bg-amber-500 text-black border-amber-400 font-extrabold scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-blue-600 border-blue-500 text-white scale-105'
                                : 'bg-[#05070a]/85 border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TURBO UPGRADE LEVEL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Turbo (เทอร์โบพ่วง)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['1', '2', '3', '4', '5', 'Max'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setTurbo(lvl)}
                            className={`px-1.5 py-1 text-[9.5px] font-mono rounded font-bold transition-all border shrink-0 cursor-pointer ${
                              turbo === lvl
                                ? lvl === 'Max' ? 'bg-amber-500 text-black border-amber-400 font-extrabold scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-blue-600 border-blue-500 text-white scale-105'
                                : 'bg-[#05070a]/85 border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Local Pre-rendered Preview */}
                {imageUrl && (
                  <div className="p-3 bg-white/2 rounded-2xl border border-white/5 flex items-center space-x-3">
                    <img 
                      src={imageUrl} 
                      alt="Local Preview" 
                      className="w-14 h-10 object-cover rounded-lg border border-white/10 bg-slate-900"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[10px] text-left truncate-container flex-1 min-w-0">
                      <span className="font-bold text-slate-400 block mb-0.5">Image Selected / ลิงก์รูปสำเร็จ</span>
                      <span className="font-mono text-blue-400 break-all line-clamp-2 leading-tight">{imageUrl}</span>
                    </div>
                  </div>
                )}

                {/* Submitting Buttons Zone */}
                <div className="pt-2 border-t border-white/10 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1"
                    title="ล้างข้อมูลร่าง"
                  >
                    <RotateCcw className="w-3" />
                    <span>รีเซ็ต (Reset)</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || uploading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-[0_4px_15px_rgba(37,99,235,0.4)] cursor-pointer flex items-center space-x-1.5"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>{editingProduct ? 'อัพเดตรายละเอียด (Update)' : 'บันทึกเข้า Firestore (Save)'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>

        {/* Custom Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmProd && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#05070a] border border-red-500/20 w-full max-w-sm rounded-[24px] p-6 shadow-[0_20px_50px_rgba(239,68,68,0.1)] text-center text-white"
                id="delete-confirmation-dialog"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-200">
                  ยืนยันการลบตัวเลือกยานพาหนะ?
                </h3>
                
                <div className="bg-[#0a0f1d] border border-white/5 rounded-xl p-3 mb-4 text-left">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">ชื่อรถที่จะลบ:</div>
                  <div className="text-xs font-black text-rose-400 truncate mb-1">{deleteConfirmProd.title}</div>
                  {deleteConfirmProd.licensePlate && (
                    <div className="flex items-center space-x-1">
                      <span className="text-[9.5px] font-mono bg-blue-950/60 text-blue-400 border border-blue-500/10 px-1.5 py-0.5 rounded uppercase font-bold">
                        ทะเบียน: {deleteConfirmProd.licensePlate}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[10.5px] text-slate-400 mb-5 leading-relaxed">
                  การดำเนินการนี้จะดึงข้อมูลรถออกจากระบบ <span className="text-red-400 font-bold">"rent car"</span> บน Cloud Firestore ทันทีและไม่สามารถแลกคืนได้
                </p>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmProd(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-350 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
                  >
                    ยกเลิก (Cancel)
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteProduct}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-600/20"
                    id="confirm-delete-btn"
                  >
                    ยืนยันลบข้อมูล
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
