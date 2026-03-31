import { useState, useEffect } from 'react';
import { deliveriesAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Button from '../common/Button';

/**
 * Regional logistics dropdowns (Luzon / Visayas / Mindanao) and local carriers + branch list.
 */
export default function LogisticsHandoffPanel({ catalog, delivery, onSuccess, readOnly = false }) {
  const [regionKey, setRegionKey] = useState('');
  const [provider, setProvider] = useState('');
  const [branchId, setBranchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!delivery) return;
    setRegionKey(delivery.logistics_region || '');
    setProvider(delivery.logistics_provider || '');
    setBranchId(delivery.logistics_branch_id || '');
  }, [delivery?.id, delivery?.logistics_region, delivery?.logistics_provider, delivery?.logistics_branch_id]);

  const branchOptions =
    catalog?.branches?.[regionKey]?.[provider] || [];

  const locked = Boolean(delivery?.station_arrived_at);

  const handleSubmit = async () => {
    if (!delivery?.id) return;
    if (!regionKey || !provider || !branchId) {
      toast.error('Please select region, logistics provider, and branch');
      return;
    }

    try {
      setSubmitting(true);
      const response = await deliveriesAPI.supplierArriveAtStation(delivery.id, {
        logistics_region: regionKey,
        logistics_provider: provider,
        branch_id: branchId,
      });
      const updated = response.data?.data ?? null;
      onSuccess?.(updated);
      toast.success(response.data?.message || 'Parcel received at station');
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to process station handoff';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!catalog) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500">
        Loading logistics options…
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
      <h4 className="font-medium text-gray-800 mb-2">Logistics station handoff</h4>
      {delivery?.station_arrived_at && (
        <div className="text-xs bg-white border border-gray-200 rounded-lg p-3 text-gray-700">
          <p className="font-medium text-gray-800">Checked in at hub</p>
          <p>
            {delivery.logistics_provider} — {delivery.logistics_station_name}
          </p>
          <p className="text-gray-500">
            Region: {catalog?.regions?.find((r) => r.key === delivery.logistics_region)?.label || delivery.logistics_region || '—'}
          </p>
        </div>
      )}
      <p className="text-xs text-gray-600 mb-2">
        Parcel is received at a local hub (Luzon, Visayas, or Mindanao). The customer is notified, then a rider
        is auto-assigned when possible.
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assigned location (island group)</label>
          <select
            value={regionKey}
            onChange={(e) => {
              setRegionKey(e.target.value);
              setBranchId('');
            }}
            disabled={locked || readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
          >
            <option value="">Select region…</option>
            {(catalog.regions || []).map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Logistics provider</label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setBranchId('');
            }}
            disabled={locked || readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
          >
            <option value="">Select provider…</option>
            {(catalog.providers || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Branch / station</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={locked || readOnly || !regionKey || !provider || branchOptions.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
          >
            <option value="">
              {!regionKey || !provider ? 'Choose region and provider first' : 'Select branch…'}
            </option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <p>
            Arrived at station:{' '}
            <span className="font-medium text-gray-800">
              {delivery?.station_arrived_at
                ? new Date(delivery.station_arrived_at).toLocaleString('en-PH')
                : '—'}
            </span>
          </p>
          <p>
            Auto-assigned rider:{' '}
            <span className="font-medium text-gray-800">
              {delivery?.auto_assigned_at
                ? new Date(delivery.auto_assigned_at).toLocaleString('en-PH')
                : '—'}
            </span>
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={readOnly || submitting || delivery?.status === 'delivered' || Boolean(delivery?.station_arrived_at)}
        >
          {readOnly
            ? 'Monitoring only (supplier action required)'
            : delivery?.station_arrived_at
            ? 'Already checked in at hub'
            : submitting
              ? 'Processing…'
              : 'Receive at station & notify customer'}
        </Button>
      </div>
    </div>
  );
}
