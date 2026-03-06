export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'active' | 'athlete';
export type Goal = 'lose' | 'maintain' | 'gain';
export type CarbChoice = "Arroz" | "Batata" | "Macarrão";
export type ProteinChoice = "Frango" | "Peixe" | "Carne Bovina";

export interface UserProfile {
  age: number;
  gender: Gender;
  weight: number; // kg
  height: number; // cm
  activityLevel: ActivityLevel;
  goal: Goal;
  carbChoice: CarbChoice;
  proteinChoice: ProteinChoice;
  restrictions: string; // Allergies
  conditions: string; // Health conditions
}

export interface DietPlan {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  meals: Meal[];
  warnings: string[];
}

export interface Meal {
  name: string;
  time: string;
  options: string[];
  macros: string;
  rationale: string;
}

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  note: string;
}

export interface WorkoutPlan {
  allowed: boolean;
  type?: string;
  frequency?: string;
  cardio?: string;
  focus?: string;
  exercises?: Exercise[];
  reason?: string;
  warnings?: string[];
}

export type PlanStatus = 'approved' | 'denied_minor' | 'restricted_health' | 'restricted_elderly' | 'denied_underweight';

export interface PlanResult {
  status: PlanStatus;
  justification: string[];
  diet?: DietPlan;
  workout?: WorkoutPlan;
  bmr?: number;
  tdee?: number;
  targetCalories?: number;
  strategyValue?: number;
  goal?: Goal;
  bmi: number;
  bmiClass: string;
}
