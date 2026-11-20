export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type IndianState = 'Odisha' | 'Uttarakhand' | 'West Bengal';
export type MealTime = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
export type DishCategory = 'Meals' | 'Pickles' | 'Masalas' | 'Sweets';
export type DietaryType = 'Veg' | 'Non-Veg';
export type OrderStatus = 'Placed' | 'Paid' | 'Delivered';
export type PaymentMethod = 'UPI' | 'COD';
export type ReorderIntent = 'Yes' | 'Maybe' | 'No';
export type ThemeMode = 'light' | 'dark';

export type DeliverySlot =
  | 'Lunch (12:30-2:00 PM)'
  | 'Evening Tiffin (5:00-6:30 PM)'
  | 'Dinner (7:30-9:00 PM)';

export interface MenuItem {
  id: string;
  name: string;
  state: IndianState;
  mealTimes: MealTime[];
  category: DishCategory;
  dietary: DietaryType;
  price: number;
  size: string;
  spiceLevel: 'Mild' | 'Medium' | 'Bold';
  isPilot: boolean;
  image: string;
  shortDesc: string;
  recipeHolderName: string;
  recipeHolderAge: number;
  originTown: string;
  storyTitle: string;
  storyText: string;
  memoryNote: string;
}

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  state: IndianState;
  size: string;
  image: string;
}

export interface CheckoutForm {
  customerName: string;
  phone: string;
  dehradunArea: string;
  hostelAddress: string;
  deliverySlot: DeliverySlot;
  note: string;
  paymentMethod: PaymentMethod;
}

export interface DraftRecipe {
  submitterName: string;
  relationship: string;
  state: IndianState;
  recipeName: string;
  ingredients: string;
  steps: string;
  story: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'customer' | 'admin';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserStateDoc {
  uid: string;
  cart: CartItem[];
  favorites: string[];
  includeStoryCard: boolean;
  checkoutForm: CheckoutForm;
  draftRecipe: DraftRecipe;
  theme: ThemeMode;
  updatedAt?: unknown;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  dehradunArea: string;
  hostelAddress: string;
  deliverySlot: DeliverySlot;
  note: string;
  paymentMethod: PaymentMethod;
  includeStoryCard: boolean;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt?: { seconds: number; nanoseconds: number } | Date | unknown;
  updatedAt?: { seconds: number; nanoseconds: number } | Date | unknown;
}

export interface FeedbackRecord {
  feedbackId: string;
  orderId: string;
  userId: string;
  tasteRating: number;
  storyRating: number;
  storyInfluenced: boolean;
  reorderIntent: ReorderIntent;
  includeStoryCard: boolean;
  comment: string;
  createdAt?: unknown;
}

export interface FamilyRecipeRecord {
  recipeId: string;
  userId: string;
  submitterName: string;
  relationship: string;
  state: IndianState;
  recipeName: string;
  ingredients: string;
  steps: string;
  story: string;
  photoData: string;
  voiceNoteData: string;
  status: 'Pending' | 'Featured' | 'Archived';
  createdAt?: unknown;
}

/**
 * Volumetric bounds synchronized verbatim with firebase-blueprint.json & firestore.rules.
 */
export const FIELD_LIMITS = {
  NAME_MAX: 100,
  EMAIL_MAX: 160,
  PHONE_MAX: 20,
  AREA_MAX: 100,
  ADDRESS_MAX: 240,
  NOTE_MAX: 400,
  COMMENT_MAX: 600,
  RECIPE_NAME_MAX: 120,
  INGREDIENTS_MAX: 2000,
  STEPS_MAX: 4000,
  STORY_MAX: 2500,
  PHOTO_DATA_MAX: 250000,
  VOICE_DATA_MAX: 350000,
  CART_MAX_ITEMS: 30,
  FAVORITES_MAX_ITEMS: 50,
} as const;
