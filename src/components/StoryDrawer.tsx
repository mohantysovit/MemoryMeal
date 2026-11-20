import React from 'react';
import { BookHeart, MapPin, Plus, X } from 'lucide-react';
import { MenuItem } from '../types';

interface StoryDrawerProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToBag: (item: MenuItem) => void;
  quantityInBag: number;
}

export const StoryDrawer: React.FC<StoryDrawerProps> = ({
  item,
  onClose,
  onAddToBag,
  quantityInBag,
}) => {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-drawer-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white shadow-2xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Top photo with measured contrast scrim */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recipe story"
            className="absolute top-3 right-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs transition-colors hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute right-5 bottom-4 left-5 text-white">
            <p className="text-xs font-medium text-amber-200">
              {item.state} · {item.originTown}
            </p>
            <h2 id="story-drawer-title" className="mt-1 text-2xl font-semibold leading-snug">
              {item.storyTitle}
            </h2>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Recipe-holder attribution */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Recipe-holder
              </p>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {item.recipeHolderName}, {item.recipeHolderAge}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {item.size}
              </p>
              <p className="font-mono-num text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                ₹{item.price}
              </p>
            </div>
          </div>

          {/* Story prose */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
              <BookHeart className="h-4 w-4" aria-hidden="true" />
              <span>Story &amp; Family Tradition</span>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {item.storyText}
            </p>
          </div>

          {/* Memory measurement callout (no thick left border!) */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Measured from Memory
            </p>
            <p className="mt-1.5 text-sm italic leading-relaxed text-zinc-600 dark:text-zinc-300">
              {item.memoryNote}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Freshly prepared for Dehradun hostel &amp; PG delivery
            </span>
            <span>{item.spiceLevel} spice</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onAddToBag(item);
              onClose();
            }}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {quantityInBag > 0
              ? `Add another to bag (${quantityInBag} in bag) · ₹${item.price}`
              : `Pre-order with Story Card · ₹${item.price}`}
          </button>
        </div>
      </div>
    </div>
  );
};
