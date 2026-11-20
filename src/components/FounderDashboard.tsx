import React, { useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import {
  FamilyRecipeRecord,
  FeedbackRecord,
  OrderRecord,
  OrderStatus,
} from '../types';

interface FounderDashboardProps {
  orders: OrderRecord[];
  feedbackList: FeedbackRecord[];
  recipes: FamilyRecipeRecord[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onUpdateRecipeStatus: (
    recipeId: string,
    status: 'Pending' | 'Featured' | 'Archived'
  ) => Promise<void>;
}

const FIXED_MONTHLY_COST = 15000;
const CONTRIBUTION_MARGIN = 0.4;
const TARGET_PAID_ORDERS = 30;
const TARGET_REPEAT_COMMITMENTS = 10;
const TARGET_RATING = 4.0;
const TARGET_STORY_INFLUENCE_PCT = 60;

export const FounderDashboard: React.FC<FounderDashboardProps> = ({
  orders,
  feedbackList,
  recipes,
  onUpdateOrderStatus,
  onUpdateRecipeStatus,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const paidOrDelivered = orders.filter(
      (o) => o.status === 'Paid' || o.status === 'Delivered'
    );
    const paidOrdersCount = paidOrDelivered.length;
    const paidRevenue = paidOrDelivered.reduce((s, o) => s + o.totalAmount, 0);
    const totalPipelineRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const contributionMargin = Math.round(paidRevenue * CONTRIBUTION_MARGIN);
    const breakEvenPct = Math.min(100, Math.round((contributionMargin / FIXED_MONTHLY_COST) * 100));
    const remainingContribution = Math.max(0, FIXED_MONTHLY_COST - contributionMargin);
    const jarsToBreakEven = Math.ceil(remainingContribution / (350 * CONTRIBUTION_MARGIN));

    // Repeat commitments: feedback saying Yes to reorder OR users with >= 2 orders
    const feedbackYesCount = feedbackList.filter((f) => f.reorderIntent === 'Yes').length;
    const orderCountByUser: Record<string, number> = {};
    for (const o of orders) {
      orderCountByUser[o.userId] = (orderCountByUser[o.userId] || 0) + 1;
    }
    const multiOrderUsers = Object.values(orderCountByUser).filter((c) => c >= 2).length;
    const repeatCommitments = Math.max(feedbackYesCount, feedbackYesCount + multiOrderUsers);

    // Ratings & Story Influence
    const totalFeedback = feedbackList.length;
    const avgRating =
      totalFeedback > 0
        ? feedbackList.reduce((s, f) => s + (f.tasteRating + f.storyRating) / 2, 0) / totalFeedback
        : 0;
    const storyInfluencedCount = feedbackList.filter((f) => f.storyInfluenced).length;
    const storyInfluencePct =
      totalFeedback > 0 ? Math.round((storyInfluencedCount / totalFeedback) * 100) : 0;

    // A/B Comparison: With Story Card vs Jar Only
    const withStoryOrders = orders.filter((o) => o.includeStoryCard);
    const noStoryOrders = orders.filter((o) => !o.includeStoryCard);
    const withStoryPaid = withStoryOrders.filter(
      (o) => o.status === 'Paid' || o.status === 'Delivered'
    ).length;
    const noStoryPaid = noStoryOrders.filter(
      (o) => o.status === 'Paid' || o.status === 'Delivered'
    ).length;

    const withStoryFeedback = feedbackList.filter((f) => f.includeStoryCard);
    const noStoryFeedback = feedbackList.filter((f) => !f.includeStoryCard);

    const withStoryAvgTaste =
      withStoryFeedback.length > 0
        ? withStoryFeedback.reduce((s, f) => s + f.tasteRating, 0) / withStoryFeedback.length
        : 0;
    const noStoryAvgTaste =
      noStoryFeedback.length > 0
        ? noStoryFeedback.reduce((s, f) => s + f.tasteRating, 0) / noStoryFeedback.length
        : 0;

    const withStoryReorderPct =
      withStoryFeedback.length > 0
        ? Math.round(
            (withStoryFeedback.filter((f) => f.reorderIntent === 'Yes').length /
              withStoryFeedback.length) *
              100
          )
        : 0;
    const noStoryReorderPct =
      noStoryFeedback.length > 0
        ? Math.round(
            (noStoryFeedback.filter((f) => f.reorderIntent === 'Yes').length /
              noStoryFeedback.length) *
              100
          )
        : 0;

    // State demand breakdown
    const stateCounts: Record<string, number> = {
      Odisha: 0,
      Uttarakhand: 0,
      'West Bengal': 0,
    };
    for (const o of orders) {
      for (const item of o.items) {
        if (stateCounts[item.state] !== undefined) {
          stateCounts[item.state] += item.quantity;
        }
      }
    }

    return {
      paidOrdersCount,
      paidRevenue,
      totalPipelineRevenue,
      contributionMargin,
      breakEvenPct,
      jarsToBreakEven,
      repeatCommitments,
      totalFeedback,
      avgRating,
      storyInfluencePct,
      withStoryOrders: withStoryOrders.length,
      noStoryOrders: noStoryOrders.length,
      withStoryPaid,
      noStoryPaid,
      withStoryAvgTaste,
      noStoryAvgTaste,
      withStoryReorderPct,
      noStoryReorderPct,
      stateCounts,
    };
  }, [orders, feedbackList]);

  const filteredOrders = useMemo(
    () =>
      statusFilter === 'All'
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter]
  );

  const feedbackMap = useMemo(() => {
    const map: Record<string, FeedbackRecord> = {};
    for (const f of feedbackList) map[f.orderId] = f;
    return map;
  }, [feedbackList]);

  const handleExportCsv = () => {
    const headers = [
      'Order ID',
      'Customer',
      'Email',
      'Phone',
      'Dehradun Area',
      'Hostel Address',
      'Slot',
      'Payment Method',
      'Story Card Included',
      'Status',
      'Total (INR)',
      'Contribution 40% (INR)',
      'Items',
      'Taste Rating',
      'Story Rating',
      'Story Influenced',
      'Reorder Intent',
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = orders.map((o) => {
      const fb = feedbackMap[o.orderId];
      const itemText = o.items.map((i) => `${i.quantity}x ${i.name}`).join('; ');
      return [
        o.orderId,
        o.customerName,
        o.customerEmail,
        o.phone,
        o.dehradunArea,
        o.hostelAddress,
        o.deliverySlot,
        o.paymentMethod,
        o.includeStoryCard ? 'With Story Card' : 'No Story Card',
        o.status,
        o.totalAmount,
        Math.round(o.totalAmount * CONTRIBUTION_MARGIN),
        itemText,
        fb ? fb.tasteRating : '',
        fb ? fb.storyRating : '',
        fb ? (fb.storyInfluenced ? 'Yes' : 'No') : '',
        fb ? fb.reorderIntent : '',
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memory-meals-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await onUpdateOrderStatus(orderId, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const maxStateQty = Math.max(
    1,
    ...Object.values(metrics.stateCounts)
  );

  return (
    <div className="space-y-10">
      {/* Header + CSV Export */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin Role Verified · Founder Validation Console
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dehradun Pilot Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 whitespace-nowrap dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download CSV ({orders.length})
        </button>
      </section>

      {/* 4 Validation Targets */}
      <section aria-label="Validation target progress" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Paid Orders Target
          </p>
          <p className="font-mono-num mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {metrics.paidOrdersCount} / {TARGET_PAID_ORDERS}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-700 dark:bg-amber-500"
              style={{ width: `${Math.min(100, (metrics.paidOrdersCount / TARGET_PAID_ORDERS) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {orders.length} total orders placed
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Repeat Commitments
          </p>
          <p className="font-mono-num mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {metrics.repeatCommitments} / {TARGET_REPEAT_COMMITMENTS}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-700 dark:bg-amber-500"
              style={{
                width: `${Math.min(100, (metrics.repeatCommitments / TARGET_REPEAT_COMMITMENTS) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Users saying &ldquo;Yes&rdquo; to reorder
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Avg Taste &amp; Story Rating
          </p>
          <p className="font-mono-num mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {metrics.avgRating.toFixed(1)} / 5.0
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
              style={{ width: `${Math.min(100, (metrics.avgRating / 5) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Target: {TARGET_RATING.toFixed(1)}+ ({metrics.totalFeedback} reviews)
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Story Influenced Purchase
          </p>
          <p className="font-mono-num mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {metrics.storyInfluencePct}%
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-700 dark:bg-amber-500"
              style={{ width: `${Math.min(100, metrics.storyInfluencePct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Target: {TARGET_STORY_INFLUENCE_PCT}%+ saying story mattered
          </p>
        </div>
      </section>

      {/* Unit Economics + Charts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Break-Even & 40% Contribution */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Unit Economics &amp; Monthly Break-Even
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Fixed monthly kitchen cost: <span className="font-mono-num">₹15,000</span> · 40% contribution margin
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Paid Revenue</dt>
              <dd className="font-mono-num mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                ₹{metrics.paidRevenue.toLocaleString('en-IN')}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">40% Contribution</dt>
              <dd className="font-mono-num mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                ₹{metrics.contributionMargin.toLocaleString('en-IN')}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-zinc-600 dark:text-zinc-300">
                Break-even progress ({metrics.breakEvenPct}%)
              </span>
              <span className="font-mono-num text-zinc-900 dark:text-zinc-100">
                {metrics.jarsToBreakEven === 0
                  ? 'Break-even reached!'
                  : `${metrics.jarsToBreakEven} ₹350 jars left`}
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                style={{ width: `${metrics.breakEvenPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Unpaid placed pipeline: <span className="font-mono-num">₹{(metrics.totalPipelineRevenue - metrics.paidRevenue).toLocaleString('en-IN')}</span>
            </p>
          </div>
        </div>

        {/* Story Card A/B Comparison SVG Chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Story Card A/B Experiment
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            With Story Card vs Jar Only (No Story Card)
          </p>

          <svg
            viewBox="0 0 320 150"
            className="mt-4 w-full"
            role="img"
            aria-label="Bar chart comparing orders with story card versus without story card"
          >
            {(() => {
              const maxVal = Math.max(1, metrics.withStoryOrders, metrics.noStoryOrders);
              const barH1 = Math.round((metrics.withStoryOrders / maxVal) * 86);
              const barH2 = Math.round((metrics.noStoryOrders / maxVal) * 86);
              return (
                <>
                  <line x1="24" y1="114" x2="296" y2="114" stroke="currentColor" strokeOpacity="0.15" />
                  {/* With Story */}
                  <rect x="64" y={114 - barH1} width="64" height={Math.max(4, barH1)} rx="6" fill="#b45309" />
                  <text x="96" y={106 - barH1} textAnchor="middle" className="fill-current text-xs font-semibold">
                    {metrics.withStoryOrders}
                  </text>
                  <text x="96" y="134" textAnchor="middle" className="fill-current text-[11px] opacity-75">
                    With Story ({metrics.withStoryPaid} paid)
                  </text>

                  {/* Without Story */}
                  <rect x="192" y={114 - barH2} width="64" height={Math.max(4, barH2)} rx="6" fill="#71717a" />
                  <text x="224" y={106 - barH2} textAnchor="middle" className="fill-current text-xs font-semibold">
                    {metrics.noStoryOrders}
                  </text>
                  <text x="224" y="134" textAnchor="middle" className="fill-current text-[11px] opacity-75">
                    No Story ({metrics.noStoryPaid} paid)
                  </text>
                </>
              );
            })()}
          </svg>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">With Story Reorder</p>
              <p className="font-mono-num font-semibold text-zinc-900 dark:text-zinc-100">
                {metrics.withStoryReorderPct}% · ★ {metrics.withStoryAvgTaste.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">No Story Reorder</p>
              <p className="font-mono-num font-semibold text-zinc-900 dark:text-zinc-100">
                {metrics.noStoryReorderPct}% · ★ {metrics.noStoryAvgTaste.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Regional Demand Breakdown */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Regional Demand
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Jars ordered by cuisine state
          </p>
          <div className="mt-5 space-y-4">
            {Object.entries(metrics.stateCounts).map(([state, count]) => (
              <div key={state}>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700 dark:text-zinc-300">{state}</span>
                  <span className="font-mono-num text-zinc-900 dark:text-zinc-100">{count}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-amber-700 dark:bg-amber-500"
                    style={{ width: `${(count / maxStateQty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Orders Operations Table */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Order Operations
          </h2>
          <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {(['All', 'Placed', 'Paid', 'Delivered'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                aria-pressed={statusFilter === st}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            No orders match this status yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Student / Locality</th>
                  <th className="px-4 py-3">Items &amp; A/B</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredOrders.map((order) => (
                  <tr key={order.orderId} className="align-top">
                    <td className="px-4 py-3.5">
                      <p className="font-mono-num text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {order.orderId}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {order.paymentMethod} · {order.deliverySlot}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {order.dehradunArea} · {order.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">
                        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                      </p>
                      <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-400">
                        {order.includeStoryCard ? 'With Story Card' : 'Jar Only (No Card)'}
                      </p>
                    </td>
                    <td className="font-mono-num px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                      ₹{order.totalAmount}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {order.status}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {order.status === 'Placed' && (
                          <button
                            type="button"
                            disabled={updatingId === order.orderId}
                            onClick={() => handleStatusChange(order.orderId, 'Paid')}
                            className="min-h-[38px] rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600"
                          >
                            Mark Paid
                          </button>
                        )}
                        {order.status !== 'Delivered' && (
                          <button
                            type="button"
                            disabled={updatingId === order.orderId}
                            onClick={() => handleStatusChange(order.orderId, 'Delivered')}
                            className="min-h-[38px] rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Submitted Family Recipes Inbox */}
      <section className="space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Submitted Family Recipes ({recipes.length})
        </h2>
        {recipes.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            No family recipes submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recipes.map((rec) => (
              <article
                key={rec.recipeId}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {rec.state} · {rec.submitterName} ({rec.relationship})
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {rec.recipeName}
                    </h3>
                  </div>
                  <select
                    aria-label={`Moderation status for ${rec.recipeName}`}
                    value={rec.status}
                    onChange={(e) =>
                      onUpdateRecipeStatus(
                        rec.recipeId,
                        e.target.value as 'Pending' | 'Featured' | 'Archived'
                      )
                    }
                    className="min-h-[38px] rounded-lg border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Featured">Featured</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {rec.story}
                </p>
                {rec.voiceNoteData && (
                  <audio controls src={rec.voiceNoteData} className="mt-3 w-full" />
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
