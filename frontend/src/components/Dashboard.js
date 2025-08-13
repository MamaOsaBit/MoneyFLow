import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
  Plus, 
  PieChart,
  BarChart3,
  ArrowUpRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentExpenses, setRecentExpenses] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, expensesResponse] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/expenses`)
      ]);
      
      setStats(statsResponse.data);
      setRecentExpenses(expensesResponse.data.slice(0, 5)); // Get recent 5 expenses
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Prepare chart data
  const monthlyData = stats ? Object.entries(stats.monthly_breakdown).map(([month, data]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    personal: data.personal,
    shared: data.shared,
    total: data.personal + data.shared
  })).slice(-6) : []; // Last 6 months

  const categoryData = stats ? Object.entries(stats.category_breakdown).map(([category, amount]) => ({
    name: category,
    value: amount
  })) : [];

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] })}
          </h1>
          <p className="text-slate-400">{t('dashboard.financialOverview')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Expenses */}
          <div className="glass-card p-6 expense-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Total Expenses</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.total_expenses || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center text-green-400 text-sm">
              <ArrowUpRight size={16} className="mr-1" />
              <span>This month</span>
            </div>
          </div>

          {/* Personal Expenses */}
          <div className="glass-card p-6 expense-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Personal</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.personal_total || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center text-purple-400 text-sm">
              <span>Only yours</span>
            </div>
          </div>

          {/* Shared Expenses */}
          <div className="glass-card p-6 expense-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Shared</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.shared_total || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center text-green-400 text-sm">
              <span>With others</span>
            </div>
          </div>

          {/* Categories */}
          <div className="glass-card p-6 expense-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Categories</p>
                <p className="text-2xl font-bold text-white">
                  {Object.keys(stats?.category_breakdown || {}).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <PieChart className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center text-yellow-400 text-sm">
              <span>Active</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend Chart */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Monthly Trends</h3>
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            
            {monthlyData.length > 0 ? (
              <div className="h-64 chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#94a3b8" 
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 15, 35, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                      formatter={(value) => [formatCurrency(value), '']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="personal" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                      name="Personal"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="shared" 
                      stroke="#06b6d4" 
                      strokeWidth={3}
                      dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                      name="Shared"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No data available yet</p>
                  <p className="text-sm">Add some expenses to see trends</p>
                </div>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Category Breakdown</h3>
              <PieChart className="w-5 h-5 text-cyan-400" />
            </div>
            
            {categoryData.length > 0 ? (
              <div className="h-64 chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelStyle={{ fill: '#e2e8f0', fontSize: '12px' }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 15, 35, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No categories yet</p>
                  <p className="text-sm">Add expenses to see breakdown</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Expenses & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Expenses */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Expenses</h3>
              <Link 
                to="/expenses"
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            
            {recentExpenses.length > 0 ? (
              <div className="space-y-4">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 glass rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        expense.type === 'personal' 
                          ? 'bg-gradient-to-r from-purple-400 to-pink-500' 
                          : 'bg-gradient-to-r from-green-400 to-teal-500'
                      }`}>
                        {expense.type === 'personal' ? (
                          <Wallet className="w-5 h-5 text-white" />
                        ) : (
                          <Users className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {expense.description || expense.category}
                        </p>
                        <p className="text-sm text-slate-400">
                          {expense.category} • {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatCurrency(expense.amount)}
                      </p>
                      <p className={`text-xs ${
                        expense.type === 'personal' ? 'text-purple-400' : 'text-green-400'
                      }`}>
                        {expense.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No expenses yet</p>
                <p className="text-sm">Start by adding your first expense</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
            
            <div className="space-y-4">
              <Link 
                to="/add-expense"
                className="w-full glass-button p-4 rounded-lg flex items-center space-x-3 text-left group"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white">Add Expense</p>
                  <p className="text-sm text-slate-400">Quick expense entry</p>
                </div>
              </Link>

              <Link 
                to="/shared"
                className="w-full glass-button p-4 rounded-lg flex items-center space-x-3 text-left group"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-teal-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white">Shared Expenses</p>
                  <p className="text-sm text-slate-400">Manage group spending</p>
                </div>
              </Link>

              <Link 
                to="/expenses"
                className="w-full glass-button p-4 rounded-lg flex items-center space-x-3 text-left group"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white">View Reports</p>
                  <p className="text-sm text-slate-400">Detailed analysis</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;