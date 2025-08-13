import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { 
  Filter, 
  Search, 
  Calendar, 
  DollarSign, 
  Users, 
  User, 
  Edit3, 
  Trash2,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ExpenseList = () => {
  const { user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`${API}/expenses/${expenseId}`);
        setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
      }
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get unique categories
  const categories = [...new Set(expenses.map(expense => expense.category))];

  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter(expense => {
      // Search filter
      const matchesSearch = 
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = typeFilter === 'all' || expense.type === typeFilter;
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date) - new Date(b.date);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">All Expenses</h1>
          <p className="text-slate-400">Manage and track your expenses</p>
        </div>

        {/* Search and Filters */}
        <div className="glass-card p-6 rounded-xl mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-input"
                placeholder="Search expenses..."
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 glass-button flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 glass-input"
                >
                  <option value="all">All Types</option>
                  <option value="personal">Personal</option>
                  <option value="shared">Shared</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 glass-input"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="w-full px-4 py-2 glass-input"
                >
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  <option value="amount-desc">Amount (Highest)</option>
                  <option value="amount-asc">Amount (Lowest)</option>
                  <option value="category-asc">Category (A-Z)</option>
                  <option value="category-desc">Category (Z-A)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Expenses List */}
        {filteredExpenses.length > 0 ? (
          <div className="space-y-4">
            {/* Desktop Table Header */}
            <div className="hidden md:block glass-card rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-4 text-sm font-medium text-slate-300 border-b border-white/10">
                <button
                  onClick={() => toggleSort('date')}
                  className="flex items-center space-x-1 hover:text-white transition-colors text-left"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => toggleSort('category')}
                  className="flex items-center space-x-1 hover:text-white transition-colors text-left"
                >
                  <span>Category</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                
                <div>Description</div>
                
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                </div>
                
                <button
                  onClick={() => toggleSort('amount')}
                  className="flex items-center space-x-1 hover:text-white transition-colors text-right"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Amount</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                
                <div className="text-right">Actions</div>
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-3">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="glass-card rounded-xl overflow-hidden expense-card">
                  {/* Desktop View */}
                  <div className="hidden md:grid grid-cols-6 gap-4 p-4 items-center">
                    <div className="text-slate-300">
                      {formatDate(expense.date)}
                    </div>
                    
                    <div>
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
                        {expense.category}
                      </span>
                    </div>
                    
                    <div className="text-white">
                      {expense.description || 'No description'}
                    </div>
                    
                    <div>
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                        expense.type === 'personal' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {expense.type === 'personal' ? (
                          <User className="w-3 h-3" />
                        ) : (
                          <Users className="w-3 h-3" />
                        )}
                        <span className="capitalize">{expense.type}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-semibold text-white">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      {expense.user_id === user.id && (
                        <>
                          <button className="p-2 text-slate-400 hover:text-cyan-400 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          expense.type === 'personal' 
                            ? 'bg-gradient-to-r from-purple-400 to-pink-500' 
                            : 'bg-gradient-to-r from-green-400 to-teal-500'
                        }`}>
                          {expense.type === 'personal' ? (
                            <User className="w-5 h-5 text-white" />
                          ) : (
                            <Users className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {expense.description || expense.category}
                          </div>
                          <div className="text-sm text-slate-400">
                            {expense.category} • {formatDate(expense.date)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">
                          {formatCurrency(expense.amount)}
                        </div>
                        <div className={`text-xs ${
                          expense.type === 'personal' ? 'text-purple-400' : 'text-green-400'
                        }`}>
                          {expense.type}
                        </div>
                      </div>
                    </div>

                    {expense.user_id === user.id && (
                      <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                        <button className="p-2 text-slate-400 hover:text-cyan-400 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 rounded-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Expenses Found</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || typeFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Start by adding your first expense to track your spending.'
              }
            </p>
          </div>
        )}

        {/* Summary */}
        {filteredExpenses.length > 0 && (
          <div className="glass-card p-6 rounded-xl mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {filteredExpenses.length}
                </div>
                <div className="text-slate-400 text-sm">Total Expenses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(
                    filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
                  )}
                </div>
                <div className="text-slate-400 text-sm">Total Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(
                    filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0) / filteredExpenses.length
                  )}
                </div>
                <div className="text-slate-400 text-sm">Average</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;