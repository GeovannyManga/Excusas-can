import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURACIÓN DE SERVICIOS ---
const SUPABASE_URL = "https://rirvxgtybkagcqfbhqng.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcnZ4Z3R5YmthZ2NxZmJocW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDk4MjgsImV4cCI6MjA4NTc4NTgyOH0.B-TJ1dUZz5huItFVgnYLzu9TjNnsvtLnQ0DrgQybXB8";

// ⚠️ API KEY GEMINI
const apiKey = "AIzaSyBTk-VHMKXPGmAQTnxSMs5eoXGBgZRQpKc";

const COLORS = {
  red: '#C61D23',
  gold: '#D4AF37',
  teal: '#56A3B1',
  navy: '#1A2A44'
};

// --- UTILIDADES ---

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

// LÓGICA DE I.A. (MODO ESTRICTO)
const validateWithGemini = async (base64Data, mimeType, type) => {
  if (!apiKey) return { valid: true, reason: "Sin API Key - Validación simulada (Aprobado)" };

  let promptText = "";
  if (type === 'medical') {
    promptText = "Analiza esta imagen buscando un certificado médico. REGLAS ESTRICTAS: 1. Debe verse un logo de clínica/hospital o un sello médico. 2. Si es solo texto plano sin formato oficial, recházalo. Responde JSON: { 'valid': boolean, 'reason': 'string' }.";
  } else if (type === 'human_check') {
    promptText = "Analiza esta imagen. ¿Contiene clara y visiblemente el rostro de una persona real? No aceptes dibujos ni objetos. Responde JSON: { 'valid': boolean, 'reason': 'string' }";
  } else {
    promptText = "Analiza esta imagen de una excusa escolar. TU MISIÓN ES DETECTAR UNA FIRMA REAL. Reglas: 1. Busca trazos de bolígrafo (firma manuscrita) o un SELLO institucional. 2. Si el documento es solo texto impreso por computadora SIN ninguna firma manual o digital visible, DEBES RESPONDER 'valid': false. 3. Ignora documentos en blanco o irrelevantes. Responde estrictamente JSON: { 'valid': boolean, 'reason': 'Breve explicación del fallo o éxito' }.";
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType: mimeType, data: base64Data } }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );
    if (!response.ok) throw new Error("Error API I.A.");
    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(textResult);
  } catch (error) {
    console.error("Error Gemini:", error);
    return { valid: true, reason: "Validación técnica omitida (Error Conexión)." };
  }
};

const getStudentAlerts = (excusesList, studentName) => {
  if (!excusesList || excusesList.length === 0) return { uniformAlert: false, absenceAlert: false };
  const studentExcuses = excusesList.filter(e => e.student_name === studentName);
  const now = new Date();
  const uniformCount = studentExcuses.filter(e => e.type === 'uniform' && (now - new Date(e.created_at)) < 1296000000).length;
  const absenceCount = studentExcuses.filter(e => e.type === 'absence' && (now - new Date(e.created_at)) < 2592000000).length;
  return { uniformAlert: uniformCount > 3, absenceAlert: absenceCount > 3 };
};

const getTardinessCount = (tardiesList, studentName) => {
  if (!tardiesList) return 0;
  return tardiesList.filter(t => t.student_name === studentName).length;
};

// --- COMPONENTES UI ---

const CountdownTimer = ({ startDate }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDate).getTime();
      const deadline = start + 259200000;
      const now = new Date().getTime();
      if (deadline - now < 0) { setExpired(true); setTimeLeft("FINALIZADO"); }
      else {
        const days = Math.floor((deadline - now) / (1000 * 60 * 60 * 24));
        const hours = Math.floor(((deadline - now) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`${days}d ${hours}h`);
      }
    };
    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, [startDate]);
  return (
    <div className={`mt-2 p-2 rounded-lg border-l-4 flex items-center justify-between text-[10px] ${expired ? 'bg-slate-100 border-slate-400' : 'bg-blue-50 border-blue-500'}`}>
      <div><span className="font-bold text-slate-500 block">PLAZO</span><span className={`font-black font-mono text-xs ${expired ? 'text-slate-400' : 'text-blue-700'}`}>{timeLeft}</span></div>
    </div>
  );
};

// Iconos seguros (Sintaxis JSX corregida con <g> wrappers)
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    logo: (<g><path d="M12 2L2 6v10l10 6 10-6V6L12 2z" fill={COLORS.red} /><path d="M12 4L4 7.2v7.6l8 4.8 8-4.8V7.2L12 4z" fill={COLORS.gold} /><path d="M12 5.5L5.5 8.1v6.3l6.5 3.9 6.5-3.9V8.1L12 5.5z" fill={COLORS.teal} /><path d="M11 12.5c0 .5.5 1 1 1s1-.5 1-1-.5-1-1-1-1 .5-1 1zM10 14h4v.5h-4z" fill={COLORS.navy} /></g>),
    check: <path d="M20 6 9 17l-5-5" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    info: <g><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></g>,
    send: <path d="m22 2-7 20-4-9-9-4Z" />,
    clock: <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />,
    logout: <g><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></g>,
    users: <g><circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87" /></g>,
    user: <g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></g>,
    plus: <path d="M12 5v14M5 12h14" />,
    eye: <path d="M2 12s3-7 10-7 10 7 10 7-10 7-10 7-10-7Z" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    ai: <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM2 12a10 10 0 1 1 20 0 10 10 0 0 1-20 0zm10 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />,
    download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
    camera: <g><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></g>,
    folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
    heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
    medical: <path d="M12 2a3 3 0 0 0-3 3v2H7a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3h-2V5a3 3 0 0 0-3-3zM8 14h8M12 10v8" />,
    refresh: <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />,
    lock: <path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2Zm-7-7a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />,
    bulb: <path d="M12 2a6 6 0 0 1 6 6c0 2.2-1.5 4.3-3.5 5.2l-1 4.8h-3l-1-4.8A5.96 5.96 0 0 1 6 8a6 6 0 0 1 6-6Z" />,
    arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
    arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />
  };
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{icons[name] || icons.info}</svg>;
};

const GRADES = ["Jardín", "Transición", "1°", "2°", "3°", "4°", "5°A", "5°B", "6°A", "6°B", "7°A", "7°B", "8°A", "8°B", "9°A", "9°B", "10°A", "10°B", "11°A", "11°B"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const WelcomeAnimation = ({ name }) => (
  <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
    <div className="mb-6 animate-bounce">
      <Icon name="logo" size={80} />
    </div>
    <h1 className="text-3xl font-black text-navy text-center mb-2">¡Bienvenido!</h1>
    <p className="text-xl text-slate-500 font-medium animate-pulse">{name}</p>
    <div className="mt-8 w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-teal-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
    </div>
  </div>
);

// --- CONFIGURACIÓN DEL TOUR (EXTERNA) ---
const TOUR_CONTENT = {
  parent: [
    { title: "¡Bienvenido/a!", text: "Te damos la bienvenida a la plataforma de excusas del COLEGIO ADVENTISTA DEL NORTE. Aquí podrás gestionar los reportes escolares de tu hijo/a de forma fácil y rápida.", icon: "logo" },
    { title: "Reportar Novedades", text: "Usa el botón 'NUEVA EXCUSA' para reportar inasistencias, citas médicas o llegadas tarde. ¡Es el primer paso!", icon: "plus" },
    { title: "Organización por Opciones", text: "Ahora tienes pestañas para ver todo ordenado: 'Excusas', 'Tardanzas' y 'Enfermería'. Selecciona una para filtrar la información.", icon: "folder" },
    { title: "Códigos de Seguridad", text: "Para mayor seguridad, te pediremos un código que aparecerá en pantalla antes de enviar ciertos reportes.", icon: "lock" }
  ],
  teacher: [
    { title: "¡Bienvenido Profe!", text: "Esta es tu herramienta para gestionar las novedades de tus estudiantes y del colegio.", icon: "logo" },
    { title: "Panel de Docente", text: "Navega entre las pestañas superiores para ver Excusas, Tardanzas y Reportes de Enfermería.", icon: "folder" },
    { title: "Filtros de Curso", text: "Puedes ver solo los reportes de tu dirección de grupo o filtrar para ver todo el colegio si lo necesitas.", icon: "eye" }
  ],
  admin: [
    { title: "Panel Administrativo", text: "Tienes control total sobre la plataforma. Gestiona usuarios, reportes y configuraciones desde las pestañas superiores.", icon: "shield" }
  ]
};

// --- COMPONENTE DEL TOUR GUIADO (MEJORADO CON FLECHAS FLOTANTES) ---
const TourModal = ({ step, onNext, onPrev, onClose, role }) => {
  const currentRoleContent = TOUR_CONTENT[role] || TOUR_CONTENT['parent'];

  // Temporizador para auto-avance (60 segundos)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === currentRoleContent.length - 1) { // Si es el último paso
        onClose();
      } else {
        onNext();
      }
    }, 60000); // 60 segundos
    return () => clearTimeout(timer);
  }, [step, onNext, onClose, currentRoleContent.length]);

  const currentStepData = currentRoleContent[step] || currentRoleContent[0];
  const isLastStep = step === currentRoleContent.length - 1;

  return (
    <div className="fixed inset-0 z-[80] bg-navy/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md p-8 rounded-[2rem] shadow-2xl relative text-center border-4 border-teal-500">

        {/* FLECHA FLOTANTE IZQUIERDA (ANTERIOR) */}
        {step > 0 && (
          <button
            onClick={onPrev}
            className="absolute top-1/2 left-4 -translate-y-1/2 p-2 bg-slate-100 rounded-full text-navy shadow-lg hover:scale-110 hover:bg-slate-200 transition-all z-20"
            title="Anterior"
          >
            <Icon name="arrowLeft" size={24} />
          </button>
        )}

        {/* FLECHA FLOTANTE DERECHA (SIGUIENTE) */}
        {!isLastStep && (
          <button
            onClick={onNext}
            className="absolute top-1/2 right-4 -translate-y-1/2 p-2 bg-teal-500 rounded-full text-white shadow-lg hover:scale-110 hover:bg-teal-600 transition-all z-20 animate-pulse"
            title="Siguiente"
          >
            <Icon name="arrowRight" size={24} />
          </button>
        )}

        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-teal-500 shadow-xl z-10">
          <Icon name={currentStepData.icon} size={40} className="text-teal-600" />
        </div>

        <div className="mt-8 mb-6 px-6"> {/* Añadido padding horizontal para no chocar con flechas */}
          <h2 className="text-2xl font-black text-navy mb-2">{currentStepData.title}</h2>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">{currentStepData.text}</p>
        </div>

        <div className="flex justify-between items-center mt-8">
          <div className="flex gap-1">
            {currentRoleContent.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-teal-500' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>

          {/* BOTÓN INFERIOR DE ACCIÓN */}
          <button onClick={isLastStep ? onClose : onNext} className="bg-navy text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-opacity-90 flex items-center gap-2 shadow-lg transition-transform active:scale-95">
            {isLastStep ? '¡COMENCEMOS!' : 'SIGUIENTE'} <Icon name="arrowRight" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [excuses, setExcuses] = useState([]);
  const [tardies, setTardies] = useState([]);
  const [infirmaryRecords, setInfirmaryRecords] = useState([]);
  const [, setTeachers] = useState([]);
  const [, setStudentOptions] = useState([]);
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [view, setView] = useState('login');

  // Tabs y Filtros
  const [adminTab, setAdminTab] = useState('excuses');
  const [teacherFilter, setTeacherFilter] = useState('my_grade');
  const [parentTab, setParentTab] = useState('all');

  // Estados de carga y UI
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [notification, setNotification] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [welcomeUser, setWelcomeUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);

  // Estados del Tour
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Formularios
  const [showParentForm, setShowParentForm] = useState(false);
  const [selectedExcuse, setSelectedExcuse] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [excuseType, setExcuseType] = useState('absence');
  const [rejectId, setRejectId] = useState(null);
  const [reasonText, setReasonText] = useState("");

  const notify = (text, type = "info", image = null) => {
    setNotification({ text, type, image });
    setTimeout(() => setNotification(null), 6000);
  };

  useEffect(() => {
    const initSupabase = async () => {
      if (!window.supabase) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => setupClient();
        document.head.appendChild(script);
      } else { setupClient(); }
    };
    const setupClient = () => {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabase(client);
      client.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          client.from('profiles').select('*').eq('id', session.user.id).single()
            .then(({ data: profile }) => {
              if (profile) {
                setUser(session.user);
                setUserProfile(profile);
                if (profile.password_changed === false) {
                  setShowChangePassword(true);
                } else {
                  checkTourStatus(session.user.id);
                  setView('dashboard');
                }
              }
            });
        }
        client.from('settings').select('value').eq('key', 'school_logo').single()
          .then(({ data }) => { if (data) setSchoolLogo(data.value); });
        setLoading(false);
      });
    };
    initSupabase();
  }, []);

  const checkTourStatus = (userId) => {
    const hasSeenTour = localStorage.getItem(`tour_seen_${userId}`);
    if (!hasSeenTour) {
      setShowTour(true);
      setTourStep(0);
    }
  };

  const handleTourComplete = () => {
    setShowTour(false);
    if (user) {
      localStorage.setItem(`tour_seen_${user.id}`, 'true');
    }
  };

 const fetchData = useCallback(async () => {
  if (!supabase || !user || !userProfile) return;

  try {
    let exQuery = supabase.from('excuses').select('*');

    if (userProfile.role === 'teacher') {
      if (teacherFilter === 'my_grade') {
        exQuery = exQuery.eq('grade', userProfile.assigned_grade);
      }
    } else if (userProfile.role === 'parent') {
      exQuery = exQuery.eq('parent_id', user.id);
    }

    const { data: exD, error } = await exQuery.order('created_at', { ascending: false });
    if (error) throw error;
    setExcuses(exD || []);

    const { data: trD } = await supabase
      .from('tardies')
      .select('*')
      .order('created_at', { ascending: false });
    setTardies(trD || []);

    const { data: infD } = await supabase
      .from('infirmary_records')
      .select('*')
      .order('created_at', { ascending: false });
    setInfirmaryRecords(infD || []);

  } catch (err) {
    console.error(err);
    notify("Error cargando datos", "error");
  }
}, [supabase, user, userProfile, teacherFilter]);


  useEffect(() => {
  if (!supabase || !user || !userProfile) return;

  fetchData();

  const channel = supabase
    .channel('custom-all-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        fetchData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [supabase, user, userProfile, fetchData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { email, password } = e.target;
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value });
    if (error) { notify(error.message, "error"); setLoading(false); return; }

    if (data.user) {
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (!profile && data.user.user_metadata?.full_name) {
        const meta = data.user.user_metadata;
        const newProfile = { id: data.user.id, name: meta.full_name, email: data.user.email, role: meta.role || 'parent', assigned_grade: meta.assigned_grade || '', phone: meta.phone || '', student_represented: meta.student_represented || '', password_changed: true };
        await supabase.from('profiles').insert([newProfile]);
        profile = newProfile;
      }
      if (profile) {
        setUser(data.user);
        setUserProfile(profile);
        if (profile.password_changed === false) {
          setWelcomeUser(profile.name);
          setTimeout(() => { setWelcomeUser(null); setShowChangePassword(true); }, 2000);
        } else {
          setWelcomeUser(profile.name);
          setTimeout(() => {
            setWelcomeUser(null);
            checkTourStatus(data.user.id);
            setView('dashboard');
          }, 2500);
        }
      }
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setUploading(true);
    const { newPassword } = Object.fromEntries(new FormData(e.target));
    if (newPassword.length < 6) { notify("Mínimo 6 caracteres", "error"); setUploading(false); return; }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { notify(error.message, "error"); setUploading(false); return; }

    await supabase.from('profiles').update({ password_changed: true }).eq('id', user.id);
    notify("Contraseña actualizada correctamente", "success");
    setUploading(false);
    setShowChangePassword(false);
    checkTourStatus(user.id);
    setView('dashboard');
  };

  const handleRegister = async (e, role) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.target);
    const { name, email, password, grade, phone, student_name } = Object.fromEntries(formData);

    try {
      let { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role, assigned_grade: grade, phone, student_represented: student_name } } });
      if (error) throw error;
      if (data.user) {
        await supabase.from('profiles').upsert([{ id: data.user.id, name, role, email, assigned_grade: grade, phone, student_represented: student_name, avatar_url: null, password_changed: true }]);
        notify("Registro exitoso", "success"); setView('login');
      }
    } catch (err) { notify(err.message, "error"); } finally { setUploading(false); setAiAnalyzing(false); }
  };

  const handleAdminRegister = async (e) => {
    e.preventDefault();
    setUploading(true);
    const { name, email, password, grade, phone } = Object.fromEntries(new FormData(e.target));
    const role = 'teacher';
    try {
      let { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role, assigned_grade: grade, phone: phone || '' } } });
      if (error) throw error;
      if (data.user) {
        await supabase.from('profiles').upsert([{ id: data.user.id, name, role, email, assigned_grade: grade, phone: phone || '', password_changed: false }]);
        notify("Docente registrado con éxito.", "success");
        e.target.reset();
      }
    } catch (err) { notify(err.message, "error"); } finally { setUploading(false); }
  };

  const handleSubmitExcuse = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const type = formData.get('type');
    const inputCode = (formData.get('verificationCode') || '').toString().trim();
    const validCode = (generatedCode || '').toString().trim();

    if (inputCode !== validCode) return notify("Código incorrecto", "error");
    if (userProfile.role !== 'teacher' && type !== 'early_exit' && !selectedFile) return notify("Evidencia requerida", "error");

    setUploading(true);
    let fileUrl = null;

    try {
      if (type !== 'early_exit' && selectedFile) {
        setAiAnalyzing(true);
        setAiStatus(type === 'medical' ? "Analizando certificado médico..." : "Verificando firma en documento...");
        const base64 = await fileToBase64(selectedFile);
        const analysis = await validateWithGemini(base64, selectedFile.type, type === 'medical' ? 'medical' : 'signature');
        if (!analysis.valid) throw new Error(`DOCUMENTO RECHAZADO POR I.A.: ${analysis.reason}`);

        setAiStatus("Documento Validado. Subiendo...");
        const path = `excusas/${Date.now()}_${selectedFile.name}`;
        await supabase.storage.from('evidencias').upload(path, selectedFile);
        fileUrl = supabase.storage.from('evidencias').getPublicUrl(path).data.publicUrl;
      }

      const days = parseInt(formData.get('days')) || 1;
      let status = (userProfile.role === 'teacher' || (type === 'absence' && days > 2)) ? 'pending_review' : 'approved';
      if (userProfile.role === 'parent' && type === 'absence' && days <= 2) status = 'approved';

      let reason = formData.get('reason');
      if (type === 'early_exit') {
        const pickup = userProfile.role === 'teacher' ? 'DOCENTE' : formData.get('pickup');
        reason = `[Salida: ${pickup}] ${reason}`;
      }

      await supabase.from('excuses').insert([{
        student_name: formData.get('studentName'), grade: formData.get('grade'), days, reason, type, status, file_url: fileUrl, parent_id: user.id, contact_info: `${userProfile.name} | ${userProfile.phone}`
      }]);

      notify("Reporte enviado correctamente", "success", userProfile.avatar_url);
      e.target.reset(); setSelectedFile(null); setGeneratedCode(null); setShowParentForm(false);
    } catch (err) { notify(err.message, "error"); } finally { setUploading(false); setAiAnalyzing(false); }
  };

  const handleRegisterTardy = async (e) => {
    e.preventDefault(); setUploading(true);
    const { studentName, grade } = Object.fromEntries(new FormData(e.target));
    try {
      await supabase.from('tardies').insert([{ student_name: studentName, grade, created_at: new Date().toISOString() }]);
      notify(`Tardanza registrada: ${studentName}`, "success"); e.target.reset(); fetchData();
    } catch (err) { notify("Error: " + err.message, "error"); }
    setUploading(false);
  };

  const handleRegisterInfirmary = async (e) => {
    e.preventDefault(); setUploading(true);
    const formData = new FormData(e.target);
    const photoFile = formData.get('photo');
    try {
      let photoUrl = null;
      if (photoFile && photoFile.size > 0) {
        if (photoFile.size > MAX_FILE_SIZE) throw new Error("La foto excede 5MB.");
        const path = `enfermeria/${Date.now()}_${photoFile.name}`;
        await supabase.storage.from('evidencias').upload(path, photoFile);
        photoUrl = supabase.storage.from('evidencias').getPublicUrl(path).data.publicUrl;
      }
      await supabase.from('infirmary_records').insert([{ student_name: formData.get('studentName'), diagnosis: formData.get('diagnosis'), created_at: new Date().toISOString(), photo_url: photoUrl }]);
      notify("Registro de enfermería exitoso", "success"); e.target.reset(); fetchData();
    } catch (err) { notify("Error: " + err.message, "error"); }
    setUploading(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `brand/logo_${Date.now()}.png`;
      await supabase.storage.from('evidencias').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(fileName);
      await supabase.from('settings').upsert({ key: 'school_logo', value: publicUrl });
      setSchoolLogo(publicUrl);
      notify("Logo actualizado.", "success");
    } catch (err) { notify("Error al subir logo.", "error"); } finally { setUploading(false); }
  };

  const handleDownloadTardiesExcel = () => {
    if (tardies.length === 0) return notify("No hay datos", "warning");
    let tableContent = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr style="background-color: #1A2A44; color: white;"><th>Fecha</th><th>Estudiante</th><th>Grado</th><th>Estado</th></tr></thead><tbody>`;
    tardies.forEach(t => {
      const count = getTardinessCount(tardies, t.student_name);
      const style = count > 3 ? 'background-color: #FEE2E2; color: #DC2626; font-weight: bold;' : '';
      tableContent += `<tr style="${style}"><td>${new Date(t.created_at).toLocaleString()}</td><td>${t.student_name} ${count > 3 ? '(⚠️ +3)' : ''}</td><td>${t.grade}</td><td>LLEGADA TARDE</td></tr>`;
    });
    tableContent += `</tbody></table></body></html>`;
    const url = window.URL.createObjectURL(new Blob([tableContent], { type: 'application/vnd.ms-excel' }));
    const a = document.createElement('a'); a.href = url; a.download = `Reporte_Tardanzas_${new Date().toLocaleDateString()}.xls`; a.click();
    notify("Excel descargado", "success");
  };

  const handleUpdateStatus = async (id, status) => {
    await supabase.from('excuses').update({ status }).eq('id', id);
    fetchData();
  };

  const handleRejectSubmit = async () => {
    await supabase.from('excuses').update({ status: 'rejected', rejection_reason: reasonText }).eq('id', rejectId);
    setRejectId(null); setReasonText(""); fetchData();
  };

  const handleRequestCode = async () => {
    setRequestingCode(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(code);
    setRequestingCode(false);
    notify(`💬 TU CÓDIGO ES: ${code}`, "success");
  };

  const renderExcuseCard = (ex, isAdmin) => {
    const alerts = getStudentAlerts(excuses, ex.student_name);
    const isAlert = alerts.uniformAlert || alerts.absenceAlert;

    return (
      <div key={ex.id} onClick={() => setSelectedExcuse(ex)} className="bg-white p-6 rounded-3xl shadow-lg border relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all mb-4">
        {isAlert && <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[9px] font-black text-center py-1 uppercase tracking-widest animate-pulse">⚠️ ALERTA ACADÉMICA</div>}
        <div className={`flex flex-col md:flex-row justify-between gap-4 ${isAlert ? 'mt-4' : ''}`}>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-black uppercase text-lg ${isAlert ? 'text-red-600' : ''}`} style={!isAlert ? { color: COLORS.navy } : {}}>{ex.student_name}</h4>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">
                {ex.contact_info && ex.contact_info.includes(ex.student_name) ? 'DOCENTE' : ex.grade}
              </span>
            </div>
            <p className="text-slate-600 text-sm italic mt-1 line-clamp-2"><span className="font-bold text-teal-600">[{ex.type === 'medical' ? 'MÉDICA' : ex.type === 'early_exit' ? 'SALIDA' : 'AUSENCIA'}]</span> "{ex.reason}"</p>
            {ex.status === 'rejected' && ex.rejection_reason && (
              <div className="mt-2 bg-red-50 text-red-600 text-xs font-bold p-2 rounded border border-red-100">
                MOTIVO RECHAZO: {ex.rejection_reason}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-[#1A2A44]"><Icon name="eye" /></span>
              {isAdmin ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setRejectId(ex.id) }} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black hover:bg-red-100">RECHAZAR</button>
                  <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ex.id, 'approved') }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700">APROBAR</button>
                </>
              ) : (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${ex.status === 'approved' ? 'bg-green-100 text-green-700' : ex.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{ex.status === 'approved' ? 'AUTORIZADO' : ex.status === 'rejected' ? 'RECHAZADO' : 'PENDIENTE'}</span>
              )}
            </div>
            {ex.status === 'approved' && <div className="w-full md:w-48"><CountdownTimer startDate={ex.created_at} /></div>}
          </div>
        </div>
      </div>
    );
  };

  const renderParentFeed = () => {
    const studentName = userProfile.student_represented?.trim().toLowerCase();

    const myTardies = tardies
      .filter(t => t.student_name.trim().toLowerCase() === studentName)
      .map(t => ({ ...t, type: 'tardy', created_at: t.created_at }));

    const myInfirmary = infirmaryRecords
      .filter(i => i.student_name.trim().toLowerCase() === studentName)
      .map(i => ({ ...i, type: 'infirmary', created_at: i.created_at }));

    const combinedFeed = [
      ...excuses.map(e => ({ ...e, type: 'excuse' })),
      ...myTardies,
      ...myInfirmary
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const filteredFeed = combinedFeed.filter(item => {
      if (parentTab === 'all') return true;
      if (parentTab === 'excuses') return item.type === 'excuse';
      if (parentTab === 'tardies') return item.type === 'tardy';
      if (parentTab === 'infirmary') return item.type === 'infirmary';
      return true;
    });

    if (filteredFeed.length === 0) return <p className="text-center text-slate-400 font-bold py-10">NO HAY REPORTES EN ESTA SECCIÓN</p>;

    return filteredFeed.map(item => {
      if (item.type === 'excuse') return renderExcuseCard(item, false);

      if (item.type === 'tardy') return (
        <div key={`tardy-${item.id}`} className="bg-white p-4 rounded-2xl shadow border-l-4 border-amber-500 mb-4 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
          <div>
            <h4 className="font-black uppercase text-sm text-navy flex items-center gap-2"><Icon name="clock" size={14} className="text-amber-500" /> LLEGADA TARDE</h4>
            <p className="text-xs text-slate-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
          </div>
          <span className="text-xl font-bold text-amber-500">RETRASO</span>
        </div>
      );

      if (item.type === 'infirmary') return (
        <div key={`infirmary-${item.id}`} className="bg-white p-4 rounded-2xl shadow border-l-4 border-rose-500 mb-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-black uppercase text-sm text-navy flex items-center gap-2"><Icon name="heart" size={14} className="text-rose-500" /> REPORTE ENFERMERÍA</h4>
              <p className="text-sm font-bold text-rose-700 mt-1 italic">"{item.diagnosis}"</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            {item.photo_url && (
              <a href={item.photo_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500">
                <Icon name="eye" />
              </a>
            )}
          </div>
        </div>
      );
      return null;
    });
  };

  if (loading) return <div className="flex h-screen items-center justify-center animate-pulse"><Icon name="logo" size={80} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {welcomeUser && <WelcomeAnimation name={welcomeUser} />}

      {/* RENDERIZADO CONDICIONAL DEL TOUR: Si no debe mostrarse, ni siquiera se monta el componente */}
      {showTour && (
        <TourModal
          step={tourStep}
          onNext={() => setTourStep(s => s + 1)}
          onPrev={() => setTourStep(s => Math.max(0, s - 1))}
          onClose={handleTourComplete}
          role={userProfile?.role}
        />
      )}

      {showChangePassword && (
        <div className="fixed inset-0 z-[70] bg-navy flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><Icon name="lock" size={32} /></div>
              <h2 className="text-xl font-black text-navy">CAMBIO DE CONTRASEÑA</h2>
              <p className="text-xs text-slate-500 mt-2">Por seguridad, debes cambiar tu contraseña para continuar.</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input name="newPassword" type="password" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200" placeholder="Nueva Contraseña" required minLength={6} />
              <button disabled={uploading} className="w-full py-4 bg-navy text-white font-bold rounded-xl">{uploading ? 'ACTUALIZANDO...' : 'ACTUALIZAR Y ENTRAR'}</button>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl text-white font-bold shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300 ${notification.type === 'error' ? 'bg-red-600' : notification.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
          <div className="w-10 h-10 rounded-full border-2 border-white/50 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {notification.image ? <img src={notification.image} className="w-full h-full object-cover" alt="Avatar" /> : <Icon name="user" className="text-slate-300" />}
          </div>
          <span>{notification.text}</span>
        </div>
      )}

      <datalist id="student-list">{studentOptions.map((name, index) => <option key={index} value={name} />)}</datalist>

      {view === 'login' && !showChangePassword && (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border-b-4 border-red-700">
            <div className="text-center mb-8">
              <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">{schoolLogo ? <img src={schoolLogo} className="h-16" alt="Logo" /> : <Icon name="logo" size={60} />}</div>
              <h1 className="text-2xl font-black" style={{ color: COLORS.navy }}>PORTAL EXCUSAS CAN</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input name="email" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200" placeholder="Correo" required />
              <input name="password" type="password" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200" placeholder="Contraseña" required />
              <button className="w-full py-4 text-white rounded-xl font-bold hover:bg-opacity-90" style={{ backgroundColor: COLORS.navy }}>ENTRAR</button>
            </form>
            <div className="mt-6 flex justify-center text-xs font-bold text-slate-400">
              <button onClick={() => setView('register-parent')} className="hover:text-navy transition-colors">REGISTRARSE COMO ACUDIENTE</button>
            </div>
          </div>
        </div>
      )}

      {view === 'register-parent' && (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-100">
          <div className={`w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border-t-4 border-red-600`}>
            <h2 className="text-xl font-black text-center mb-6" style={{ color: COLORS.navy }}>REGISTRO ACUDIENTES</h2>
            <form onSubmit={(e) => handleRegister(e, 'parent')} className="space-y-3">
              <input name="name" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Nombre Completo" required />
              <input name="phone" type="tel" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Teléfono" required />
              <input name="student_name" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Estudiante" required />
              <input name="email" type="email" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Correo" required />
              <input name="password" type="password" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Contraseña" required />
              <select name="grade" className="w-full p-3 bg-slate-50 rounded-xl border" required><option value="">Curso</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
              <button disabled={uploading} className="w-full py-4 text-white font-bold rounded-xl bg-red-600 shadow-lg mt-2">{uploading ? 'VERIFICANDO...' : 'REGISTRARME'}</button>
            </form>
            <button onClick={() => setView('login')} className="w-full mt-4 text-xs font-bold text-slate-400">VOLVER</button>
          </div>
        </div>
      )}

      {view === 'dashboard' && (
        <div>
          <header className="p-4 text-white shadow-lg sticky top-0 z-40" style={{ backgroundColor: COLORS.navy }}>
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">{schoolLogo ? <img src={schoolLogo} className="h-8" alt="Logo" /> : <Icon name="logo" size={24} />}</div>
                <span className="font-black tracking-widest hidden sm:block">PORTAL DE EXCUSAS CAN</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors" title="Actualizar Datos"><Icon name="refresh" size={18} /></button>

                {userProfile?.avatar_url && (
                  <div className="w-8 h-8 rounded-full border border-white/50 bg-white overflow-hidden">
                    <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                  </div>
                )}

                <button onClick={() => { supabase.auth.signOut(); setView('login'); }} className="bg-white/10 px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2 transition-colors"><Icon name="logout" size={20} /> <span className="font-bold text-[10px] hidden sm:inline">SALIR</span></button>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto p-4 md:p-8">
            {(userProfile.role === 'parent' || userProfile.role === 'teacher') && (
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="col-span-1">
                  {!showParentForm ? (
                    <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-red-600 h-fit cursor-pointer hover:bg-slate-50 transition-all group" onClick={() => setShowParentForm(true)}>
                      <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 group-hover:scale-110"><Icon name="plus" size={40} /></div>
                        <div className="text-center"><h3 className="font-black text-navy text-xl">NUEVA EXCUSA</h3><p className="text-xs text-slate-400 font-bold mt-2">{userProfile.role === 'teacher' ? 'Reportar Novedad Docente' : 'Reportar Inasistencia'}</p></div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-red-600 animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="flex justify-between items-center mb-6"><h3 className="font-black text-navy flex items-center gap-2">REPORTAR</h3><button onClick={() => setShowParentForm(false)} className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-400">CANCELAR</button></div>
                      <form onSubmit={handleSubmitExcuse} className="space-y-3">
                        <select name="type" className="w-full p-3 rounded-xl bg-slate-50 border text-sm" onChange={(e) => setExcuseType(e.target.value)}>
                          <option value="absence">Inasistencia</option>
                          <option value="medical">Incapacidad Médica</option>
                          <option value="early_exit">Salida Jornada</option>
                          {userProfile.role === 'parent' && <option value="uniform">Uniforme</option>}
                        </select>
                        <input name="studentName" defaultValue={userProfile.role === 'teacher' ? userProfile.name : userProfile.student_represented} className="w-full p-3 bg-slate-50 rounded-xl border text-sm" readOnly={userProfile.role === 'teacher'} required />
                        <div className="flex gap-2"><select name="grade" className="w-1/2 p-3 bg-slate-50 rounded-xl border text-sm"><option>{userProfile.assigned_grade}</option></select>{excuseType !== 'early_exit' && <input name="days" type="number" min="1" className="w-1/2 p-3 bg-slate-50 rounded-xl border text-sm" placeholder="Días" required />}</div>
                        {excuseType === 'early_exit' && userProfile.role === 'parent' && (
                          <select name="pickup" className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm"><option value="SI">SÍ, yo vengo por él/ella</option><option value="NO">NO, se va solo/a</option></select>
                        )}
                        <textarea name="reason" className="w-full p-3 bg-slate-50 rounded-xl border text-sm h-24" placeholder="Motivo..." required></textarea>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2">
                          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase text-center">Validación de Seguridad</p>
                          <div className="flex gap-2">
                            <input name="verificationCode" className="w-1/2 p-2 rounded-lg border text-center font-bold tracking-widest" placeholder="CÓDIGO" required />
                            <button type="button" onClick={handleRequestCode} disabled={requestingCode} className="w-1/2 bg-amber-200 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-300 transition-colors flex items-center justify-center">
                              {requestingCode ? 'ENVIANDO...' : 'PEDIR CÓDIGO'}
                            </button>
                          </div>
                        </div>

                        {excuseType !== 'early_exit' && (
                          <div className="flex gap-2">
                            <label className={`flex-1 bg-white border p-3 rounded-lg text-center cursor-pointer ${userProfile.role === 'teacher' ? 'border-dashed' : ''}`}>
                              <Icon name="folder" className="text-teal-600 mx-auto" />
                              <span className="text-[10px] font-bold block">{userProfile.role === 'teacher' ? 'ARCHIVO (OPC)' : 'ARCHIVO'}</span>
                              <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="hidden" />
                            </label>
                            <label className={`flex-1 bg-white border p-3 rounded-lg text-center cursor-pointer ${userProfile.role === 'teacher' ? 'border-dashed' : ''}`}>
                              <Icon name="camera" className="text-red-600 mx-auto" />
                              <span className="text-[10px] font-bold block">{userProfile.role === 'teacher' ? 'FOTO (OPC)' : 'FOTO'}</span>
                              <input type="file" capture="environment" onChange={(e) => setSelectedFile(e.target.files[0])} className="hidden" />
                            </label>
                          </div>
                        )}
                        {selectedFile && <div className="text-xs text-center text-teal-600 font-bold bg-teal-50 p-1 rounded">{selectedFile.name}</div>}
                        <button disabled={uploading} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl text-xs">{uploading ? 'ENVIANDO...' : 'ENVIAR REPORTE'}</button>
                      </form>
                    </div>
                  )}
                </div>

                {userProfile.role === 'parent' && (
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                      <button
                        onClick={() => setParentTab('all')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-colors ${parentTab === 'all' ? 'bg-navy text-white' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                      >
                        TODO
                      </button>
                      <button
                        onClick={() => setParentTab('excuses')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-colors ${parentTab === 'excuses' ? 'bg-teal-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                      >
                        EXCUSAS
                      </button>
                      <button
                        onClick={() => setParentTab('tardies')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-colors ${parentTab === 'tardies' ? 'bg-amber-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                      >
                        TARDANZAS
                      </button>
                      <button
                        onClick={() => setParentTab('infirmary')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-colors ${parentTab === 'infirmary' ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                      >
                        ENFERMERÍA
                      </button>
                    </div>

                    {renderParentFeed()}
                  </div>
                )}
              </div>
            )}

            {(userProfile.role === 'admin' || userProfile.role === 'teacher') && (
              <div className="space-y-6">

                {userProfile.role === 'teacher' && (
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-4 overflow-x-auto">
                      {['excuses', 'tardies', 'infirmary'].map(tab => (
                        <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap ${adminTab === tab ? 'bg-navy text-white' : 'bg-white text-slate-400'}`} style={adminTab === tab ? { backgroundColor: COLORS.navy } : {}}>
                          {tab === 'excuses' ? 'EXCUSAS' : tab === 'tardies' ? 'TARDANZAS' : 'ENFERMERÍA'}
                        </button>
                      ))}
                    </div>
                    <select
                      value={teacherFilter}
                      onChange={(e) => { setTeacherFilter(e.target.value); fetchData(); }}
                      className="p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-navy shadow-sm ml-4"
                    >
                      <option value="my_grade">MIS ESTUDIANTES ({userProfile.assigned_grade})</option>
                      <option value="all">TODO EL COLEGIO</option>
                    </select>
                  </div>
                )}

                {userProfile.role === 'admin' && (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {['excuses', 'tardies', 'infirmary', 'register', 'teachers', 'settings'].map(tab => (
                      <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap ${adminTab === tab ? 'bg-navy text-white' : 'bg-white text-slate-400'}`} style={adminTab === tab ? { backgroundColor: COLORS.navy } : {}}>{tab}</button>
                    ))}
                  </div>
                )}

                {(userProfile.role === 'teacher' || (userProfile.role === 'admin' && adminTab === 'excuses')) && adminTab === 'excuses' && (
                  <div className="grid gap-8">
                    {userProfile.role === 'admin' && (
                      <div>
                        <h3 className="text-xs font-black text-amber-600 uppercase mb-4 flex items-center gap-2"><Icon name="clock" size={16} /> Solicitudes Pendientes</h3>
                        {excuses.filter(e => e.status === 'pending_review').length === 0 ? (
                          <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold">✨ Todo al día. No hay solicitudes pendientes.</div>
                        ) : (
                          excuses.filter(e => e.status === 'pending_review').map(ex => renderExcuseCard(ex, true))
                        )}
                      </div>
                    )}

                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase mb-4">{userProfile.role === 'admin' ? 'Historial Procesado' : 'Historial de Excusas'}</h3>
                      {userProfile.role === 'admin' ? (
                        excuses.filter(e => e.status !== 'pending_review').map(ex => (
                          <div key={ex.id} onClick={() => setSelectedExcuse(ex)} className="bg-slate-50 p-4 rounded-2xl mb-2 flex justify-between items-center cursor-pointer hover:bg-slate-100 border border-slate-100">
                            <div><span className="font-bold text-slate-700 text-sm block">{ex.student_name}</span><div className="flex gap-2 mt-1"><span className={`text-[9px] font-black px-2 py-0.5 rounded ${ex.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ex.status === 'approved' ? 'AUTORIZADO' : 'RECHAZADO'}</span><span className="text-[9px] text-slate-400 italic">{ex.type}</span></div></div>
                            {ex.status === 'approved' && (<button onClick={(e) => { e.stopPropagation(); setRejectId(ex.id) }} className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors shadow-sm">REVOCAR ↩</button>)}
                          </div>
                        ))
                      ) : (
                        excuses.map(ex => renderExcuseCard(ex, false))
                      )}
                      {excuses.length === 0 && <p className="text-center text-slate-400 font-bold py-10">NO HAY REGISTROS</p>}
                    </div>
                  </div>
                )}

                {adminTab === 'tardies' && (userProfile.role === 'admin' || userProfile.role === 'teacher') && (
                  <div className="grid md:grid-cols-3 gap-8">
                    {userProfile.role === 'admin' && (
                      <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-amber-500 h-fit">
                        <h3 className="font-black mb-4" style={{ color: COLORS.navy }}>REGISTRAR LLEGADA TARDE</h3>
                        <form onSubmit={handleRegisterTardy} className="space-y-4">
                          <input name="studentName" list="student-list" className="w-full p-3 bg-slate-50 rounded-xl border text-sm" placeholder="Nombre Estudiante" required />
                          <select name="grade" className="w-full p-3 bg-slate-50 rounded-xl border text-sm" required><option value="">Seleccionar Grado</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
                          <button disabled={uploading} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl text-xs">{uploading ? 'REGISTRANDO...' : 'REGISTRAR TARDANZA'}</button>
                        </form>
                        <div className="mt-6 pt-6 border-t"><button onClick={handleDownloadTardiesExcel} className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl text-xs hover:bg-green-700"><Icon name="download" size={16} /> DESCARGAR EXCEL</button></div>
                      </div>
                    )}
                    <div className={userProfile.role === 'admin' ? "md:col-span-2 space-y-4" : "col-span-3 space-y-4"}>
                      {tardies.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-2xl shadow border-l-4 border-amber-200 flex justify-between items-center">
                          <div><h4 className="font-black uppercase text-sm" style={{ color: COLORS.navy }}>{t.student_name}</h4><div className="flex gap-2 mt-1"><span className="text-[10px] bg-slate-100 px-2 rounded font-bold">{t.grade}</span><span className="text-[10px] text-slate-400 font-mono">{new Date(t.created_at).toLocaleString()}</span></div></div>
                          <div className="text-right"><span className="text-xs font-black text-amber-500">LLEGADA TARDE</span></div>
                        </div>
                      ))}
                      {tardies.length === 0 && <p className="text-center text-slate-400 font-bold py-10">NO HAY TARDANZAS</p>}
                    </div>
                  </div>
                )}

                {adminTab === 'infirmary' && (userProfile.role === 'admin' || userProfile.role === 'teacher') && (
                  <div className="grid md:grid-cols-3 gap-8">
                    {userProfile.role === 'admin' && (
                      <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-rose-500 h-fit">
                        <h3 className="font-black mb-4 flex items-center gap-2" style={{ color: COLORS.navy }}><Icon name="heart" className="text-rose-500" /> REGISTRO ENFERMERÍA</h3>
                        <form onSubmit={handleRegisterInfirmary} className="space-y-4">
                          <input name="studentName" list="student-list" className="w-full p-3 bg-slate-50 rounded-xl border text-sm" placeholder="Nombre Estudiante" required />
                          <textarea name="diagnosis" className="w-full p-3 bg-slate-50 rounded-xl border text-sm h-24" placeholder="Diagnóstico..." required></textarea>
                          <label className="block w-full p-3 bg-slate-100 text-center rounded-xl text-xs font-bold text-slate-500 cursor-pointer border-dashed border-2 hover:bg-slate-200">FOTO (OPCIONAL) 📸<input name="photo" type="file" accept="image/*" className="hidden" /></label>
                          <button disabled={uploading} className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl text-xs">{uploading ? 'REGISTRANDO...' : 'REGISTRAR VISITA'}</button>
                        </form>
                      </div>
                    )}
                    <div className={userProfile.role === 'admin' ? "md:col-span-2 space-y-4" : "col-span-3 space-y-4"}>
                      {infirmaryRecords.map(rec => (
                        <div key={rec.id} className="bg-white p-4 rounded-2xl shadow border-l-4 border-rose-200 flex justify-between items-start">
                          <div><h4 className="font-black uppercase text-sm text-navy">{rec.student_name}</h4><p className="text-xs text-rose-600 font-bold mt-1">DX: {rec.diagnosis}</p><span className="text-[10px] text-slate-400 font-mono mt-1 block">{new Date(rec.created_at).toLocaleString()}</span></div>
                          {rec.photo_url && (<a href={rec.photo_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500"><Icon name="eye" size={16} /></a>)}
                        </div>
                      ))}
                      {infirmaryRecords.length === 0 && <p className="text-center text-slate-400 font-bold py-10">NO HAY VISITAS</p>}
                    </div>
                  </div>
                )}

                {adminTab === 'register' && userProfile.role === 'admin' && (
                  <div className="grid place-items-center">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-t-[12px] border-teal-600 w-full max-w-lg">
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-center" style={{ color: COLORS.navy }}>Registro Administrativo</h3>
                      <form onSubmit={handleAdminRegister} className="space-y-4">
                        <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 text-teal-800 font-bold text-xs text-center uppercase">Registrando Nuevo Docente</div>
                        <input name="name" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Nombre Completo" required />
                        <input name="email" type="email" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Correo" required />
                        <input name="phone" type="tel" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Teléfono" />
                        <input name="password" type="password" className="w-full p-3 bg-slate-50 rounded-xl border" placeholder="Contraseña Temporal" required />
                        <select name="grade" className="w-full p-3 bg-slate-50 rounded-xl border" required><option value="">Curso / Dirección de Grupo</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
                        <button disabled={uploading} className="w-full py-4 text-white font-bold rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors mt-2">{uploading ? 'CREANDO...' : 'CREAR DOCENTE'}</button>
                      </form>
                    </div>
                  </div>
                )}

                {adminTab === 'teachers' && userProfile.role === 'admin' && (
                  <div className="grid grid-cols-2 gap-4">{teachers.map(t => (<div key={t.id} className="bg-white p-4 rounded-2xl shadow flex items-center gap-4"><div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600"><Icon name="users" /></div><div><p className="font-bold text-sm" style={{ color: COLORS.navy }}>{t.name}</p><p className="text-xs text-slate-400">{t.assigned_grade}</p></div></div>))}</div>
                )}

                {adminTab === 'settings' && userProfile.role === 'admin' && (
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-t-[12px]" style={{ borderTopColor: COLORS.gold }}>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4" style={{ color: COLORS.navy }}>Logo Institucional</h3>
                    <label className="inline-block bg-gold text-white px-10 py-5 rounded-2xl text-[11px] font-black uppercase cursor-pointer hover:shadow-2xl transition-all shadow-xl">{uploading ? "CARGANDO..." : "SUBIR NUEVO LOGO"}<input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} /></label>
                  </div>
                )}

              </div>
            )}
          </main>
        </div>
      )}

      {selectedExcuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedExcuse(null)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div><h3 className="font-black text-2xl text-navy uppercase">{selectedExcuse.student_name}</h3><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">{selectedExcuse.grade}</span></div>
              <button onClick={() => setSelectedExcuse(null)}><Icon name="x" /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl text-sm italic border-l-4 border-teal-500">"{selectedExcuse.reason}"</div>
              {selectedExcuse.file_url && <img src={selectedExcuse.file_url} alt='foto' className="w-full h-auto max-h-[70vh] object-contain bg-slate-100 rounded-xl shadow-inner border border-slate-200" />}
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl">
            <h3 className="font-black text-lg mb-4 text-navy">Confirmar Rechazo/Revocación</h3>
            <textarea className="w-full bg-slate-50 p-3 rounded-xl border h-32 text-sm" placeholder="Motivo..." value={reasonText} onChange={e => setReasonText(e.target.value)}></textarea>
            <div className="flex gap-2 mt-4"><button onClick={() => setRejectId(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-xs text-slate-500">CANCELAR</button><button onClick={handleRejectSubmit} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs">CONFIRMAR</button></div>
          </div>
        </div>
      )}

      {aiAnalyzing && <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center text-white font-bold animate-pulse">{aiStatus}</div>}
    </div>
  );
}