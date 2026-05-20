import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { LogIn, UserPlus, ShieldAlert, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onDemoLogin: () => void;
}

export function LoginScreen({ onDemoLogin }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let translation = err.message;
      if (err.code === 'auth/email-already-in-use') {
        translation = 'อีเมลนี้ถูกใช้งานในระบบแล้ว';
      } else if (err.code === 'auth/invalid-email') {
        translation = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (err.code === 'auth/weak-password') {
        translation = 'รหัสผ่านคาดเดาง่ายเกินไป รหัสต้องมีอย่างน้อย 6 อักษร';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        translation = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      }
      setError(translation);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#020408] font-sans text-slate-200" id="login-screen-root">
      {/* Visual Banner Left Side (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-[#0a101f] via-[#05070a] to-[#0f172a] relative overflow-hidden flex-col justify-between p-12 text-white border-r border-white/10">
        <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200')" }} />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        
        {/* Top bar info */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)]">
            <span className="font-bold italic text-white text-sm">RC</span>
          </div>
          <span className="font-extrabold tracking-widest text-xl uppercase font-sans">
            RentCar <span className="text-blue-500">PRO</span>
          </span>
        </div>

        {/* Dynamic description in target language */}
        <div className="relative z-10 my-auto pr-8">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight mb-6 tracking-tight text-white">
            นวัตกรรมระบบ POS <br />
            จัดการระบบเช่ารถหรูพรีเมียม
          </h1>
          <p className="text-base text-slate-400 mb-8 max-w-lg leading-relaxed">
            ระบบจัดการบริการจองรถยนต์และพาหนะเช่าส่วนบุคคลระดับพรีเมียม 
            จัดเก็บลงสู่ฐานข้อมูลหลัก Firestore พร้อมโครงสร้างความปลอดภัย Rules แข็งแกร่ง
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <span className="block text-xl font-bold text-blue-400">Fast & Realtime</span>
              <span className="text-xs text-slate-400">ซิงค์บิลและสถิติด้วยโมเดล Firestore ทันที</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <span className="block text-xl font-bold text-emerald-400">Security Rules</span>
              <span className="text-xs text-slate-400">ควบคุมสิทธิ์เจ้าของคีย์อย่างแม่นยำ</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-slate-500 text-xs font-mono">
          © 2026 rent-car-4fe00 / POS Car Rental Co.
        </div>
      </div>

      {/* Login Form Form Container Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[radial-gradient(circle_at_center,_#0a101f_0%,_#020408_100%)]">
        <div className="w-full max-w-md bg-[#0d1117] p-8 md:p-10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 transition-all duration-300">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-2">
              {isSignUp ? 'สร้างบัญชีผู้ใช้งานใหม่' : 'Sign In to POS Dashboard'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              {isSignUp ? 'กรอกรายละเอียดเพื่อเริ่มต้นจัดการ POS' : 'กรุณาลงชื่อเข้าใช้เพื่อเปิดระบบจัดการลิสต์สินค้าและรถเช่า'}
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-[#05070a] rounded-xl p-1 mb-6 border border-white/5">
            <button
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${!isSignUp ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-slate-200'}`}
              id="tab-signin-btn"
            >
              เข้าสู่ระบบ (Sign In)
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${isSignUp ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-slate-200'}`}
              id="tab-signup-btn"
            >
              สมัครสมาชิก (Sign Up)
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-xl flex items-start space-x-3 text-rose-300 text-xs" id="auth-error-box">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
              <div>
                <span className="font-bold block text-rose-200">เกิดข้อผิดพลาดในการตรวจสอบ</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  ชื่อ-นามสกุลทางการค้า
                </label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย มีสุข"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-3 bg-[#05070a] border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all"
                  id="signup-name-input"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                ที่อยู่อีเมล (Email Address)
              </label>
              <input
                type="email"
                required
                placeholder="admin@yourstore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-[#05070a] border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
                id="auth-email-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[#05070a] border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
                id="auth-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.3)] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              id="submit-auth-btn"
            >
              {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>{loading ? 'กำลังเข้ารหัสคีย์...' : isSignUp ? 'ดำเนินการสร้างบัญชีหลัก' : 'ล๊อกอินเข้าระบบ'}</span>
            </button>
          </form>

          {/* Divider line */}
          <div className="my-6 relative flex items-center justify-center text-[10px] uppercase font-bold tracking-wider text-slate-500">
            <div className="absolute inset-x-0 h-px bg-white/5" />
            <span className="relative bg-[#0d1117] px-3 z-10">Or connect via</span>
          </div>

          <div className="space-y-3">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-105 text-black py-3 px-4 rounded-xl flex items-center justify-center space-x-3 text-xs font-bold transition-all cursor-pointer shadow-md"
              id="google-signin-btn"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3h3.86c2.26-2.09 3.56-5.17 3.56-8.75z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.33v3.1A11.983 11.983 0 0012 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.24 14.24a7.21 7.21 0 010-4.48V6.66H1.33a11.981 11.981 0 000 10.68l3.91-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.33 0 3.31 2.67 1.33 6.66l3.91 3.1c.95-2.88 3.61-5.01 6.76-5.01z"
                />
              </svg>
              <span>ลงเครื่องเข้าทำงานด้วย Google ACC</span>
            </button>

            {/* Offline Demo Button fallback */}
            <button
              onClick={onDemoLogin}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-400 py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-[10px] font-semibold transition-all cursor-pointer border border-white/5"
              id="demo-signin-btn"
            >
              <span>ทดลองโหมดปิดเน็ต (Offline Sandbox Guest)</span>
            </button>
          </div>
          
          <div className="mt-8 text-center text-[10px] text-slate-600 font-mono">
            Authorized Personnel only. <br />
            Firestore: rent car (rent-car-4fe00)
          </div>

        </div>
      </div>
    </div>
  );
}
