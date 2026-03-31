import { useEffect, useMemo, useState } from 'react';
import { deliveriesAPI, logisticsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import LogisticsHandoffPanel from '../../components/logistics/LogisticsHandoffPanel';

/**
 * Supplier logistics workflow:
 * - Station intake / handoff is performed by the supplier for deliveries containing their products.
 * - Admin remains monitoring-only.
 */
export default function SupplierLogistics() {
  const [tab, setTab] = useState('intake'); // intake | progress
  const [catalog, setCatalog] = useState(null);

  const [deliveries, setDeliveries] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await logisticsAPI.supplierGetCatalog();
        if (!cancelled) setCatalog(res.data.data || null);
      } catch {
        if (!cancelled) toast.error('Failed to load logistics catalog');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchList = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        per_page: 15,
        ...(tab === 'intake' ? { logistics_intake_pending: true } : { logistics_after_intake: true }),
      };
      const response = await deliveriesAPI.supplierGetAll(params);
      setDeliveries(response.data.data || []);
      setMeta(response.data.meta || { current_page: 1, last_page: 1 });
    } catch (e) {
      console.error(e);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openDetail = async (id) => {
    try {
      const response = await deliveriesAPI.supplierGetOne(id);
      setSelectedDelivery(response.data.data);
      setShowModal(true);
    } catch {
      toast.error('Failed to load delivery');
    }
  };

  const regionLabel = (key) =>
    catalog?.regions?.find((r) => r.key === key)?.label || key || '—';

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      assigned: 'info',
      picked_up: 'primary',
      in_transit: 'primary',
      out_for_delivery: 'primary',
      delivered: 'success',
      failed: 'danger',
      returned: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const title = useMemo(() => (tab === 'intake' ? 'Awaiting hub intake' : 'At hub / out for delivery'), [tab]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Logistics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Receive parcels at local hubs, notify customers, and let the system assign riders automatically.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('intake')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'intake' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
          }`}
        >
          {title === 'Awaiting hub intake' ? 'Awaiting hub intake' : 'Awaiting hub intake'}
        </button>
        <button
          type="button"
          onClick={() => setTab('progress')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'progress' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
          }`}
        >
          {title === 'At hub / out for delivery' ? 'At hub / out for delivery' : 'At hub / out for delivery'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer / City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region / Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      No deliveries in this queue.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{d.tracking_number}</td>
                      <td className="px-6 py-4 text-gray-600">{d.order?.order_number}</td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800">
                          {d.order?.user?.first_name} {d.order?.user?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{d.order?.shipping_city}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <p>{regionLabel(d.logistics_region)}</p>
                        <p className="text-gray-500">{d.logistics_provider || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        {d.rider ? (
                          <span className="text-gray-800">
                            {d.rider.first_name} {d.rider.last_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(d.status)}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => openDetail(d.id)}
                          className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          aria-label="View"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t">
          <Pagination
            currentPage={meta.current_page}
            totalPages={meta.last_page}
            onPageChange={fetchList}
          />
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedDelivery ? `Delivery ${selectedDelivery.tracking_number}` : 'Delivery'}
        size="lg"
      >
        {selectedDelivery && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-800">Ship to:</span>{' '}
                {selectedDelivery.order?.shipping_address}, {selectedDelivery.order?.shipping_city}
              </p>
            </div>
            <LogisticsHandoffPanel
              catalog={catalog}
              delivery={selectedDelivery}
              onSuccess={(updated) => {
                setSelectedDelivery(updated);
                fetchList(meta.current_page);
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

