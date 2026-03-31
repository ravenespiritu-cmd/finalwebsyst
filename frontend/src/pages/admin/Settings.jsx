import { useState, useEffect } from 'react';
import { FaSave, FaSync, FaDatabase, FaServer } from 'react-icons/fa';
import { settingsAPI, uploadAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';

const Settings = () => {
  const [, setSettings] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingGcashQr, setUploadingGcashQr] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchSettings();
    fetchSystemInfo();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAll();
      const settingsData = response.data.data || [];
      setSettings(settingsData);
      
      // Convert to form data
      const data = {};
      settingsData.forEach(s => {
        data[s.key] = s.value;
      });
      setFormData(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await settingsAPI.getSystemInfo();
      setSystemInfo(response.data.data);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const settingsArray = Object.entries(formData).map(([key, value]) => ({
        key,
        value,
      }));
      await settingsAPI.bulkUpdate(settingsArray);
      toast.success('Settings saved successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await settingsAPI.clearCache();
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const handleBackup = async () => {
    try {
      await settingsAPI.backup();
      toast.success('Backup created successfully');
    } catch (error) {
      toast.error('Failed to create backup');
    }
  };

  const handleGcashQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      e.target.value = '';
      return;
    }

    try {
      setUploadingGcashQr(true);
      const response = await uploadAPI.uploadImage(file, 'settings');
      const imageUrl = response.data.data?.url ?? response.data.data;
      if (!imageUrl || typeof imageUrl !== 'string') {
        toast.error('Upload succeeded but no image URL returned');
        return;
      }
      setFormData((prev) => ({ ...prev, gcash_qr_image_url: imageUrl }));
      toast.success('GCash QR uploaded successfully');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Upload failed';
      toast.error(typeof msg === 'string' ? msg : 'Failed to upload GCash QR');
    } finally {
      setUploadingGcashQr(false);
      e.target.value = '';
    }
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'payment', label: 'Payment' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'email', label: 'Email' },
    { id: 'system', label: 'System' },
  ];

  const defaultSettings = {
    general: [
      { key: 'site_name', label: 'Site Name', type: 'text', default: 'Ganda Hub Cosmetics' },
      { key: 'site_tagline', label: 'Tagline', type: 'text', default: 'Beauty & Skincare' },
      { key: 'contact_email', label: 'Contact Email', type: 'email', default: '' },
      { key: 'contact_phone', label: 'Contact Phone', type: 'text', default: '' },
      { key: 'address', label: 'Business Address', type: 'textarea', default: '' },
    ],
    payment: [
      { key: 'currency', label: 'Currency', type: 'text', default: 'PHP' },
      { key: 'enable_cod', label: 'Enable Cash on Delivery', type: 'checkbox', default: 'true' },
      { key: 'enable_gcash', label: 'Enable GCash', type: 'checkbox', default: 'true' },
      { key: 'gcash_receiver_name', label: 'GCash Receiver Name', type: 'text', default: 'Ganda Hub Cosmetics' },
      { key: 'gcash_receiver_number', label: 'GCash Receiver Number', type: 'text', default: '' },
      { key: 'gcash_qr_image_url', label: 'GCash QR Image URL', type: 'text', default: '' },
    ],
    shipping: [
      { key: 'free_shipping_threshold', label: 'Free Shipping Threshold (PHP)', type: 'number', default: '1500' },
      { key: 'default_shipping_fee', label: 'Default Shipping Fee (PHP)', type: 'number', default: '150' },
      { key: 'shipping_areas', label: 'Shipping Areas', type: 'textarea', default: '' },
    ],
    email: [
      { key: 'mail_from_name', label: 'From Name', type: 'text', default: 'Ganda Hub Cosmetics' },
      { key: 'mail_from_address', label: 'From Email', type: 'email', default: '' },
      { key: 'order_notification_email', label: 'Order Notification Email', type: 'email', default: '' },
    ],
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          <FaSave />
          Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeTab !== 'system' ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 capitalize">
                {activeTab} Settings
              </h2>
              
              <div className="space-y-4">
                {defaultSettings[activeTab]?.map((setting) => (
                  <div key={setting.key}>
                    {setting.key === 'gcash_qr_image_url' ? (
                      <div>
                        <Input
                          label={setting.label}
                          type="text"
                          value={formData[setting.key] || setting.default}
                          onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                        />
                        <div className="mt-2 flex items-center gap-3">
                          <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                            {uploadingGcashQr ? 'Uploading...' : 'Select Image'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                              className="hidden"
                              onChange={handleGcashQrUpload}
                              disabled={uploadingGcashQr}
                            />
                          </label>
                          <span className="text-xs text-gray-500">Max 5MB</span>
                        </div>
                        {!!formData[setting.key] && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-2">QR Preview</p>
                            <img
                              src={toAbsoluteImageUrl(formData[setting.key], formData[setting.key])}
                              alt="GCash QR Preview"
                              className="w-40 h-40 object-contain border border-gray-200 rounded-lg bg-white p-1"
                            />
                          </div>
                        )}
                      </div>
                    ) : setting.type === 'checkbox' ? (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData[setting.key] === 'true' || formData[setting.key] === true}
                          onChange={(e) => setFormData({
                            ...formData,
                            [setting.key]: e.target.checked ? 'true' : 'false'
                          })}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="font-medium text-gray-700">{setting.label}</span>
                      </label>
                    ) : setting.type === 'textarea' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {setting.label}
                        </label>
                        <textarea
                          value={formData[setting.key] || setting.default}
                          onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    ) : (
                      <Input
                        label={setting.label}
                        type={setting.type}
                        value={formData[setting.key] || setting.default}
                        onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* System Info */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaServer className="text-primary-500" />
                  System Information
                </h2>
                
                {systemInfo && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">PHP Version</p>
                      <p className="font-medium text-gray-800">{systemInfo.php_version}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Laravel Version</p>
                      <p className="font-medium text-gray-800">{systemInfo.laravel_version}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Environment</p>
                      <p className="font-medium text-gray-800">{systemInfo.environment}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Server Time</p>
                      <p className="font-medium text-gray-800">{systemInfo.server_time}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Maintenance */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Maintenance</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <FaSync className="text-blue-500" />
                      <h3 className="font-medium text-gray-800">Clear Cache</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Clear application cache to refresh configurations
                    </p>
                    <Button variant="outline" size="sm" onClick={handleClearCache}>
                      Clear Cache
                    </Button>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <FaDatabase className="text-green-500" />
                      <h3 className="font-medium text-gray-800">Database Backup</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Create a backup of the database
                    </p>
                    <Button variant="outline" size="sm" onClick={handleBackup}>
                      Create Backup
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
