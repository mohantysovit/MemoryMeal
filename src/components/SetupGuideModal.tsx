import React from 'react';
import { BookOpen, X } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <h2
              id="setup-guide-title"
              className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Firebase &amp; PWA Setup Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup guide"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              1. Firebase Configuration
            </h3>
            <p className="mt-1">
              Firebase credentials live in <code className="font-mono text-xs">firebase-applet-config.json</code> at the project root and are imported in <code className="font-mono text-xs">src/firebase.ts</code>. To connect a custom Firebase project, update the JSON keys (<code className="font-mono text-xs">projectId</code>, <code className="font-mono text-xs">apiKey</code>, <code className="font-mono text-xs">appId</code>, <code className="font-mono text-xs">authDomain</code>, and <code className="font-mono text-xs">firestoreDatabaseId</code>).
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              2. Authentication Providers
            </h3>
            <p className="mt-1">
              Google Sign-In is provisioned out of the box. To enable Email/Password fallback for students without Google sign-in, open Firebase Console → Authentication → Sign-in method → enable <strong>Email/Password</strong>.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              3. Founder Dashboard Access (Admin Role)
            </h3>
            <p className="mt-1">
              Founder analytics and order status transitions (<code className="font-mono text-xs">Placed → Paid → Delivered</code>) are locked in <code className="font-mono text-xs">firestore.rules</code> to the verified founder email or UIDs listed in the <code className="font-mono text-xs">/admins/&#123;uid&#125;</code> collection.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              4. Dehradun Pilot Scope (v1)
            </h3>
            <p className="mt-1">
              Version 1 validates 30 paid ₹350 story-backed jar orders within Dehradun localities via UPI or Cash on Delivery with prefilled WhatsApp confirmation.
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-[44px] w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          Close Guide
        </button>
      </div>
    </div>
  );
};
