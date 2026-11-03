import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Shirt,
  Sparkles,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImagePlus,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  LOGO_URL,
  BUSINESS_NAME,
  FOUNDER_NAME,
  WHATSAPP_LOCAL,
  WHATSAPP_INTL,
  isFounderEmail,
  FashionStyleItem,
  UserProfileRecord,
  compressAndReadImageFile,
} from '../constants/brand.ts';
import { activeSupabaseUrl } from '../lib/supabase.ts';
import {
  loadCatalogFromSupabaseStorage,
  appendStyleToSupabaseStorageCatalog,
  updateStyleInSupabaseStorageCatalog,
  deleteStyleFromSupabaseStorageCatalog,
  loadUsersFromSupabase,
  updateUserStatusInSupabase,
  SUPABASE_QUICK_FIX_SQL,
} from '../lib/supabaseStorageCatalog.ts';
import { useAuth } from '../context/AuthContext.tsx';

type AdminTab =
  | 'overview'
  | 'upload'
  | 'manage-men'
  | 'manage-women'
  | 'users'
  | 'settings';

interface DashboardStats {
  totalUsers: number;
  totalMensStyles: number;
  totalWomensStyles: number;
  totalPublishedStyles: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { profile, role, loading: authLoading, logout, updateProfile, updatePassword } =
    useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dashboard stats & lists
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMensStyles: 0,
    totalWomensStyles: 0,
    totalPublishedStyles: 0,
  });
  const [allStyles, setAllStyles] = useState<FashionStyleItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfileRecord[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [globalBanner, setGlobalBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'men' | 'women'>('men');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFileMeta, setUploadFileMeta] = useState<{
    fileName: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [publishing, setPublishing] = useState<boolean>(false);

  // Manage styles state (search, edit modal, delete confirmation modal)
  const [styleSearch, setStyleSearch] = useState('');
  const [editingStyle, setEditingStyle] = useState<FashionStyleItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<'men' | 'women'>('men');
  const [editIsPublished, setEditIsPublished] = useState<boolean>(true);
  const [editNewImageMeta, setEditNewImageMeta] = useState<{
    fileName: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingStyle, setDeletingStyle] = useState<FashionStyleItem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Users management state
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [userSortOrder, setUserSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedUserModal, setSelectedUserModal] = useState<UserProfileRecord | null>(null);
  const [updatingUserStatus, setUpdatingUserStatus] = useState(false);

  // Settings state
  const [settingsName, setSettingsName] = useState(profile?.fullName || FOUNDER_NAME);
  const [settingsPhone, setSettingsPhone] = useState(profile?.phoneNumber || WHATSAPP_LOCAL);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const isAdminUser =
    role === 'admin' ||
    profile?.role === 'admin' ||
    isFounderEmail(profile?.email);

  // Protect route: redirect logged-in customers to public home, unauthenticated visitors to private admin login
  useEffect(() => {
    if (!authLoading && !isAdminUser) {
      if (profile) {
        navigate('/', { replace: true });
      } else {
        navigate('/admin/login', { replace: true });
      }
    }
  }, [authLoading, isAdminUser, profile, navigate]);

  useEffect(() => {
    if (profile) {
      setSettingsName(profile.fullName);
      setSettingsPhone(profile.phoneNumber);
    }
  }, [profile]);

  const loadDashboardData = useCallback(async () => {
    if (!isAdminUser) return;
    setLoadingData(true);
    try {
      const [mappedStyles, mappedUsers] = await Promise.all([
        loadCatalogFromSupabaseStorage(),
        loadUsersFromSupabase(userSortOrder),
      ]);

      setAllStyles(mappedStyles);
      setUsersList(mappedUsers);
      setStats({
        totalUsers: mappedUsers.length,
        totalMensStyles: mappedStyles.filter((s) => s.category === 'men').length,
        totalWomensStyles: mappedStyles.filter((s) => s.category === 'women').length,
        totalPublishedStyles: mappedStyles.filter((s) => s.isPublished).length,
      });
    } catch (err) {
      console.error('Failed to load dashboard data from Supabase:', err);
    } finally {
      setLoadingData(false);
    }
  }, [isAdminUser, userSortOrder]);

  useEffect(() => {
    if (isAdminUser) {
      loadDashboardData();
    }
  }, [isAdminUser, loadDashboardData]);

  // Handle selecting an image file on Upload Form
  const handleSelectUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlobalBanner(null);
    setUploadProgress(5);
    try {
      const compressed = await compressAndReadImageFile(file, (pct) => setUploadProgress(pct));
      setUploadFileMeta(compressed);
      setUploadPreview(compressed.dataUrl);
      setUploadProgress(100);
    } catch (err: any) {
      setUploadProgress(0);
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Could not process the selected image file.',
      });
    }
  };

  // Publish new fashion style via Supabase
  const handlePublishStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileMeta) {
      setGlobalBanner({
        type: 'error',
        message: 'Please select an image from your phone gallery or computer before publishing.',
      });
      return;
    }

    setGlobalBanner(null);
    setPublishing(true);
    setUploadProgress(35);

    try {
      const savedCatalogEntry = await appendStyleToSupabaseStorageCatalog({
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        category: uploadCategory,
        imageUrl: uploadFileMeta.dataUrl,
        storagePath: `product-images/${uploadCategory === 'men' ? 'jerseys' : 'paints'}/${uploadFileMeta.fileName}`,
        isPublished: true,
      });

      const publishedTitle = savedCatalogEntry.title;
      setUploadProgress(100);
      setUploadTitle('');
      setUploadDescription('');
      setUploadPreview(null);
      setUploadFileMeta(null);
      await loadDashboardData();

      const catLabel = uploadCategory === 'men' ? "Men's Fashion" : "Women's Fashion";
      setGlobalBanner({
        type: 'success',
        message: `"${publishedTitle}" has been uploaded to Supabase and published live on the ${catLabel} page.`,
      });
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Failed to publish fashion style.',
      });
    } finally {
      setPublishing(false);
      setTimeout(() => setUploadProgress(0), 1200);
    }
  };

  // Open Edit Modal
  const openEditModal = (style: FashionStyleItem) => {
    setEditingStyle(style);
    setEditTitle(style.title);
    setEditDescription(style.description);
    setEditCategory(style.category);
    setEditIsPublished(style.isPublished);
    setEditNewImageMeta(null);
  };

  const handleSelectReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAndReadImageFile(file);
      setEditNewImageMeta(compressed);
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Invalid replacement image file.',
      });
    }
  };

  const handleSaveEditStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStyle) return;
    setSavingEdit(true);
    setGlobalBanner(null);

    try {
      const imageUrl = editNewImageMeta ? editNewImageMeta.dataUrl : editingStyle.imageUrl;

      await updateStyleInSupabaseStorageCatalog(editingStyle.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        imageUrl,
        isPublished: editIsPublished,
      });

      setEditingStyle(null);
      await loadDashboardData();
      setGlobalBanner({
        type: 'success',
        message: `Updated "${editTitle.trim()}" successfully.`,
      });
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Failed to update style.',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTogglePublish = async (style: FashionStyleItem) => {
    setGlobalBanner(null);
    try {
      await updateStyleInSupabaseStorageCatalog(style.id, {
        isPublished: !style.isPublished,
      });
      await loadDashboardData();
      setGlobalBanner({
        type: 'success',
        message: `"${style.title}" is now ${!style.isPublished ? 'Published' : 'Unpublished'}.`,
      });
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Could not toggle publish status.',
      });
    }
  };

  const handleConfirmDeleteStyle = async () => {
    if (!deletingStyle) return;
    setConfirmingDelete(true);
    setGlobalBanner(null);
    try {
      await deleteStyleFromSupabaseStorageCatalog(deletingStyle.id);
      const deletedTitle = deletingStyle.title;
      setDeletingStyle(null);
      await loadDashboardData();
      setGlobalBanner({
        type: 'success',
        message: `"${deletedTitle}" and its Supabase storage file have been permanently removed.`,
      });
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Delete operation failed.',
      });
    } finally {
      setConfirmingDelete(false);
    }
  };

  const handleToggleUserStatus = async (userRecord: UserProfileRecord) => {
    setUpdatingUserStatus(true);
    setGlobalBanner(null);
    const nextStatus = userRecord.accountStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const updatedUser = await updateUserStatusInSupabase(userRecord, nextStatus);
      if (selectedUserModal && selectedUserModal.uid === userRecord.uid) {
        setSelectedUserModal(updatedUser);
      }
      await loadDashboardData();
      setGlobalBanner({
        type: 'success',
        message: `Updated ${userRecord.fullName}'s account status to ${nextStatus}.`,
      });
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Could not update user status.',
      });
    } finally {
      setUpdatingUserStatus(false);
    }
  };

  const handleSaveAdminSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setGlobalBanner(null);
    try {
      await updateProfile({
        fullName: settingsName,
        phoneNumber: settingsPhone,
      });
      if (newAdminPassword.trim()) {
        await updatePassword(newAdminPassword.trim());
        setNewAdminPassword('');
      }
      setGlobalBanner({
        type: 'success',
        message: 'Administrator settings updated successfully.',
      });
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: err.message || 'Failed to save settings.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  if (authLoading || !isAdminUser) {
    return (
      <div className="min-h-screen bg-[#071B49] flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#39D353]" />
          <span className="text-sm font-medium">Verifying Administrator Session...</span>
        </div>
      </div>
    );
  }

  const sidebarItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'upload', label: 'Upload Fashion Styles', icon: <Upload className="w-4 h-4" /> },
    { id: 'manage-men', label: "Manage Men's Styles", icon: <Shirt className="w-4 h-4" /> },
    { id: 'manage-women', label: "Manage Women's Styles", icon: <Sparkles className="w-4 h-4" /> },
    { id: 'users', label: 'Users Management', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const currentManagedCategory = activeTab === 'manage-men' ? 'men' : 'women';
  const managedStyles = allStyles
    .filter((s) => s.category === currentManagedCategory)
    .filter((s) =>
      styleSearch.trim()
        ? s.title.toLowerCase().includes(styleSearch.toLowerCase())
        : true
    );

  const filteredUsers = usersList.filter((u) => {
    if (userStatusFilter !== 'All' && u.accountStatus !== userStatusFilter) {
      return false;
    }
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phoneNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Admin Top Bar */}
      <div className="lg:hidden bg-[#071B49] text-white px-4 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg">
            <img
              src={LOGO_URL}
              alt={BUSINESS_NAME}
              referrerPolicy="no-referrer"
              className="w-8 h-8 object-contain"
            />
          </div>
          <span className="font-display text-xl font-bold">{BUSINESS_NAME} Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen((p) => !p)}
          className="p-2 rounded-lg text-white hover:bg-white/10"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          sidebarOpen ? 'block' : 'hidden'
        } lg:flex lg:flex-col lg:w-72 bg-[#071B49] text-white shrink-0 lg:min-h-screen border-r border-white/10`}
      >
        <div className="p-6 border-b border-white/10 hidden lg:flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shrink-0">
            <img
              src={LOGO_URL}
              alt={BUSINESS_NAME}
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-display text-xl font-bold text-white truncate">
              {BUSINESS_NAME}
            </h1>
            <p className="text-xs text-[#39D353] font-medium truncate">Administrator Panel</p>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 flex-1">
          {sidebarItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                  setGlobalBanner(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#39D353] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[#39D353]" />
            <span>View Public Website</span>
          </Link>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/admin/login', { replace: true });
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
        {/* Top Bar inside Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/90 px-6 py-4 shadow-xs">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Imam&apos;s Fashion Management
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#071B49]">
              {sidebarItems.find((i) => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadDashboardData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#071B49] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-[#071B49] text-white'
                  : 'border border-[#071B49] text-[#071B49] hover:bg-[#071B49]/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users Management ({stats.totalUsers})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#39D353] text-white text-xs sm:text-sm font-semibold hover:bg-[#2eb846] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Style</span>
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {globalBanner && (
          <div
            className={`p-4 rounded-2xl border flex flex-col gap-3 ${
              globalBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm font-medium">
                {globalBanner.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#39D353] shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{globalBanner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setGlobalBanner(null)}
                className="text-xs underline opacity-75 hover:opacity-100 shrink-0"
              >
                Dismiss
              </button>
            </div>

            {globalBanner.type === 'error' &&
              (globalBanner.message.includes('schema cache') ||
                globalBanner.message.includes('row-level security') ||
                globalBanner.message.includes('does not exist')) && (
                <div className="pt-2 border-t border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900">
                  <div>
                    <p className="font-semibold">
                      Your Supabase project ({activeSupabaseUrl || 'configured in environment variables'}) needs the{' '}
                      <code className="bg-white/80 px-1.5 py-0.5 rounded">public.fashion_styles</code> table created &amp; unlocked.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_QUICK_FIX_SQL);
                      setGlobalBanner({
                        type: 'success',
                        message:
                          'Copied Complete Supabase SQL! Paste it into your Supabase SQL Editor and click Run.',
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#071B49] text-white font-semibold hover:bg-[#0b2768] transition-colors shrink-0 cursor-pointer"
                  >
                    Copy Complete Supabase SQL
                  </button>
                </div>
              )}
          </div>
        )}

        {/* ===================================================================
            TAB 1: DASHBOARD OVERVIEW
           =================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 4 Live Database Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Registered Users
                </span>
                <p className="font-mono-tabular text-4xl font-bold text-[#071B49]">
                  {stats.totalUsers}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-semibold text-[#39D353] hover:underline cursor-pointer"
                >
                  Manage customer records &rarr;
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Men&apos;s Fashion Styles
                </span>
                <p className="font-mono-tabular text-4xl font-bold text-[#071B49]">
                  {stats.totalMensStyles}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage-men')}
                  className="text-xs font-semibold text-[#39D353] hover:underline cursor-pointer"
                >
                  Manage men&apos;s styles &rarr;
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Women&apos;s Fashion Styles
                </span>
                <p className="font-mono-tabular text-4xl font-bold text-[#071B49]">
                  {stats.totalWomensStyles}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage-women')}
                  className="text-xs font-semibold text-[#39D353] hover:underline cursor-pointer"
                >
                  Manage women&apos;s styles &rarr;
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Published Styles
                </span>
                <p className="font-mono-tabular text-4xl font-bold text-[#39D353]">
                  {stats.totalPublishedStyles}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="text-xs font-semibold text-[#071B49] hover:underline cursor-pointer"
                >
                  Upload new style &rarr;
                </button>
              </div>
            </div>

            {/* Recent Uploaded Styles Overview */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-bold text-[#071B49]">
                  Recently Uploaded Fashion Styles
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="text-xs font-semibold text-[#39D353] hover:underline cursor-pointer"
                >
                  + Add New Style
                </button>
              </div>

              {allStyles.length === 0 ? (
                <div className="py-10 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-500">
                    No fashion styles have been uploaded yet. Use the Upload Fashion Styles tool to
                    publish your first Men&apos;s or Women&apos;s design.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#39D353] text-white text-xs font-semibold hover:bg-[#2eb846] cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Your First Style</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                        <th className="py-3 pr-4">Style</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Visibility</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 pl-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {allStyles.slice(0, 6).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-3 pr-4 flex items-center gap-3">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-12 h-14 rounded-lg object-contain bg-slate-100 p-0.5 shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-[#071B49]">{item.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">
                                {item.description}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-600">
                            {item.category === 'men' ? "Men's Fashion" : "Women's Fashion"}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold">
                            <span
                              className={
                                item.isPublished ? 'text-emerald-700' : 'text-amber-600'
                              }
                            >
                              {item.isPublished ? 'Published' : 'Unpublished Draft'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 font-mono-tabular">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveTab(
                                  item.category === 'men' ? 'manage-men' : 'manage-women'
                                )
                              }
                              className="text-xs font-semibold text-[#071B49] hover:text-[#39D353] cursor-pointer"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: UPLOAD FASHION STYLES
           =================================================================== */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs max-w-3xl">
            <div className="space-y-2 mb-8">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#071B49]">
                Upload &amp; Publish New Fashion Style
              </h3>
              <p className="text-sm text-slate-600">
                Select an image from your phone gallery or computer (JPG, JPEG, PNG, or WebP). Once
                published, it will appear immediately on the selected category page.
              </p>
            </div>

            <form onSubmit={handlePublishStyle} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                  1. Fashion Style Title
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Royal Navy Double-Breasted Senator Suit"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                  2. Fashion Category Selector
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as 'men' | 'women')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] bg-white focus:outline-none focus:border-[#071B49]"
                >
                  <option value="men">Men&apos;s Fashion</option>
                  <option value="women">Women&apos;s Fashion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                  3. Fashion Style Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Describe the fabric, tailoring details, embroidery, and ideal occasions..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                  4. Image Upload (Phone Gallery or Computer — JPG, JPEG, PNG, WebP)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-[#39D353] hover:bg-slate-50/60 transition-colors">
                  <ImagePlus className="w-10 h-10 text-[#39D353] mb-3" />
                  <span className="text-sm font-semibold text-[#071B49]">
                    Tap to choose photo from Phone Gallery or Computer
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    Supports JPG, JPEG, PNG, and WebP · Bucket: fashion-styles
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleSelectUploadFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Progress Indicator */}
              {uploadProgress > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono-tabular text-slate-600">
                    <span>{publishing ? 'Uploading to fashion-styles bucket...' : 'Image ready'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#39D353] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {uploadPreview && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#071B49]">
                    5. Image Preview Before Publishing (With Live Disco LED Border)
                  </p>
                  <div className="disco-card-wrapper w-64 sm:w-72">
                    <div className="disco-card-inner">
                      <div className="disco-image-frame rounded-[16px]">
                        <div className="relative h-[320px] sm:h-[360px] rounded-[13px] overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-200/60 flex items-center justify-center p-2">
                          <img
                            src={uploadPreview}
                            alt="Upload preview"
                            className="w-full h-full object-contain object-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={publishing}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-colors shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {publishing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>
                    {publishing
                      ? 'Publishing Style...'
                      : `Publish to ${
                          uploadCategory === 'men' ? "Men's Fashion" : "Women's Fashion"
                        }`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================================================================
            TABS 3 & 4: MANAGE MEN'S STYLES / MANAGE WOMEN'S STYLES
           =================================================================== */}
        {(activeTab === 'manage-men' || activeTab === 'manage-women') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90">
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={styleSearch}
                  onChange={(e) => setStyleSearch(e.target.value)}
                  placeholder={`Search ${
                    currentManagedCategory === 'men' ? "men's" : "women's"
                  } styles by title...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                />
              </div>

              <div className="text-xs text-slate-500 font-mono-tabular">
                Total in category: {managedStyles.length}
              </div>
            </div>

            {managedStyles.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                <p className="text-base font-semibold text-[#071B49]">
                  No {currentManagedCategory === 'men' ? "men's" : "women's"} fashion styles found.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadCategory(currentManagedCategory);
                    setActiveTab('upload');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    Upload {currentManagedCategory === 'men' ? "Men's" : "Women's"} Style
                  </span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {managedStyles.map((style) => (
                  <div
                    key={style.id}
                    className="disco-card-wrapper flex flex-col"
                  >
                    <div className="disco-card-inner">
                      <div className="disco-image-frame rounded-t-[16px]">
                        <div className="relative h-[340px] sm:h-[380px] bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-200/60 rounded-t-[13px] overflow-hidden flex items-center justify-center p-2">
                          <img
                            src={style.imageUrl}
                            alt={style.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain object-center"
                          />
                          <div className="absolute top-3 left-3 bg-[#071B49]/85 backdrop-blur-xs text-white px-3 py-1 rounded-md text-xs font-medium">
                            {style.isPublished ? 'Published' : 'Unpublished'}
                          </div>
                        </div>
                      </div>

                      <div className="disco-led-strip shrink-0" aria-hidden="true" />

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-white">
                        <div className="space-y-1.5">
                          <h4 className="font-display text-xl font-bold text-[#071B49]">
                            {style.title}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-2">{style.description}</p>
                          <p className="text-[11px] text-slate-400 font-mono-tabular truncate">
                            Path: {style.storagePath}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(style)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#071B49] hover:bg-slate-50 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePublish(style)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            {style.isPublished ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Unpublish</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-[#39D353]" />
                                <span>Publish</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingStyle(style)}
                            aria-label={`Delete ${style.title}`}
                            className="inline-flex items-center justify-center p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 5: USERS MANAGEMENT
           =================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name, email, or phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={userStatusFilter}
                  onChange={(e) =>
                    setUserStatusFilter(e.target.value as 'All' | 'Active' | 'Suspended')
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#071B49] bg-white"
                >
                  <option value="All">Status: All Users</option>
                  <option value="Active">Status: Active</option>
                  <option value="Suspended">Status: Suspended</option>
                </select>

                <select
                  value={userSortOrder}
                  onChange={(e) => setUserSortOrder(e.target.value as 'newest' | 'oldest')}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#071B49] bg-white"
                >
                  <option value="newest">Sort: Newest Registered</option>
                  <option value="oldest">Sort: Oldest Registered</option>
                </select>

                <span className="text-xs font-mono-tabular text-slate-500 pl-2">
                  Total Registered: {usersList.length}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  No registered user records match the current search or filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-4">User ID</th>
                        <th className="py-3.5 px-4">Full Name</th>
                        <th className="py-3.5 px-4">Email Address</th>
                        <th className="py-3.5 px-4">Phone Number</th>
                        <th className="py-3.5 px-4">Registration Date</th>
                        <th className="py-3.5 px-4">Account Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-500">
                            {u.uid.slice(0, 14)}...
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#071B49]">
                            {u.fullName}
                            {u.role === 'admin' && (
                              <span className="ml-2 text-[11px] font-normal text-[#39D353]">
                                · Admin
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                          <td className="py-3.5 px-4 font-mono-tabular text-slate-600">
                            {u.phoneNumber || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold">
                            <span
                              className={
                                u.accountStatus === 'Active'
                                  ? 'text-emerald-700'
                                  : 'text-red-600'
                              }
                            >
                              {u.accountStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedUserModal(u)}
                              className="text-xs font-semibold text-[#071B49] hover:text-[#39D353] cursor-pointer"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 6: ADMIN SETTINGS
           =================================================================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h3 className="font-display text-2xl font-bold text-[#071B49]">
                  Administrator Profile &amp; Security
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Update your administrator contact details or change your dashboard login password.
                </p>
              </div>

              <form onSubmit={handleSaveAdminSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
                    Administrator Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
                    Business WhatsApp / Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settingsPhone}
                    onChange={(e) => setSettingsPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
                    New Administrator Password (Optional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors cursor-pointer"
                >
                  {savingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Settings</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="font-display text-2xl font-bold text-[#071B49]">
                Business Configuration
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="pb-3 border-b border-slate-100">
                  <dt className="text-xs text-slate-400">Business Name</dt>
                  <dd className="font-semibold text-[#071B49]">{BUSINESS_NAME}</dd>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <dt className="text-xs text-slate-400">Founder</dt>
                  <dd className="font-semibold text-[#071B49]">{FOUNDER_NAME}</dd>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <dt className="text-xs text-slate-400">WhatsApp Click-to-Chat</dt>
                  <dd className="font-mono-tabular font-semibold text-[#071B49]">
                    https://wa.me/{WHATSAPP_INTL}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Storage Bucket</dt>
                  <dd className="font-mono-tabular font-semibold text-[#39D353]">
                    fashion-styles
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          MODAL: EDIT FASHION STYLE
         ===================================================================== */}
      {editingStyle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B49]/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold text-[#071B49]">
                Edit Fashion Style
              </h3>
              <button
                type="button"
                onClick={() => setEditingStyle(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#071B49]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStyle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#071B49]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as 'men' | 'women')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#071B49] bg-white"
                >
                  <option value="men">Men&apos;s Fashion</option>
                  <option value="women">Women&apos;s Fashion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#071B49]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1">
                  Replace Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleSelectReplaceFile}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#071B49]/10 file:text-[#071B49]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-publish-toggle"
                  type="checkbox"
                  checked={editIsPublished}
                  onChange={(e) => setEditIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#39D353]"
                />
                <label htmlFor="edit-publish-toggle" className="text-sm text-[#071B49] font-medium">
                  Published (visible to public visitors)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStyle(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#39D353] text-white text-xs font-semibold hover:bg-[#2eb846] cursor-pointer"
                >
                  {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DELETE CONFIRMATION
         ===================================================================== */}
      {deletingStyle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B49]/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <h3 className="font-display text-2xl font-bold text-[#071B49]">
              Confirm Style Deletion
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#071B49]">&ldquo;{deletingStyle.title}&rdquo;</strong>? This
              will also remove its associated image from the <code>fashion-styles</code> storage
              bucket.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStyle(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmingDelete}
                onClick={handleConfirmDeleteStyle}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
              >
                {confirmingDelete && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: VIEW INDIVIDUAL USER PROFILE
         ===================================================================== */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B49]/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#39D353] font-semibold">
                  Registered Customer Record
                </span>
                <h3 className="font-display text-2xl font-bold text-[#071B49]">
                  {selectedUserModal.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#071B49]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50">
                <dt className="text-xs text-slate-400">User ID</dt>
                <dd className="font-mono-tabular text-xs font-medium text-[#071B49] break-all mt-0.5">
                  {selectedUserModal.uid}
                </dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50">
                <dt className="text-xs text-slate-400">Account Status</dt>
                <dd className="font-semibold text-[#071B49] mt-0.5">
                  {selectedUserModal.accountStatus}
                </dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50">
                <dt className="text-xs text-slate-400">Email Address</dt>
                <dd className="font-medium text-[#071B49] break-all mt-0.5">
                  {selectedUserModal.email}
                </dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50">
                <dt className="text-xs text-slate-400">Phone / WhatsApp</dt>
                <dd className="font-mono-tabular font-medium text-[#071B49] mt-0.5">
                  {selectedUserModal.phoneNumber || 'Not provided'}
                </dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 sm:col-span-2">
                <dt className="text-xs text-slate-400">Registration Date</dt>
                <dd className="font-mono-tabular font-medium text-[#071B49] mt-0.5">
                  {new Date(selectedUserModal.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={updatingUserStatus}
                onClick={() => handleToggleUserStatus(selectedUserModal)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#071B49] hover:bg-slate-50 cursor-pointer"
              >
                {selectedUserModal.accountStatus === 'Active'
                  ? 'Suspend Account'
                  : 'Reactivate Account'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#071B49] text-white text-xs font-semibold hover:bg-[#0c296b] cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
