import { 
  Utensils, 
  Dumbbell, 
  Scale, 
  Activity, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  HeartPulse,
  Info,
  ShieldAlert,
  Ban,
  ShieldCheck,
  QrCode,
  Copy,
  LayoutDashboard,
  FileText,
  Download,
  Target,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserProfile, 
  PlanResult, 
  Meal, 
  WorkoutPlan, 
  ActivityLevel, 
  PlanStatus,
  Goal,
  DietPlan
} from './types';
import { generatePlan, calculateBMI } from './calculations';

// --- Pix Helper ---
function generatePixPayload(
  key: string,
  name: string,
  city: string
): string {
  const clean = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

  const format = (id: string, value: string) =>
    id + value.length.toString().padStart(2, '0') + value;

  let payload = format('00', '01');

  // 26 - Merchant Account Information
  const gui = format('00', 'BR.GOV.BCB.PIX');
  const keyField = format('01', key);
  payload += format('26', gui + keyField);

  payload += format('52', '0000');
  payload += format('53', '986');
  payload += format('58', 'BR');
  payload += format('59', clean(name).substring(0, 25));
  payload += format('60', clean(city).substring(0, 15));

  // 62 - Additional Data Field Template
  // 05 - Reference Label (TxID) is MANDATORY. Use '***' for static.
  const txid = format('05', '***');
  payload += format('62', txid);

  payload += '6304';

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }

  const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
}

// --- Constants & Data ---

interface ExerciseDetails {
  posicao: string;
  execucao: string;
  cuidados: string;
  erros: string;
  respiracao: string;
}

const EXERCISE_GUIDE: Record<string, ExerciseDetails> = {
  "Agachamento Livre": {
    posicao: "Pés afastados na largura dos ombros, pontas levemente para fora. Coluna reta e peito aberto.",
    execucao: "Flexione os joelhos e projete o quadril para trás, como se fosse sentar em uma cadeira invisível. Desça até onde conseguir manter a postura e suba empurrando o chão.",
    cuidados: "Mantenha os calcanhares firmes no chão o tempo todo. Olhe para frente.",
    erros: "Deixar os joelhos caírem para dentro (valgo) ou curvar as costas.",
    respiracao: "Inspire ao descer, expire (solte o ar) ao subir."
  },
  "Flexão de Braço (ou Joelhos)": {
    posicao: "Mãos apoiadas no chão afastadas um pouco além dos ombros. Corpo em linha reta (prancha) ou joelhos apoiados no chão para facilitar.",
    execucao: "Desça o peito em direção ao chão flexionando os cotovelos. Empurre o chão para retornar à posição inicial.",
    cuidados: "Mantenha o abdômen contraído para não deixar o quadril cair.",
    erros: "Cotovelos muito abertos (formando um T) - mantenha-os a 45 graus (formando uma seta).",
    respiracao: "Inspire ao descer, expire ao empurrar."
  },
  "Abdominal Supra": {
    posicao: "Deitado de costas, joelhos flexionados e pés apoiados no chão. Mãos nas têmporas ou cruzadas no peito.",
    execucao: "Eleve os ombros do chão contraindo o abdômen. O movimento é curto e focado na parte superior.",
    cuidados: "Imagine que segura uma maçã entre o queixo e o peito para não forçar o pescoço.",
    erros: "Puxar a cabeça com as mãos ou tentar subir até sentar (não é necessário).",
    respiracao: "Solte todo o ar pela boca ao subir (contração), inspire ao descer."
  },
  "Prancha Isométrica": {
    posicao: "Apoie os antebraços no chão, cotovelos alinhados abaixo dos ombros. Estenda as pernas apoiando a ponta dos pés.",
    execucao: "Mantenha o corpo estático, em linha reta da cabeça aos calcanhares. Contraia forte glúteos e abdômen.",
    cuidados: "Não prenda a respiração. Se sentir dor na lombar, apoie os joelhos.",
    erros: "Quadril muito alto ou muito baixo (arquear a lombar).",
    respiracao: "Respiração fluida, constante e controlada."
  },
  "Afundo (Passada)": {
    posicao: "Em pé, pés na largura do quadril. Dê um passo largo para trás com uma das pernas.",
    execucao: "Flexione os dois joelhos até formarem ângulos de aprox. 90 graus. O joelho de trás aproxima-se do chão.",
    cuidados: "O tronco deve permanecer vertical, não incline para frente.",
    erros: "O joelho da frente ultrapassar muito a ponta do pé ou o calcanhar da frente sair do chão.",
    respiracao: "Inspire ao descer, expire ao subir."
  },
  "Burpees (Adaptado)": {
    posicao: "Em pé, pés na largura dos ombros.",
    execucao: "Agache e apoie as mãos no chão. Leve os pés para trás (posição de prancha). Traga os pés de volta para perto das mãos. Fique em pé.",
    cuidados: "Faça o movimento de forma pausada e controlada, sem impacto.",
    erros: "Curvar as costas ao apoiar as mãos no chão.",
    respiracao: "Mantenha um ritmo respiratório constante."
  }
};

// --- Diet Generation Constants ---
const FRUITS = ["Banana", "Maçã", "Pera", "Kiwi", "Mamão", "Laranja", "Abacaxi"];
const GREENS = ["Alface", "Rúcula", "Agrião", "Espinafre", "Couve", "Endívia", "Chicória", "Repolho", "Mostarda", "Acelga"];
const VEGETABLES = ["Cenoura", "Abobrinha", "Berinjela", "Chuchu", "Beterraba", "Brócolis", "Couve-flor", "Vagem", "Abóbora", "Pepino"];
const BREAKFAST_CARBS = ["Aveia", "Pão Integral", "Tapioca"];
const BREAKFAST_PROTEINS = ["Ovo", "Queijo Branco", "Iogurte Natural", "Whey Protein"];

// --- Diet Generation Functions ---

function breakfastWithYogurt(goal: Goal) {
  return FRUITS.map(fruit => ({
    description: `Iogurte Natural + Aveia + ${fruit}`,
    portion: goal === "gain" ? "porção reforçada" : "porção padrão"
  }));
}

function breakfastWithCoffee(goal: Goal) {
  return BREAKFAST_CARBS.map(carb => ({
    description: `Café sem açúcar + ${carb} + Ovo`,
    portion: goal === "lose" ? "porção reduzida" : "porção padrão"
  }));
}

function breakfastWithMilk(goal: Goal) {
  return FRUITS.map(fruit => ({
    description: `Leite + ${fruit} + Aveia`,
    portion: goal === "gain" ? "porção reforçada" : "porção padrão"
  }));
}

function breakfastWithEggs(goal: Goal) {
  return BREAKFAST_CARBS.map(carb => ({
    description: `Ovos mexidos + ${carb}`,
    portion: goal === "gain" ? "3 ovos" : "2 ovos"
  }));
}

function breakfastSmoothie(goal: Goal) {
  return FRUITS.map(fruit => ({
    description: `Vitamina de ${fruit} com Leite e Aveia`,
    portion: goal === "lose" ? "copo médio" : "copo grande"
  }));
}

function breakfastWithBread(goal: Goal) {
  return BREAKFAST_PROTEINS.map(protein => ({
    description: `Pão Integral + ${protein} + Café`,
    portion: goal === "gain" ? "2 fatias" : "1 fatia"
  }));
}

function generateBreakfastOptions(goal: Goal) {
  return [
    ...breakfastWithYogurt(goal),
    ...breakfastWithCoffee(goal),
    ...breakfastWithMilk(goal),
    ...breakfastWithEggs(goal),
    ...breakfastSmoothie(goal),
    ...breakfastWithBread(goal)
  ];
}

function generateMealCombinations(
  protein: ProteinChoice,
  carb: CarbChoice,
  goal: Goal
) {
  const portions = {
    lose: { protein: 120, carb: 100 },
    maintain: { protein: 150, carb: 130 },
    gain: { protein: 180, carb: 180 }
  };

  const preparations = ["Grelhado", "Assado", "Cozido"];
  const seasonings = ["Ervas Finas", "Alho e Cebola", "Limão e Pimenta"];

  return GREENS.flatMap((green, gIdx) =>
    VEGETABLES.map((veg, vIdx) => {
      const prep = preparations[(gIdx + vIdx) % preparations.length];
      const seasoning = seasonings[(gIdx * vIdx) % seasonings.length];
      return {
        protein: `${portions[goal].protein}g de ${protein} ${prep}`,
        carb: `${portions[goal].carb}g de ${carb}`,
        salad: `${green} + ${veg}`,
        fat: `1 fio de azeite com ${seasoning}`
      };
    })
  );
}

const getBMIClassification = (bmi: number) => {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 24.9) return "Peso adequado";
  if (bmi < 29.9) return "Sobrepeso";
  if (bmi < 34.9) return "Obesidade grau I";
  if (bmi < 39.9) return "Obesidade grau II";
  return "Obesidade grau III";
};

const calculatePlan = (profile: UserProfile): PlanResult => {
  // 1. Generate core numbers using the new modular engine
  const plan = generatePlan(profile);

  // 2. Handle denied status from calculation engine
  if (plan.status === 'denied_minor') {
    return {
      status: 'denied_minor',
      justification: [
        "Este aplicativo é exclusivo para maiores de 18 anos.",
        "O desenvolvimento fisiológico nesta fase requer acompanhamento presencial especializado."
      ],
      bmi: Number(plan.bmi?.toFixed(1) || 0),
      bmiClass: getBMIClassification(plan.bmi || 0)
    };
  }

  if (plan.status === 'denied_underweight') {
    return {
      status: 'denied_minor', // Mapping to existing UI status for now to show the denial screen
      justification: [
        "Seu IMC está abaixo de 18.5 (Abaixo do Peso).",
        "Por segurança, o aplicativo não gera planos de emagrecimento para este perfil. Recomendamos foco em manutenção ou ganho de massa com acompanhamento médico."
      ],
      bmi: Number(plan.bmi?.toFixed(1) || 0),
      bmiClass: getBMIClassification(plan.bmi || 0)
    };
  }

  // 3. Health Condition Analysis (UI/Policy Layer)
  const conditionsLower = profile.conditions.toLowerCase();
  const heartKeywords = [
    'cardíaca', 'coração', 'arritmia', 'infarto', 'insuficiência', 
    'marca-passo', 'marcapasso', 'hipertensão grave', 'pressão alta descontrolada', 
    'cardiopatia', 'ponte de safena', 'stent'
  ];
  
  const hasHeartCondition = heartKeywords.some(k => conditionsLower.includes(k));
  const isElderly = profile.age > 70;

  let status: PlanStatus = 'approved';
  const justification: string[] = [];

  if (hasHeartCondition) {
    status = 'restricted_health';
    justification.push("Condição cardiovascular detectada. Exercícios físicos suspensos.");
    justification.push("Necessária liberação médica por cardiologista.");
  } else if (isElderly) {
    status = 'restricted_elderly';
    justification.push("Idade acima de 70 anos. Protocolo de segurança ativado.");
    justification.push("Exercícios não gerados. Recomendamos avaliação geriátrica.");
  } else {
    justification.push("Perfil apto para plano completo.");
  }

  const isDiabetic = conditionsLower.includes('diabete') || conditionsLower.includes('glicose');
  const isHypertensive = conditionsLower.includes('hipertens') || conditionsLower.includes('pressão alta');

  // --- Distribuição das refeições (percentual padrão) ---
  const targetCalories = plan.targetCalories;
  const breakfastCalories = targetCalories * 0.25;
  const lunchCalories = targetCalories * 0.35;
  const snackCalories = targetCalories * 0.15;
  const dinnerCalories = targetCalories * 0.25;

  // --- Plano alimentar (educativo, não prescritivo) ---
  const meals: Meal[] = [
    {
      name: "Café da Manhã",
      time: "07:00 - 08:00",
      options: [
        "1 pote de Iogurte natural (170g) + 1/2 xícara de fruta picada + 2 col. sopa de aveia",
        "2 Ovos mexidos + 2 fatias de pão integral + 1 fatia de queijo branco",
        "Vitamina: 200ml de leite (ou vegetal) + 1 banana + 2 col. sopa de aveia"
      ],
      macros: `~${Math.round(breakfastCalories)} kcal`,
      rationale: "Fornece energia inicial e proteínas para preservar massa magra."
    },
    {
      name: "Almoço",
      time: "12:00 - 13:00",
      options: [
        `120g de ${profile.proteinChoice} + 100g de ${profile.carbChoice} + Salada à vontade + 1 col. sobremesa de azeite`,
        `120g de ${profile.proteinChoice} grelhado + Legumes no vapor (brócolis/cenoura) + 100g de ${profile.carbChoice}`
      ],
      macros: `~${Math.round(lunchCalories)} kcal`,
      rationale: "Refeição principal com proteína magra, fibras e carboidrato complexo."
    },
    {
      name: "Lanche da Tarde",
      time: "16:00",
      options: [
        "1 Iogurte Natural + 1 Maçã média",
        "1 dose de Whey Protein + 1 Banana prata",
        "2 Castanhas do Pará + 1 Pera"
      ],
      macros: `~${Math.round(snackCalories)} kcal`,
      rationale: "Auxilia na saciedade e controle glicêmico."
    },
    {
      name: "Jantar",
      time: "19:30",
      options: [
        `120g de ${profile.proteinChoice} + Legumes refogados + 50g de ${profile.carbChoice}`,
        `120g de ${profile.proteinChoice} + Salada de folhas variadas + 1 col. sobremesa de azeite`
      ],
      macros: `~${Math.round(dinnerCalories)} kcal`,
      rationale: "Prioriza recuperação e digestão leve."
    }
  ];

  // 5. Workout Logic
  let workout: WorkoutPlan = { allowed: false };

  if (status === 'approved') {
    workout.allowed = true;
    
    workout.type = "Treino em Casa (Peso do Corpo)";
    workout.frequency = profile.activityLevel === 'sedentary' ? "3x semana" : "5x semana";
    workout.cardio = "Polichinelos, Marcha estacionária ou Dança";
    workout.focus = "Mobilidade, Resistência e Calistenia Básica";
    workout.exercises = [
      { name: "Agachamento Livre", sets: "3", reps: "12-15", note: "Mantenha a postura ereta." },
      { name: "Flexão de Braço (ou Joelhos)", sets: "3", reps: "8-12", note: "Contraia o abdômen." },
      { name: "Abdominal Supra", sets: "3", reps: "15-20", note: "Movimento curto e controlado." },
      { name: "Prancha Isométrica", sets: "3", reps: "20-30s", note: "Corpo alinhado." },
      { name: "Afundo (Passada)", sets: "3", reps: "10 cada", note: "Cuidado com o equilíbrio." }
    ];

    if (isHypertensive) {
      workout.exercises = workout.exercises?.map(ex => ({ ...ex, note: ex.note + " Não prenda a respiração." }));
      workout.cardio = "Caminhada leve no local (sem picos de intensidade).";
      const plankIndex = workout.exercises.findIndex(e => e.name.includes("Prancha"));
      if (plankIndex !== -1) {
         workout.exercises[plankIndex].note += " Evite apnéia.";
      }
    }
    
    if (profile.age < 25 && !isHypertensive) {
      workout.exercises.push({ name: "Burpees (Adaptado)", sets: "3", reps: "8-10", note: "Para condicionamento." });
    }
  } else {
    workout.reason = hasHeartCondition 
      ? "Risco cardíaco. Necessária liberação médica." 
      : "Protocolo sênior: Avaliação presencial recomendada.";
  }

  const dietWarnings = [
    "Os valores nutricionais apresentados são estimativas calculadas com base na base de dados USDA, podendo variar conforme preparo e porção.",
    "O app tem caráter informativo e educacional.",
    isDiabetic ? "Atenção rigorosa aos carboidratos." : "",
    isHypertensive ? "Controle severo de sódio." : "",
    "Hidratação constante."
  ].filter(Boolean);

  const workoutWarnings = [
    "Consulte um profissional de educação física antes de iniciar.",
    "Respeite seus limites e pare se sentir dor.",
    "Mantenha a postura correta em todos os exercícios.",
    isHypertensive ? "Evite prender a respiração (manobra de Valsalva)." : ""
  ].filter(Boolean);

  return {
    status,
    justification,
    diet: {
      calories: Math.round(targetCalories),
      protein: plan.protein,
      carbs: plan.carbs,
      fats: plan.fat,
      water: Math.round(profile.weight * 0.035 * 10) / 10,
      meals,
      warnings: dietWarnings
    },
    workout: {
      ...workout,
      warnings: workoutWarnings
    },
    bmr: plan.bmr,
    tdee: plan.tdee,
    targetCalories: plan.targetCalories,
    strategyValue: plan.strategyValue,
    goal: profile.goal,
    bmi: Number(plan.bmi.toFixed(1)),
    bmiClass: getBMIClassification(plan.bmi)
  };
};

// --- Components ---

const InputField = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {children}
  </div>
);

const Onboarding = ({ onComplete }: { onComplete: (p: UserProfile) => void }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    age: 30,
    gender: 'female',
    weight: 70,
    height: 165,
    activityLevel: 'sedentary',
    goal: 'lose',
    carbChoice: 'Arroz',
    proteinChoice: 'Frango',
    restrictions: '',
    conditions: ''
  });

  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl shadow-[#006D77]/5 border border-white p-6 md:p-10">
      {step === 1 && (
        <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-2xl font-bold text-[#264653] mb-3 tracking-tight">Bem-vindo ao seu Planejamento</h2>
          <p className="text-sm text-[#264653]/70 leading-relaxed max-w-md mx-auto">
            Desenvolvemos um protocolo personalizado de alimentação e movimento baseado em suas características biológicas únicas.
          </p>
          <div className="mt-6 p-4 bg-[#EDF6F9] rounded-2xl text-xs font-medium text-[#006D77] border border-[#83C5BE]/20">
            Utilizamos diretrizes atualizadas (2026) para calcular seu metabolismo e sugerir estratégias seguras e eficientes.
          </div>
        </div>
      )}

      <div className="mb-10">
        <div className="flex justify-between text-[10px] font-bold text-[#83C5BE] mb-2 uppercase tracking-widest">
          <span>Etapa {step} de 4</span>
          <span>{Math.round((step / 4) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-[#EDF6F9] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#006D77] transition-all duration-700 ease-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-[#264653] mb-8">Perfil Biológico</h2>
            <div className="grid grid-cols-2 gap-5">
              <InputField label="Idade">
                <input 
                  type="number" 
                  value={profile.age} 
                  onChange={(e) => handleChange('age', Number(e.target.value))}
                  className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
                />
              </InputField>
              <InputField label="Sexo">
                <select 
                  value={profile.gender} 
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
                >
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </InputField>
              <InputField label="Peso (kg)">
                <input 
                  type="number" 
                  value={profile.weight} 
                  onChange={(e) => handleChange('weight', Number(e.target.value))}
                  className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
                />
              </InputField>
              <InputField label="Altura (cm)">
                <input 
                  type="number" 
                  value={profile.height} 
                  onChange={(e) => handleChange('height', Number(e.target.value))}
                  className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
                />
              </InputField>
            </div>
            <button onClick={nextStep} className="w-full mt-8 bg-[#006D77] text-white py-4 rounded-xl font-bold hover:bg-[#005F68] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#006D77]/20 hover:shadow-xl hover:shadow-[#006D77]/30 hover:-translate-y-0.5">
              Continuar <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-[#264653] mb-8">Estilo de Vida</h2>
            <InputField label="Nível de Atividade">
              <select 
                value={profile.activityLevel} 
                onChange={(e) => handleChange('activityLevel', e.target.value)}
                className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
              >
                <option value="sedentary">Sedentário (Pouco movimento)</option>
                <option value="active">Ativo (Exercício regular)</option>
                <option value="athlete">Alto Rendimento (Atleta)</option>
              </select>
            </InputField>
            <InputField label="Objetivo Principal">
              <select 
                value={profile.goal} 
                onChange={(e) => handleChange('goal', e.target.value)}
                className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
              >
                <option value="lose">Emagrecimento Saudável</option>
                <option value="maintain">Manutenção de Peso</option>
                <option value="gain">Ganho de Massa Muscular</option>
              </select>
            </InputField>
            <div className="flex gap-4 mt-8">
              <button onClick={prevStep} className="flex-1 bg-[#EDF6F9] text-[#264653] py-4 rounded-xl font-bold hover:bg-[#E0F0F5] transition-colors">
                Voltar
              </button>
              <button onClick={nextStep} className="flex-1 bg-[#006D77] text-white py-4 rounded-xl font-bold hover:bg-[#005F68] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#006D77]/20 hover:shadow-xl hover:shadow-[#006D77]/30 hover:-translate-y-0.5">
                Continuar <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-[#264653] mb-8">Preferências Alimentares</h2>
            <p className="text-sm text-[#264653]/60 mb-6">Escolha suas bases preferidas para personalizar as variações do plano.</p>
            
            <InputField label="Proteína Principal Preferida">
              <select 
                value={profile.proteinChoice} 
                onChange={(e) => handleChange('proteinChoice', e.target.value)}
                className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
              >
                <option value="Frango">Frango</option>
                <option value="Peixe">Peixe</option>
                <option value="Carne Bovina">Carne Bovina</option>
              </select>
            </InputField>

            <InputField label="Carboidrato Principal Preferido">
              <select 
                value={profile.carbChoice} 
                onChange={(e) => handleChange('carbChoice', e.target.value)}
                className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
              >
                <option value="Arroz">Arroz</option>
                <option value="Batata">Batata</option>
                <option value="Macarrão">Macarrão</option>
              </select>
            </InputField>
            
            <div className="flex gap-4 mt-8">
              <button onClick={prevStep} className="flex-1 bg-[#EDF6F9] text-[#264653] py-4 rounded-xl font-bold hover:bg-[#E0F0F5] transition-colors">
                Voltar
              </button>
              <button onClick={nextStep} className="flex-1 bg-[#006D77] text-white py-4 rounded-xl font-bold hover:bg-[#005F68] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#006D77]/20 hover:shadow-xl hover:shadow-[#006D77]/30 hover:-translate-y-0.5">
                Continuar <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-[#264653] mb-8">Saúde & Segurança</h2>
            <p className="text-sm text-[#264653]/60 mb-6">Informações obrigatórias para garantir sua segurança.</p>
            
            <InputField label="Condições de Saúde (ex: Cardíaca, Hipertensão)">
              <input 
                type="text"
                value={profile.conditions} 
                onChange={(e) => handleChange('conditions', e.target.value)}
                placeholder="Digite aqui..."
                className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
              />
            </InputField>

            <InputField label="Alergias Alimentares (ex: Amendoim, Lactose)">
              <input 
                type="text"
                value={profile.restrictions} 
                onChange={(e) => handleChange('restrictions', e.target.value)}
                placeholder="Digite aqui..."
                className="w-full p-3.5 border border-[#83C5BE]/40 rounded-xl focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] outline-none bg-[#FAFAFA] text-[#264653] transition-all"
              />
            </InputField>
            
            <div className="bg-[#EDF6F9] border border-[#83C5BE]/30 p-4 rounded-xl mb-8 flex gap-3">
              <ShieldAlert className="text-[#E29578] shrink-0" size={20} />
              <p className="text-xs text-[#264653]/80 leading-relaxed">
                Ao gerar este plano, você confirma que as informações são verdadeiras. O sistema aplicará travas de segurança baseadas nos dados fornecidos.
              </p>
            </div>

            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 bg-[#EDF6F9] text-[#264653] py-4 rounded-xl font-bold hover:bg-[#E0F0F5] transition-colors">
                Voltar
              </button>
              <button onClick={() => onComplete(profile)} className="flex-1 bg-[#006D77] text-white py-4 rounded-xl font-bold hover:bg-[#005F68] transition-all shadow-lg shadow-[#006D77]/20 hover:shadow-xl hover:shadow-[#006D77]/30 hover:-translate-y-0.5">
                Gerar Plano
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ExerciseItem: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Find exact match or partial match for safety
  const guideKey = Object.keys(EXERCISE_GUIDE).find(k => exercise.name.includes(k));
  const details = guideKey ? EXERCISE_GUIDE[guideKey] : null;

  return (
    <div 
      className="group relative p-5 border border-[#83C5BE]/30 rounded-2xl bg-white hover:border-[#006D77] transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-[#264653] group-hover:text-[#006D77] transition-colors flex items-center gap-2 text-base">
          {exercise.name}
          <Info size={16} className="text-[#83C5BE] opacity-50 group-hover:opacity-100 transition-opacity" />
        </h4>
        <span className="text-xs font-bold bg-[#264653] text-white px-2.5 py-1 rounded-lg shadow-sm">
          {exercise.sets} x {exercise.reps}
        </span>
      </div>
      {exercise.note && <p className="text-xs text-[#264653]/60 mt-2 font-medium">💡 {exercise.note}</p>}

      {/* Detail Tooltip/Card */}
      <AnimatePresence>
        {isOpen && details && (
          <motion.div 
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[#83C5BE]/20 text-xs text-[#264653] space-y-3 bg-[#EDF6F9] -mx-5 -mb-5 p-5 rounded-b-2xl">
              <div className="grid gap-3">
                <p><span className="font-bold text-[#006D77] uppercase tracking-wider text-[10px]">Posição:</span> <br/>{details.posicao}</p>
                <p><span className="font-bold text-[#006D77] uppercase tracking-wider text-[10px]">Execução:</span> <br/>{details.execucao}</p>
                <div className="flex gap-3 mt-1">
                  <div className="flex-1 bg-white p-3 rounded-xl border border-[#83C5BE]/30 shadow-sm">
                    <span className="block font-bold text-[#006D77] mb-1 uppercase tracking-wider text-[10px]">Cuidados</span>
                    {details.cuidados}
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-xl border border-[#83C5BE]/30 shadow-sm">
                    <span className="block font-bold text-[#E29578] mb-1 uppercase tracking-wider text-[10px]">Evite</span>
                    {details.erros}
                  </div>
                </div>
                <p className="mt-1 text-[#264653]/60 italic"><span className="font-bold not-italic text-[#006D77]">Respiração:</span> {details.respiracao}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Dashboard = ({ profile, plan, onReset }: { profile: UserProfile, plan: PlanResult, onReset: () => void }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'diet' | 'workout' | 'goals' | 'details' | 'guidelines' | 'howItWorks' | 'export' | 'about'>('summary');
  const [variationIndex, setVariationIndex] = useState(0);
  
  const pixKey = "8a5e5650-ec84-4916-a027-414a65017fba";
  const pixPayload = generatePixPayload(pixKey, "ALIMENTACAO E EXERCICIO", "SAO PAULO");

  if (plan.status === 'denied_minor') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-[#FFCCBC] p-8 text-center">
        <div className="w-16 h-16 bg-[#FFF3E0] rounded-full flex items-center justify-center mx-auto mb-4">
          <Ban className="text-[#BF360C]" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-[#264653] mb-2">Acesso Restrito</h2>
        <p className="text-[#5C6B73] mb-6">{plan.justification[0]}</p>
        <p className="text-sm text-[#98A8B0] mb-8">{plan.justification[1]}</p>
        <button onClick={onReset} className="text-[#006D77] font-medium hover:underline hover:text-[#264653]">
          Voltar ao início
        </button>
      </div>
    );
  }

  const renderSummary = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#264653]">Resumo do Plano</h2>
        <p className="text-sm text-[#264653]/60">Visão geral das suas metas diárias</p>
      </div>

      {/* Main Calories Card */}
      <div className="bg-[#006D77] text-white p-8 rounded-3xl shadow-lg shadow-[#006D77]/20 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent)]"></div>
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Meta Calórica Diária</div>
          <div className="text-5xl font-extrabold mb-2">{plan.diet?.calories} <span className="text-2xl font-medium">kcal</span></div>
          <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
            {profile.goal === 'lose' ? 'Déficit Calórico' : profile.goal === 'gain' ? 'Superávit Calórico' : 'Manutenção'}
          </div>
        </div>
      </div>

      {/* Macros Grid */}
      {plan.diet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#EDF6F9] p-5 rounded-2xl border border-[#83C5BE]/30 text-center">
            <div className="text-[#006D77] text-[10px] font-bold uppercase tracking-wider mb-2">Proteína</div>
            <div className="text-3xl font-bold text-[#264653] mb-1">{plan.diet.protein}g</div>
            <div className="text-[10px] text-[#264653]/60 font-mono mb-3">
              {plan.diet.protein}g × 4 kcal = {plan.diet.protein * 4} kcal
            </div>
            <p className="text-[11px] text-[#264653]/80 leading-tight">
              Ajuda a preservar massa magra e saciedade.
            </p>
          </div>
          <div className="bg-[#EDF6F9] p-5 rounded-2xl border border-[#83C5BE]/30 text-center">
            <div className="text-[#E29578] text-[10px] font-bold uppercase tracking-wider mb-2">Carbos</div>
            <div className="text-3xl font-bold text-[#264653] mb-1">{plan.diet.carbs}g</div>
            <div className="text-[10px] text-[#264653]/60 font-mono mb-3">
              {plan.diet.carbs}g × 4 kcal = {plan.diet.carbs * 4} kcal
            </div>
            <p className="text-[11px] text-[#264653]/80 leading-tight">
              Energia ajustada para sua rotina e meta.
            </p>
          </div>
          <div className="bg-[#EDF6F9] p-5 rounded-2xl border border-[#83C5BE]/30 text-center">
            <div className="text-[#BF360C] text-[10px] font-bold uppercase tracking-wider mb-2">Gorduras</div>
            <div className="text-3xl font-bold text-[#264653] mb-1">{plan.diet.fats}g</div>
            <div className="text-[10px] text-[#264653]/60 font-mono mb-3">
              {plan.diet.fats}g × 9 kcal = {plan.diet.fats * 9} kcal
            </div>
            <p className="text-[11px] text-[#264653]/80 leading-tight">
              Essencial para regulação hormonal.
            </p>
          </div>
        </div>
      )}

      {/* BMI & Goal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#83C5BE]/30 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#83C5BE] font-bold uppercase tracking-wider">IMC Atual</div>
            <div className="text-2xl font-bold text-[#264653]">{plan.bmi.toFixed(1)}</div>
          </div>
          <div className={`text-xs font-bold px-3 py-1 rounded-full ${plan.status === 'approved' ? 'bg-[#E0F2F1] text-[#00695C]' : 'bg-[#FFF3E0] text-[#E65100]'}`}>
            {plan.bmiClass}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#83C5BE]/30 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#83C5BE] font-bold uppercase tracking-wider">Objetivo</div>
            <div className="text-lg font-bold text-[#264653]">
              {profile.goal === 'lose' ? 'Emagrecer' : profile.goal === 'gain' ? 'Ganhar Massa' : 'Manter Peso'}
            </div>
          </div>
          <CheckCircle2 className="text-[#006D77]" size={24} />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 pt-4">
        <button 
          onClick={onReset}
          className="bg-white text-[#E29578] border border-[#E29578]/30 py-4 rounded-xl font-bold hover:bg-[#FFF3E0] transition-all flex items-center justify-center gap-2 w-full"
        >
          <ArrowLeft size={18} /> Refazer dados para novo plano
        </button>
      </div>
    </div>
  );

  const renderDiet = () => plan.diet && (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#264653]">Plano Alimentar</h3>
        <span className="text-xs font-bold bg-[#E0F2F1] text-[#00695C] px-3 py-1 rounded-full border border-[#B2DFDB]">
          Variação {variationIndex + 1}
        </span>
      </div>

      <div className="space-y-6">
        {plan.diet.meals.map((meal, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-[#83C5BE]/30 shadow-sm hover:border-[#006D77]/30 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-[#264653] text-lg flex items-center gap-2">
                  {meal.name}
                </h4>
                <span className="text-[10px] font-bold text-[#83C5BE] bg-[#EDF6F9] px-2 py-0.5 rounded mt-1 inline-block">{meal.time}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#00695C] bg-[#E0F2F1] px-2 py-1 rounded border border-[#B2DFDB] block mb-1">
                  {meal.macros}
                </span>
              </div>
            </div>
            
            <div className="bg-[#EDF6F9] p-4 rounded-xl border-l-4 border-[#006D77] mb-3">
              <p className="text-sm font-medium text-[#264653] whitespace-pre-line leading-relaxed">
                {meal.options[variationIndex] || meal.options[0]}
              </p>
            </div>

            <p className="text-xs text-[#264653]/60 italic mb-2">
              💡 {meal.rationale}
            </p>
            {meal.note && (
              <p className="text-[10px] text-[#E65100] font-medium bg-[#FFF3E0] p-2 rounded-lg inline-block">
                Nota: {meal.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderWorkout = () => plan.workout?.allowed && (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#264653] text-white p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-bold mb-1">{plan.workout.type}</h3>
        <p className="text-sm opacity-80 mb-4">Frequência sugerida: {plan.workout.frequency}</p>
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded">Foco: {plan.workout.focus}</span>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-[#264653] flex items-center gap-2">
          <Dumbbell size={18} /> Exercícios
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          {plan.workout.exercises?.map((ex, idx) => <ExerciseItem key={idx} exercise={ex} />)}
        </div>
      </div>

      <div className="bg-[#FFF3E0] p-5 rounded-2xl border border-[#FFCCBC] space-y-3">
        <h4 className="font-bold text-[#BF360C] flex items-center gap-2"><Activity size={18} /> Cardio & Saúde</h4>
        <p className="text-sm text-[#D84315]"><strong>Cardio:</strong> {plan.workout.cardio}</p>
        <div className="h-px bg-[#FFCCBC] w-full"></div>
        <ul className="text-xs text-[#D84315] space-y-1 list-disc list-inside">
          {plan.workout.warnings?.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-[#EDF6F9] p-2 rounded-lg text-[#006D77]">
          <Activity size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#264653]">Detalhes Técnicos</h3>
          <p className="text-xs text-[#264653]/60">Entenda os números por trás do seu plano</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-[#E5E5E5] shadow-sm">
          <div className="text-[10px] text-[#83C5BE] font-bold uppercase mb-1">Taxa Metabólica Basal (TMB)</div>
          <div className="text-2xl font-bold text-[#264653] mb-2">{plan.bmr} kcal</div>
          <p className="text-[10px] text-[#264653]/60 leading-relaxed">
            Quanto seu corpo gasta apenas para sobreviver (respirar, bater o coração) em repouso absoluto. Calculado via fórmula Mifflin-St Jeor.
          </p>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-[#E5E5E5] shadow-sm">
          <div className="text-[10px] text-[#83C5BE] font-bold uppercase mb-1">Gasto Energético Total (TDEE)</div>
          <div className="text-2xl font-bold text-[#264653] mb-2">{plan.tdee} kcal</div>
          <p className="text-[10px] text-[#264653]/60 leading-relaxed">
            Sua TMB multiplicada pelo fator de atividade ({profile.activityLevel}). É o que você gasta num dia normal.
          </p>
        </div>
      </div>

      <div className="bg-[#EDF6F9] p-6 rounded-2xl border border-[#83C5BE]/30">
        <h4 className="font-bold text-[#006D77] mb-4 text-sm uppercase tracking-wider">Cálculo do Plano</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-[#83C5BE]/20 pb-2">
            <span>Gasto Total (TDEE)</span>
            <span className="font-mono">{plan.tdee}</span>
          </div>
          <div className="flex justify-between border-b border-[#83C5BE]/20 pb-2">
            <span>Estratégia ({profile.goal === 'lose' ? 'Déficit' : profile.goal === 'gain' ? 'Superávit' : 'Manutenção'})</span>
            <span className={`font-mono font-bold ${profile.goal === 'lose' ? 'text-[#E76F51]' : 'text-[#006D77]'}`}>
              {profile.goal === 'lose' ? '-500' : profile.goal === 'gain' ? '+300' : '0'}
            </span>
          </div>
          <div className="flex justify-between pt-2 font-bold text-[#264653] text-lg">
            <span>Meta Final</span>
            <span>{plan.diet?.calories} kcal</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-4">
        <h4 className="font-bold text-[#264653] text-sm uppercase tracking-wider flex items-center gap-2">
          <Info size={16} className="text-[#006D77]" /> Entenda o Déficit Calórico
        </h4>
        <div className="space-y-3 text-xs text-[#264653]/80 leading-relaxed">
          <p>
            <strong className="text-[#006D77]">O que é?</strong><br/>
            Déficit calórico ocorre quando o corpo consome menos energia do que gasta ao longo do dia. Para compensar, ele utiliza reservas corporais (gordura), favorecendo a redução de peso.
          </p>
          <p>
            <strong className="text-[#006D77]">Por que moderado?</strong><br/>
            Déficits muito agressivos podem causar perda de massa magra, queda de imunidade e efeito sanfona. Utilizamos valores seguros (-500kcal) para resultados sustentáveis.
          </p>
          <p>
            <strong className="text-[#006D77]">É igual para todos?</strong><br/>
            Não. O cálculo considera sua idade, peso, altura, sexo e nível de atividade. O que funciona para você é único para seu metabolismo.
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] text-xs text-[#264653]/70 space-y-2">
        <h5 className="font-bold text-[#264653] mb-1">Fontes e Referências:</h5>
        <ul className="list-disc list-inside space-y-1">
          <li>Cálculos energéticos baseados na equação de Mifflin-St Jeor (padrão ouro).</li>
          <li>Composição nutricional baseada na USDA FoodData Central.</li>
          <li>Diretrizes de macronutrientes ajustadas para {profile.goal === 'lose' ? 'preservação de massa magra' : 'hipertrofia/manutenção'}.</li>
        </ul>
      </div>
    </div>
  );

  const renderGuidelines = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-[#E0F2F1] p-2 rounded-lg text-[#00695C]">
          <HeartPulse size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#264653]">Saúde Integral e Acompanhamento</h3>
          <p className="text-xs text-[#264653]/60">Orientações profissionais importantes</p>
        </div>
      </div>

      <div className="bg-[#EDF6F9] p-6 rounded-2xl border border-[#83C5BE]/30 text-sm text-[#006D77] leading-relaxed">
        <p className="font-medium">
          Cuidar da saúde vai além da aparência ou números. Envolve corpo, mente e escolhas conscientes ao longo do tempo. 
          Buscar ajuda profissional não é sinal de fraqueza, mas um gesto de responsabilidade e respeito por si mesmo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm hover:border-[#83C5BE]/50 transition-colors">
          <h4 className="font-bold text-[#264653] mb-2 flex items-center gap-2 text-sm">
            <span className="text-[#E29578]">🧠</span> Psicologia
          </h4>
          <p className="text-xs text-[#264653]/70 leading-relaxed">
            O acompanhamento psicológico tem um papel essencial no equilíbrio emocional, no fortalecimento da autoestima 
            e no processo de aceitação do próprio corpo. Cuidar da mente influencia diretamente hábitos, decisões e a forma 
            como nos relacionamos com nós mesmos e com o mundo.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm hover:border-[#83C5BE]/50 transition-colors">
          <h4 className="font-bold text-[#264653] mb-2 flex items-center gap-2 text-sm">
            <span className="text-[#006D77]">🥗</span> Nutrição
          </h4>
          <p className="text-xs text-[#264653]/70 leading-relaxed">
            O nutricionista auxilia na construção de uma relação mais saudável com a alimentação, considerando a 
            individualidade, a rotina e as necessidades reais de cada pessoa, sem extremismos ou promessas ilusórias.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm hover:border-[#83C5BE]/50 transition-colors">
          <h4 className="font-bold text-[#264653] mb-2 flex items-center gap-2 text-sm">
            <span className="text-[#2A9D8F]">⚕️</span> Endocrinologia
          </h4>
          <p className="text-xs text-[#264653]/70 leading-relaxed">
            A endocrinologia é fundamental para avaliar hormônios, metabolismo e condições que impactam 
            diariamente energia, peso e bem-estar geral, ajudando a compreender o corpo de forma mais ampla e precisa.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm hover:border-[#83C5BE]/50 transition-colors">
          <h4 className="font-bold text-[#264653] mb-2 flex items-center gap-2 text-sm">
            <span className="text-[#E76F51]">❤️</span> Cardiologia
          </h4>
          <p className="text-xs text-[#264653]/70 leading-relaxed">
            A cardiologia contribui para a saúde do coração, especialmente quando mudanças alimentares ou a prática 
            de atividades físicas fazem parte da rotina, garantindo segurança e prevenção.
          </p>
        </div>
      </div>

      <div className="bg-[#FFF3E0] p-5 rounded-2xl border border-[#FFCCBC]">
        <h4 className="font-bold text-[#BF360C] mb-2 flex items-center gap-2 text-sm">
          <Activity size={16} /> Movimento Consciente
        </h4>
        <p className="text-xs text-[#D84315] leading-relaxed">
          A prática de exercícios físicos, quando orientada, fortalece o corpo e a mente. Não como punição ou cobrança, mas como 
          cuidado, movimento e valorização da própria saúde.
        </p>
      </div>
    </div>
  );

  const renderGoalsStrategy = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-[#E0F2F1] p-2 rounded-lg text-[#00695C]">
          <Target size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#264653]">Metas e Estratégia</h3>
          <p className="text-xs text-[#264653]/60">Entenda a lógica por trás do seu plano</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <h4 className="font-bold text-[#264653] mb-3 text-sm flex items-center gap-2">
            <span className="text-[#E76F51]">1.</span> Por que essa meta calórica?
          </h4>
          <p className="text-xs text-[#264653]/80 leading-relaxed mb-4">
            Calculamos seu Gasto Energético Total (TDEE) em <strong>{plan.tdee} kcal</strong>. 
            Para atingir seu objetivo de <strong>{profile.goal === 'lose' ? 'Emagrecimento' : profile.goal === 'gain' ? 'Ganho de Massa' : 'Manutenção'}</strong>, 
            aplicamos um {profile.goal === 'lose' ? 'déficit' : profile.goal === 'gain' ? 'superávit' : 'ajuste'} estratégico.
          </p>
          <div className="bg-[#EDF6F9] p-4 rounded-xl border border-[#83C5BE]/30 text-xs">
            <p className="font-mono text-[#006D77] mb-1">
              {plan.tdee} (Gasto) {plan.strategyValue && plan.strategyValue > 0 ? `+ ${plan.strategyValue}` : plan.strategyValue && plan.strategyValue < 0 ? `- ${Math.abs(plan.strategyValue)}` : ''} (Estratégia) = <strong>{plan.diet?.calories} kcal</strong> (Meta)
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <h4 className="font-bold text-[#264653] mb-3 text-sm flex items-center gap-2">
            <span className="text-[#2A9D8F]">2.</span> Por que é seguro?
          </h4>
          <p className="text-xs text-[#264653]/80 leading-relaxed">
            Não utilizamos restrições severas. O {plan.strategyValue && plan.strategyValue < 0 ? `déficit estimado de ${Math.abs(plan.strategyValue)}kcal` : plan.strategyValue && plan.strategyValue > 0 ? `superávit estimado de ${plan.strategyValue}kcal` : 'ajuste'} é calculado com base em diretrizes para {profile.goal === 'lose' ? 'perda de peso sustentável' : profile.goal === 'gain' ? 'ganho de massa' : 'manutenção'}, 
            visando auxiliar na preservação de massa magra e evitar o "efeito sanfona". Para ganho de massa, o superávit é controlado para minimizar o ganho de gordura.
            Além disso, respeitamos limites mínimos de segurança (1200kcal para mulheres, 1500kcal para homens).
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <h4 className="font-bold text-[#264653] mb-3 text-sm flex items-center gap-2">
            <span className="text-[#E9C46A]">3.</span> Distribuição de Nutrientes
          </h4>
          <ul className="space-y-3 text-xs text-[#264653]/80 leading-relaxed">
            <li className="flex gap-2">
              <span className="font-bold text-[#006D77] min-w-[80px]">Proteínas:</span>
              <span>Calculada em {profile.goal === 'lose' ? '1.8g' : '1.6g'} por kg de peso corporal. Essencial para manutenção muscular e saciedade.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#BF360C] min-w-[80px]">Gorduras:</span>
              <span>Fixada em 0.8g por kg. Fundamental para a produção hormonal e absorção de vitaminas.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#E76F51] min-w-[80px]">Carboidratos:</span>
              <span>Preenchem o restante das calorias para fornecer energia para os treinos e atividades diárias.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderHowItWorks = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-[#E0F2F1] p-2 rounded-lg text-[#00695C]">
          <BookOpen size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#264653]">Entenda o Cálculo</h3>
          <p className="text-xs text-[#264653]/60">Transparência total sobre o funcionamento</p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <h4 className="font-bold text-[#264653] mb-4 text-sm uppercase tracking-wider border-b border-[#E5E5E5] pb-2">Dados Utilizados</h4>
          <p className="text-xs text-[#264653]/80 mb-4">
            O aplicativo utiliza exclusivamente as informações fornecidas por você:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#264653]/70">
            <div className="bg-[#F8F9FA] p-2 rounded">Idade</div>
            <div className="bg-[#F8F9FA] p-2 rounded">Peso</div>
            <div className="bg-[#F8F9FA] p-2 rounded">Altura</div>
            <div className="bg-[#F8F9FA] p-2 rounded">Sexo Biológico</div>
            <div className="bg-[#F8F9FA] p-2 rounded">Nível de Atividade</div>
            <div className="bg-[#F8F9FA] p-2 rounded">Objetivo</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <h4 className="font-bold text-[#264653] mb-4 text-sm uppercase tracking-wider border-b border-[#E5E5E5] pb-2">Fórmulas e Ciência</h4>
          <ul className="space-y-3 text-xs text-[#264653]/80 leading-relaxed">
            <li>
              <strong className="text-[#006D77]">Mifflin-St Jeor:</strong> Equação utilizada para calcular sua Taxa Metabólica Basal (TMB). É considerada atualmente a mais precisa para a população geral.
            </li>
            <li>
              <strong className="text-[#006D77]">Fatores de Atividade:</strong> Multiplicadores padronizados (1.2 a 1.9) que ajustam a TMB conforme seu nível de movimento diário.
            </li>
            <li>
              <strong className="text-[#006D77]">USDA FoodData:</strong> Base de dados nutricionais utilizada para estimar os macronutrientes dos alimentos sugeridos.
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#E0F2F1] p-5 rounded-2xl border border-[#B2DFDB]">
            <h4 className="font-bold text-[#00695C] mb-2 text-sm flex items-center gap-2"><CheckCircle2 size={16}/> O que o app FAZ</h4>
            <ul className="text-xs text-[#004D40] space-y-1 list-disc list-inside">
              <li>Estima gastos energéticos.</li>
              <li>Sugere distribuição de macros.</li>
              <li>Organiza cardápios de exemplo.</li>
              <li>Educa sobre hábitos saudáveis.</li>
            </ul>
          </div>
          <div className="bg-[#FFEBEE] p-5 rounded-2xl border border-[#FFCDD2]">
            <h4 className="font-bold text-[#C62828] mb-2 text-sm flex items-center gap-2"><Ban size={16}/> O que o app NÃO faz</h4>
            <ul className="text-xs text-[#B71C1C] space-y-1 list-disc list-inside">
              <li>Diagnóstico médico.</li>
              <li>Prescrição dietética individualizada.</li>
              <li>Tratamento de doenças.</li>
              <li>Substituição de profissionais.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-[#E0F2F1] p-2 rounded-lg text-[#00695C]">
          <GraduationCap size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#264653]">Sobre o App</h3>
          <p className="text-xs text-[#264653]/60">Conheça o projeto e quem desenvolveu</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5] shadow-sm text-center">
        <img 
          src="/profile.jpg" 
          alt="Viviane de Oliveira" 
          className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-[#EDF6F9]"
          onError={(e) => {
            e.currentTarget.src = "https://ui-avatars.com/api/?name=Viviane+de+Oliveira&background=EDF6F9&color=006D77&size=128";
          }}
        />
        <h4 className="text-lg font-bold text-[#264653] mb-1">Viviane de Oliveira</h4>
        <p className="text-sm text-[#006D77] font-medium mb-6">Estudante de Segurança da Informação</p>
        
        <div className="max-w-md mx-auto text-xs text-[#264653]/70 leading-relaxed space-y-4 text-justify">
          <p>
            Este aplicativo foi desenvolvido como um projeto pessoal de estudo, com o objetivo de explorar a aplicação de algoritmos no apoio à organização de hábitos relacionados à alimentação e à atividade física.
          </p>
          <p>
            A proposta é demonstrar, de forma simples e educativa, como cálculos computacionais podem auxiliar na estimativa de necessidades energéticas e na organização de rotinas básicas de saúde.
          </p>
          <p>
            Este projeto não possui finalidade profissional ou clínica e não substitui a orientação de médicos, nutricionistas ou outros profissionais da saúde.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
          <p className="text-[10px] text-[#264653]/50 uppercase tracking-widest font-bold mb-2">Bases Científicas</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-[#F8F9FA] px-3 py-1 rounded-full text-[10px] text-[#264653]/60 border border-[#E5E5E5]">Mifflin-St Jeor Equation</span>
            <span className="bg-[#F8F9FA] px-3 py-1 rounded-full text-[10px] text-[#264653]/60 border border-[#E5E5E5]">USDA FoodData Central</span>
            <span className="bg-[#F8F9FA] px-3 py-1 rounded-full text-[10px] text-[#264653]/60 border border-[#E5E5E5]">WHO Guidelines</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExport = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-[#264653]">Exportar e Salvar</h3>
        <p className="text-sm text-[#264653]/70">Leve seu plano com você</p>
      </div>

      <div className="bg-[#FAFAFA] p-6 rounded-2xl border border-[#E5E5E5] shadow-inner">
        <h4 className="font-bold text-[#264653] mb-2 text-sm">O que será copiado:</h4>
        <ul className="text-xs text-[#264653]/70 list-disc list-inside space-y-1 mb-4">
          <li>Resumo do seu perfil e metas.</li>
          <li>Todas as refeições detalhadas da variação atual.</li>
          <li>Plano de treino completo com exercícios e séries.</li>
          <li>Recomendações de segurança.</li>
        </ul>
        
        <button 
          onClick={() => {
            const text = `PLANO PERSONALIZADO - DIRETRIZES 2026\n\nPERFIL: ${profile.age} anos, ${profile.weight}kg, ${profile.height}cm\nOBJETIVO: ${profile.goal === 'lose' ? 'Emagrecimento' : profile.goal === 'gain' ? 'Ganho de Massa' : 'Manutenção'}\nIMC: ${plan.bmi} (${plan.bmiClass})\n\nMETAS DIÁRIAS:\n- Calorias: ${plan.diet?.calories} kcal\n- Proteína: ${plan.diet?.protein}g\n- Carboidratos: ${plan.diet?.carbs}g\n- Gorduras: ${plan.diet?.fats}g\n- Água: ${plan.diet?.water}L\n\nREFEIÇÕES (Variação ${variationIndex + 1}):\n${plan.diet?.meals.map(m => `\n[${m.name} - ${m.time}]\nOpção: ${m.options[variationIndex] || m.options[0]}\nMacros: ${m.macros}\n`).join('')}\nTREINO:\n${plan.workout?.allowed ? `- Tipo: ${plan.workout.type}\n- Frequência: ${plan.workout.frequency}\n- Cardio: ${plan.workout.cardio}\n\nEXERCÍCIOS:\n${plan.workout.exercises?.map(e => `- ${e.name}: ${e.sets}x ${e.reps} (${e.note})`).join('\n')}` : '- Não gerado por restrições de segurança.'}\n\nAVISO LEGAL:\nEste plano é gerado automaticamente com base em algoritmos e não substitui a consulta com médico ou nutricionista.`;
            navigator.clipboard.writeText(text);
            alert("Plano completo copiado com sucesso!");
          }}
          className="w-full bg-[#006D77] text-white py-5 rounded-xl font-bold hover:bg-[#005F68] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#006D77]/20 hover:-translate-y-1"
        >
          <Copy size={20} /> Copiar Plano Completo
        </button>
      </div>

      <div className="bg-[#FFF3E0] p-5 rounded-2xl border border-[#FFCCBC]">
        <h4 className="font-bold text-[#BF360C] mb-2 flex items-center gap-2 text-sm"><ShieldAlert size={16} /> Aviso Legal</h4>
        <p className="text-[11px] text-[#D84315] leading-relaxed text-justify">
          Este documento é gerado automaticamente por um sistema baseado em diretrizes gerais de saúde. Ele não leva em conta particularidades metabólicas complexas, exames de sangue ou histórico médico detalhado. O uso destas informações é de total responsabilidade do usuário. Recomendamos fortemente a validação deste plano com um nutricionista e um profissional de educação física antes de iniciar.
        </p>
      </div>

      {/* Pix Support Section - Moved to Export */}
      <div className="bg-[#EDF6F9] p-6 rounded-3xl border border-[#83C5BE]/20 flex flex-col sm:flex-row items-center gap-6 shadow-sm mt-8">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-white/60 shrink-0">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(pixPayload)}`} 
            alt="QR Code Pix" 
            className="w-24 h-24 object-contain mix-blend-multiply"
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h4 className="font-bold text-[#006D77] mb-1 text-lg">Apoio Voluntário</h4>
          <p className="text-xs text-[#264653]/70 mb-4 leading-relaxed">
            Este app é gratuito. Se te ajudou, uma contribuição voluntária ajuda a mantê-lo online.
          </p>
          <div className="bg-white border border-[#E29578]/30 rounded-xl p-2 flex items-center justify-between gap-3 hover:border-[#E29578]/50 transition-colors group cursor-pointer" onClick={() => navigator.clipboard.writeText(pixKey)}>
            <p className="font-mono text-[#264653] text-[10px] truncate flex-1 px-2">{pixKey}</p>
            <button className="text-[#006D77] p-1.5 rounded-lg bg-[#EDF6F9] shrink-0"><Copy size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );

  const menuItems = [
    { id: 'summary', label: 'Resumo', icon: LayoutDashboard },
    { id: 'diet', label: 'Dieta', icon: Utensils, disabled: !plan.diet },
    { id: 'workout', label: 'Treino', icon: Dumbbell, disabled: !plan.workout?.allowed },
    { id: 'goals', label: 'Metas e Estratégia', icon: Target, disabled: !plan.diet },
    { id: 'details', label: 'Detalhes Técnicos', icon: Info },
    { id: 'guidelines', label: 'Orientações', icon: HeartPulse },
    { id: 'howItWorks', label: 'Como Funciona', icon: BookOpen },
    { id: 'export', label: 'Exportar', icon: Download },
    { id: 'about', label: 'Sobre o App', icon: GraduationCap },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start max-w-7xl mx-auto w-full relative pb-24 lg:pb-0">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white rounded-3xl border border-[#83C5BE]/30 p-4 shadow-sm sticky top-24 min-h-[80vh] flex-col">
        <nav className="flex flex-col gap-2 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left ${
                activeTab === item.id 
                  ? 'bg-[#006D77] text-white shadow-md' 
                  : item.disabled 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'text-[#264653]/60 hover:bg-[#EDF6F9] hover:text-[#006D77]'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="h-px bg-[#83C5BE]/20 my-4"></div>
        <button 
          onClick={onReset}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-[#E29578] hover:bg-[#FFF3E0] transition-all w-full text-left mt-auto"
        >
          <RefreshCw size={18} />
          Refazer Dados
        </button>
      </aside>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#83C5BE]/30 z-50 px-4 py-2 flex overflow-x-auto no-scrollbar gap-2 items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            disabled={item.disabled}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[72px] p-2 rounded-xl transition-all shrink-0 ${
              activeTab === item.id 
                ? 'text-[#006D77]' 
                : item.disabled 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'text-[#264653]/40'
            }`}
          >
            <div className={`p-2 rounded-full ${activeTab === item.id ? 'bg-[#E0F2F1]' : ''}`}>
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold whitespace-nowrap ${activeTab === item.id ? 'text-[#006D77]' : ''}`}>
              {item.label.split(' ')[0]}
            </span>
          </button>
        ))}
        <div className="w-px h-8 bg-[#83C5BE]/20 mx-2 shrink-0"></div>
        <button 
          onClick={onReset}
          className="flex flex-col items-center justify-center gap-1 min-w-[72px] p-2 rounded-xl transition-all shrink-0 text-[#E29578]"
        >
          <div className="p-2 rounded-full bg-[#FFF3E0]">
            <RefreshCw size={20} />
          </div>
          <span className="text-[10px] font-bold whitespace-nowrap">Refazer</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-white rounded-3xl border border-[#83C5BE]/30 p-6 md:p-8 shadow-sm min-h-[500px] lg:max-w-5xl">
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'diet' && renderDiet()}
        {activeTab === 'workout' && renderWorkout()}
        {activeTab === 'goals' && renderGoalsStrategy()}
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'guidelines' && renderGuidelines()}
        {activeTab === 'howItWorks' && renderHowItWorks()}
        {activeTab === 'export' && renderExport()}
        {activeTab === 'about' && renderAbout()}
        
        <div className="mt-12 pt-8 border-t border-[#E5E5E5] text-center">
          <p className="text-[10px] text-[#264653]/50 leading-relaxed max-w-md mx-auto">
            As informações geradas têm caráter informativo e não substituem orientação de profissionais de saúde.
          </p>
        </div>
      </main>
    </div>
  );
};

// --- Welcome Page ---

const WelcomePage = ({ onEnter }: { onEnter: () => void }) => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e9f1f4_0%,_#f4f8fa_55%,_#ffffff_100%)] font-sans text-[#1a2f3a] flex flex-col selection:bg-[#83C5BE]/30">
      {/* Header */}
      <header className="p-6 text-center">
        <span className="text-xs text-[#4b6470] font-medium tracking-wide">
          Desenvolvido por Viviane de Oliveira © 2026
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-4xl mx-auto w-full">
        
        {/* Aura Wrapper */}
        <div className="relative w-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Glowing Aura */}
          <div className="absolute -inset-1 bg-gradient-to-br from-[#83C5BE]/40 via-transparent to-[#006D77]/20 rounded-[24px] blur-xl opacity-70"></div>
          
          {/* Gradient Border Wrapper */}
          <div className="relative p-[1px] rounded-[24px] bg-gradient-to-br from-[#83C5BE]/50 via-[#E5E5E5]/30 to-[#006D77]/30 shadow-[0_14px_34px_rgba(0,0,0,0.06),_0_6px_14px_rgba(0,0,0,0.04)]">
            
            {/* Inner Card */}
            <div className="bg-[#f0f5f7] p-8 md:p-10 rounded-[24px] w-full text-left relative overflow-hidden">
              
              {/* Subtle inner top highlight */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>

              <div className="text-center mb-10 pb-8 border-b border-[#E5E5E5]/60">
                <h1 className="text-4xl md:text-5xl font-extrabold text-[#10252f] mb-4 tracking-tight">
                  Alimentação e Exercício
                </h1>
                <p className="text-lg md:text-xl text-[#1a2f3a] font-medium tracking-wide">
                  Organize sua rotina. Transforme seus hábitos.
                </p>
              </div>
              
              <div className="text-sm md:text-base text-[#4b6470] leading-relaxed mb-12 max-w-3xl mx-auto text-center md:text-left">
                <p>
                  Bem-vindo(a). Alimentação e Exercício é um app web interativo desenvolvido para organizar informações relacionadas à alimentação e ao exercício físico a partir de dados informados pelo próprio usuário, como idade, peso, altura, nível de atividade e objetivos gerais. O aplicativo utiliza tecnologia web para processar esses dados, aplicando fórmulas conhecidas e referências nutricionais da base de dados oficial do USDA, gerando estimativas e classificações de forma interativa e educativa. Este projeto tem caráter informativo e educacional e não substitui a orientação de profissionais de saúde.
                </p>
              </div>

              <div className="max-w-2xl mx-auto mb-12">
                <h3 className="font-bold text-[#10252f] mb-6 text-lg text-center md:text-left">
                  O que você pode fazer no app:
                </h3>
                <ul className="text-sm md:text-base text-[#1a2f3a]">
                  <li className="flex items-center gap-4 px-4 py-3 mb-2 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#e2f0ed] motion-safe:hover:translate-x-1 active:bg-[#d1e8e3] motion-safe:active:translate-x-0.5 group">
                    <User size={18} className="text-[#1a2f3a] transition-all duration-200 ease-in-out group-hover:text-[#00756a] motion-safe:group-hover:scale-[1.15] shrink-0" />
                    <span>Inserir dados pessoais básicos de forma controlada.</span>
                  </li>
                  <li className="flex items-center gap-4 px-4 py-3 mb-2 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#e2f0ed] motion-safe:hover:translate-x-1 active:bg-[#d1e8e3] motion-safe:active:translate-x-0.5 group">
                    <Scale size={18} className="text-[#1a2f3a] transition-all duration-200 ease-in-out group-hover:text-[#00756a] motion-safe:group-hover:scale-[1.15] shrink-0" />
                    <span>Visualizar o Índice de Massa Corporal (IMC).</span>
                  </li>
                  <li className="flex items-center gap-4 px-4 py-3 mb-2 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#e2f0ed] motion-safe:hover:translate-x-1 active:bg-[#d1e8e3] motion-safe:active:translate-x-0.5 group">
                    <Activity size={18} className="text-[#1a2f3a] transition-all duration-200 ease-in-out group-hover:text-[#00756a] motion-safe:group-hover:scale-[1.15] shrink-0" />
                    <span>Obter estimativas de gasto energético diário.</span>
                  </li>
                  <li className="flex items-center gap-4 px-4 py-3 mb-2 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#e2f0ed] motion-safe:hover:translate-x-1 active:bg-[#d1e8e3] motion-safe:active:translate-x-0.5 group">
                    <Utensils size={18} className="text-[#1a2f3a] transition-all duration-200 ease-in-out group-hover:text-[#00756a] motion-safe:group-hover:scale-[1.15] shrink-0" />
                    <span>Explorar informações nutricionais com base em dados públicos e oficiais.</span>
                  </li>
                  <li className="flex items-center gap-4 px-4 py-3 mb-2 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#e2f0ed] motion-safe:hover:translate-x-1 active:bg-[#d1e8e3] motion-safe:active:translate-x-0.5 group">
                    <HeartPulse size={18} className="text-[#1a2f3a] transition-all duration-200 ease-in-out group-hover:text-[#00756a] motion-safe:group-hover:scale-[1.15] shrink-0" />
                    <span>Compreender melhor a relação entre alimentação, exercício físico e rotina.</span>
                  </li>
                </ul>
              </div>

              <div className="text-center pt-2">
                <button 
                  onClick={onEnter}
                  className="bg-[#006D77] text-white px-12 py-5 rounded-full font-bold text-lg shadow-[0_8px_20px_rgba(0,109,119,0.2)] hover:bg-[#00565E] hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(0,109,119,0.3)] transition-all duration-300 flex items-center gap-3 mx-auto"
                >
                  Acessar o App
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center mt-auto space-y-4">
        <p className="text-[11px] text-[#4b6470] max-w-xl mx-auto leading-relaxed">
          Este aplicativo não substitui avaliação, acompanhamento ou orientação de profissionais de saúde. Para decisões relacionadas à saúde, indispensável consultar um profissional qualificado.
        </p>
        <div className="text-xs text-[#4b6470] font-medium">
          Desenvolvido por Viviane de Oliveira © 2026.
        </div>
      </footer>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<PlanResult | null>(null);

  const handleProfileComplete = (profile: UserProfile) => {
    const plan = calculatePlan(profile);
    setUserProfile(profile);
    setGeneratedPlan(plan);
  };

  const handleReset = () => {
    setUserProfile(null);
    setGeneratedPlan(null);
  };

  if (showWelcome) {
    return <WelcomePage onEnter={() => setShowWelcome(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#EDF6F9] font-sans text-[#264653] pb-10">
      {/* Header */}
      <header className="bg-white border-b border-[#83C5BE]/30 sticky top-0 z-10 mb-6 md:mb-8 shadow-sm/50 backdrop-blur-md bg-white/90">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#006D77] text-white p-2 rounded-xl shadow-lg shadow-[#006D77]/20 shrink-0">
              <Scale size={20} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-base md:text-lg tracking-tight text-[#264653] leading-tight">
                Alimentação e Exercício
              </h1>
              <span className="text-[10px] text-[#83C5BE] font-bold tracking-widest uppercase">Diretrizes 2026</span>
            </div>
          </div>
          {userProfile && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#006D77] bg-[#EDF6F9] px-4 py-1.5 rounded-full hidden sm:flex border border-[#83C5BE]/30">
              <User size={14} />
              {userProfile.age} anos • {userProfile.weight}kg
            </div>
          )}
        </div>
      </header>

      {/* Privacy Banner */}
      <div className="bg-[#006D77]/5 border-b border-[#006D77]/10 px-4 py-2 text-center text-[10px] text-[#264653]/70 flex items-center justify-center gap-2">
        <ShieldCheck size={12} className="shrink-0 text-[#006D77]" />
        <span className="truncate font-medium">Dados processados temporariamente. Nenhuma informação é salva.</span>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {!userProfile || !generatedPlan ? (
          <Onboarding onComplete={handleProfileComplete} />
        ) : (
          <Dashboard profile={userProfile} plan={generatedPlan} onReset={handleReset} />
        )}
      </main>

      <footer className="text-center text-[#83C5BE] text-xs py-12 mt-8 border-t border-[#83C5BE]/20">
        <p className="font-medium">Baseado em evidências científicas e diretrizes de saúde (Atualização 2026).</p>
        <p className="mt-2 opacity-80">© 2026 Alimentação e Exercício</p>
      </footer>
    </div>
  );
}
