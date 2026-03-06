import { UserProfile, Goal, ActivityLevel } from './types';

// 1️⃣ IMC
export function calculateBMI(weight: number, height: number) {
  const heightMeters = height / 100;
  return weight / (heightMeters * heightMeters);
}

// 2️⃣ Peso metabólico ajustado (melhoria profissional)
export function calculateMetabolicWeight(
  weight: number,
  height: number,
  bmi: number
) {

  if (bmi <= 25) {
    return weight;
  }

  const heightMeters = height / 100;

  const idealWeight =
    22 * (heightMeters * heightMeters);

  const adjustedWeight =
    idealWeight + 0.25 * (weight - idealWeight);

  return adjustedWeight;
}

// 3️⃣ TMB (Mifflin-St Jeor)
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
) {
  return (
    (10 * weight) +
    (6.25 * height) -
    (5 * age) +
    (gender === 'male' ? 5 : -161)
  );
}

// 4️⃣ TDEE
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
  age: number
) {

  const multipliers = {
    sedentary: 1.15,
    active: 1.55,
    athlete: 1.75
  };

  let factor = multipliers[activityLevel];

  if (age >= 65) {
    factor *= 0.95;
  }

  return Math.round(bmr * factor);
}

// 5️⃣ Estratégia por objetivo
export function applyGoalStrategy(
  tdee: number,
  goal: Goal
) {

  if (goal === 'lose') {

    const deficit = Math.min(tdee * 0.25, 600);
    return tdee - deficit;

  }

  if (goal === 'gain') {

    const surplus = Math.min(tdee * 0.15, 500);
    return tdee + surplus;

  }

  return tdee;
}

// 6️⃣ Travas de segurança
export function applySafetyLimits(
  calculatedCalories: number,
  tdee: number,
  gender: 'male' | 'female',
  goal: Goal
) {

  const clinicalFloor =
    gender === 'female'
      ? 1200
      : 1500;

  if (goal === "lose") {

    const metabolicFloor = tdee * 0.75;

    return Math.max(
      calculatedCalories,
      metabolicFloor,
      clinicalFloor
    );

  }

  return Math.max(
    calculatedCalories,
    clinicalFloor
  );
}

// 7️⃣ Macros
export function calculateMacros(
  weight: number,
  age: number,
  goal: Goal,
  targetCalories: number
) {

  let proteinPerKg =
    goal === 'maintain'
      ? 1.6
      : 1.8;

  if (age >= 65) {
    proteinPerKg = 1.6;
  }

  const protein = Math.round(weight * proteinPerKg);
  const proteinCalories = protein * 4;

  const fat = Math.round(weight * 0.8);
  const fatCalories = fat * 9;

  let remainingCalories =
    targetCalories - (proteinCalories + fatCalories);

  if (remainingCalories < 0) {
    remainingCalories = 0;
  }

  const carbs = Math.round(remainingCalories / 4);

  return { protein, fat, carbs };
}

// 8️⃣ Função principal
export function generatePlan(profile: UserProfile) {

  const bmi = calculateBMI(profile.weight, profile.height);

  if (profile.age < 18) {

    return {
      status: 'denied_minor' as const,
      bmi,
      bmr: 0,
      tdee: 0,
      targetCalories: 0,
      strategyValue: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    };

  }

  if (bmi < 18.5 && profile.goal === 'lose') {

    return {
      status: 'denied_underweight' as const,
      bmi,
      bmr: 0,
      tdee: 0,
      targetCalories: 0,
      strategyValue: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    };

  }

  // 🧠 melhoria metabólica
  const metabolicWeight =
    calculateMetabolicWeight(
      profile.weight,
      profile.height,
      bmi
    );

  const bmr = calculateBMR(
    metabolicWeight,
    profile.height,
    profile.age,
    profile.gender
  );

  const tdee = calculateTDEE(
    bmr,
    profile.activityLevel,
    profile.age
  );

  const calculatedCalories =
    applyGoalStrategy(
      tdee,
      profile.goal
    );

  const finalCalories =
    applySafetyLimits(
      calculatedCalories,
      tdee,
      profile.gender,
      profile.goal
    );

  const strategyValue =
    Math.round(finalCalories - tdee);

  const macros =
    calculateMacros(
      profile.weight,
      profile.age,
      profile.goal,
      finalCalories
    );

  return {
    status: 'approved' as const,
    bmi: Number(bmi.toFixed(1)),
    bmr: Math.round(bmr),
    tdee,
    targetCalories: Math.round(finalCalories),
    strategyValue,
    ...macros
  };
}
