"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  TrendingUp,
  Calculator,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Search,
  Download,
  Trash2,
  RefreshCcw,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  Info,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { AdminPricingPanel } from "@/components/admin-pricing-panel";
import { AdminModelHintsPanel } from "@/components/admin-model-hints-panel";
import { AdminFaqsPanel } from "@/components/admin-faqs-panel";
import { AdminSmartResultsPanel } from "@/components/admin-smart-results-panel";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  company: string | null;
  plan: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  createdAt: string;
  isActive: boolean;
  daysRemaining: number;
  totalCalculations: number;
  totalSavedModels: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  billingCycle: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface Stats {
  totalUsers: number;
  activeSubscribers: number;
  totalCalculations: number;
  totalSavedModels: number;
  conversionRate: string;
  totalRevenue: number;
  planDistribution: Array<{ plan: string; count: number }>;
  revenueByPlan: Record<string, number>;
}

type TabView = "users" | "invoices" | "stats" | "pricing" | "hints" | "faqs" | "smart-results";

export default function AdminDashboard() {
  const { user, hydrate } = useAuth();
  const [activeTab, setActiveTab] = useState<TabView>("stats");
  const [users, setUsers] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return; // Wait for user to load
    
    if (user.email === "admin@finmech.com") {
      setIsAdmin(true);
      fetchAllData();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [usersRes, invoicesRes, statsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/invoices"),
        api.get("/admin/stats"),
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.users);
      if (invoicesRes.data.success) setInvoices(invoicesRes.data.invoices);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err: any) {
      console.error("Admin fetch error:", err);
      setError(err.response?.data?.error || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete user");
    }
  };

  const updateUserPlan = async (userId: string, plan: string) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/plan`, {
        plan,
        subscriptionStatus: "active",
      });
      if (data.success) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, plan } : u)));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update plan");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportUsers = () => {
    const csv = [
      ["Name", "Email", "Company", "Plan", "Status", "Subscription End", "Calculations", "Saved Models"].join(","),
      ...users.map((u) =>
        [
          u.name,
          u.email,
          u.company || "",
          u.plan,
          u.subscriptionStatus,
          u.subscriptionEnd || "",
          u.totalCalculations,
          u.totalSavedModels,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-danger" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You must be an admin to view this page.</p>
        <Link href="/" className="text-primary hover:underline mt-4 inline-block">
          Go Home
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-danger" />
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchAllData}
          className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg"
        >
          <RefreshCcw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/models"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-success"></span>
          Logged in as Admin
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl border-2 transition-all shrink-0 ${
            activeTab === "stats"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl border-2 transition-all shrink-0 ${
            activeTab === "users"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl border-2 transition-all shrink-0 ${
            activeTab === "invoices"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("faqs")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl border-2 transition-all shrink-0 ${
            activeTab === "faqs"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          FAQs
        </button>
        <button
          onClick={() => setActiveTab("smart-results")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl border-2 transition-all shrink-0 ${
            activeTab === "smart-results"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Smart Results
        </button>
        <button
          onClick={() => setActiveTab("hints")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl border-2 transition-all shrink-0 ${
            activeTab === "hints"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Info className="h-4 w-4" />
          Field Guides
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl border-2 transition-all shrink-0 ${
            activeTab === "pricing"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="h-4 w-4" />
          Pricing
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Users</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Active Subscribers</span>
              </div>
              <p className="text-3xl font-bold">{stats.activeSubscribers}</p>
              <p className="text-xs text-muted-foreground">{stats.conversionRate}% conversion</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Calculations</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalCalculations.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Revenue</span>
              </div>
              <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Plan Distribution</h3>
              <div className="space-y-3">
                {stats.planDistribution.map((item) => (
                  <div key={item.plan} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="capitalize font-medium">{item.plan}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(item.count / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Revenue by Plan</h3>
              <div className="space-y-3">
                {Object.entries(stats.revenueByPlan).map(([plan, amount]) => (
                  <div key={plan} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="capitalize font-medium">{plan}</span>
                    <span className="font-semibold">₹{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-xl text-sm"
              />
            </div>
            <button
              onClick={exportUsers}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Calculations</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Models</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Joined</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.company && (
                            <p className="text-xs text-muted-foreground">{user.company}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={user.plan}
                          onChange={(e) => updateUserPlan(user.id, e.target.value)}
                          className="text-sm bg-input border border-border rounded-lg px-2 py-1"
                        >
                          <option value="free">Free</option>
                          <option value="standalone_all">All Standalone Models</option>
                          <option value="standalone_standard">Standalone All + Standard</option>
                          <option value="investor">All Models PRO +</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            {user.daysRemaining} days left
                          </span>
                        ) : user.subscriptionStatus === "cancelled" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                            <Clock className="h-3 w-3" />
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">{user.totalCalculations}</td>
                      <td className="text-center py-3 px-4">{user.totalSavedModels}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.createdAt}</td>
                      <td className="text-right py-3 px-4">
                        {user.email !== "admin@finmech.com" && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pricing" && <AdminPricingPanel />}

      {activeTab === "hints" && <AdminModelHintsPanel />}

      {activeTab === "faqs" && <AdminFaqsPanel />}

      {activeTab === "smart-results" && <AdminSmartResultsPanel />}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                ₹
                {invoices
                  .filter((i) => i.status === "paid")
                  .reduce((sum, i) => sum + i.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-success">
                {invoices.filter((i) => i.status === "paid").length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-500">
                {invoices.filter((i) => i.status === "created").length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Plan</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Amount</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.billingCycle === "yearly" ? "Annual" : "Monthly"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-sm">{invoice.user.name}</p>
                        <p className="text-xs text-muted-foreground">{invoice.user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {invoice.plan}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        ₹{invoice.amount.toLocaleString()}
                      </td>
                      <td className="text-center py-3 px-4">
                        {invoice.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Paid
                          </span>
                        ) : invoice.status === "created" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-danger bg-danger/10 px-2 py-1 rounded-full">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{invoice.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
