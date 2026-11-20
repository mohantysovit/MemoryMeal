import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { DEHRADUN_AREAS, DELIVERY_SLOTS } from '../data/menuData';
import {
  CartItem,
  CheckoutForm,
  DeliverySlot,
  FIELD_LIMITS,
  OrderRecord,
  PaymentMethod,
} from '../types';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  checkoutForm: CheckoutForm;
  includeStoryCard: boolean;
  isSignedIn: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  onUpdateQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateForm: (patch: Partial<CheckoutForm>) => void;
  onToggleStoryCard: (include: boolean) => void;
  onRequireAuth: () => void;
  onPlaceOrder: () => Promise<OrderRecord>;
  onViewOrders: () => void;
}

export function buildWhatsAppOrderUrl(order: OrderRecord): { url: string; message: string } {
  const itemLines = order.items
    .map((i) => `- ${i.quantity}x ${i.name} (₹${i.price * i.quantity})`)
    .join('\n');

  const message = [
    `Hello Memory Meals! I just placed a Dehradun pre-order.`,
    `Order ID: ${order.orderId}`,
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Delivery Locality: ${order.dehradunArea}`,
    `Hostel / PG Address: ${order.hostelAddress}`,
    `Slot: ${order.deliverySlot}`,
    `Payment: ${order.paymentMethod}`,
    `Story Card (A/B): ${order.includeStoryCard ? 'With Printed Story Card' : 'Jar Only (No Story Card)'}`,
    ``,
    `Items:`,
    itemLines,
    ``,
    `Total: ₹${order.totalAmount}`,
    order.note ? `Kitchen Note: ${order.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const url = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
  return { url, message };
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  checkoutForm,
  includeStoryCard,
  isSignedIn,
  saveStatus,
  onUpdateQty,
  onRemoveItem,
  onUpdateForm,
  onToggleStoryCard,
  onRequireAuth,
  onPlaceOrder,
  onViewOrders,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    if (cart.length === 0) {
      setFormError('Your bag is empty. Add at least one dish to pre-order.');
      return;
    }

    const name = checkoutForm.customerName.trim();
    const phoneDigits = checkoutForm.phone.replace(/\D/g, '');
    const address = checkoutForm.hostelAddress.trim();

    if (name.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (phoneDigits.length < 10) {
      setFormError('Please enter a valid 10-digit WhatsApp / mobile number.');
      return;
    }
    if (address.length < 4) {
      setFormError('Please enter your Dehradun hostel, PG name, or room/gate details.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await onPlaceOrder();
      setPlacedOrder(created);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPlacedOrder(null);
    setFormError(null);
    onClose();
  };

  const waData = placedOrder ? buildWhatsAppOrderUrl(placedOrder) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-drawer-title"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <div>
              <h2
                id="checkout-drawer-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {placedOrder ? 'Pre-order Confirmed' : 'Your Bag & Dehradun Pre-order'}
              </h2>
              {isSignedIn && saveStatus !== 'idle' && !placedOrder && (
                <p className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close bag"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {placedOrder && waData ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">Order Placed Successfully</p>
                    <p className="font-mono-num text-xs opacity-80">ID: {placedOrder.orderId}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">
                  Status: <strong>Placed</strong> → Next: Send your prefilled WhatsApp confirmation below so our Dehradun kitchen locks your {placedOrder.deliverySlot} batch.
                </p>
              </div>

              {/* Prefilled WhatsApp message preview */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Prefilled WhatsApp Message
                </p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {waData.message}
                </pre>
              </div>

              <div className="space-y-3">
                <a
                  href={waData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Send WhatsApp Confirmation
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(waData.message);
                      setCopiedMsg(true);
                      setTimeout(() => setCopiedMsg(false), 2500);
                    } catch {
                      // Clipboard unavailable
                    }
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copiedMsg ? 'Message Copied!' : 'Copy Confirmation Text'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onViewOrders();
                  }}
                  className="min-h-[44px] w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Track Order Status
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-10 w-10 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
              <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Your bag is empty
              </p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                Explore the three ₹350 pilot recipes or pickles &amp; masalas from home kitchens.
              </p>
            </div>
          ) : (
            <form id="dehradun-checkout-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Cart items */}
              <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {cart.map((item) => (
                  <div key={item.itemId} className="flex items-center gap-3 p-3.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 shrink-0 rounded-xl object-cover bg-zinc-100 dark:bg-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.state} · <span className="font-mono-num">₹{item.price}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.itemId, -1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="flex min-h-[44px] min-w-[36px] items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono-num w-6 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.itemId, 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="flex min-h-[44px] min-w-[36px] items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.itemId)}
                        aria-label={`Remove ${item.name}`}
                        className="flex min-h-[44px] min-w-[36px] items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Story Card A/B Test Preference */}
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Packaging Experience (Story Card Choice)
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onToggleStoryCard(true)}
                    aria-pressed={includeStoryCard}
                    className={`flex min-h-[60px] flex-col items-start justify-center rounded-xl border p-3 text-left transition-colors ${
                      includeStoryCard
                        ? 'border-amber-700 bg-amber-50/70 text-zinc-900 dark:border-amber-500 dark:bg-amber-950/30 dark:text-zinc-50'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <BookOpen className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                      With Printed Story Card
                    </span>
                    <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Includes recipe-holder&apos;s memory note (Free)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleStoryCard(false)}
                    aria-pressed={!includeStoryCard}
                    className={`flex min-h-[60px] flex-col items-start justify-center rounded-xl border p-3 text-left transition-colors ${
                      !includeStoryCard
                        ? 'border-amber-700 bg-amber-50/70 text-zinc-900 dark:border-amber-500 dark:bg-amber-950/30 dark:text-zinc-50'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                    }`}
                  >
                    <span className="text-xs font-semibold">Jar Only (No Story Card)</span>
                    <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Minimal jar without printed story insert
                    </span>
                  </button>
                </div>
              </div>

              {/* Dehradun Delivery Notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                <span>
                  Version 1 delivers strictly within <strong>Dehradun city hostels, PGs, and campuses</strong>. No outside shipping.
                </span>
              </div>

              {/* Customer & Hostel Form */}
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="chk-name" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Your Name
                  </label>
                  <input
                    id="chk-name"
                    type="text"
                    value={checkoutForm.customerName}
                    onChange={(e) => onUpdateForm({ customerName: e.target.value })}
                    maxLength={FIELD_LIMITS.NAME_MAX}
                    placeholder="e.g., Riya Bisht"
                    required
                    className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label htmlFor="chk-phone" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    WhatsApp / Phone Number
                  </label>
                  <input
                    id="chk-phone"
                    type="tel"
                    value={checkoutForm.phone}
                    onChange={(e) => onUpdateForm({ phone: e.target.value })}
                    maxLength={FIELD_LIMITS.PHONE_MAX}
                    placeholder="10-digit mobile number"
                    required
                    className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label htmlFor="chk-area" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Dehradun Locality
                  </label>
                  <select
                    id="chk-area"
                    value={checkoutForm.dehradunArea}
                    onChange={(e) => onUpdateForm({ dehradunArea: e.target.value })}
                    className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {DEHRADUN_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="chk-hostel" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Hostel / PG Name &amp; Gate Details
                  </label>
                  <input
                    id="chk-hostel"
                    type="text"
                    value={checkoutForm.hostelAddress}
                    onChange={(e) => onUpdateForm({ hostelAddress: e.target.value })}
                    maxLength={FIELD_LIMITS.ADDRESS_MAX}
                    placeholder="e.g., Shivalik Boys Hostel, Gate 2, Prem Nagar"
                    required
                    className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label htmlFor="chk-slot" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Delivery Slot
                  </label>
                  <select
                    id="chk-slot"
                    value={checkoutForm.deliverySlot}
                    onChange={(e) => onUpdateForm({ deliverySlot: e.target.value as DeliverySlot })}
                    className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {DELIVERY_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Payment Method (No online gateway in v1)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['UPI', 'COD'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => onUpdateForm({ paymentMethod: method })}
                        aria-pressed={checkoutForm.paymentMethod === method}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                          checkoutForm.paymentMethod === method
                            ? 'border-amber-700 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200'
                            : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                      >
                        {method === 'UPI' ? 'UPI on WhatsApp' : 'Cash on Delivery'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="chk-note" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Note for the Kitchen (Optional)
                  </label>
                  <textarea
                    id="chk-note"
                    rows={2}
                    value={checkoutForm.note}
                    onChange={(e) => onUpdateForm({ note: e.target.value })}
                    maxLength={FIELD_LIMITS.NOTE_MAX}
                    placeholder="Spice preference, call on arrival, etc."
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Sticky Footer CTA */}
        {!placedOrder && cart.length > 0 && (
          <div className="border-t border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Total ({cart.reduce((s, i) => s + i.quantity, 0)} items · Free Dehradun delivery)
              </span>
              <span className="font-mono-num text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                ₹{subtotal}
              </span>
            </div>

            {isSignedIn ? (
              <button
                type="submit"
                form="dehradun-checkout-form"
                disabled={submitting}
                className="min-h-[48px] w-full rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                {submitting ? 'Placing pre-order...' : `Place Pre-order · ₹${subtotal}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequireAuth}
                className="min-h-[48px] w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                Sign in to place pre-order · ₹{subtotal}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
