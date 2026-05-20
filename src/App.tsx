import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase.js';

import { PRODUCTS } from './data/products.js';
import { CartItem, POSOrder, Product } from './types.js';

import { LoginScreen } from './components/LoginScreen.js';
import { ProductCard } from './components/ProductCard.js';
import { Lightbox } from './components/Lightbox.js';
import { BillingHistory } from './components/BillingHistory.js';
import { ManageProductsModal } from './components/ManageProductsModal.js';

import { 
  ShoppingBag, 
  ShoppingCart,
  Trash2, 
  Plus, 
  Minus, 
  ChevronRight, 
  CreditCard, 
  Banknote, 
  QrCode, 
  LogOut, 
  Clock, 
  User as UserIcon, 
  Search, 
  Database, 
  HeartHandshake, 
  Car, 
  Apple, 
  Coffee, 
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // POS State Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'salad' | 'beverage' | 'bakery' | 'car_rental'>('car_rental');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debit card' | 'QR'>('Cash');
  const [customerName, setCustomerName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLightboxProduct, setActiveLightboxProduct] = useState<Product | null>(null);

  // Firestore Saved Transaction states
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // App-specific Managed Custom Products states
  const [managedProducts, setManagedProducts] = useState<any[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Feedback notifications
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);

  // Time stamp timer for POS operator
  const [currentTime, setCurrentTime] = useState<string>('');

  // 1. Monitor Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemoMode(false);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Digital Clock in Thai Locale format
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok'
      };
      setCurrentTime(new Date().toLocaleTimeString('th-TH', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Real-time billing history synced to Firestore "rent car" collection
  useEffect(() => {
    if (isDemoMode) {
      setOrdersLoading(false);
      return;
    }
    
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    
    // We filter by current active operator's UID, and perform sorting in-memory
    // to prevent any complex Firestore Composite Index requirements.
    const q = query(
      collection(db, 'rent car'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const fetchedOrders: POSOrder[] = [];
        const fetchedProducts: any[] = [];
        snapshot.forEach((docRef) => {
          const data = docRef.data();
          if (data.type === 'product') {
            fetchedProducts.push({
              id: docRef.id,
              title: data.title || '',
              price: Number(data.price) || 0,
              unit: data.unit || 'วัน / Day',
              detail: data.detail || '',
              image: data.image || '',
              status: data.status || 'In Stock',
              engine: data.engine || '1',
              brakes: data.brakes || '1',
              transmission: data.transmission || '1',
              armor: data.armor || '1',
              turbo: data.turbo || '1',
              licensePlate: data.licensePlate || '',
              userId: data.userId || '',
              userEmail: data.userEmail || '',
              createdAt: data.createdAt || '',
              type: 'product'
            });
          } else {
            fetchedOrders.push({
              id: docRef.id,
              userId: data.userId || '',
              userEmail: data.userEmail || '',
              items: data.items || '[]',
              totalAmount: Number(data.totalAmount) || 0,
              paymentMethod: data.paymentMethod || 'Cash',
              customerName: data.customerName || '',
              createdAt: data.createdAt || '',
              status: data.status || 'completed'
            });
          }
        });

        // Safe in-memory sorting by createdAt descending
        fetchedOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        fetchedProducts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setOrders(fetchedOrders);
        setManagedProducts(fetchedProducts);
        setOrdersLoading(false);
      }, 
      (err) => {
        // Handle error correctly with our mandated format
        handleFirestoreError(err, OperationType.GET, 'rent car');
        setOrdersLoading(false);
        showError('ไม่สามารถโหลดข้อมูลจากคอลเลกชัน "rent car" ได้เนื่องจากสิทธิ์ความปลอดภัยในกฎ Rules');
      }
    );

    return () => unsubscribe();
  }, [user, isDemoMode]);

  // Toast notification triggers
  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4500);
  };

  // Switch to Offline Demo
  const handleStartDemo = () => {
    setIsDemoMode(true);
    setUser({
      uid: 'demo_user_id_999',
      email: 'guest.cashier@demo.th',
      displayName: 'ผู้ดำเนินการทดสอบฟรี',
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
      tenantId: null,
      refreshToken: ''
    } as any);
    showSuccess('สำเร็จ! ยินดีต้อนรับเข้าพักระบบออฟไลน์เดโมจำลอง');
  };

  // Sign out
  const handleSignOut = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setCart([]);
      setOrders([]);
      return;
    }
    try {
      await signOut(auth);
      setCart([]);
      setOrders([]);
      showSuccess('ออกจากระบบฐานบันทึกเรียบร้อย');
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาดในการนำบัญชีออก');
    }
  };

  // Adding items to POS Billing Cart
  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
    showSuccess(`เพิ่ม "${product.name}" ลงในรายการบิลแล้ว`);
  };

  // Decreasing or removing items
  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => {
      const item = prevCart.find((i) => i.product.id === productId);
      if (!item) return prevCart;
      
      if (item.quantity === 1) {
        return prevCart.filter((i) => i.product.id !== productId);
      }
      return prevCart.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  // Direct quantity updates
  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setShowClearCartConfirm(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setCustomerName('');
    setShowClearCartConfirm(false);
    showSuccess('ล้างรายการตะกร้ารถเช่าเป็นที่เรียบร้อย');
  };

  // Convert custom manageable products on FireStore into POS products list
  const dbProducts = useMemo(() => {
    return managedProducts.map((p) => ({
      id: p.id,
      name: p.title,
      nameEn: p.title,
      price: Number(p.price) || 0,
      category: 'car_rental' as const,
      description: p.detail || '',
      image: p.image || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600&auto=format&fit=crop',
      tooltip: `${p.unit} - ${p.status}`,
      status: p.status || 'In Stock',
      unit: p.unit || 'วัน / Day',
      engine: p.engine || '1',
      brakes: p.brakes || '1',
      transmission: p.transmission || '1',
      armor: p.armor || '1',
      turbo: p.turbo || '1',
      licensePlate: p.licensePlate || ''
    }));
  }, [managedProducts]);

  // Combine static fallback products and user db products
  const allProducts = useMemo(() => {
    return [...dbProducts, ...PRODUCTS];
  }, [dbProducts]);

  // Filter products by category & search string
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchesCategory = p.category === activeCategory;
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tooltip.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, activeCategory, searchQuery]);

  // Billing Math calculations
  const totalNet = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  // Commit Order to Firestore Collection "rent car"
  const handleCheckoutAndSave = async () => {
    if (cart.length === 0) {
      showError('กรุณาหยิบเลือกบริการเช่ารถลงบิลก่อนกดบันทึก');
      return;
    }

    if (!user) {
      showError('ไม่พบผู้เปิดเครื่องตรวจสิทธิ์การเข้าคีย์บิล กรุณาต่อเชื่อมใหม่อีกครั้ง');
      return;
    }

    if (customerName.trim() === '') {
      showError('กรุณาระบุรายชื่อผู้ซื้อ/ผู้เช่าก่อนทำรายการบันทึกบิล');
      return;
    }

    const orderData: Omit<POSOrder, 'id'> = {
      userId: user.uid,
      userEmail: user.email || 'guest@demo-mode.th',
      items: JSON.stringify(
        cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productPrice: item.product.price,
          quantity: item.quantity,
          category: item.product.category,
          licensePlate: item.product.licensePlate
        }))
      ),
      totalAmount: totalNet,
      paymentMethod: paymentMethod,
      customerName: customerName.trim(),
      createdAt: new Date().toISOString(),
      status: 'completed'
    };

    if (isDemoMode) {
      // Offline Simulation store
      const fakeDocId = 'DEMOID' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const offlineOrder: POSOrder = {
        id: fakeDocId,
        ...orderData
      };
      setOrders((prev) => [offlineOrder, ...prev]);

      // Update local managedProducts status to 'Sold Out' for rented cars
      setManagedProducts((prevProducts) =>
        prevProducts.map((p) => {
          const isRented = cart.some((item) => item.product.id === p.id);
          if (isRented) {
            return {
              ...p,
              status: 'Sold Out'
            };
          }
          return p;
        })
      );

      setCart([]);
      setCustomerName('');
      showSuccess(`บันทึกเช่ารถสำเร็จ (Offline) และเปลี่ยนสถานะรถที่เช่าเป็น "ไม่ว่าง" แล้ว!`);
      return;
    }

    // Persisted to real active cloud firebase collection: "rent car"
    try {
      await addDoc(collection(db, 'rent car'), orderData);
      
      // Update each rented car's status to 'Sold Out' in the Firestore collection "rent car"
      for (const item of cart) {
        if (item.product.id) {
          await updateDoc(doc(db, 'rent car', item.product.id), {
            status: 'Sold Out'
          });
        }
      }

      setCart([]);
      setCustomerName('');
      showSuccess('บันทึกทำรายการเช่าลงระบบเรียลไทม์สำเร็จ และเปลี่ยนสถานะรถที่เช่าในสต็อกเป็น "ไม่ว่าง" เรียบร้อยแล้ว!');
    } catch (err: any) {
      // Use standard error wrapper from guidelines
      handleFirestoreError(err, OperationType.WRITE, 'rent car');
      showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณารีเช็กกฎ Security Rules');
    }
  };

  // Delete Order Document from database
  const handleDeleteOrder = async (orderId: string) => {
    if (isDemoMode) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showSuccess('ลบรายการจำลองพ้นจากหน่วยเก็บชั่วคราวแล้ว');
      return;
    }

    try {
      await deleteDoc(doc(db, 'rent car', orderId));
      showSuccess(`ดึงเอกสาร #${orderId.slice(-4).toUpperCase()} ออกจาก Firestore สำเร็จ`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rent car/${orderId}`);
      showError('ไม่มีสิทธิ์ลบรายการนี้ กรุณาตรวจประเภท Auth ID ของบิล');
    }
  };

  // Return vehicle early and change status back to 'In Stock'
  const handleReturnVehicle = async (productId: string, productName?: string, licensePlate?: string) => {
    let targetId = productId;
    
    // Fallback lookup
    if (!targetId && (productName || licensePlate)) {
      const found = managedProducts.find(
        (p) => 
          (licensePlate && p.licensePlate === licensePlate) || 
          (productName && p.title === productName)
      );
      if (found) {
        targetId = found.id;
      }
    }

    if (!targetId) {
      showError('ไม่พบข้อมูลรถในระบบสต็อก จึงไม่สามารถเปลี่ยนสถานะได้');
      return;
    }

    if (isDemoMode) {
      setManagedProducts((prevProducts) =>
        prevProducts.map((p) => {
          if (p.id === targetId) {
            return {
              ...p,
              status: 'In Stock'
            };
          }
          return p;
        })
      );
      showSuccess('คืนรถเข้าระบบ (Demo) และปรับสถานะเป็น "ว่าง" สำเร็จ!');
      return;
    }

    try {
      await updateDoc(doc(db, 'rent car', targetId), {
        status: 'In Stock'
      });
      showSuccess('ทำการคืนรถก่อนเวลาเสร็จสิ้น และเปลี่ยนสถานะในสต็อกเป็น "ว่าง" เรียบร้อยแล้ว!');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `rent car/${targetId}`);
      showError('ไม่สามารถคืนรถได้เนื่องจากข้อจำกัดสิทธิ์ความปลอดภัยใน Firestore');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020408] flex-col space-y-4" id="app-auth-loading">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-blue-500/10 p-4 border border-blue-500/25 animate-spin">
            <svg className="h-10 w-10 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <span className="mt-4 text-blue-400 font-bold tracking-wider animate-bounce">กำลังตรวจสอบสิทธิ์หน้าแคชเชียร์...</span>
        </div>
      </div>
    );
  }

  // Under Unauthorized view redirect to Login Page
  if (!user && !isDemoMode) {
    return <LoginScreen onDemoLogin={handleStartDemo} />;
  }

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 flex flex-col font-sans select-none antialiased bg-[radial-gradient(circle_at_center,_#0a101f_0%,_#020408_100%)]" id="pos-application-root">
      
      {/* Dynamic Popups for Lightbox zooming */}
      <Lightbox 
        imageSrc={activeLightboxProduct ? activeLightboxProduct.image : null} 
        productName={activeLightboxProduct ? activeLightboxProduct.name : null}
        onClose={() => setActiveLightboxProduct(null)} 
      />

      {/* Cloud-integrated fleet management panel */}
      <ManageProductsModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        products={managedProducts}
        user={user}
        isDemoMode={isDemoMode}
        onShowSuccess={showSuccess}
        onShowError={showError}
      />

      {/* Modern Dashboard Header */}
      <header className="h-16 border-b border-white/10 bg-[#05070a] sticky top-0 z-40 px-6 flex items-center justify-between shrink-0" id="main-app-header">
        <div className="w-full flex items-center justify-between">
          
          {/* Logo brand and status info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <span className="font-bold italic text-white text-xs">RC</span>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold tracking-tight uppercase text-white leading-none">
                RentCar <span className="text-blue-500">PRO</span>
              </h1>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Operator: <span className="text-slate-300 font-mono">{user?.displayName || user?.email || 'Guest User'}</span>
              </span>
            </div>
          </div>

          {/* Quick status bar tools */}
          <div className="flex items-center gap-4">
            
            {/* Live timezone Clock */}
            <div className="hidden sm:flex bg-white/5 border border-white/10 px-3 py-1 rounded-lg items-center space-x-2 text-xs font-mono text-blue-400">
              <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>{currentTime || '12:55:00'} ICT</span>
            </div>

            {/* Project info matching theme */}
            <div className="hidden md:block text-right border-l border-white/10 pl-4 h-8 flex flex-col justify-center">
              <p className="text-[9px] text-slate-500 leading-none">Project ID</p>
              <p className="text-[11px] font-mono text-blue-400">rent-car-4fe00</p>
            </div>

            {/* Current Order/Cart toggle button */}
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-[0_0_10px_rgba(37,99,235,0.15)] relative ${
                isCartOpen 
                  ? 'border-blue-500/50 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20' 
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
              }`}
              id="header-cart-toggle-btn"
              title="เปิด/ปิด รายการเช่าในบิล (Toggle Cart)"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>บิลเช่ารถ ({cart.length} คัน / {cart.reduce((sum, item) => sum + item.quantity, 0)} วัน)</span>
            </button>

            {/* Fleet Management control toggle */}
            <button
              onClick={() => setIsManageOpen(true)}
              className="px-3 py-1.5 border border-blue-500/30 text-blue-400 bg-blue-600/10 hover:bg-blue-600/20 hover:text-blue-300 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-[0_0_10px_rgba(37,99,235,0.15)] md:animate-pulse"
              id="header-manage-btn"
            >
              <Car className="w-3.5 h-3.5 animate-pulse" />
              <span>จัดการรถเช่า (Manage Fleet)</span>
            </button>

            {/* Logout control operator button */}
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-500/30 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              id="header-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดลออกระบบ</span>
            </button>
          </div>

        </div>
      </header>

      {/* POS WORKSPACE GRID */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col overflow-hidden" id="pos-grid-container">
        
        {/* Dynamic Warning/Success Notification Banners with Immersive styling */}
        {successToast && (
          <div className="mb-4 p-3 bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs rounded-xl flex items-center space-x-2 shadow-[0_0_15px_rgba(37,99,235,0.15)] animate-fade-in" id="app-toast-success">
            <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {errorToast && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs rounded-xl flex items-center space-x-2 shadow-[0_0_15px_rgba(239,68,68,0.15)]" id="app-toast-error">
            <Info className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorToast}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT AREA: Categories & Products cards Grid */}
          <section className={`${isCartOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6 transition-all duration-300`}>
            
            {/* Horizontal Filter Navigation pills bar */}
            <div className="bg-[#05070a]/50 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
              <div className="flex bg-[#05070a] border border-white/5 p-1 rounded-xl overflow-x-auto w-full md:w-auto" id="category-navigation-pills">
                <div
                  className="flex items-center space-x-1.5 px-3 py-2 text-xs rounded-lg font-bold bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  id="tab-cat-car"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>บริการเช่ารถ (Car Rental Services)</span>
                </div>
              </div>

              {/* Incremental Product Keyword Filter search-box */}
              <div className="relative w-full md:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-550" />
                <input
                  type="text"
                  placeholder="ค้นหายานพาหนะ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#05070a] border border-white/10 p-2 pl-9 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  id="product-search-bar"
                />
              </div>
            </div>

            {/* Products grid cards display */}
            {filteredProducts.length === 0 ? (
              <div className="bg-[#05070a]/30 border border-white/5 rounded-3xl py-16 text-center text-slate-500 font-sans" id="no-products-display">
                <Search className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-400">ไม่พบรายการสินค้าที่ค้นหา</h4>
                <p className="text-xs text-slate-600 mt-1">ลองสลับประเภทสินค้าหรือระบุคำสำคัญอื่น</p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isCartOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4 transition-all duration-300`} id="products-cards-grid">
                {filteredProducts.map((p) => (
                  <ProductCard 
                     key={p.id} 
                     product={p} 
                     onAddToCart={handleAddToCart}
                     onImageClick={(prod) => setActiveLightboxProduct(prod)}
                  />
                ))}
              </div>
            )}

            {/* Active Operator billing historical log lists */}
            <BillingHistory 
              orders={orders} 
              products={allProducts}
              onDeleteOrder={handleDeleteOrder} 
              onReturnVehicle={handleReturnVehicle}
              loading={ordersLoading} 
            />

          </section>

          {/* RIGHT AREA: Bill, checkout methods selection */}
          {isCartOpen && (
            <aside className="lg:col-span-4 bg-[#05070a] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-[0_15px_50px_rgba(0,0,0,0.6)]" id="pos-billing-aside">
              
              {/* Title Section */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold tracking-wider uppercase text-slate-350">Current Order / บิลค้างชำระ</h3>
                </div>
                
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[10px] font-bold text-rose-450 hover:text-rose-400 flex items-center space-x-1 cursor-pointer"
                    id="clear-bill-btn"
                  >
                    <Trash2 className="w-3" />
                    <span>ล้างรายการ</span>
                  </button>
                )}
              </div>

              {/* Selected items body summary */}
              <div className="flex-grow p-5 min-h-[220px] max-h-[350px] overflow-auto" id="selected-items-row">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
                    <div className="bg-white/5 p-4 rounded-full mb-3 border border-white/5">
                      <ShoppingBag className="w-7 h-7 text-slate-600" />
                    </div>
                    <span className="font-bold block text-slate-400">ไม่มีรายการในบิลขณะนี้</span>
                    <p className="text-[10px] text-slate-600 mt-1 max-w-[180px]">เลือกบริการเช่ารถด้านซ้ายเพื่อประมวลราคา</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div 
                        key={item.product.id} 
                        className="flex items-center justify-between group border-b border-white/5 last:border-0 pb-3"
                        id={`cart-item-${item.product.id}`}
                      >
                        <div className="flex items-center space-x-3 w-1/2">
                          <img 
                            src={item.product.image} 
                            alt={item.product.name} 
                            className="w-10 h-10 rounded-xl object-cover bg-slate-900 border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="truncate-container text-left flex-1 min-w-0">
                            <h6 className="text-[11px] font-bold text-slate-205 truncate" title={item.product.name}>
                              {item.product.name}
                            </h6>
                            <span className="text-[9px] text-slate-500 font-mono tracking-wide block">
                              {item.product.price.toLocaleString('th-TH')} .-
                            </span>
                          </div>
                        </div>

                        {/* Interactive increment multipliers */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1 border border-white/10 rounded-lg p-0.5 bg-[#020408]">
                            <button 
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="p-1 hover:bg-white/5 rounded text-slate-400 transition cursor-pointer"
                              title="ลดลง 1 วัน"
                              id={`qty-minus-${item.product.id}`}
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                              className="w-7 text-center text-[11px] font-bold text-slate-200 bg-transparent py-0 focus:outline-none focus:ring-0 font-mono"
                              min="1"
                              id={`qty-input-${item.product.id}`}
                            />
                            <button 
                              onClick={() => {
                                const selectedProd = allProducts.find(p => p.id === item.product.id) || item.product;
                                handleAddToCart(selectedProd);
                              }}
                              className="p-1 hover:bg-white/5 rounded text-slate-400 transition cursor-pointer"
                              title="เพิ่มขึ้น 1 วัน"
                              id={`qty-plus-${item.product.id}`}
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">จำนวนวัน (Days)</span>
                        </div>

                        {/* Line total price */}
                        <div className="text-right w-1/4">
                          <span className="text-xs font-bold text-blue-400 font-mono">
                            {(item.product.price * item.quantity).toLocaleString('th-TH')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* NET CALCULATIONS FOOTER */}
              <div className="mt-auto bg-[#05070a] p-5 border-t border-white/10">
                
                {/* Grand Total display labels row */}
                <div className="flex justify-between items-end mb-4" id="total-calculations-tab">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total / ยอดสุทธิ</span>
                  <span className="text-xl font-black text-blue-400 font-mono shadow-blue-500/20">
                    ฿{totalNet.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* RENTER / CUSTOMER NAME INPUT FIELD */}
                <div className="mb-4">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Renter Name / รายชื่อผู้ซื้อ/เช่า *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 animate-pulse" />
                    <input
                      type="text"
                      placeholder="ระบุรายชื่อลูกค้าผู้ซื้อหรือผู้เช่า..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-white/5 pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-sans"
                      id="input-cart-customer-name"
                    />
                  </div>
                </div>

                {/* Payment Methods selector column pill options (Cash Only) */}
                <div className="mb-5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Payment Mode / ช่องทางชำระ (เงินสดอย่างเดียว)
                  </label>
                  <div className="relative bg-blue-600/10 border border-blue-500/30 p-3 rounded-xl flex items-center justify-center gap-2.5 text-blue-400 text-xs font-bold select-none">
                    <Banknote className="w-4 h-4 text-blue-400 animate-bounce" />
                    <span>CASH / ชำระด้วยเงินสด</span>
                  </div>
                </div>

                {/* Add to Billing primary Firestore trigger button */}
                <button
                  onClick={handleCheckoutAndSave}
                  disabled={cart.length === 0}
                  className={`w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 rounded-xl text-center text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.3)] ${cart.length === 0 ? 'opacity-35 cursor-not-allowed shadow-none' : ''}`}
                  id="pos-submit-checkout-btn"
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span>Add to Billing (บันทึก Firestore)</span>
                </button>

                <div className="flex items-center justify-center space-x-1 mt-2.5 text-[9px] text-slate-625 font-mono">
                  <HeartHandshake className="w-3 text-slate-700" />
                  <span>Sync secure with Cloud rent car document database</span>
                </div>
              </div>

            </aside>
          )}

        </div>
      </main>

      {/* Footer Status Bar matching Immersive UI design */}
      <footer className="h-8 border-t border-white/10 bg-[#05070a] px-6 flex items-center justify-between shrink-0 select-none mt-auto">
        <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse" />
            System Live Status Action
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">Collection: <span className="text-blue-500">rent car</span></span>
        </div>
        <div className="text-[9px] font-mono text-slate-500">
          v2.4.0-stable (Immersive Version)
        </div>
      </footer>

      {/* Clear Cart Confirmation Dialog overlay */}
      <AnimatePresence>
        {showClearCartConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#05070a] border border-red-500/20 w-full max-w-sm rounded-[24px] p-6 shadow-[0_20px_50px_rgba(239,68,68,0.1)] text-center text-white font-sans animate-fade-in"
              id="clear-cart-modal"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-200">
                ยืนยันการล้างตะกร้าสินค้า?
              </h3>

              <p className="text-[10.5px] text-slate-400 mb-5 leading-relaxed">
                รายการรถเช่าในตะกร้า POS ทั้งหมดและข้อมูลเสริมจะถูกล้างค่าออกเป็นศูนย์เพื่อคำนวณบิลถัดไป
              </p>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowClearCartConfirm(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-350 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="button"
                  onClick={confirmClearCart}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-650/20"
                >
                  ยืนยันล้างตะกร้า
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

