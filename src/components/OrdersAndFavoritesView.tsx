import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Heart,
  MessageCircle,
  Package,
  RotateCcw,
  Star,
} from 'lucide-react';
import { MENU_ITEMS } from '../data/menuData';
import {
  CartItem,
  FeedbackRecord,
  FIELD_LIMITS,
  MenuItem,
  OrderRecord,
  ReorderIntent,
} from '../types';
import { buildWhatsAppOrderUrl } from './CheckoutDrawer';

interface OrdersAndFavoritesViewProps {
  isSignedIn: boolean;
  orders: OrderRecord[];
  feedbackList: FeedbackRecord[];
  favorites: string[];
  loading: boolean;
  onRequireAuth: () => void;
  onReorderItems: (items: CartItem[]) => void;
  onAddFavoriteToBag: (item: MenuItem) => void;
  onToggleFavorite: (itemId: string) => void;
  onSubmitFeedback: (payload: {
    orderId: string;
    tasteRating: number;
    storyRating: number;
    storyInfluenced: boolean;
    reorderIntent: ReorderIntent;
    includeStoryCard: boolean;
    comment: string;
  }) => Promise<void>;
}

const ORDER_STEPS: ('Placed' | 'Paid' | 'Delivered')[] = ['Placed', 'Paid', 'Delivered'];

const StarRatingInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
    <div className="mt-1.5 flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`${label}: ${star} out of 5`}
          aria-pressed={value === star}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-200 bg-white transition-colors hover:bg-amber-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <Star
            className={`h-5 w-5 ${
              star <= value
                ? 'fill-amber-500 text-amber-500'
                : 'text-zinc-300 dark:text-zinc-600'
            }`}
          />
        </button>
      ))}
    </div>
  </div>
);

export const OrdersAndFavoritesView: React.FC<OrdersAndFavoritesViewProps> = ({
  isSignedIn,
  orders,
  feedbackList,
  favorites,
  loading,
  onRequireAuth,
  onReorderItems,
  onAddFavoriteToBag,
  onToggleFavorite,
  onSubmitFeedback,
}) => {
  const [openFeedbackOrderId, setOpenFeedbackOrderId] = useState<string | null>(null);
  const [tasteRating, setTasteRating] = useState(5);
  const [storyRating, setStoryRating] = useState(5);
  const [storyInfluenced, setStoryInfluenced] = useState(true);
  const [reorderIntent, setReorderIntent] = useState<ReorderIntent>('Yes');
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const favoriteDishes = useMemo(
    () => MENU_ITEMS.filter((item) => favorites.includes(item.id)),
    [favorites]
  );

  const feedbackByOrderId = useMemo(() => {
    const map: Record<string, FeedbackRecord> = {};
    for (const fb of feedbackList) {
      map[fb.orderId] = fb;
    }
    return map;
  }, [feedbackList]);

  const handleOpenFeedback = (order: OrderRecord) => {
    setOpenFeedbackOrderId(order.orderId);
    setTasteRating(5);
    setStoryRating(5);
    setStoryInfluenced(order.includeStoryCard);
    setReorderIntent('Yes');
    setComment('');
  };

  const handleFeedbackSubmit = async (e: React.FormEvent, order: OrderRecord) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await onSubmitFeedback({
        orderId: order.orderId,
        tasteRating,
        storyRating,
        storyInfluenced,
        reorderIntent,
        includeStoryCard: order.includeStoryCard,
        comment: comment.trim(),
      });
      setOpenFeedbackOrderId(null);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <Package className="mx-auto h-10 w-10 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Track Orders &amp; Favourites
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Sign in with Google or email to track your Placed / Paid / Delivered pre-orders, reorder in one tap, and keep your favourites synced across devices.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="mt-6 min-h-[48px] rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          Sign in to continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Favourites & 1-Tap Reorder */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Your Favourites
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Saved home dishes ready for one-tap reordering.
            </p>
          </div>
          <span className="font-mono-num text-xs text-zinc-500 dark:text-zinc-400">
            {favoriteDishes.length} saved
          </span>
        </div>

        {favoriteDishes.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Tap the heart icon on any dish in the menu to keep it here for one-tap reordering.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteDishes.map((dish) => (
              <div
                key={dish.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 shrink-0 rounded-xl object-cover bg-zinc-100 dark:bg-zinc-800"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {dish.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {dish.state} · <span className="font-mono-num">₹{dish.price}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(dish.id)}
                    aria-label={`Remove ${dish.name} from favourites`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-amber-600 hover:bg-zinc-100 dark:text-amber-400 dark:hover:bg-zinc-800"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddFavoriteToBag(dish)}
                    className="min-h-[44px] rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-800 whitespace-nowrap dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    Order now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Order History & Tracking */}
      <section className="space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your Pre-orders
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Track Placed, Paid, and Delivered status, reorder in one tap, or share taste &amp; story feedback.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-36 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <Package className="mx-auto h-9 w-9 text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No pre-orders yet on this account.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const stepIdx = ORDER_STEPS.indexOf(order.status);
              const existingFb = feedbackByOrderId[order.orderId];
              const isFeedbackOpen = openFeedbackOrderId === order.orderId;
              const wa = buildWhatsAppOrderUrl(order);

              return (
                <article
                  key={order.orderId}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Order Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <div>
                      <p className="font-mono-num text-xs text-zinc-500 dark:text-zinc-400">
                        Order {order.orderId} · {order.paymentMethod} ·{' '}
                        {order.includeStoryCard ? 'With Story Card' : 'Jar Only'}
                      </p>
                      <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {order.dehradunArea} — {order.hostelAddress}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Slot: {order.deliverySlot}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-num text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        ₹{order.totalAmount}
                      </p>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                        Status: {order.status}
                      </p>
                    </div>
                  </div>

                  {/* 3-Step Visual Tracker */}
                  <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Order progress">
                    {ORDER_STEPS.map((step, idx) => {
                      const reached = idx <= stepIdx;
                      return (
                        <div key={step} className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-colors ${
                              reached
                                ? 'bg-amber-700 dark:bg-amber-500'
                                : 'bg-zinc-200 dark:bg-zinc-800'
                            }`}
                          />
                          <p
                            className={`text-xs font-medium ${
                              reached
                                ? 'text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Item summary */}
                  <ul className="mt-4 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {order.items.map((item) => (
                      <li key={item.itemId} className="flex justify-between gap-2">
                        <span>
                          {item.quantity} × {item.name}
                        </span>
                        <span className="font-mono-num text-zinc-500 dark:text-zinc-400">
                          ₹{item.price * item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Row */}
                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onReorderItems(order.items)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 whitespace-nowrap dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reorder in one tap
                    </button>

                    <a
                      href={wa.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 whitespace-nowrap dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      WhatsApp Summary
                    </a>

                    {!existingFb && !isFeedbackOpen && (
                      <button
                        type="button"
                        onClick={() => handleOpenFeedback(order)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-700/30 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 whitespace-nowrap dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        Rate Taste &amp; Story
                      </button>
                    )}
                  </div>

                  {/* Submitted Feedback Summary */}
                  {existingFb && (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                      <div className="flex flex-wrap items-center gap-3 font-medium">
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Feedback recorded
                        </span>
                        <span>Taste: {existingFb.tasteRating}/5</span>
                        <span>·</span>
                        <span>Story: {existingFb.storyRating}/5</span>
                        <span>·</span>
                        <span>
                          Story influenced: {existingFb.storyInfluenced ? 'Yes' : 'No'}
                        </span>
                        <span>·</span>
                        <span>Reorder: {existingFb.reorderIntent}</span>
                      </div>
                      {existingFb.comment && (
                        <p className="mt-1.5 text-zinc-600 dark:text-zinc-400">
                          &ldquo;{existingFb.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Inline Feedback Form */}
                  {isFeedbackOpen && (
                    <form
                      onSubmit={(e) => handleFeedbackSubmit(e, order)}
                      className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StarRatingInput
                          label="Taste Rating (1-5)"
                          value={tasteRating}
                          onChange={setTasteRating}
                        />
                        <StarRatingInput
                          label="Story & Tradition Rating (1-5)"
                          value={storyRating}
                          onChange={setStoryRating}
                        />
                      </div>

                      <div>
                        <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Did the recipe-holder&apos;s story influence your decision to order?
                        </span>
                        <div className="mt-1.5 flex gap-2">
                          {[true, false].map((val) => (
                            <button
                              key={String(val)}
                              type="button"
                              onClick={() => setStoryInfluenced(val)}
                              aria-pressed={storyInfluenced === val}
                              className={`min-h-[44px] rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                                storyInfluenced === val
                                  ? 'border-amber-700 bg-amber-700 text-white dark:border-amber-500 dark:bg-amber-600'
                                  : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                              }`}
                            >
                              {val ? 'Yes, it influenced me' : 'No, just the dish'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Would you reorder this dish?
                        </span>
                        <div className="mt-1.5 flex gap-2">
                          {(['Yes', 'Maybe', 'No'] as ReorderIntent[]).map((intent) => (
                            <button
                              key={intent}
                              type="button"
                              onClick={() => setReorderIntent(intent)}
                              aria-pressed={reorderIntent === intent}
                              className={`min-h-[44px] rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                                reorderIntent === intent
                                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-amber-500 dark:bg-amber-600'
                                  : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                              }`}
                            >
                              {intent}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`fb-comment-${order.orderId}`}
                          className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          Anything we should tell the recipe-holder? (Optional)
                        </label>
                        <textarea
                          id={`fb-comment-${order.orderId}`}
                          rows={2}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          maxLength={FIELD_LIMITS.COMMENT_MAX}
                          placeholder="Felt just like Sunday lunch at home..."
                          className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={submittingFeedback}
                          className="min-h-[44px] rounded-xl bg-amber-700 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600"
                        >
                          {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenFeedbackOrderId(null)}
                          className="min-h-[44px] rounded-xl px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
