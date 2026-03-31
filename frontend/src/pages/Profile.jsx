import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FaUser, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { storesAPI, uploadAPI } from '../services/api';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState(null);
  const [savingStoreLogo, setSavingStoreLogo] = useState(false);

  const isSupplier = user?.role === 'supplier';

  useEffect(() => {
    if (!isSupplier) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await storesAPI.getAll();
        const storeData = res.data.data;
        const row = Array.isArray(storeData) ? storeData[0] : storeData;
        if (!cancelled) setStore(row || null);
      } catch (e) {
        console.error('Failed to load store:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSupplier]);

  const handleStoreLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !store?.id) {
      if (!store?.id) toast.error('Store not found. Contact support.');
      event.target.value = '';
      return;
    }
    try {
      setSavingStoreLogo(true);
      const uploadRes = await uploadAPI.supplierUploadImage(file, 'stores');
      const uploadData = uploadRes.data?.data || uploadRes.data;
      const logoPath = uploadData?.url || uploadData?.path;
      if (!logoPath) {
        throw new Error('Upload failed');
      }
      const updated = await storesAPI.update(store.id, { logo: logoPath });
      setStore(updated.data.data || updated.data);
      toast.success('Store logo updated');
    } catch (error) {
      console.error('Failed to update store logo:', error);
      toast.error(error.response?.data?.message || 'Failed to update store logo');
    } finally {
      setSavingStoreLogo(false);
      event.target.value = '';
    }
  };

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zip_code: user?.zip_code || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm();

  const newPassword = watch('password');

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      await updateProfile(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      setLoading(true);
      await changePassword(data);
      toast.success('Password changed successfully');
      resetPassword();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'security', label: 'Security', icon: FaLock },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-gray-800 mb-8">My Profile</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-8">
                  <div className="flex-shrink-0">
                    {isSupplier && store?.logo ? (
                      <img
                        src={store.logo}
                        alt={store.name || 'Store logo'}
                        className="w-24 h-24 rounded-full object-cover border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-primary-600">
                          {user?.first_name?.[0]}
                          {user?.last_name?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {user?.first_name} {user?.last_name}
                    </h2>
                    <p className="text-gray-600">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full capitalize">
                      {user?.role}
                    </span>
                    {isSupplier && store?.name && (
                      <p className="text-gray-700 text-sm mt-2 font-medium">{store.name}</p>
                    )}
                    {isSupplier && store?.id && (
                      <div className="mt-3">
                        <label className="inline-flex items-center text-sm text-primary-600 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleStoreLogoChange}
                            disabled={savingStoreLogo}
                          />
                          <span className="underline">
                            {store?.logo ? 'Change store logo' : 'Upload store logo'}
                          </span>
                          {savingStoreLogo && (
                            <span className="ml-2 text-gray-500">Saving...</span>
                          )}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Shown on your storefront and marketplace listings.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    error={profileErrors.first_name?.message}
                    {...registerProfile('first_name', {
                      required: 'First name is required',
                    })}
                  />
                  <Input
                    label="Last Name"
                    error={profileErrors.last_name?.message}
                    {...registerProfile('last_name', {
                      required: 'Last name is required',
                    })}
                  />
                </div>

                <Input
                  label="Phone Number"
                  error={profileErrors.phone?.message}
                  {...registerProfile('phone')}
                />

                <Input
                  label="Address"
                  error={profileErrors.address?.message}
                  {...registerProfile('address')}
                />

                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    error={profileErrors.city?.message}
                    {...registerProfile('city')}
                  />
                  <Input
                    label="State/Province"
                    error={profileErrors.state?.message}
                    {...registerProfile('state')}
                  />
                  <Input
                    label="ZIP Code"
                    error={profileErrors.zip_code?.message}
                    {...registerProfile('zip_code')}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={loading}>
                    Save Changes
                  </Button>
                </div>
              </form>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6 max-w-md">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h2>
                
                <Input
                  label="Current Password"
                  type="password"
                  error={passwordErrors.current_password?.message}
                  {...registerPassword('current_password', {
                    required: 'Current password is required',
                  })}
                />

                <Input
                  label="New Password"
                  type="password"
                  error={passwordErrors.password?.message}
                  {...registerPassword('password', {
                    required: 'New password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  error={passwordErrors.password_confirmation?.message}
                  {...registerPassword('password_confirmation', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === newPassword || 'Passwords do not match',
                  })}
                />

                <Button type="submit" variant="primary" loading={loading}>
                  Change Password
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
