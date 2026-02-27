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
  HeartPulse,
  Info,
  ShieldAlert,
  Ban,
  ShieldCheck,
  QrCode,
  Copy
} from 'lucide-react';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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

// --- Types ---

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
type Goal = 'lose' | 'maintain' | 'gain';

interface UserProfile {
  age: number;
  gender: Gender;
  weight: number; // kg
  height: number; // cm
  activityLevel: ActivityLevel;
  goal: Goal;
  restrictions: string; // Allergies
  conditions: string; // Health conditions
}

interface DietPlan {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  meals: Meal[];
  warnings: string[];
}

interface Meal {
  name: string;
  time: string;
  options: string[];
  macros: string;
  rationale: string;
  note?: string;
}

interface WorkoutPlan {
  allowed: boolean;
  reason?: string;
  type?: string;
  frequency?: string;
  exercises?: Exercise[];
  cardio?: string;
  focus?: string;
  warnings?: string[];
}

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  note?: string;
}

type PlanStatus = 'approved' | 'denied_minor' | 'restricted_elderly' | 'restricted_health';

interface PlanResult {
  status: PlanStatus;
  justification: string[];
  diet?: DietPlan;
  workout?: WorkoutPlan;
  bmr?: number;
  tdee?: number;
  targetCalories?: number;
  goal?: Goal;
  bmi: number;
  bmiClass: string;
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

interface FoodItem {
  name: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  defaultPortion: number;
}

const FOOD_DATABASE: Record<string, FoodItem> = {
  // Proteins (USDA Reference)
  "Ovo": { name: "Ovo Cozido", unit: "unid. (50g)", calories: 78, protein: 6.3, carbs: 0.6, fats: 5.3, defaultPortion: 2 },
  "Frango Grelhado": { name: "Frango Grelhado", unit: "g", calories: 1.65, protein: 0.31, carbs: 0, fats: 0.036, defaultPortion: 150 },
  "Carne Moída Magra": { name: "Carne Moída Magra (95%)", unit: "g", calories: 1.64, protein: 0.28, carbs: 0, fats: 0.05, defaultPortion: 120 },
  "Peixe Grelhado": { name: "Peixe Grelhado (Tilápia)", unit: "g", calories: 1.28, protein: 0.26, carbs: 0, fats: 0.03, defaultPortion: 150 },
  "Queijo Cottage": { name: "Queijo Cottage (1%)", unit: "col. sopa (30g)", calories: 22, protein: 3.6, carbs: 0.9, fats: 0.3, defaultPortion: 2 },
  "Iogurte Natural": { name: "Iogurte Natural Integral", unit: "pote (170g)", calories: 104, protein: 6, carbs: 8, fats: 5.6, defaultPortion: 1 },
  "Whey Protein": { name: "Whey Protein (Padrão)", unit: "dose (30g)", calories: 120, protein: 24, carbs: 3, fats: 1, defaultPortion: 1 },

  // Carbs (USDA Reference)
  "Aveia": { name: "Aveia em Flocos", unit: "col. sopa (15g)", calories: 57, protein: 2, carbs: 10, fats: 1, defaultPortion: 3 },
  "Arroz Integral": { name: "Arroz Integral Cozido", unit: "col. sopa (25g)", calories: 31, protein: 0.7, carbs: 6.4, fats: 0.25, defaultPortion: 4 },
  "Batata Doce": { name: "Batata Doce Cozida", unit: "g", calories: 0.76, protein: 0.014, carbs: 0.177, fats: 0.001, defaultPortion: 150 },
  "Pão Integral": { name: "Pão Integral", unit: "fatia (28g)", calories: 70, protein: 3.6, carbs: 11.6, fats: 1, defaultPortion: 2 },
  "Banana": { name: "Banana Prata", unit: "unid. (100g)", calories: 89, protein: 1.1, carbs: 23, fats: 0.3, defaultPortion: 1 },
  "Maçã": { name: "Maçã", unit: "unid. (150g)", calories: 78, protein: 0.4, carbs: 21, fats: 0.3, defaultPortion: 1 },
  "Tapioca": { name: "Goma de Tapioca", unit: "g", calories: 2.4, protein: 0, carbs: 0.6, fats: 0, defaultPortion: 60 },

  // Fats / Veggies / Others (USDA Reference)
  "Azeite de Oliva": { name: "Azeite de Oliva", unit: "fio (5g)", calories: 44, protein: 0, carbs: 0, fats: 5, defaultPortion: 1 },
  "Castanha do Pará": { name: "Castanha do Pará", unit: "unid. (5g)", calories: 33, protein: 0.7, carbs: 0.6, fats: 3.3, defaultPortion: 2 },
  "Salada Verde": { name: "Salada Verde (Variada)", unit: "prato", calories: 20, protein: 1.5, carbs: 3, fats: 0.2, defaultPortion: 1 },
  "Legumes Cozidos": { name: "Mix de Legumes", unit: "pires (100g)", calories: 60, protein: 2.5, carbs: 10, fats: 0.2, defaultPortion: 1 },
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

// --- Logic / Calculations ---

const calculateBMI = (weight: number, height: number) => {
  const heightM = height / 100;
  return weight / (heightM * heightM);
};

const getBMIClassification = (bmi: number) => {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 24.9) return "Peso adequado";
  if (bmi < 29.9) return "Sobrepeso";
  if (bmi < 34.9) return "Obesidade grau I";
  if (bmi < 39.9) return "Obesidade grau II";
  return "Obesidade grau III";
};

const calculateBMR = (p: UserProfile): number => {
  if (p.gender === 'male') {
    return (10 * p.weight) + (6.25 * p.height) - (5 * p.age) + 5;
  } else {
    return (10 * p.weight) + (6.25 * p.height) - (5 * p.age) - 161;
  }
};

const calculatePlan = (profile: UserProfile): PlanResult => {
  // 1. Age Check (Strict < 18)
  if (profile.age < 18) {
    return {
      status: 'denied_minor',
      justification: [
        "Este aplicativo é exclusivo para maiores de 18 anos.",
        "O desenvolvimento fisiológico nesta fase requer acompanhamento presencial especializado."
      ],
      bmi: 0,
      bmiClass: ''
    };
  }

  // 2. BMI Calculation
  const bmi = calculateBMI(profile.weight, profile.height);
  const bmiClass = getBMIClassification(bmi);

  // 3. Health Condition Analysis
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

  // 4. Diet Calculations
  const bmr = calculateBMR(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];
  
  const allergiesLower = profile.restrictions.toLowerCase();
  const isDiabetic = conditionsLower.includes('diabete') || conditionsLower.includes('glicose');
  const isHypertensive = conditionsLower.includes('hipertens') || conditionsLower.includes('pressão alta');
  
  const hasLactoseIntolerance = allergiesLower.includes('lactose') || allergiesLower.includes('leite');
  const hasGlutenIntolerance = allergiesLower.includes('glúten') || allergiesLower.includes('trigo');
  const isVegetarian = allergiesLower.includes('carne') || allergiesLower.includes('vegetariano') || allergiesLower.includes('vegano');

  // Calorie Targets
  let targetCalories = tdee;

  if (profile.goal === 'lose') {
    targetCalories = tdee - 500;
    if (profile.gender === 'female' && targetCalories < 1200) targetCalories = 1200;
    if (profile.gender === 'male' && targetCalories < 1500) targetCalories = 1500;
  } else if (profile.goal === 'gain') {
    targetCalories = tdee + 300;
  }

  if (isElderly || hasHeartCondition) {
    targetCalories = tdee; 
  }

  // --- Deterministic Meal Generation ---

  // Define a standard base menu (approx 2000kcal structure)
  let menuItems = [
    { meal: 'Café da Manhã', key: 'Ovo', baseQty: 2 },
    { meal: 'Café da Manhã', key: 'Aveia', baseQty: 3 },
    { meal: 'Café da Manhã', key: 'Banana', baseQty: 1 },
    
    { meal: 'Almoço', key: 'Arroz Integral', baseQty: 4 },
    { meal: 'Almoço', key: 'Frango Grelhado', baseQty: 150 },
    { meal: 'Almoço', key: 'Salada Verde', baseQty: 1 },
    { meal: 'Almoço', key: 'Legumes Cozidos', baseQty: 1 },
    { meal: 'Almoço', key: 'Azeite de Oliva', baseQty: 1 },

    { meal: 'Lanche', key: 'Iogurte Natural', baseQty: 1 },
    { meal: 'Lanche', key: 'Maçã', baseQty: 1 },

    { meal: 'Jantar', key: 'Peixe Grelhado', baseQty: 150 },
    { meal: 'Jantar', key: 'Legumes Cozidos', baseQty: 1 },
    { meal: 'Jantar', key: 'Azeite de Oliva', baseQty: 1 },
  ];

  // Substitutions based on restrictions
  if (isVegetarian) {
    menuItems = menuItems.map(item => {
      if (item.key === 'Frango Grelhado' || item.key === 'Peixe Grelhado') return { ...item, key: 'Ovo', baseQty: 3 }; // Simplified veg protein
      if (item.key === 'Ovo') return item; // Keep eggs if vegetarian (ovo-lacto assumed for simplicity, or could swap to tofu if DB had it)
      return item;
    });
  }

  if (hasLactoseIntolerance) {
    menuItems = menuItems.map(item => {
      if (item.key === 'Iogurte Natural') return { ...item, key: 'Banana', baseQty: 1 };
      if (item.key === 'Queijo Cottage') return { ...item, key: 'Ovo', baseQty: 1 };
      return item;
    });
  }

  if (hasGlutenIntolerance) {
    menuItems = menuItems.map(item => {
      if (item.key === 'Aveia') return { ...item, key: 'Tapioca', baseQty: 40 }; // Swap oats for tapioca
      if (item.key === 'Pão Integral') return { ...item, key: 'Tapioca', baseQty: 60 };
      return item;
    });
  }

  if (isDiabetic) {
    menuItems = menuItems.map(item => {
      if (item.key === 'Arroz Integral') return { ...item, key: 'Batata Doce', baseQty: 150 }; // Lower GI option
      if (item.key === 'Banana') return { ...item, key: 'Maçã', baseQty: 1 };
      if (item.key === 'Tapioca') return { ...item, key: 'Aveia', baseQty: 3 }; // Tapioca high GI -> Oats
      return item;
    });
  }

  // Calculate Base Calories of the menu
  let baseCals = 0;
  menuItems.forEach(i => {
    const food = FOOD_DATABASE[i.key];
    if (food) baseCals += food.calories * i.baseQty;
  });

  // Calculate Scaling Ratio
  const ratio = targetCalories / baseCals;

  // Apply Ratio and Round Portions
  const finalMenu = menuItems.map(item => {
    const food = FOOD_DATABASE[item.key];
    if (!food) return { ...item, qty: 0, food: null };

    let rawQty = item.baseQty * ratio;
    let qty = rawQty;

    // Rounding logic for usability
   const unit = food.unit.toLowerCase();
const isGramBased = unit === 'g';
const isCountableUnit = ['unid', 'fatia', 'pote'].some(prefix =>
  unit.startsWith(prefix)
);

if (isGramBased) {
  qty = Math.round(rawQty / 10) * 10; // arredonda para 10g
  if (qty < 10) qty = 10;
} else if (isCountableUnit) {
  qty = Math.round(rawQty * 2) / 2; // arredonda para 0.5
  if (qty < 0.5) qty = 0.5;
} else {
  qty = Math.round(rawQty * 2) / 2;
  if (qty < 0.5) qty = 0.5;
}
    
    return { ...item, qty, food };
  });

  // Calculate Final Totals from the rounded menu
  let totalCals = 0, totalProt = 0, totalCarbs = 0, totalFats = 0;
  finalMenu.forEach(i => {
    if (i.food) {
      totalCals += i.food.calories * i.qty;
      totalProt += i.food.protein * i.qty;
      totalCarbs += i.food.carbs * i.qty;
      totalFats += i.food.fats * i.qty;
    }
  });

  const water = Math.round(profile.weight * 0.035 * 10) / 10;

  // Group into Meal objects
  const mealGroups: Record<string, { time: string, items: typeof finalMenu }> = {
    'Café da Manhã': { time: '07:00 - 08:00', items: [] },
    'Almoço': { time: '12:00 - 13:00', items: [] },
    'Lanche': { time: '16:00', items: [] },
    'Jantar': { time: '19:30', items: [] },
  };

  finalMenu.forEach(item => {
    if (mealGroups[item.meal]) {
      mealGroups[item.meal].items.push(item);
    }
  });

  const meals: Meal[] = Object.entries(mealGroups).map(([name, group]) => {
    const options = group.items.map(i => {
      if (!i.food) return "";
      return `${i.qty} ${i.food.unit} de ${i.food.name}`;
    }).filter(Boolean);

    // Calculate meal specific macros for display
    let mCals = 0, mProt = 0, mCarb = 0, mFat = 0;
    group.items.forEach(i => {
      if (i.food) {
        mCals += i.food.calories * i.qty;
        mProt += i.food.protein * i.qty;
        mCarb += i.food.carbs * i.qty;
        mFat += i.food.fats * i.qty;
      }
    });

    let rationale = "";
    if (name === 'Café da Manhã') rationale = "Energia sustentada para o início do dia.";
    if (name === 'Almoço') rationale = "Refeição completa com todos os macronutrientes.";
    if (name === 'Lanche') rationale = "Manutenção da saciedade e glicemia.";
    if (name === 'Jantar') rationale = "Leve e nutritivo para recuperação noturna.";

    return {
      name,
      time: group.time,
      options, // Now a single list of items, not "options" in the sense of choice, but components of the meal
      macros: `~${Math.round(mCals)} kcal | P:${Math.round(mProt)} C:${Math.round(mCarb)} G:${Math.round(mFat)}`,
      rationale
    };
  });

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
      calories: Math.round(totalCals),
      protein: Math.round(totalProt),
      carbs: Math.round(totalCarbs),
      fats: Math.round(totalFats),
      water,
      meals,
      warnings: dietWarnings
    },
    workout: {
      ...workout,
      warnings: workoutWarnings
    },
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    goal: profile.goal,
    bmi: Number(bmi.toFixed(1)),
    bmiClass
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
          <span>Etapa {step} de 3</span>
          <span>{Math.round((step / 3) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-[#EDF6F9] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#006D77] transition-all duration-700 ease-out" 
            style={{ width: `${(step / 3) * 100}%` }}
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
                <option value="light">Leve (Exercício 1-3x/sem)</option>
                <option value="moderate">Moderado (Exercício 3-5x/sem)</option>
                <option value="active">Ativo (Exercício 6-7x/sem)</option>
                <option value="athlete">Atleta / Trabalho Físico</option>
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
  const [activeTab, setActiveTab] = useState<'diet' | 'workout' | 'info'>('diet');
  
  // Generate valid Pix Payload
  const pixKey = "8a5e5650-ec84-4916-a027-414a65017fba";
  const pixPayload = generatePixPayload(
    pixKey,
    "ALIMENTACAO E EXERCICIO", // Merchant Name (max 25 chars)
    "SAO PAULO"        // Merchant City
  );

  if (plan.status === 'denied_minor') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-[#FFCCBC] p-8 text-center">
        <div className="w-16 h-16 bg-[#FFF3E0] rounded-full flex items-center justify-center mx-auto mb-4">
          <Ban className="text-[#BF360C]" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-[#264653] mb-2">Acesso Restrito</h2>
        <p className="text-[#5C6B73] mb-6">
          {plan.justification[0]}
        </p>
        <p className="text-sm text-[#98A8B0] mb-8">
          {plan.justification[1]}
        </p>
        <button onClick={onReset} className="text-[#006D77] font-medium hover:underline hover:text-[#264653]">
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      {/* Pix Support Section - Static */}
      <div className="mb-10 bg-[#EDF6F9] p-8 rounded-3xl border border-[#83C5BE]/20 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 shadow-sm">
        
        {/* QR Code Card */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-white/60 shrink-0">
          <div className="w-32 h-32 bg-white flex items-center justify-center overflow-hidden relative">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixPayload)}`} 
              alt="QR Code Pix" 
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center text-center max-w-md w-full">
          <h4 className="font-bold text-[#006D77] mb-2 text-xl tracking-tight">Apoio Voluntário (Opcional)</h4>
          <p className="text-sm text-[#264653]/70 mb-6 leading-relaxed font-medium">
            Este aplicativo é 100% gratuito.<br />
            Se ele te ajudou de alguma forma, uma contribuição voluntária ajuda a mantê-lo online.<br />
            Qualquer valor já faz diferença.
          </p>
          
          {/* Key Card */}
          <div className="bg-white border border-[#E29578]/30 rounded-xl p-4 w-full shadow-sm flex items-center justify-between gap-4 hover:border-[#E29578]/50 transition-colors group cursor-pointer" onClick={() => navigator.clipboard.writeText(pixKey)}>
            <div className="text-left overflow-hidden flex-1">
              <p className="text-[10px] text-[#E29578] uppercase font-bold tracking-wider mb-1">CHAVE PIX (ALEATÓRIA)</p>
              <p className="font-mono text-[#264653] text-sm font-medium truncate group-hover:text-[#006D77] transition-colors">
                {pixKey}
              </p>
            </div>
            <button 
              className="text-[#006D77] p-2 rounded-lg bg-[#EDF6F9] group-hover:bg-[#E0F2F1] transition-colors shrink-0"
              title="Copiar Chave"
            >
              <Copy size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div className={`border rounded-2xl p-6 mb-8 ${
        plan.status === 'approved' ? 'bg-[#E0F2F1] border-[#83C5BE]' : 'bg-[#FFF3E0] border-[#FFCCBC]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div>
            <h3 className={`text-lg font-bold mb-1 flex items-center gap-2 ${
              plan.status === 'approved' ? 'text-[#00695C]' : 'text-[#E65100]'
            }`}>
              {plan.status === 'approved' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              Análise de Segurança
            </h3>
            <p className="text-sm text-[#264653]/70">Perfil validado conforme diretrizes 2026</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-[#83C5BE]/30 shadow-sm flex items-center gap-3">
             <div className="text-right">
               <div className="text-[10px] text-[#83C5BE] font-bold uppercase tracking-wider">IMC Calculado</div>
               <div className="text-lg font-bold text-[#264653]">{plan.bmi.toFixed(1)}</div>
             </div>
             <div className="h-8 w-px bg-[#83C5BE]/20"></div>
             <div className="text-left">
               <div className="text-[10px] text-[#83C5BE] font-bold uppercase tracking-wider">Classificação</div>
               <div className="text-sm font-semibold text-[#006D77]">{plan.bmiClass}</div>
             </div>
          </div>
        </div>

        <ul className="space-y-2">
          {plan.justification.map((item, idx) => (
            <li key={idx} className={`flex items-start gap-2 text-sm ${
              plan.status === 'approved' ? 'text-[#00695C]' : 'text-[#BF360C]'
            }`}>
              <ChevronRight size={16} className="mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Severe Obesity Advisory */}
      {plan.bmi >= 35 && (
        <div className="bg-[#FFF3E0] border border-[#FFCCBC] rounded-2xl p-6 mb-8 animate-in slide-in-from-bottom-2">
          <h3 className="text-lg font-bold text-[#BF360C] mb-3 flex items-center gap-2">
            <HeartPulse size={20} className="text-[#D84315]" />
            Nota de Cuidado e Saúde
          </h3>
          <div className="text-sm text-[#D84315] space-y-3 leading-relaxed">
            <p>
              Em casos de obesidade com IMC mais elevado, o <strong>acompanhamento profissional é fundamental</strong>. 
              Recomendamos que considere procurar um médico endocrinologista para avaliação do metabolismo.
            </p>
            <p>
              Exercícios realizados em casa e orientações alimentares gerais podem não ser suficientes isoladamente nestes casos.
              Este app tem caráter informativo e não substitui acompanhamento médico, nutricional ou profissional de educação física.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards (Only if diet available) */}
      {plan.diet && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#83C5BE]/30">
              <div className="text-[#83C5BE] text-xs font-bold uppercase tracking-wider mb-1">Calorias</div>
              <div className="text-2xl font-bold text-[#264653]">{plan.diet.calories}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#83C5BE]/30">
              <div className="text-[#83C5BE] text-xs font-bold uppercase tracking-wider mb-1">Proteína</div>
              <div className="text-2xl font-bold text-[#006D77]">{plan.diet.protein}g</div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#83C5BE]/30">
              <div className="text-[#83C5BE] text-xs font-bold uppercase tracking-wider mb-1">Carboidratos</div>
              <div className="text-2xl font-bold text-[#E29578]">{plan.diet.carbs}g</div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#83C5BE]/30">
              <div className="text-[#83C5BE] text-xs font-bold uppercase tracking-wider mb-1">Gorduras</div>
              <div className="text-2xl font-bold text-[#BF360C]">{plan.diet.fats}g</div>
            </div>
          </div>

          {/* Math Explanation */}
          <div className="mb-8 bg-[#EDF6F9] p-3 rounded-xl border border-[#83C5BE]/30 text-xs text-[#264653]/70 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[#006D77]">Entenda a conta (Fórmula Padrão):</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span>🥩 {plan.diet.protein}g x 4 = <strong>{plan.diet.protein * 4}</strong> kcal</span>
                <span>🍞 {plan.diet.carbs}g x 4 = <strong>{plan.diet.carbs * 4}</strong> kcal</span>
                <span>🥑 {plan.diet.fats}g x 9 = <strong>{plan.diet.fats * 9}</strong> kcal</span>
              </div>
            </div>
            <div className="text-right md:text-left">
              <span className="block font-bold text-[#264653]">
                Soma: {plan.diet.protein * 4 + plan.diet.carbs * 4 + plan.diet.fats * 9} kcal
              </span>
              <span className="text-[10px] opacity-70">
                (Pequenas diferenças ocorrem por arredondamento dos alimentos)
              </span>
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-full border border-[#83C5BE]/30 shadow-sm inline-flex">
          {[
            { id: 'diet', label: 'Dieta', icon: Utensils, show: !!plan.diet },
            { id: 'workout', label: 'Treino', icon: Dumbbell, show: plan.workout?.allowed },
            { id: 'info', label: 'Detalhes', icon: Info, show: true },
          ].filter(t => t.show).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#006D77] text-white shadow-lg shadow-[#006D77]/20' 
                  : 'text-[#264653]/60 hover:bg-[#EDF6F9] hover:text-[#006D77]'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#83C5BE]/30 p-6 md:p-8 min-h-[400px]">
        {activeTab === 'diet' && plan.diet && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {plan.diet.warnings.length > 0 && (
              <div className="bg-[#FFF3E0] border border-[#FFCCBC] p-4 rounded-xl mb-6">
                <h4 className="text-[#BF360C] font-bold text-sm mb-2 flex items-center gap-2">
                  <HeartPulse size={16} /> Recomendações de Saúde
                </h4>
                <ul className="list-disc list-inside text-xs text-[#D84315] space-y-1">
                  {plan.diet.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="space-y-6">
              {/* Portion Explanation Box */}
              <div className="bg-[#EDF6F9] p-5 rounded-xl border border-[#83C5BE]/30 text-sm text-[#006D77] leading-relaxed">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Info size={16} /> Entendendo suas Porções
                </h4>
                <p className="mb-2">
                  As quantidades sugeridas foram <strong>ajustadas especificamente para o seu peso e gasto energético atual</strong>.
                </p>
                <p>
                  Pessoas com maior peso corporal gastam naturalmente mais energia. Por isso, mesmo para emagrecer, podem precisar de porções maiores para evitar perda de massa muscular e proteger o metabolismo. 
                  Isso não é um incentivo ao excesso, mas uma <strong>adequação fisiológica</strong> necessária para um processo saudável e sustentável.
                </p>
              </div>

              {plan.diet.meals.map((meal, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-[#006D77]/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#006D77] border-4 border-white shadow-sm"></div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-[#264653] text-lg">{meal.name}</h4>
                    <span className="text-xs font-bold text-[#83C5BE] bg-[#EDF6F9] px-2 py-1 rounded">{meal.time}</span>
                  </div>
                  <ul className="space-y-2 mb-3">
                    {meal.options.map((opt, i) => (
                      <li key={i} className="text-sm text-[#264653] flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#83C5BE] shrink-0"></span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold text-[#00695C] bg-[#E0F2F1] px-2 py-1 rounded border border-[#B2DFDB]">
                        {meal.macros}
                      </span>
                      {meal.note && (
                        <span className="text-[10px] font-medium text-[#E65100] bg-[#FFF3E0] px-2 py-1 rounded border border-[#FFE0B2]">
                          Nota: {meal.note}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#264653]/70 italic bg-[#FAFAFA] p-3 rounded border border-[#E5E5E5]">
                      <span className="font-bold not-italic text-[#264653]">Justificativa:</span> {meal.rationale}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workout' && plan.workout?.allowed && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {plan.workout.warnings && plan.workout.warnings.length > 0 && (
              <div className="bg-[#FFF3E0] border border-[#FFCCBC] p-4 rounded-xl mb-6">
                <h4 className="text-[#BF360C] font-bold text-sm mb-2 flex items-center gap-2">
                  <ShieldAlert size={16} /> Recomendações de Segurança
                </h4>
                <ul className="list-disc list-inside text-xs text-[#D84315] space-y-1">
                  {plan.workout.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#264653]">{plan.workout.type}</h3>
                <p className="text-sm text-[#264653]/60">{plan.workout.focus}</p>
              </div>
              <span className="text-xs bg-[#E0F2F1] text-[#00695C] px-3 py-1 rounded-full font-bold self-start md:self-center border border-[#B2DFDB]">
                {plan.workout.frequency}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {plan.workout.exercises?.map((ex, idx) => (
                <ExerciseItem key={idx} exercise={ex} />
              ))}
            </div>

            <div className="bg-[#FFF3E0] p-4 rounded-xl border border-[#FFCCBC]">
              <h4 className="font-bold text-[#BF360C] mb-1 flex items-center gap-2">
                <Activity size={18} /> Cardio
              </h4>
              <p className="text-sm text-[#D84315]">{plan.workout.cardio}</p>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-[#264653]">Dados Técnicos e Metas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
                <div className="text-xs text-[#83C5BE] font-bold uppercase tracking-wider mb-1">Taxa Metabólica Basal</div>
                <div className="text-lg font-bold text-[#264653]">{plan.bmr} kcal</div>
                <p className="text-[10px] text-[#264653]/60 mt-1">O que você gasta em repouso absoluto.</p>
              </div>
              <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
                <div className="text-xs text-[#83C5BE] font-bold uppercase tracking-wider mb-1">Gasto Energético Total</div>
                <div className="text-lg font-bold text-[#264653]">{plan.tdee} kcal</div>
                <p className="text-[10px] text-[#264653]/60 mt-1">Considerando sua atividade física.</p>
              </div>
              <div className="p-4 bg-[#E0F2F1] rounded-xl border border-[#B2DFDB]">
                <div className="text-xs text-[#00695C] font-bold uppercase tracking-wider mb-1">Meta do Plano</div>
                <div className="text-lg font-bold text-[#006D77]">{plan.diet?.calories} kcal</div>
                <p className="text-[10px] text-[#00695C]/80 mt-1">
                  {plan.goal === 'lose' ? 'Déficit para emagrecer.' : plan.goal === 'gain' ? 'Superávit para ganhar massa.' : 'Manutenção de peso.'}
                </p>
              </div>
            </div>

            <div className="bg-[#EDF6F9] p-5 rounded-xl border border-[#83C5BE]/30">
              <h4 className="font-bold text-[#006D77] mb-3">Por que os valores são diferentes?</h4>
              <div className="space-y-3 text-sm text-[#264653]/80">
                <div className="flex justify-between items-center border-b border-[#83C5BE]/20 pb-2">
                  <span>1. Seu corpo gasta por dia (TDEE):</span>
                  <span className="font-mono font-bold">{plan.tdee} kcal</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#83C5BE]/20 pb-2">
                  <span>
                    2. Ajuste para seu objetivo ({plan.goal === 'lose' ? 'Emagrecer' : plan.goal === 'gain' ? 'Ganhar Massa' : 'Manter'}):
                  </span>
                  <span className={`font-mono font-bold ${plan.goal === 'lose' ? 'text-[#E76F51]' : 'text-[#00695C]'}`}>
                    {plan.goal === 'lose' ? '-500' : plan.goal === 'gain' ? '+300' : '0'} kcal
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-[#264653]">3. Calorias Sugeridas no Plano:</span>
                  <span className="font-mono font-bold text-lg text-[#006D77]">{plan.diet?.calories} kcal</span>
                </div>
                <p className="text-xs text-[#264653]/60 mt-2 bg-white p-2 rounded border border-[#E5E5E5]">
                  * O valor do plano ({plan.diet?.calories} kcal) é o resultado do cálculo para atingir seu objetivo, não o quanto você gasta. 
                </p>
              </div>
            </div>

            {/* Concept Explanation */}
            <div className={`p-5 rounded-xl border ${plan.goal === 'lose' ? 'bg-[#E0F2F1] border-[#B2DFDB]' : 'bg-[#FFF3E0] border-[#FFCCBC]'}`}>
              <h4 className={`font-bold mb-2 flex items-center gap-2 ${plan.goal === 'lose' ? 'text-[#00695C]' : 'text-[#BF360C]'}`}>
                <Info size={18} />
                {plan.goal === 'lose' ? 'O que é Déficit Calórico?' : plan.goal === 'gain' ? 'O que é Superávit Calórico?' : 'O que é Manutenção?'}
              </h4>
              <p className={`text-sm leading-relaxed ${plan.goal === 'lose' ? 'text-[#004D40]' : 'text-[#BF360C]'}`}>
                {plan.goal === 'lose' 
                  ? "Imagine que seu corpo é uma conta bancária de energia. O 'Déficit' acontece quando você gasta mais do que deposita (come). Para cobrir essa diferença e continuar funcionando, seu corpo é obrigado a 'sacar' energia da poupança (gordura acumulada). É assim que você emagrece."
                  : plan.goal === 'gain'
                  ? "Para construir músculos (que são tecidos caros para o corpo manter), você precisa fornecer energia extra. O 'Superávit' é esse excedente estratégico que, junto com o treino de força, vira massa muscular."
                  : "O objetivo é empatar o jogo: comer exatamente o que você gasta para manter o peso estável, focando apenas na qualidade dos alimentos."}
              </p>
            </div>
            
            <div className="prose prose-sm text-[#264653]/70 max-w-none space-y-4">
               <p>
                 <strong>Cálculo Energético:</strong> O TDEE (Gasto Energético Total) é estimado pela fórmula de Mifflin-St Jeor, considerada padrão-ouro para estimativas populacionais, ajustada pelo nível de atividade física declarado.
               </p>
               <p>
                 <strong>Índice de Massa Corporal (IMC):</strong> Calculado como peso/altura², é utilizado como triagem inicial para definição de estratégias de segurança e adequação calórica.
               </p>
               <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                 <strong className="block text-[#264653] mb-2">Fonte de Dados Nutricionais (USDA)</strong>
                 <p className="mb-0">
                   Todos os alimentos e valores nutricionais deste aplicativo utilizam como referência a base de dados do <em>United States Department of Agriculture (USDA)</em>. 
                   Esta é uma das fontes mais rigorosas e respeitadas mundialmente, garantindo que as calorias e macronutrientes sejam calculados com base em padrões científicos, e não em valores aleatórios.
                 </p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Health Reminders Section */}
      <div className="bg-white rounded-2xl p-6 mb-8 border border-[#83C5BE]/30 shadow-sm animate-in fade-in duration-500">
        {activeTab === 'diet' && (
          <>
            <h3 className="text-lg font-bold text-[#264653] mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-[#006D77]" />
              Lembretes Nutricionais
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-[#264653]/70">
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Hidratação é Chave</strong>
                Muitas vezes confundimos sede com fome. Beba água regularmente ao longo do dia para manter o metabolismo ativo.
              </div>
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Mastigação Consciente</strong>
                Comer devagar ajuda na digestão e na sinalização de saciedade. Tente descansar os talheres entre as garfadas.
              </div>
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Planejamento</strong>
                Ter refeições saudáveis prontas ou pré-preparadas evita escolhas impulsivas quando a fome aperta.
              </div>
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Equilíbrio, não Perfeição</strong>
                Uma refeição fora do plano não arruína seu progresso. O importante é o que você faz na maior parte do tempo.
              </div>
            </div>
          </>
        )}

        {activeTab === 'workout' && (
          <>
            <h3 className="text-lg font-bold text-[#264653] mb-4 flex items-center gap-2">
              <Dumbbell size={20} className="text-[#006D77]" />
              Lembretes de Treino
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-[#264653]/70">
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Aquecimento</strong>
                Nunca pule o aquecimento. Ele prepara suas articulações e músculos, prevenindo lesões e melhorando o desempenho.
              </div>
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Técnica antes da Carga</strong>
                Priorize a execução correta do movimento. Aumentar o peso com má postura é o caminho mais rápido para se machucar.
              </div>
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Descanso é Treino</strong>
                Seus músculos crescem e se recuperam durante o descanso. Respeite os dias de pausa para evitar overtraining.
              </div>
              <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                <strong className="block text-[#264653] mb-1 font-bold">Escute seu Corpo</strong>
                Dor articular aguda não é normal. Desconforto muscular é esperado, mas dor nas juntas é sinal de alerta.
              </div>
            </div>
          </>
        )}

        {activeTab === 'info' && (
          <>
            <h3 className="text-lg font-bold text-[#264653] mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-[#006D77]" />
              Saúde Integral e Acompanhamento Profissional
            </h3>
            <div className="space-y-4 text-sm text-[#264653]/80 leading-relaxed">
              <p className="font-medium text-[#006D77] bg-[#E0F2F1] p-4 rounded-xl border border-[#B2DFDB]">
                Cuidar da saúde vai além de aparência ou números. Envolve corpo, mente e escolhas conscientes ao longo do tempo. Buscar ajuda profissional não é sinal de fraqueza, mas um gesto de responsabilidade e respeito por si mesmo.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                  <strong className="block text-[#264653] mb-2 font-bold">🧠 Psicologia</strong>
                  O acompanhamento psicológico tem um papel essencial no equilíbrio emocional, no fortalecimento da autoestima e no processo de aceitação do próprio corpo. Cuidar da mente influencia diretamente hábitos, decisões e a forma como nos relacionamos com nós mesmos e com o mundo.
                </div>
                
                <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                  <strong className="block text-[#264653] mb-2 font-bold">🥗 Nutrição</strong>
                  O nutricionista auxilia na construção de uma relação mais saudável com a alimentação, considerando a individualidade, a rotina e as necessidades reais de cada pessoa, sem extremismos ou promessas ilusórias.
                </div>

                <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                  <strong className="block text-[#264653] mb-2 font-bold">⚕️ Endocrinologia</strong>
                  O endocrinologista é fundamental para avaliar hormônios, metabolismo e condições que impactam diretamente energia, peso e bem-estar geral, ajudando a compreender o corpo de forma mais ampla e precisa.
                </div>

                <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E5]">
                  <strong className="block text-[#264653] mb-2 font-bold">❤️ Cardiologia</strong>
                  O cardiologista contribui para a saúde do coração, especialmente quando mudanças alimentares ou a prática de atividades físicas fazem parte da rotina, garantindo segurança e prevenção.
                </div>
              </div>

              <div className="bg-[#FFF3E0] p-4 rounded-xl border border-[#FFCCBC] text-[#BF360C]">
                <strong className="block mb-1 font-bold flex items-center gap-2"><Activity size={16}/> Movimento Consciente</strong>
                A prática de exercícios físicos, quando orientada, fortalece o corpo e a mente. Não como punição ou cobrança, mas como cuidado, movimento e valorização da própria saúde.
              </div>

              <p className="text-center italic text-[#264653]/60 mt-4 border-t border-[#E5E5E5] pt-4">
                Manter a saúde é um processo contínuo. Informação de qualidade, acompanhamento profissional e escolhas conscientes constroem, aos poucos, uma vida mais equilibrada e saudável.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 bg-[#FAFAFA] p-6 rounded-xl border border-[#E5E5E5] text-center">
         <h4 className="font-bold text-[#264653] mb-2 flex items-center justify-center gap-2">
           <AlertTriangle size={16} className="text-[#E29578]" /> Aviso Legal Obrigatório
         </h4>
         <p className="text-xs text-[#264653]/60 leading-relaxed max-w-2xl mx-auto">
           As informações geradas têm caráter informativo e não substituem orientação de profissionais de saúde, nutrição ou educação física.
         </p>
      </div>

      <div className="mt-12 text-center">
        <button 
          onClick={onReset}
          className="text-sm text-[#83C5BE] hover:text-[#006D77] font-bold underline transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <RefreshCw size={14} /> Refazer meus dados
        </button>
      </div>
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

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
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
