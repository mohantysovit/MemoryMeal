import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Heart,
  Minus,
  Plus,
  UtensilsCrossed,
} from 'lucide-react';
import { HERO_BANNER_IMAGE, MENU_ITEMS } from '../data/menuData';
import {
  CartItem,
  DietaryType,
  DishCategory,
  IndianState,
  MealTime,
  MenuItem,
} from '../types';

interface MenuSectionProps {
  cart: CartItem[];
  favorites: string[];
  onAddToBag: (item: MenuItem) => void;
  onUpdateQty: (itemId: string, delta: number) => void;
  onToggleFavorite: (itemId: string) => void;
  onOpenStory: (item: MenuItem) => void;
  onJumpToRecipeSubmit: () => void;
}

const STATES: ('All' | IndianState)[] = ['All', 'Odisha', 'Uttarakhand', 'West Bengal'];
const MEAL_TIMES: ('All' | MealTime)[] = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const CATEGORIES: ('All' | DishCategory)[] = ['All', 'Meals', 'Pickles', 'Masalas', 'Sweets'];
const DIETARY: ('All' | DietaryType)[] = ['All', 'Veg', 'Non-Veg'];

const DietaryMark: React.FC<{ dietary: DietaryType }> = ({ dietary }) => {
  const isVeg = dietary === 'Veg';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="14"
          height="14"
          rx="2"
          fill="none"
          stroke={isVeg ? '#15803d' : '#9a3412'}
          strokeWidth="1.5"
        />
        {isVeg ? (
          <circle cx="8" cy="8" r="3.5" fill="#15803d" />
        ) : (
          <polygon points="8,4 12,12 4,12" fill="#9a3412" />
        )}
      </svg>
      <span>{dietary}</span>
    </span>
  );
};

interface DishCardProps {
  item: MenuItem;
  quantity: number;
  isFavorite: boolean;
  onAddToBag: (item: MenuItem) => void;
  onUpdateQty: (itemId: string, delta: number) => void;
  onToggleFavorite: (itemId: string) => void;
  onOpenStory: (item: MenuItem) => void;
}

const DishCard: React.FC<DishCardProps> = ({
  item,
  quantity,
  isFavorite,
  onAddToBag,
  onUpdateQty,
  onToggleFavorite,
  onOpenStory,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-transform duration-200 hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image area (4:3) */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {!imgError ? (
          <img
            src={item.image}
            alt={`${item.name} from ${item.originTown}`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-zinc-100 p-4 text-center dark:from-zinc-800 dark:to-zinc-900">
            <UtensilsCrossed className="h-8 w-8 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.name}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          aria-label={isFavorite ? `Remove ${item.name} from favourites` : `Save ${item.name} to favourites`}
          aria-pressed={isFavorite}
          className="absolute top-2.5 right-2.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-xs backdrop-blur-xs transition-colors hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <Heart
            className={`h-5 w-5 ${isFavorite ? 'fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Clean unboxed metadata row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            {item.state} · {item.mealTimes.join(' / ')} · {item.spiceLevel} spice
          </span>
          <DietaryMark dietary={item.dietary} />
        </div>

        <h3 className="mt-2 text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {item.name}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {item.shortDesc}
        </p>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          By <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.recipeHolderName}</span> · {item.originTown}
        </p>

        {/* Read the story and tradition */}
        <button
          type="button"
          onClick={() => onOpenStory(item)}
          className="mt-3 inline-flex min-h-[44px] w-fit items-center gap-2 text-xs font-semibold text-amber-800 underline-offset-4 hover:underline dark:text-amber-400"
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Read the story and tradition</span>
        </button>

        {/* Price + Action bar pinned to bottom */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <p className="font-mono-num text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              ₹{item.price}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.size}</p>
          </div>

          {quantity > 0 ? (
            <div className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => onUpdateQty(item.id, -1)}
                aria-label={`Decrease quantity of ${item.name}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-xl text-zinc-700 transition-colors hover:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-mono-num min-w-[28px] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQty(item.id, 1)}
                aria-label={`Increase quantity of ${item.name}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-xl text-zinc-700 transition-colors hover:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToBag(item)}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800 whitespace-nowrap shrink-0 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add to bag
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export const MenuSection: React.FC<MenuSectionProps> = ({
  cart,
  favorites,
  onAddToBag,
  onUpdateQty,
  onToggleFavorite,
  onOpenStory,
  onJumpToRecipeSubmit,
}) => {
  const [stateFilter, setStateFilter] = useState<'All' | IndianState>('All');
  const [mealFilter, setMealFilter] = useState<'All' | MealTime>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | DishCategory>('All');
  const [dietaryFilter, setDietaryFilter] = useState<'All' | DietaryType>('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(true);
  const [heroImgErr, setHeroImgErr] = useState(false);

  const qtyByItem = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      map[item.itemId] = item.quantity;
    }
    return map;
  }, [cart]);

  const matchesFilters = (item: MenuItem) => {
    if (stateFilter !== 'All' && item.state !== stateFilter) return false;
    if (mealFilter !== 'All' && !item.mealTimes.includes(mealFilter)) return false;
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
    if (dietaryFilter !== 'All' && item.dietary !== dietaryFilter) return false;
    if (onlyFavorites && !favorites.includes(item.id)) return false;
    return true;
  };

  const pilotItems = useMemo(
    () => MENU_ITEMS.filter((item) => item.isPilot && matchesFilters(item)),
    [stateFilter, mealFilter, categoryFilter, dietaryFilter, onlyFavorites, favorites]
  );

  const moreItems = useMemo(
    () => MENU_ITEMS.filter((item) => !item.isPilot && matchesFilters(item)),
    [stateFilter, mealFilter, categoryFilter, dietaryFilter, onlyFavorites, favorites]
  );

  const hasActiveFilter =
    stateFilter !== 'All' ||
    mealFilter !== 'All' ||
    categoryFilter !== 'All' ||
    dietaryFilter !== 'All' ||
    onlyFavorites;

  const resetFilters = () => {
    setStateFilter('All');
    setMealFilter('All');
    setCategoryFilter('All');
    setDietaryFilter('All');
    setOnlyFavorites(false);
  };

  return (
    <div className="space-y-10">
      {/* Editorial Hero Split */}
      <section className="grid grid-cols-1 items-stretch gap-8 border-b border-zinc-200 pb-10 lg:grid-cols-12 dark:border-zinc-800">
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
            Dehradun Hostels &amp; PGs · Odia, Uttarakhandi &amp; Bengali Kitchens
          </p>
          <h1
            className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50"
            style={{ textWrap: 'balance' }}
          >
            Real family recipes, cooked from memory and delivered with their story.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            Missing Maa&apos;s Dalma, Dadi&apos;s Kafuli, or Thakuma&apos;s Kasundi in Prem Nagar or Clement Town? Pre-order a ₹350 small-batch jar cooked directly from a 50+ recipe-holder&apos;s kitchen memory.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#pilot-menu"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 whitespace-nowrap dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Pre-order ₹350 Pilot Jars
            </a>
            <button
              type="button"
              onClick={onJumpToRecipeSubmit}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 whitespace-nowrap dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Submit a family recipe
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 lg:col-span-6 dark:border-zinc-800 dark:bg-zinc-900">
          {!heroImgErr ? (
            <img
              src={HERO_BANNER_IMAGE}
              alt="Home-cooked regional Indian meal and handwritten family recipe card on a linen dining table"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgErr(true)}
              className="aspect-16/10 h-full w-full object-cover lg:aspect-auto"
            />
          ) : (
            <div className="flex aspect-16/10 h-full w-full items-center justify-center bg-zinc-100 p-8 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-500">Memory Meals Regional Kitchen</p>
            </div>
          )}
        </div>
      </section>

      {/* Filter Bar */}
      <section aria-label="Menu filters" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {STATES.map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => setStateFilter(state)}
                aria-pressed={stateFilter === state}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  stateFilter === state
                    ? 'bg-zinc-900 text-white dark:bg-amber-600 dark:text-white'
                    : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {state === 'All' ? 'All States' : state}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyFavorites((prev) => !prev)}
              aria-pressed={onlyFavorites}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                onlyFavorites
                  ? 'bg-amber-700 text-white dark:bg-amber-600'
                  : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              <Heart className={`h-4 w-4 ${onlyFavorites ? 'fill-white' : ''}`} aria-hidden="true" />
              Favourites ({favorites.length})
            </button>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 whitespace-nowrap dark:text-amber-400 dark:hover:bg-zinc-800"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Meal Time, Category, Veg/Non-Veg */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {MEAL_TIMES.map((meal) => (
              <button
                key={meal}
                type="button"
                onClick={() => setMealFilter(meal)}
                aria-pressed={mealFilter === meal}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mealFilter === meal
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {meal === 'All' ? 'All Meals' : meal}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {cat === 'All' ? 'All Types' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {DIETARY.map((diet) => (
              <button
                key={diet}
                type="button"
                onClick={() => setDietaryFilter(diet)}
                aria-pressed={dietaryFilter === diet}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  dietaryFilter === diet
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {diet === 'All' ? 'Veg & Non-Veg' : diet}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured 3 Pilot Recipes */}
      <section id="pilot-menu" className="space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Featured Pilot Recipes
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Our three ₹350 Dehradun pilot jars—each tested directly with families from Odisha, Uttarakhand, and West Bengal.
            </p>
          </div>
          <span className="font-mono-num text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {pilotItems.length} of 3 pilot dishes shown
          </span>
        </div>

        {pilotItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pilotItems.map((item) => (
              <DishCard
                key={item.id}
                item={item}
                quantity={qtyByItem[item.id] || 0}
                isFavorite={favorites.includes(item.id)}
                onAddToBag={onAddToBag}
                onUpdateQty={onUpdateQty}
                onToggleFavorite={onToggleFavorite}
                onOpenStory={onOpenStory}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No pilot recipes match your current filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 min-h-[44px] rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white dark:bg-amber-600"
            >
              Show all dishes
            </button>
          </div>
        )}
      </section>

      {/* More Menu Section */}
      <section className="space-y-5 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              More menu
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Regional pickles, hand-roasted masalas, traditional sweets, and Sunday specials.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            aria-expanded={showMoreMenu}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 whitespace-nowrap shrink-0 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <span>{showMoreMenu ? 'Hide' : `Show (${moreItems.length})`}</span>
            {showMoreMenu ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {showMoreMenu && (
          moreItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {moreItems.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  quantity={qtyByItem[item.id] || 0}
                  isFavorite={favorites.includes(item.id)}
                  onAddToBag={onAddToBag}
                  onUpdateQty={onUpdateQty}
                  onToggleFavorite={onToggleFavorite}
                  onOpenStory={onOpenStory}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No items in More menu match those filters.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  );
};
