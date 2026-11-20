import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BarChart3,
  BookOpen,
  Check,
  ChefHat,
  LogOut,
  Moon,
  Package,
  ShoppingBag,
  Sun,
  User as UserIcon,
  UtensilsCrossed,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { FounderDashboard } from './components/FounderDashboard';
import { MenuSection } from './components/MenuSection';
import { OrdersAndFavoritesView } from './components/OrdersAndFavoritesView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { RecipeSubmissionView } from './components/RecipeSubmissionView';
import { SetupGuideModal } from './components/SetupGuideModal';
import { StoryDrawer } from './components/StoryDrawer';
import {
  DEFAULT_CHECKOUT_FORM,
  DEFAULT_DRAFT_RECIPE,
  DEHRADUN_AREAS,
  DELIVERY_SLOTS,
} from './data/menuData';
import { ADMIN_EMAIL, auth, db, handleFirestoreError } from './firebase';
import {
  CartItem,
  CheckoutForm,
  DraftRecipe,
  FamilyRecipeRecord,
  FeedbackRecord,
  FIELD_LIMITS,
  MenuItem,
  OperationType,
  OrderRecord,
  OrderStatus,
  ReorderIntent,
  ThemeMode,
  UserStateDoc,
} from './types';

type ActiveTab = 'menu' | 'orders' | 'submit' | 'founder';

function getTimestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return Number((ts as { seconds: number }).seconds) * 1000;
  }
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}_${Date.now().toString(36).toUpperCase()}_${rand}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Per-user persistent state (also works in guest mode locally before sign-in)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [includeStoryCard, setIncludeStoryCard] = useState<boolean>(true);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(DEFAULT_CHECKOUT_FORM);
  const [draftRecipe, setDraftRecipe] = useState<DraftRecipe>(DEFAULT_DRAFT_RECIPE);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mm_theme') as ThemeMode) || 'light';
    }
    return 'light';
  });

  // Auto-save indicator & hydration guard
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hydratedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  // Domain records from Firestore
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [recipes, setRecipes] = useState<FamilyRecipeRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Overlays & Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authContextMsg, setAuthContextMsg] = useState<string | undefined>(undefined);
  const [bagOpen, setBagOpen] = useState(false);
  const [storyItem, setStoryItem] = useState<MenuItem | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [setupGuideOpen, setSetupGuideOpen] = useState(false);

  // Apply Dark Mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('mm_theme', theme);
    } catch {
      // Ignore storage quota issues
    }
  }, [theme]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      hydratedRef.current = false;

      if (!currentUser) {
        setIsAdmin(false);
        setOrders([]);
        setFeedbackList([]);
        setRecipes([]);
        setSaveStatus('idle');
        setAuthReady(true);
        return;
      }

      // Check admin role (verified founder email or /admins/{uid})
      let adminFlag =
        currentUser.emailVerified && currentUser.email === ADMIN_EMAIL;

      if (!adminFlag) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminSnap.exists()) adminFlag = true;
        } catch {
          // Non-admins cannot read other admin docs; ignore if missing
        }
      }
      setIsAdmin(adminFlag);

      // Ensure /users/{uid} profile exists
      const userDocPath = `users/${currentUser.uid}`;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const displayName = (
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'Memory Meals Member'
        ).slice(0, FIELD_LIMITS.NAME_MAX);
        const email = (currentUser.email || 'no-email@memorymeals.in').slice(
          0,
          FIELD_LIMITS.EMAIL_MAX
        );

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName,
            email,
            photoURL: (currentUser.photoURL || '').slice(0, 500),
            role: 'customer',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(userRef, {
            displayName,
            email,
            photoURL: (currentUser.photoURL || '').slice(0, 500),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, userDocPath);
      }

      // Pre-fill checkout name if empty
      setCheckoutForm((prev) => ({
        ...prev,
        customerName: prev.customerName || currentUser.displayName || '',
      }));

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to per-user auto-save state (/userStates/{uid})
  useEffect(() => {
    if (!authReady || !user) return;

    const statePath = `userStates/${user.uid}`;
    const stateRef = doc(db, 'userStates', user.uid);

    const unsubscribe = onSnapshot(
      stateRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserStateDoc;
          skipNextSaveRef.current = true;
          setCart(Array.isArray(data.cart) ? data.cart : []);
          setFavorites(Array.isArray(data.favorites) ? data.favorites : []);
          setIncludeStoryCard(
            typeof data.includeStoryCard === 'boolean' ? data.includeStoryCard : true
          );
          if (data.checkoutForm) {
            setCheckoutForm({
              customerName: data.checkoutForm.customerName || user.displayName || '',
              phone: data.checkoutForm.phone || '',
              dehradunArea: data.checkoutForm.dehradunArea || DEHRADUN_AREAS[0],
              hostelAddress: data.checkoutForm.hostelAddress || '',
              deliverySlot: data.checkoutForm.deliverySlot || DELIVERY_SLOTS[2],
              note: data.checkoutForm.note || '',
              paymentMethod: data.checkoutForm.paymentMethod || 'UPI',
            });
          }
          if (data.draftRecipe) {
            setDraftRecipe({
              ...DEFAULT_DRAFT_RECIPE,
              ...data.draftRecipe,
            });
          }
          if (data.theme === 'light' || data.theme === 'dark') {
            setTheme(data.theme);
          }
          hydratedRef.current = true;
          setSaveStatus('saved');
        } else {
          // First time for this user: hydrate immediately and allow auto-save to create doc
          hydratedRef.current = true;
          setSaveStatus('idle');
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, statePath);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Debounced auto-save to /userStates/{uid}
  const persistUserState = useCallback(
    async (
      nextCart: CartItem[],
      nextFavs: string[],
      nextStoryCard: boolean,
      nextForm: CheckoutForm,
      nextDraft: DraftRecipe,
      nextTheme: ThemeMode
    ) => {
      if (!user) return;
      const statePath = `userStates/${user.uid}`;
      const stateRef = doc(db, 'userStates', user.uid);

      const sanitizedCart = nextCart.slice(0, FIELD_LIMITS.CART_MAX_ITEMS).map((item) => ({
        itemId: item.itemId.slice(0, 64),
        name: item.name.slice(0, 120),
        price: Number(item.price),
        quantity: Math.max(1, Math.min(20, Math.round(item.quantity))),
        state: item.state,
        size: item.size.slice(0, 60),
        image: item.image.slice(0, 500),
      }));

      const sanitizedFavs = nextFavs
        .slice(0, FIELD_LIMITS.FAVORITES_MAX_ITEMS)
        .map((id) => id.slice(0, 64));

      const sanitizedForm: CheckoutForm = {
        customerName: nextForm.customerName.slice(0, FIELD_LIMITS.NAME_MAX),
        phone: nextForm.phone.slice(0, FIELD_LIMITS.PHONE_MAX),
        dehradunArea: (nextForm.dehradunArea || DEHRADUN_AREAS[0]).slice(0, FIELD_LIMITS.AREA_MAX),
        hostelAddress: nextForm.hostelAddress.slice(0, FIELD_LIMITS.ADDRESS_MAX),
        deliverySlot: nextForm.deliverySlot || DELIVERY_SLOTS[2],
        note: nextForm.note.slice(0, FIELD_LIMITS.NOTE_MAX),
        paymentMethod: nextForm.paymentMethod === 'COD' ? 'COD' : 'UPI',
      };

      const sanitizedDraft: DraftRecipe = {
        submitterName: nextDraft.submitterName.slice(0, FIELD_LIMITS.NAME_MAX),
        relationship: nextDraft.relationship.slice(0, FIELD_LIMITS.NAME_MAX),
        state: nextDraft.state,
        recipeName: nextDraft.recipeName.slice(0, FIELD_LIMITS.RECIPE_NAME_MAX),
        ingredients: nextDraft.ingredients.slice(0, FIELD_LIMITS.INGREDIENTS_MAX),
        steps: nextDraft.steps.slice(0, FIELD_LIMITS.STEPS_MAX),
        story: nextDraft.story.slice(0, FIELD_LIMITS.STORY_MAX),
      };

      try {
        await setDoc(stateRef, {
          uid: user.uid,
          cart: sanitizedCart,
          favorites: sanitizedFavs,
          includeStoryCard: Boolean(nextStoryCard),
          checkoutForm: sanitizedForm,
          draftRecipe: sanitizedDraft,
          theme: nextTheme,
          updatedAt: serverTimestamp(),
        });
        setSaveStatus('saved');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, statePath);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!authReady || !user || !hydratedRef.current) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    setSaveStatus('saving');
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      persistUserState(cart, favorites, includeStoryCard, checkoutForm, draftRecipe, theme);
    }, 650);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [
    authReady,
    user,
    cart,
    favorites,
    includeStoryCard,
    checkoutForm,
    draftRecipe,
    theme,
    persistUserState,
  ]);

  // Subscribe to orders, feedback, and family recipes
  useEffect(() => {
    if (!authReady || !user) return;

    setLoadingOrders(true);

    const ordersQuery = isAdmin
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'orders'), where('userId', '==', user.uid));

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as OrderRecord);
        list.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setOrders(list);
        setLoadingOrders(false);
      },
      (error) => {
        setLoadingOrders(false);
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    const fbQuery = isAdmin
      ? query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'feedback'), where('userId', '==', user.uid));

    const unsubFb = onSnapshot(
      fbQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FeedbackRecord);
        list.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setFeedbackList(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'feedback');
      }
    );

    const recipesQuery = isAdmin
      ? query(collection(db, 'recipes'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'recipes'), where('userId', '==', user.uid));

    const unsubRecipes = onSnapshot(
      recipesQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FamilyRecipeRecord);
        list.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setRecipes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'recipes');
      }
    );

    return () => {
      unsubOrders();
      unsubFb();
      unsubRecipes();
    };
  }, [authReady, user, isAdmin]);

  // Cart & Favourite actions
  const handleAddToBag = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.itemId === item.id);
      if (idx >= 0) {
        return prev.map((entry, i) =>
          i === idx
            ? { ...entry, quantity: Math.min(20, entry.quantity + 1) }
            : entry
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          state: item.state,
          size: item.size,
          image: item.image,
        },
      ];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.itemId === itemId
            ? { ...i, quantity: Math.min(20, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleToggleFavorite = (itemId: string) => {
    setFavorites((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleReorderItems = (items: CartItem[]) => {
    setCart(items.map((i) => ({ ...i })));
    setBagOpen(true);
  };

  const openAuthPrompt = (msg?: string) => {
    setAuthContextMsg(msg);
    setAuthModalOpen(true);
  };

  // Place Order in Firestore
  const handlePlaceOrder = async (): Promise<OrderRecord> => {
    if (!user) {
      openAuthPrompt('Please sign in to place your Dehradun pre-order.');
      throw new Error('Authentication required');
    }

    const orderId = generateId('MM');
    const totalAmount = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const orderPayload: OrderRecord = {
      orderId,
      userId: user.uid,
      customerName: checkoutForm.customerName.trim().slice(0, FIELD_LIMITS.NAME_MAX),
      customerEmail: (user.email || 'customer@memorymeals.in').slice(0, FIELD_LIMITS.EMAIL_MAX),
      phone: checkoutForm.phone.trim().slice(0, FIELD_LIMITS.PHONE_MAX),
      dehradunArea: checkoutForm.dehradunArea.slice(0, FIELD_LIMITS.AREA_MAX),
      hostelAddress: checkoutForm.hostelAddress.trim().slice(0, FIELD_LIMITS.ADDRESS_MAX),
      deliverySlot: checkoutForm.deliverySlot,
      note: checkoutForm.note.trim().slice(0, FIELD_LIMITS.NOTE_MAX),
      paymentMethod: checkoutForm.paymentMethod,
      includeStoryCard,
      items: cart.slice(0, FIELD_LIMITS.CART_MAX_ITEMS),
      totalAmount,
      status: 'Placed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'orders', orderId), orderPayload);
      setCart([]);
      return orderPayload;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
    }
  };

  // Submit Order Feedback
  const handleSubmitFeedback = async (payload: {
    orderId: string;
    tasteRating: number;
    storyRating: number;
    storyInfluenced: boolean;
    reorderIntent: ReorderIntent;
    includeStoryCard: boolean;
    comment: string;
  }) => {
    if (!user) return;
    const fbId = payload.orderId;
    try {
      await setDoc(doc(db, 'feedback', fbId), {
        feedbackId: fbId,
        orderId: payload.orderId,
        userId: user.uid,
        tasteRating: Math.max(1, Math.min(5, Math.round(payload.tasteRating))),
        storyRating: Math.max(1, Math.min(5, Math.round(payload.storyRating))),
        storyInfluenced: Boolean(payload.storyInfluenced),
        reorderIntent: payload.reorderIntent,
        includeStoryCard: Boolean(payload.includeStoryCard),
        comment: payload.comment.slice(0, FIELD_LIMITS.COMMENT_MAX),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `feedback/${fbId}`);
    }
  };

  // Submit Family Recipe
  const handleSubmitRecipe = async (media: {
    photoData: string;
    voiceNoteData: string;
  }) => {
    if (!user) {
      openAuthPrompt('Please sign in to submit your family recipe.');
      return;
    }

    const recipeId = generateId('REC');
    try {
      await setDoc(doc(db, 'recipes', recipeId), {
        recipeId,
        userId: user.uid,
        submitterName: draftRecipe.submitterName.trim().slice(0, FIELD_LIMITS.NAME_MAX),
        relationship: draftRecipe.relationship.trim().slice(0, FIELD_LIMITS.NAME_MAX),
        state: draftRecipe.state,
        recipeName: draftRecipe.recipeName.trim().slice(0, FIELD_LIMITS.RECIPE_NAME_MAX),
        ingredients: draftRecipe.ingredients.trim().slice(0, FIELD_LIMITS.INGREDIENTS_MAX),
        steps: draftRecipe.steps.trim().slice(0, FIELD_LIMITS.STEPS_MAX),
        story: draftRecipe.story.trim().slice(0, FIELD_LIMITS.STORY_MAX),
        photoData: media.photoData.slice(0, FIELD_LIMITS.PHOTO_DATA_MAX),
        voiceNoteData: media.voiceNoteData.slice(0, FIELD_LIMITS.VOICE_DATA_MAX),
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      setDraftRecipe(DEFAULT_DRAFT_RECIPE);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `recipes/${recipeId}`);
    }
  };

  // Admin: Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  // Admin: Update recipe moderation status
  const handleUpdateRecipeStatus = async (
    recipeId: string,
    status: 'Pending' | 'Featured' | 'Archived'
  ) => {
    try {
      await updateDoc(doc(db, 'recipes', recipeId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recipes/${recipeId}`);
    }
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await signOut(auth);
    if (activeTab === 'founder') setActiveTab('menu');
  };

  const bagCount = cart.reduce((s, i) => s + i.quantity, 0);
  const storyItemQty = storyItem
    ? cart.find((i) => i.itemId === storyItem.id)?.quantity || 0
    : 0;

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Sticky Top Header (3-Zone Contract, compact 56px height) */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className="font-display text-xl font-semibold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 dark:text-zinc-50"
          >
            Memory Meals
          </button>

          {/* Zone 2: Concise single-line nav links (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 md:flex"
          >
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`min-h-[44px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'menu'
                  ? 'text-amber-800 underline underline-offset-8 dark:text-amber-400'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`min-h-[44px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'text-amber-800 underline underline-offset-8 dark:text-amber-400'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className={`min-h-[44px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'submit'
                  ? 'text-amber-800 underline underline-offset-8 dark:text-amber-400'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Share Recipe
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('founder')}
                className={`min-h-[44px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'founder'
                    ? 'text-amber-800 underline underline-offset-8 dark:text-amber-400'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Founder
              </button>
            )}
          </nav>

          {/* Zone 3: Bag + Account / Sign In */}
          <div className="relative flex items-center gap-2 shrink-0">
            {user && saveStatus !== 'idle' && (
              <span className="hidden items-center gap-1 text-xs text-zinc-500 sm:inline-flex dark:text-zinc-400">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {saveStatus === 'saving' ? 'Saving' : 'Saved'}
              </span>
            )}

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setBagOpen(true)}
              aria-label={`Open bag with ${bagCount} items`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-800 whitespace-nowrap shrink-0 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono-num">Bag ({bagCount})</span>
            </button>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-label="Open account menu"
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User avatar'}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                      {(user.displayName || user.email || 'M').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-[110px] truncate sm:inline">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {user.displayName || 'Memory Meals Member'}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {user.email}
                      </p>
                      {isAdmin && (
                        <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                          Founder Admin
                        </p>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="py-1">
                        <PWAInstallButton />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setSetupGuideOpen(true);
                        }}
                        className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        Setup &amp; Firebase Guide
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthPrompt()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 whitespace-nowrap shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <UserIcon className="h-4 w-4" aria-hidden="true" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6 md:pb-12">
        {activeTab === 'menu' && (
          <MenuSection
            cart={cart}
            favorites={favorites}
            onAddToBag={handleAddToBag}
            onUpdateQty={handleUpdateQty}
            onToggleFavorite={handleToggleFavorite}
            onOpenStory={(item) => setStoryItem(item)}
            onJumpToRecipeSubmit={() => setActiveTab('submit')}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersAndFavoritesView
            isSignedIn={!!user}
            orders={orders}
            feedbackList={feedbackList}
            favorites={favorites}
            loading={loadingOrders}
            onRequireAuth={() =>
              openAuthPrompt('Sign in to view your pre-order tracking and saved favourites.')
            }
            onReorderItems={handleReorderItems}
            onAddFavoriteToBag={(item) => {
              handleAddToBag(item);
              setBagOpen(true);
            }}
            onToggleFavorite={handleToggleFavorite}
            onSubmitFeedback={handleSubmitFeedback}
          />
        )}

        {activeTab === 'submit' && (
          <RecipeSubmissionView
            isSignedIn={!!user}
            draftRecipe={draftRecipe}
            saveStatus={saveStatus}
            submittedRecipes={recipes}
            onUpdateDraft={(patch) =>
              setDraftRecipe((prev) => ({ ...prev, ...patch }))
            }
            onRequireAuth={() =>
              openAuthPrompt('Sign in so your family recipe draft saves automatically to your account.')
            }
            onSubmitRecipe={handleSubmitRecipe}
          />
        )}

        {activeTab === 'founder' && isAdmin && (
          <FounderDashboard
            orders={orders}
            feedbackList={feedbackList}
            recipes={recipes}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateRecipeStatus={handleUpdateRecipeStatus}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50/60 py-8 pb-24 md:pb-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-zinc-500 sm:px-6 dark:text-zinc-400">
          <p>
            Memory Meals · Dehradun Hostel &amp; PG Delivery · Odia, Uttarakhandi &amp; Bengali Family Recipes
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setSetupGuideOpen(true)}
              className="min-h-[44px] px-2 font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              Setup Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Thumb-Zone) */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`fixed right-0 bottom-0 left-0 z-40 grid h-16 border-t border-zinc-200 bg-white/95 backdrop-blur-md pb-safe md:hidden dark:border-zinc-800 dark:bg-zinc-950/95 ${
          isAdmin ? 'grid-cols-4' : 'grid-cols-3'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeTab === 'menu'
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
          <span>Menu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeTab === 'orders'
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Package className="h-5 w-5" aria-hidden="true" />
          <span>Orders</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submit')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeTab === 'submit'
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <ChefHat className="h-5 w-5" aria-hidden="true" />
          <span>Share Recipe</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('founder')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              activeTab === 'founder'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
            <span>Founder</span>
          </button>
        )}
      </nav>

      {/* Modals & Drawers */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        contextMessage={authContextMsg}
      />

      <StoryDrawer
        item={storyItem}
        onClose={() => setStoryItem(null)}
        onAddToBag={handleAddToBag}
        quantityInBag={storyItemQty}
      />

      <CheckoutDrawer
        isOpen={bagOpen}
        onClose={() => setBagOpen(false)}
        cart={cart}
        checkoutForm={checkoutForm}
        includeStoryCard={includeStoryCard}
        isSignedIn={!!user}
        saveStatus={saveStatus}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onUpdateForm={(patch) => setCheckoutForm((prev) => ({ ...prev, ...patch }))}
        onToggleStoryCard={setIncludeStoryCard}
        onRequireAuth={() => {
          setBagOpen(false);
          openAuthPrompt('Sign in with Google or email to confirm your Dehradun pre-order.');
        }}
        onPlaceOrder={handlePlaceOrder}
        onViewOrders={() => setActiveTab('orders')}
      />

      <SetupGuideModal
        isOpen={setupGuideOpen}
        onClose={() => setSetupGuideOpen(false)}
      />

      <OfflineIndicator />
    </div>
  );
}
